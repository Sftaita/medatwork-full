# Architecture — Medatwork

**Dernière mise à jour :** 2026-03-22

## Vue d'Ensemble

Medatwork est une application **SPA + API REST** avec une séparation stricte Frontend/Backend.

```
┌─────────────────────────────────────────────────────────────┐
│                        NAVIGATEUR                           │
│                    React 17 (SPA)                           │
│              https://www.medatwork.be                       │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS + JWT Bearer
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     API REST                                │
│              Symfony 5.4 + API Platform 2.7                 │
│             https://api-link.medatwork.be                   │
└───────────────────────────┬─────────────────────────────────┘
                            │ Doctrine ORM
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       MySQL                                 │
│                 medcligmedatwork                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Backend — Symfony 5.4

### Structure des Dossiers

```
backend/
├── bin/                        # Scripts CLI
├── config/
│   ├── packages/               # Config par bundle
│   │   ├── api_platform.yaml
│   │   ├── doctrine.yaml
│   │   ├── framework.yaml
│   │   ├── security.yaml
│   │   ├── lexik_jwt_authentication.yaml
│   │   ├── gesdinet_jwt_refresh_token.yaml
│   │   ├── nelmio_cors.yaml
│   │   └── mailer.yaml
│   ├── jwt/                    # Clés privée/publique JWT (non versionnées)
│   ├── routes/
│   └── services.yaml
├── migrations/                 # 50 migrations Doctrine (2022-2023)
├── public/
│   ├── index.php               # Front controller
│   └── Images/                 # Uploads
├── src/
│   ├── Command/                # Commandes CLI
│   ├── Controller/             # 30+ contrôleurs REST
│   ├── Doctrine/               # Extensions Doctrine (CurrentUserExtension)
│   ├── DTO/                    # 19 DTOs d'entrée typés (fromRequest())
│   ├── Entity/                 # 21 entités Doctrine
│   ├── Enum/                   # Enums PHP 8.1 (GardeType, AbsenceType, Sexe)
│   ├── Events/                 # Event subscribers (API Platform hooks)
│   ├── EventListener/          # Listeners Symfony (ExceptionListener)
│   ├── Exceptions/             # Exceptions métier
│   ├── Repository/             # 21 repositories
│   ├── Security/               # Voters d'accès (YearAccessVoter, etc.)
│   └── Services/               # Logique métier
├── templates/
│   └── email/                  # Templates Twig pour emails
└── tests/
    ├── Unit/
    │   ├── DTO/                # 19 fichiers de tests DTO (280 tests)
    │   └── Services/           # Tests services (CallableGardeMapper, etc.)
    └── Integration/            # Tests d'intégration (SecurityConfigTest, etc.)
```

### Flux d'une Requête API

```
Request HTTP
    │
    ▼
Apache (.htaccess)
    │ Réécriture vers index.php
    ▼
Symfony Kernel
    │
    ▼
CORS Bundle (nelmio_cors)
    │ Vérifie l'origine
    ▼
Security Firewall
    │ Vérifie le JWT Bearer
    ▼
Router
    │ Mappe vers le controller
    ▼
Controller
    │ Parse via DTO::fromRequest()
    │ (lève \InvalidArgumentException → 400)
    ▼
DTO validé (champs typés, readonly)
    │
    ▼
Service Layer
    │ Logique métier
    ▼
Repository
    │ Requêtes Doctrine
    ▼
MySQL
    │ Données
    ▼
