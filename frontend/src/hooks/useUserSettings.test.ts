import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { DEFAULT_SETTINGS } from "./useUserSettings";
import { useThemeStore } from "../store/themeStore";
import { useSidebarStore } from "../store/sidebarStore";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("../hooks/useAxiosPrivate", () => ({ default: () => ({}) }));

const mockGetSettings   = vi.hoisted(() => vi.fn());
const mockPatchSettings = vi.hoisted(() => vi.fn());

vi.mock("../services/settingsApi", () => ({
  default: {
    getSettings:   mockGetSettings,
    patchSettings: mockPatchSettings,
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return { Wrapper, client };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DEFAULT_SETTINGS", () => {
  it("has all calendar fields", () => {
    expect(DEFAULT_SETTINGS.calendar.defaultView).toBe("month");
    expect(DEFAULT_SETTINGS.calendar.lastUsedView).toBeNull();
    expect(DEFAULT_SETTINGS.calendar.showWeekends).toBe(true);
  });

  it("has all notification fields including new ones", () => {
    expect(DEFAULT_SETTINGS.notifications.email).toBe(true);
    expect(DEFAULT_SETTINGS.notifications.push).toBe(true);
    expect(DEFAULT_SETTINGS.notifications.compliance).toBe(true);
    expect(DEFAULT_SETTINGS.notifications.dailySummary).toBe(false);
    expect(DEFAULT_SETTINGS.notifications.validation).toBe(true);
    expect(DEFAULT_SETTINGS.notifications.planning).toBe(true);
    expect(DEFAULT_SETTINGS.notifications.staffPlanner).toBe(true);
  });

  it("has ui settings", () => {
    expect(DEFAULT_SETTINGS.ui.sidebarCollapsed).toBe(false);
  });

  it("has tables settings", () => {
    expect(DEFAULT_SETTINGS.tables.staffPlanner.pageSize).toBe(25);
    expect(DEFAULT_SETTINGS.tables.staffPlanner.dense).toBe(false);
  });
});

describe("useUserSettings", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useThemeStore.setState({ mode: "light" });
    useSidebarStore.setState({ collapsed: false });
  });

  it("calls settingsApi.getSettings on mount", async () => {
    const { Wrapper } = makeWrapper();
    mockGetSettings.mockResolvedValue({ settings: DEFAULT_SETTINGS, userType: "manager" });

    const { useUserSettings } = await import("./useUserSettings");
    renderHook(() => useUserSettings(), { wrapper: Wrapper });

    await waitFor(() => expect(mockGetSettings).toHaveBeenCalledTimes(1));
  });

  it("data reflects server response once the query resolves", async () => {
    const { Wrapper } = makeWrapper();
    const serverSettings = { ...DEFAULT_SETTINGS, theme: "dark" as const };
    mockGetSettings.mockResolvedValue({ settings: serverSettings, userType: "manager" });

    const { useUserSettings } = await import("./useUserSettings");
    const { result } = renderHook(() => useUserSettings(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data?.theme).toBe("dark"));
    expect(result.current.isPlaceholderData).toBe(false);
  });

  it("syncs dark theme to themeStore on success (server wins over localStorage)", async () => {
    const { Wrapper } = makeWrapper();
    mockGetSettings.mockResolvedValue({
      settings: { ...DEFAULT_SETTINGS, theme: "dark" },
      userType: "manager",
    });

    const { useUserSettings } = await import("./useUserSettings");
    renderHook(() => useUserSettings(), { wrapper: Wrapper });

    await waitFor(() => expect(useThemeStore.getState().mode).toBe("dark"));
  });

  it("syncs sidebarCollapsed=true from server to sidebarStore (server wins over localStorage)", async () => {
    const { Wrapper } = makeWrapper();
    // localStorage says false (default), server says true (set on another device)
    useSidebarStore.setState({ collapsed: false });
    mockGetSettings.mockResolvedValue({
      settings: { ...DEFAULT_SETTINGS, ui: { sidebarCollapsed: true } },
      userType: "manager",
    });

    const { useUserSettings } = await import("./useUserSettings");
    renderHook(() => useUserSettings(), { wrapper: Wrapper });

    await waitFor(() => expect(useSidebarStore.getState().collapsed).toBe(true));
  });

  it("syncs sidebarCollapsed=false from server even if localStorage had true", async () => {
    const { Wrapper } = makeWrapper();
    useSidebarStore.setState({ collapsed: true }); // simulate stale localStorage
    mockGetSettings.mockResolvedValue({
      settings: { ...DEFAULT_SETTINGS, ui: { sidebarCollapsed: false } },
      userType: "manager",
    });

    const { useUserSettings } = await import("./useUserSettings");
    renderHook(() => useUserSettings(), { wrapper: Wrapper });

    await waitFor(() => expect(useSidebarStore.getState().collapsed).toBe(false));
  });

  it("keeps placeholder DEFAULT_SETTINGS when API call fails", async () => {
    const { Wrapper } = makeWrapper();
    mockGetSettings.mockRejectedValue(new Error("Network error"));

    const { useUserSettings } = await import("./useUserSettings");
    const { result } = renderHook(() => useUserSettings(), { wrapper: Wrapper });

    await waitFor(() => expect(mockGetSettings).toHaveBeenCalled());
    expect(result.current.data).toEqual(DEFAULT_SETTINGS);
  });
});

