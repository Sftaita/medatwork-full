# Système de design Frontend — Medatwork

**Fichier source :** `frontend/src/styles/tableStyles.ts`  
**Hook densité :** `frontend/src/hooks/useTableDensity.ts`  
**Composant bouton densité :** `frontend/src/components/DensityToggleButton.tsx`

Ce module centralise les tokens de style pour les tableaux de données. Toutes les pages de gestion (Hospital Admin, etc.) l'importent pour garantir une apparence uniforme.

---

## Import standard

```typescript
import { T, C, statusBadgeSx, yearPillSx, bodyRowSx } from "../../styles/tableStyles";
import { useTableDensity } from "../../hooks/useTableDensity";
import { DensityToggleButton } from "../../components/DensityToggleButton";
```

---

## Palette de couleurs — `C`

```typescript
C.brand600   // "#a439b6"  — violet primaire de l'app
C.brand700   // "#8a2e99"  — violet foncé (hover)
C.brand100   // "#f3e5f5"  — violet très clair (fond badge)
C.brand50    // "#faf5fb"  — violet quasi-blanc (fond sélection)

C.ink        // "#1a1620"  — texte principal
C.ink2       // "#4a4452"  — texte secondaire
C.ink3       // "#7a7484"  — texte tertiaire / labels
C.ink4       // "#a8a2b0"  — placeholder / icônes

C.surface    // "#ffffff"
C.surface2   // "#f6f2f9"  — fond en-tête / pied / hover
C.line       // "#ece8f1"  — bordure standard
C.line2      // "#e0d9e8"  — bordure accentuée

C.ok / C.okBg     // vert  (statut actif)
C.warn / C.warnBg // ambre (statut en attente)
C.err / C.errBg   // rouge (statut erreur)
```

---

## Tokens `T` — shorthand `sx`

### Structure du tableau

| Token | Usage |
|-------|-------|
| `T.card` | `<Box sx={T.card}>` — carte englobante (border + borderRadius + ombre) |
| `T.wrap` | `<Box sx={T.wrap}>` — wrapper `overflowX: "auto"` |
| `T.table` | `<Table sx={T.table}>` — table avec `borderCollapse: separate` |
| `T.headRow` | `<TableRow sx={T.headRow}>` — en-tête uppercase 11px, fond `surface2` |
| `T.bodyRow` | `<TableRow sx={T.bodyRow}>` — densité normale (raccourci) |
| `T.footer` | `<Box sx={T.footer}>` — pied de tableau (count + pagination) |

> **Préférer `bodyRowSx(density)`** à `T.bodyRow` dès que la densité est activée.

### En-tête de page

| Token | Usage |
|-------|-------|
| `T.pageHead` | Flex `space-between` pour titre + bouton CTA |
| `T.pageTitle` | Titre 22px bold |
| `T.pageSub` | Sous-titre 13px gris |

### Barre d'outils

| Token | Usage |
|-------|-------|
| `T.toolbar` | Flex row avec gap et flexWrap |
| `T.search` | TextField stylisé (height 38px, radius 8px, focus brand) |

### Cellule personne

| Token | Usage |
|-------|-------|
| `T.person` | Flex row avec gap pour avatar + texte |
| `T.avatar` | Avatar 34px, fond `brand100`, texte `brand700` |
| `T.name` | Nom en gras 13px |
| `T.sub` | Email/sous-titre 11px monospace gris |

---

## Densité des lignes — `bodyRowSx(density)` + `useTableDensity`

La densité est persistée dans `localStorage` (clé `medatwork:table-density`) et partagée entre toutes les pages.

### Le hook

```typescript
const { density, cycleDensity } = useTableDensity();
// density : "compact" | "normal" | "comfortable"
// cycleDensity() : passe au suivant et sauvegarde dans localStorage
```

### La fonction sx

```typescript
// Remplace T.bodyRow sur les lignes de tableau
<TableRow sx={bodyRowSx(density)}>

// Avec fusion de styles (ex : sélection par checkbox)
<TableRow sx={{ ...bodyRowSx(density), ...(selected ? { bgcolor: `${C.brand50} !important` } : {}) }}>
```

| Densité | Hauteur | Padding | Font |
|---------|---------|---------|------|
| `compact` | 40px | 5px | 12px |
| `normal` | 60px | 13px | 13px |
| `comfortable` | 76px | 18px | 14px |