JsonResponse (array manuel ou json())
```

### Groupes de Contrôleurs

| Dossier | Rôle |
|---------|------|
| `AbsencesAPI/` | Gestion des absences |
| `GardesAPI/` | Gestion des gardes |
| `TimesheetsAPI/` | Feuilles de temps |
| `YearsAPI/` | Années académiques |
| `ManagersAPI/` | Gestion des managers |
| `ResidentsAPI/` | Gestion des résidents |
| `NotificationsAPI/` | Système de notifications |
| `StatisticsAPI/` | Statistiques et rapports |
| `ValidationsAPI/` | Validation de périodes |
| `StaffPlannerAPI/` | Planification du personnel |
| `ShedulersAPI/` | Calendrier et plannings hebdomadaires |
| `WeekTasksAPI/` | Tâches hebdomadaires |
| `WeekTemplatesAPI/` | Templates hebdomadaires |
| `Excel/` | Export Excel |
| `GeneralAPI/` | Contact, endpoints publics |

### Services Principaux

| Service | Responsabilité |
|---------|----------------|
| `ManagerMonthValidation/` | Validation mensuelle des périodes |
| `Notifications/` | Envoi et gestion des notifications |
| `EmailReset/` | Réinitialisation de mot de passe |
| `ExcelGenerator/` | Génération de rapports Excel |
| `ExcelGenerator/CallableGardeMapper` | Calcul des intervalles gardes appelables |
| `StaffPlanner/` | Algorithme de planification RH |
| `Statistics/` | Calcul des statistiques |
| `Schedule/` | Gestion des plannings |
| `YearsManagement/` | Gestion des années académiques |
| `MonthValidation/` | Logique de validation mensuelle |

### Pattern DTO (standard depuis 2026-03-22)

Toutes les entrées JSON de l'API passent par un DTO `final` avec propriétés `readonly` :

```php
final class MonInputDTO
{
    private function __construct(
        public readonly string $title,
        public readonly int    $weekTemplateId,
    ) {}

    public static function fromRequest(Request $request): self
    {
        $data = json_decode($request->getContent(), true);
        if (! is_array($data)) {
            throw new \InvalidArgumentException('Invalid JSON body');
        }
        // ... validation stricte ...
        return new self(...);
    }
}
```

Usage dans le controller :
```php
try {
    $dto = MonInputDTO::fromRequest($request);
} catch (\InvalidArgumentException $e) {
    return new JsonResponse(['message' => $e->getMessage()], 400);
}
```

---

## Frontend — React 17

### Structure des Dossiers

```
frontend/
├── public/
│   ├── index.html
│   └── .htaccess               # Redirection SPA (React Router)
└── src/
    ├── App.js                  # Routing principal
    ├── config.js               # URL API (à externaliser en .env)
    ├── index.js
    ├── pages/                  # Composants de page
    │   ├── LoginPage/
    │   ├── HomePage/
    │   ├── Management/
    │   ├── Resident/
    │   ├── SignupPage/
    │   ├── PasswordReset/
    │   └── ErrorPage/
    ├── components/             # Composants réutilisables
    │   ├── layout/
    │   ├── big/
    │   ├── medium/
    │   └── small/
    ├── hooks/                  # Logique réutilisable
    │   ├── useAuth.js
    │   ├── useAxiosPrivate.js
    │   ├── useRefreshToken.js
    │   └── useLogout.js
    ├── contexts/               # État global
    │   └── AuthProvider.js
    └── services/               # Appels API
        ├── Axios.js
        ├── AuthAPI.js
        ├── ManagersAPI.js
        └── ResidentsAPI.js
```

### Flux d'Authentification

```
LoginPage
    │ POST /api/login_check
    ▼
Backend → JWT + RefreshToken (cookie HttpOnly)
    │
    ▼
AuthProvider (Context)
    │ Stocke JWT en mémoire (state React)
    │ Refresh token en cookie
    ▼
useAxiosPrivate Hook
    │ Intercepte toutes les requêtes
    │ Ajoute "Authorization: Bearer <JWT>"
    │ Si 401 → appelle useRefreshToken → renouvelle JWT
    ▼
API Calls
```

### Protection des Routes

```jsx
// Routes protégées via RequireAuth
<Route element={<RequireAuth allowedRoles={["ROLE_MANAGER"]} />}>
  <Route path="/management" element={<ManagementPage />} />
