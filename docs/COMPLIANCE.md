# Conformité légale — Temps de travail MACCS

## Sources légales

| Document | Référence |
|----------|-----------|
| Loi du 12 décembre 2010 | Durée du travail des médecins en formation |
| AR du 19 juillet 2021 | Convention collective — conditions minimales des contrats de formation |

---

## Règles légales applicables

### 1. Moyenne hebdomadaire sur 13 semaines (Art. 5 §1 loi 2010)

| Situation | Seuil warning | Seuil illégal |
|-----------|---------------|---------------|
| Sans opting-out | > 48 h | > 60 h |
| Avec opting-out | > 60 h | > 72 h |

La période de référence est de **13 semaines consécutives** calculée depuis la date de début de l'année académique (ou la date de début du résident si différente).

### 2. Limite absolue hebdomadaire (Art. 5 §1 alinéa 2)

- Max **60 h** par semaine calendaire, sans exception
- Avec opting-out : max **72 h** (Art. 7 §1 — "au-delà des limites prévues à l'article 5, § 1er")

### 3. Durée maximale d'une prestation (Art. 5 §2)

- Max **24 h** par prestation de travail
- Exceptions : accident survenu/imminent, nécessité imprévue

### 4. Repos minimal entre prestations (Art. 5 §3)

- Après toute prestation de **12 h à 24 h** → repos consécutif de **minimum 12 h**
- Ne s'applique pas aux prestations < 12 h

### 5. Heures scientifiques (Art. 5 §4)

- Max **4 h/semaine** comptabilisées comme temps de travail
- Dont **2 h minimum sur le lieu de stage**
- **10 jours forfaitaires** par an (convention collective Art. 13)

### 6. Opting-out (Art. 7)

- Temps additionnel max **12 h/semaine** au-delà des limites Art. 5 §1
- Nécessite un **accord individuel écrit préalable** dans un document distinct du contrat
- Résiliable par préavis de **1 mois**
- Art. 5 §2 (max 24 h prestation) et §3 (repos 12 h) restent applicables même avec opting-out
- Modélisé sur `YearsResident.optingOut` (bool, nullable — null = non signé)

### 7. Gardes — comptabilisation (Convention collective Art. 5)

| Type | Comptabilisé comme temps de travail |
|------|-------------------------------------|
| `hospital` (intra-muros, ≤ 20 min) | ✅ Oui — intégralement |
| `callable` (extra-muros, > 20 min) | ❌ Non — forfait uniquement |
| `Timesheet.called = true` (intervention durant garde appelable) | ✅ Oui — intégralement |

### 8. Absences

- Comptées à **9 h 36 min** (9 × 3600 + 36 × 60 secondes) par journée d'absence
- Exception : type `recovery` et jours fériés → **0 h** comptée

---

## État d'implémentation

### ✅ Implémenté (legacy)

| Règle | Service | Notes |
|-------|---------|-------|
| Moyenne 13 semaines | `WeeklyHoursChecker::checkWeeklyHours()` + `GetPeriodSummary` | Seuils corrects via `getResidentInformation()` |
| Limite absolue 60 h | `WeeklyHoursChecker` — `highLimit` | Correct |
| Opting-out pris en compte | `GetPeriodSummary::getResidentInformation()` | `YearsResident.optingOut` |
| Garde callable exclue | `WeeklyHoursChecker::hoursCounter()` ligne ~70 | `type === 'hospital'` uniquement |
| Chevauchement de gardes | `GetPeriodSummary::generateResidentPeriodData()` | Avec durée de chevauchement |
| Durée max prestation 24 h | `TimesheetInputValidator` | Vérifié à la saisie uniquement |
| Périodes de 13 semaines | `LegalPeriodsCalculator` | Séquentielles depuis début d'année |

### ✅ Implémenté (nouveau système `App\Compliance`)

| Règle | Checker | Tests |
|-------|---------|-------|
| Moyenne lissée 13 sem. (warning + critical) | `SmoothedAverageChecker` | `SmoothedAverageCheckerTest` (8 tests) |
| Limite absolue hebdomadaire | `WeeklyAbsoluteLimitChecker` | `WeeklyAbsoluteLimitCheckerTest` (5 tests) |
| Durée max prestation 24 h (audit) | `MaxShiftDurationChecker` | `MaxShiftDurationCheckerTest` (6 tests) |
| Repos 12 h après prestation ≥ 12 h | `MinimumRestChecker` | `MinimumRestCheckerTest` (8 tests) |
| Timeline unifiée Timesheet + Garde | `ResidentWorkTimelineBuilder` | `ResidentWorkTimelineBuilderTest` (5 tests) |
| Persistance des anomalies | `ComplianceAlert` entity + `ComplianceAlertRepository` | — |
| `receiveComplianceEmails` | `Manager::$receiveComplianceEmails` | — |
| Commande nocturne | `app:compliance:audit` (`NightlyComplianceAuditCommand`) | — |
| Orchestration + déduplication | `ResidentWorkComplianceService` | — |

