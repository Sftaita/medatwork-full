# ADR-001 — Refonte du modèle Années académiques

**Date :** 2026-05-29 au 2026-05-31  
**Statut :** Accepté et déployé  
**Décideur :** Samy Ftaita  

---

## Contexte historique

Le modèle `Years` avait été développé progressivement depuis 2022, accumulant des choix techniques qui sont devenus des obstacles à la maintenance.

### Problèmes identifiés

#### `owner` dans `ManagerYears` (boolean)
- Peuplé à la création mais **jamais lu** dans aucune décision de code
- N'était utilisé dans aucun voter, aucun controller, aucun service
- Retourné dans les payloads API, consommé par aucun composant frontend
- Classification : **champ zombie**

#### `master` dans `Years` (int nullable)
- Stockait l'ID du manager maître de stage sans contrainte de clé étrangère
- Ambiguïté sémantique : "maître de stage" ou "créateur" ?
- Risque d'intégrité : suppression d'un manager ne mettait pas `master` à null
- N+1 query obligatoire : `findOneBy(['id' => $masterId])` à chaque lecture
- Rôle métier distinct des droits applicatifs mais non isolé conceptuellement

#### `location` dans `Years` (string NOT NULL)
- Copie textuelle du nom de l'hôpital, sans synchronisation automatique
- Le frontend envoyait systématiquement `location: ""` — le backend la résolvait depuis `hospital.getName()`
- Double source de vérité avec `hospital.name`
- Données legacy avec valeurs libres (`"joo"`, `"Clique de l'espoir"`) non mappables

#### `hospital_id` nullable dans `Years`
- Conception d'origine pendant la migration progressive
- 86/109 années sans `hospital_id` avant ce sprint
- Rend impossible l'accès HospitalAdmin aux années non rattachées
- Empêche toute contrainte référentielle fiable

#### Double flux de création d'année
- **Flux Manager** : via `CreateYear` service, crée `YearsWeekIntervals` et `ManagerYears`
- **Flux HospitalAdmin** : code inline dans le controller, **sans** `YearsWeekIntervals`, token différent (10 vs 8 chars), **sans** transaction atomique
- Comportements divergents non documentés

---

## Décisions prises

### 1. Suppression de `owner`
**Décision :** Suppression du champ, getter, setter, et de toutes les références dans les SELECT DQL et les payloads API.  
**Raison :** Aucun impact fonctionnel. Réduction du bruit dans les données.  
**Migration :** `ALTER TABLE manager_years DROP COLUMN owner`

### 2. Remplacement de `master` par `trainingSupervisor`
**Décision :** Le champ `master` (int) est remplacé par `trainingSupervisor` (ManyToOne → Manager, nullable, ON DELETE SET NULL).  
**Raison :** Vraie contrainte FK, pas de N+1, sémantique claire ("maître de stage" ≠ "créateur").  
**Migration :** `ALTER TABLE years ADD training_supervisor_id INT NULL` + FK + backfill depuis `master` + `DROP master`

### 3. Suppression de `location`
**Décision :** Le champ `location` est supprimé. La source de vérité devient `hospital.name`.  
**Raison :** Élimination de la double source de vérité. Tous les payloads exposent désormais `hospitalName` depuis la relation.  
**Migration :** `ALTER TABLE years DROP COLUMN location`

### 4. `hospital_id` NOT NULL
**Décision :** `hospital_id` devient obligatoire. La migration inclut une garde préventive qui refuse de s'exécuter si des années orphelines existent.  
**Raison :** Toute année académique appartient à un hôpital. Contrainte métier fondamentale.  
**Migration :** `ALTER TABLE years MODIFY hospital_id INT NOT NULL` (avec garde `preUp()`)

### 5. Unification de la création d'année
**Décision :** Un seul service `YearCreationService` gère la création pour Manager et HospitalAdmin. Les responsabilités des controllers sont clarifiées.  
**Raison :** Élimination des comportements divergents (tokens, semaines, transactions).

---

## Alternatives rejetées

### Conserver `owner`
**Rejetée** : Aucun usage fonctionnel identifié. Conserver un champ zombie augmente la surface de confusion sans bénéfice.

