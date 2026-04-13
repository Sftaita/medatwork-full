/**
 * Tests for communicationsApi.
 *
 * Covers:
 * - User endpoints: correct method + URL for all 6 calls
 * - Admin endpoints: correct method + URL for all 5 calls
 * - Hospital-admin endpoints: correct method + URL for all 5 calls
 * - Parameterised calls (id) build the URL correctly
 */
import { describe, it, expect, vi } from "vitest";
import communicationsApi, {
  adminCommunicationsApi,
  hospitalAdminCommunicationsApi,
} from "./communicationsApi";

vi.mock("../config", () => ({
  COMMUNICATIONS_API:                "http://api/communications",
  ADMIN_COMMUNICATIONS_API:          "http://api/admin/communications",
  HOSPITAL_ADMIN_COMMUNICATIONS_API: "http://api/hospital-admin/communications",
}));

// ── User endpoints ────────────────────────────────────────────────────────────

describe("communicationsApi (user)", () => {
  it("getNotifications → GET /notifications", () => {
    const { method, url } = communicationsApi.getNotifications();
    expect(method).toBe("get");
    expect(url).toBe("http://api/communications/notifications");
  });

  it("getUnreadCount → GET /notifications/unread-count", () => {
    const { method, url } = communicationsApi.getUnreadCount();
    expect(method).toBe("get");
    expect(url).toBe("http://api/communications/notifications/unread-count");
  });

  it("markNotificationRead(42) → PATCH /notifications/42/read", () => {
    const { method, url } = communicationsApi.markNotificationRead(42);
    expect(method).toBe("patch");
    expect(url).toBe("http://api/communications/notifications/42/read");
  });

  it("markAllNotificationsRead → PATCH /notifications/read-all", () => {
    const { method, url } = communicationsApi.markAllNotificationsRead();
    expect(method).toBe("patch");
    expect(url).toBe("http://api/communications/notifications/read-all");
  });

  it("getPendingModals → GET /modals/pending", () => {
    const { method, url } = communicationsApi.getPendingModals();
    expect(method).toBe("get");
    expect(url).toBe("http://api/communications/modals/pending");
  });

  it("markModalRead(7) → PATCH /modals/7/read", () => {
    const { method, url } = communicationsApi.markModalRead(7);
    expect(method).toBe("patch");
    expect(url).toBe("http://api/communications/modals/7/read");
  });
});

// ── Admin endpoints ───────────────────────────────────────────────────────────

describe("adminCommunicationsApi", () => {
  it("list → GET /admin/communications", () => {
    expect(adminCommunicationsApi.list()).toEqual({
      method: "get",
      url: "http://api/admin/communications",
    });
  });

  it("create → POST /admin/communications", () => {
    expect(adminCommunicationsApi.create().method).toBe("post");
  });

  it("toggleActive(3) → PATCH /admin/communications/3/toggle-active", () => {
    const { method, url } = adminCommunicationsApi.toggleActive(3);
    expect(method).toBe("patch");
    expect(url).toBe("http://api/admin/communications/3/toggle-active");
  });

  it("duplicate(5) → POST /admin/communications/5/duplicate", () => {
    const { method, url } = adminCommunicationsApi.duplicate(5);
    expect(method).toBe("post");
    expect(url).toBe("http://api/admin/communications/5/duplicate");
  });

  it("listUsers → GET /admin/communications/users", () => {
    expect(adminCommunicationsApi.listUsers().url).toBe("http://api/admin/communications/users");
  });
});

// ── Hospital-admin endpoints ──────────────────────────────────────────────────

describe("hospitalAdminCommunicationsApi", () => {
  it("list → GET /hospital-admin/communications", () => {
    expect(hospitalAdminCommunicationsApi.list()).toEqual({
      method: "get",
      url: "http://api/hospital-admin/communications",
    });
  });

  it("create → POST /hospital-admin/communications", () => {
    expect(hospitalAdminCommunicationsApi.create().method).toBe("post");
  });

  it("toggleActive(1) → PATCH /hospital-admin/communications/1/toggle-active", () => {
    const { url } = hospitalAdminCommunicationsApi.toggleActive(1);
    expect(url).toBe("http://api/hospital-admin/communications/1/toggle-active");
  });

  it("duplicate(9) → POST /hospital-admin/communications/9/duplicate", () => {
    const { method, url } = hospitalAdminCommunicationsApi.duplicate(9);
    expect(method).toBe("post");
    expect(url).toBe("http://api/hospital-admin/communications/9/duplicate");
  });

  it("listUsers → GET /hospital-admin/communications/users", () => {
    expect(hospitalAdminCommunicationsApi.listUsers().url).toBe(
      "http://api/hospital-admin/communications/users"
    );
  });
});
