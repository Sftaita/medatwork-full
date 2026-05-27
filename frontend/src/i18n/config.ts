import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./locales/fr.json";
import en from "./locales/en.json";
import nl from "./locales/nl.json";

const SUPPORTED = ["fr", "en", "nl"];

const resolveLang = (): string => {
  const stored = localStorage.getItem("medatwork_lang");
  if (stored && SUPPORTED.includes(stored)) return stored;

  // In test mode, jsdom's navigator.language is typically "en-US" which would
  // resolve to "en". Default to "fr" so tests always start in French without
  // requiring a localStorage override.
  if (import.meta.env.MODE === "test") return "fr";

  const browser = navigator.language?.split("-")[0]?.toLowerCase() ?? "";
  return SUPPORTED.includes(browser) ? browser : "fr";
};

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
    nl: { translation: nl },
  },
  lng: resolveLang(),
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
});

export default i18n;
