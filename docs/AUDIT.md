# Audit Initial — Medatwork

**Date :** 2026-03-20
**Dernière mise à jour :** 2026-04-14 (session 15)
**Environnement :** Windows 11, WAMP + Docker, MySQL, Symfony 7.4 LTS, React 18
**Statut :** Professionnalisation en cours — Système photos de profil + audit/fix CRUD années + footer + spécialité Autocomplete

---

## Résumé Exécutif

| Métrique | Valeur (audit initial) | Valeur (2026-03-22) | Valeur (2026-03-28) | Valeur (2026-03-31) | Valeur (2026-04-02) | Valeur (2026-04-03) | Valeur (2026-04-03 s2) | Valeur (2026-04-03 s4) | Valeur (2026-04-03 s5) | Valeur (2026-04-04 s7) | Valeur (2026-04-04 s8) | Valeur (2026-04-14 s14) |
|----------|------------------------|---------------------|---------------------|---------------------|---------------------|---------------------|------------------------|------------------------|------------------------|------------------------|------------------------|------------------------|
| Fichiers PHP backend | ~132 | ~132 | ~135 | ~139 | **~160** | ~162 | ~162 | ~163 | **~165** | ~165 | ~165 | **~170** | ~170 | **~171** |
| Fichiers JS/TSX frontend | ~248 | ~248 | ~248 | ~249 | ~251 | **~255** | ~255 | **~257** | **~260** | ~260 | **~263** | **~265** | ~265 | ~265 |
| Entités Doctrine | 21 | 21 | 21 | 21 | **25** | 25 | 25 | 25 | 25 | 25 | 25 | **26** | 26 | 26 |
| Enums PHP | 1 | 1 | 3 | 3 | **6** | 6 | 6 | 6 | 6 | 6 | 6 | **7** | 7 | 7 |
| Contrôleurs | 30+ | 30+ | 30+ | 30+ | **33+** | **34+** | 34+ | 34+ | **35+** | 35+ | 35+ | 35+ | 35+ | 35+ |
| Services | 15+ | 16+ | 16+ | 17+ | 18+ | 18+ | 18+ | 18+ | 18+ | 18+ | 18+ | **19+** | 19+ | 19+ |
| DTOs | 0 | 19 | 19 | 19 | **22** | 22 | 22 | 22 | 22 | 22 | 22 | 22 | 22 | 22 |
| Migrations | 50 | 50 | 50 | 52 | **54** | 54 | **55** | 55 | 55 | 55 | **57** | **58** | 58 | 58 |
| Tests unitaires backend | 0 | **364 (703 ass.)** | **589 (1 153 ass.)** | **690 (1 405 ass.)** | **980 (1 904 ass.)** | 980 | 980 | 980 | **1 016 (+36)** | **1 021 (+5)** | 1 021 | 1 021 | 1 021 | **1 027 (+6)** |
| Tests intégration API | 0 | 0 | 0 | **10 (19 ass.)** | **10 (19 ass.)** | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | **19 (+9)** |
| Tests unitaires frontend | 0 | ~60 | **105 (Vitest)** | **114 (Vitest)** | **136 (Vitest)** | **141 (Vitest)** | **235 (Vitest)** | 235 | 235 | 235 | 235 | 235 | 235 | **243 (+8)** |
| Score PWA Lighthouse (estimé) | — | — | — | — | — | — | — | — | — | — | **92/100** | 92/100 | 92/100 | 92/100 |

### Tableau des Risques (mis à jour)

| Catégorie | Nombre initial | Statut |
|-----------|----------------|--------|
| Secrets exposés | 1 | ✅ Corrigé (JWT_PASSPHRASE déplacé dans `.env.local`, valeur forte générée) |
| Tokens cryptographiquement faibles | 3 | ✅ Corrigé |
| SSL désactivé | 1 | ✅ Corrigé |
| Problèmes d'authentification | 5 | ✅ Corrigé (expiration tokens 48h, rate limiting, user enumeration, resend-activation) |
| Validation des entrées | 3 | ✅ Corrigé (DTOs + Global Exception Handler) |
| Codes de débogage en prod | 7 | ✅ Corrigé |
| Dettes techniques | 15+ | 🔄 En cours |

---

## Stack Technique

### Backend
- **Framework:** Symfony 7.4.x (LTS) — migré depuis 5.4 → 6.4 → 7.4
- **ORM:** Doctrine 2.x
- **API:** API Platform 3.x
- **Auth:** Lexik JWT + Gesdinet Refresh Token
- **BDD:** MySQL (`medcligmedatwork`)
- **Email:** Hostinger SMTP via Symfony Mailer (+ Mailpit en dev Docker)
- **Migrations:** Doctrine Migrations 3.x

### Frontend
- **Framework:** React 17.0.2
- **Routage:** React Router v6.0.2
- **State:** React Query (TanStack v5) + Zustand + Context API
- **HTTP:** Axios (intercepteurs JWT)
- **UI:** Material-UI 5.11.15
- **Calendrier:** FullCalendar 6.1.8
- **Charts:** Chart.js 3.7.0, Recharts 2.4.1
- **Formulaires:** Formik 2.2.9 + Yup 0.32.11
- **Tests:** Vitest + React Testing Library

---

## Points Forts (mis à jour)

- Architecture Backend/Frontend séparée et claire
- Symfony 7.4 LTS (migré depuis 5.4)
- Services métier bien organisés avec séparation des responsabilités
- Hooks React modernes (pas de class components)
- Authentification JWT avec refresh tokens et verrou de concurrence
- 50 migrations Doctrine gérées
- Génération de rapports Excel
- Système de notifications entièrement refactorisé (React Query, PATCH, purge automatique)
- **22 DTOs d'entrée** avec validation stricte et tests exhaustifs
- **Global Exception Handler** : `InvalidArgumentException` → 400, 5xx sans détails internes
- **980 tests unitaires backend** (0 au départ), **114 tests Vitest frontend**
- **`.env.example`** avec instructions d'onboarding
- **Sprint 1 Hospital** : 4 nouvelles entités, 3 contrôleurs, CLI setup, migrations non-destructives

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

#### C3 — JWT Passphrase dans le dépôt ⚠️ ACTION MANUELLE
Le fichier `.env` commité contient `JWT_PASSPHRASE=7e8d1edde628a7e8a27605609d38b24d`.
**Action requise :** régénérer la passphrase et la stocker uniquement dans `.env.local`.
```bash
openssl rand -base64 48
```

---

#### C4 — Secrets Exposés dans le Dépôt ⚠️ ACTION MANUELLE
Le fichier `.env` peut contenir des clés API réelles. Révoquer et régénérer si elles ont fuité.
**`.env.example` créé** pour documenter toutes les variables requises.

---

### MAJEURES

#### M1 — Endpoint Public sans Authentification ✅ CORRIGÉ
`/api/fetchManagers` sécurisé avec `ROLE_MANAGER` dans `security.yaml` + `#[IsGranted('ROLE_MANAGER')]` au niveau contrôleur (defense-in-depth, 2026-04-13).

#### M5 — `getYearById` sans vérification d'accès ✅ CORRIGÉ (2026-04-13)
`GET /api/managers/getYearById/{yearId}` n'avait aucun check d'appartenance : tout manager authentifié pouvait lire n'importe quelle année. Vérification `managerYearsRepository->checkRelation()` ajoutée → 403 si non lié.

#### M2 — Tokens d'Activation Sans Expiration ✅ CORRIGÉ
- `ActivationTokenEncoder` : expiration à `+24 heures` (setTokenExpiration)
- `TokenActivationController` : vérifie l'expiration, redirige vers `/token-expired`
- `PasswordResetService` : expiration à `+1 jour`

#### M3 — Protection CSRF
En mode API REST + JWT avec cookies HttpOnly, vérifier que le cookie refresh token a l'attribut `SameSite=Strict`.

#### M4 — CORS avec `allow_credentials: true`
Combinaison à surveiller avec les méthodes `PUT`, `PATCH`, `DELETE`.

---

### MINEURES

#### m1 — Code de Débogage `dd()` en Production ✅ CORRIGÉ (2026-03-22)
Tous les `dd()`, `die()` et `exit()` dans les contrôleurs et services remplacés par des `JsonResponse` / exceptions appropriées.

#### m2 — Validation JSON Insuffisante ✅ CORRIGÉ (2026-03-22)
Migré vers des DTOs typés (`fromRequest()`) avec lancement d'`\InvalidArgumentException` sur entrée invalide. 19 DTOs couvrant ~40 méthodes de contrôleur.
`ExceptionListener` gère `\InvalidArgumentException` → 400 avec message safe.

