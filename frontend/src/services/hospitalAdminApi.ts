import { axiosPrivate } from "./Axios";

// ── Types ─────────────────────────────────────────────────────────────────────

export type MaccsStatus = "active" | "pending" | "not_registered" | "retired";
export type YearStatus = "draft" | "active" | "closed" | "archived";

export interface MaccsRow {
  yrId: number;
  residentId: number | null;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  avatarUrl: string | null;
  yearId: number | null;
  yearTitle: string | null;
  optingOut: boolean | null;
  allowed: boolean;
  status: MaccsStatus;
  createdAt: string;
}

export interface HospitalYear {
  id: number;
  title: string;
  period: string;
  location: string;
  speciality: string | null;
  comment: string | null;
  status: YearStatus;
  dateOfStart: string;
  dateOfEnd: string;
  residentCount: number;
  managerCount: number;
  token?: string;
  residents?: { firstname: string; lastname: string }[];
  managers?: { firstname: string; lastname: string }[];
}

export interface YearInput {
  title: string;
  location: string;
  period: string;
  dateOfStart: string;
  dateOfEnd: string;
  speciality?: string;
  comment?: string;
  status?: YearStatus;
}

export type ManagerStatus = "active" | "pending" | "incomplete";

export interface ManagerRow {
  myId: number;
  managerId: number | null;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  job: string | null;
  yearId: number | null;
  yearTitle: string | null;
  status: ManagerStatus;
}

export interface CsvImportResult {
  preview: boolean;
  created: { email: string; firstname: string; lastname: string; yearTitle: string }[];
  attached: { email: string; firstname: string; lastname: string; yearTitle: string }[];
  errors: { line: number; email?: string; reason: string }[];
}

export interface DashboardStats {
  maccs: { active: number; pending: number; incomplete: number; retired: number; total: number };
  managers: { active: number; pending: number; incomplete: number; total: number };
  pendingInvites: number;
  totalYears: number;
  activeYears: { id: number; title: string; status: YearStatus; dateEnd: string; maccs: number; managers: number }[];
}

export interface AuditLogEntry {
  id: number;
  adminName: string;
  action: string;
  entityType: string;
  entityId: number | null;
  description: string;
  createdAt: string;
}

export interface AuditLogResponse {
  total: number;
  logs: AuditLogEntry[];
}

// ── Years ─────────────────────────────────────────────────────────────────────

const listMyYears = (): Promise<HospitalYear[]> =>
  axiosPrivate.get("hospital-admin/years").then((r) => r.data);

const createYear = (data: YearInput): Promise<HospitalYear> =>
  axiosPrivate.post("hospital-admin/years", data).then((r) => r.data);

const updateYear = (id: number, data: Partial<YearInput> & { status?: YearStatus }): Promise<HospitalYear> =>
  axiosPrivate.patch(`hospital-admin/years/${id}`, data).then((r) => r.data);

const deleteYear = (id: number): Promise<void> =>
  axiosPrivate.delete(`hospital-admin/years/${id}`).then(() => undefined);

const forceDeleteYear = (id: number): Promise<void> =>
  axiosPrivate.delete(`hospital-admin/years/${id}/force`).then(() => undefined);

// ── Dashboard stats ───────────────────────────────────────────────────────────

const getDashboardStats = (): Promise<DashboardStats> =>
  axiosPrivate.get("hospital-admin/dashboard/stats").then((r) => r.data);

// ── Audit log ─────────────────────────────────────────────────────────────────

const getAuditLog = (limit = 50, offset = 0): Promise<AuditLogResponse> =>
  axiosPrivate.get(`hospital-admin/audit-log?limit=${limit}&offset=${offset}`).then((r) => r.data);

// ── MACCS ─────────────────────────────────────────────────────────────────────

const listResidents = (mode: "current" | "history" = "current"): Promise<MaccsRow[]> =>
  axiosPrivate.get(`hospital-admin/residents?mode=${mode}`).then((r) => r.data);

