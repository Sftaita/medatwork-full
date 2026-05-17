# Système de Paramètres Utilisateur — UserSettings

**Implémenté :** 2026-05-13 (Phases 1–5)

---

## Vue d'ensemble

Les préférences utilisateur sont persistées côté serveur dans une entité `UserSetting` (JSON flexible), synchronisées dans le frontend via **React Query** + **Zustand**, et appliquées immédiatement à l'interface via des stores réactifs.

Règle fondamentale : **le serveur gagne toujours.** À chaque chargement, la valeur serveur écrase la valeur localStorage.

> **À ne pas confondre avec Mon compte** (`/profile/account`) qui gère l'identité (prénom, nom, mot de passe, champs métier). Les préférences concernent uniquement le comportement de l'interface. Voir [PROFILE_ACCOUNT.md](./PROFILE_ACCOUNT.md).

---

## Backend

### Entité `UserSetting`

```
src/Entity/UserSetting.php
src/Repository/UserSettingRepository.php
```

| Champ | Type SQL | Description |
|---|---|---|
| `id` | bigint PK | Auto-increment |
| `user_type` | varchar(30) | `'resident'` \| `'manager'` \| `'hospital_admin'` \| `'app_admin'` |
| `user_id` | int | ID de l'utilisateur dans son entité propre |
| `settings` | JSON | Blob de préférences (structure libre, mergée avec les defaults) |
| `updated_at` | datetime | Horodatage de la dernière modification |

**Contrainte unique :** `(user_type, user_id)` — une ligne par utilisateur, quel que soit son rôle. Évite la collision entre `Manager.id=1` et `Resident.id=1`.

`userId` est résolu depuis le token JWT via `$this->getUser()->getId()` — il n'est jamais transmis par le client.

### Endpoints

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/user/settings` | Tout rôle JWT | Retourne les settings mergés avec les defaults |
| `PATCH` | `/api/user/settings` | Tout rôle JWT | Mise à jour partielle |

**Réponse type :**
```json
{
  "userType": "manager",
  "settings": {
    "theme": "dark",
    "language": "fr",
    "calendar": { "defaultView": "month", "lastUsedView": "week", "showWeekends": true },
    "notifications": { "email": true, "compliance": true, ... },
    "ui": { "sidebarCollapsed": false },
    "tables": { "staffPlanner": { "pageSize": 25, "dense": false } }
  }
}
```

### Defaults backend (`UserSettingService::getDefaults()`)

```
src/Services/UserSettingService.php
```

| Clé | Valeur par défaut |
|---|---|
| `theme` | `"light"` |
| `language` | `"fr"` |
| `calendar.defaultView` | `"month"` |
| `calendar.lastUsedView` | `null` |
| `calendar.showWeekends` | `true` |
| `notifications.email` | `true` |
| `notifications.push` | `true` |
| `notifications.compliance` | `true` |
| `notifications.dailySummary` | `false` |
| `notifications.validation` | `true` |
| `notifications.planning` | `true` |
| `notifications.staffPlanner` | `true` |
| `ui.sidebarCollapsed` | `false` |
| `tables.staffPlanner.pageSize` | `25` |
| `tables.staffPlanner.dense` | `false` |

### Stratégie de merge JSON

Le GET utilise `array_replace_recursive(defaults, stored)` — les clés non stockées prennent leur valeur par défaut. Cela garantit qu'un nouveau setting apparaît automatiquement sans migration de données pour les utilisateurs existants.

Le PATCH utilise `array_replace_recursive(stored, patch)` — seules les clés fournies sont écrasées ; les autres sont conservées.

### Sécurité du PATCH

```
src/DTO/UserSettingPatchInputDTO.php
```

| Garde | Description |
|---|---|
| Taille body | Max 4 096 octets |
| Clés top-level | Whitelist stricte : `theme`, `language`, `calendar`, `notifications`, `ui`, `tables` |
| Clés inconnues | Rejetées avec HTTP 400 + message explicite |
| Types | Chaque champ est typé et validé (enum, bool, int whitelist) |
| Sous-clés inconnues | Ignorées silencieusement (pas d'injection possible) |
| `tables.staffPlanner.pageSize` | Whitelist `[25, 50, 100, 200]` — pas de valeur arbitraire |

### Side effect — `notifications.compliance`

Quand un **manager** patche `notifications.compliance`, `UserSettingService.patchForUser()` synchronise également `Manager.receiveComplianceEmails` dans la même transaction (un seul flush).

```
Patch notifications.compliance → UserSetting.settings (JSON)
                               + Manager.receiveComplianceEmails (bool)
