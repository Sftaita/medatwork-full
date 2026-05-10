# Modèle de Données — Medatwork

## Vue d'Ensemble

26 entités Doctrine organisées autour de deux acteurs principaux (**Manager** et **Resident**), liés par une **Year** (année académique), elle-même rattachée à un **Hospital**.

**Nouvelles entités Sprint 1 (2026-04-02) :** `Hospital`, `AppAdmin`, `HospitalAdmin`, `HospitalRequest`.

**Nouvelles entités Sprint 2 (2026-04-07) :** `CommunicationMessage`, `CommunicationMessageRead`.

**Nouvelles entités Sprint 3 (2026-05-06) :** `StaffPlannerExportStatus` (suivi export par MACCS × mois).

> ⚠️ `StaffPlannerMonthStatus` — entité créée le 6 mai 2026 puis immédiatement remplacée par `StaffPlannerExportStatus`. Elle existe en base de données mais n'est utilisée par aucun service ni controller. Elle sera supprimée dans une prochaine migration de nettoyage.

---

## StaffPlannerExportStatus

Suivi des exports Staff Planner avec granularité **MACCS × mois**. Source de vérité unique pour le workflow RH.

| Champ | Type | Description |
|---|---|---|
| `yearsResident` | FK → YearsResident (CASCADE) | Le MACCS dans son année académique — **obligatoire** |
| `month` | smallint (1–12) | Mois calendaire |
| `calendarYear` | smallint | Année calendaire (ex. 2024) |
| `treated` | bool (default: false) | Item marqué traité par RH |
| `treatedAt` | datetime? | Date du marquage traité |
| `treatedByType` | varchar(30)? | `'manager'` \| `'hospital_admin'` \| `'app_admin'` |
| `treatedById` | int? | ID de l'utilisateur (polymorphe, pas de FK) |
| `downloadCount` | smallint (default: 0) | Nombre d'inclusions dans un export Staff Planner |
| `lastGeneratedAt` | datetime? | Date du dernier export Staff Planner incluant ce MACCS |
| `createdAt` | datetime | Création |
| `updatedAt` | datetime | Dernière mise à jour |

**Contrainte unique :** `(years_resident_id, month, calendar_year)` — un seul statut par MACCS × mois.

**Décision métier :** La validation MDS (`ResidentValidation.validated`) est **informative uniquement** et ne bloque pas l'export. Tous les MACCS inscrits à l'année sont affichés, validés MDS ou non.

**Flux RH :**
1. `GET /api/hospital-admin/years/{yearId}/staff-planner-months` → `StaffPlannerMonthsService::listMonthsForYear()` → grille de tous les MACCS × mois avec `validatedByMds` (info) et `treated` (statut RH)
2. `PATCH /api/hospital-admin/staff-planner-items/{yrId}/{month}/{calendarYear}/treated` → toggle `treated` manuellement
3. `POST /api/managers/SPImport` avec `{ items: [{ yearResidentId, month, calendarYear }] }` → génère `.txt` → appelle `StaffPlannerMonthsService::markItemsTreatedAfterGeneration()` → incrémente `downloadCount`, met `lastGeneratedAt`, marque `treated=true`

---

## Diagramme Conceptuel

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Manager   │     │    Years     │     │  Resident   │
│             │◄────┤  (Année      ├────►│             │
│  ROLE_MANAGER│    │  académique) │     │ROLE_RESIDENT│
└──────┬──────┘     └──────┬───────┘     └──────┬──────┘
       │                   │                    │
       │            ┌──────┴───────┐            │
       │            │ WeekTemplate │            │
       │            │  (modèle de  │            │
       │            │   semaine)   │            │
       │            └──────┬───────┘            │
       │                   │                    │
       │            ┌──────▼───────┐            │
       │            │  WeekTask    │            │
       │            │  (tâche type)│            │
       │            └──────────────┘            │
       │                                        │
       │                              ┌─────────▼──────────┐
       │                              │ ResidentWeeklySchedule│
       │                              │   (semaine résident) │
       │                              └────┬─────┬─────┬────┘
       │                                   │     │     │
       │                         ┌─────────┘     │     └──────────┐
       │                         ▼               ▼                ▼
       │                    ┌────────┐      ┌────────┐     ┌──────────┐
       │                    │Garde   │      │Absence │     │Timesheet │
       │                    │(garde) │      │        │     │(feuille) │
       │                    └────────┘      └────────┘     └──────────┘
       │
