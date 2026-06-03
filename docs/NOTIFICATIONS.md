# Système de Notifications — Medatwork

**Créé le :** 2026-06-04  
**Sprint de référence :** P0 → P2-C

---

## Vue d'ensemble

Medatwork dispose de deux canaux de notification distincts :

| Canal | Entité | Destinataires | Polling |
|---|---|---|---|
| **Notifications in-app legacy** | `NotificationManager` / `NotificationResident` | Managers, Résidents | 30s via `useNotifications` |
| **Messages de communication** | `CommunicationMessage` | Tous rôles, ciblables | 30s via `useCommNotifications` |

Ce document couvre uniquement les **notifications in-app legacy** et le système de préférences construit autour d'elles.

---

## Architecture du système de notifications

```
NightlyComplianceAuditCommand (cron 2h)          ValidationController (POST)
        │                                                   │
        ▼                                                   ▼
ComplianceAlertNotificationService        UpdateYearResidentNotifications
        │                                    ValidationNotifications
        │                                           │
        └─────────────────┬─────────────────────────┘
                          │
                          ▼
              NotificationDecisionService
              shouldSend(userType, userId, year, eventType, channel)
                          │
                  ┌───────┴───────┐
                  │               │
            GlobalPrefs      AnnualPrefs
          (UserSetting)   (YearUserNotifPref)
                  │               │
                  └───────AND─────┘
                          │
                  true → persist NotificationManager/NotificationResident
                  false → skip
```

---

## NotificationDecisionService

**Fichier :** `src/Services/NotificationDecisionService.php`

**Règle fondamentale :**
```
shouldSend = globalPrefs[channel] AND annualPrefs[eventType][channel]
```

**Signature :**
```php
public function shouldSend(
    string $userType,   // 'manager' | 'resident' | 'hospital_admin'
    int    $userId,     // ID de l'entité destinataire
    Years  $year,       // Année académique concernée
    string $eventType,  // 'COMPLIANCE_ALERT' | 'MONTH_VALIDATION' | ...
    string $channel,    // 'email' | 'push' | 'sms' | 'callRh'
): bool
```

**Comportement fail-safe :**
- Canal absent des préférences → `false`
- Event absent des préférences annuelles → `false`
- Exception propagée → ne silencers pas les erreurs d'infrastructure

**Toute nouvelle notification DOIT injecter ce service.** L'architecture test garantit cette contrainte via `NotificationArchitectureTest` (ARCH01/ARCH02/ARCH03).

---

## Préférences de notification

### Niveau 1 — Préférences globales (UserSetting)

Stockées dans `UserSetting.settings['notifications']`. Clés valides :

| Canal | Défaut | Description |
|---|---|---|
| `email` | `true` | Canal email |
| `push` | `true` | Canal push (infrastructure future) |
| `compliance` | `true` | ← legacy, synchronisé avec `Manager.receiveComplianceEmails` |
| `validation` | `true` | ← legacy |
| `dailySummary` | `false` | ← non implémenté |

Endpoint : `GET/PATCH /api/user/settings`

### Niveau 2 — Préférences annuelles (YearUserNotifPref)

Stockées dans `year_user_notif_pref`. Une ligne par `(userType × userId × yearId)`.

```
GET  /api/years/{yearId}/my-notif-prefs  → prefs fusionnées avec EVENT_DEFAULTS
PATCH /api/years/{yearId}/my-notif-prefs → merge partiel (pré-validé par YearNotifPrefPatchInputDTO)
```

**Accès :** Manager lié à l'année + HospitalAdmin du même hôpital. JWT uniquement — `userId` jamais extrait du body.

### EVENT_DEFAULTS — valeurs par défaut

| Event | email | push | sms | callRh |
|---|---|---|---|---|
| `COMPLIANCE_ALERT` | `true` | `true` | `false` | `false` |
| `MONTH_VALIDATION` | `true` | `false` | `false` | `false` |
| `STAFFPLANNER_EXPORT_DONE` | `true` | `false` | `false` | `false` |
| `RESIDENT_INACTIVE` | `true` | `true` | `false` | `false` |
| `YEAR_ENDING` | `true` | `true` | `false` | `false` |
| `SCHEDULE_CHANGED` | `false` | `true` | `false` | `false` |
| `VALIDATION_REJECTED` | `true` | `true` | `false` | `false` |

