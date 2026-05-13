import { axiosPrivate } from "./Axios";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CalendarSettings {
  defaultView: "month" | "week" | "day" | "list";
  showWeekends: boolean;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  compliance: boolean;
  dailySummary: boolean;
}

export interface UserSettings {
  theme: "light" | "dark";
  language: "fr" | "nl" | "en";
  calendar: CalendarSettings;
  notifications: NotificationSettings;
}

export interface UserSettingsPatch {
  theme?: "light" | "dark";
  language?: "fr" | "nl" | "en";
  calendar?: Partial<CalendarSettings>;
  notifications?: Partial<NotificationSettings>;
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
