import { describe, it, expect, vi, beforeEach } from "vitest";
import notificationsApi from "./notificationsApi";

vi.mock("../config", () => ({
  MANAGERS_API: "http://api/managers",
  RESIDENTS_API: "http://api/residents",
}));

describe("notificationsApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getManagerNotifications", () => {
    it("uses GET method", () => {
      expect(notificationsApi.getManagerNotifications().method).toBe("get");
    });

    it("targets the unread endpoint", () => {
      expect(notificationsApi.getManagerNotifications().url).toBe(
        "http://api/managers/notifications/unread"
      );
    });
  });

  describe("markManagerNotificationsAsRead", () => {
    it("uses PATCH method", () => {
      expect(notificationsApi.markManagerNotificationsAsRead().method).toBe("patch");
    });

    it("targets the mark-all-as-read endpoint", () => {
      expect(notificationsApi.markManagerNotificationsAsRead().url).toBe(
        "http://api/managers/notifications/mark-all-as-read"
      );
    });
  });

  describe("getResidentNotifications", () => {
    it("uses GET method", () => {
      expect(notificationsApi.getResidentNotifications().method).toBe("get");
    });

    it("targets the unread endpoint", () => {
      expect(notificationsApi.getResidentNotifications().url).toBe(
        "http://api/residents/notifications/unread"
      );
    });
  });

  describe("markResidentNotificationsAsRead", () => {
    it("uses PATCH method", () => {
      expect(notificationsApi.markResidentNotificationsAsRead().method).toBe("patch");
    });

    it("targets the mark-all-as-read endpoint", () => {
      expect(notificationsApi.markResidentNotificationsAsRead().url).toBe(
        "http://api/residents/notifications/mark-all-as-read"
      );
    });
  });
});