const listYearResidents = (yearId: number): Promise<MaccsRow[]> =>
  axiosPrivate.get(`hospital-admin/years/${yearId}/residents`).then((r) => r.data);

const addResident = (data: {
  firstname: string;
  lastname: string;
  email: string;
  optingOut: boolean;
  yearId: number;
}): Promise<MaccsRow> => axiosPrivate.post("hospital-admin/residents", data).then((r) => r.data);

const editYearsResident = (yrId: number, data: { optingOut: boolean }): Promise<MaccsRow> =>
  axiosPrivate.patch(`hospital-admin/years-residents/${yrId}`, data).then((r) => r.data);

const retireResident = (yrId: number): Promise<void> =>
  axiosPrivate.delete(`hospital-admin/years-residents/${yrId}`).then(() => undefined);

const changeResidentYear = (yrId: number, newYearId: number): Promise<MaccsRow> =>
  axiosPrivate
    .post(`hospital-admin/years-residents/${yrId}/change-year`, { newYearId })
    .then((r) => r.data);

const deleteResident = (residentId: number): Promise<void> =>
  axiosPrivate.delete(`hospital-admin/residents/${residentId}`).then(() => undefined);

const resendResidentInvite = (yrId: number): Promise<void> =>
  axiosPrivate.post(`hospital-admin/years-residents/${yrId}/resend-invite`).then(() => undefined);

const bulkEditResidents = (yrIds: number[], changes: { optingOut?: boolean }): Promise<{ updated: number }> =>
  axiosPrivate.post("hospital-admin/residents/bulk-edit", { yrIds, changes }).then((r) => r.data);

const exportResidentsCsv = (mode: "current" | "history" = "current", yearId?: number): Promise<Blob> => {
  const params = new URLSearchParams({ mode });
  if (yearId) params.set("yearId", String(yearId));
  return axiosPrivate
    .get(`hospital-admin/residents/export?${params.toString()}`, { responseType: "blob" })
    .then((r) => r.data);
};

// ── Managers ──────────────────────────────────────────────────────────────────

const listManagers = (mode: "current" | "history" = "current"): Promise<ManagerRow[]> =>
  axiosPrivate.get(`hospital-admin/managers?mode=${mode}`).then((r) => r.data);

const addManager = (data: {
  firstname: string;
  lastname: string;
  email: string;
  yearId: number;
}): Promise<ManagerRow> => axiosPrivate.post("hospital-admin/managers", data).then((r) => r.data);

const removeManagerYear = (myId: number): Promise<void> =>
  axiosPrivate.delete(`hospital-admin/manager-years/${myId}`).then(() => undefined);

const deleteManager = (managerId: number): Promise<void> =>
  axiosPrivate.delete(`hospital-admin/managers/${managerId}`).then(() => undefined);

const resendManagerInvite = (myId: number): Promise<void> =>
  axiosPrivate.post(`hospital-admin/manager-years/${myId}/resend-invite`).then(() => undefined);

// ── CSV import ────────────────────────────────────────────────────────────────

const previewCsvImport = (file: File): Promise<CsvImportResult> => {
  const form = new FormData();
  form.append("csv", file);
  return axiosPrivate
    .post("hospital-admin/residents/import?preview=true", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

const confirmCsvImport = (file: File): Promise<CsvImportResult> => {
  const form = new FormData();
  form.append("csv", file);
  return axiosPrivate
    .post("hospital-admin/residents/import", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

const hospitalAdminApi = {
  // years
  listMyYears,
  createYear,
  updateYear,
  deleteYear,
  forceDeleteYear,
  // dashboard
  getDashboardStats,
  // audit
  getAuditLog,
  // maccs
  listResidents,
  listYearResidents,
  addResident,
  editYearsResident,
  retireResident,
  deleteResident,
  changeResidentYear,
  resendResidentInvite,
  bulkEditResidents,
  exportResidentsCsv,
  // csv
  previewCsvImport,
  confirmCsvImport,
  // managers
  listManagers,
  addManager,
  removeManagerYear,
  deleteManager,
  resendManagerInvite,
};

export default hospitalAdminApi;
