import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { specialityLinks } from "../doc/lists";

// Re-export pour les consommateurs qui ont besoin de la liste brute
export { specialityLinks };

// ── Composant ─────────────────────────────────────────────────────────────────

interface SpecialitySelectProps {
  /** Valeur stockée en base — clé courte ("cardio", "neurology"…) ou "" si non défini */
  value:     string;
  onChange:  (value: string) => void;
  disabled?: boolean;
  size?:     "small" | "medium";
  fullWidth?: boolean;
}

/**
 * Select réutilisable pour la spécialité médicale.
 *
 * Utilise la liste canonique `specialityLinks` de `doc/lists.tsx`.
 * La valeur stockée est la clé courte (ex. "cardio"), le label affiché
 * est le libellé français (ex. "Cardiologie").
 *
 * L'option "— Non défini —" (value = "") vide le champ.
 */
const SpecialitySelect = ({
  value,
  onChange,
  disabled  = false,
  size      = "small",
  fullWidth = true,
}: SpecialitySelectProps) => {
  const handleChange = (e: SelectChangeEvent<string>) => onChange(e.target.value);

  return (
    <FormControl size={size} fullWidth={fullWidth} disabled={disabled}>
      <InputLabel id="speciality-label">Spécialité</InputLabel>
      <Select
        labelId="speciality-label"
        label="Spécialité"
        value={value}
        onChange={handleChange}
      >
        <MenuItem value="">
          <em>— Non défini —</em>
        </MenuItem>
        {specialityLinks.map((s) => (
          <MenuItem key={s.value} value={s.value}>
            {s.title}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default SpecialitySelect;