### Le bouton

```tsx
// À placer dans la toolbar ou le header de page
<DensityToggleButton density={density} onCycle={cycleDensity} />
```

Affiche l'icône MUI `DensitySmall` / `DensityMedium` / `DensityLarge` selon l'état courant, avec un tooltip explicatif.

---

## Fonctions utilitaires

### `statusBadgeSx(variant)`

Badge avec point coloré. Variantes : `"active"` | `"pending"` | `"error"` | `"default"`.

```tsx
<Box component="span" sx={statusBadgeSx("active")}>Actif</Box>
<Box component="span" sx={statusBadgeSx("pending")}>En attente</Box>
<Box component="span" sx={statusBadgeSx("error")}>Sans compte</Box>
<Box component="span" sx={statusBadgeSx("default")}>Retiré</Box>
```

### `yearPillSx(count)`

Pill compteur d'années. Devient violet plein quand `count >= 8` (vétéran).

```tsx
<Box component="span" sx={yearPillSx(g.years.length)}>
  {g.years.length}
</Box>
```

---

## Tri par colonne

### Pattern standard

```typescript
type SortCol = "nom" | "email" | "fonction" | /* ... */;

const [sortCol, setSortCol] = useState<SortCol | null>("nom");
const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

const handleSort = (col: SortCol) => {
  if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
  else { setSortCol(col); setSortDir("asc"); }
};

// Dans le useMemo de filtered :
return [...base].sort((a, b) => {
  let cmp = 0;
  switch (sortCol) {
    case "nom": cmp = a.lastname.localeCompare(b.lastname, "fr"); break;
    // ...
  }
  return sortDir === "asc" ? cmp : -cmp;
});
```

### En-tête cliquable avec indicateur

```tsx
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";

<TableCell
  onClick={() => handleSort("nom")}
  sx={{ cursor: "pointer", "&:hover": { color: C.ink } }}
>
  <Box display="inline-flex" alignItems="center" gap="4px">
    Nom
    {sortCol === "nom"
      ? sortDir === "asc"
        ? <ArrowUpwardIcon sx={{ fontSize: 11 }} />
        : <ArrowDownwardIcon sx={{ fontSize: 11 }} />
      : <UnfoldMoreIcon sx={{ fontSize: 11, opacity: 0.25 }} />
    }
  </Box>
</TableCell>
```

> **Règle :** les icônes de tri font partie du `headRow` — héritent du `textTransform: uppercase` en CSS mais les icônes SVG ne sont pas affectées.

---

## Filtre par colonne — pattern Select dynamique

```typescript
// 1. Collecter les valeurs uniques dans les données
const jobOptions = useMemo(() => {
  const seen = new Set<string>();
  groups.forEach((g) => { if (g.job) seen.add(g.job); });
  return Array.from(seen).sort((a, b) =>
    translateJob(a).localeCompare(translateJob(b), "fr", { sensitivity: "base" })
  );
}, [groups]);

// 2. État du filtre
const [jobFilter, setJobFilter] = useState("");

// 3. Dans le filtre de filtered
if (jobFilter && g.job !== jobFilter) return false;
```

```tsx
// 4. Select dans la toolbar
<FormControl size="small" sx={{ minWidth: 160 }}>
  <InputLabel sx={{ fontSize: 13 }}>Fonction</InputLabel>
  <Select
    value={jobFilter}
    label="Fonction"
    onChange={(e) => setJobFilter(e.target.value)}
    sx={{ fontSize: 13, height: 38, borderRadius: "8px" }}
  >
    <MenuItem value="">Toutes</MenuItem>
    {jobOptions.map((job) => (
      <MenuItem key={job} value={job}>{translateJob(job)}</MenuItem>
    ))}
  </Select>
</FormControl>
```

---

## Menu 3-points par ligne — pattern `ManagerActionsMenu`

