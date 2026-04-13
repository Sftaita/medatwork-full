import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("axios");
vi.mock("../config", () => ({
  API_URL: "http://localhost:8000/api/",
}));

import axios from "axios";
import { useAuthStore } from "../store/authStore";
import useRefreshToken from "../hooks/useRefreshToken";
import type { AuthState, RefreshTokenResponse } from "../types/auth";

// ── Helpers ───────────────────────────────────────────────────────────────────

const INITIAL_AUTH: AuthState = {
  AccessToken: null,
  isAuthenticated: false,
  firstname: "",
  lastname: "",
  role: null,
  gender: "",
};

const MOCK_RESPONSE: RefreshTokenResponse = {
  token: "new-access-token",
  firstname: "Alice",
  lastname: "Dupont",
  role: "manager",
  gender: "F",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useRefreshToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ authentication: INITIAL_AUTH });
  });

  it("calls axios.post with the token/refresh endpoint", async () => {
    (axios.post as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({ data: MOCK_RESPONSE });
    const { result } = renderHook(() => useRefreshToken());

    await act(async () => {
      await result.current();
    });

    expect(axios.post).toHaveBeenCalledWith("http://localhost:8000/api/token/refresh", null, {
      withCredentials: true,
    });
  });

  it("returns the access token string", async () => {
    (axios.post as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({ data: MOCK_RESPONSE });
    const { result } = renderHook(() => useRefreshToken());

    let token: string | undefined;
    await act(async () => {
      token = await result.current();
    });

    expect(token).toBe("new-access-token");
  });

  it("updates the auth store with all fields from the response", async () => {
    (axios.post as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({ data: MOCK_RESPONSE });
    const { result } = renderHook(() => useRefreshToken());

    await act(async () => {
      await result.current();
    });

    const auth = useAuthStore.getState().authentication;
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.AccessToken).toBe("new-access-token");
    expect(auth.firstname).toBe("Alice");
    expect(auth.lastname).toBe("Dupont");
    expect(auth.role).toBe("manager");
    expect(auth.gender).toBe("F");
  });

  it("preserves existing auth fields not present in the response", async () => {
    useAuthStore.setState({
      authentication: { ...INITIAL_AUTH, gender: "M" },
    });
    (axios.post as ReturnType<typeof vi.fn>) = vi
      .fn()
      .mockResolvedValue({ data: { ...MOCK_RESPONSE, gender: "M" } });
    const { result } = renderHook(() => useRefreshToken());

    await act(async () => {
      await result.current();
    });

    expect(useAuthStore.getState().authentication.gender).toBe("M");
  });

  it("propagates axios errors to the caller", async () => {
    const networkError = new Error("Network Error");
    (axios.post as ReturnType<typeof vi.fn>) = vi.fn().mockRejectedValue(networkError);
    const { result } = renderHook(() => useRefreshToken());

    await expect(
      act(async () => {
        await result.current();
      })
    ).rejects.toThrow("Network Error");
  });

  it("stores hospitalId in auth state when present in response", async () => {
    const responseWithHospital: RefreshTokenResponse = {
      ...MOCK_RESPONSE,
      role: "hospital_admin",
      hospitalId: 42,
    };
    (axios.post as ReturnType<typeof vi.fn>) = vi
      .fn()
      .mockResolvedValue({ data: responseWithHospital });
    const { result } = renderHook(() => useRefreshToken());

    await act(async () => {
      await result.current();
    });

    expect(useAuthStore.getState().authentication.hospitalId).toBe(42);
  });

  it("sets hospitalId to null when absent from response", async () => {
    (axios.post as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({ data: MOCK_RESPONSE }); // no hospitalId
    const { result } = renderHook(() => useRefreshToken());

    await act(async () => {
      await result.current();
    });

    expect(useAuthStore.getState().authentication.hospitalId).toBeNull();
  });

  it("does not update auth store when axios fails", async () => {
    (axios.post as ReturnType<typeof vi.fn>) = vi.fn().mockRejectedValue(new Error("Unauthorized"));
    const { result } = renderHook(() => useRefreshToken());

    try {
      await act(async () => {
        await result.current();
      });
    } catch {
      // expected
    }

    expect(useAuthStore.getState().authentication.isAuthenticated).toBe(false);
    expect(useAuthStore.getState().authentication.AccessToken).toBeNull();
  });
});
