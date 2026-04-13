import { MANAGERS_API, RESIDENTS_API } from "../config";
import type { ApiCall } from "./api.types";

const notificationsApi = {
  getManagerNotifications(): ApiCall {
    return {
      method: "get",
      url: MANAGERS_API + "/notifications/unread",
    };
  },

  markManagerNotificationsAsRead(): ApiCall {
    return {
      method: "patch",
      url: MANAGERS_API + "/notifications/mark-all-as-read",
    };
  },

  getResidentNotifications(): ApiCall {
    return {
      method: "get",
      url: RESIDENTS_API + "/notifications/unread",
    };
  },

  markResidentNotificationsAsRead(): ApiCall {
    return {
      method: "patch",
      url: RESIDENTS_API + "/notifications/mark-all-as-read",
    };
  },
};

export default notificationsApi;
