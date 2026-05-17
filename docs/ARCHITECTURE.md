# Architecture — Medatwork

**Dernière mise à jour :** 2026-05-17 (v3.6.0 — préférences utilisateur, topbar search admin, suppression api-v2, corrections Sentry)

## Vue d'Ensemble

Medatwork est une application **SPA + API REST** avec une séparation stricte Frontend/Backend.

```
┌─────────────────────────────────────────────────────────────┐
│                        NAVIGATEUR                           │
│                    React 18 (SPA)                           │
│              https://www.medatwork.be                       │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS + JWT Bearer
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     API REST                                │
│              Symfony 7.4 + API Platform 3.x                 │
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
├── migrations/                 # 74 migrations Doctrine (2022-2026)
├── public/
│   ├── index.php               # Front controller
│   └── Images/                 # Uploads
├── src/
│   ├── Command/                # Commandes CLI Symfony
│   ├── Controller/             # 33+ contrôleurs REST
│   ├── Doctrine/               # Extensions Doctrine (CurrentUserExtension)
│   ├── DTO/                    # 22 DTOs d'entrée typés (fromRequest())
│   ├── Entity/                 # 30+ entités Doctrine
│   ├── Enum/                   # Enums PHP 8.1 (GardeType, AbsenceType, Sexe, ManagerStatus, …)
│   ├── Events/                 # Event subscribers (API Platform hooks)
│   ├── EventListener/          # Listeners Symfony (ExceptionListener)
│   ├── Exceptions/             # Exceptions métier
│   ├── Repository/             # 30+ repositories
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
    │   ├── Security/           # Tests UserChecker + YearAccessVoterTest (9 tests)
    │   ├── Services/           # Tests services métier (YearSummaryBuilder, etc.)
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
| `HospitalAdminController` | `GET\|POST\|PATCH /api/hospital-admin/*` — gestion des managers, années et droits (ROLE_HOSPITAL_ADMIN) |
| `HospitalController` | `GET /api/hospitals` — liste publique des hôpitaux actifs |
| `HospitalRequestController` | `POST/GET /api/hospital-requests` — demandes d'ajout d'hôpital (managers) |
| `AdminController` | `GET\|POST /api/admin/*` — gestion hôpitaux, demandes, invitation admins (ROLE_SUPER_ADMIN) |
| `ProfileAvatarController` | `POST /api/profile/avatar` — upload avatar (JPEG/PNG/WebP ≤ 2 Mo) ; `DELETE /api/profile/avatar` — suppression avatar ; accessible à tous les rôles authentifiés |
| `MaccsSetupController` | `GET/POST /api/maccs/setup/{token}` — complétion de profil MACCS après invitation ; accepte `multipart/form-data` (avec avatar) ou JSON |
| `ManagerInviteController` | `GET/POST /api/managers/setup/{token}` — complétion de profil Manager après invitation ; accepte `multipart/form-data` ou JSON |
| `CommunicationAPI/UserCommunicationController` | `GET\|PATCH /api/communications/*` — notifications & modals pour tout utilisateur authentifié |
| `CommunicationAPI/AdminCommunicationController` | `GET\|POST\|PATCH /api/admin/communications/*` — gestion globale des messages (ROLE_SUPER_ADMIN) |
| `CommunicationAPI/HospitalAdminCommunicationController` | `GET\|POST\|PUT\|DELETE\|PATCH /api/hospital-admin/communications/*` — gestion messages scoped à l'hôpital (ROLE_HOSPITAL_ADMIN) |

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
| `AvatarUploadHelper` | Traitement des uploads d'avatar (validation MIME/taille, suppression ancienne photo, stockage) |
| `Statistics/` | Calcul des statistiques |
| `Schedule/` | Gestion des plannings |
| `YearsManagement/YearSummaryBuilder` | Construit le résumé des années pour le WeekDispatcher : `buildForManager()` (via `ManagerYears`), `buildForHospitalAdmin()` (via `YearsRepository::findActiveYearsByHospital()`) |
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

### Upload d'Avatar — Pattern Multipart (2026-04-15)

Quatre formulaires acceptent une photo de profil à la création de compte :

| Formulaire | Endpoint backend |
|------------|-----------------|
| Inscription MACCS (signup) | `POST /api/create/newResident` |
| Inscription Manager (signup) | `POST /api/create/newManager` |
| Complétion profil MACCS (invitation) | `POST /api/maccs/setup/{token}` |
| Complétion profil Manager (invitation) | `POST /api/managers/setup/{token}` |

**Backend — `AvatarUploadHelper`**

Service central partagé entre tous les endpoints :

```php
// Valide MIME (JPEG/PNG/WebP), taille (≤ 2 Mo), supprime l'ancienne photo,
// génère un nom aléatoire (bin2hex(random_bytes(16)).ext), déplace le fichier.
$avatarHelper->process(UploadedFile $file, object $entity): void
// throws \InvalidArgumentException si validation échoue
```

**Détection multipart dans les contrôleurs :**

```php
$isMultipart = str_contains($request->headers->get('Content-Type', ''), 'multipart');
$data = $isMultipart ? $request->request->all() : (json_decode($request->getContent(), true) ?? []);
```

Les endpoints signup retournent 200 même si l'avatar est invalide (erreur non bloquante). Les endpoints setup retournent 422 si l'avatar est invalide.

**Frontend — `AvatarPickerField`**

Composant réutilisable (`src/components/AvatarPickerField.tsx`) :
- Avatar circulaire 96 px avec overlay bouton caméra
- Input fichier caché (JPEG/PNG/WebP, max 2 Mo — validation client)
- Dialog de recadrage : `react-easy-crop`, format 1:1, zoom 1–3×
- Callback `onChange: (blob: Blob | null) => void` — le parent passe le blob à l'API

```tsx
<AvatarPickerField onChange={setAvatarBlob} />
```

**Compatibilité JSON / multipart :**

Les services API (`residentsApi`, `managersApi`, `maccsSetupApi`, `managerSetupApi`) envoient automatiquement `multipart/form-data` si un blob est fourni, et `application/json` sinon. Le backend est rétrocompatible avec les deux.

---

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

## Frontend — React 18

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
    │   ├── Profile/            # Photo de profil (upload/delete avatar)
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
    │   ├── useAxiosPrivate.ts      # Intercepteurs JWT + verrou de concurrence refresh
    │   ├── useRefreshToken.ts      # POST /api/token/refresh
    │   ├── useNotifications.ts     # Polling notifications legacy (30s)
    │   ├── useCommNotifications.ts # Polling unread-count comm (30s)
    │   ├── useLogout.ts
    │   └── data/               # Hooks de données (React Query)
    │       ├── useManagerYears.ts
    │       └── useNotifications.ts  # Hook page notifications
    ├── store/                  # État global Zustand
    │   ├── notificationsStore.ts       # count + notifications + commUnreadCount
    │   └── weekDispatcherStore.ts      # années, résidents, intervalles, templates, assignments, pendingChange
    ├── contexts/               # État global auth
    │   └── AuthProvider.tsx
    ├── components/
    │   └── communication/
    │       ├── CommunicationModalQueue.tsx  # File de modals à la connexion
    │       └── CommunicationPageContent.tsx # Page admin commune (tableau + dialog)
    └── services/               # Appels API
        ├── Axios.ts
        ├── notificationsApi.ts
        ├── communicationsApi.ts    # Endpoints user + admin + hospital-admin
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

Le même pattern est utilisé pour le système de communication (`useCommNotifications`) — actif pour **tous les rôles** authentifiés (pas seulement manager/résident).

### Système de Communication Globale (2026-04-07)

Système de messagerie interne permettant aux admins (super-admin et hospital-admin) d'envoyer des **notifications** et des **modals** aux utilisateurs de la plateforme.

#### Types de messages

| Type | Comportement |
|------|-------------|
| `notification` | Affiché dans la page Notifications + badge sidebar. Marqué lu au clic. Navigation vers `targetUrl` si défini. |
| `modal` | Affiché à la connexion, une seule fois, en cascade. Bouton "J'ai compris" unique — ni fermeture ni clic backdrop. |

#### Ciblage (`scopeType`)

| Scope | Description |
|-------|-------------|
| `all` | Tous les utilisateurs (scoped à l'hôpital si `hospital` est défini) |
| `role` | Tous les utilisateurs d'un rôle (`manager` / `resident` / `hospital_admin`) |
| `user` | Un utilisateur spécifique (par `targetUserId` + `targetUserType`) |

#### Endpoints backend

| Route | Accès | Description |
|-------|-------|-------------|
| `GET /api/communications/notifications` | Authentifié | Toutes les notifications de l'utilisateur |
| `GET /api/communications/notifications/unread-count` | Authentifié | Nombre de notifications non lues (polling 30s) |
| `PATCH /api/communications/notifications/{id}/read` | Authentifié | Marquer une notification comme lue |
| `DELETE /api/communications/notifications/{id}/read` | Authentifié | Marquer une notification comme non lue |
| `PATCH /api/communications/notifications/read-all` | Authentifié | Marquer tout comme lu |
| `GET /api/communications/modals/pending` | Authentifié | Modals non encore lus (appelé à la connexion) |
| `PATCH /api/communications/modals/{id}/read` | Authentifié | Acquitter un modal |
| `GET /api/admin/communications` | ROLE_SUPER_ADMIN | Historique global des messages |
| `POST /api/admin/communications` | ROLE_SUPER_ADMIN | Créer un message |
| `PUT /api/admin/communications/{id}` | ROLE_SUPER_ADMIN | Modifier un message |
| `DELETE /api/admin/communications/{id}` | ROLE_SUPER_ADMIN | Supprimer un message |
| `PATCH /api/admin/communications/{id}/toggle-active` | ROLE_SUPER_ADMIN | Activer/désactiver |
| `POST /api/admin/communications/{id}/duplicate` | ROLE_SUPER_ADMIN | Dupliquer |
| `GET /api/admin/communications/users` | ROLE_SUPER_ADMIN | Liste tous les utilisateurs (autocomplete) |
| `GET /api/hospital-admin/communications` | ROLE_HOSPITAL_ADMIN | Historique messages de l'hôpital |
| `POST /api/hospital-admin/communications` | ROLE_HOSPITAL_ADMIN | Créer un message (hospital auto-scopé) |
| `PUT /api/hospital-admin/communications/{id}` | ROLE_HOSPITAL_ADMIN | Modifier un message (ownership check) |
| `DELETE /api/hospital-admin/communications/{id}` | ROLE_HOSPITAL_ADMIN | Supprimer un message (ownership check) |
| `PATCH /api/hospital-admin/communications/{id}/toggle-active` | ROLE_HOSPITAL_ADMIN | Activer/désactiver (ownership check) |
| `POST /api/hospital-admin/communications/{id}/duplicate` | ROLE_HOSPITAL_ADMIN | Dupliquer |
| `GET /api/hospital-admin/communications/users` | ROLE_HOSPITAL_ADMIN | Utilisateurs de l'hôpital seulement |

#### Logique de livraison (`CommunicationMessageRepository`)

Un message est livré à un utilisateur si toutes ces conditions sont vraies :
1. `isActive = true`
2. `type` correspond au contexte de l'appel (notification ou modal)
3. Scope : `scopeType = 'all'` **OU** `(scopeType = 'role' AND targetRole = userType)` **OU** `(scopeType = 'user' AND targetUserId = userId AND targetUserType = userType)`
4. Hospital : si `hospital IS NULL` → global ; si `hospital IS NOT NULL` → seulement si `hospitalId = userHospitalId`
5. Pour les modals : `r.id IS NULL` (pas encore lu = absent de `communication_message_read`)

#### Flux frontend

```
Connexion utilisateur (PersistLogin.tsx)
    │ GET /api/communications/modals/pending
    ▼
CommunicationModalQueue.tsx
    │ Affiche modal 1
    │ Clic "J'ai compris" → PATCH /modals/1/read → modal 2 → ... → onAllDone
    ▼
App normale accessible

WithFixedSidebar.tsx
    │ useCommNotifications(role) — polling 30s
    │ → GET /api/communications/notifications/unread-count
    ▼
notificationsStore.commUnreadCount
    │
    ▼
SidebarNav badge = legacyCount + commUnreadCount (max affichée: 9)
```

#### Pages frontend

| Route | Page | Accès |
|-------|------|-------|
| `/hospital-admin/notifications` | `HospitalAdminNotificationsPage` | ROLE_HOSPITAL_ADMIN |
| `/hospital-admin/communication` | `HospitalAdminCommunicationPage` | ROLE_HOSPITAL_ADMIN |
| `/admin/communication` | `AdminCommunicationPage` | ROLE_SUPER_ADMIN |

`HospitalAdminCommunicationPage` et `AdminCommunicationPage` partagent le composant `CommunicationPageContent` (paramétrable via prop `api` + `showHospital`).

#### Fonctionnalités UI — CommunicationPageContent (2026-04-14)

Le composant accepte un `ApiSet` optionnel — les boutons actions sont conditionnellement affichés selon la présence des méthodes :

| Méthode `ApiSet` | Bouton rendu | Comportement |
|---|---|---|
| `create()` | "Nouveau message" (toujours présent) | Dialog création |
| `update?(id)` | Crayon — conditionnel | Dialog édition (pré-rempli), titre "Modifier le message" |
| `delete?(id)` | Poubelle — conditionnel | Dialog confirmation + suppression irréversible |
| `toggleActive(id)` | ToggleOn/ToggleOff | Activation/désactivation |
| `duplicate(id)` | Copie | Duplication |

Toutes les mutations utilisent l'**optimistic update** : fermeture immédiate du dialog, mise à jour du cache, rollback sur erreur réseau, `invalidateQueries` pour synchronisation finale.

#### Fonctionnalités UI — HospitalAdminNotificationsPage (2026-04-14)

- **Pagination client-side** : 20 notifications par page, reset au changement de filtre
- **Dialog de détail** : titre, date, corps complet, bouton "Ouvrir le lien" (si `targetUrl`), bouton "Marquer non lu" (si `isRead === true`)
- **Marquer non lu** : appelle `DELETE /api/communications/notifications/{id}/read`, met à jour l'état du dialog immédiatement

#### Fonctionnalités UI — HospitalAdminAuditLogPage (2026-04-14)

- **Chargement global** : toutes les entrées en une requête (limit=1 000), filtrage/pagination client-side
- **Filtres** : type d'action (Select), plage de dates (Du / Au), compteur de résultats, bouton "Réinitialiser"
- **Export CSV** : exporte uniquement la vue filtrée courante

### Design System — Chips MUI (2026-04-13)

Tous les `<Chip>` de l'application partagent une convention visuelle unifiée, définie dans `src/doc/CustomizedTheme.tsx` :

```tsx
components: {
  MuiChip: {
    defaultProps: {
      variant: "outlined",  // outlined partout
      size: "small",
    },
  },
},
```

**Palette sémantique des chips :**

| Statut / Contexte | Couleur | Notes |
|---|---|---|
| Actif / Conforme | `success` | `#2e7d32` (vert forêt — remplace le vert néon `#56CA00`) |
| En attente / Invité | `info` | Bleu — signale un état informationnel en attente d'action |
| Incomplet / Erreur | `error` | Rouge |
| Inactif / Retiré | `default` | Gris |
| Opting-out | `primary` | Violet (couleur de marque) |
| Action log (audit) | variable | success/error/warning/info/default selon le type d'action |

Ce système s'applique à tous les fichiers : `HospitalAdminResidentsPage`, `HospitalAdminManagersPage`, `HospitalAdminYearResidentsPage`, `AdminHospitalAdminsPage`, `AdminHospitalDetailPage`, `AdminManagersPage`, `AdminResidentsPage`, `CommunicationPageContent`, etc.

---

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

Les routes sont organisées en blocs par rôle dans `App.tsx` :

| Guard | Condition | Routes |
|-------|-----------|--------|
| `ManagerRoute` | `role === "manager"` **ou** `role === "hospital_admin"` | `/manager/*` (toutes les pages manager, y compris celles partagées par les hospital-admins) |
| `HospitalAdminRoute` | `role === "hospital_admin"` ou `role === "manager" && hospitalName` | `/hospital-admin/*` uniquement |
| `CanCreateYearRoute` | `role === "hospital_admin"` **ou** (`role === "manager"` && `canCreateYear === true`) | `/manager/year` (création d'année) |
| `ResidentRoute` | `role === "resident"` | `/resident/*` |
| `SuperAdminRoute` | `role === "super_admin"` | `/admin/*` |

> `CanCreateYearRoute` est un Outlet guard imbriqué sous `ManagerRoute`. Si le manager n'a pas `canCreateYear`, il est redirigé vers `/manager/years`. Les hospital-admins passent toujours (ils peuvent créer des années pour n'importe quel hôpital).

**Correspondance rôle → route d'accueil après login :**

| `role` retourné par `AuthenticationSuccessListener` | Redirection |
|-----------------------------------------------------|-------------|
| `hospital_admin` | `/hospital-admin/dashboard` |
| `manager` | `/manager/realtime` |
| `resident` | `/resident/home` |
| `super_admin` | `/admin` |

Un `Manager` promu admin d'hôpital (`adminHospital !== null`) reçoit `role: "hospital_admin"` + `hospitalId` + `hospitalName` dans le payload JWT — même si son entité reste `Manager` en base.

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

### Feature — canCreateYear (2026-04-20)

Le hospital-admin peut accorder ou révoquer à chaque manager lié à son hôpital le droit de créer une année académique.

**Endpoint backend :**

| Route | Auth | Description |
|-------|------|-------------|
| `PATCH /api/hospital-admin/managers/{id}/can-create-year` | ROLE_HOSPITAL_ADMIN | Body : `{"canCreateYear": true\|false}`. Vérifie que le manager est lié à l'hôpital de l'admin (via `ManagerYears`), valide le booléen, persiste `manager.canCreateYear`, retourne `{"id", "firstname", "lastname", "canCreateYear"}`. |

**Payload JWT :**

`AuthenticationSuccessListener` injecte `canCreateYear: bool` dans le JWT pour le rôle `manager`. Ce champ est disponible côté frontend via `authentication.canCreateYear`.

**Garde de route frontend :**

`CanCreateYearRoute` (Outlet) — imbriqué sous `ManagerRoute` :
- `hospital_admin` → passe toujours.
- `manager` → passe si `canCreateYear === true`, sinon redirige vers `/manager/years`.

**Création d'année avec hôpital (`YearPage`) :**

Le champ `location` libre est remplacé par un `<Select>` alimenté par `GET /api/hospitals`. L'identifiant de l'hôpital (`hospitalId`) est envoyé au backend. `CreateYearInputDTO` l'accepte comme entier nullable. `CreateYear` service attache l'hôpital à l'année via `$year->setHospital($hospital)` et utilise `$hospital->getName()` comme location.

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
├── [via manager_hospital] Hospital (ManyToMany)
└── canCreateYear: bool    (droit de créer une année — accordé/révoqué par le hospital-admin)

Resident
├── NotificationResident   (notifications pour le résident)
├── ResidentWeeklySchedule (planning hebdomadaire)
└── [via YearsResident] Years

Hospital
├── HospitalAdmin  (OneToMany — admins RH)
├── HospitalRequest (OneToMany — demandes d'ajout)
├── Years           (OneToMany — années de stage)
├── CommunicationMessage (OneToMany — messages scoped à cet hôpital, nullable)
└── [via manager_hospital] Manager (ManyToMany)

CommunicationMessage (système de communication transversale)
└── CommunicationMessageRead (OneToMany — suivi des lectures par utilisateur)

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

| Voter | Sujet | Acteurs | Permissions |
|-------|-------|---------|-------------|
| `YearAccessVoter` | `Years` | `Manager` (via `ManagerYears`), `HospitalAdmin` (full-access si même hôpital) | `year_admin`, `year_data_access`, `year_data_validation`, `year_data_download`, `year_manage_agenda`, `year_agenda_access` |

**`YearAccessVoter` — logique :**
- `HospitalAdmin` : accès complet à toutes les années appartenant à son hôpital (`year->getHospital()->getId() === admin->getHospital()->getId()`)
- `Manager` : accès conditionnel selon les flags de la relation `ManagerYears` (`getDataAccess`, `getCanManageAgenda`, etc.)
- `SUPPORTED_ATTRIBUTES` exposé en `public const` (lisible depuis les tests et les contrôleurs)
- Absent de la relation `ManagerYears` → deny ; attribut inconnu → abstain

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

## Règles métier — Visibilité des années par rôle (session 22)

> **Validées 2026-05-05**

### Règles strictes

| Règle | Description |
|---|---|
| Un manager voit uniquement les années pour lesquelles il a un `ManagerYears` explicite. | La relation `manager_hospital` (ManyToMany) **ne donne aucun accès automatique** aux années de l'hôpital. |
| Un manager peut avoir 0, 1 ou plusieurs années. | Ne pas afficher de badge "incomplet" — c'est un état normal. |
| Un `HospitalAdmin` (ou Manager avec `adminHospital`) voit **toutes** les années de son hôpital via `years.hospital_id`. | Flux via `hospital-admin/years`, indépendant des `ManagerYears`. |
| "Retirer de l'année" = supprimer uniquement `ManagerYears`. | Ne supprime PAS le lien `manager_hospital`. |
| "Supprimer de l'hôpital" = supprimer `ManagerYears` liés aux années de cet hôpital + supprimer le lien `manager_hospital`. | Le `Manager` entity reste si lié à d'autres hôpitaux (soft-delete sinon). |

### Endpoints utilisés par la page Gestion des Managers (UI refactorée session 22)

| Endpoint | Méthode | Usage |
|---|---|---|
| `/api/hospital-admin/managers?mode=current|history` | GET | Liste managers (1 `ManagerRow` par `ManagerYears`) — groupés en frontend |
| `/api/hospital-admin/years` | GET | Liste toutes les années de l'hôpital (modal "Ajouter à une année") |
| `/api/hospital-admin/managers` | POST | Ajouter un manager (nouveau ou existant) à une année |
| `/api/hospital-admin/manager-years/{myId}` | DELETE | Retirer d'une année (supprime uniquement `ManagerYears`) |
| `/api/hospital-admin/managers/{managerId}` | DELETE | Supprimer de l'hôpital (supprime `ManagerYears` + lien `manager_hospital`) |
| `/api/hospital-admin/manager-years/{myId}/resend-invite` | POST | Renvoyer invitation (activation ou année selon contexte) |
| `/api/hospital-admin/managers/{managerId}/can-create-year` | PATCH | Toggle droit de créer une année |

### Champ `yearPending` dans `ManagerRow`

Ajouté en session 22. Indique si cette attribution spécifique (`ManagerYears`) est en attente d'acceptation par le manager (i.e. `invitedAt != null`).

```
yearPending=false + status=active   → Attribution active ✅
yearPending=false + status=pending  → Auto-ajouté, compte non activé ⏳
yearPending=true  + status=pending  → Invitation à l'année en attente 📩
yearPending=true  + status=active   → Compte actif, invitation année en attente 📩
```

---

## Flux d'invitation Manager (hospital_admin)

> **Mise à jour 2026-05-05 (session 21 & 22)** — Ajout du flux auto-ajout + fix `deleteManager` supprime `manager_hospital`.

### Source de vérité : `manager.getHospitals()`

La relation `Manager ↔ Hospital` (ManyToMany via `manager_hospital`) détermine si un manager
"appartient" à un hôpital. Ce n'est **pas** déduit de l'historique des `ManagerYears`.

`addHospital($hospital)` est appelé à **4 endroits** :
1. `AdminController` — super-admin lie manuellement un manager à un hôpital
2. `ManagersAPIController` — manager s'auto-inscrit avec son hôpital
3. `ManagerInviteController::completeSetup()` — nouveau manager invité complète son profil
4. `ManagerInviteController::acceptYearInvite()` — manager externe accepte une invitation d'année

### Trois cas selon l'existence et l'appartenance du manager

**Cas 1 — Nouveau manager (pas de compte)**
1. `POST /api/hospital-admin/managers` → crée `Manager` (incomplet) + `ManagerYears` (invitedAt=now) + token
2. Email `managerSetup.html.twig` → lien `{frontendUrl}/manager-setup/{token}` + lien refus
3. Manager ouvre la page → `GET /api/managers/setup/{token}` → retourne contexte (nom, hôpital, année)
4. Manager soumet le formulaire → `POST /api/managers/setup/{token}` → password hashé, sexe, job,
   validatedAt=now, token=null, invitedAt=null sur tous les ManagerYears pending
   → `addHospital($hospital)` pour chaque hôpital lié via ManagerYears

**Cas 2 — Manager existant appartenant à l'hôpital (`hospital ∈ manager.getHospitals()`)**

_Sous-cas 2a — compte activé (validatedAt != null)_ :
1. `POST /api/hospital-admin/managers` → crée `ManagerYears` avec `invitedAt=null` (accepté d'office)
   → PAS de token year-invitation
2. Email info `managerAddedToYearInfo.html.twig` → "Vous avez été ajouté à l'année X"
3. `NotificationManager` in-app créée pour le manager
4. Résultat immédiat : statut `active`

_Sous-cas 2b — compte non activé (validatedAt=null, token existant)_ :
1. `POST /api/hospital-admin/managers` → crée `ManagerYears` avec `invitedAt=null` (accepté d'office)
   → PAS de token year-invitation
2. Nouveau token d'activation généré, email setup renvoyé (`managerSetup.html.twig`)
3. `NotificationManager` in-app créée
4. Résultat : statut `pending` jusqu'à activation du compte

**Cas 3 — Manager existant n'appartenant pas à l'hôpital**
1. `POST /api/hospital-admin/managers` → crée `ManagerYears` (invitedAt=now) + token sur Manager existant
2. Email `managerYearInvite.html.twig` → liens accept/refuse (routes backend HTML)
3a. Accepter → `GET /api/managers/accept-year/{token}` → invitedAt=null, token=null,
    `addHospital($hospital)` → HTML succès
3b. Refuser → `GET /api/managers/refuse-year/{token}` → supprime ManagerYears pending ;
    nouveau sans années actives → supprime Manager ; sinon token=null
    → email + NotificationManager de notification aux admins de l'hôpital

### Bouton "Renvoyer l'invitation" (dashboard hospital-admin)

| Cas | Action backend | Email envoyé |
|---|---|---|
| MACCS `pending` (compte non activé) | `resendResidentInvite(yrId)` | `maccsInvited.html.twig` |
| Manager `pending` + `accountActivated=false` + `invitedAt=null` | `resendManagerInvite(myId)` | `managerSetup.html.twig` (activation) |
| Manager `pending` + `accountActivated=false` + `invitedAt!=null` | `resendManagerInvite(myId)` | `managerSetup.html.twig` (setup) |
| Manager `pending` + `accountActivated=true` | `resendManagerInvite(myId)` | `managerYearInvite.html.twig` (accept/refuse) |

### Convention de statut (ManagerYears.invitedAt + Manager.token)
| `invitedAt` | `token` | `validatedAt` | Statut UI | Signification |
|---|---|---|---|---|
| `!= null` | `!= null` | `null` | pending — Compte non activé | Invitation envoyée, setup non complété |
| `!= null` | `!= null` | `!= null` | pending — Invitation non acceptée | Compte existant, année non acceptée |
| `null` | `!= null` | `null` | pending — Compte non activé | Auto-ajouté, compte non activé |
| `null` | `null` | `!= null` | active | Pleinement opérationnel |

### Token lifecycle
- Généré avec `bin2hex(random_bytes(32))` — validité 48h (`tokenExpiration`)
- Stocké sur `Manager.token` + `Manager.tokenExpiration`
- Effacé après accept/refuse/setup complet
- Pour les auto-ajoutés (Cas 2b) : token d'activation régénéré, PAS de token year-invitation

---

## Module Agenda / Postes de travail (2026-04-15)

### Accès hospital-admin

Les hospital-admins ont accès aux trois pages du module agenda manager via `role_hierarchy` dans `security.yaml` :

```yaml
role_hierarchy:
  ROLE_HOSPITAL_ADMIN: [ROLE_MANAGER]
```

Côté frontend, les routes `/manager/calendar`, `/manager/week-dispatcher` et `/manager/week-creator` sont déclarées dans le bloc `HospitalAdminRoute` de `App.tsx`. Les entrées correspondantes sont ajoutées dans `sidebarNavData.tsx` pour le menu hospital-admin (groupe "Agenda").

### Backend — WeekTemplates

#### WeekTemplateVoter (`src/Security/Voter/WeekTemplateVoter.php`)

Le voter autorise désormais les `HospitalAdmin` sans restriction (même accès que `canEdit = true`) :

```php
if ($user instanceof HospitalAdmin) return true;
// puis vérification canEdit pour les Manager
```

#### WeekTemplatesController — endpoints

| Route | Méthode | Description |
|-------|---------|-------------|
| `GET /api/managers/weekTemplates` | GET | Liste tous les templates (HospitalAdmin → `findAll()`, Manager → ses propres) |
| `POST /api/managers/weekTemplate` | POST | Créer un template |
| `PUT /api/managers/weekTemplate/{id}` | PUT | Modifier (voter) |
| `DELETE /api/managers/weekTemplate/{id}` | DELETE | Supprimer (voter) |
| `POST /api/managers/weekTemplate/{id}/copy` | POST | **Nouveau** — Dupliquer un template avec toutes ses tâches |
| `POST /api/managers/weekTemplate/{id}/task` | POST | Ajouter une tâche |
| `PUT /api/managers/weekTask/{id}` | PUT | Modifier une tâche (incl. `dayOfWeek` pour le drag & drop) |
| `DELETE /api/managers/weekTask/{id}` | DELETE | Supprimer une tâche |

**Serialisation** : `serializeTemplate(?ManagerWeekTemplate $join)` utilise `?->getCanEdit() ?? true` — les hospital-admins reçoivent `canEdit: true` même sans ligne `ManagerWeekTemplate`.

#### WeekController supprimé

`backend/src/Controller/WeekTemplatesAPI/ManagersAPI/WeekController.php` a été **supprimé** — il contenait 2 méthodes sans route valide (typo `/manerweekTemplate`) et du code mort.

### Frontend — WeekCreator (`pages/Management/Agenda/WeekCreator/`)

#### Layout

```
WeekCreatorPage
└── Card
    ├── TopBar                     ← chips templates + progression heures
    └── Grid container (3 colonnes)
        ├── AddBloc (xs=12, md=3)  ← formulaire ajout/édition tâche + bouton ?
        ├── TimelineBloc (xs=12, md=6) ← VisualTimeline horizontale (tous les jours)
        └── TimeSummaryBloc (xs=12, md=3) ← cercle heures + barres par jour
```

La `TopBar` est positionnée en haut de la `Card`, avant le Grid 3 colonnes.

#### TopBar

- Layout **CSS Grid** (4 colonnes : `auto 1fr auto 160px`) — plus stable que flexbox pour aligner les éléments de longueurs variables
- **Bouton `+`** (col 1) : toujours visible, ouvre le drawer `CreateWeekForm`
- **Zone chips scrollable** (col 2, `1fr`) : un chip par template, couleur personnalisée, scroll horizontal masqué
- **Icône ✏️** : s'affiche sur le chip sélectionné → ouvre le drawer `UpdateWeekTemplate`
- **Barre de progression** (col 4, 160 px) : `{X}h / 72h` avec `LinearProgress`, rouge si ≥ 100 % — masquée si aucun template sélectionné (colonne à `0px`)
- **Bouton `?`** supprimé de la TopBar → déplacé dans `WeekTaskForm`

#### TimelineBloc

- Délègue entièrement le sélecteur de jour et le drag & drop à `VisualTimeline`
- Reçoit `selectedWeek.weekTaskList` (toutes les tâches, non filtrées par jour) et passe `selectedWeekDay` / `setSelectedWeekDay` / `handleDropToDay` via props
- Affiche un message vide si aucun template n'est sélectionné (`selectedWeek === undefined`)
- Optimistic update + revert sur erreur pour les déplacements de tâche entre jours (`handleDropToDay`)

#### VisualTimeline

Timeline **horizontale** : le temps est l'axe X (06:00 → 23:00), les 7 jours sont des lignes.

```
┌──────────┬─────────────────────────────────────────────┬────────┐
│          │  06h  07h  08h ···  18h ···  23h            │ Total  │
│  Lundi   │       [Tâche A────────]                     │  8h    │
│  Mardi   │             [Tâche B──]  [Tâche C─]         │  6h30  │
│  ...     │                                             │  ...   │
│ Dimanche │                                             │   —    │
└──────────┴─────────────────────────────────────────────┴────────┘
```

**Trois zones :**
- **Colonne gauche** (`LABEL_WIDTH = 76px`, sticky) : noms des jours, cliquables (`onDaySelect`). Le jour sélectionné est mis en évidence avec la couleur du template.
- **Zone scrollable** : canvas de largeur fixe (`totalWidth`). La fenêtre 8h–18h occupe exactement la largeur visible à l'ouverture (`pxPerMin` mesuré via `useLayoutEffect`). La valeur de repli `FALLBACK_PPM = 1.5` est utilisée en tests (jsdom `clientWidth = 0`).
- **Colonne droite** (`HOURS_WIDTH = 52px`, sticky) : total d'heures par jour + total semaine.

**Indicateur "maintenant"** : ligne rouge verticale + label heure, mise à jour toutes les minutes (`setInterval 60 s`).

**Drag & drop** : `DRAG_TASK_KEY = "application/week-task-id"` partagé entre `HTaskBlock` et les rows. Déposer sur n'importe quelle ligne déclenche `onDropToDay(taskId, newDay)`. Le highlight de survol est géré par `dragOverDay` state avec garde `contains(relatedTarget)` pour éviter les faux `onDragLeave`.

**Clamping des tâches hors-plage** : `clampedStart = max(startMin, START_MINUTES)`, `clampedEnd = min(endMin, END_HOUR * 60)` — la position et la largeur sont calculées sur la durée clampée pour éviter tout débordement.

#### WeekTaskForm

- `AdapterDayjs` — compatible avec l'environnement Docker
- `serverError` state : affiche un `<Alert severity="error">` sur erreur 400 backend
- Submit désactivé si `title.trim() === ""`
- **Bouton `?`** (icône `HelpOutlineIcon`) en bas du formulaire → ouvre `TutorialModal` (déplacé ici depuis `TopBar`)

#### Tests (Vitest)

| Fichier | Tests |
|---------|-------|
| `VisualTimeline.test.tsx` | 7 labels de jour, titres tâches, positionnement `left` (FALLBACK_PPM), tâche jour 3, état vide |
| `WeekTaskForm.test.tsx` | Submit disabled/enabled, alert erreur serveur, annuler reset |
| `WeekTemplatesList.test.tsx` | Titres, variant contained, barres couleur, clic handler |
| `HoursCircle.test.tsx` | Label présent, cap à 100 % pour 80h |
| `TimeSummaryBloc.test.tsx` | 7 jours, dayOfWeek string, hors plage ignoré |

### Frontend — WeekDispatcher (`pages/Management/Agenda/WeekDispatcher/`) (2026-05-15 — refonte)

#### Layout (post-redesign)

```
WeekDispatcherPage
└── WeekDispatcher.tsx         ← fetch initial, gestion loading/erreur
    └── WeekTaskAllocation.tsx ← bridge données ↔ composant, mutations optimistes
        └── WeekScheduleTable.tsx ← composant pur d'affichage (styles inline)
                                    - sélecteur d'année (slot yearSelector)
                                    - grille scrollable horizontalement
                                    - panneau latéral (Charge / Aperçu mensuel)
                                    - navigation "non assignées" cyclique
```

Si aucune année n'est disponible : `WeekTaskAllocation` affiche une `Alert info` pleine largeur.

#### Store — `weekDispatcherStore.ts`

State Zustand partagé entre tous les composants enfants :

| Champ | Type | Description |
|-------|------|-------------|
| `years` | `YearSummary[]` | Résumé des années (residents, weekIntervals, yearWeekTemplates) |
| `currentYearId` | `number \| null` | Année sélectionnée |
| `residents` | `ResidentAssignment[]` | Résidents de l'année courante |
| `intervals` | `WeekInterval[]` | Intervalles de semaines de l'année courante |
| `yearWeekTemplates` | `YearWeekTemplate[]` | Templates liés à l'année courante |
| `assignments` | `Assignments` | Map `[templateId][weekIntervalId] → ResidentAssignment \| null` |
| `pendingChange` | `unknown[]` | Réinitialisé à `[]` lors du changement d'année — les mutations sont maintenant optimistes (appel API direct par opération, voir ci-dessous) |

Tous les setters supportent les **functional updaters** (`setState((prev) => ...)`) en plus de la valeur directe.

#### Mutations — approche optimiste directe

Chaque assignation/retrait met à jour le store local immédiatement, puis appelle `dispatchWeek` avec la ou les opérations concernées sans attendre de confirmation :

```ts
// Après mise à jour optimiste de assignments :
const { method, url } = calendarApi.dispatchWeek(currentYearId);
await axiosPrivate[method](url, ops);   // fire-and-forget
```

**Collision inter-poste** : si le résident est déjà assigné à un autre poste la même semaine, un `{ method: "delete" }` de l'ancien poste est inclus dans le même appel API que le `{ method: "create" }` du nouveau.

#### Endpoints backend utilisés

| Route | Méthode | Description |
|-------|---------|-------------|
| `GET /api/managers/getYearsWeekIntervals` | GET | Résumé années + intervalles + assignments (Manager & HospitalAdmin) |
| `POST /api/managers/dispatchWeek/{yearId}` | POST | Enregistrement direct d'une ou plusieurs opérations (optimiste) |

#### Tests Vitest

| Fichier | Tests |
|---------|-------|
| `weekDispatcherStore.test.ts` | 9 tests — setters valeur directe + functional updater |
| `WeekTemplateImport.test.tsx` | 9 tests — lazy-load, filtre, empty-state, cancel, import |
| `WeekTaskAllocation.pendingChange.test.ts` | 6 tests — logique `upsertPendingOp` (déduplication de slots) |
| `WeekScheduleTable.test.tsx` | 30 tests — rendu, cellules vides/assignées, badge cyclique, localStorage largeur, panneau latéral, callbacks, compteur X/N, aperçu mensuel, charge par MACC |
| `WeekTaskAllocation.test.tsx` | 20 tests — états loading/vide, mapping données, `handleYearChange`, menu résidents, assignation, retrait, collision inter-postes, dialog import, résilience erreur API |

---

## PWA — Progressive Web App

**Score Lighthouse estimé : 92/100** (2026-04-04)

### Fichiers clés

| Fichier | Rôle |
|---------|------|
| `frontend/index.html` | Meta tags PWA (mobile-web-app-capable, apple, theme-color, manifest) |
| `frontend/vite.config.js` VitePWA | Config Service Worker (autoUpdate, Workbox, devOptions, manifest, screenshots) |
| `frontend/src/service-worker.js` | SW custom : precache + StaleWhileRevalidate images + App Shell |
| `frontend/src/hooks/usePwaUpdate.ts` | Détecte les mises à jour SW, affiche un toast cliquable |
| `frontend/src/components/small/InstallPrompt.tsx` | Bouton "Installer" dans la Topbar (capte `beforeinstallprompt`) |
| `frontend/src/components/YearSelect.tsx` | **Composant réutilisable** — Sélecteur d'année avec recherche, tri du plus récent au plus ancien. Voir JSDoc dans le fichier. |
| `frontend/public/manifest.json` | Manifest complet (lang, scope, icons any+maskable, screenshots, shortcuts) |
| `frontend/public/logo-maskable-512.png` | Icône maskable 512×512 (logo centré sur fond `#9155FD`, 20% padding) |
| `frontend/public/screenshot-narrow.png` | Capture mobile 540×720 (Lighthouse form_factor: narrow) |
| `frontend/public/screenshot-wide.png` | Capture desktop 1280×720 (Lighthouse form_factor: wide) |

---

## Composants réutilisables frontend (session 22)

### `YearSelect` — Sélecteur d'année avec recherche

**Fichier :** `frontend/src/components/YearSelect.tsx`

Composant MUI `Select` enrichi pour choisir une année parmi la liste fournie.

**Fonctionnalités :**
- Tri automatique du plus récent au plus ancien (`dateOfStart DESC`)
- Champ de recherche intégré dans le dropdown (filtre par titre, période, lieu)
- Prop `disabledYearIds` pour marquer des années comme "déjà attribuées"
- Entièrement contrôlé (`value` + `onChange`)

**Usage :**
```tsx
import YearSelect from "@/components/YearSelect";

<YearSelect
  years={allYears}           // HospitalYear[] depuis hospitalAdminApi.listMyYears()
  value={selectedId}         // number | ""
  onChange={(id) => setId(id)}
  label="Année académique"
  required
  disabledYearIds={new Set([1, 3])}  // optionnel
/>
```

**Exports nommés :**
- `sortYearsNewestFirst(years)` — tri seul (pour réutilisation hors composant)

**Utilisé dans :** `HospitalAdminManagersPage` (dialog "Ajouter un manager"), `HospitalAdminResidentsPage` (filtre d'année dans la toolbar), `HospitalAdminExportsPage` (sélecteur d'année dans la toolbar commune), `WeekTaskAllocation` (slot `yearSelector` dans `WeekScheduleTable`)

### Fonctionnement

```
Production build
    │ vite build → Workbox génère sw.js + registerSW.js
    ▼
Navigateur charge l'app
    │ registerSW.js enregistre /sw.js (scope /)
    ▼
Service Worker actif
    │ Precache : tous les assets JS/CSS/HTML/images
    │ Runtime : images PNG → StaleWhileRevalidate (max 50 entrées)
    │ Navigation → App Shell (index.html)
    ▼
beforeinstallprompt détecté
    │ InstallPrompt affiche le bouton "Installer" dans la Topbar
    ▼
Mise à jour disponible
    │ usePwaUpdate → toast "Nouvelle version disponible"
    │ Clic sur le toast → updateServiceWorker(true) → rechargement
```

### Critères Lighthouse satisfaits

| Critère | Statut |
|---------|--------|
| HTTPS obligatoire (prod) | ✅ `.htaccess` |
| Service Worker enregistré | ✅ `registerType: autoUpdate` |
| Manifest valide | ✅ Tous les champs requis |
| Icônes 192px + 512px | ✅ |
| Icône maskable dédiée | ✅ `logo-maskable-512.png` |
| Screenshots avec form_factor | ✅ narrow + wide |
| `beforeinstallprompt` géré | ✅ `InstallPrompt.tsx` |
| Notifications de mise à jour | ✅ `usePwaUpdate.ts` |
| devOptions activé (test dev) | ✅ `vite.config.js` |

*Document créé le 2026-03-20 — Dernière mise à jour : 2026-05-13 (Phases 1–5 UserSettings)*

---

## Staff Planner RH — Système Enterprise V2 (2026-05-11)

### Architecture générale

Le module Staff Planner V2 est un système enterprise d'audit et de contrôle RH ajouté en 6 phases sur `StaffPlannerExportStatus`.

```
YearsResident × mois
        │
        ▼
StaffPlannerExportStatus     ← Phase 1 : dirty flag + SHA-256 fingerprint
        │                    ← Phase 5 : lock RH (locked, lockedAt, lockReason…)
        │
        ├──► StaffPlannerExportBatch         ← Phase 2 : snapshot immuable par export
        │          └──► StaffPlannerExportItemSnapshot (payloadLines MEDIUMTEXT)
        │
        └──► StaffPlannerAuditEvent          ← Phase 5/6 : audit trail append-only
```

### Services StaffPlanner

| Service | Responsabilité |
|---------|----------------|
| `StaffPlannerMonthsService` | Grille mensuelle RH : tous les MACCS × mois avec leur statut |
| `GenerateStaffPlannerExport` | Génère le fichier `.txt` Staff Planner + `buildLines()` public |
| `ExportBatchService` | Crée le `StaffPlannerExportBatch` + snapshots en transaction atomique |
| `FingerprintService` | Calcule le SHA-256 des données d'un MACCS × mois (fingerprint O(1)) |
| `ExportDirtyNotifier` | Notifie les changements de données pour le dirty flag |
| `LockGuardService` | Garde centralisée contre les modifications sur périodes verrouillées |
| `StaffPlannerLineParser` | Parse les lignes `AS=|…|` du fichier txt (diff viewer) |
| `ExportDiffService` | Compare deux batches : fingerprint O(1) puis diff ligne si différent |
| `AuditService` | Crée les `StaffPlannerAuditEvent` pour chaque action métier |

### Phase 1 V2 — Dirty flag + Fingerprint

`StaffPlannerExportStatus` enrichi avec :
- `dirtySinceExport` (bool) : true si les données ont changé depuis le dernier export
- `dirtyAt` / `dirtyReason` : horodatage et motif de la modification
- `dataFingerprint` (SHA-256 64 chars) : empreinte des données au dernier export
- `fingerprintComputedAt`

`ExportDirtySubscriber` (Doctrine postFlush) écoute les changements sur `Timesheet`, `Garde`, `Absence`, `ResidentValidation` → marque le statut dirty. Les items **lockés** sont ignorés (Phase 5).

Badge "Modifié" dans la page Exports RH signale les items à ré-exporter.

### Phase 2 — Export Batch immuable

Chaque export génère un `StaffPlannerExportBatch` + N `StaffPlannerExportItemSnapshot` (append-only, jamais modifiés). Garantit la traçabilité légale.

`ExportBatchService::recordBatch()` exécute tout en une seule transaction.

### Phase 3 — Historique RH

Endpoints lecture seule :
| Route | Description |
|-------|-------------|
| `GET /api/hospital-admin/years/{yearId}/export-batches` | Liste paginée des batches (filtres : batchNumber, generatedByType, from, to) |
| `GET /api/hospital-admin/export-batches/{batchId}` | Détail d'un batch |
| `GET /api/hospital-admin/export-batches/{batchId}/snapshots` | Liste snapshots (sans payloadLines) |
| `GET /api/hospital-admin/export-snapshots/{snapshotId}` | Détail snapshot avec payloadLines |

### Phase 4 — Diff Viewer

Compare deux batches ligne par ligne (format `AS=|…|`). L'algorithme compare d'abord les SHA-256 (O(1)) puis parse les lignes seulement si les fingerprints diffèrent.

| Route | Description |
|-------|-------------|
| `GET /api/hospital-admin/years/{yearId}/compare-candidates` | Liste les batches comparables |
| `GET /api/hospital-admin/export-batches/{a}/diff/{b}` | Diff entre batch A et B |

### Phase 5 — Lock RH / Clôture officielle

`LockController` — `PATCH /api/hospital-admin/staff-planner-items/{yrId}/{month}/{calYear}/lock`
- Raison obligatoire pour verrouiller
- Accès : `HospitalAdmin`, `AppAdmin`, `Manager` RH uniquement
- Crée un `StaffPlannerAuditEvent` (`rh_lock_applied` ou `rh_lock_removed`)

`LockGuardService` injecté via **method injection** dans tous les controllers d'écriture :
- `TimesheetsResidentAPIController` : addRecord, update, delete
- `GardesResidentAPIController` : addRecord, delete
- `AbsencesResidentAPIController` : addRecord, delete
- `UpdateMonthValidation` : validation MDS
- `ValidationController` : catch `PeriodLockedException` → HTTP 422

Exception : `PeriodLockedException extends \DomainException` → HTTP 422 avec message explicite.

### Phase 6 — Audit Timeline RH

`AuditService` — 12 méthodes explicites, une par event type. Chaque appel fait `em->persist(event) + em->flush()` indépendamment.

14 event types catalogués :

| Event | Déclenché par |
|-------|--------------|
| `export_generated` | `StaffPlannerAPIController::createTxtFile()` |
| `timesheet_created` / `modified` / `deleted` | `TimesheetsResidentAPIController` |
| `garde_created` / `deleted` | `GardesResidentAPIController` |
| `absence_created` / `deleted` | `AbsencesResidentAPIController` |
| `validation_accepted` / `rejected` | `UpdateMonthValidation` |
| `validation_blocked_by_lock` | `ValidationController` (catch PeriodLockedException) |
| `blocked_modification_attempt` | Chaque controller (catch PeriodLockedException) |
| `rh_lock_applied` / `rh_lock_removed` | `LockController` |

**Endpoints timeline :**

| Route | Description |
|-------|-------------|
| `GET /api/hospital-admin/years/{yearId}/audit-events` | Timeline globale paginée (filtres : eventType, actorType, month, calendarYear, yearResidentId, batchId, from, to) |
| `GET /api/hospital-admin/staff-planner-items/{yrId}/audit` | Historique complet d'un MACCS |
| `GET /api/hospital-admin/export-batches/{batchId}/audit` | Audit events liés à un export |

**Page frontend** : `/hospital-admin/audit-timeline` (`HospitalAdminAuditTimelinePage`)
- Chips colorés par type d'événement
- Context JSON expandable
- Filtres actifs avec chips de suppression
- Pagination avec sélecteur de limite

### Performance & Scalabilité

- Toutes les requêtes de liste sont paginées backend (jamais de SELECT *)
- `StaffPlannerAuditEvent` : 7 indices (maccs+date, type+date, date, year+date, acteur, période, batch)
- `StaffPlannerExportBatch` : contrainte unique `(year_id, batch_number)` + `SELECT COALESCE(MAX(batch_number), 0)+1` pour éviter les races
- Diff viewer : fingerprint O(1) — les lignes ne sont parsées que si les fingerprints diffèrent
- Rétention long terme : events orphelins (MACCS supprimé) conservés via `SET NULL` sur la FK

### Sécurité des endpoints Staff Planner

Tous les endpoints `/api/hospital-admin/…` utilisent le même `canAccessYear()` :
- `AppAdmin` → accès global
- `HospitalAdmin` → scoped à son hôpital
- `Manager` avec `adminHospital` → scoped à l'hôpital administré
- `Manager` avec `job=HumanResources` → scoped via `getHospitals()`
- Tout autre rôle → HTTP 403

---

## Workflow Staff Planner RH (2026-05-06)

### Concept

Le Staff Planner est un outil RH tiers qui consomme un fichier `.txt` structuré décrivant les horaires mensuels des résidents. Medatwork génère ce fichier à la demande, mois par mois.

### Entités impliquées

```
Years ──── PeriodValidation ──── ResidentValidation
 │           (month, yearNb,         (resident FK,
 │            validated=MDS)          validated=résident)
 │
 └──── StaffPlannerMonthStatus
        (month, calendarYear, treated, treatedBy, downloadCount)
```

### Endpoints

| Méthode | URL | Accès | Rôle |
|---|---|---|---|
| `GET` | `/api/hospital-admin/years/{yearId}/staff-planner-months` | ROLE_MANAGER* | Lister les mois + statut |
| `PATCH` | `/api/hospital-admin/years/{yearId}/staff-planner-months/{month}/{calYear}` | ROLE_MANAGER* | Mettre à jour traité |
| `POST` | `/api/managers/SPImport` | ROLE_MANAGER | Générer le fichier .txt |

*Le chemin `/api/hospital-admin/years/.../staff-planner-months` est accessible `ROLE_MANAGER` (pas seulement `ROLE_HOSPITAL_ADMIN`) grâce à une rule spécifique dans `security.yaml`. Le contrôleur enforce le job check pour les managers RH.

### Accès

| Utilisateur | Accès |
|---|---|
| `AppAdmin` (ROLE_SUPER_ADMIN) | ✅ via admin |
| `HospitalAdmin` entité | ✅ |
| `Manager` avec `adminHospital` | ✅ |
| `Manager` avec `job=human_resources` | ✅ vérification dans contrôleur + `$user->getHospitals()` |
| `Manager` avec autre job | ❌ 403 |
| `Resident` | ❌ 401/403 |

### JWT — champ `job`

Le champ `job` est exposé dans le JWT pour les `Manager` uniquement (valeur de l'enum `ManagerJob`). Géré dans `AuthenticationSuccessListener::onAuthenticationSuccess()`.

### Flux complet

```
1. Frontend charge GET /staff-planner-months → reçoit mois + residentValidationIds
2. Utilisateur coche les mois à exporter
3. Frontend appelle POST /managers/SPImport avec periodsId = residentValidationIds des mois cochés
4. Backend génère le fichier .txt (GenerateStaffPlannerExport)
5. Backend appelle StaffPlannerMonthsService::markMonthsAsTreatedAfterGeneration()
   → crée/met à jour StaffPlannerMonthStatus pour chaque mois couvert
6. Frontend invalide le cache React Query → mois passent en "traité"
7. Utilisateur peut aussi basculer le statut manuellement via PATCH
```


---

## Profil utilisateur — Mon compte et Préférences (2026-05-14)

> Documentation complète :
> - Compte (identité, mot de passe) → [docs/PROFILE_ACCOUNT.md](./PROFILE_ACCOUNT.md)
> - Préférences (UI, thème, calendrier) → [docs/USER_SETTINGS.md](./USER_SETTINGS.md)

### Distinction des deux modules

| | Mon compte `/profile/account` | Préférences `/profile/settings` |
|---|---|---|
| Objet | Identité, mot de passe, données métier | Comportement interface |
| Persistance | Entités Doctrine (Manager, Resident…) | `UserSetting` JSON par utilisateur |
| Sauvegarde | Bouton explicite | Auto-save à chaque toggle |
| Sécurité | Vérification mot de passe actuel avant changement | Whitelist stricte + limite 4 Ko |

### Mon compte — endpoints

| Route | Rôle |
|---|---|
| `GET /api/profile/account` | Profil de l'utilisateur (champs rôle-dépendants, jamais password/token/roles) |
| `PATCH /api/profile/account` | Mise à jour prénom/nom + champs spécifiques au rôle |
| `PATCH /api/profile/password` | Changement de mot de passe (vérifie mot de passe actuel, min 8 chars) |

Champs modifiables : Manager (+sexe, +job), Resident (+sexe, +speciality, +university, +dateOfMaster), HospitalAdmin (+rien de plus), AppAdmin (+rien de plus). Email toujours en lecture seule.

### Paramètres — voir section dédiée ci-dessous

## Système de Paramètres Utilisateur (2026-05-13)

> Documentation complète : [docs/USER_SETTINGS.md](./USER_SETTINGS.md)

Préférences par utilisateur persistées en JSON côté serveur, synchronisées via React Query et appliquées via des stores Zustand réactifs.

### Entité & endpoint

`UserSetting` — une ligne par utilisateur (`user_type` + `user_id`), champ `settings` en JSON, merge récursif avec les defaults à chaque lecture.

| Route | Description |
|---|---|
| `GET /api/user/settings` | Préférences mergées avec les defaults — accessible à tous les rôles JWT |
| `PATCH /api/user/settings` | Mise à jour partielle — body limité à 4 Ko, clés whitelistées, types validés |

Side effect : patcher `notifications.compliance` pour un manager synchronise aussi `Manager.receiveComplianceEmails` dans la même transaction.

### Stores frontend

| Store | Clé localStorage | Piloté par |
|---|---|---|
| `themeStore` | `medatwork:theme` | `ThemeProvider` dynamique dans `App.tsx` |
| `sidebarStore` | `medatwork:sidebar-collapsed` | `WithFixedSidebar` + `Sidebar` (mini-drawer 64 px) |

Les deux stores écoutent `window.addEventListener("storage")` pour la **synchronisation cross-tab** (autre onglet → même store mis à jour sans rechargement).

À chaque fetch réussi, les valeurs serveur écrasent localStorage (**le serveur gagne**).

### Mini-drawer

La sidebar desktop a deux états : 256 px (texte + icônes) et 64 px (icônes seules avec `Tooltip placement="right"`). Chaque entrée de `sidebarNavData.tsx` **doit avoir une icône SVG** — condition nécessaire au mode mini.

---

## Semaines modèles — Week Creator (2026-05-07)

Page `/manager/week-creator` — refonte complète du planificateur de semaine type.

### Architecture frontend

```
WeekCreatorPage/
├── TimePlannerPage.tsx             # Wrapper lazy (point d'entrée du router)
└── components/planner/
    ├── types.ts                    # Interfaces + utilitaires partagés
    ├── WeekPlannerApp.tsx           # Composant racine : état, API calls, layout
    ├── TopBar.tsx                  # Titre + sélecteur de modèles + sync status + tutoriel
    ├── TimeRuler.tsx               # Règle horaire sticky top, drag-to-scroll
    ├── DayRow.tsx                  # Ligne de jour : création/déplacement/resize de créneaux
    ├── WeekTotals.tsx              # Décompte des heures (barre de progression)
    ├── DescriptionEditor.tsx       # Éditeur de description du créneau sélectionné
    ├── DayPickerModal.tsx          # Sélecteur de jours cibles (copier/appliquer)
    └── planner.test.tsx            # Tests unitaires (Vitest + RTL)
```

### Layout CSS

```
root (flex column, height: calc(100vh - 64px))
├── topArea — TopBar (fixe en haut)
└── mainLayout (CSS grid: minmax(0,1fr) | 300px)
    ├── plannerCard (min-width:0, overflow:hidden, carte blanche)
    │   └── timelineScroll (overflow-x:auto — scroll horizontal uniquement ici)
    │       └── timelineContent (min-width: 1100px)
    │           ├── TimeRuler (sticky top:0 ; spacer sticky left:0)
    │           └── DayRow × n (label sticky left:0, 180px)
    └── sidePanel (300px fixe, jamais écrasé par la grille)
        ├── WeekTotals
        └── DescriptionEditor
```

**Clé CSS** : `min-width: 0` sur la colonne gauche du grid est indispensable — sans ça, le contenu force le débordement sous l'inspecteur.

### Modèle de données local vs serveur

| Champ serveur (`WeekTask`) | Stockage | Usage |
|---|---|---|
| `title` | `slot.name` | Nom du créneau |
| `description` | `"color\|description text"` | Couleur + description (séparateur `\|`) |
| `dayOfWeek` (1–7) | `slot.start` + day key | Lundi=1, Dimanche=7 |
| `startTime` ("H:i") | `slot.start` (heures décimales) | 8.5 = 08:30 |
| `endTime` ("H:i") | `slot.end` (heures décimales) | |

Format `description` : `"violet|Poste de nuit"` → couleur=violet, description="Poste de nuit". Rétrocompatible avec l'ancien format (juste la couleur sans `|`).

### Auto-save

Toutes les mutations sont synchronisées immédiatement :
- **Ajout de créneau** → `POST managers/weekTask/create`
- **Suppression** → `DELETE managers/weekTask/{id}`
- **Déplacement / resize / description** → `PUT managers/weekTask/{id}` avec **debounce 500ms** (évite les appels pendant le drag)
- **Renommage de modèle** → `PUT managers/weekTemplate/{id}` (optimiste)
- **Duplication de modèle** → optimiste (ID temporaire négatif), puis `POST managers/weekTemplate/{id}/copy` + rename, rollback si erreur

### Naming automatique des copies

Format : `"Nom - Copie"`, `"Nom - Copie 2"`, etc. Le suffixe ` - Copie N` est retiré de la base avant de chercher le prochain nom disponible.

### Tests (`planner.test.tsx`)

| Suite | Ce qui est testé |
|---|---|
| `timeStrToDecimal` | Conversion "H:i" → nombre décimal |
| `decimalToTimeStr` | Inverse |
| `fmtHM` / `fmtDuration` | Formatage d'affichage |
| `isValidColor` | Validation des couleurs |
| `serverToLocal` | Parsing `color\|description`, tri par heure, fallback couleur |
| `WeekTotals` | Affichage "—" sans créneaux, total correct avec créneaux |
| `DescriptionEditor` | État vide, affichage avec slot, appel `onChange` |