#### m3 — Rate Limiting ✅ CORRIGÉ
- Login : `login_throttling` (5 tentatives / minute) dans `security.yaml`
- Reset password : rate limiter dédié
- Refresh token : `RefreshTokenRateLimiterListener` (20 refreshes / 5 minutes)
- Mutations manager (`addManager`, `updateYear`, `updateRights`) : `manager_mutation` limiter (60 req/h/IP), ajouté 2026-04-13

#### m4 — Logs de Sécurité
Aucune traçabilité des tentatives d'accès non autorisé. (`ExceptionListener` logue les 5xx, mais pas les 401/403 de sécurité).

---

## Dettes Techniques

### Architecture
1. `FunctionsController.php` (175 lignes) — fonctions utilitaires non-OOP, devrait être un service
2. ~~`GetPeriodSummary.php` (1055 lignes)~~ → **705 → 543 lignes après refactoring** ✅ (2026-03-31)
3. ~~`StatisticTools.php` (~19k lignes)~~ → **442 lignes, déjà refactorisé** ✅ (bug `hospitalGardeHoursNb` corrigé, `classifyHours` extrait)
4. ~~Pas de DTO~~ → **19 DTOs d'entrée créés** ✅
5. ~~Pas de Global Exception Handler~~ → **`ExceptionListener` opérationnel** ✅ (2026-03-31)
6. Pas de Cache (nombreuses requêtes répétées)
7. Plusieurs contrôleurs contiennent encore de la logique métier directement

### Code
1. ~~**Aucun test**~~ → **690 tests backend, 114 tests frontend** ✅
2. Duplication : logique de création de token identique dans Manager et Resident
3. Magic numbers et dates hardcodées
4. ~~`ManagerAccessChecker` service redondant~~ → **supprimé** ✅
5. ~~Inline callable garde logic (150 lignes)~~ → **`CallableGardeMapper` service extrait** ✅
6. ~~N+1 queries dans les services de notifications~~ → **éliminé** ✅
7. ~~Polling notifications via `setInterval`~~ → **React Query `refetchInterval`** ✅

### Dépendances
1. React 17 — fin de vie, migrer vers React 18
2. Moment.js — legacy, remplacer par date-fns (déjà présent)
3. Trop de librairies charts : Chart.js + Recharts → choisir l'une ou l'autre
4. API Platform 3.x — quelques warnings de dépréciation internes

### Outillage
1. ~~Pas de `.env.example`~~ → **créé** ✅ (2026-03-31)
2. ~~Pas de Docker / docker-compose~~ → **`docker-compose.yml` opérationnel** ✅ (2026-04-04)
3. Pas de CI/CD (GitHub Actions, etc.)
4. Pas de pre-commit hooks (ESLint, PHPStan)

---

## Roadmap de Modernisation (mise à jour)

### Phase 1 — Sécurité Critique ✅ TERMINÉ
- [x] Remplacer tous les `md5(uniqid())` par `bin2hex(random_bytes(32))`
- [x] Supprimer les options SSL dans `CustomSendGrid.php`
- [x] Supprimer tous les `dd()`, `die()`, `exit()` dans les contrôleurs
- [x] Sécuriser l'endpoint `/api/fetchManagers` (ROLE_MANAGER)
- [x] Tokens d'activation avec expiration 48h (signup + resend)
- [x] Rate limiting sur login, reset password et refresh token
- [ ] Révoquer et régénérer JWT_PASSPHRASE + clés SendGrid (action manuelle)

### Phase 2 — Stabilisation ✅ TERMINÉ
- [x] Validation stricte des entrées JSON (19 DTOs)
- [x] Global Exception Handler (`InvalidArgumentException` → 400, 5xx sans détails internes)
- [x] Premiers tests unitaires (722 backend, 114 frontend)
- [x] Extraction de `CallableGardeMapper` en service pur
- [x] Suppression de `ManagerAccessChecker` (redondant avec Voters)
- [x] `.env.example` avec instructions d'onboarding

### Phase 3 — Refactoring 🔄 EN COURS
- [x] DTOs d'entrée (19 DTOs)
- [x] Refactoring système de notifications (2026-03-28)
- [x] Refactoring statistiques (2026-03-30)
- [x] Refactoring `GetPeriodSummary` (2026-03-31)
  - Extraction de `collectResidentPeriodData` (partie commune aux 2 méthodes publiques)
  - 705 → 543 lignes, duplication éliminée
  - 21 tests unitaires
- [x] Refactoring `StatisticTools` (2026-03-31)
  - Bug `hospitalGardeHoursNb` toujours 0 corrigé
  - Logique de classification horaire extraite en `classifyHours()`
  - 16 nouveaux tests `hoursCounter`
- [x] Déplacer logique métier des contrôleurs vers services (2026-04-02)
  - `StaffPlannerAPIController` 230 → 47 lignes
  - `GenerateStaffPlannerExport` : génération TXT extraite, bug fichier courant → `sys_get_temp_dir()` corrigé
  - 12 tests unitaires (`GenerateStaffPlannerExportTest`)
- [x] Tests d'intégration API (2026-04-01)
  - `ApiAuthTest` : 10 tests couvrant login, 401 sans token, RBAC manager vs résident
  - Infrastructure : `WebTestCase` + SQLite fichier + kernel partagé entre tests
- [x] Upgrade API Platform → warnings de dépréciation (2026-04-02)
  - `api_platform.yaml` : `legacy_query_parameter_validation: false` — désactive `ParameterValidator` (AP 3.4 → 4.0)
  - `Manager` + `Resident` : `#[\Deprecated]` sur `eraseCredentials()` (Symfony 7.3)

### Phase 4 — Modernisation
- [x] Docker + docker-compose (2026-04-02)
  - `docker-compose.yml` corrigé : backend connecté au service `db` (plus `host.docker.internal`)
  - Secrets via `.env` racine (git-ignoré), `.env.example` pour onboarding
  - Startup command : `composer install` + `lexik:jwt:generate-keypair --skip-if-exists` + migrations
  - `backend/.dockerignore` + `frontend/.dockerignore` ajoutés
  - Layer caching dans `Dockerfile.dev` (COPY composer.json/lock avant le code source)
- [x] GitHub Actions CI/CD (2026-04-01)
  - `ci.yml` : PHP 8.2 + Node 22, génération JWT keys via openssl, tests Unit + Integration
  - `quality.yml` : PHPStan level 5 + PHP CS Fixer + ESLint
- [x] TypeScript Frontend (2026-04-02)
  - 267 fichiers `.ts`/`.tsx`, 8 fichiers de tests migrés de `.js` → `.ts`
  - Seuls `service-worker.js` et `serviceWorkerRegistration.js` restent JS (infrastructure PWA)
- [x] Migrer React 17 → React 18 — déjà en place (`createRoot` utilisé, `react@18.3.1`)
- [x] Remplacer Moment.js par date-fns — absent du projet, `dayjs` utilisé à la place
- [x] Configurer ESLint + PHPStan — déjà en place (`.php-cs-fixer.php`, `phpstan.neon` level 5, `eslint.config.js`)