describe("useUpdateSettings", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useThemeStore.setState({ mode: "light" });
    useSidebarStore.setState({ collapsed: false });
  });

  it("calls settingsApi.patchSettings with the patch", async () => {
    const { Wrapper } = makeWrapper();
    mockGetSettings.mockResolvedValue({ settings: DEFAULT_SETTINGS, userType: "manager" });
    mockPatchSettings.mockResolvedValue({ settings: { ...DEFAULT_SETTINGS, theme: "dark" }, userType: "manager" });

    const { useUpdateSettings } = await import("./useUserSettings");
    const { result } = renderHook(() => useUpdateSettings(), { wrapper: Wrapper });

    result.current.mutate({ theme: "dark" });

    await waitFor(() => expect(mockPatchSettings).toHaveBeenCalledWith({ theme: "dark" }));
  });

  it("applies theme change to themeStore immediately (optimistic)", async () => {
    const { Wrapper } = makeWrapper();
    mockGetSettings.mockResolvedValue({ settings: DEFAULT_SETTINGS, userType: "manager" });
    mockPatchSettings.mockResolvedValue({ settings: { ...DEFAULT_SETTINGS, theme: "dark" }, userType: "manager" });

    const { useUpdateSettings } = await import("./useUserSettings");
    const { result } = renderHook(() => useUpdateSettings(), { wrapper: Wrapper });

    result.current.mutate({ theme: "dark" });

    await waitFor(() => expect(useThemeStore.getState().mode).toBe("dark"));
  });

  it("applies sidebarCollapsed change to sidebarStore immediately (optimistic)", async () => {
    const { Wrapper } = makeWrapper();
    mockGetSettings.mockResolvedValue({ settings: DEFAULT_SETTINGS, userType: "manager" });
    mockPatchSettings.mockResolvedValue({
      settings: { ...DEFAULT_SETTINGS, ui: { sidebarCollapsed: true } },
      userType: "manager",
    });

    const { useUpdateSettings } = await import("./useUserSettings");
    const { result } = renderHook(() => useUpdateSettings(), { wrapper: Wrapper });

    result.current.mutate({ ui: { sidebarCollapsed: true } });

    await waitFor(() => expect(useSidebarStore.getState().collapsed).toBe(true));
  });

  it("rolls back sidebarStore on PATCH error", async () => {
    const { Wrapper, client } = makeWrapper();
    // Pre-seed cache so ctx.previous is populated (simulates a prior successful fetch)
    client.setQueryData(["user-settings"], DEFAULT_SETTINGS);
    mockPatchSettings.mockRejectedValue(new Error("Server error"));

    useSidebarStore.setState({ collapsed: false });

    const { useUpdateSettings } = await import("./useUserSettings");
    const { result } = renderHook(() => useUpdateSettings(), { wrapper: Wrapper });

    result.current.mutate({ ui: { sidebarCollapsed: true } });

    // Wait for the mutation to complete (with error), then verify rollback.
    // We don't assert the intermediate 'true' state because onMutate + onError
    // can both complete before the first waitFor tick (race condition in jsdom).
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });

  it("patches tables.staffPlanner.pageSize correctly", async () => {
    const { Wrapper } = makeWrapper();
    mockGetSettings.mockResolvedValue({ settings: DEFAULT_SETTINGS, userType: "hospital_admin" });
    mockPatchSettings.mockResolvedValue({
      settings: { ...DEFAULT_SETTINGS, tables: { staffPlanner: { pageSize: 50, dense: false } } },
      userType: "hospital_admin",
    });

    const { useUpdateSettings } = await import("./useUserSettings");
    const { result } = renderHook(() => useUpdateSettings(), { wrapper: Wrapper });

    result.current.mutate({ tables: { staffPlanner: { pageSize: 50 } } });

    await waitFor(() =>
      expect(mockPatchSettings).toHaveBeenCalledWith({ tables: { staffPlanner: { pageSize: 50 } } })
    );
  });
});
