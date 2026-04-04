# Architecture — Medatwork

**Dernière mise à jour :** 2026-04-02

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

## Backend — Symfony 7.4

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
├── migrations/                 # 54 migrations Doctrine (2022-2026)
├── public/
│   ├── index.php               # Front controller
│   └── Images/                 # Uploads
├── src/
│   ├── Command/                # Commandes CLI Symfony
│   ├── Controller/             # 33+ contrôleurs REST
│   ├── Doctrine/               # Extensions Doctrine (CurrentUserExtension)
│   ├── DTO/                    # 22 DTOs d'entrée typés (fromRequest())
│   ├── Entity/                 # 25 entités Doctrine
│   ├── Enum/                   # Enums PHP 8.1 (GardeType, AbsenceType, Sexe, ManagerStatus, …)
│   ├── Events/                 # Event subscribers (API Platform hooks)
│   ├── EventListener/          # Listeners Symfony (ExceptionListener)
│   ├── Exceptions/             # Exceptions métier
│   ├── Repository/             # 25 repositories
│   ├── Security/               # Voters d'accès (YearAccessVoter, etc.)
│   ├── Services/               # Logique métier
│   └── Util/                   # Utilitaires purs (FrenchMonths, etc.)
├── templates/
│   └── email/                  # Templates Twig pour emails
└── tests/
    ├── Unit/
    │   ├── Command/            # Tests des commandes CLI
    │   ├── Controller/         # Tests contrôleurs (signup, hospital, admin…)
    │   ├── DTO/                # 22 fichiers de tests DTO (~310 tests)
    │   ├── Security/           # Tests UserChecker
    │   ├── Services/           # Tests services métier
    │   └── Util/               # Tests utilitaires
    └── Integration/            # Tests d'intégration (ApiAuthTest, etc.)
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
JsonResponse (array_map explicite — pas de sérialisation automatique)
```

### Groupes de Contrôleurs

| Dossier / Fichier | Rôle |
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
| `HospitalController` | `GET /api/hospitals` — liste publique des hôpitaux actifs |
| `HospitalRequestController` | `POST/GET /api/hospital-requests` — demandes d'ajout d'hôpital (managers) |
| `AdminController` | `GET\|POST /api/admin/*` — gestion hôpitaux, demandes, invitation admins (ROLE_SUPER_ADMIN) |

### Commandes CLI (`src/Command/`)

| Commande | Description |
|----------|-------------|
| `app:update-isEditable-Status` | Met à jour le flag `isEditable` en base |
| `app:generate-year-intervals` | Génère les intervalles d'une année académique |
| `app:activate-server` | Active le serveur (usage interne) |
| `app:notifications:purge` | Supprime les vieilles notifications (read > 30j, unread > 90j) |
| `app:create-app-admin` | **Crée le premier super-admin** (AppAdmin, ROLE_SUPER_ADMIN) — à exécuter une seule fois au setup |

Usage de la purge :
```bash
# Valeurs par défaut (read > 30j, unread > 90j)
php bin/console app:notifications:purge

# Personnalisé
php bin/console app:notifications:purge --read-days=60 --unread-days=180
```

### Services Principaux

| Service | Responsabilité |
|---------|----------------|
| `ManagerMonthValidation/` | Validation mensuelle des périodes |
| `Notifications/ValidationNotifications` | Notifie après validation/annulation d'une période |
| `Notifications/UpdateYearResidentNotifications` | Notifie après changement de statut résident |
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

### Pattern Sérialisation (notifications)

Pour éviter les références circulaires, les contrôleurs de notification utilisent un `array_map` explicite :

```php
$data = array_map(fn (NotificationManager $n) => [
    'id'        => $n->getId(),
    'object'    => $n->getObject(),
    'body'      => $n->getBody(),
    'type'      => $n->getType(),
    'read'      => $n->getIsRead(),
    'readAt'    => $n->getReadAt()?->format(\DateTimeInterface::ATOM),
    'createdAt' => $n->getCreatedAt()->format(\DateTimeInterface::ATOM),
], $notifications);
return $this->json($data);
```

Ne jamais passer directement des entités avec relations bidirectionnelles à `$this->json()`.

---

## Frontend — React 17

### Structure des Dossiers

```
frontend/
├── public/
│   ├── index.html
│   └── .htaccess               # Redirection SPA (React Router)
└── src/
    ├── App.tsx                 # Routing principal
    ├── config.ts               # URL API (depuis .env)
    ├── lib/
    │   └── queryClient.ts      # QueryClient React Query (global error handler)
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
    │   ├── useAuth.ts
    │   ├── useAxiosPrivate.ts  # Intercepteurs JWT + verrou de concurrence refresh
    │   ├── useRefreshToken.ts  # POST /api/token/refresh
    │   ├── useNotifications.ts # Polling React Query (refetchInterval 30s)
    │   ├── useLogout.ts
    │   └── data/               # Hooks de données (React Query)
    │       ├── useManagerYears.ts
    │       └── useNotifications.ts  # Hook page notifications
    ├── store/                  # État global Zustand
    │   └── notificationsStore.ts
    ├── contexts/               # État global auth
    │   └── AuthProvider.tsx
    └── services/               # Appels API
        ├── Axios.ts
        ├── notificationsApi.ts
        └── ...
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
    │ Refresh token en cookie HttpOnly
    ▼
useAxiosPrivate Hook
    │ Intercepte toutes les requêtes
    │ Ajoute "Authorization: Bearer <JWT>"
    │ Si 401 → verrou de concurrence → un seul refresh en vol à la fois
    │          → renouvelle JWT via POST /api/token/refresh
    ▼
API Calls
```

### Verrou de Concurrence sur le Refresh Token

Le serveur utilise `single_use: true` sur les refresh tokens (chaque token n'est valide qu'une fois). Sans verrou, deux requêtes simultanées recevant un 401 déclenchent deux refreshes en parallèle — le second échoue et déconnecte l'utilisateur.

**Solution** (`useAxiosPrivate.ts`) :
```ts
let refreshPromise: Promise<string> | null = null;

// Dans l'intercepteur 401 :
if (!refreshPromise) {
  refreshPromise = refresh().finally(() => { refreshPromise = null; });
}
const newAccessToken = await refreshPromise;
```

Toutes les requêtes en attente de 401 attendront la même promesse. Seul un appel `refresh()` est effectué.

### Polling de Notifications (React Query)

Le polling utilise `useQuery` avec `refetchInterval` — plus de `setInterval` manuel :

```ts
useQuery<Notification[]>({
  queryKey: ["notifications", role],
  queryFn: async () => { ... },
  enabled: role === "manager" || role === "resident",
  refetchInterval: 30_000,
  retry: false,
  meta: { suppressErrorToast: true },  // pas de toast en cas d'erreur réseau
});
```

Le flag `meta.suppressErrorToast: true` est interprété par le `QueryCache.onError` global dans `queryClient.ts` pour ne pas afficher de toast sur une erreur de polling en arrière-plan.

### QueryClient Global (`lib/queryClient.ts`)

```ts
new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.suppressErrorToast) return;  // polling silencieux
      handleApiError(error);                        // toast + Sentry
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => handleApiError(error),
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
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

### Sprint 1 — Hospital Feature (2026-04-02)

Introduce la notion d'hôpital comme entité maître. Chaque `Years` appartient à un hôpital, chaque `Manager` peut être lié à plusieurs hôpitaux.

```
AppAdmin (ROLE_SUPER_ADMIN)
    │ crée/approuve
    ▼
Hospital (liste maître — nom unique, ville, pays, actif)
    │ invite admin
    ├── HospitalAdmin (ROLE_HOSPITAL_ADMIN — un par hôpital)
    │       └── status: invited → active (via lien d'invitation email)
    │
    │ approuve demande
    └── HospitalRequest (soumise par Manager lors de l'inscription)
            └── status: pending → approved | rejected

Manager ──ManyToMany──► Hospital
    └── status: pending_hospital → active  (bloqué en attente d'approbation)

Years ──ManyToOne──► Hospital (nullable — rétrocompat)
```

**Endpoints :**

| Route | Auth | Description |
|-------|------|-------------|
| `GET /api/hospitals` | Public | Liste des hôpitaux actifs (pour formulaires) |
| `POST /api/hospital-requests` | Manager | Soumettre une demande de nouvel hôpital |
| `GET /api/hospital-requests` | Manager | Mes demandes en cours |
| `GET /api/admin/hospitals` | Super-admin | Tous les hôpitaux |
| `POST /api/admin/hospitals` | Super-admin | Créer un hôpital |
| `PUT /api/admin/hospitals/{id}` | Super-admin | Modifier |
| `PATCH /api/admin/hospitals/{id}/toggle` | Super-admin | Activer/désactiver |
| `GET /api/admin/hospital-requests` | Super-admin | Demandes en attente |
| `POST /api/admin/hospital-requests/{id}/approve` | Super-admin | Approuver → crée hôpital + active manager |
| `POST /api/admin/hospital-requests/{id}/reject` | Super-admin | Rejeter |
| `POST /api/admin/hospitals/{id}/admins` | Super-admin | Inviter un HospitalAdmin |
| `GET /api/admin/users/managers` | Super-admin | Liste managers |
| `GET /api/admin/users/residents` | Super-admin | Liste résidents |

**Setup initial :**
```bash
php bin/console app:create-app-admin
```

---

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
├── [via ManagerYears] Years
└── [via manager_hospital] Hospital (ManyToMany)

Resident
├── NotificationResident   (notifications pour le résident)
├── ResidentWeeklySchedule (planning hebdomadaire)
└── [via YearsResident] Years

Hospital
├── HospitalAdmin  (OneToMany — admins RH)
├── HospitalRequest (OneToMany — demandes d'ajout)
├── Years           (OneToMany — années de stage)
└── [via manager_hospital] Manager (ManyToMany)

AppAdmin           (super-admin applicatif)
HospitalAdmin      (admin RH d'un hôpital)
HospitalRequest    (demande d'hôpital par un manager)

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
    │ → Notifications envoyées aux autres managers et résidents
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
| `ROLE_SUPER_ADMIN` | Espace admin : CRUD hôpitaux, approbation demandes, invitation HospitalAdmin |
| `ROLE_HOSPITAL_ADMIN` | Admin RH d'un hôpital — espace dédié (Sprint 2) |
| `ROLE_MANAGER` | Gestion des résidents, validation, statistiques |
| `ROLE_RESIDENT` | Saisie de ses propres activités |
| `PUBLIC_ACCESS` | Activation de compte, reset de mot de passe, liste des hôpitaux |

### Providers de Sécurité

```yaml
providers:
  manager_users:       { entity: { class: Manager,       property: email } }
  resident_users:      { entity: { class: Resident,      property: email } }
  hospital_admin_users:{ entity: { class: HospitalAdmin, property: email } }
  app_admin_users:     { entity: { class: AppAdmin,      property: email } }
  all_users:
    chain: [manager_users, resident_users, hospital_admin_users, app_admin_users]
```

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

---

## Flux d'invitation Manager (hospital_admin)

### Deux cas selon l'existence du manager

**Cas 1 — Nouveau manager (pas de compte)**
1. `POST /api/hospital-admin/managers` → crée `Manager` (incomplet) + `ManagerYears` (invitedAt=now) + token
2. Email `managerSetup.html.twig` → lien `{frontendUrl}/manager-setup/{token}` + lien refus
3. Manager ouvre la page → `GET /api/managers/setup/{token}` → retourne contexte (nom, hôpital, année)
4. Manager soumet le formulaire → `POST /api/managers/setup/{token}` → password hashé, sexe, job, validatedAt=now, token=null, invitedAt=null sur tous les ManagerYears pending

**Cas 2 — Manager existant (compte actif)**
1. `POST /api/hospital-admin/managers` → crée uniquement `ManagerYears` (invitedAt=now) + token sur le Manager existant
2. Email `managerYearInvite.html.twig` → liens accept/refuse (routes backend HTML)
3a. Accepter → `GET /api/managers/accept-year/{token}` → invitedAt=null, token=null → HTML succès
3b. Refuser → `GET /api/managers/refuse-year/{token}` → supprime ManagerYears pending ; nouveau sans années actives → supprime Manager → HTML info

### Convention de statut (ManagerYears.invitedAt)
| Valeur | Statut | Signification |
|--------|--------|---------------|
| `invitedAt != null` | **pending** | Invitation envoyée, non acceptée |
| `invitedAt == null && validatedAt == null` | **incomplete** | Compte créé, profil non complété |
| `invitedAt == null && validatedAt != null` | **active** | Manager actif |

### Token lifecycle
- Généré avec `bin2hex(random_bytes(32))` — validité 48h (`tokenExpiration`)
- Stocké sur `Manager.token` + `Manager.tokenExpiration`
- Effacé après accept/refuse/setup complet

*Document créé le 2026-03-20 — Dernière mise à jour : 2026-04-04*
