import { axiosPrivate } from "./Axios";
import type {
  Hospital,
  HospitalYear,
  HospitalRequest,
  AdminManager,
  AdminResident,
  AdminHospitalAdmin,
  HospitalYearResident,
} from "../types/entities";

// ── Hospitals ─────────────────────────────────────────────────────────────────

const getHospital = (id: number): Promise<Hospital> =>
  axiosPrivate.get(`admin/hospitals/${id}`).then((r) => r.data);

const listHospitals = (): Promise<Hospital[]> =>
  axiosPrivate.get("admin/hospitals").then((r) => r.data);

const createHospital = (data: {
  name: string;
  city?: string;
  country?: string;
}): Promise<Hospital> => axiosPrivate.post("admin/hospitals", data).then((r) => r.data);

const toggleHospital = (id: number): Promise<{ isActive: boolean }> =>
  axiosPrivate.patch(`admin/hospitals/${id}/toggle`).then((r) => r.data);

// ── Years ─────────────────────────────────────────────────────────────────────

const listHospitalYears = (hospitalId: number): Promise<HospitalYear[]> =>
  axiosPrivate.get(`admin/hospitals/${hospitalId}/years`).then((r) => r.data);

const createHospitalYear = (
  hospitalId: number,
  data: {
    title: string;
    dateOfStart: string;
    dateOfEnd: string;
    location: string;
    speciality?: string;
    comment?: string;
  }
): Promise<HospitalYear> =>
  axiosPrivate.post(`admin/hospitals/${hospitalId}/years`, data).then((r) => r.data);

// ── Years (super-admin global view) ──────────────────────────────────────────

const listAllYears = (): Promise<HospitalYear[]> =>
  axiosPrivate.get("admin/years").then((r) => r.data);

const assignYearHospital = (yearId: number, hospitalId: number): Promise<HospitalYear> =>
  axiosPrivate.patch(`admin/years/${yearId}/hospital`, { hospitalId }).then((r) => r.data);

// ── Hospital Admins (super-admin management) ──────────────────────────────────

const listHospitalAdmins = (): Promise<AdminHospitalAdmin[]> =>
  axiosPrivate.get("admin/hospital-admins").then((r) => r.data);

const listHospitalAdminsForHospital = (
  hospitalId: number
): Promise<Omit<AdminHospitalAdmin, "hospital">[]> =>
  axiosPrivate.get(`admin/hospitals/${hospitalId}/admins`).then((r) => r.data);

const inviteHospitalAdmin = (hospitalId: number, email: string): Promise<void> =>
  axiosPrivate.post(`admin/hospitals/${hospitalId}/admins`, { email }).then(() => undefined);

const promoteManagerToAdmin = (hospitalId: number, managerId: number): Promise<void> =>
  axiosPrivate
    .post(`admin/hospitals/${hospitalId}/admins/from-manager`, { managerId })
    .then(() => undefined);

const listHospitalManagers = (hospitalId: number): Promise<AdminManager[]> =>
  axiosPrivate.get(`admin/hospitals/${hospitalId}/managers`).then((r) => r.data);

const addManagerToHospital = (hospitalId: number, managerId: number): Promise<void> =>
  axiosPrivate.post(`admin/hospitals/${hospitalId}/managers`, { managerId }).then(() => undefined);

const removeManagerFromHospital = (hospitalId: number, managerId: number): Promise<void> =>
  axiosPrivate.delete(`admin/hospitals/${hospitalId}/managers/${managerId}`).then(() => undefined);

const deleteHospitalAdmin = (id: number): Promise<void> =>
  axiosPrivate.delete(`admin/hospital-admins/${id}`).then(() => undefined);

const reinviteHospitalAdmin = (id: number): Promise<void> =>
  axiosPrivate.post(`admin/hospital-admins/${id}/reinvite`).then(() => undefined);

const unpromoteManager = (hospitalId: number, managerId: number): Promise<void> =>
  axiosPrivate
    .delete(`admin/hospitals/${hospitalId}/admins/promoted/${managerId}`)
    .then(() => undefined);

// ── Residents (super-admin view) ──────────────────────────────────────────────

const listResidents = (): Promise<AdminResident[]> =>
  axiosPrivate.get("admin/users/residents").then((r) => r.data);

const activateResident = (id: number): Promise<void> =>
  axiosPrivate.post(`admin/users/residents/${id}/activate`).then(() => undefined);

const resetResidentPassword = (id: number): Promise<void> =>
  axiosPrivate.post(`admin/users/residents/${id}/reset-password`).then(() => undefined);

// ── Hospital Admin (authenticated) ───────────────────────────────────────────

const listMyYears = (): Promise<HospitalYear[]> =>
  axiosPrivate.get("hospital-admin/years").then((r) => r.data);

const listYearResidents = (yearId: number): Promise<HospitalYearResident[]> =>
  axiosPrivate.get(`hospital-admin/years/${yearId}/residents`).then((r) => r.data);

// ── Hospital Requests ─────────────────────────────────────────────────────────

const listRequests = (): Promise<HospitalRequest[]> =>
  axiosPrivate.get("admin/hospital-requests").then((r) => r.data);

const approveRequest = (id: number): Promise<{ message: string; hospitalId: number }> =>
  axiosPrivate.post(`admin/hospital-requests/${id}/approve`).then((r) => r.data);

const rejectRequest = (id: number): Promise<{ message: string }> =>
  axiosPrivate.post(`admin/hospital-requests/${id}/reject`).then((r) => r.data);

// ── Users ─────────────────────────────────────────────────────────────────────

const listManagers = (): Promise<AdminManager[]> =>
  axiosPrivate.get("admin/users/managers").then((r) => r.data);

const getManagerStats = (): Promise<{
  total: number;
  active: number;
  inactive: number;
  pending: number;
  notActivated: number;
}> => axiosPrivate.get("admin/stats/managers").then((r) => r.data);

const toggleManagerStatus = (id: number): Promise<{ status: string }> =>
  axiosPrivate.patch(`admin/users/managers/${id}/status`).then((r) => r.data);

const deleteManager = (id: number): Promise<void> =>
  axiosPrivate.delete(`admin/users/managers/${id}`).then(() => undefined);

const resetManagerPassword = (id: number): Promise<void> =>
  axiosPrivate.post(`admin/users/managers/${id}/reset-password`).then(() => undefined);

const activateManager = (id: number): Promise<void> =>
  axiosPrivate.post(`admin/users/managers/${id}/activate`).then(() => undefined);

const adminApi = {
  getHospital,
  listAllYears,
  assignYearHospital,
  listHospitalAdmins,
  listHospitalAdminsForHospital,
  inviteHospitalAdmin,
  promoteManagerToAdmin,
  listHospitalManagers,
  addManagerToHospital,
  removeManagerFromHospital,
  deleteHospitalAdmin,
  reinviteHospitalAdmin,
  unpromoteManager,
  listResidents,
  activateResident,
  resetResidentPassword,
  listMyYears,
  listYearResidents,
  listHospitals,
  createHospital,
  toggleHospital,
  listHospitalYears,
  createHospitalYear,
  listRequests,
  approveRequest,
  rejectRequest,
  listManagers,
  getManagerStats,
  toggleManagerStatus,
  deleteManager,
  resetManagerPassword,
  activateManager,
};

export default adminApi;
