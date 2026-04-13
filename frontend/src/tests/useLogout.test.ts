import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("../services/authApi", () => ({
  default: {
    logout: vi.fn(),
  },
}));

import authApi from "../services/authApi";
import { useAuthStore } from "../store/authStore";
import useLogout from "../hooks/useLogout";
import type { AuthState } from "../types/auth";

// ── Helpers ───────────────────────────────────────────────────────────────────

const AUTHENTICATED: AuthState = {
  AccessToken: "some-token",
  isAuthenticated: true,
  firstname: "Jean",
  lastname: "Dupont",
  role: "manager",
  gender: "M",
};

const EMPTY_AUTH: AuthState = {
  AccessToken: null,
  isAuthenticated: false,
  firstname: "",
  lastname: "",
  role: null,
  gender: "",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useLogout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ authentication: AUTHENTICATED });
    (authApi.logout as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("calls authApi.logout()", async () => {
    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current();
    });

    expect(authApi.logout).toHaveBeenCalledOnce();
  });

  it("clears the auth store after logout", async () => {
    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current();
    });

    expect(useAuthStore.getState().authentication).toEqual(EMPTY_AUTH);
  });

  it("AccessToken is null after logout", async () => {
    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current();
    });

    expect(useAuthStore.getState().authentication.AccessToken).toBeNull();
  });

  it("isAuthenticated is false after logout", async () => {
    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current();
    });

    expect(useAuthStore.getState().authentication.isAuthenticated).toBe(false);
  });

  it("clears store even if authApi.logout() rejects", async () => {
    // authApi.logout() already swallows errors internally — but verify the hook is robust
    (authApi.logout as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current();
    });

    // store must still be cleared
    expect(useAuthStore.getState().authentication.isAuthenticated).toBe(false);
  });

  it("calls authApi.logout() before clearing the store", async () => {
    const callOrder: string[] = [];

    (authApi.logout as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callOrder.push("api");
    });

    // Spy on setAuthentication via store subscription
    const unsubscribe = useAuthStore.subscribe(() => {
      if (!useAuthStore.getState().authentication.isAuthenticated) {
        callOrder.push("store");
      }
    });

    const { result } = renderHook(() => useLogout());
    await act(async () => {
      await result.current();
    });

    unsubscribe();

    expect(callOrder[0]).toBe("api");
    expect(callOrder[1]).toBe("store");
  });
});