┌──────▼──────────────┐
│  PeriodValidation   │
│  (validation manager│
│   d'une période)    │
└─────────────────────┘
```

---

## Entités Détaillées

### Manager
Représente un médecin responsable de stage.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | int | Clé primaire |
| `email` | string | Identifiant unique |
| `password` | string | Mot de passe haché |
| `firstname` | string | Prénom |
| `lastname` | string | Nom |
| `roles` | json | `["ROLE_MANAGER"]` |
| `token` | string\|null | Token d'activation email (null = validé) |
| `tokenExpiration` | datetime\|null | Expiration du token |
| `status` | enum | `active` \| `pending_hospital` |
| `hospital` | string\|null | ⚠️ Champ legacy — utiliser `hospitals` |
| `receiveComplianceEmails` | bool | Alertes conformité par email |

**Relations :**
- `hospitals` (ManyToMany → `Hospital`, pivot `manager_hospital`) — **source de vérité** pour l'appartenance d'un manager à un hôpital. Un manager dans `getHospitals()` est ajouté automatiquement aux années de cet hôpital sans invitation. Peuplé à 4 moments : auto-inscription, promotion admin, setup profil après invitation, acceptation d'invitation d'année.
- `managerYears` (OneToMany → `ManagerYears`)
- `notificationManagers` (OneToMany → `NotificationManager`, orphanRemoval)
- `adminHospital` (ManyToOne → `Hospital`, nullable) — hôpital dont ce manager est l'administrateur RH

**Enum `ManagerStatus` :**
- `active` — compte actif et lié à au moins un hôpital
- `pending_hospital` — en attente d'approbation de la demande d'hôpital → connexion bloquée

**Statut UI en fonction des champs :**
| `ManagerYears.invitedAt` | `token` | `validatedAt` | Chip dashboard |
|---|---|---|---|
| `!= null` | `!= null` | `null` | 🟡 Compte non activé |
| `!= null` | `!= null` | `!= null` | 🔵 Invitation non acceptée |
| `null` | `!= null` | `null` | 🟡 Compte non activé (auto-ajouté) |
| `null` | `null` | `!= null` | ✅ Actif |

**Actions de suppression (sémantiques différentes) :**
- **Retirer de l'année** (`DELETE /api/hospital-admin/manager-years/{myId}`) → supprime uniquement `ManagerYears`. Le lien `manager_hospital` et les autres attributions restent intacts.
- **Supprimer de l'hôpital** (`DELETE /api/hospital-admin/managers/{managerId}`) → supprime tous les `ManagerYears` liés aux années de cet hôpital ET le lien `manager_hospital`. Le `Manager` entity est soft-deleté s'il n'a plus aucune autre appartenance.

---

### Resident
Représente un médecin en formation (interne).

| Champ | Type | Description |
|-------|------|-------------|
| `id` | int | Clé primaire |
| `email` | string | Identifiant unique |
| `password` | string | Mot de passe haché |
| `firstName` | string | Prénom |
| `lastName` | string | Nom |
| `roles` | json | `["ROLE_RESIDENT"]` |
| `isActivated` | bool | Compte activé |
| `activationToken` | string | Token d'activation |

**Relations :**
- `YearsResident` (ManyToMany avec `Years`)
- `ResidentWeeklySchedule` (OneToMany)
- `NotificationResident` (OneToMany)

---

### Years
Représente une année académique (stage dans un hôpital).

| Champ | Type | Description |
|-------|------|-------------|
| `id` | int | Clé primaire |
| `title` | string | Titre libre |
| `period` | string | Ex: "2022-2023" |
| `dateOfStart` | date | Début du stage |
| `dateOfEnd` | date | Fin du stage |
| `location` | string | Lieu du stage |
| `speciality` | string\|null | Spécialité médicale |
| `hospital` | FK\|null | `Hospital` (nullable — rétrocompat migration) |

**Relations :**
- `hospital` (ManyToOne → `Hospital`, nullable)
- `managers` (OneToMany → `ManagerYears`)
- `residents` (OneToMany → `YearsResident`)
- `timesheets` (OneToMany)
- `gardes` (OneToMany)
- `absences` (OneToMany)
- `periodValidations` (OneToMany)
- `yearsWeekIntervals` (OneToMany)
- `yearsWeekTemplates` (OneToMany)

---

### ResidentWeeklySchedule
Planning hebdomadaire d'un résident pour une semaine donnée.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | int | Clé primaire |
| `resident` | FK | `Resident` |
| `year` | FK | `Years` |
| `weekStart` | date | Début de la semaine |
| `weekEnd` | date | Fin de la semaine |
| `weekNumber` | int | Numéro de semaine |

**Relations :**
- `Timesheet` (OneToMany)
- `Garde` (OneToMany)
- `Absence` (OneToMany)
- `WeekTask` (OneToMany)

---

### Timesheet
Feuille de temps quotidienne d'un résident.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | int | Clé primaire |
| `weeklySchedule` | FK | `ResidentWeeklySchedule` |
| `date` | date | Date du jour |
| `startTime` | time | Heure de début |
| `endTime` | time | Heure de fin |
| `type` | string | Type d'activité |

---

### Garde
Garde médicale d'un résident.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | int | Clé primaire |
| `weeklySchedule` | FK | `ResidentWeeklySchedule` |
| `date` | date | Date de la garde |
| `startTime` | time | Début |
| `endTime` | time | Fin |
| `type` | string | Type de garde |

---

### Absence
Absence d'un résident.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | int | Clé primaire |
| `weeklySchedule` | FK | `ResidentWeeklySchedule` |
| `startDate` | date | Début de l'absence |
| `endDate` | date | Fin de l'absence |
| `type` | string | Type d'absence (congé, maladie...) |

---

### WeekTemplates
Modèle de semaine type défini par un manager.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | int | Clé primaire |
| `year` | FK | `Years` |
| `manager` | FK | `Manager` |
| `label` | string | Nom du template |

**Relations :**
- `WeekTask` (OneToMany) — tâches type de ce template

---

### WeekTask
Tâche type dans un template de semaine.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | int | Clé primaire |
| `weekTemplate` | FK | `WeekTemplates` |
| `dayOfWeek` | int | Jour (1=lundi...7=dimanche) |
| `startTime` | time | Heure de début |
| `endTime` | time | Heure de fin |
| `type` | string | Type de tâche |

---

### PeriodValidation
Validation d'une période de formation par un manager.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | int | Clé primaire |
| `manager` | FK | `Manager` |
| `resident` | FK | `Resident` |
| `year` | FK | `Years` |
| `startDate` | date | Début de période |
| `endDate` | date | Fin de période |
| `status` | string | `pending`, `validated`, `rejected` |
| `validatedAt` | datetime | Date de validation |

---

### NotificationManager / NotificationResident
Notifications pour les managers et résidents.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | int | Clé primaire |
| `recipient` | FK | `Manager` ou `Resident` |
| `message` | string | Contenu |
| `isRead` | bool | Lu ou non |
| `createdAt` | datetime | Date de création |
| `type` | string | Type de notification |

---

---

### Hospital
Hôpital référencé dans le système (créé par l'admin ou via approbation d'une demande).

| Champ | Type | Description |
|-------|------|-------------|
| `id` | int | Clé primaire |
| `name` | string | Nom de l'hôpital |
| `city` | string\|null | Ville (optionnel) |
| `country` | string | Code pays ISO 2 (ex: `BE`) |
| `isActive` | bool | Visible dans les listes (défaut `true`) |

**Relations :**
- `managers` (ManyToMany ← `Manager`, pivot `manager_hospital`)
- `years` (OneToMany → `Years`)
- `hospitalAdmins` (OneToMany → `HospitalAdmin`)
- `hospitalRequests` (OneToMany → `HospitalRequest`)

---

### AppAdmin
Super-administrateur de la plateforme (compte technique, créé via CLI).

| Champ | Type | Description |
|-------|------|-------------|
| `id` | int | Clé primaire |
| `email` | string | Identifiant unique |
| `password` | string | Mot de passe haché |
| `roles` | json | `["ROLE_SUPER_ADMIN"]` |

Créé via : `symfony console app:create-app-admin`

---

### HospitalAdmin
Administrateur d'un hôpital, invité par email par un `AppAdmin`.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | int | Clé primaire |
| `email` | string | Identifiant unique |
| `password` | string\|null | Null jusqu'à l'activation du compte |
| `roles` | json | `["ROLE_HOSPITAL_ADMIN"]` |
| `status` | enum | `invited` \| `active` |
| `inviteToken` | string\|null | Token d'activation (durée 7 jours) |
| `inviteTokenExpiresAt` | datetime\|null | Expiration du token |

**Enum `HospitalAdminStatus` :**
- `invited` — email envoyé, compte non activé
- `active` — mot de passe défini, connexion autorisée

**Relations :**
- `hospital` (ManyToOne → `Hospital`)

---

### HospitalRequest
Demande d'un manager pour être associé à un hôpital.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | int | Clé primaire |
| `requestedBy` | FK | `Manager` ayant soumis la demande |
| `hospitalName` | string | Nom de l'hôpital demandé |
| `status` | enum | `pending` \| `approved` \| `rejected` |
| `createdAt` | datetime | Date de soumission |

**Enum `HospitalRequestStatus` :**
- `pending` — en attente de traitement par l'admin
- `approved` — approuvée : hôpital créé/réutilisé, manager associé et activé
- `rejected` — refusée

---

---

### CommunicationMessage
Message envoyé par un admin à un ensemble d'utilisateurs. Deux types : `notification` (badge + page) et `modal` (connexion, une seule fois).

| Champ | Type | Description |
|-------|------|-------------|
| `id` | int | Clé primaire |
| `type` | string | `notification` \| `modal` |
| `title` | string(255) | Titre du message |
| `body` | text | Contenu principal |
| `imageUrl` | string\|null | URL image (max 500 chars) |
| `linkUrl` | string\|null | URL lien externe (max 500 chars) |
| `buttonLabel` | string\|null | Libellé du bouton (max 100 chars) |
| `targetUrl` | string\|null | Route frontend vers laquelle naviguer au clic (notifications) |
| `priority` | int\|null | Ordre d'affichage des modals (plus petit = premier) |
| `authorType` | string | `super_admin` \| `hospital_admin` |
| `authorId` | int | ID de l'auteur |
| `scopeType` | string | `all` \| `role` \| `user` |
| `targetRole` | string\|null | `manager` \| `resident` \| `hospital_admin` (si scopeType=role) |
| `targetUserId` | int\|null | ID utilisateur cible (si scopeType=user) |
| `targetUserType` | string\|null | Type de l'utilisateur cible (si scopeType=user) |
| `hospital` | FK\|null | `Hospital` — restreint la livraison à un hôpital ; null = global |
| `isActive` | bool | false = masqué, non livré (défaut true) |
| `readCount` | int | Nombre de lectures (dénormalisé) |
| `createdAt` | datetime | Date de création |

**Relations :**
- `hospital` (ManyToOne → `Hospital`, nullable, ON DELETE SET NULL)
- `reads` (OneToMany → `CommunicationMessageRead`, CASCADE DELETE)

**Index :**
- `idx_comm_type_active` (type, is_active)
- `idx_comm_hospital_active` (hospital_id, is_active)

**Constantes :**
```php
TYPE_NOTIFICATION = 'notification'    TYPE_MODAL = 'modal'
SCOPE_ALL = 'all'   SCOPE_ROLE = 'role'   SCOPE_USER = 'user'
AUTHOR_SUPER_ADMIN = 'super_admin'    AUTHOR_HOSPITAL_ADMIN = 'hospital_admin'
ROLE_MANAGER = 'manager'   ROLE_RESIDENT = 'resident'   ROLE_HOSPITAL_ADMIN = 'hospital_admin'
```

---

### CommunicationMessageRead
Enregistrement de lecture d'un message par un utilisateur (idempotent — inséré une seule fois).

| Champ | Type | Description |
|-------|------|-------------|
| `id` | int | Clé primaire |
| `communicationMessage` | FK | `CommunicationMessage` (ON DELETE CASCADE) |
| `userType` | string | `manager` \| `resident` \| `hospital_admin` |
| `userId` | int | ID de l'utilisateur |
| `readAt` | datetime | Horodatage de la lecture |

**Contraintes :**
- `UNIQUE (communicationMessage, userType, userId)` — un enregistrement par (message × utilisateur)
- Index `idx_comm_read_user` (userType, userId)

---

## Migrations

59 migrations Doctrine (2022–2026) documentent l'évolution du schéma.

**Sprint 1 (2026-04-02) :** `Version20260403000000` — création des tables `hospital`, `app_admin`, `hospital_admin`, `hospital_request`, `manager_hospital` ; migration des données `manager.hospital` (string) vers la table `hospital`.

**Sprint 2 (2026-04-07) :** `Version20260405000000` — création des tables `communication_message` et `communication_message_read`.

Pour voir l'historique :
```bash
symfony console doctrine:migrations:status
```

Pour créer une nouvelle migration après modification d'entité :
```bash
symfony console doctrine:migrations:diff
symfony console doctrine:migrations:migrate
```

---

*Document créé le 2026-03-20 — mis à jour le 2026-04-07 (Sprint 2 Communication System)*
