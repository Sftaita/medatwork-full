import { useTranslation } from "react-i18next";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

const LANGS = [
  { value: "fr", label: "FR" },
  { value: "en", label: "EN" },
  { value: "nl", label: "NL" },
] as const;

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const handleChange = (e: SelectChangeEvent) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem("medatwork_lang", lang);
  };

  return (
    <Select
      value={i18n.language in { fr: 1, en: 1, nl: 1 } ? i18n.language : "fr"}
      onChange={handleChange}
      size="small"
      variant="outlined"
      aria-label="Langue"
      sx={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: ".04em",
        bgcolor: "background.paper",
        "& .MuiSelect-select": { py: "4px", px: "10px" },
        "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
      }}
    >
      {LANGS.map(({ value, label }) => (
        <MenuItem key={value} value={value} sx={{ fontSize: 12, fontWeight: 700 }}>
          {label}
        </MenuItem>
      ))}
    </Select>
  );
};

export default LanguageSwitcher;
