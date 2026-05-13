import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import settingsApi, { type UserSettingsPatch, type UserSettings } from "../services/settingsApi";
import { useThemeStore } from "../store/themeStore";
import useAxiosPrivate from "./useAxiosPrivate";

const QUERY_KEY = ["user-settings"] as const;

/** Default settings — must match backend defaults. */
export const DEFAULT_SETTINGS: UserSettings = {
  theme:    "light",
  language: "fr",
  calendar: { defaultView: "month", showWeekends: true },
  notifications: { email: true, push: true, compliance: true, dailySummary: false },
};

/**
 * React Query hook for user settings.
 *
 * - On load: syncs the server theme to themeStore (which drives the ThemeProvider).
 * - Returns settings with defaults if not yet persisted server-side.
 * - staleTime: 10 minutes (preferences change rarely).
 */
export function useUserSettings() {
  useAxiosPrivate();
  const setMode = useThemeStore((s) => s.setMode);

  return useQuery({
    queryKey: QUERY_KEY,
    queryFn:  async () => {
      const res = await settingsApi.getSettings();
      // Sync theme to store immediately on load
      if (res.settings.theme) {
        setMode(res.settings.theme);
      }
      return res.settings;
    },
    staleTime:            1000 * 60 * 10,   // 10 min
    retry:                1,
    placeholderData:      DEFAULT_SETTINGS,
    meta: { suppressErrorToast: true },
  });
}

/**
 * Mutation hook for patching settings.
 * Optimistic update: applies changes immediately, rolls back on error.
 */
export function useUpdateSettings() {
  const qc      = useQueryClient();
  const setMode = useThemeStore((s) => s.setMode);

  return useMutation({
    mutationFn: (patch: UserSettingsPatch) => settingsApi.patchSettings(patch),

    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const previous = qc.getQueryData<UserSettings>(QUERY_KEY);

      // Optimistic update in cache
      qc.setQueryData<UserSettings>(QUERY_KEY, (old = DEFAULT_SETTINGS) => ({
        ...old,
        ...patch,
        calendar:      { ...old.calendar,      ...patch.calendar },
        notifications: { ...old.notifications, ...patch.notifications },
      }));

      // Apply theme immediately for instant visual feedback
      if (patch.theme) {
        setMode(patch.theme);
      }

      return { previous };
    },

    onError: (_err, _patch, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(QUERY_KEY, ctx.previous);
        // Revert theme if rollback
        if (ctx.previous.theme) setMode(ctx.previous.theme);
      }
      toast.error("Erreur lors de la sauvegarde des préférences.");
    },

    onSuccess: (res) => {
      qc.setQueryData(QUERY_KEY, res.settings);
      if (res.settings.theme) setMode(res.settings.theme);
    },
  });
}
