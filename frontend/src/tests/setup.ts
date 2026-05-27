import "@testing-library/jest-dom";
import "../i18n/config";
import i18n from "i18next";

// Static imports are hoisted before any code runs, so resolveLang() may pick
// jsdom's navigator.language ("en-US") instead of French. Also, i18n.test.ts
// leaves the language as "nl" after its last test — this resets it.
// Must be awaited so the change completes before any test in this file starts.
await i18n.changeLanguage("fr");