Push/SMS/callRh : définis dans EVENT_DEFAULTS mais aucune infrastructure d'envoi implémentée.

---

## Catalogue des notifications in-app existantes

### IA-01 `compliance_alert` — ✅ Complet (P2-C)

| Champ | Valeur |
|---|---|
| **Service** | `ComplianceAlertNotificationService` |
| **Destinataires** | Managers de l'année |
| **NDS** | ✅ per-manager |
| **metadata** | ✅ `{version:1, yearId, yearTitle, tab:"compliance", severity}` |
| **Deep link** | `/manager/year-detail` → onglet `compliance` |
| **Déclencheur** | `NightlyComplianceAuditCommand` (cron 2h) si `$report->hasIssues()` |
| **Titre** | `[CRITIQUE] Alice Dupont — Cardiologie 2025-2026` |
| **Body** | Liste des violations (max 3 + fallback "et N autre(s)") |

### IA-02 `validated` / `invalidated` — ⚠️ Partiel (P1A)

| Champ | Valeur |
|---|---|
| **Service** | `UpdateYearResidentNotifications` |
| **Destinataires** | Co-managers de l'année + 1 résident |
| **NDS** | ✅ per-recipient |
| **metadata** | ❌ (migration P2-E planifiée) |
| **Déclencheur** | `ValidationController::updateResidentValidationStatus()` |

### IA-03 `validation` — ⚠️ Partiel (P1)

| Champ | Valeur |
|---|---|
| **Service** | `ValidationNotifications` |
| **Destinataires** | Co-managers + tous résidents autorisés de l'année |
| **NDS** | ✅ per-recipient |
| **metadata** | ❌ (migration P2-E planifiée) |
| **Déclencheur** | `UpdateMonthStatus::updateValidationStatus()` |

### IA-04 `year_added` — ❌ Non migré (P3)

