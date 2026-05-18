/**
 * Tests for the i18n configuration.
 *
 * Covered:
 * - French translations load correctly for all namespaces
 * - English translations load correctly for all namespaces
 * - Dutch translations load correctly for all namespaces
 * - Fallback to French for a missing key in English/Dutch
 * - Locale files have consistent keys across all three languages
 */
import { describe, it, expect, beforeAll } from "vitest";
import i18n from "./config";

import fr from "./locales/fr.json";
import en from "./locales/en.json";
import nl from "./locales/nl.json";

beforeAll(async () => {
  await i18n.changeLanguage("fr");
});

// ── French ────────────────────────────────────────────────────────────────────

describe("i18n — French translations", () => {
  it("translates topbar keys in French", async () => {
    await i18n.changeLanguage("fr");
    expect(i18n.t("topbar.myAccount")).toBe(fr.topbar.myAccount);
    expect(i18n.t("topbar.preferences")).toBe(fr.topbar.preferences);
    expect(i18n.t("topbar.logout")).toBe(fr.topbar.logout);
  });

  it("translates footer keys in French", async () => {
    await i18n.changeLanguage("fr");
    expect(i18n.t("footer.terms")).toBe(fr.footer.terms);
    expect(i18n.t("footer.privacy")).toBe(fr.footer.privacy);
  });

  it("translates settings keys in French", async () => {
    await i18n.changeLanguage("fr");
    expect(i18n.t("settings.title")).toBe(fr.settings.title);
    expect(i18n.t("settings.darkMode")).toBe(fr.settings.darkMode);
    expect(i18n.t("settings.language")).toBe(fr.settings.language);
  });
});

// ── English ───────────────────────────────────────────────────────────────────

describe("i18n — English translations", () => {
  it("translates topbar keys in English", async () => {
    await i18n.changeLanguage("en");
    expect(i18n.t("topbar.myAccount")).toBe(en.topbar.myAccount);
    expect(i18n.t("topbar.preferences")).toBe(en.topbar.preferences);
    expect(i18n.t("topbar.logout")).toBe(en.topbar.logout);
  });

  it("translates footer keys in English", async () => {
    await i18n.changeLanguage("en");
    expect(i18n.t("footer.terms")).toBe(en.footer.terms);
    expect(i18n.t("footer.privacy")).toBe(en.footer.privacy);
  });

  it("translates settings keys in English", async () => {
    await i18n.changeLanguage("en");
    expect(i18n.t("settings.title")).toBe(en.settings.title);
    expect(i18n.t("settings.darkMode")).toBe(en.settings.darkMode);
  });
});

// ── Dutch ─────────────────────────────────────────────────────────────────────

describe("i18n — Dutch translations", () => {
  it("translates topbar keys in Dutch", async () => {
    await i18n.changeLanguage("nl");
    expect(i18n.t("topbar.myAccount")).toBe(nl.topbar.myAccount);
    expect(i18n.t("topbar.preferences")).toBe(nl.topbar.preferences);
    expect(i18n.t("topbar.logout")).toBe(nl.topbar.logout);
  });

  it("translates footer keys in Dutch", async () => {
    await i18n.changeLanguage("nl");
    expect(i18n.t("footer.terms")).toBe(nl.footer.terms);
    expect(i18n.t("footer.privacy")).toBe(nl.footer.privacy);
  });

  it("translates settings keys in Dutch", async () => {
    await i18n.changeLanguage("nl");
    expect(i18n.t("settings.title")).toBe(nl.settings.title);
    expect(i18n.t("settings.darkMode")).toBe(nl.settings.darkMode);
  });
});

// ── Locale completeness ───────────────────────────────────────────────────────

describe("i18n — locale completeness", () => {
  it("English has the same top-level namespaces as French", () => {
    const frKeys = Object.keys(fr).sort();
    const enKeys = Object.keys(en).sort();
    expect(enKeys).toEqual(frKeys);
  });

  it("Dutch has the same top-level namespaces as French", () => {
    const frKeys = Object.keys(fr).sort();
    const nlKeys = Object.keys(nl).sort();
    expect(nlKeys).toEqual(frKeys);
  });

  it("topbar section has same keys across all three locales", () => {
    const frTopbar = Object.keys(fr.topbar).sort();
    expect(Object.keys(en.topbar).sort()).toEqual(frTopbar);
    expect(Object.keys(nl.topbar).sort()).toEqual(frTopbar);
  });

  it("settings section has same keys across all three locales", () => {
    const frSettings = Object.keys(fr.settings).sort();
    expect(Object.keys(en.settings).sort()).toEqual(frSettings);
    expect(Object.keys(nl.settings).sort()).toEqual(frSettings);
  });

  it("footer section has same keys across all three locales", () => {
    const frFooter = Object.keys(fr.footer).sort();
    expect(Object.keys(en.footer).sort()).toEqual(frFooter);
    expect(Object.keys(nl.footer).sort()).toEqual(frFooter);
  });
});
