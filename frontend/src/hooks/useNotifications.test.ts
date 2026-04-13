import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import useNotifications, { notificationsQueryKey } from "./useNotifications";
import type { Role } from "@/types/entities";

// ── Stable mocks ─────────────────────────────────────────────────────────────

const mockGet = vi.hoisted(() => vi.fn());
const stableAxios = vi.hoisted(() => ({ get: mockGet }));

vi.mock("../hooks/useAxiosPrivate", () => ({ default: () => stableAxios }));

const mockSetNotifications = vi.hoisted(() => vi.fn());
vi.mock("@/store/notificationsStore", () => ({
  useNotificationsStore: () => ({ setNotifications: mockSetNotifications }),
}));

vi.mock("@/services/logger", () => ({
  default: { error: vi.fn() },
}));

vi.mock("../services/notificationsApi", () => ({
  default: {
    getManagerNotifications: () => ({ method: "get", url: "/api/managers/notifications/unread" }),
    getResidentNotifications: () => ({ method: "get", url: "/api/residents/notifications/unread" }),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // Disable refetchInterval in tests — we control fetches manually
        refetchInterval: false,
      },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return { Wrapper, client };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useNotifications", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("does not fetch when role is undefined", async () => {
    const { Wrapper } = makeWrapper();
    renderHook(() => useNotifications(undefined), { wrapper: Wrapper });

    await new Promise((r) => setTimeout(r, 50));

    expect(mockGet).not.toHaveBeenCalled();
    expect(mockSetNotifications).not.toHaveBeenCalled();
  });

  it("does not fetch for an unrecognised role", async () => {
    const { Wrapper } = makeWrapper();
    renderHook(() => useNotifications("admin" as Role), { wrapper: Wrapper });

    await new Promise((r) => setTimeout(r, 50));

    expect(mockGet).not.toHaveBeenCalled();
  });

  it("calls the manager endpoint when role is manager", async () => {
    const { Wrapper } = makeWrapper();
    mockGet.mockResolvedValue({ data: [] });

    renderHook(() => useNotifications("manager"), { wrapper: Wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
    expect(mockGet).toHaveBeenCalledWith("/api/managers/notifications/unread");
  });

  it("calls the resident endpoint when role is resident", async () => {
    const { Wrapper } = makeWrapper();
    mockGet.mockResolvedValue({ data: [] });

    renderHook(() => useNotifications("resident"), { wrapper: Wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
    expect(mockGet).toHaveBeenCalledWith("/api/residents/notifications/unread");
  });

  it("syncs fetched notifications to the Zustand store", async () => {
    const { Wrapper } = makeWrapper();
    const notifications = [
      { id: 1, read: false, object: "A", body: "B", type: "validation", createdAt: "2026-01-01" },
      { id: 2, read: true, object: "C", body: "D", type: "validation", createdAt: "2026-01-02" },
    ];
    mockGet.mockResolvedValue({ data: notifications });

    renderHook(() => useNotifications("manager"), { wrapper: Wrapper });

    await waitFor(() => expect(mockSetNotifications).toHaveBeenCalled());
    expect(mockSetNotifications).toHaveBeenCalledWith({
      count: 1, // only 1 unread
      notifications,
    });
  });

  it("counts only unread notifications for the badge count", async () => {
    const { Wrapper } = makeWrapper();
    const notifications = [
      { id: 1, read: false },
      { id: 2, read: false },
      { id: 3, read: true },
    ];
    mockGet.mockResolvedValue({ data: notifications });

    renderHook(() => useNotifications("manager"), { wrapper: Wrapper });

    await waitFor(() => expect(mockSetNotifications).toHaveBeenCalled());
    const [call] = mockSetNotifications.mock.calls;
    expect(call[0].count).toBe(2);
  });

  it("logs errors silently without throwing", async () => {
    const logger = await import("@/services/logger");
    const { Wrapper } = makeWrapper();
    mockGet.mockRejectedValue(new Error("Network error"));

    renderHook(() => useNotifications("manager"), { wrapper: Wrapper });

    await waitFor(() => expect(logger.default.error).toHaveBeenCalled());
    expect(mockSetNotifications).not.toHaveBeenCalled();
  });

  it("uses the correct query key", () => {
    expect(notificationsQueryKey("manager")).toEqual(["notifications", "manager"]);
    expect(notificationsQueryKey("resident")).toEqual(["notifications", "resident"]);
    expect(notificationsQueryKey(undefined)).toEqual(["notifications", undefined]);
  });
});
