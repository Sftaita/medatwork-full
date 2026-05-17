import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import settingsApi, { type UserSettingsPatch, type UserSettings } from "../services/settingsApi";
import { useThemeStore } from "../store/themeStore";
import { useSidebarStore } from "../store/sidebarStore";
import useAxiosPrivate from "./useAxiosPrivate";

const QUERY_KEY = ["user-settings"] as const;

/** Default settings — must match backend defaults. */
export const DEFAULT_SETTINGS: UserSettings = {
  theme:    "light",
  language: "fr",
  calendar: {
    defaultView:  "month",
    lastUsedView: null,
    showWeekends: true,
  },
  notifications: {
    email:        true,
    push:         true,
    compliance:   true,
    dailySummary: false,
    validation:   true,
    planning:     true,
    staffPlanner: true,
  },
  ui: {
    sidebarCollapsed: false,
  },
  tables: {
    staffPlanner: {
      pageSize: 25,
      dense:    false,
    },
  },
};

/**
 * React Query hook for user settings.
 *
 * On load, server values override localStorage:
 * - theme      → themeStore (drives ThemeProvider)
 * - sidebarCollapsed → sidebarStore (drives layout)
 *
 * This ensures cross-device consistency: a preference set on another device
 * is applied after the first successful fetch, even if localStorage had a
 * different value.
 */
export function useUserSettings() {
  useAxiosPrivate();
  const setMode      = useThemeStore((s) => s.setMode);
  const setCollapsed = useSidebarStore((s) => s.setCollapsed);

  return useQuery({
    queryKey: QUERY_KEY,
    queryFn:  async () => {
      const res = await settingsApi.getSettings();
      // Server wins over localStorage for both stores
      if (res.settings.theme) {
        setMode(res.settings.theme);
      }
      setCollapsed(res.settings.ui.sidebarCollapsed);
      return res.settings;
    },
    staleTime:       1000 * 60 * 10,  // 10 min — preferences change rarely
    retry:           1,
    placeholderData: DEFAULT_SETTINGS,
    meta: { suppressErrorToast: true },
  });
}

/**
 * Mutation hook for patching settings.
 *
 * Optimistic update: applies changes immediately to the cache and to
 * the relevant stores (theme, sidebar), then rolls back on error.
 */
export function useUpdateSettings() {
  const qc           = useQueryClient();
  const setMode      = useThemeStore((s) => s.setMode);
  const setCollapsed = useSidebarStore((s) => s.setCollapsed);

  return useMutation({
    mutationFn: (patch: UserSettingsPatch) => settingsApi.patchSettings(patch),

    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const previous = qc.getQueryData<UserSettings>(QUERY_KEY);

      // Optimistic update in React Query cache
      qc.setQueryData<UserSettings>(QUERY_KEY, (old = DEFAULT_SETTINGS) => ({
        ...old,
        ...patch,
        calendar:      { ...old.calendar,      ...patch.calendar },
        notifications: { ...old.notifications, ...patch.notifications },
        ui:            { ...old.ui,            ...patch.ui },
        tables: {
          ...old.tables,
          staffPlanner: { ...old.tables.staffPlanner, ...patch.tables?.staffPlanner },
        },
      }));

      // Instant visual feedback for stores
      if (patch.theme) {
        setMode(patch.theme);
      }
      if (patch.ui?.sidebarCollapsed !== undefined) {
        setCollapsed(patch.ui.sidebarCollapsed);
      }

      return { previous };
    },

    onError: (_err, patch, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(QUERY_KEY, ctx.previous);
        if (ctx.previous.theme) setMode(ctx.previous.theme);
        // Rollback sidebar if the patch had changed it
        if (patch.ui?.sidebarCollapsed !== undefined) {
          setCollapsed(ctx.previous.ui.sidebarCollapsed);
        }
      }
      toast.error("Erreur lors de la sauvegarde des préférences.");
    },

    onSuccess: (res) => {
      qc.setQueryData(QUERY_KEY, res.settings);
      if (res.settings.theme) setMode(res.settings.theme);
      // Confirm sidebar state from server (in case server corrected the value)
      setCollapsed(res.settings.ui.sidebarCollapsed);
    },
  });
}
