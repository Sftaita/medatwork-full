import { describe, it, expect, beforeEach } from "vitest";
import { useSidebarStore, LS_KEY } from "./sidebarStore";

function resetStore(): void {
  localStorage.removeItem(LS_KEY);
  useSidebarStore.setState({ collapsed: false });
}

describe("sidebarStore — initial state", () => {
  beforeEach(resetStore);

  it("defaults to expanded (collapsed = false) when localStorage is empty", () => {
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });
});

describe("sidebarStore — setCollapsed", () => {
  beforeEach(resetStore);

  it("sets collapsed to true", () => {
    useSidebarStore.getState().setCollapsed(true);
    expect(useSidebarStore.getState().collapsed).toBe(true);
  });

  it("persists true to localStorage", () => {
    useSidebarStore.getState().setCollapsed(true);
    expect(localStorage.getItem(LS_KEY)).toBe("true");
  });

  it("sets collapsed back to false", () => {
    useSidebarStore.getState().setCollapsed(true);
    useSidebarStore.getState().setCollapsed(false);
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });

  it("persists false to localStorage", () => {
    useSidebarStore.getState().setCollapsed(true);
    useSidebarStore.getState().setCollapsed(false);
    expect(localStorage.getItem(LS_KEY)).toBe("false");
  });
});

describe("sidebarStore — toggle", () => {
  beforeEach(resetStore);

  it("toggles from false to true", () => {
    useSidebarStore.getState().toggle();
    expect(useSidebarStore.getState().collapsed).toBe(true);
  });

  it("persists toggled value to localStorage", () => {
    useSidebarStore.getState().toggle();
    expect(localStorage.getItem(LS_KEY)).toBe("true");
  });

  it("toggles back to false on second call", () => {
    useSidebarStore.getState().toggle();
    useSidebarStore.getState().toggle();
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });

  it("three toggles end at true", () => {
    useSidebarStore.getState().toggle();
    useSidebarStore.getState().toggle();
    useSidebarStore.getState().toggle();
    expect(useSidebarStore.getState().collapsed).toBe(true);
    expect(localStorage.getItem(LS_KEY)).toBe("true");
  });
});