```

Les autres champs de notifications sont stockés uniquement — aucun service email n'est actuellement branché sur `validation`, `planning`, `staffPlanner`, `dailySummary`.

---

## Frontend

### Architecture globale

```
settingsApi.ts          ← appels HTTP GET/PATCH /api/user/settings
useUserSettings.ts      ← React Query : cache, optimistic update, sync stores
ProfileSettingsPage.tsx ← UI des préférences utilisateur (/profile/settings)

themeStore.ts           ← Zustand : mode clair/sombre + cross-tab sync
sidebarStore.ts         ← Zustand : collapsed/expanded + cross-tab sync
```

### React Query (`useUserSettings.ts`)

**`useUserSettings()`**
- `queryKey: ["user-settings"]`
- `staleTime: 10 min` — les préférences changent rarement
- `placeholderData: DEFAULT_SETTINGS` — l'UI s'affiche sans délai réseau
- `retry: 1`
- `meta.suppressErrorToast: true` — pas de toast si le réseau est absent

À la résolution du fetch, synchro immédiate vers les stores :
```
res.settings.theme              → themeStore.setMode()
res.settings.ui.sidebarCollapsed → sidebarStore.setCollapsed()
```

**`useUpdateSettings()`**
- Optimistic update : cache React Query + stores mis à jour avant la réponse serveur
- `onError` : rollback du cache ET des stores
- `onSuccess` : confirmation depuis la réponse serveur (corrige toute divergence)

### Stores Zustand

#### `themeStore` (`src/store/themeStore.ts`)

| Action | Effet |
|---|---|
| Initialisation | Lit `localStorage["medatwork:theme"]` (sync, évite le FOUC) |
| `setMode(mode)` | Écrit dans localStorage + met à jour le store |
| Fetch settings (success) | `setMode(server.theme)` — le serveur gagne |
| Cross-tab | `window.addEventListener("storage")` sur la clé `medatwork:theme` |

Le store alimente le `ThemeProvider` dynamique dans `App.tsx` (inner override du provider statique dans `index.tsx`).

#### `sidebarStore` (`src/store/sidebarStore.ts`)

| Action | Effet |
|---|---|
| Initialisation | Lit `localStorage["medatwork:sidebar-collapsed"]` |
| `setCollapsed(bool)` | Écrit dans localStorage + met à jour le store |
| `toggle()` | Inverse la valeur + localStorage |
| Fetch settings (success) | `setCollapsed(server.ui.sidebarCollapsed)` — le serveur gagne |
| PATCH `ui.sidebarCollapsed` | `onMutate` → optimistic ; `onError` → rollback |
| Cross-tab | `window.addEventListener("storage")` sur la clé `medatwork:sidebar-collapsed` |

**Note :** Le bouton toggle de la `Topbar` (desktop uniquement) appelle `sidebarStore.toggle()` qui met à jour localStorage et le store. Il ne déclenche pas de PATCH server — la persistance server vient du prochain chargement (login sur un autre appareil). Pour persister immédiatement sur le serveur depuis la Topbar, utiliser `useUpdateSettings().mutate({ ui: { sidebarCollapsed: !collapsed } })`.

### Cross-tab sync

Les deux stores écoutent l'événement `storage` de `window` :

- Un onglet appelle `setMode("dark")` → écrit `localStorage["medatwork:theme"] = "dark"`
- L'autre onglet reçoit l'événement `storage` → le store met à jour son état en mémoire
- Le `ThemeProvider` / la sidebar de l'autre onglet se met à jour sans rechargement

### Mini-drawer sidebar

La sidebar desktop a deux états :

| État | Largeur | Comportement |
|---|---|---|
| Expanded | 256 px | Navigation complète avec textes |
| Collapsed (mini) | 64 px | Icônes seules centrées, `Tooltip(placement="right")` sur chaque item |

`WithFixedSidebar.tsx` ajuste le `paddingLeft` du contenu en conséquence (avec transition CSS).

`SidebarNav.tsx` bascule entre deux renders selon la prop `collapsed` :
- **Expanded** : groupes avec titres, `Button` startIcon + texte
- **Mini** : liste plate d'`IconButton`, pas de titres de groupes, `aria-label` = titre de l'item

Chaque item de `sidebarNavData.tsx` possède une icône SVG obligatoire (20×20, stroke uniform), nécessaire pour le mode mini.

### `calendar.lastUsedView`

La vue calendrier utilisée en dernier est persistée automatiquement.

Implémenté dans `CalendarView.tsx` via le callback `datesSet` de FullCalendar :

- Un `useRef` (`lastSavedViewRef`) est initialisé à la vue résolue au montage, évitant le PATCH initial et les race conditions de closure
- Le PATCH est déclenché uniquement si la vue change réellement
- Priorité de résolution : `lastUsedView` → `defaultView` → `"month"`

Mapping FullCalendar ↔ application :

| App | FullCalendar |
|---|---|
| `"month"` | `"dayGridMonth"` |
| `"week"` | `"timeGridWeek"` |
| `"day"` | `"timeGridDay"` |
| `"list"` | `"listWeek"` |

---

## Guide développeur — Ajouter un nouveau setting

### 1. Backend — Default

Dans `UserSettingService::getDefaults()` :

```php
// Ajouter dans le tableau retourné :
'maSection' => [
    'monChamp' => false,   // valeur par défaut
],
```

Aucune migration nécessaire — `array_replace_recursive` gère les clés absentes pour les utilisateurs existants.

### 2. Backend — DTO validation

Dans `UserSettingPatchInputDTO::fromRequest()` :

1. Si c'est une **nouvelle section top-level** : l'ajouter à `$knownTopKeys`
2. Ajouter un bloc de validation :

```php
if (array_key_exists('maSection', $data)) {
    if (! is_array($data['maSection'])) {
        throw new \InvalidArgumentException('maSection doit être un objet');
    }
    $section = [];
    if (array_key_exists('monChamp', $data['maSection'])) {
        if (! is_bool($data['maSection']['monChamp'])) {
            throw new \InvalidArgumentException('maSection.monChamp doit être un booléen');
        }
        $section['monChamp'] = $data['maSection']['monChamp'];
    }
    if (! empty($section)) {
        $patch['maSection'] = $section;
    }
}
```

Ajouter un test dans `tests/Unit/DTO/UserSettingPatchInputDTOTest.php`.

### 3. Frontend — Types

Dans `src/services/settingsApi.ts` :

```ts
// Ajouter l'interface de la section
export interface MaSectionSettings {
  monChamp: boolean;
}

