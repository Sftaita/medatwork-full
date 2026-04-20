import type { Role } from "./entities";

export interface AuthState {
  AccessToken: string | null;
  isAuthenticated: boolean;
  firstname: string;
  lastname: string;
  role: Role | null;
  gender: string;
  hospitalId?: number | null;
  hospitalName?: string | null;
  avatarUrl?: string | null;
  canCreateYear?: boolean;
}

export const AUTH_INITIAL_STATE: AuthState = {
  AccessToken: null,
  isAuthenticated: false,
  firstname: "",
  lastname: "",
  role: null,
  gender: "",
  hospitalId: null,
  hospitalName: null,
  avatarUrl: null,
};

/** Shape returned by the /token/refresh endpoint */
export interface RefreshTokenResponse {
  token: string;
  firstname: string;
  lastname: string;
  role: Role;
  gender: string;
  hospitalId?: number | null;
  hospitalName?: string | null;
  avatarUrl?: string | null;
  canCreateYear?: boolean;
}
