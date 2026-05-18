import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useUserSettings } from "./useUserSettings";
import useAuth from "./useAuth";

/**
 * Synchronises the i18next language with the user's backend preference.
 * Falls back to localStorage then 'fr' if no preference is set.
 * Must be called inside the authenticated layout.
 */
const useLanguageSync = () => {
  const { i18n } = useTranslation();
  const { authentication } = useAuth();
  const { data: settings } = useUserSettings();

  useEffect(() => {
    if (!authentication.isAuthenticated) return;
    const lang = settings?.language;
    if (lang && ["fr", "en", "nl"].includes(lang) && lang !== i18n.language) {
      i18n.changeLanguage(lang);
      localStorage.setItem("medatwork_lang", lang);
    }
  }, [settings?.language, authentication.isAuthenticated, i18n]);
};

export default useLanguageSync;
