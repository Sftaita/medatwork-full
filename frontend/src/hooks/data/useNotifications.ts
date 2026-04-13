import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { useMutation } from "@tanstack/react-query";
import useAxiosPrivate from "../useAxiosPrivate";
import notificationsApi from "../../services/notificationsApi";
import useNotificationContext from "../useNotificationContext";
import type { Notification } from "@/types/entities";
import type { NotificationsState } from "@/store/notificationsStore";
import type { Role } from "@/types/entities";

/**
 * Encapsulates the notification-page logic:
 * - Derives notificationData from the shared notification context (populated by polling).
 * - Calls markAllAsRead on mount (resets the unread badge to 0).
 * - Keeps notificationData in sync when new notifications arrive via polling.
 */
const useNotificationsPage = (
  role: Role
): {
  notifications: NotificationsState | undefined;
  notificationData: Notification[];
  setNotificationData: Dispatch<SetStateAction<Notification[]>>;
  loading: boolean;
  markAllAsRead: () => void;
} => {
  const axiosPrivate = useAxiosPrivate();
  const { notifications, setNotifications } = useNotificationContext();
  const [notificationData, setNotificationData] = useState<Notification[]>([]);
  const [previousCount, setPreviousCount] = useState<number | undefined>(notifications?.count);

  const { mutate: markAllAsRead } = useMutation({
    mutationFn: async () => {
      const { method, url } =
        role === "manager"
          ? notificationsApi.markManagerNotificationsAsRead()
          : notificationsApi.markResidentNotificationsAsRead();
      await axiosPrivate[method](url);
    },
    onMutate: () => {
      // Optimistic: reset the badge immediately
      setNotifications({ ...notifications, count: 0 });
      setNotificationData(notifications?.notifications ?? []);
    },
    // onError is handled globally by MutationCache in queryClient.ts
  });

  // Mark all as read and sync data on mount
  useEffect(() => {
    markAllAsRead();
    setNotificationData(notifications?.notifications ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync when new notifications arrive via polling (count increases)
  useEffect(() => {
    if (previousCount !== undefined && notifications?.count > previousCount) {
      setNotificationData(notifications?.notifications ?? []);
    }
    setPreviousCount(notifications?.count);
  }, [notifications?.count]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    notifications,
    notificationData,
    setNotificationData,
    loading: false,
    markAllAsRead,
  };
};

export default useNotificationsPage;