### Conserver `master` en parallèle de `trainingSupervisor`
**Rejetée** : Double source de vérité. La synchronisation automatique dans `setTrainingSupervisor()` (qui écrivait aussi dans `master`) était une solution temporaire acceptable uniquement pendant la migration.

### Conserver `location` pour les cas où location ≠ hospital.name
**Rejetée** : Aucun cas réel documenté où cette divergence était intentionnelle. Les exemples existants (`"joo"`, `"Delta"`) étaient des erreurs de saisie ou des hôpitaux mal référencés.

### Laisser `hospital_id` nullable pour les années historiques
**Rejetée** : La commande `app:repair-orphan-years` et le mapping manuel permettent de corriger tous les cas avant migration. La nullabilité créait des bugs silencieux (403 pour HospitalAdmin sur ces années).

---

## Impacts

### Techniques

| Composant | Impact |
|-----------|--------|
| `Entity/Years.php` | Suppression `$location`, `$master`, `getOwner/setOwner`; ajout `$trainingSupervisor` (ManyToOne) |
| `Entity/ManagerYears.php` | Suppression `$owner`, `getOwner()`, `setOwner()` |
| Repositories | Tous les SELECT DQL mis à jour : JOIN `trainingSupervisor`, `hospitalName` au lieu de `location` |
| `YearCreationService` | Service unifié remplace `CreateYear` (legacy) pour le flux Manager |
| `CreateYearInputDTO` | `hospitalId` obligatoire (int positif), `location` supprimé |
| `UpdateYear` | Target `'location'` supprimé, `'master'` renommé `'trainingSupervisor'` |
| Frontend `entities.ts` | `location: string` → `hospitalName: string\|null`; `master` → `trainingSupervisorId/Firstname/Lastname` |
| Vitest | `pool: "forks"`, `singleFork: true`, `testTimeout: 15000` |

### Métier

- Les managers voient maintenant `hospitalName` (source unique) dans toutes les réponses API
- Le maître de stage est clairement distingué des droits applicatifs
- La création d'année sans hôpital est impossible (erreur 400 côté API, contrainte DB)
- Les MACCS des années supprimées (IDs 41, 46, 56, 73) ont été migrées vers hospital_id=1 (Option B retenue)

### Migration — Ordre d'exécution en production

```
1. git pull (déployer le code)
2. app:repair-orphan-years --fix (corriger les orphelines via SQL direct si nécessaire)
3. doctrine:migrations:migrate (applique 071600 → 123247 → 150016 → DropLocation → s'arrête sur HospitalIdNotNull)
4. Vérifier COUNT(*) WHERE hospital_id IS NULL = 0
5. doctrine:migrations:migrate (applique HospitalIdNotNull)
6. cache:clear
```

---

## État final du modèle

```
Hospital (NOT NULL)
    │
    ▼
Years
    ├── hospital_id (FK, NOT NULL)
    ├── training_supervisor_id (FK, nullable)
    ├── title, period, dateOfStart, dateOfEnd
    ├── speciality, comment, status, token
    └── createdAt
         │
         ├── ManagerYears (droits applicatifs par manager)
         │       ├── admin, dataAccess, dataValidation
         │       ├── dataDownload, hasAgendaAccess, canManageAgenda
         │       └── invitedAt (null = auto, non-null = invitation)
         │
         └── YearsResident (inscription MACCS)
                 ├── allowed (false = en attente)
                 └── optingOut, legalLeaves, scientificLeaves, ...
```

**Règle d'accès finale :**
- HospitalAdmin → accès direct via `year.hospital_id === admin.hospital_id` (YearAccessVoter)
- Manager → accès via `ManagerYears` avec les droits correspondants
- trainingSupervisor → notion légale, aucun droit applicatif

---

## Références

- Sprint commits : `88a2504` (2026-05-31)
- Tests de non-régression : `Sprint1OwnerRemovalTest`, `Sprint2YearCreationUnificationTest`, `Sprint3OrphanYearsRepairTest`, `Sprint4TrainingSupervisorTest`
- Documentation : `docs/YEARS.md`, `docs/YEARS_QUICKSTART.md`
