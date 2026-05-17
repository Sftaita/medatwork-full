import { axiosPrivate } from "./Axios";

// ── Types ─────────────────────────────────────────────────────────────────────

export type UserRole = "manager" | "resident" | "hospital_admin" | "app_admin";

export interface ProfileAccount {
  role:         UserRole;
  firstname:    string;
  lastname:     string;
  email:        string;
  avatarUrl:    string | null;
  // manager
  sexe?:        "male" | "female";
  job?:         string | null;
  // resident
  speciality?:  string | null;
  university?:  string | null;
  dateOfMaster?: string | null;  // YYYY-MM-DD
  // hospital_admin
  hospitalName?: string;
}

export interface ProfileAccountPatch {
  firstname?:    string;
  lastname?:     string;
  sexe?:         "male" | "female";
  // manager
  job?:          string | null;
  // resident
  speciality?:   string | null;
  university?:   string | null;
  dateOfMaster?: string | null;
}

// ── API ───────────────────────────────────────────────────────────────────────

const getAccount = (): Promise<ProfileAccount> =>
  axiosPrivate.get("profile/account").then((r) => r.data);

const patchAccount = (patch: ProfileAccountPatch): Promise<ProfileAccount> =>
  axiosPrivate.patch("profile/account", patch).then((r) => r.data);

const patchPassword = (body: {
  currentPassword: string;
  newPassword:     string;
  confirmPassword: string;
}): Promise<void> =>
  axiosPrivate.patch("profile/password", body).then(() => undefined);

const profileAccountApi = { getAccount, patchAccount, patchPassword };
export default profileAccountApi;
