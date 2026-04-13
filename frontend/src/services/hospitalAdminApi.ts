import { axiosPrivate } from "./Axios";

// ── Types ─────────────────────────────────────────────────────────────────────

export type MaccsStatus = "active" | "pending" | "incomplete" | "retired";

export interface MaccsRow {
  yrId: number;
  residentId: number | null;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
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
  dateOfStart: string;
  dateOfEnd: string;
  residentCount: number;
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

// ── Years ─────────────────────────────────────────────────────────────────────

const listMyYears = (): Promise<HospitalYear[]> =>
  axiosPrivate.get("hospital-admin/years").then((r) => r.data);

// ── MACCS ─────────────────────────────────────────────────────────────────────

const listResidents = (mode: "current" | "history" = "current"): Promise<MaccsRow[]> =>
  axiosPrivate.get(`hospital-admin/residents?mode=${mode}`).then((r) => r.data);

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
  listMyYears,
  listResidents,
  addResident,
  editYearsResident,
  retireResident,
  deleteResident,
  changeResidentYear,
  resendResidentInvite,
  previewCsvImport,
  confirmCsvImport,
  listManagers,
  addManager,
  removeManagerYear,
  deleteManager,
  resendManagerInvite,
};

export default hospitalAdminApi;
