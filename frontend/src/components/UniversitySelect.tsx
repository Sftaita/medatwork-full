import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { belgianMedicalUniversities } from "../doc/lists";

export { belgianMedicalUniversities };

interface UniversitySelectProps {
  /** Valeur stockée en base — clé courte ("uclouvain", "ulb"…) ou "" si non défini */
  value:     string;
  onChange:  (value: string) => void;
  disabled?: boolean;
  size?:     "small" | "medium";
  fullWidth?: boolean;
}

/**
 * Select réutilisable pour l'université médicale belge.
 *
 * Utilise la liste canonique `belgianMedicalUniversities` de `doc/lists.tsx`.
 * La valeur stockée est la clé courte (ex. "uclouvain"), le label affiché
 * est le nom complet (ex. "UCLouvain — Université catholique de Louvain").
 *
 * L'option "— Non défini —" (value = "") vide le champ.
 */
const UniversitySelect = ({
  value,
  onChange,
  disabled  = false,
  size      = "small",
  fullWidth = true,
}: UniversitySelectProps) => {
  const handleChange = (e: SelectChangeEvent<string>) => onChange(e.target.value);

  return (
    <FormControl size={size} fullWidth={fullWidth} disabled={disabled}>
      <InputLabel id="university-label">Université</InputLabel>
      <Select
        labelId="university-label"
        label="Université"
        value={value}
        onChange={handleChange}
      >
        <MenuItem value="">
          <em>— Non défini —</em>
        </MenuItem>
        {belgianMedicalUniversities.map((u) => (
          <MenuItem key={u.value} value={u.value}>
            {u.title}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default UniversitySelect;
