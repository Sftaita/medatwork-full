import {
  COMMUNICATIONS_API,
  ADMIN_COMMUNICATIONS_API,
  HOSPITAL_ADMIN_COMMUNICATIONS_API,
} from "../config";
import type { ApiCall } from "./api.types";

// ─── User endpoints (all authenticated users) ────────────────────────────────

const communicationsApi = {
  // Notifications
  getNotifications(): ApiCall {
    return { method: "get", url: `${COMMUNICATIONS_API}/notifications` };
  },
  getUnreadCount(): ApiCall {
    return { method: "get", url: `${COMMUNICATIONS_API}/notifications/unread-count` };
  },
  markNotificationRead(id: number): ApiCall {
    return { method: "patch", url: `${COMMUNICATIONS_API}/notifications/${id}/read` };
  },
  markNotificationUnread(id: number): ApiCall {
    return { method: "delete", url: `${COMMUNICATIONS_API}/notifications/${id}/read` };
  },
  markAllNotificationsRead(): ApiCall {
    return { method: "patch", url: `${COMMUNICATIONS_API}/notifications/read-all` };
  },

  // Modals
  getPendingModals(): ApiCall {
    return { method: "get", url: `${COMMUNICATIONS_API}/modals/pending` };
  },
  markModalRead(id: number): ApiCall {
    return { method: "patch", url: `${COMMUNICATIONS_API}/modals/${id}/read` };
  },
};

// ─── Super-admin endpoints ────────────────────────────────────────────────────

export const adminCommunicationsApi = {
  list(): ApiCall {
    return { method: "get", url: ADMIN_COMMUNICATIONS_API };
  },
  create(): ApiCall {
    return { method: "post", url: ADMIN_COMMUNICATIONS_API };
  },
  update(id: number): ApiCall {
    return { method: "put", url: `${ADMIN_COMMUNICATIONS_API}/${id}` };
  },
  delete(id: number): ApiCall {
    return { method: "delete", url: `${ADMIN_COMMUNICATIONS_API}/${id}` };
  },
  toggleActive(id: number): ApiCall {
    return { method: "patch", url: `${ADMIN_COMMUNICATIONS_API}/${id}/toggle-active` };
  },
  duplicate(id: number): ApiCall {
    return { method: "post", url: `${ADMIN_COMMUNICATIONS_API}/${id}/duplicate` };
  },
  listUsers(): ApiCall {
    return { method: "get", url: `${ADMIN_COMMUNICATIONS_API}/users` };
  },
};

// ─── Hospital-admin endpoints ─────────────────────────────────────────────────

export const hospitalAdminCommunicationsApi = {
  list(): ApiCall {
    return { method: "get", url: HOSPITAL_ADMIN_COMMUNICATIONS_API };
  },
  create(): ApiCall {
    return { method: "post", url: HOSPITAL_ADMIN_COMMUNICATIONS_API };
  },
  update(id: number): ApiCall {
    return { method: "put", url: `${HOSPITAL_ADMIN_COMMUNICATIONS_API}/${id}` };
  },
  delete(id: number): ApiCall {
    return { method: "delete", url: `${HOSPITAL_ADMIN_COMMUNICATIONS_API}/${id}` };
  },
  toggleActive(id: number): ApiCall {
    return { method: "patch", url: `${HOSPITAL_ADMIN_COMMUNICATIONS_API}/${id}/toggle-active` };
  },
  duplicate(id: number): ApiCall {
    return { method: "post", url: `${HOSPITAL_ADMIN_COMMUNICATIONS_API}/${id}/duplicate` };
  },
  listUsers(): ApiCall {
    return { method: "get", url: `${HOSPITAL_ADMIN_COMMUNICATIONS_API}/users` };
  },
};

export default communicationsApi;
