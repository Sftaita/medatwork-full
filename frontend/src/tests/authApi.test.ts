import { describe, it, expect, vi, beforeEach } from "vitest";
import { jwtDecode } from "jwt-decode";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("axios");
vi.mock("../config", () => ({
  API_URL: "http://localhost:8000/api/",
  LOGGIN_API: "http://localhost:8000/api/login_check",
}));

import axios from "axios";
import authApi from "../services/authApi";

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-signature`;
}

function futureExp(secondsFromNow = 3600): number {
  return Math.floor(Date.now() / 1000) + secondsFromNow;
}

function pastExp(secondsAgo = 3600): number {
  return Math.floor(Date.now() / 1000) - secondsAgo;
}

// ── authApi.logout() ──────────────────────────────────────────────────────────

describe("authApi.logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls axios.post with the logout endpoint", async () => {
    (axios.post as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({});

    await authApi.logout();

    expect(axios.post).toHaveBeenCalledWith("http://localhost:8000/api/logout", null, {
      withCredentials: true,
    });
  });

  it("returns void on success", async () => {
    (axios.post as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({});

    const result = await authApi.logout();

    expect(result).toBeUndefined();
  });

  it("swallows network errors and resolves void", async () => {
    (axios.post as ReturnType<typeof vi.fn>) = vi
      .fn()
      .mockRejectedValue(new Error("Network Error"));

    await expect(authApi.logout()).resolves.toBeUndefined();
  });

  it("swallows 401 errors and resolves void", async () => {
    const err = Object.assign(new Error("Unauthorized"), { response: { status: 401 } });
    (axios.post as ReturnType<typeof vi.fn>) = vi.fn().mockRejectedValue(err);

    await expect(authApi.logout()).resolves.toBeUndefined();
  });
});

// ── authApi.authenticate() ────────────────────────────────────────────────────

describe("authApi.authenticate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls axios.post with the login endpoint and credentials", async () => {
    const mockData = {
      token: "jwt",
      role: "manager",
      firstname: "Jean",
      lastname: "D",
      gender: "M",
    };
    (axios.post as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({ data: mockData });

    await authApi.authenticate({ username: "test@test.com", password: "Secret123!" });

    expect(axios.post).toHaveBeenCalledWith(
      "http://localhost:8000/api/login_check",
      { username: "test@test.com", password: "Secret123!" },
      expect.objectContaining({ withCredentials: true })
    );
  });

  it("returns response data on success", async () => {
    const mockData = { token: "jwt-token", role: "resident" };
    (axios.post as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({ data: mockData });

    const result = await authApi.authenticate({ username: "a@b.com", password: "password1" });

    expect(result).toEqual(mockData);
  });

  it("propagates errors to the caller", async () => {
    (axios.post as ReturnType<typeof vi.fn>) = vi
      .fn()
      .mockRejectedValue(new Error("401 Unauthorized"));

    await expect(
      authApi.authenticate({ username: "bad@test.com", password: "wrongpass" })
    ).rejects.toThrow("401 Unauthorized");
  });
});

// ── JWT payload decoding ──────────────────────────────────────────────────────

describe("JWT payload decoding", () => {
  it("decodes roles from a ROLE_MANAGER token", () => {
    const token = buildJwt({ exp: futureExp(), roles: ["ROLE_MANAGER"] });
    const decoded = jwtDecode<{ roles: string[] }>(token);
    expect(decoded.roles).toContain("ROLE_MANAGER");
  });

  it("decodes roles from a ROLE_RESIDENT token", () => {
    const token = buildJwt({ exp: futureExp(), roles: ["ROLE_RESIDENT"] });
    const decoded = jwtDecode<{ roles: string[] }>(token);
    expect(decoded.roles).toContain("ROLE_RESIDENT");
  });

  it("correctly identifies a manager vs resident by role", () => {
    const managerDecoded = jwtDecode<{ roles: string[] }>(buildJwt({ roles: ["ROLE_MANAGER"] }));
    const residentDecoded = jwtDecode<{ roles: string[] }>(buildJwt({ roles: ["ROLE_RESIDENT"] }));
    expect(managerDecoded.roles).not.toContain("ROLE_RESIDENT");
    expect(residentDecoded.roles).not.toContain("ROLE_MANAGER");
  });

  it("returns false when token is expired (exp in the past)", () => {
    const token = buildJwt({ exp: pastExp() });
    const decoded = jwtDecode<{ exp: number }>(token);
    expect(decoded.exp * 1000).toBeLessThan(Date.now());
  });

  it("returns true when token is not expired (exp in the future)", () => {
    const token = buildJwt({ exp: futureExp() });
    const decoded = jwtDecode<{ exp: number }>(token);
    expect(decoded.exp * 1000).toBeGreaterThan(Date.now());
  });
});
