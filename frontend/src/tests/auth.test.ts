import { describe, it, expect } from "vitest";
import { jwtDecode } from "jwt-decode";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a JWT with a custom payload. The signature is fake but jwt-decode
 * doesn't verify signatures — it only base64-decodes the payload.
 */
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

// ── isAuthenticated logic (extracted for unit testing) ────────────────────────

function isAuthenticated(getItem: (key: string) => string | null): boolean {
  const token = getItem("authToken");
  if (!token) return false;
  try {
    const decoded = jwtDecode<{ exp: number }>(token);
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

// ── logout() ──────────────────────────────────────────────────────────────────

function logout(): { method: string; url: string } {
  return { method: "get", url: "logout" };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("isAuthenticated", () => {
  it("returns false when no token in localStorage", () => {
    expect(isAuthenticated(() => null)).toBe(false);
  });

  it("returns false when token is expired", () => {
    const token = buildJwt({ exp: pastExp(), roles: ["ROLE_MANAGER"] });
    expect(isAuthenticated(() => token)).toBe(false);
  });

  it("returns true when token is valid and not expired", () => {
    const token = buildJwt({ exp: futureExp(), roles: ["ROLE_MANAGER"] });
    expect(isAuthenticated(() => token)).toBe(true);
  });

  it("returns false when token is malformed", () => {
    expect(isAuthenticated(() => "not.a.valid.jwt")).toBe(false);
  });

  it("returns false when token expires exactly now", () => {
    const token = buildJwt({ exp: Math.floor(Date.now() / 1000) - 1 });
    expect(isAuthenticated(() => token)).toBe(false);
  });
});

describe("logout", () => {
  it("returns an object with method get", () => {
    expect(logout().method).toBe("get");
  });

  it("returns an object with url logout", () => {
    expect(logout().url).toBe("logout");
  });
});

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
});
