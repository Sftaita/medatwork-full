import { describe, it, expect, beforeEach } from "vitest";
import { useThemeStore, LS_KEY } from "./themeStore";

function resetStore(): void {
  localStorage.removeItem(LS_KEY);
  useThemeStore.setState({ mode: "light" });
}

describe("themeStore — initial state", () => {
  beforeEach(resetStore);

  it("defaults to 'light' when localStorage is empty", () => {
    expect(useThemeStore.getState().mode).toBe("light");
  });
});

describe("themeStore — setMode", () => {
  beforeEach(resetStore);

  it("updates mode to 'dark'", () => {
    useThemeStore.getState().setMode("dark");
    expect(useThemeStore.getState().mode).toBe("dark");
  });

  it("persists 'dark' to localStorage", () => {
    useThemeStore.getState().setMode("dark");
    expect(localStorage.getItem(LS_KEY)).toBe("dark");
  });

  it("updates mode back to 'light'", () => {
    useThemeStore.getState().setMode("dark");
    useThemeStore.getState().setMode("light");
    expect(useThemeStore.getState().mode).toBe("light");
  });

  it("persists 'light' to localStorage", () => {
    useThemeStore.getState().setMode("dark");
    useThemeStore.getState().setMode("light");
    expect(localStorage.getItem(LS_KEY)).toBe("light");
  });

  it("toggling multiple times ends at the last value", () => {
    useThemeStore.getState().setMode("dark");
    useThemeStore.getState().setMode("light");
    useThemeStore.getState().setMode("dark");
    expect(useThemeStore.getState().mode).toBe("dark");
    expect(localStorage.getItem(LS_KEY)).toBe("dark");
  });
});

describe("themeStore — cross-tab sync (storage event)", () => {
  beforeEach(resetStore);

  it("switches to 'dark' when another tab writes 'dark' to localStorage", () => {
    // Simulate a storage event from another tab
    window.dispatchEvent(
      new StorageEvent("storage", { key: LS_KEY, newValue: "dark", storageArea: localStorage })
    );
    expect(useThemeStore.getState().mode).toBe("dark");
  });

  it("switches to 'light' when another tab writes 'light' to localStorage", () => {
    useThemeStore.setState({ mode: "dark" });
    window.dispatchEvent(
      new StorageEvent("storage", { key: LS_KEY, newValue: "light", storageArea: localStorage })
    );
    expect(useThemeStore.getState().mode).toBe("light");
  });

  it("ignores storage events for other keys", () => {
    window.dispatchEvent(
      new StorageEvent("storage", { key: "other-key", newValue: "dark", storageArea: localStorage })
    );
    expect(useThemeStore.getState().mode).toBe("light"); // unchanged
  });

  it("ignores invalid values in storage events", () => {
    window.dispatchEvent(
      new StorageEvent("storage", { key: LS_KEY, newValue: "blue", storageArea: localStorage })
    );
    expect(useThemeStore.getState().mode).toBe("light"); // unchanged
  });
});