```tsx
// IconButton MoreVert → Menu MUI avec actions contextuelles
<IconButton
  size="small"
  onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget); }}
>
  <MoreVertIcon fontSize="small" />
</IconButton>
<Menu
  anchorEl={anchor}
  open={Boolean(anchor)}
  onClick={(e) => e.stopPropagation()} // évite d'ouvrir le drawer via propagation
  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
  transformOrigin={{ vertical: "top", horizontal: "right" }}
  PaperProps={{ sx: { minWidth: 190, borderRadius: "10px" } }}
>
  <MenuItem onClick={() => { close(); onOpenDrawer(); }}>Voir le détail</MenuItem>
  <MenuItem onClick={() => { close(); onAddYear(); }}>Ajouter à une année</MenuItem>
  {hasPendingYear && (
    <MenuItem onClick={() => { close(); onResend(); }}>Renvoyer l'invitation</MenuItem>
  )}
  <Divider />
  <MenuItem sx={{ color: "error.main" }} onClick={() => { close(); onDelete(); }}>
    Supprimer de l'hôpital
  </MenuItem>
</Menu>
```

> **Important :** `onClick={(e) => e.stopPropagation()}` sur `<Menu>` et `<TableCell>` pour éviter d'ouvrir le drawer quand on clique sur le menu.

---

## Exemple complet — page avec toutes les fonctionnalités

```tsx
import { T, C, statusBadgeSx, bodyRowSx } from "../../styles/tableStyles";
import { useTableDensity } from "../../hooks/useTableDensity";
import { DensityToggleButton } from "../../components/DensityToggleButton";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";

const MyPage = () => {
  const { density, cycleDensity } = useTableDensity();
  const [sortCol, setSortCol] = useState<"nom" | "statut" | null>("nom");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState("");

  const handleSort = (col: "nom" | "statut") => {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  return (
    <Box p={3}>
      <Box sx={T.pageHead}>
        <Box>
          <Typography sx={T.pageTitle}>Titre</Typography>
          <Typography sx={T.pageSub}>Sous-titre</Typography>
        </Box>
      </Box>

      <Box sx={T.toolbar}>
        {/* Recherche locale (uniquement si la page n'utilise PAS useTopbarSearch) */}
        <TextField sx={T.search} placeholder="Rechercher…" />
        <DensityToggleButton density={density} onCycle={cycleDensity} />
      </Box>

      <Box sx={T.card}>
        <Box sx={T.wrap}>
          <Table sx={T.table}>
            <TableHead>
              <TableRow sx={T.headRow}>
                {(["nom", "statut"] as const).map((col) => (
                  <TableCell key={col} onClick={() => handleSort(col)} sx={{ cursor: "pointer" }}>
                    <Box display="inline-flex" alignItems="center" gap="4px">
                      {col === "nom" ? "Nom" : "Statut"}
                      {sortCol === col
                        ? sortDir === "asc" ? <ArrowUpwardIcon sx={{ fontSize: 11 }} /> : <ArrowDownwardIcon sx={{ fontSize: 11 }} />
                        : <UnfoldMoreIcon sx={{ fontSize: 11, opacity: 0.25 }} />
                      }
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} sx={bodyRowSx(density)}>
                  <TableCell>
                    <Box sx={T.person}>
                      <Avatar sx={T.avatar}>{r.initials}</Avatar>
                      <Box>
                        <Box sx={T.name}>{r.name}</Box>
                        <Box sx={T.sub}>{r.email}</Box>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box component="span" sx={statusBadgeSx("active")}>Actif</Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
        <Box sx={T.footer}>
          <Typography variant="caption">{rows.length} éléments</Typography>
        </Box>
      </Box>
    </Box>
  );
};
```

---

## Pages qui utilisent ce système

| Page | Route | Fonctionnalités |
|------|-------|----------------|
| `HospitalAdminManagersPage` | `/hospital-admin/managers` | Densité, tri toutes colonnes, filtre Fonction, menu 3-points |
| `HospitalAdminResidentsPage` | `/hospital-admin/residents` | Densité, filtre Statut + Année, sélection multi |
| `HospitalAdminYearResidentsPage` | `/hospital-admin/years/:id/residents` | Densité |
| `HospitalAdminAuditLogPage` | `/hospital-admin/audit-log` | Densité, filtre Action + dates |
| `HospitalAdminExportsPage` | `/hospital-admin/exports` | Densité, `T.table`/`T.headRow`/`bodyRowSx` dans accordéons MACCS + onglet Excel |
| `HospitalAdminAuditTimelinePage` | `/hospital-admin/audit-timeline` | `T.card`/`T.wrap`/`T.table`, chips couleurs par event type, filtres actifs |

---

## Recherche via la Topbar — `useTopbarSearch`

La barre de recherche de la topbar est **inactive par défaut**. Elle s'affiche uniquement lorsqu'une page l'active explicitement via le hook `useTopbarSearch`.

