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
  /** Fonction du manager (null pour les non-managers) */
  job?: string | null;
  /** ID de l'entité Manager — utilisé pour empêcher un manager de modifier ses propres droits */
  managerId?: number | null;
  /** false → l'utilisateur doit accepter les CGU avant d'accéder à l'app */
  cgvAccepted?: boolean;
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
  job?: string | null;
  managerId?: number | null;
  cgvAccepted?: boolean;
}
