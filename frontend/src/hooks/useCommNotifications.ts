import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import communicationsApi from "../services/communicationsApi";
import useAxiosPrivate from "./useAxiosPrivate";
import useAuth from "./useAuth";
import logger from "@/services/logger";
import { useNotificationsStore } from "@/store/notificationsStore";
import type { Role } from "@/types/entities";

const POLL_INTERVAL_MS = 30_000;

export const commUnreadCountQueryKey = (role: Role | undefined) =>
  ["comm-unread-count", role] as const;

/**
 * Polls the communication unread-count endpoint every 30 s and writes the
 * result into the notifications store.  Runs for any authenticated role.
 */
const useCommNotifications = (role: Role | undefined) => {
  const { setCommUnreadCount } = useNotificationsStore();
  const { authentication } = useAuth();
  const axiosPrivate = useAxiosPrivate();

  const { data, error } = useQuery<{ count: number }>({
    queryKey: commUnreadCountQueryKey(role),
    queryFn: async () => {
      const { method, url } = communicationsApi.getUnreadCount();
      const res = await axiosPrivate[method](url);
      return res?.data ?? { count: 0 };
    },
    enabled: !!authentication.AccessToken && role !== undefined && role !== 'super_admin',
    refetchInterval: POLL_INTERVAL_MS,
    retry: false,
    meta: { suppressErrorToast: true },
  });

  useEffect(() => {
    if (data !== undefined) {
      setCommUnreadCount(data.count ?? 0);
    }
  }, [data, setCommUnreadCount]);

  useEffect(() => {
    if (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)));
    }
  }, [error]);
};

export default useCommNotifications;