### Fichiers concernés

| Fichier | Rôle |
|---------|------|
| `frontend/src/store/searchStore.ts` | Store Zustand — état `active`, `placeholder`, `value` |
| `frontend/src/hooks/useTopbarSearch.ts` | Hook d'enregistrement pour les pages |
| `frontend/src/components/layout/components/Topbar/Topbar.tsx` | Lit le store, affiche le champ si `active === true` |

### Fonctionnement

```
Page mount  →  register(placeholder)  →  champ topbar apparaît
User tape   →  setValue(v)            →  hook retourne la valeur
Page unmount → unregister()           →  champ topbar disparaît, value remise à ""
```

### Usage dans une page

```typescript
import { useTopbarSearch } from "../../hooks/useTopbarSearch";

const MyPage = () => {
  // Active le champ en topbar avec ce placeholder, retourne la valeur tapée
  const search = useTopbarSearch("Titre, résident, manager…");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) =>
      !q || item.title.toLowerCase().includes(q)
    );
  }, [items, search]);

  // Pas de TextField local — la recherche se fait depuis la topbar
  return <Box>{/* ... */}</Box>;
};
```

### Règles

- **Ne jamais** ajouter un `TextField` de recherche local sur une page qui utilise `useTopbarSearch` — le champ topbar est la seule entrée.
- Le placeholder doit décrire les champs filtrables : `"Nom, email, spécialité…"`.
- La valeur est remise à `""` automatiquement lors du `register` (changement de page). Aucun reset manuel nécessaire.
- Sur mobile (`xs`/`sm`), le champ topbar n'est pas affiché — prévoir un fallback si la recherche est critique sur mobile.

### Pages connectées

| Page | Route | Placeholder |
|------|-------|-------------|
| `HospitalAdminDashboardPage` | `/hospital-admin/dashboard` | `"Titre, résident, manager…"` |
| `HospitalAdminResidentsPage` | `/hospital-admin/residents` | `"Nom, email, année…"` |
| `HospitalAdminManagersPage` | `/hospital-admin/managers` | `"Nom, email, fonction…"` |
| `HospitalAdminAuditLogPage` | `/hospital-admin/audit-log` | `"Admin, action, description…"` |
| `HospitalAdminExportsPage` | `/hospital-admin/exports` | `"MACCS, mois…"` (tab 0) / `"Nom, email…"` (tab 1) |
| `WeekPlannerApp` | `/manager/week-creator` | `"Rechercher un modèle…"` |
| `CalendarView` | `/manager/calendar` | `"Rechercher un MACC…"` |

> Ajouter une ligne ici à chaque nouvelle page branchée.

---

## Gestion des semaines — `WeekScheduleTable` + `WeekTaskAllocation`

Page : `/manager/week-dispatcher`

### Architecture

```
WeekDispatcher.tsx          — charge les données API, orchestre
  └── WeekTaskAllocation.tsx — bridge données ↔ composant, mutations optimistes
        └── WeekScheduleTable.tsx — composant pur d'affichage (styles inline)
```

### Fichiers

| Fichier | Rôle |
|---------|------|
| `WeekDispatcher.tsx` | Fetch initial (`yearsWeekIntervals`), gestion du loading/erreur |
| `WeekTaskAllocation.tsx` | Mapping store → props, `handleResidentAssignment`, `handleRemoveAssignment`, `handleYearChange` |
| `WeekScheduleTable.tsx` | Rendu grille, panneau latéral, navigation cyclique "non assignées", scroll animé |
| `store/weekDispatcherStore.ts` | Zustand : `currentYearId`, `years`, `residents`, `intervals`, `yearWeekTemplates`, `assignments` |

### Données — mapping `WeekTaskAllocation`

```ts
// intervals (WeekInterval[])  →  weeks (WSTWeek[])
{ weekIntervalId, dateOfStart, dateOfEnd, weekNumber, monthNumber, yearNumber }
→ { idx, num, startD, startM, endD, endM, month, monthLabel, year }

// yearWeekTemplates (YearWeekTemplate[])  →  postes (WSTPoste[])
{ yearWeekTemplateId, title }  →  { id: String(yearWeekTemplateId), name: title }

// residents (ResidentAssignment[])  →  people (Record<string, WSTPerson>)
{ residentId, firstname, lastname }
→ { [String(residentId)]: { name, initials, color: PALETTE[residentId % 12] } }

// assignments (Assignments)  →  rotation (Record<string, (string|null)[]>)
assignments[templateId][weekIntervalId]  →  rotation[String(templateId)][weekIdx]
```

