# Audit Initial — Medatwork

**Date :** 2026-03-20
**Dernière mise à jour :** 2026-03-22
**Environnement :** Windows 11, WAMP, MySQL, Symfony 5.4, React 17
**Statut :** Professionnalisation en cours — failles critiques corrigées, tests en place

---

## Résumé Exécutif

| Métrique | Valeur (audit initial) | Valeur (2026-03-22) |
|----------|------------------------|---------------------|
| Fichiers PHP backend | ~132 | ~132 |
| Fichiers JS/JSX frontend | ~248 | ~248 |
| Entités Doctrine | 21 | 21 |
| Contrôleurs | 30+ | 30+ |
| Services | 15+ | 16+ |
| DTOs | 0 | 19 |
| Migrations | 50 | 50 |
| Tests unitaires | 0 | **364 (703 assertions)** |

### Tableau des Risques (mis à jour)

| Catégorie | Nombre initial | Statut |
|-----------|----------------|--------|
| Secrets exposés | 1 | ⚠️ Non corrigé (action manuelle requise) |
| Tokens cryptographiquement faibles | 3 | ✅ Corrigé |
| SSL désactivé | 1 | ✅ Corrigé |
| Problèmes d'authentification | 5 | ⚠️ Partiellement corrigé |
| Validation des entrées | 3 | ✅ Corrigé (DTOs) |
| Codes de débogage en prod | 7 | ✅ Corrigé |
| Dettes techniques | 15+ | 🔄 En cours |

---

## Stack Technique

### Backend
- **Framework:** Symfony 5.4.x (LTS)
- **ORM:** Doctrine 2.10
- **API:** API Platform 2.7.18
- **Auth:** Lexik JWT + Gesdinet Refresh Token
- **BDD:** MySQL (`medcligmedatwork`)
- **Email:** SendGrid via Symfony Mailer
- **Migrations:** Doctrine Migrations 3.2

### Frontend
- **Framework:** React 17.0.2
- **Routage:** React Router v6.0.2
- **State:** Context API + Hooks
- **HTTP:** Axios
- **UI:** Material-UI 5.11.15
- **Calendrier:** FullCalendar 6.1.8
- **Charts:** Chart.js 3.7.0, Recharts 2.4.1
- **Formulaires:** Formik 2.2.9 + Yup 0.32.11

---

## Points Forts (mis à jour)

- Architecture Backend/Frontend séparée et claire
- Utilisation de Symfony 5.4 LTS (framework mature)
- Services métier bien organisés avec séparation des responsabilités
- Hooks React modernes (pas de class components)
- Authentification JWT avec refresh tokens
- 50 migrations Doctrine gérées
- Génération de rapports Excel
- Système de notifications
- **19 DTOs d'entrée** avec validation stricte et tests exhaustifs
- **364 tests unitaires** (0 au départ)

---

## Failles de Sécurité

### CRITIQUES

#### C1 — Tokens Cryptographiquement Faibles ✅ CORRIGÉ (2026-03-22)
Tous les `md5(uniqid())` remplacés par `bin2hex(random_bytes(32))` dans :
- `ManagersAPIController` (registration manager)
- `PublicAPIController` (registration résident)
- `ResetPasswordToken` service
- `ActivationTokenEncoder` event subscriber

---

#### C2 — Vérification SSL Désactivée ✅ CORRIGÉ
Options cURL `CURLOPT_SSL_VERIFYPEER => false` supprimées de `CustomSendGrid.php`.

---

#### C3 — JWT Passphrase Faible
⚠️ **Action manuelle requise** : Vérifier que `JWT_PASSPHRASE` dans `.env.local` fait au moins 32 caractères aléatoires.
```bash
openssl rand -base64 64
```

---

#### C4 — Secrets Exposés dans le Dépôt
⚠️ **Action manuelle requise** : Le fichier `.env` peut contenir des clés API. Révoquer et régénérer si elles ont fuité.

---

### MAJEURES

#### M1 — Endpoint Public sans Authentification ⚠️ OUVERT
**Fichier :** `backend/config/packages/security.yaml`
```yaml
- { path: ^/api/fetchManagers, roles: PUBLIC_ACCESS }
```
Liste tous les managers sans authentification.

#### M2 — Tokens d'Activation Sans Expiration ⚠️ OUVERT
Les tokens d'activation ne sont pas soumis à une date d'expiration.

#### M3 — Protection CSRF
En mode API REST + JWT avec cookies HttpOnly, vérifier que le cookie refresh token a l'attribut `SameSite=Strict`.