// Ajouter dans UserSettings
maSection: MaSectionSettings;

// Ajouter dans UserSettingsPatch
maSection?: Partial<MaSectionSettings>;
```

### 4. Frontend — Default

Dans `src/hooks/useUserSettings.ts`, ajouter à `DEFAULT_SETTINGS` :

```ts
maSection: {
  monChamp: false,
},
```

Et dans `onMutate`, étendre le spread de l'update optimiste :

```ts
maSection: { ...old.maSection, ...patch.maSection },
```

### 5. Frontend — UI (ProfileSettingsPage)

Dans `src/pages/Profile/ProfileSettingsPage.tsx`, ajouter une `<Section>` ou un `<SettingRow>` dans la section appropriée.

Si le setting nécessite un effet immédiat dans un store (comme `theme` → `themeStore` ou `sidebarCollapsed` → `sidebarStore`), ajouter la synchro dans `useUserSettings.ts` : `queryFn`, `onMutate`, `onError`, `onSuccess`.

### 6. Tests à ajouter

| Fichier | Ce qui doit être testé |
|---|---|
| `UserSettingPatchInputDTOTest.php` | Valeur valide, type invalide, rejet clé inconnue |
| `UserSettingServiceTest.php` | Présence dans `getDefaults()`, merge correct |
| `useUserSettings.test.ts` | Nouveau champ dans `DEFAULT_SETTINGS`, sync store si applicable |
| `ProfileSettingsPage.test.tsx` | Rendu du nouveau contrôle, appel de `patch()` correct |

---

## Couverture de tests actuelle

| Fichier | Tests | Couverture clé |
|---|---|---|
| `tests/Unit/DTO/UserSettingPatchInputDTOTest.php` | 28 | Sécurité body, whitelist clés, types, nouveaux champs |
| `tests/Unit/Services/UserSettingServiceTest.php` | 12 | Defaults, merge, compliance sync |
| `src/store/themeStore.test.ts` | 9 | Initial state, setMode, cross-tab sync |
| `src/store/sidebarStore.test.ts` | 8 | toggle, setCollapsed, persistence localStorage |
| `src/hooks/useUserSettings.test.ts` | 15 | Fetch, sync theme + sidebar, optimistic, rollback |
| `src/pages/Profile/ProfileSettingsPage.test.tsx` | 14 | Sections, switches, save indicator |
| `src/components/layout/.../SidebarNav.test.tsx` | 24 | Data integrity, rôles, expanded vs mini |

---

## Limites connues

| Limite | Raison |
|---|---|
| `notifications.*` (sauf `compliance`) non branchés en email | Aucun service email ne consomme ces flags actuellement |
| Sidebar toggle Topbar ne PATCH pas le serveur immédiatement | Choix de performance — la synchro se fait au prochain chargement |
| Mini-drawer sans icônes sur items futurs | Tout nouvel item dans `sidebarNavData` **doit** avoir une icône SVG |
| `tables.staffPlanner.dense` non relié au store global | `useTableDensity` est la source de vérité globale ; `dense` est stocké mais non appliqué |
| Onglet Excel seulement paginé (pas l'onglet Staff Planner accordéon) | La structure accordéon par mois n'est pas compatible avec une pagination standard |
