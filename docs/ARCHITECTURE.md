# Architecture — Medatwork

**Dernière mise à jour :** 2026-04-15 (session 17)

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
    │   └── notificationsStore.ts   # count + notifications + commUnreadCount
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
| `ManagerRoute` | `role === "manager"` | `/manager/*` |
| `HospitalAdminRoute` | `role === "hospital_admin"` ou `role === "manager" && hospitalName` | `/hospital-admin/*` **+ `/manager/year-detail` + `/manager/calendar` + `/manager/week-dispatcher` + `/manager/week-creator`** |
| `ResidentRoute` | `role === "resident"` | `/resident/*` |
| `SuperAdminRoute` | `role === "super_admin"` | `/admin/*` |

> `/manager/year-detail` est déclaré dans les deux blocs (`ManagerRoute` et `HospitalAdminRoute`) car les hospital-admins naviguent vers cette page depuis leur dashboard.

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
└── WeekCreator (flexbox column, height: 82vh)
    ├── TopBar                     ← chips templates + progression heures
    └── [flex row]
        ├── AddBloc (28%)          ← formulaire ajout/édition tâche
        └── TimelineBloc (72%)     ← sélecteur jour + timeline visuelle
```

La colonne droite `TimeSummaryBloc` (cercle heures + barres par jour) a été **supprimée** — les statistiques sont affichées directement dans la `TopBar`.

#### TopBar

- **Chips** : un chip par template, couleur personnalisée, scroll horizontal invisible si trop nombreux — le compteur d'heures reste toujours visible à droite (`flexShrink: 0`)
- **Icône ✏️** : s'affiche sur le chip sélectionné → ouvre le drawer `UpdateWeekTemplate`
- **Bouton `+`** : ouvre le drawer `CreateWeekForm`
- **Barre de progression** : `{X}h / 72h` avec `LinearProgress`, rouge si ≥ 100 %

#### TimelineBloc

- Day selector **sticky** (reste visible au scroll de la timeline)
- Drag & drop natif HTML5 (`draggable` / `onDragStart` / `onDrop`) — `DRAG_TASK_KEY = "application/week-task-id"` partagé avec `VisualTimeline`
- Optimistic update + revert sur erreur pour les déplacements de tâche entre jours

#### VisualTimeline

Timeline positionnée absolument, 06:00–23:00, `PX_PER_MIN = 1.2` (1 224 px total). Les `TaskBlock` sont `draggable`, cliquables pour ouvrir le formulaire d'édition.

#### WeekTaskForm

- `AdapterDayjs` (plus `AdapterMoment`) — compatible avec l'environnement Docker
- `serverError` state : affiche un `<Alert severity="error">` sur erreur 400 backend
- Submit désactivé si `title.trim() === ""`

#### Tests (16/16 passing — Vitest)

| Fichier | Tests |
|---------|-------|
| `VisualTimeline.test.tsx` | État vide, affichage titres, positionnement px |
| `WeekTaskForm.test.tsx` | Submit disabled/enabled, alert erreur serveur, annuler reset |
| `WeekTemplatesList.test.tsx` | Titres, variant contained, barres couleur, clic handler |
| `HoursCircle.test.tsx` | Label présent, cap à 100 % pour 80h |
| `TimeSummaryBloc.test.tsx` | 7 jours, dayOfWeek string, hors plage ignoré |

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
| `frontend/public/manifest.json` | Manifest complet (lang, scope, icons any+maskable, screenshots, shortcuts) |
| `frontend/public/logo-maskable-512.png` | Icône maskable 512×512 (logo centré sur fond `#9155FD`, 20% padding) |
| `frontend/public/screenshot-narrow.png` | Capture mobile 540×720 (Lighthouse form_factor: narrow) |
| `frontend/public/screenshot-wide.png` | Capture desktop 1280×720 (Lighthouse form_factor: wide) |

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

*Document créé le 2026-03-20 — Dernière mise à jour : 2026-04-15 (session 17)*
