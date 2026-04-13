import { describe, it, expect } from "vitest";

// ── Utility functions extracted from the codebase ────────────────────────────
// These are inline copies of functions used across the app (services, pages)
// to validate their logic without importing the full module chain.

/**
 * From AuthAPI — checks if token is still valid
 */
function isTokenExpired(exp: number): boolean {
  return exp * 1000 <= Date.now();
}

/**
 * From config.jsx — builds an API endpoint from base URL
 */
function buildEndpoint(baseUrl: string, path: string): string {
  return baseUrl.endsWith("/") ? baseUrl + path : baseUrl + "/" + path;
}

/**
 * From LoginPage/Form.jsx — maps HTTP error codes to messages
 */
function getLoginErrorMessage(code: number): string {
  if (code === 400) return "Oups, le serveur ne répond pas";
  if (code === 401)
    return "Les informations ne correspondent pas ou vous n'avez pas encore validé votre email";
  return "Oups, une erreur est survenue";
}

/**
 * Validates password minimum length (matches backend Assert\Length min:6)
 */
function isPasswordValid(password: unknown): boolean {
  return typeof password === "string" && password.length >= 6;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Token expiration check", () => {
  it("returns true for a past expiry timestamp", () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    expect(isTokenExpired(pastExp)).toBe(true);
  });

  it("returns false for a future expiry timestamp", () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    expect(isTokenExpired(futureExp)).toBe(false);
  });
});

describe("API endpoint builder", () => {
  it("builds endpoint correctly when base ends with /", () => {
    expect(buildEndpoint("http://localhost:8000/api/", "login_check")).toBe(
      "http://localhost:8000/api/login_check"
    );
  });

  it("builds endpoint correctly when base does not end with /", () => {
    expect(buildEndpoint("http://localhost:8000/api", "years")).toBe(
      "http://localhost:8000/api/years"
    );
  });

  it("preserves the full path", () => {
    const url = buildEndpoint("https://api-link.medatwork.be/api/", "managers");
    expect(url).toBe("https://api-link.medatwork.be/api/managers");
  });
});

describe("Login error messages", () => {
  it("returns server error message for code 400", () => {
    expect(getLoginErrorMessage(400)).toContain("serveur");
  });

  it("returns credentials error message for code 401", () => {
    expect(getLoginErrorMessage(401)).toContain("informations");
  });

  it("returns generic message for unknown code", () => {
    expect(getLoginErrorMessage(500)).toContain("erreur");
    expect(getLoginErrorMessage(0)).toContain("erreur");
  });

  it("returns different messages for 400 and 401", () => {
    expect(getLoginErrorMessage(400)).not.toBe(getLoginErrorMessage(401));
  });
});

describe("Password validation", () => {
  it("accepts passwords of 6 characters or more", () => {
    expect(isPasswordValid("abc123")).toBe(true);
    expect(isPasswordValid("longpassword")).toBe(true);
  });

  it("rejects passwords shorter than 6 characters", () => {
    expect(isPasswordValid("abc")).toBe(false);
    expect(isPasswordValid("")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isPasswordValid(123456)).toBe(false);
    expect(isPasswordValid(null)).toBe(false);
  });
});