| Endpoint API dédié | `GET /api/managers/compliance/{yearId}` | `GetComplianceReport` controller |
| Onglet Conformité frontend | `YearDetailPage > Compliance.tsx` | Affiche violations par résident/période |

### ⏳ Reste à faire

| Règle | Priorité | Notes |
|-------|----------|-------|
| `ComplianceNotificationService` | Basse | Emails aux managers opt-in (`receiveComplianceEmails`) |

---

## Bug corrigé

### `WeeklyHoursChecker.php` (lignes 159 et 205)
```php
// ❌ Avant — opérateur bitwise au lieu de logique
if (($hours > $limits['limit']) & ($hours <= $limits['highLimit'])) {

// ✅ Après
if (($hours > $limits['limit']) && ($hours <= $limits['highLimit'])) {
```

---

## Architecture — nouveau namespace `App\Compliance`

```
src/Compliance/
├── Enum/
│   ├── ComplianceIssueType.php  — 5 types d'anomalie (enum string)
│   └── ComplianceSeverity.php   — warning | critical
├── DTO/
│   ├── WorkSegment.php          — Segment de travail unifié (start, end, type, pause)
│   ├── ComplianceIssue.php      — Une anomalie (type, severity, weekStart, context)
│   └── ComplianceReport.php     — Rapport complet pour un résident/période
├── Timeline/
│   └── ResidentWorkTimelineBuilder.php  — Fusionne Timesheet+Garde, exclut callable
├── Checker/
│   ├── ComplianceCheckerInterface.php
│   ├── SmoothedAverageChecker.php       — Art. 5 §1 — moyenne 13 sem.
│   ├── WeeklyAbsoluteLimitChecker.php   — Art. 5 §1 al.2 — limite hebdo absolue
│   ├── MaxShiftDurationChecker.php      — Art. 5 §2 — max 24 h/prestation
│   └── MinimumRestChecker.php           — Art. 5 §3 — repos 12 h après ≥ 12 h
└── ResidentWorkComplianceService.php    — Orchestration + persistance alerts

src/Entity/
└── ComplianceAlert.php          — Anomalie persistée (fingerprint, status lifecycle)

src/Repository/
└── ComplianceAlertRepository.php

src/Command/
└── NightlyComplianceAuditCommand.php   — app:compliance:audit

src/Controller/ValidationsAPI/ManagersAPI/
└── GetComplianceReport.php             — GET /api/managers/compliance/{yearId}

frontend/src/pages/Management/YearDetailPage/component/
└── Compliance.tsx                      — Onglet "Conformité" (violations par résident/période)

frontend/src/services/periodsApi.ts
└── getComplianceReport()               — Appel API vers /managers/compliance/{yearId}

src/Services/ManagerMonthValidation/   (legacy — inchangé sauf bug &&)
├── WeeklyHoursChecker.php
├── LegalPeriodsCalculator.php
├── GetPeriodSummary.php
└── ...
```

### Injection des checkers (services.yaml)
Les checkers sont tagués `app.compliance_checker` via `_instanceof` et injectés
dans `ResidentWorkComplianceService` via `!tagged_iterator`.

---

## Seuils de référence (constantes à utiliser)

```php
// Sans opting-out
const WEEKLY_AVERAGE_LIMIT    = 48;   // h — moyenne sur 13 semaines
const WEEKLY_ABSOLUTE_LIMIT   = 60;   // h — par semaine calendaire

// Avec opting-out (+12h sur les deux limites)
const OPTING_OUT_EXTRA        = 12;   // h — supplément autorisé

// Prestation
const MAX_SHIFT_DURATION      = 24;   // h — durée max d'une prestation
const MIN_REST_AFTER_LONG_SHIFT = 12; // h — repos après prestation ≥ 12h
const LONG_SHIFT_THRESHOLD    = 12;   // h — seuil déclenchant l'obligation de repos

// Absences
const ABSENCE_DAILY_HOURS     = 9.6;  // h — 9h36 par journée d'absence (9×3600 + 36×60)
const SCIENTIFIC_HOURS_MAX    = 4;    // h/semaine — heures scientifiques comptabilisées
```

---

## Utilisation

### Lancer l'audit manuellement
```bash
# Tous les résidents actifs
php bin/console app:compliance:audit

# Un seul year
php bin/console app:compliance:audit --year=42
```

### Cron recommandé
```
0 2 * * * php /var/www/html/bin/console app:compliance:audit >> /var/log/compliance.log 2>&1
```

### Appliquer la migration
```bash
php bin/console doctrine:migrations:execute 'DoctrineMigrations\Version20260331180000'
```
