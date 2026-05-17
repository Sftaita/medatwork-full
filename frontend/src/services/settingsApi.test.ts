/**
 * Tests for settingsApi.
 *
 * Régression Sentry 2026-05-17 — FRONTEND-7 (404 sur /profile/settings) :
 * Le frontend utilisait api-v2.medatwork.be (v3.4.1) au lieu de
 * api-link.medatwork.be (v3.6.0). La route GET /api/user/settings n'existait
 * pas dans v3.4.1 → 404. Fix : .env.production corrigé.
 *
 * Ces tests vérifient que l'API appelle les BONS chemins relatifs
 * (le baseURL vient de VITE_API_URL dans .env.production).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock axiosPrivate avant d'importer settingsApi ────────────────────────────

const mockGet   = vi.hoisted(() => vi.fn());
const mockPatch = vi.hoisted(() => vi.fn());

vi.mock("./Axios", () => ({
  axiosPrivate: { get: mockGet, patch: mockPatch },
}));

// ── Import après mock ─────────────────────────────────────────────────────────

import settingsApi from "./settingsApi";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("settingsApi — chemins d'API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── GET /api/user/settings ────────────────────────────────────────────────

  it('getSettings() appelle GET "user/settings"', async () => {
    mockGet.mockResolvedValue({ data: { userType: "manager", settings: {} } });

    await settingsApi.getSettings();

    expect(mockGet).toHaveBeenCalledOnce();
    expect(mockGet).toHaveBeenCalledWith("user/settings");
  });

  it("getSettings() retourne settings + userType", async () => {
    const mockData = { userType: "resident", settings: { theme: "dark" } };
    mockGet.mockResolvedValue({ data: mockData });

    const result = await settingsApi.getSettings();
    expect(result).toEqual(mockData);
  });

  it("getSettings() lève une erreur si l'appel échoue (404, 500, etc.)", async () => {
    const axiosError = Object.assign(new Error("Request failed with status code 404"), {
      response: { status: 404 },
    });
    mockGet.mockRejectedValue(axiosError);

    await expect(settingsApi.getSettings()).rejects.toThrow("404");
    expect(mockGet).toHaveBeenCalledWith("user/settings");
  });

  // ── PATCH /api/user/settings ──────────────────────────────────────────────

  it('patchSettings() appelle PATCH "user/settings" avec le patch', async () => {
    mockPatch.mockResolvedValue({ data: { userType: "manager", settings: { theme: "dark" } } });

    await settingsApi.patchSettings({ theme: "dark" });

    expect(mockPatch).toHaveBeenCalledOnce();
    expect(mockPatch).toHaveBeenCalledWith("user/settings", { theme: "dark" });
  });

  it("patchSettings() passe les paramètres partiels correctement", async () => {
    mockPatch.mockResolvedValue({ data: { userType: "manager", settings: {} } });

    await settingsApi.patchSettings({ calendar: { defaultView: "week" } });

    expect(mockPatch).toHaveBeenCalledWith("user/settings", {
      calendar: { defaultView: "week" },
    });
  });

  it("patchSettings() retourne settings + userType", async () => {
    const mockData = { userType: "hospital_admin", settings: { theme: "light" } };
    mockPatch.mockResolvedValue({ data: mockData });

    const result = await settingsApi.patchSettings({ theme: "light" });
    expect(result).toEqual(mockData);
  });
});
