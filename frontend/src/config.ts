import env from "./env";

export const API_URL = env.VITE_API_URL;

export const LOGGIN_API = `${API_URL}login_check`;
export const YEARS_API = `${API_URL}years`;
export const MANAGERS_API = `${API_URL}managers`;
export const RESIDENTS_API = `${API_URL}residents`;
export const PERIODS_API = `${API_URL}periods`;
export const TIMESHEET_API = `${API_URL}timesheets`;
export const GARDE_API = `${API_URL}gardes`;
export const ABSENCE_API = `${API_URL}absences`;
export const MANAGER_API = `${API_URL}manager`;
export const COMMUNICATIONS_API = `${API_URL}communications`;
export const ADMIN_COMMUNICATIONS_API = `${API_URL}admin/communications`;
export const HOSPITAL_ADMIN_COMMUNICATIONS_API = `${API_URL}hospital-admin/communications`;
