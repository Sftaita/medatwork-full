# Modèle de Données — Medatwork

## Vue d'Ensemble

25 entités Doctrine organisées autour de deux acteurs principaux (**Manager** et **Resident**), liés par une **Year** (année académique), elle-même rattachée à un **Hospital**.

**Nouvelles entités Sprint 1 (2026-04-02) :** `Hospital`, `AppAdmin`, `HospitalAdmin`, `HospitalRequest`.

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
- `hospitals` (ManyToMany → `Hospital`, pivot `manager_hospital`)
- `managerYears` (OneToMany → `ManagerYears`)
- `notificationManagers` (OneToMany → `NotificationManager`)

**Enum `ManagerStatus` :**
- `active` — compte actif et lié à au moins un hôpital
- `pending_hospital` — en attente d'approbation de la demande d'hôpital → connexion bloquée

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

## Migrations

54 migrations Doctrine (2022–2026) documentent l'évolution du schéma.

**Sprint 1 (2026-04-02) :** `Version20260403000000` — création des tables `hospital`, `app_admin`, `hospital_admin`, `hospital_request`, `manager_hospital` ; migration des données `manager.hospital` (string) vers la table `hospital`.

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

*Document créé le 2026-03-20 — mis à jour le 2026-04-02 (Sprint 1 Hospital feature)*
