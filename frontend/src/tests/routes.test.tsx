/**
 * Tests for SuperAdminRoute and HospitalAdminRoute guards.
 *
 * Covers:
 * - SuperAdminRoute renders Outlet when role is super_admin + token present
 * - SuperAdminRoute redirects to /login otherwise
 * - HospitalAdminRoute renders Outlet when role is hospital_admin + token present
 * - HospitalAdminRoute redirects to /login otherwise
 * - HospitalAdminRoute redirects super_admin to /login (not cross-authorized)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SuperAdminRoute from "../routes/SuperAdminRoute";
import HospitalAdminRoute from "../routes/HospitalAdminRoute";

// ── Mock useAuth ──────────────────────────────────────────────────────────────

const mockAuth = vi.hoisted(() => ({ authentication: { AccessToken: null, role: null } }));

vi.mock("../hooks/useAuth", () => ({
  default: () => mockAuth,
}));

function setAuth(role: string | null, hasToken = true) {
  mockAuth.authentication = {
    AccessToken: hasToken ? "fake-token" : null,
    role,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderSuperAdminRoute() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route element={<SuperAdminRoute />}>
          <Route path="/admin" element={<div>Admin dashboard</div>} />
        </Route>
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function renderHospitalAdminRoute() {
  return render(
    <MemoryRouter initialEntries={["/hospital-admin/dashboard"]}>
      <Routes>
        <Route element={<HospitalAdminRoute />}>
          <Route path="/hospital-admin/dashboard" element={<div>Hospital admin dashboard</div>} />
        </Route>
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

// ── SuperAdminRoute ───────────────────────────────────────────────────────────

describe("SuperAdminRoute", () => {
  beforeEach(() => setAuth(null, false));

  it("renders the outlet when role is super_admin and token is present", () => {
    setAuth("super_admin");
    renderSuperAdminRoute();
    expect(screen.getByText("Admin dashboard")).toBeTruthy();
  });

  it("redirects to /login when not authenticated", () => {
    setAuth(null, false);
    renderSuperAdminRoute();
    expect(screen.getByText("Login page")).toBeTruthy();
  });

  it("redirects to /login when token is present but role is manager", () => {
    setAuth("manager");
    renderSuperAdminRoute();
    expect(screen.getByText("Login page")).toBeTruthy();
  });

  it("redirects to /login when token is present but role is hospital_admin", () => {
    setAuth("hospital_admin");
    renderSuperAdminRoute();
    expect(screen.getByText("Login page")).toBeTruthy();
  });

  it("redirects to /login when token is absent even if role is super_admin", () => {
    setAuth("super_admin", false);
    renderSuperAdminRoute();
    expect(screen.getByText("Login page")).toBeTruthy();
  });
});

// ── HospitalAdminRoute ────────────────────────────────────────────────────────

describe("HospitalAdminRoute", () => {
  beforeEach(() => setAuth(null, false));

  it("renders the outlet when role is hospital_admin and token is present", () => {
    setAuth("hospital_admin");
    renderHospitalAdminRoute();
    expect(screen.getByText("Hospital admin dashboard")).toBeTruthy();
  });

  it("redirects to /login when not authenticated", () => {
    setAuth(null, false);
    renderHospitalAdminRoute();
    expect(screen.getByText("Login page")).toBeTruthy();
  });

  it("redirects to /login when role is super_admin (not cross-authorized)", () => {
    setAuth("super_admin");
    renderHospitalAdminRoute();
    expect(screen.getByText("Login page")).toBeTruthy();
  });

  it("redirects to /login when role is manager", () => {
    setAuth("manager");
    renderHospitalAdminRoute();
    expect(screen.getByText("Login page")).toBeTruthy();
  });

  it("redirects to /login when token is absent even if role is hospital_admin", () => {
    setAuth("hospital_admin", false);
    renderHospitalAdminRoute();
    expect(screen.getByText("Login page")).toBeTruthy();
  });
});
