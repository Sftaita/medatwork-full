import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "../store/authStore";
import type { AuthState } from "../types/auth";

// ── Helpers ───────────────────────────────────────────────────────────────────

const INITIAL_AUTH: AuthState = {
  AccessToken: null,
  isAuthenticated: false,
  firstname: "",
  lastname: "",
  role: null,
  gender: "",
};

function resetStore(): void {
  useAuthStore.setState({ authentication: INITIAL_AUTH, selectedMenuItem: {} });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("authStore — initial state", () => {
  beforeEach(resetStore);

  it("starts with isAuthenticated false", () => {
    expect(useAuthStore.getState().authentication.isAuthenticated).toBe(false);
  });

  it("starts with AccessToken null", () => {
    expect(useAuthStore.getState().authentication.AccessToken).toBeNull();
  });

  it("starts with role null", () => {
    expect(useAuthStore.getState().authentication.role).toBeNull();
  });

  it("starts with an empty selectedMenuItem", () => {
    expect(useAuthStore.getState().selectedMenuItem).toEqual({});
  });
});

describe("authStore — setAuthentication with an object", () => {
  beforeEach(resetStore);

  it("replaces authentication entirely", () => {
    const newAuth: AuthState = {
      AccessToken: "tok-123",
      isAuthenticated: true,
      firstname: "Alice",
      lastname: "Dupont",
      role: "manager",
      gender: "F",
    };
    useAuthStore.getState().setAuthentication(newAuth);
    expect(useAuthStore.getState().authentication).toEqual(newAuth);
  });

  it("sets isAuthenticated to true", () => {
    useAuthStore.getState().setAuthentication({ ...INITIAL_AUTH, isAuthenticated: true });
    expect(useAuthStore.getState().authentication.isAuthenticated).toBe(true);
  });

  it("stores the AccessToken", () => {
    useAuthStore.getState().setAuthentication({ ...INITIAL_AUTH, AccessToken: "abc" });
    expect(useAuthStore.getState().authentication.AccessToken).toBe("abc");
  });
});

describe("authStore — setAuthentication with a function updater", () => {
  beforeEach(resetStore);

  it("receives current state as argument", () => {
    let received: AuthState | undefined;
    useAuthStore.getState().setAuthentication((prev) => {
      received = prev;
      return prev;
    });
    expect(received).toEqual(INITIAL_AUTH);
  });

  it("merges new fields onto existing state", () => {
    useAuthStore.getState().setAuthentication((prev) => ({
      ...prev,
      isAuthenticated: true,
      AccessToken: "tok-abc",
    }));
    const auth = useAuthStore.getState().authentication;
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.AccessToken).toBe("tok-abc");
    expect(auth.role).toBeNull(); // untouched
  });

  it("can reset back to logged-out state", () => {
    // First log in
    useAuthStore.getState().setAuthentication({ ...INITIAL_AUTH, isAuthenticated: true });
    // Then log out via updater
    useAuthStore.getState().setAuthentication(() => INITIAL_AUTH);
    expect(useAuthStore.getState().authentication.isAuthenticated).toBe(false);
  });
});

describe("authStore — setSelectedMenuItem", () => {
  beforeEach(resetStore);

  it("stores the selected menu item", () => {
    useAuthStore.getState().setSelectedMenuItem({ title: "Tableau de bord" });
    expect(useAuthStore.getState().selectedMenuItem).toEqual({ title: "Tableau de bord" });
  });

  it("replaces the previous selection", () => {
    useAuthStore.getState().setSelectedMenuItem({ title: "Agenda" });
    useAuthStore.getState().setSelectedMenuItem({ title: "Résidents" });
    expect(useAuthStore.getState().selectedMenuItem).toEqual({ title: "Résidents" });
  });

  it("accepts an empty object to clear selection", () => {
    useAuthStore.getState().setSelectedMenuItem({ title: "Agenda" });
    useAuthStore.getState().setSelectedMenuItem({});
    expect(useAuthStore.getState().selectedMenuItem).toEqual({});
  });
});