### Phase 5 — Sécurité API Platform 🔄 EN COURS
- [x] Suppression des routes CRUD auto-générées (2026-04-02)
  - `#[ApiResource]` retiré de `Absence`, `Garde`, `Timesheet`, `Manager`, `Resident`, `Years`
  - Le frontend n'utilise aucun endpoint AP : tous les appels passent par des contrôleurs custom
  - `#[Groups]` conservés (indépendants d'AP, utilisés par le sérialiseur Symfony)
- [x] Suppression du code mort lié à AP (2026-04-02)
  - `src/Events/ActivationTokenEncoder.php` — subscriber AP jamais déclenché (contrôleur custom fait le travail)
  - `src/Events/PasswordEncoderSubscriber.php` — idem
  - `src/Events/YearsManagerSubscriber.php` — idem
  - `src/Doctrine/CurrentUserExtension.php` — extension Doctrine AP jamais appelée
  - Entrée `services.yaml` pour `ActivationTokenEncoder` supprimée
- [x] PHPStan level 5 → 6 (2026-04-02)
  - 2 erreurs corrigées : `yearAbsenceProcessing` return type + `makeYear` param type
  - Baseline régénérée à 128 suppressions (mocks PHPUnit, violations architecturales connues)

---

## Journal des Modifications

### 2026-04-14 (session 15) — Système photo de profil + audit CRUD années + corrections UX

**Audit CRUD années (`HospitalAdminController` + `Years`) :**
- `isEditable()` : corrigé `return $this->status !== YearStatus::Archived` (était `Draft || Active` seulement → `closed` bloquait les mises à jour)
- PATCH `updateYear` : `isset()` → `array_key_exists()` pour `speciality` et `comment` (impossible de passer `null` via `isset` — champ nullable)
- PATCH `updateYear` : `YearStatus::from()` sans try-catch → `ValueError` non traitée → ajout try-catch → 422 avec message lisible si statut invalide

**UX — Spécialité Autocomplete (`HospitalAdminDashboardPage.tsx`) :**
- Champ `speciality` : `TextField` libre → `Autocomplete` MUI avec 34 spécialités médicales prédéfinies (`SPECIALITIES` array)
- `noOptionsText="Aucune spécialité correspondante"` pour UX recherche
- Si la valeur existante ne figure pas dans la liste (migration données), elle est ajoutée dynamiquement (`useMemo specialityOptions`)

**UX — Période pré-sélectionnée (`HospitalAdminDashboardPage.tsx`) :**
- `getCurrentAcademicYear()` : `baseYear = month >= 6 ? year : year-1` → retourne `"2025-2026"` automatiquement
- `EMPTY_FORM.period` initialisé avec l'année académique courante
- En mode édition : le formulaire est peuplé avec les valeurs existantes (incluant `period`)

**Footer — version (`Footer.tsx`) :**
- `beta 2.4.6` → `version 3.0`

**Système photo de profil :**

*Backend :*
- `HospitalAdmin`, `Manager`, `Resident` : champ `avatarPath VARCHAR(255) NULL` ajouté (getters/setters)
- Migration `Version20260414100000` : `ALTER TABLE ... ADD avatar_path VARCHAR(255) DEFAULT NULL` sur les 3 tables
- `ProfileAvatarController` (nouveau) :
  - `POST /api/profile/avatar` : validation MIME (JPEG/PNG/WebP via finfo), taille ≤ 2 Mo, sauvegarde dans `public/uploads/avatars/`, suppression ancien fichier, réponse `{avatarUrl}`
  - `DELETE /api/profile/avatar` : supprime le fichier, `avatarPath` → `null`, 204
  - Nom de fichier sécurisé : `bin2hex(random_bytes(16)) . '.' . $ext`
- `AuthenticationSuccessListener` : enrichi avec `avatarUrl` dans le payload JWT pour tous les rôles (`buildAvatarUrl()` déduit l'URL statique depuis `API_URL`)
- `config/services.yaml` : `ProfileAvatarController` avec `$kernelProjectDir: '%kernel.project_dir%'` ; `AuthenticationSuccessListener` avec `$apiUrl: '%env(API_URL)%'`

*Frontend :*
- `src/types/auth.ts` : `avatarUrl?: string | null` ajouté à `AuthState` et `RefreshTokenResponse`
- `src/store/authStore.ts` : `avatarUrl: null` dans l'état initial
- `src/hooks/useRefreshToken.ts` : `avatarUrl` propagé depuis la réponse de refresh
- `src/pages/Profile/ProfilePage.tsx` (nouveau) : affiche avatar (URL réelle ou fallback genre), overlay caméra, preview + confirm/cancel, upload via `POST profile/avatar` (multipart), suppression via `DELETE profile/avatar`
- `src/App.tsx` : route `/profile` accessible à tous les rôles authentifiés
- `Topbar.tsx` : avatar dynamique (`avatarUrl` ou fallback genre), clic → `/profile`

**Tests :**
- `frontend/src/pages/Profile/ProfilePage.test.tsx` (nouveau, 15 tests) : rendu, fallback genre, MIME/taille rejetés, preview (confirm/cancel), upload (POST appelé, `setAuthentication` updater), toast erreur, bouton delete visible/absent, DELETE appelé, `avatarUrl: null` après suppression
- `backend/tests/Unit/Controller/ProfileAvatarControllerTest.php` (nouveau, 12 tests) : 401 unauthenticated, 400 no file, 422 MIME/taille, 200 pour Manager/Resident/HospitalAdmin, `setAvatarPath` appelé avec pattern hex.ext, ancien fichier supprimé au ré-upload, 204 delete

---

### 2026-04-14 (session 14) — UX Communication + Tests + Édition messages + Pagination notifications

**Vérification sécurité :**
- Audit du code actuel confirme que toutes les failles de l'audit initial sont déjà corrigées : `md5(uniqid())` → `bin2hex(random_bytes(32))` partout, pas de `dd()`/`die()` en production, pas de désactivation SSL. Les occurrences `md5`/`uniqid` restantes sont dans des fichiers de config auto-générés ou des tests (contexte non-sécuritaire).

**UX / Fonctionnel — Journal d'activité (`HospitalAdminAuditLogPage.tsx`) :**
- Chargement de toutes les entrées en une seule requête (limit=1000)
- Filtre "Type d'action" : `Select` MUI avec tous les types `ACTION_LABEL`
- Filtre "Du / Au" : date range client-side, normalisation début/fin de journée
- `useMemo` pour filtrage réactif, reset de page automatique au changement de filtre
- Compteur de résultats filtré, bouton "Réinitialiser" conditionnel
- Export CSV opère sur la vue filtrée (pas sur toutes les données)
- Pagination réduite à 25 entrées/page (était 50)

**UX / Fonctionnel — Suppression de message (`CommunicationPageContent.tsx`) :**
- Backend : `DELETE /api/hospital-admin/communications/{id}` avec vérification de propriété → 204
- API frontend : `delete(id)` ajouté à `adminCommunicationsApi` et `hospitalAdminCommunicationsApi`
- `ApiSet` : `delete?` en optionnel → contrôle l'affichage du bouton par contexte
- Bouton poubelle (`DeleteOutlineIcon`) dans la colonne actions, rouge au survol
- Dialog de confirmation avant suppression irréversible
- `deleteMutation` : optimistic removal du cache avec rollback sur erreur

**UX / Fonctionnel — Marquer non lu (`HospitalAdminNotificationsPage.tsx`) :**
- Backend : `markAsUnread()` dans `CommunicationMessageReadRepository` (supprime l'enregistrement de lecture)
- Backend : `DELETE /api/communications/notifications/{id}/read`
- API frontend : `markNotificationUnread(id)` dans `communicationsApi`
- Bouton "Marquer non lu" dans le dialog de détail, visible uniquement si `isRead === true`
- Met à jour l'état du dialog immédiatement + invalide les deux query keys (liste + badge)

**UX / Fonctionnel — Édition de message (`CommunicationPageContent.tsx`) :**
- Backend : `PUT /api/hospital-admin/communications/{id}`, réutilise `CommunicationInputDTO`, vérification propriété, flush → 200
- API frontend : `update(id)` ajouté à `adminCommunicationsApi` et `hospitalAdminCommunicationsApi`
- `ApiSet` : `update?` en optionnel
- Bouton crayon (`EditIcon`) dans la colonne actions
- `handleOpenEdit()` pré-remplit le formulaire avec les valeurs existantes
- Le même `Dialog` est réutilisé en mode "création" et "édition" (titre + bouton adaptés)
- `updateMutation` : optimistic update du cache, fermeture immédiate du dialog, rollback sur erreur

**UX / Fonctionnel — Pagination des notifications (`HospitalAdminNotificationsPage.tsx`) :**
- `PAGE_SIZE = 20`, `useMemo` pour le filtrage, `pagedNotifs` pour le rendu
- Composant `Pagination` MUI sous le tableau, visible uniquement si `totalPages > 1`
- Reset de la page au changement de filtre (Toutes / Non lues)

**Tests frontend (`CommunicationPageContent.test.tsx`) :**
- Correction : test toggle brisé (`PowerSettingsNewIcon` → `ToggleOnIcon`/`ToggleOffIcon`)
- Ajout `mockDelete` dans le mock axios
- 5 nouveaux tests : bouton delete visible, bouton absent sans `api.delete`, dialog confirm, appel DELETE API, annulation sans appel
- Total : 19 → 24 tests

**Tests frontend (`HospitalAdminNotificationsPage.test.tsx`) :**
- Ajout `markNotificationUnread` + `mockDelete` dans les mocks
- 3 nouveaux tests : "Marquer non lu" visible si lu, masqué si non lu, appel DELETE API
- Total : 17 → 20 tests

**Tests backend (`CommunicationMessageReadRepositoryTest.php`) — nouveau fichier :**
- 6 tests d'intégration SQLite in-memory : `findOneByMessageAndUser` null, `markAsRead` création, idempotence, `markAsUnread` suppression, idempotence sur non-lu, isolation inter-utilisateurs
- Pattern identique à `CommunicationMessageRepositoryTest` (WebTestCase, kernel partagé, `tearDown` sans parent)

---

### 2026-04-13 (session 13) — Design System chips + UX fixes frontend

**Design System — Chip MUI (systématique) :**
- `CustomizedTheme.tsx` : `MuiChip.defaultProps = { variant: "outlined", size: "small" }` → tous les Chip de l'app sont désormais outlined par défaut, sans modifier chaque fichier
- `success.main` changé de `#56CA00` (vert néon) → `#2e7d32` (vert forêt professionnel) — affecte aussi les Alerts, boutons success
- Convention sémantique unifiée : `pending`/`invited`/`En attente` → `color="info"` (bleu) au lieu de `"warning"` (orange), dans 6 fichiers : `HospitalAdminResidentsPage`, `HospitalAdminManagersPage`, `HospitalAdminYearResidentsPage`, `AdminHospitalAdminsPage`, `AdminHospitalDetailPage`, `AdminManagersPage`, `AdminResidentsPage`
- Opting-out chips → `color="primary"` (violet) dans `HospitalAdminResidentsPage` + `HospitalAdminYearResidentsPage`

**Bug fix — Login redirect hospital_admin :**
- `AuthenticationSuccessListener.php` : un `Manager` avec `adminHospital !== null` retournait `role: "manager"` via `getRole()` (champ DB) au lieu de `role: "hospital_admin"` → le frontend le routait vers `/manager/realtime` au lieu de `/hospital-admin/dashboard`
- Fix : priorité sur `getAdminHospital() !== null` pour retourner `hospital_admin` + `hospitalId` + `hospitalName`

**Bug fix — Route year-detail inaccessible aux hospital_admin :**
- `/manager/year-detail` était derrière `ManagerRoute` (role === "manager" seulement) → hospital_admin redirigé vers `/login` en cliquant sur une carte du dashboard
- Fix : route dupliquée dans le bloc `HospitalAdminRoute` dans `App.tsx`

**UX — Sidebar et Topbar :**
- `sidebarNavData.tsx` : `linkTextSx` enrichi de `display: "block"` → les `<a>` NavLink sont désormais bloc, le `Button fullWidth` prend toute la largeur correctement
- `SidebarNav.tsx` : `sx={{ textAlign: "left" }}` ajouté sur le `Button` NavItem pour éviter tout centrage du texte en cas d'héritage CSS
- `Topbar.tsx` : badge "ADMIN" → texte enveloppé dans `<span style={{ color: "white" }}>` (inline style) pour garantir la lisibilité indépendamment de la couleur héritée du parent

**Modal d'aide — Journal d'activité :**
- `HospitalAdminAuditLogPage.tsx` : composant `HelpModal` ajouté (Dialog MUI) expliquant ce qui est tracé, qui peut consulter, durée de conservation
- Bouton `HelpOutlineIcon` à côté du titre "Journal d'activité"

---

### 2026-04-13 (session 12) — Audit Manager/Resident — bugs sécurité et qualité

**Sécurité :**
- `getYearById` : vérification d'accès manquante → tout manager pouvait lire toutes les années → `checkRelation()` + 403 ajoutés (`YearsManagerAPIController`)
- `#[IsGranted('ROLE_MANAGER')]` ajouté sur `fetchManagers` (defense-in-depth, déjà couvert par `security.yaml`)
- Rate limiting `manager_mutation` (60 req/h/IP) sur `addManager`, `updateYear`, `updateRights`

**Bugs :**
- `DeleteYearController` : boucle de promotion admin sans `break` → promouvait TOUS les autres managers admin simultanément → `break` ajouté après la première promotion
- `GetYearResidentController` : typo `$lastanme` → `$lastname` → colonne `lastname` toujours `null` dans la réponse API

**UX :**
- `YearPage.tsx` : label "Date de début" → "Date de fin" sur le champ `dateOfEnd` (confusion formulaire création d'année)

---

### 2026-04-13 (session 11) — Audit HospitalAdmin — fonctionnalités complètes

**Backend :**
- `YearStatus` enum (`draft/active/closed/archived`) + migration `Version20260413000000`
- `HospitalAdminAuditLog` entité + `HospitalAdminAuditLogRepository` + `HospitalAdminAuditService`
- Soft-delete managers (`is_deleted` + `deleted_at` sur `Manager`)
- Nouveaux endpoints `HospitalAdminController` :
  - `POST /api/hospital-admin/years` — créer une année
  - `PATCH /api/hospital-admin/years/{id}` — modifier (bloqué si archived)
  - `DELETE /api/hospital-admin/years/{id}` — supprimer (bloqué si résidents/managers liés)
  - `GET /api/hospital-admin/dashboard/stats` — KPIs (actifs, en attente, incomplets, invitations)
  - `GET /api/hospital-admin/audit-log` — journal paginé (limit/offset)
  - `POST /api/hospital-admin/residents/bulk-edit` — modifier en masse (optingOut)
  - `GET /api/hospital-admin/residents/export` — CSV StreamedResponse
- Corrections : token MACCS 1j → 7j, tri `active:0 pending:1 incomplete:2 retired:3`, blocage ajout MACCS sur années fermées/archivées

**Frontend :**
- `HospitalAdminDashboardPage` : KPIs (MACCS actifs, en attente, incomplets, invitations en cours)
- `HospitalAdminYearsPage` (nouveau) : CRUD complet années, dialog création/édition, confirmation suppression
- `HospitalAdminAuditLogPage` (nouveau) : tableau paginé, chips colorés par action, export CSV
- `HospitalAdminResidentsPage` : filtres statut + année, sélection multiple (checkboxes), bulk edit opting-out, export CSV
- `CsvDialog` : `LinearProgress` pendant import + bouton "Exporter erreurs" si erreurs détectées
- `hospitalAdminApi.ts` : types `YearStatus`, `YearInput`, `DashboardStats`, `AuditLogEntry` + nouvelles fonctions
- Routing (`App.tsx`) : `/hospital-admin/years` + `/hospital-admin/audit-log`
- Sidebar : entrées "Gestion des années" (icône calendrier) + "Journal d'activité" (icône clipboard)

---

### 2026-04-13 (session 10) — Sécurité npm + fix peer dep workbox-window

**Dépendances frontend :**
- `workbox-window` ajouté comme dépendance explicite (`^7.3.0`) — peer dep de `vite-plugin-pwa` non installée automatiquement avec `--legacy-peer-deps` (Docker), ce qui causait une erreur Vite au démarrage
- `npm audit` : passage de **14 → 2 vulnérabilités** (2 modérées non corrigeables sans breaking change)
  - Corrigées : axios (critique SSRF), lodash/lodash-es, picomatch, flatted, brace-expansion, yaml, serialize-javascript
  - Restantes : esbuild ≤0.24.2 via Vite 5 (dev-only, fix = Vite 8, breaking change)
- `package.json` : `overrides.serialize-javascript: "^7.0.5"` pour forcer la version patchée sans rétrograder `vite-plugin-pwa`

### 2026-04-04 (session 8) — PWA complète + Docker WAMP + fixes migrations

**PWA — Score Lighthouse estimé 92/100 :**
- `index.html` : `<meta name="mobile-web-app-capable">` ajouté (remplacement balise Apple dépréciée)
- `src/components/small/InstallPrompt.tsx` (nouveau) : bouton "Installer" dans la Topbar, capte `beforeinstallprompt`, se masque après installation
- `src/hooks/usePwaUpdate.ts` (nouveau) : `useRegisterSW` de VitePWA → toast cliquable "Nouvelle version disponible" en production
- `src/vite-env.d.ts` (nouveau) : références types Vite + vite-plugin-pwa/react
- `App.tsx` : `usePwaUpdate()` appelé au boot, `Topbar.tsx` : `<InstallPrompt />` intégré
- `vite.config.js` VitePWA : `devOptions: { enabled: true }` → SW enregistrable en dev ; icônes séparées `any` vs `maskable`
- `public/logo-maskable-512.png` (nouveau) : logo 512×512 sur fond `#9155FD` avec 20% de padding (format maskable correct)
- `public/screenshot-narrow.png` (540×720) + `public/screenshot-wide.png` (1280×720) : captures de l'app reformatées
- `public/manifest.json` + `vite.config.js` : `lang: "fr"`, `scope: "/"`, `categories`, `screenshots` avec `form_factor`, icône maskable dédiée

**Docker — Connexion à la DB WAMP :**
- `docker-compose.yml` : `DATABASE_URL` pointé sur `host.docker.internal:3306/medcligmedatwork` (DB WAMP) + `extra_hosts: host-gateway`
- Migrations `Version20260331180000` et `Version20260401210745` corrigées (DROP TABLE IF EXISTS, suppression ALTER TABLE sur tables inexistantes dans le volume) — 4 migrations appliquées avec succès
- Clés JWT régénérées (incompatibilité passphrase entre les `.pem` du volume et la passphrase Docker)
- Compte de test activé : `test1@medatwork.be` / `Test1234!`

### 2026-04-04 (session 7) — Dashboard hospital_admin refonte UX + actions résidents + bug fixes

**Frontend — `HospitalAdminDashboardPage.tsx` (refonte complète) :**
- Header sticky avec tabs de périodes (auto-sélection de la période courante au chargement), barre de recherche intégrée
- Grille 3 colonnes (`xs=12 sm=6 md=4`), cartes égales en hauteur (`display: flex`, `alignItems: stretch`)
- `YearCard` : clic carte → `/manager/year-detail` ; clic chip Résidents → onglet MACCS ; clic chip Managers → onglet Collaborateurs
- Highlight de recherche : chip Résidents devient vert si le terme correspond à un nom de résident, idem pour Managers
- Token de l'année affiché en zone monospace sous `<Divider>`, hors `CardActionArea` → bouton copie sans déclencher la navigation
- Tooltips au survol des chips listant les noms complets (`NameTooltip` helper)
- `SkeletonCard` pendant le chargement (6 placeholders), état vide avec `Alert` si aucune année
- Suppression du chip période (redondant avec les tabs)

**Frontend — `YearDetailPage.tsx` :**
- Lit `state.defaultTab` depuis `useLocation` pour pré-sélectionner l'onglet à l'arrivée
- `TAB_INDEX` map `general/residents/partners/setup/compliance` → index numérique
- `CustomTabs` reçoit `initialValue={TAB_INDEX[defaultTab] ?? 0}` pour synchroniser l'indicateur visuel

**Frontend — `CustomTabs.tsx` :**
- Ajout prop `initialValue` (défaut `0`) pour initialiser l'état interne depuis l'extérieur
- Correction typo `"horitonzal"` → `"horizontal"` (causait un warning console MUI)

**Backend — `HospitalAdminController::serializeYear()` :**
- Enrichi avec `token`, `residents[]` (`firstname`/`lastname`), `managers[]` (`firstname`/`lastname`)
- Permet au dashboard de lister les noms pour les tooltips et la recherche côté client

**Backend — `AdminController` (actions résidents admin) :**
- `POST /api/admin/residents/{id}/activate` → active manuellement un compte résident (`setValidatedAt`)
- `POST /api/admin/residents/{id}/reset-password` → déclenche un reset de mot de passe pour un résident

**Frontend — `adminApi.ts` :**
- `activateResident(id)` → `POST admin/residents/{id}/activate`
- `resetResidentPassword(id)` → `POST admin/residents/{id}/reset-password`

**Types — `entities.ts` :**
- `HospitalYear` : ajout `token?`, `residents?`, `managers?` avec types inline

**Bug fixes — `ResidentTable.tsx` :**
- `key={row.index}` → `key={index}` (prop `index` n'existait pas sur `row` → rendu sans key)
- `!allowed & adminRights` → `!allowed && adminRights` (AND bitwise → logique)
- `<Divider />` retiré de l'intérieur d'un `<TableRow>` (nesting HTML invalide)

**Bug fixes — navigation et chargement :**
- `gesdinet_jwt_refresh_token.yaml` : `when@dev: cookie.secure: false` → le cookie refresh token n'était pas envoyé sur HTTP localhost (cookie `secure: true` ignoré sans HTTPS)
- `Partners.tsx` + `Residents.tsx` : guard `if (!id) return;` dans `useEffect` → plus de requête vers `/api/.../null` avant que `YearDetailPage` ait set l'ID depuis le state de navigation
- `HospitalAdminDashboardPage.tsx` : `NameTooltip` key `n` → `i` (index) → plus de warning si deux personnes ont le même nom

**Backend — `YearsManagerAPIController` : endpoint hospital-managers :**
- `GET /api/managers/years/{yearId}/hospital-managers` → retourne uniquement les managers de l'hôpital associé à l'année (filtrés via `$year->getHospital()->getManagers()`)
- Vérifie l'accès au year via `checkRelation`; retourne `[]` si l'année n'a pas d'hôpital

**Frontend — Collaborateurs : liste filtrée par hôpital :**
- `managersApi.fetchHospitalManagers(yearId)` → nouvel appel vers le endpoint ci-dessus
- `Partners.tsx` : `fetchManagers` utilise `fetchHospitalManagers(id)` au lieu du `fetchManagers` global → le dialog "Rechercher un collaborateur" n'affiche plus que les managers du même hôpital

**Tests — `YearsManagerAPIControllerTest.php` (5 tests, 17 assertions) :**
- Year introuvable → 404 avec message
- Manager sans accès → 403 avec message
- Année sans hôpital → 200 + `[]`
- Année avec hôpital et managers → 200 + liste correcte (id, firstname, lastname, sexe, job)
- Hôpital sans managers → 200 + `[]`

**Améliorations identifiées (non bloquantes) :**
- `HospitalAdminController::serializeYear()` : lazy loading Doctrine potentiel N+1 sur `getResidents()`/`getManagers()` — à optimiser avec `JOIN FETCH` si la liste d'années grandit
- `YearCard` dans `HospitalAdminDashboardPage.tsx` (~185 lignes) mériterait son propre fichier
- `ResidentTable.tsx` : `key={index}` acceptable mais `key={row.yearResidentId}` serait plus stable
- `CustomTabs.tsx` : `minWidth: 600` sur le menu vertical peut forcer un scroll horizontal sur mobile

---

### 2026-04-03 (session 5) — Flux d'invitation MACCS complet

**Backend — `MaccsSetupController` (nouveau, 2 endpoints publics) :**
- `GET /api/maccs/setup/{token}` → valide le token (404 si inconnu, 410 si expiré) ; retourne `firstname`, `lastname`, `email`, `hospitalName` (déduit du dernier `YearsResident`)
- `POST /api/maccs/setup/{token}` → complète le profil du MACCS après invitation. Tous les champs sont obligatoires : `password` (min 8), `sexe` (`male`|`female`), `dateOfMaster` (Y-m-d), `dateOfBirth` (Y-m-d), `speciality`, `university`. Persiste les valeurs, set `validatedAt`, efface le token.
- Correction critique : `validatedAt` n'était pas setté par `UpdatePassword::fromToken()` → les MACCS restaient en statut `incomplete` après activation

**Backend — `HospitalAdminController` :**
- `sendMaccsInvitation()` : méthode privée commune pour envoi de l'email d'invitation (token `bin2hex(random_bytes(32))`, expiration +24h, template `maccsInvited.html.twig`). Utilisée par `addResident()`, `resendResidentInvite()`, et l'import CSV (remplace `passwordResetService->requestReset()`)
- Lien d'invitation mis à jour : `/passwordUpdatePage/` → `/maccs-setup/`
- Import CSV : suivi des nouveaux résidents dans `$newResidents[]` pour envoi invitation post-flush

**Backend — `security.yaml` :**
- `^/api/maccs/setup` ajouté en `PUBLIC_ACCESS`

**Backend — Email `maccsInvited.html.twig` :**
- Template dédié à l'invitation (différent du reset password) : hôpital en badge, bouton "Compléter mon profil", lien valable 24h

**Frontend — `MaccsSetupPage` (`/maccs-setup/:token`, nouveau) :**
- Charge le contexte via GET (nom, hôpital)
- 3 sections : Mot de passe / Infos personnelles / Infos académiques
- Champs : password + confirm, sexe (select Homme/Femme), dateOfBirth, dateOfMaster, speciality, university — tous obligatoires
- États gérés : loading / ready / expired (410) / done / error
- Redirect `/login` après complétion

**Frontend — `maccsSetupApi.ts` (nouveau) :**
- `checkToken(token)` → GET context
- `completeProfile(token, payload)` → POST setup

**Frontend — `App.tsx` :**
- Route `/maccs-setup/:token` ajoutée (lazy, publique)

**Tests — `MaccsSetupControllerTest.php` (18 tests, 25 assertions) :**
- GET : token inconnu → 404, expiré → 410, valide → 200 avec context complet, sans hospital → hospitalName null
- POST token guards : inconnu → 404, expiré → 410
- POST validation : data provider 9 cas (password court, sexe invalide/vide, dateOfMaster invalide/vide, dateOfBirth invalide/vide, speciality vide, university vide) → tous 400
- POST happy path : 200 + message correct, `setValidatedAt` + `setToken(null)` + `setTokenExpiration(null)` appelés, `setSexe(Sexe::Female)` correct

### 2026-04-03 (session 4) — Gestion des MACCS — page complète admin hôpital

**Backend — `HospitalAdminController` (7 nouveaux endpoints) :**
- `GET /api/hospital-admin/residents?mode=current|history` → liste des MACCS de l'hôpital, filtrée par années en cours ou historique. Statut calculé dynamiquement : `retired` (soft-delete) → `pending` (token non null) → `incomplete` (validatedAt null) → `active`
- `POST /api/hospital-admin/residents` → ajouter un MACCS (find-or-create : si l'email existe déjà, rattache le résident existant à l'année ; sinon crée un compte). Email envoyé selon le cas : invitation avec setup de mot de passe (nouveau) ou notification d'ajout à une année (existant)
- `PATCH /api/hospital-admin/years-residents/{yrId}` → modifier le champ `optingOut` d'un `YearsResident`
- `DELETE /api/hospital-admin/years-residents/{yrId}` → retirer un MACCS (soft-delete via `allowed: false`)
- `POST /api/hospital-admin/years-residents/{yrId}/change-year` → déplacer un MACCS d'une année à une autre (met à jour le `YearsResident`)
- `POST /api/hospital-admin/years-residents/{yrId}/resend-invite` → renvoyer l'email d'invitation (génère nouveau token + email setup mot de passe)
- `POST /api/hospital-admin/residents/import` → import CSV (avec `?preview=true` pour la simulation). Format : `prénom,nom,email,année,opting-out`. Retourne `created[]`, `attached[]`, `errors[]`

**Backend — Email template :**
- `templates/email/maccsAddedToYear.html.twig` : email envoyé quand un résident existant est rattaché à une nouvelle année académique

**Backend — `services.yaml` :**
- Injection `$frontendUrl: '%env(FRONTEND_URL)%'` dans `HospitalAdminController`

**Frontend — `hospitalAdminApi.ts` (nouveau) :**
- Types exportés : `MaccsStatus`, `MaccsRow`, `HospitalYear`, `CsvImportResult`
- Fonctions : `listResidents`, `listMyYears`, `addResident`, `editYearsResident`, `retireResident`, `changeResidentYear`, `resendResidentInvite`, `previewCsvImport`, `confirmCsvImport`

**Frontend — `HospitalAdminResidentsPage.tsx` (nouveau) :**
- Toggle `current | history` pour filtrer par période
- Barre de recherche (nom, email, année)
- Table : Nom Prénom / Email / Année académique / Opting-out / Statut (chip coloré) / Actions
- **ViewDrawer** : détail complet du MACCS
- **EditDialog** : modification `optingOut` via Switch
- **ChangeYearDialog** : Select parmi les autres années de l'hôpital
- **Retire** : dialog de confirmation avec bouton rouge
- **AddDialog** : find-or-create avec info alert, Select année, Switch opting-out
- **CsvDialog** : import deux étapes — Analyser (preview) → Confirmer ; affiche erreurs par ligne, résumé créés/rattachés

**Frontend — Navigation et routing :**
- `sidebarNavData.tsx` : ajout du groupe `hospitalAdmin` (Tableau de bord + Gestion des MACCS) exporté séparément
- `SidebarNav.tsx` : managers promus → `[...manager, ...hospitalAdmin]` ; rôle `hospital_admin` pur → `hospitalAdmin` seul
- `App.tsx` : route `/hospital-admin/residents` ajoutée dans `HospitalAdminRoute`

---

### 2026-04-03 (session 3) — Fix CORS logout + tests CORS régression

**Backend — Fix CORS logout :**
- `CustomLogoutListener` : `RedirectResponse` → `JsonResponse(200)` — les redirects ne passent pas par le middleware CORS, causant un blocage navigateur
- `security.yaml` firewall `api.logout` : suppression de `target: /logout_redirect` (inutile, court-circuité par le listener)
- `services.yaml` : suppression de l'injection `$frontendUrl` dans `CustomLogoutListener` (plus nécessaire)
- `nelmio_cors.yaml` section `when@test` : `allow_credentials: false` → `true` + origin littérale `http://localhost:3000` pour que les tests reflètent le comportement réel

**Tests — `CorsTest.php` (7 assertions, 0 DB, rapide) :**
- Vérifie que le bloc `^/api/` existe dans `nelmio_cors.yaml`
- Vérifie `allow_credentials: true` pour `/api/` (production et test env)
- Vérifie que tous les méthodes HTTP sont autorisés
- Vérifie `allow_origin` non vide
- Vérifie qu'aucun `target:` de redirection n'est présent sur le firewall logout
- Vérifie que `CustomLogoutListener` retourne `JsonResponse` et non `RedirectResponse`

---

### 2026-04-03 (session 2) — Architecture admin hôpital : compte unique Manager + unpromote + route guards

**Backend — Architecture compte unique :**
- `Manager` entity : ajout champ `adminHospital: ?Hospital` (ManyToOne, onDelete: SET NULL)
  - `getRoles()` injecte dynamiquement `ROLE_HOSPITAL_ADMIN` quand `adminHospital !== null`
- Migration `Version20260403110000` : colonne `admin_hospital_id` + FK + index sur table `manager`
- `AdminController::promoteManagerToAdmin` : suppression création entité `HospitalAdmin` distincte → `$manager->setAdminHospital($hospital)` ; conflict check via `$manager->getAdminHospital() !== null`
- Nouvel endpoint `DELETE /api/admin/hospitals/{id}/admins/promoted/{managerId}` → `unpromoteManager()`
- `listHospitalAdminsByHospital` : retourne les deux types — `HospitalAdmin` invités (`type: 'invited'`) + managers promus (`type: 'promoted'`)
- `HospitalAdminController::resolveHospital()` : résout l'hôpital pour `HospitalAdmin` ET `Manager` avec `adminHospital`
- `AuthenticationSuccessListener` : enrichit le JWT avec `hospitalId` + `hospitalName` pour les managers promus

**Frontend — Accès et navigation :**
- `HospitalAdminRoute.tsx` : accepte désormais `role === "manager"` avec `hospitalName` (managers promus)
- `SidebarNav.tsx` : managers promus voient un groupe "Admin hôpital" supplémentaire dans le sidebar
- `adminApi.ts` : ajout `unpromoteManager(hospitalId, managerId)`
- `AdminHospitalDetailPage.tsx` :
  - `HospitalAdminRow` : ajout champ `type: "invited" | "promoted"`
  - Deux chips par ligne admin : type (Invité externe / Manager promu) + statut (Actif / En attente)
  - `AdminActionsMenu` : actions différenciées — invités → "Renvoyer" + "Supprimer le compte" ; promus → "Retirer la promotion"
  - Dialog de confirmation "Retirer la promotion" + mutation `unpromoteMutation`
  - Toast promote mis à jour : "Manager promu administrateur hôpital"

**Tests :**
- `AdminHospitalDetailPage.test.tsx` : ajout `type: "invited"` au fixture `MOCK_ADMINS`, label "En attente" mis à jour — 235/235 tests verts

---

### 2026-04-03 — Refactoring routing frontend + Gestion hôpital : promotion manager, association managers, emails

**Frontend — Refactoring routing (tous les rôles) :**
- Toutes les routes manager migrées vers le préfixe `/manager/...` (cohérence avec `/admin/...` déjà en place)
  - `/manager_years` → `/manager/years`, `/year` → `/manager/year`, `/realtime` → `/manager/realtime`
  - `/dataTracking` → `/manager/data-tracking`, `/validationStory` → `/manager/validation-story`
  - `/managerNotifications` → `/manager/notifications`, `/managerCalendar` → `/manager/calendar`
  - `/weekDispatcher` → `/manager/week-dispatcher`, `/weekCreator` → `/manager/week-creator`
- Toutes les routes résident migrées vers le préfixe `/maccs/...`
  - `/timer` → `/maccs/timer`, `/residentStatistic` → `/maccs/statistics`
  - `/dataManagement` → `/maccs/data-management`, `/resident_years` → `/maccs/years`
  - `/search` → `/maccs/search`, `/residentNotification` → `/maccs/notifications`
  - `/residentParameters` → `/maccs/parameters`
- Fichiers mis à jour : `App.tsx`, `LoginPage.tsx`, `Form.tsx`, `sidebarNavData.tsx`
- `navigate()` mis à jour dans : `YearDetailPage.tsx`, `YearPage.tsx`, `YearCard.tsx`, `timesheet.tsx`, `Timer.tsx`, `YearDisplay.tsx`



**Backend — `AdminController` (nouveaux endpoints) :**
- `POST /api/admin/hospitals/{id}/admins/from-manager` → promouvoit un `Manager` existant en `HospitalAdmin` (copie email/prénom/nom, génère token, envoie email)
- `GET /api/admin/hospitals/{id}/managers` → liste des managers liés à cet hôpital (ManyToMany)
- `POST /api/admin/hospitals/{id}/managers` → associe un manager à l'hôpital ; si statut `PendingHospital` → passe automatiquement à `Active`
- `DELETE /api/admin/hospitals/{id}/managers/{managerId}` → retire le lien manager ↔ hôpital

**Backend — `HospitalAdminController` :**
- `GET /api/hospital-admin/refuse/{token}` → refus d'une invitation : supprime le `HospitalAdmin`, retourne une page HTML de confirmation lisible dans le navigateur

**Emails — nouveaux templates :**
- `hospitalAdminInvite.html.twig` : redesign — emoji médaille 🏅, suppression du bouton "Compléter mon profil", message de notification pure
- `hospitalAdminPromote.html.twig` (nouveau) : email de promotion manager → admin, titre "Félicitations !", emoji trophée 🏆, pas de bouton action
- Logique de sélection du bon template dans `reinviteHospitalAdmin` : si `firstname !== null` (promu) → template promotion, sinon → template invitation

**Frontend — `adminApi.ts` :**
- `promoteManagerToAdmin(hospitalId, managerId)` → `POST admin/hospitals/{id}/admins/from-manager`
- `listHospitalManagers(hospitalId)` → `GET admin/hospitals/{id}/managers`
- `addManagerToHospital(hospitalId, managerId)` → `POST admin/hospitals/{id}/managers`
- `removeManagerFromHospital(hospitalId, managerId)` → `DELETE admin/hospitals/{id}/managers/{managerId}`

**Frontend — `AdminHospitalDetailPage.tsx` :**
- Onglet **Admins** : bouton "Promouvoir un manager" → dialog avec recherche parmi tous les managers → création `HospitalAdmin` depuis le manager sélectionné
- Nouvel onglet **Managers** : table des managers associés à l'hôpital, recherche dynamique, bouton "Retirer" (avec confirmation), dialog "Associer un manager" (liste filtrée des managers non encore associés — la fenêtre reste ouverte après chaque association pour en ajouter plusieurs d'affilée)

**Tests frontend (5 nouveaux tests, `AdminHospitalDetailPage.test.tsx`) :**
- Promote dialog ouvre et appelle `promoteManagerToAdmin`
- Onglet Managers : affiche la table, message vide, retrait avec confirmation, ajout depuis dialog

**Total tests frontend :** 136 → **141 (Vitest)**

---

### 2026-04-02 — Gestion des Managers + HospitalAdmin + Sécurité JWT

**Backend — `AdminController` (nouveaux endpoints) :**
- `GET /api/admin/stats/managers` → statistiques managers (total, actifs, inactifs, en attente)
- `PATCH /api/admin/users/managers/{id}/status` → basculer statut actif/inactif
- `DELETE /api/admin/users/managers/{id}` → supprimer un compte manager
- `POST /api/admin/users/managers/{id}/reset-password` → réinitialiser le mot de passe

**Backend — `PasswordResetServiceInterface` :**
- `PasswordResetService` étant `final`, extraction de `PasswordResetServiceInterface` pour permettre le mock PHPUnit
- `AdminController`, `AdminControllerTest`, `AdminYearsControllerTest`, `AdminManagerActionsTest` mis à jour

**Backend — `ManagerStatus` enum :**
- Ajout de `case Inactive = 'inactive';`
- Migration `Version20260403100000` : `ALTER TABLE manager MODIFY COLUMN status ENUM('pending_hospital','active','inactive')`

**Backend — `HospitalAdminController` :**
- `GET /api/hospital-admin/years` → liste des années de l'hôpital du manager connecté (avec `residentCount`)
- `GET /api/hospital-admin/years/{id}/residents` → résidents d'une année
- `security.yaml` : règle `PUBLIC_ACCESS` sur `/api/hospital-admin/setup` avant catch-all `ROLE_HOSPITAL_ADMIN`

**Sécurité :**
- `JWT_PASSPHRASE` réelle retirée du `.env` versionné (remplacée par placeholder `CHANGE_ME_...`)
- Valeur forte (`openssl rand -base64 48`) déplacée dans `.env.local` (gitignorée)

**Frontend :**
- `adminApi.ts` : ajout de `listMyYears()`, `listYearResidents()`, `getManagerStats()`, `toggleManagerStatus()`, `deleteManager()`, `resetManagerPassword()`
- `HospitalAdminDashboardPage` : utilise `adminApi.listMyYears()`, affiche chip `residentCount`, cartes cliquables vers résidents
- `HospitalAdminYearResidentsPage` (nouveau) : liste des résidents d'une année avec bouton retour
- `AdminManagersPage` : barre de filtres `ToggleButtonGroup` (Tous/Actifs/Inactifs/En attente) + compteur
- `AdminDashboardPage` : correction du label Switch inversé (`"Désactiver"` quand actif)
- `App.tsx` : route `/hospital-admin/years/:yearId/residents` ajoutée

**Tests frontend (22 nouveaux tests) :**
- `AdminManagersPage.test.tsx` : 11 tests (spinner, liste, filtre, menu actions, toggle, delete, reset password)
- `HospitalAdminDashboardPage.test.tsx` : 6 tests (spinner, cartes, residentCount, navigation, vide)
- `HospitalAdminYearResidentsPage.test.tsx` : 5 tests (spinner, cartes, vide, yearId param, retour)

**Total tests :** 980 → **1 002 tests unitaires backend**, 114 → **136 tests frontend**

---

### 2026-04-03 — Sécurité Signup Flow + Resend Activation

**Backend — `PublicAPIController` + `ManagersAPIController` :**
- Prévention de l'énumération des utilisateurs : les deux contrôleurs retournent `{"message":"ok"}` HTTP 200 que l'email soit déjà enregistré ou non (avant : réponse différente → fuite d'information)
- Token d'activation avec expiration +48h ajouté lors de l'inscription (`setTokenExpiration`)
- `sendEmail(...)` enveloppé dans `try { } catch (\Throwable) { }` — l'échec SMTP ne bloque plus la création de compte (avant : HTTP 500 si Hostinger SMTP indisponible)

**Backend — `TokenActivationController` :**
- Constructeur ajouté : injection de `MailerController` + `string $apiUrl`
- Nouvel endpoint `POST /api/resend-activation` (public, rate-limité sur IP) :
  - Génère un nouveau token `bin2hex(random_bytes(32))` + expiration +48h
  - Envoie l'email d'activation avec le bon lien (`ResidentActivation/` ou `ManagerActivation/`)
  - Retourne toujours `{"message":"ok"}` (pas d'énumération)
  - `security.yaml` : `PUBLIC_ACCESS` accordé à la route

**Frontend :**
- `SuccessRegisterPage` : bouton "Renvoyer l'email" + états idle/loading/done/error ; email passé via `navigate("/success", { state: { email } })`
- `TokenExpiredPage` : formulaire email + bouton "Recevoir un nouveau lien" (remplace "veuillez vous réinscrire")
- `Form.tsx` (Resident + Manager) : `navigate` vers `/success` passe l'email en state
- `ManagerSignupPage/Form.tsx` : label `"Pause"` → `"Genre"` sur le Select Genre ; lien CGU retiré de `disabled`
- `publicApi.ts` : `resendActivation(email)` → `POST /api/resend-activation`

**Tests (`backend/tests/Unit/Controller/`) :**
- `SignupControllerTest` (8 tests) : email existant → 200 sans persist ni mail ; `tokenExpiration` ~48h ; token 64-char hex ; mailer failure → 200
- `TokenActivationControllerTest` (12 tests) : rate limit 429 ; email invalide/inconnu/validé → 200 no-op ; resident/manager non validé → setToken + setTokenExpiration + flush + mail ; token hex 64 chars ; expiration ~48h ; lien contient la bonne route ; mailer failure → flush quand même + 200

**Total tests :** 702 → **722 tests unitaires backend**

---

### 2026-04-01 — Tests d'intégration API

**`tests/Integration/ApiAuthTest.php`** (nouveau, 10 tests, 19 assertions) :
- `testFetchManagersReturns401WithoutToken` — endpoint ROLE_MANAGER sans JWT → 401
- `testProtectedEndpointReturns401WithoutToken` (data provider) — notifications manager, years → 401
- `testLoginWithInvalidCredentialsReturns401` — mauvais identifiants → 401
- `testLoginWithValidManagerCredentialsReturnsToken` — login réel → 200 + JWT valide
- `testLoginWithValidResidentCredentialsReturnsToken` — idem pour résident
- `testFetchManagersWithManagerTokenReturns200` — token manager → 200 + tableau JSON
- `testFetchManagersWithResidentTokenReturns403` — token résident → 403
- `testManagerNotificationsWithResidentTokenReturns403` — idem
- `testManagerYearsEndpointWithManagerTokenReturns200` — token manager → pas 401/403

**Infrastructure de test (résolution de 3 problèmes techniques) :**
- `phpunit.xml` : bootstrap changé en `tests/bootstrap.php` (charge `.env.test` via Dotenv pour `CORS_ALLOW_ORIGIN` etc.)
- `phpunit.xml` : `DATABASE_URL=sqlite:///var/test_api.db` (fichier, pas `:memory:`) — les connections HTTP et test partagent le même fichier
- `phpunit.xml` : `JWT_PASSPHRASE` réel forcé (override `.env.test` qui utilise une passphrase incompatible avec la clé existante)
- `setUpBeforeClass` : kernel booté une seule fois + `dropSchema`/`createSchema` + création manuelle de `refresh_tokens` (mapped-superclass Gesdinet, ignoré par SchemaTool)
- `tearDown` surchargé : n'appelle PAS `parent::tearDown()` pour éviter `ensureKernelShutdown()` qui détruirait la BDD entre les tests

---

### 2026-03-31 — Exception Handler, GetPeriodSummary, StatisticTools

**Corrections de sécurité / qualité (contrôleurs) :**
- `ExceptionListener` : ajout du mapping `\InvalidArgumentException` → 400 (messages DTO exposables au client)
- `InvalidYearException` : étendue `\InvalidArgumentException` au lieu de `Exception` → 400 automatique
- `MonthValidationController` : 4× `throw new Exception(...)` → `\InvalidArgumentException` ou `\RuntimeException` selon le cas ; try/catch inutile supprimé
- `GetYearResidentController`, `GetResidentParametersController` : "year not found" → `NotFoundHttpException` ; bug `empty($yearId)` → `$year === null`
- `GetPeriodSummary::validatePeriod` : `Exception` → `NotFoundHttpException` ; try/catch `error_log` nuisible supprimé
- 9 nouveaux tests `ExceptionListenerTest`

**Refactoring `GetPeriodSummary` :**
- Extraction de `collectResidentPeriodData()` : élimine ~60 lignes dupliquées entre `getResidentSummary` et `generateResidentPeriodData`
- `generateResidentPeriodData::validationInformation` simplifié (if/else → tableau direct)
- `filteredAbsences` loop → `array_filter`
- `DateInterval`, `DatePeriod` inutilisés supprimés des imports
- 705 → 543 lignes (-23%)
- 21 tests unitaires `GetPeriodSummaryTest`

**Refactoring `StatisticTools` :**
- Bug corrigé : `$hospitalGardeHoursNb` initialisé mais jamais incrémenté → retournait toujours 0 ; maintenant correctement cumulé pour les gardes hospital
- `classifyHours()` extrait : logique de classification horaire (normal/hard/veryHard) mutualisée pour timesheets et gardes (~50 lignes dupliquées → 1 méthode privée)
- `checkIfDateIsBetween` : simplifié en 1 ligne
- `yearAbsenceProcessing` : paramètre `$array` typé en `array`
- 16 nouveaux tests `hoursCounter` (jours normaux, tôt/tard, samedi, dimanche, gardes, absences)

**Outillage :**
- `.env.example` créé avec documentation de toutes les variables + avertissement `JWT_PASSPHRASE`

### 2026-03-30 — Refactoring Statistiques

**Backend :**
- `boudariesDates()` : accepte maintenant un mois brut (1–12) au lieu du format MMYYYY
- `AbsenceRepository::findByYearGroupedByResident()` : JOIN FETCH + groupement PHP, élimine N queries par résident
- `YearsResidentRepository::findByIds()` : findBy IN + indexation
- Contrôleurs stats : validation `$month` (1–12 → 400), suppression `Security $security` inutilisé

### 2026-03-28 — Refactoring Système de Notifications

**Backend :**
- `ValidationNotifications` et `UpdateYearResidentNotifications` : élimination des N+1 queries
- `FrenchMonths` utility : constante partagée des noms de mois français
- Routes `mark-all-as-read` passées de `GET` à `PATCH`
- `purgeOld()` ajouté aux repositories ; commande `app:notifications:purge`

**Frontend :**
- `useRefreshToken` : `axios.get` → `axios.post`
- `useAxiosPrivate` : verrou de concurrence module-level (`refreshPromise`)
- `useNotifications` : migration `setInterval` → `useQuery` + `refetchInterval: 30_000`

### 2026-03-22 — Sécurité et Stabilisation
- Correction de toutes les failles critiques (tokens, SSL, dd())
- 19 DTOs d'entrée avec 280+ tests
- Extraction de services (CallableGardeMapper, suppression ManagerAccessChecker)

### 2026-03-20 — Audit Initial
- Cartographie complète du code existant

---

### 2026-04-04 — Gestion des managers + tests + jobList dropdown

**Fonctionnalité : gestion des managers pour hospital_admin**

Backend (`HospitalAdminController`) — 5 nouveaux endpoints :
- `GET /api/hospital-admin/managers?mode=current|history` : liste des managers par hôpital, triée par statut (pending → incomplete → active)
- `POST /api/hospital-admin/managers` : inviter/ajouter un manager à une année (nouveau → email setup, existant → email accept/refuse)
- `DELETE /api/hospital-admin/manager-years/{myId}` : retirer un manager d'une année
- `POST /api/hospital-admin/manager-years/{myId}/resend-invite` : renvoyer l'invitation en attente
- `DELETE /api/hospital-admin/managers/{managerId}` : supprimer un manager (toutes ses années + optionnellement le compte)

Backend (`ManagerInviteController`) — routes PUBLIC_ACCESS :
- `GET/POST /api/managers/setup/{token}` : page de completion de profil pour nouveau manager (password, sexe, job)
- `GET /api/managers/accept-year/{token}` : accepter une invitation d'année (HTML)
- `GET /api/managers/refuse-year/{token}` : refuser une invitation, supprime le manager si nouveau sans années actives (HTML)

Statut d'un manager calculé via `ManagerYears.invitedAt` :
- `invitedAt != null` → **pending** (invitation envoyée, non acceptée)
- `invitedAt == null && validatedAt == null` → **incomplete** (compte non activé)
- `invitedAt == null && validatedAt != null` → **active**

Frontend :
- `HospitalAdminManagersPage` : table + drawer détail + dialog ajout + confirmations retrait/suppression
- `ManagerSetupPage` : page publique `/manager-setup/:token` pour les nouveaux managers
- `managerSetupApi.ts` : checkToken + completeProfile
- Champ "Fonction" → Select avec `jobList` (Maître de stage / Médecin / Ressources humaines), cohérent avec la base de données
- Sidebar : entrée "Gestion des managers" ajoutée pour `hospital_admin`

**Tests — 46 tests / 57 assertions (nouveau) :**
- `ManagerInviteControllerTest.php` (20 tests) : tous les scénarios setup + accept/refuse year
- `ManagerSetupPage.test.tsx` (11 tests) : loading, contexte, erreurs token, validations formulaire, submit, succès, erreur API
- `HospitalAdminManagersPage.test.tsx` (15 tests) : table, chips statut, recherche, toggle mode, actions menu, mutations

*Audit initial : 2026-03-20 — Dernière mise à jour : 2026-04-04*
