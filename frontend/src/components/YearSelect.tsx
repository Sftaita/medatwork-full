/**
 * YearSelect — Sélecteur d'année avec recherche intégrée.
 *
 * @description
 * Composant réutilisable permettant de sélectionner une année parmi une liste
 * fournie par l'API `hospital-admin/years`. Les années sont triées du plus récent
 * au plus ancien (par dateOfStart DESC). Un champ de recherche permet de filtrer
 * par titre ou période.
 *
 * Utilisation typique :
 * ```tsx
 * import YearSelect from "@/components/YearSelect";
 *
 * <YearSelect
 *   years={allYears}
 *   value={selectedYearId}
 *   onChange={(id) => setSelectedYearId(id)}
 *   label="Année académique"
 *   required
 * />
 * ```
 *
 * Props :
 * - `years`     — liste des années (HospitalYear[]) déjà récupérée depuis l'API
 * - `value`     — id de l'année sélectionnée (number | "")
 * - `onChange`  — callback reçevant l'id sélectionné (number | "")
 * - `label`     — label du champ (défaut : "Année académique")
 * - `required`  — rend le champ obligatoire (astérisque)
 * - `disabled`  — désactive le sélecteur
 * - `size`      — taille MUI ("small" | "medium", défaut "small")
 * - `disabledYearIds` — ids à afficher comme désactivés (ex : déjà attribués)
 *
 * Référencé dans : docs/ARCHITECTURE.md § Composants réutilisables
 */

import { useState, useMemo, useRef } from "react";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";

import type { HospitalYear } from "../services/hospitalAdminApi";

// ── Types ────────────────────────────────────────────────────────────────────

export interface YearSelectProps {
  years: HospitalYear[];
  value: number | "";
  onChange: (yearId: number | "") => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  size?: "small" | "medium";
  disabledYearIds?: Set<number>;
}

// ── Sort helper ───────────────────────────────────────────────────────────────

/**
 * Tri les années du plus récent au plus ancien (dateOfStart DESC).
 * Années sans dateOfStart placées en fin de liste.
 */
export function sortYearsNewestFirst(years: HospitalYear[]): HospitalYear[] {
  return [...years].sort((a, b) => {
    if (!a.dateOfStart) return 1;
    if (!b.dateOfStart) return -1;
    return b.dateOfStart.localeCompare(a.dateOfStart);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

const YearSelect = ({
  years,
  value,
  onChange,
  label = "Année académique",
  required = false,
  disabled = false,
  size = "small",
  disabledYearIds,
}: YearSelectProps) => {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const sorted = useMemo(() => sortYearsNewestFirst(years), [years]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (y) =>
        y.title.toLowerCase().includes(q) ||
        (y.period ?? "").toLowerCase().includes(q) ||
        (y.location ?? "").toLowerCase().includes(q),
    );
  }, [sorted, search]);

  const handleChange = (e: SelectChangeEvent<number | "">) => {
    onChange(e.target.value as number | "");
  };

  return (
    <FormControl fullWidth size={size} required={required} disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select<number | "">
        value={value}
        label={label}
        onChange={handleChange}
        renderValue={(selected) => {
          if (selected === "") return <em>Sélectionner une année</em>;
          const year = years.find((y) => y.id === selected);
          return year ? year.title : String(selected);
        }}
        MenuProps={{
          PaperProps: { sx: { height: 380, display: "flex", flexDirection: "column" } },
          MenuListProps: { sx: { flex: 1, overflow: "auto", py: 0 } },
          disableAutoFocusItem: true,
          TransitionProps: {
            onEntered: () => inputRef.current?.focus(),
          },
        }}
      >
        {/* Search field pinned at the top of the dropdown.
            onMouseDown preventDefault prevents the Select from losing focus
            (which would close the menu) when the user clicks inside the TextField. */}
        <Box
          onKeyDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.preventDefault()}
          sx={{ px: 1.5, pt: 1, pb: 0.5, position: "sticky", top: 0, bgcolor: "background.paper", zIndex: 1 }}
        >
          <TextField
            size="small"
            fullWidth
            placeholder="Rechercher une année…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            inputRef={inputRef}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            inputProps={{ "aria-label": "Rechercher une année" }}
          />
        </Box>

        {filtered.length === 0 && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">Aucune année trouvée</Typography>
          </MenuItem>
        )}

        {filtered.map((y) => {
          const isDisabled = disabledYearIds?.has(y.id) ?? false;
          return (
            <MenuItem key={y.id} value={y.id} disabled={isDisabled}>
              <Box>
                <Typography variant="body2" fontWeight={600} component="span">
                  {y.title}
                </Typography>
                {y.period && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {y.period}{y.location ? ` — ${y.location}` : ""}
                    {isDisabled ? " (déjà attribué)" : ""}
                  </Typography>
                )}
              </Box>
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
};

export default YearSelect;