### Mutations — approche optimiste

Chaque clic (assignation / retrait) met à jour le store LOCAL immédiatement, puis appelle l'API sans attendre :

```ts
// Assignation
setAssignments((prev) => { /* mise à jour optimiste */ return updated; });
dispatchOps([{ method: "create", residentId, yearWeekTemplateId, weekIntervalId }]);

// Retrait
setAssignments((prev) => ({ ...prev, [templateId]: { ...prev[templateId], [weekIntervalId]: null } }));
dispatchOps([{ method: "delete", residentId, yearWeekTemplateId, weekIntervalId }]);
```

**Collision** : si le résident est déjà sur un autre poste la même semaine, un `delete` de l'ancien poste est inclus dans le même appel API.

### Props `WeekScheduleTable`

| Prop | Type | Description |
|------|------|-------------|
| `people` | `Record<string, WSTPerson>` | Résidents : `{ name, initials, color }` |
| `postes` | `WSTPoste[]` | `{ id, name }` |
| `weeks` | `WSTWeek[]` | `{ idx, num, startD, startM, endD, endM, month, monthLabel, year }` |
| `rotation` | `Record<string, (string\|null)[]>` | `rotation[posteId][weekIdx]` = personId ou null |
| `currentWeekIdx` | `number` | Index de la semaine courante (mise en relief) |
| `onCellClick` | `(posteId, weekIdx, event) => void` | Ouvre le menu de sélection |
| `onAddPoste` | `() => void` | Ouvre le dialog d'import |
| `yearSelector` | `ReactNode` | Slot pour le `YearSelect` dans la toolbar |

### Fonctionnalités intégrées à `WeekScheduleTable`

**Largeur des colonnes** — bouton dans la toolbar, 2 modes :
- `compact` : 110px/colonne (défaut)
- `large` : 170px/colonne

Préférence persistée dans `localStorage` sous la clé `medatwork:week-dispatcher-cell-width`.

**Navigation "non assignées"** — badge rouge cliquable dans la toolbar :
- Cycle à travers toutes les cellules vides (poste par poste, semaine par semaine)
- Compteur `· N/total` affiché après le premier clic
- Scroll horizontal animé (`behavior: 'smooth'`) via `scrollRef.current.scrollTo`
- Scroll vertical via `window.scrollBy` (sans interférer avec le scroll horizontal)
- Flash violet sur la cellule ciblée pendant 1,4s
- Reset du curseur quand le nombre de cellules vides change

**Aperçu mensuel** — tuiles cliquables dans le panneau droit :
- Clic → scroll horizontal animé vers la semaine correspondante
- Outline violet sur la tuile sélectionnée

**Colonne sticky** — la colonne "Poste" reste fixe lors du scroll horizontal (`position: sticky; left: 0`).

### Tests

| Fichier | Cas couverts |
|---------|-------------|
| `WeekScheduleTable.test.tsx` | Rendu, cellules vides/assignées, badge cyclique, localStorage, panneau, callbacks, compteur X/N, aperçu mensuel, charge par MACC |
| `WeekTaskAllocation.test.tsx` | Loading/vide, mapping données, `handleYearChange`, menu, `handleResidentAssignment`, `handleRemoveAssignment`, collision inter-postes, dialog import, résilience erreur API |
| `WeekTaskAllocation.pendingChange.test.ts` | Logique `upsertPendingOp` (déduplication de slots — la fonction existe toujours mais n'est plus utilisée pour un batching différé ; les mutations sont désormais optimistes directes) |

---

## Règles d'extension

- **Ne jamais** dupliquer des valeurs de couleur en dur — utiliser `C.*`.
- **Ne jamais** recréer la structure card/wrap/headRow — importer `T.*`.
- **Toujours** utiliser `bodyRowSx(density)` sur les pages avec densité (pas `T.bodyRow`).
- Pour un badge catégoriel hors statut standard, construire le `sx` inline avec `C.*` (cf. audit log).
- Les tokens sont des `SxProps<Theme>` — compatibles avec tous les composants MUI via `sx`.
- La densité est globale (un seul localStorage) — ne pas créer de densité par page.
