import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import notificationsApi from "../services/notificationsApi";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import logger from "@/services/logger";
import { useNotificationsStore } from "@/store/notificationsStore";
import type { Notification, Role } from "@/types/entities";

const POLL_INTERVAL_MS = 30_000;

export const notificationsQueryKey = (role: Role | undefined) => ["notifications", role] as const;

const useNotifications = (role: Role | undefined) => {
  const { setNotifications } = useNotificationsStore();
  const axiosPrivate = useAxiosPrivate();

  const { data, error } = useQuery<Notification[]>({
    queryKey: notificationsQueryKey(role),
    queryFn: async () => {
      const { method, url } =
        role === "manager"
          ? notificationsApi.getManagerNotifications()
          : notificationsApi.getResidentNotifications();
      const res = await axiosPrivate[method](url);
      return res?.data ?? [];
    },
    enabled: role === "manager" || role === "resident",
    refetchInterval: POLL_INTERVAL_MS,
    retry: false,
    // Suppress global toast for background polling failures
    meta: { suppressErrorToast: true },
  });

  // Sync query cache → Zustand store so all consumers (e.g. SidebarNav badge) stay in sync
  useEffect(() => {
    if (data !== undefined) {
      setNotifications({
        count: data.filter((n) => !n.read).length,
        notifications: data,
      });
    }
  }, [data, setNotifications]);

  // Log errors silently — no toast for a background poll failure
  useEffect(() => {
    if (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)));
    }
  }, [error]);
};

export default useNotifications;