| Champ | Valeur |
|---|---|
| **Source** | `HospitalAdminController::addManager()` — inline contrôleur |
| **Destinataire** | 1 manager (ajouté à l'année) |
| **NDS** | ❌ |
| **metadata** | ❌ |

### IA-05 `grant_create_year` — ❌ Non migré (P3)

| Champ | Valeur |
|---|---|
| **Source** | `HospitalAdminController::setCanCreateYear()` — inline contrôleur |
| **NDS** | ❌ |
| **metadata** | ❌ (pas de deep link utile) |

### IA-06 `invitation_refused` — ❌ Non migré (P3)

| Champ | Valeur |
|---|---|
| **Source** | `ManagerInviteController::refuseYearInvite()` — inline contrôleur |
| **NDS** | ❌ |
| **metadata** | ❌ (pas de deep link utile) |

---

## NotificationManager v2 — champ `metadata`

### Schéma standard (version 1)

```json
{
  "version":    1,
  "yearId":     7,
  "yearTitle":  "Cardiologie 2025-2026",
  "tab":        "compliance",
  "severity":   "critical",
  "residentId": 42
}
```

**Clés définies :**

| Clé | Type | Obligatoire | Description |
|---|---|---|---|
| `version` | number | ✅ | Toujours `1`. Prépare les évolutions futures du format. |
| `yearId` | number | Pour deep link | ID de `Years` — requis pour le bouton "Voir" |
| `yearTitle` | string | Pour deep link | Titre de l'année — requis pour le navigation state React Router |
| `tab` | string | Pour deep link | Onglet cible dans `YearDetailPage` |
| `severity` | string | Non | `"critical"` ou `"warning"` — sévérité de l'alerte |
| `residentId` | number | Non | Résident concerné (futur usage) |

**Rétrocompatibilité :** les rows créées avant P2-C ont `metadata = NULL`. Le frontend affiche le bouton "Voir" uniquement si `metadata?.yearId != null`.

**Tabs valides dans `YearDetailPage` :**
```
"general" | "residents" | "partners" | "setup" | "compliance"
```

### Navigation React Router depuis une notification

```typescript
navigate("/manager/year-detail", {
  state: {
    id:         metadata.yearId,
    title:      metadata.yearTitle,
    defaultTab: metadata.tab ?? "general",
    // adminRights intentionnellement absent — recalculé à l'ouverture
  },
});
```

---

## Frontend — composants NotificationTable

**Fichier :** `src/pages/Management/NotificationsPage/components/`

### Fonctionnalités implémentées (P2-B/C)

| Feature | Composant/Fichier | Sprint |
|---|---|---|
| Badges CRITIQUE/AVERTISSEMENT (Chip MUI) | `NotificationTable.tsx` | P2-B2 |
| Icône lu/non-lu correcte (`read` vs `isRead`) | `NotificationTable.tsx` | P2-B2 |
| Timestamp relatif ("Il y a 5 min", "Hier à 14:12"...) | `notificationUtils.ts` | P2-B3 |
| Tri intelligent (critiques > warnings > standard > lus) | `notificationUtils.ts` | P2-B3 |
| Bouton "Voir" → deep link | `NotificationTable.tsx` | P2-C |
| Préfixe retiré du titre affiché | `NotificationTable.tsx` | P2-B2 |
| `white-space: pre-line` sur le body | `NotificationTable.tsx` | P2-B2 |

### Type `Notification` (frontend)

```typescript
// src/types/entities.ts
export interface NotificationMetadata {
  version:    number;
  yearId?:    number;
  yearTitle?: string;
  tab?:       "general" | "residents" | "partners" | "compliance" | "staffplanner" | "realtime";
  severity?:  "critical" | "warning";
  residentId?: number;
  [key: string]: unknown;
}

export interface Notification {
  id:        number;
  object:    string;      // titre (peut contenir un préfixe [CRITIQUE]/[AVERTISSEMENT])
  body:      string;      // corps (peut contenir des \n)
  type:      string;      // type métier
  read:      boolean;
  readAt:    string | null;
  createdAt: string;
  metadata?: NotificationMetadata | null;
}
```

### Formatage du titre backend

```php
// ComplianceAlertNotificationService
$severityTag = $report->hasCriticalIssues() ? '[CRITIQUE]' : '[AVERTISSEMENT]';
$object      = sprintf('%s %s — %s', $severityTag, $residentName, $yearTitle);
```

Le frontend parse et retire le préfixe via `parseSeverity()` dans `NotificationTable.tsx` :
- `[CRITIQUE]` → Chip error rouge
- `[AVERTISSEMENT]` → Chip warning orange
- Aucun préfixe → aucun badge

### Tri des notifications

```
Priorité d'affichage :
  0 — [CRITIQUE] non lue
  1 — [AVERTISSEMENT] non lue
  2 — standard non lue
100 — toutes les lues
À priorité égale : plus récente en premier
```

---

## Endpoints notifications

### Manager

| Route | Méthode | Description |
|---|---|---|
| `GET /api/managers/notifications/unread` | GET | Toutes les notifications non lues avec metadata |
| `PATCH /api/managers/notifications/mark-all-as-read` | PATCH | Marquer toutes comme lues |
| `GET /api/years/{yearId}/my-notif-prefs` | GET | Préférences annuelles (fusionnées avec EVENT_DEFAULTS) |
| `PATCH /api/years/{yearId}/my-notif-prefs` | PATCH | Mettre à jour les préférences annuelles |

### Résident

| Route | Méthode | Description |
|---|---|---|
| `GET /api/residents/notifications/unread` | GET | Toutes les notifications non lues |
| `PATCH /api/residents/notifications/mark-all-as-read` | PATCH | Marquer toutes comme lues |

---

## Roadmap notifications

| Sprint | Objectif | Statut |
|---|---|---|
| P0 | `NotificationDecisionService` + `YearUserNotifPref` + API prefs | ✅ |
| P1 | Tests avancés NDS + service + controller | ✅ |
| P1A | Bug acteur/destinataire `UpdateYearResidentNotifications` | ✅ |
| P1 Migration | `ValidationNotifications` → NDS | ✅ |
| P2-A | Sender `COMPLIANCE_ALERT` (in-app) | ✅ |
| P2-B | Badges visuels + timestamp relatif + tri intelligent | ✅ |
| P2-C | metadata JSON + bouton "Voir" + deep link | ✅ |
| **P2-E** | metadata sur `validated`/`invalidated`/`validation` + `NotificationResident.metadata` | ⏳ |
| P3 | Extraction `year_added`, `grant_create_year`, `invitation_refused` depuis contrôleurs | ⏳ |
| P4 | `STAFFPLANNER_EXPORT_DONE`, `RESIDENT_INACTIVE`, `YEAR_ENDING`, `SCHEDULE_CHANGED` senders | ⏳ |
