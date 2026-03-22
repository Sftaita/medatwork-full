# Modèle de Données — Medatwork

## Vue d'Ensemble

21 entités Doctrine organisées autour de deux acteurs principaux : **Manager** et **Resident**, liés par une **Year** (année académique).

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
| `firstName` | string | Prénom |
| `lastName` | string | Nom |
| `roles` | json | `["ROLE_MANAGER"]` |
| `isActivated` | bool | Compte activé |
| `activationToken` | string | Token d'activation |
| `resetToken` | string | Token de reset MDP |
| `resetTokenExpiry` | datetime | Expiration reset token |

**Relations :**
- `ManagerYears` (ManyToMany avec `Years`)
- `NotificationManager` (OneToMany)

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
Représente une année académique (ex: 2022-2023).

| Champ | Type | Description |
|-------|------|-------------|
| `id` | int | Clé primaire |
| `label` | string | Ex: "2022-2023" |
| `startDate` | date | Début de l'année |
| `endDate` | date | Fin de l'année |

**Relations :**
- `ManagerYears` (ManyToMany avec `Manager`)
- `YearsResident` (ManyToMany avec `Resident`)
- `YearsWeekTemplates` (OneToMany → `WeekTemplates`)
- `YearsWeekIntervals` (OneToMany → périodes)
- `YearsResidentParameters` (OneToMany)

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

## Migrations

50 migrations Doctrine entre 2022 et 2023 documentent l'évolution du schéma.

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

*Document créé le 2026-03-20*
