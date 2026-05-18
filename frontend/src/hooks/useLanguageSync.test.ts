/**
 * Tests for useLanguageSync.
 *
 * Covered:
 * - changes i18n language when settings.language differs from current language
 * - persists the new language to localStorage
 * - does nothing when the user is not authenticated
 * - does nothing when settings language already matches i18n language
 * - does nothing for unsupported language values
 * - does nothing when settings are undefined
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockChangeLanguage = vi.fn();
let mockI18nLanguage = "fr";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: {
      get language() { return mockI18nLanguage; },
      changeLanguage: mockChangeLanguage,
    },
  }),
}));

let mockSettingsData: { language?: string } | undefined = undefined;
vi.mock("./useUserSettings", () => ({
  useUserSettings: () => ({ data: mockSettingsData }),
}));

let mockIsAuthenticated = true;
vi.mock("./useAuth", () => ({
  default: () => ({
    authentication: { isAuthenticated: mockIsAuthenticated },
  }),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockChangeLanguage.mockReset();
  mockI18nLanguage = "fr";
  mockIsAuthenticated = true;
  mockSettingsData = undefined;
  localStorage.clear();
});

describe("useLanguageSync", () => {
  it("calls i18n.changeLanguage when settings language differs from current language", async () => {
    mockI18nLanguage = "fr";
    mockSettingsData = { language: "en" };

    const { default: useLanguageSync } = await import("./useLanguageSync");
    renderHook(() => useLanguageSync());

    expect(mockChangeLanguage).toHaveBeenCalledWith("en");
  });

  it("persists language change to localStorage", async () => {
    mockI18nLanguage = "fr";
    mockSettingsData = { language: "nl" };

    const { default: useLanguageSync } = await import("./useLanguageSync");
    renderHook(() => useLanguageSync());

    expect(localStorage.getItem("medatwork_lang")).toBe("nl");
  });

  it("does NOT call changeLanguage when not authenticated", async () => {
    mockIsAuthenticated = false;
    mockSettingsData = { language: "en" };

    const { default: useLanguageSync } = await import("./useLanguageSync");
    renderHook(() => useLanguageSync());

    expect(mockChangeLanguage).not.toHaveBeenCalled();
  });

  it("does NOT call changeLanguage when language already matches", async () => {
    mockI18nLanguage = "en";
    mockSettingsData = { language: "en" };

    const { default: useLanguageSync } = await import("./useLanguageSync");
    renderHook(() => useLanguageSync());

    expect(mockChangeLanguage).not.toHaveBeenCalled();
  });

  it("does NOT call changeLanguage when settings data is undefined", async () => {
    mockSettingsData = undefined;

    const { default: useLanguageSync } = await import("./useLanguageSync");
    renderHook(() => useLanguageSync());

    expect(mockChangeLanguage).not.toHaveBeenCalled();
  });

  it("does NOT call changeLanguage for an unsupported language value", async () => {
    mockI18nLanguage = "fr";
    mockSettingsData = { language: "de" };  // German — not supported

    const { default: useLanguageSync } = await import("./useLanguageSync");
    renderHook(() => useLanguageSync());

    expect(mockChangeLanguage).not.toHaveBeenCalled();
  });

  it("supports nl language code", async () => {
    mockI18nLanguage = "fr";
    mockSettingsData = { language: "nl" };

    const { default: useLanguageSync } = await import("./useLanguageSync");
    renderHook(() => useLanguageSync());

    expect(mockChangeLanguage).toHaveBeenCalledWith("nl");
  });
});