</Route>
```

---

## Modèle de Données

### Entités Principales

```
Years (année académique)
├── ManagerYears           (association manager ↔ année)
├── YearsResident          (inscription résident)
├── YearsWeekTemplates     (templates de semaine par année)
├── YearsWeekIntervals     (périodes de l'année)
└── YearsResidentParameters (paramètres par résident)

Manager
├── NotificationManager    (notifications pour le manager)
└── [via ManagerYears] Years

Resident
├── NotificationResident   (notifications pour le résident)
├── ResidentWeeklySchedule (planning hebdomadaire)
└── [via YearsResident] Years

ResidentWeeklySchedule
├── Timesheet              (feuille de temps hebdomadaire)
├── Garde                  (garde)
├── Absence                (absence)
└── WeekTask               (tâche hebdomadaire)

WeekTemplates
└── WeekTask               (définition des tâches)

PeriodValidation           (validation d'une période par le manager)
└── ResidentValidation     (validation par résident)
```

### Flux Métier Principal

```
Année académique créée par admin
    │
    ▼
Managers assignés à l'année
    │
    ▼
Résidents inscrits à l'année
    │
    ▼
Templates de semaine configurés
    │
    ▼
Planning hebdomadaire généré pour chaque résident
    │
    ▼
Résident saisit ses activités (gardes, absences, tâches)
    │
    ▼
Manager valide les périodes
    │
    ▼
Export Excel disponible
```

---

## Authentification et Sécurité

### Mécanisme JWT

1. **Login** : POST `/api/login_check` → retourne `{token, refresh_token}`
2. **Accès** : Header `Authorization: Bearer <token>` sur chaque requête
3. **Refresh** : POST `/api/token/refresh` (refresh token en cookie) → nouveau JWT
4. **Logout** : Suppression des cookies `REFRESH_TOKEN` + `BEARER`

### Firewall Symfony

```yaml
# security.yaml (simplifié)
firewalls:
  public:
    pattern: ^/api/public    # Routes publiques (activation, reset)
    stateless: true

  api:
    pattern: ^/api
    stateless: true
    jwt: ~                   # Auth via JWT
```

### Niveaux d'Accès

| Role | Accès |
|------|-------|
| `ROLE_MANAGER` | Gestion des résidents, validation, statistiques |
| `ROLE_RESIDENT` | Saisie de ses propres activités |
| `PUBLIC_ACCESS` | Activation de compte, reset de mot de passe |

### Voters d'Accès

Toutes les vérifications d'accès aux ressources sont gérées par des Voters Symfony (pas d'accès checker custom) :

| Voter | Permissions |
|-------|-------------|
| `YearAccessVoter` | `ADMIN`, `DATA_ACCESS`, `DATA_VALIDATION`, `DATA_DOWNLOAD`, `MANAGE_AGENDA`, `HAS_AGENDA_ACCESS` |

---

## Configuration par Environnement

| Variable | Dev | Prod |
|----------|-----|------|
| `APP_ENV` | `dev` | `prod` |
| `DATABASE_URL` | `mysql://root:@127.0.0.1:3306/medcligmedatwork` | Credentials sécurisés |
| `CORS_ALLOW_ORIGIN` | `http://localhost:3000` | `https://www.medatwork.be` |
| `MAILER_DSN` | SendGrid sandbox | SendGrid production |

---

## Notes API Platform

API Platform 2.7.18 est installé. Les entités utilisent le nouveau namespace `ApiPlatform\Metadata\ApiResource` (pas l'ancien `ApiPlatform\Core\Annotation\ApiResource`).

3 warnings de dépréciation subsistent au démarrage du kernel — ils proviennent du code interne d'API Platform 2.7 (services `iri_converter.legacy`, `IdentifiersExtractor`, `ResourceAccessChecker`) et ne peuvent être résolus qu'en migrant vers API Platform 3.x.

---

*Document créé le 2026-03-20 — Dernière mise à jour : 2026-03-22*
