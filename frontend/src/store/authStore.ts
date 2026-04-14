import { create } from "zustand";
import type { AuthState } from "@/types/auth";

interface AuthStore {
  authentication: AuthState;
  setAuthentication: (updater: AuthState | ((prev: AuthState) => AuthState)) => void;
  selectedMenuItem: Record<string, unknown>;
  setSelectedMenuItem: (item: Record<string, unknown>) => void;
}

const INITIAL_AUTH: AuthState = {
  AccessToken: null,
  isAuthenticated: false,
  firstname: "",
  lastname: "",
  role: null,
  gender: "",
  hospitalId: null,
  avatarUrl: null,
};

export const useAuthStore = create<AuthStore>((set) => ({
  authentication: INITIAL_AUTH,
  setAuthentication: (updater) =>
    set((state) => ({
      authentication: typeof updater === "function" ? updater(state.authentication) : updater,
    })),
  selectedMenuItem: {},
  setSelectedMenuItem: (item) => set({ selectedMenuItem: item }),
}));
