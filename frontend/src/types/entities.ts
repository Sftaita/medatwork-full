/**
 * Domain types — mirror the Symfony entities.
 * All dates come from the API as ISO 8601 strings.
 */

export type Role = "manager" | "resident" | "super_admin" | "hospital_admin";

// ─── Admin entities ───────────────────────────────────────────────────────────

export interface AdminManager {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  status: string;
  validatedAt: string | null;
  hospitals: { id: number; name: string }[];
}

export interface Hospital {
  id: number;
  name: string;
  city: string | null;
  country: string;
  isActive: boolean;
}

export interface HospitalYear {
  id: number;
  title: string;
  period: string;
  location: string;
  speciality: string | null;
  dateOfStart: string;
  dateOfEnd: string;
  residentCount?: number;
  token?: string;
  residents?: Array<{ firstname: string; lastname: string }>;
  managers?: Array<{ firstname: string; lastname: string }>;
  hospital?: { id: number; name: string } | null;
}

export interface HospitalYearResident {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
}

export interface AdminResident {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  validatedAt: string | null;
}

export interface AdminHospitalAdmin {
  id: number;
  email: string;
  firstname: string | null;
  lastname: string | null;
  status: string;
  hospital: { id: number; name: string };
  createdAt: string;
  type: "invited" | "promoted";
}

export interface HospitalRequest {
  id: number;
  hospitalName: string;
  createdAt: string;
  requestedBy: {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
  };
}
export type Sexe = "male" | "female";

// ─── Users ───────────────────────────────────────────────────────────────────

export interface Manager {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  role: Role;
  sexe: Sexe;
  job: string;
  hospital: string;
  validatedAt: string | null;
  createdAt: string | null;
}

export interface Resident {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  role: Role;
  sexe: Sexe;
  speciality: string | null;
  dateOfMaster: string;
  dateOfBirth: string | null;
  university: string | null;
  validatedAt: string | null;
  createdAt: string | null;
}

export type User = Manager | Resident;

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthState {
  accessToken: string | null;
  roles: string[];
  id: number | null;
}

// ─── Years ───────────────────────────────────────────────────────────────────

export interface Year {
  id: number;
  title: string | null;
  comment: string | null;
  period: string;
  location: string;
  speciality: string | null;
  dateOfStart: string;
  dateOfEnd: string;
  createdAt: string;
  master: number | null;
}

export interface YearResident {
  id: number;
  year: Year | null;
  resident: Resident | null;
  allowed: boolean;
  dateOfStart: string | null;
  holidays: number | null;
  scientificDays: number | null;
  scientificLeaves: number;
  legalLeaves: number;
  optingOut: boolean | null;
  paternityLeave: number | null;
  maternityLeave: number | null;
  unpaidLeave: number;
  createdAt: string;
}

// ─── Activities ──────────────────────────────────────────────────────────────

export interface Timesheet {
  id: number;
  dateOfStart: string;
  dateOfEnd: string;
  pause: number | null;
  scientific: number | null;
  called: boolean | null;
  isEditable: boolean;
  createdAt: string | null;
}

export type AbsenceType =
  | "holiday"
  | "scientificDay"
  | "scientificLeave"
  | "legalLeave"
  | "paternityLeave"
  | "maternityLeave"
  | "unpaidLeave";

export interface Absence {
  id: number;
  type: AbsenceType;
  dateOfStart: string | null;
  dateOfEnd: string | null;
  isEditable: boolean;
  createdAt: string | null;
}

export type GardeType = string;

export interface Garde {
  id: number;
  type: GardeType;
  dateOfStart: string;
  dateOfEnd: string;
  comment: string | null;
  isEditable: boolean;
  createdAt: string;
}

// ─── Validation ──────────────────────────────────────────────────────────────

export interface PeriodValidation {
  id: number;
  month: number;
  yearNb: number;
  validated: boolean;
  validatedAt: string | null;
  unvalidatedAt: string | null;
  endLimite: string | null;
  validatedBy: Manager | null;
}

// ─── Communication ───────────────────────────────────────────────────────────

export type CommMessageType = "notification" | "modal";
export type CommScopeType = "all" | "role" | "user";
export type CommTargetRole = "manager" | "resident" | "hospital_admin";

export interface CommunicationMessage {
  id: number;
  type: CommMessageType;
  title: string;
  body: string;
  imageUrl: string | null;
  linkUrl: string | null;
  buttonLabel: string | null;
  targetUrl: string | null;
  scopeType: CommScopeType;
  targetRole: CommTargetRole | null;
  targetUserId: number | null;
  targetUserType: CommTargetRole | null;
  hospital: { id: number; name: string } | null;
  isActive: boolean;
  authorType: string;
  authorId: number;
  readCount: number;
  createdAt: string;
}

/** Returned by user-facing endpoints — includes read state for the current user */
export interface CommNotification {
  id: number;
  type: CommMessageType;
  title: string;
  body: string;
  imageUrl: string | null;
  linkUrl: string | null;
  buttonLabel: string | null;
  targetUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface CommUserTarget {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  type: CommTargetRole;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface Notification {
  id: number;
  message: string;
  read: boolean;
  createdAt: string;
}

// ─── API responses ───────────────────────────────────────────────────────────

export interface ApiError {
  message: string;
  code?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
}