#### M4 — CORS avec `allow_credentials: true`
Combinaison à surveiller avec les méthodes `PUT`, `PATCH`, `DELETE`.

---

### MINEURES

#### m1 — Code de Débogage `dd()` en Production ✅ CORRIGÉ (2026-03-22)
Tous les `dd()`, `die()` et `exit()` dans les contrôleurs remplacés par des `JsonResponse` appropriées.

Fichiers `dd()` restants à vérifier dans les **services** (non-contrôleurs) :
- `backend/src/Services/ManagerMonthValidation/GetMonthStatus.php`
- `backend/src/Services/StaffPlanner/CheckResidentResources.php`
- `backend/src/Services/YearsManagement/UpdateYear.php`

#### m2 — Validation JSON Insuffisante ✅ CORRIGÉ (2026-03-22)
Migré vers des DTOs typés (`fromRequest()`) avec lancement d'`\InvalidArgumentException` sur entrée invalide. 19 DTOs couvrant ~40 méthodes de contrôleur.

#### m3 — Rate Limiting ⚠️ Partiellement implémenté
Rate limiting actif sur : inscription manager, reset de mot de passe.
Manquant sur : login, refresh token.

#### m4 — Logs de Sécurité
Aucune traçabilité des tentatives d'accès non autorisé.

---

## Dettes Techniques

### Architecture
1. `FunctionsController.php` (175 lignes) — fonctions utilitaires non-OOP, devrait être un service
2. `GetPeriodSummary.php` (1055 lignes) — viole le principe de responsabilité unique
3. `StatisticTools.php` (~19k lignes) — massif, doit être découpé
4. ~~Pas de DTO~~ → **19 DTOs d'entrée créés** ✅
5. Pas de Global Exception Handler
6. Pas de Cache (nombreuses requêtes répétées)
7. Plusieurs contrôleurs contiennent encore de la logique métier directement

### Code
1. ~~**Aucun test**~~ → **364 tests, 703 assertions** ✅
2. Duplication : logique de création de token identique dans Manager et Resident
3. Magic numbers et dates hardcodées
4. ~~`ManagerAccessChecker` service redondant~~ → **supprimé** ✅
5. ~~Inline callable garde logic (150 lignes)~~ → **`CallableGardeMapper` service extrait** ✅

### Dépendances
1. React 17 — fin de vie, migrer vers React 18
2. Moment.js — legacy, remplacer par date-fns (déjà présent)
3. Trop de librairies charts : Chart.js + Recharts → choisir l'une ou l'autre
4. API Platform 2.7 → 3 warnings de dépréciation internes (migration vers v3 à planifier)

### Outillage
1. Pas de `.env.example` — difficile d'onboarder un nouveau développeur
2. Pas de Docker / docker-compose
3. Pas de CI/CD (GitHub Actions, etc.)
4. Pas de pre-commit hooks (ESLint, PHPStan)

---

## Roadmap de Modernisation (mise à jour)

### Phase 1 — Sécurité Critique ✅ TERMINÉ
- [x] Remplacer tous les `md5(uniqid())` par `bin2hex(random_bytes(32))`
- [x] Supprimer les options SSL dans `CustomSendGrid.php`
- [x] Supprimer tous les `dd()`, `die()`, `exit()` dans les contrôleurs
- [ ] Sécuriser l'endpoint `/api/fetchManagers` ← **prochain**
- [ ] Révoquer et régénérer les clés SendGrid et JWT (action manuelle)

### Phase 2 — Stabilisation ✅ TERMINÉ
- [x] Validation stricte des entrées JSON (19 DTOs)
- [x] Premiers tests unitaires (364 tests)
- [x] Extraction de `CallableGardeMapper` en service pur
- [x] Suppression de `ManagerAccessChecker` (redondant avec Voters)
- [ ] Global Exception Handler ← **prochain**
- [ ] `.env.example`

### Phase 3 — Refactoring 🔄 EN COURS
- [x] DTOs d'entrée (19 DTOs)
- [ ] Upgrade API Platform 2.7 → 3.x
- [ ] Découper les services trop longs (StatisticTools, GetPeriodSummary)
- [ ] Déplacer logique métier des contrôleurs vers services
- [ ] Tests d'intégration API

### Phase 4 — Modernisation
- [ ] Docker + docker-compose
- [ ] GitHub Actions CI/CD
- [ ] TypeScript Frontend
- [ ] Migrer React 17 → React 18
- [ ] Remplacer Moment.js par date-fns
- [ ] Configurer ESLint + PHPStan
- [ ] Considérer migration Symfony 6/7

---

*Audit initial : 2026-03-20 — Dernière mise à jour : 2026-03-22*
