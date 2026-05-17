import { axiosPrivate } from "./Axios";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CalendarSettings {
  defaultView:  "month" | "week" | "day" | "list";
  lastUsedView: "month" | "week" | "day" | "list" | null;
  showWeekends: boolean;
}

export interface NotificationSettings {
  email:        boolean;
  push:         boolean;
  compliance:   boolean;
  dailySummary: boolean;
  validation:   boolean;
  planning:     boolean;
  staffPlanner: boolean;
}

export interface UiSettings {
  sidebarCollapsed: boolean;
}

export interface StaffPlannerTableSettings {
  pageSize: 25 | 50 | 100 | 200;
  dense:    boolean;
}

export interface TablesSettings {
  staffPlanner: StaffPlannerTableSettings;
}

export interface UserSettings {
  theme:         "light" | "dark";
  language:      "fr" | "nl" | "en";
  calendar:      CalendarSettings;
  notifications: NotificationSettings;
  ui:            UiSettings;
  tables:        TablesSettings;
}

export interface UserSettingsPatch {
  theme?:    "light" | "dark";
  language?: "fr" | "nl" | "en";
  calendar?: Partial<CalendarSettings>;
  notifications?: Partial<NotificationSettings>;
  ui?: Partial<UiSettings>;
  tables?: {
    staffPlanner?: Partial<StaffPlannerTableSettings>;
  };
}

export interface UserSettingsResponse {
  userType: string;
  settings: UserSettings;
}

// ── API ───────────────────────────────────────────────────────────────────────

const getSettings = (): Promise<UserSettingsResponse> =>
  axiosPrivate.get("user/settings").then((r) => r.data);

const patchSettings = (patch: UserSettingsPatch): Promise<UserSettingsResponse> =>
  axiosPrivate.patch("user/settings", patch).then((r) => r.data);

const settingsApi = { getSettings, patchSettings };
export default settingsApi;
