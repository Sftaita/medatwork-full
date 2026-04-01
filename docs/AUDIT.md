# Audit Initial — Medatwork

**Date :** 2026-03-20
**Dernière mise à jour :** 2026-04-03
**Environnement :** Windows 11, WAMP + Docker, MySQL, Symfony 7.4 LTS, React 18
**Statut :** Professionnalisation en cours — sécurité API Platform durcie

---

## Résumé Exécutif

| Métrique | Valeur (audit initial) | Valeur (2026-03-22) | Valeur (2026-03-28) | Valeur (2026-03-29) | Valeur (2026-03-30) | Valeur (2026-03-31) | Valeur (2026-04-01) | Valeur (2026-04-02) | Valeur (2026-04-03) |
|----------|------------------------|---------------------|---------------------|---------------------|---------------------|---------------------|---------------------|---------------------|---------------------|
| Fichiers PHP backend | ~132 | ~132 | ~135 | ~137 | ~138 | ~139 | ~140 | ~141 | ~141 |
| Fichiers JS/JSX frontend | ~248 | ~248 | ~248 | ~249 | ~249 | ~249 | ~249 | ~249 | **~251** |
| Entités Doctrine | 21 | 21 | 21 | 21 | 21 | 21 | 21 | 21 | 21 |
| Contrôleurs | 30+ | 30+ | 30+ | 30+ | 30+ | 30+ | 30+ | 30+ | 30+ |
| Services | 15+ | 16+ | 16+ | 17+ | 17+ | 17+ | 17+ | **18+** | 18+ |
| DTOs | 0 | 19 | 19 | 19 | 19 | 19 | 19 | 19 | 19 |
| Migrations | 50 | 50 | 50 | 50 | 50 | 50 | 50 | 50 | 50 |
| Tests unitaires backend | 0 | **364 (703 assertions)** | **589 (1 153 assertions)** | **631 (1 245 assertions)** | **653 (1 297 assertions)** | **690 (1 405 assertions)** | **690 (1 405 assertions)** | **702 (1 424 assertions)** | **722 (~1 464 assertions)** |
| Tests intégration API | 0 | 0 | 0 | 0 | 0 | 0 | **10 (19 assertions)** | **10 (19 assertions)** | **10 (19 assertions)** |
| Tests unitaires frontend | 0 | ~60 | **105 (Vitest)** | **114 (Vitest)** | **114 (Vitest)** | **114 (Vitest)** | **114 (Vitest)** | **114 (Vitest)** | **114 (Vitest)** |

### Tableau des Risques (mis à jour)

| Catégorie | Nombre initial | Statut |
|-----------|----------------|--------|
| Secrets exposés | 1 | ⚠️ Non corrigé (action manuelle requise) |
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
- **19 DTOs d'entrée** avec validation stricte et tests exhaustifs
- **Global Exception Handler** : `InvalidArgumentException` → 400, 5xx sans détails internes
- **690 tests unitaires backend** (0 au départ), **114 tests Vitest frontend**
- **`.env.example`** avec instructions d'onboarding

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
`/api/fetchManagers` sécurisé avec `ROLE_MANAGER` dans `security.yaml`.

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
2. Pas de Docker / docker-compose
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

*Audit initial : 2026-03-20 — Dernière mise à jour : 2026-04-03*
