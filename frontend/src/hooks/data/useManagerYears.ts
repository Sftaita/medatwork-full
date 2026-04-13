import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import useAxiosPrivate from "../useAxiosPrivate";
import yearsApi from "../../services/yearsApi";
import type { Year } from "@/types/entities";

export const MANAGER_YEARS_KEY = ["managerYears"];

/**
 * Fetches and caches the manager's year list.
 *
 * - `years`      — cached list (empty array while loading)
 * - `setYears`   — optimistic update via queryClient.setQueryData
 * - `loading`    — true during initial fetch OR an explicit action (Excel export, etc.)
 * - `setLoading` — lets child components signal an in-progress action
 */
const useManagerYears = (): {
  years: Year[];
  setYears: (updater: Year[] | ((prev: Year[]) => Year[])) => void;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
} => {
  const axiosPrivate = useAxiosPrivate();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const { data: years = [], isLoading: isFetching } = useQuery<Year[]>({
    queryKey: MANAGER_YEARS_KEY,
    queryFn: async () => {
      const { method, url } = yearsApi.findAll();
      const res = await axiosPrivate[method](url);
      return res?.data ?? [];
    },
  });

  const setYears = useCallback(
    (updater: Year[] | ((prev: Year[]) => Year[])) => {
      queryClient.setQueryData(MANAGER_YEARS_KEY, (old: Year[] = []) =>
        typeof updater === "function" ? updater(old) : updater
      );
    },
    [queryClient]
  );

  return {
    years,
    setYears,
    loading: isFetching || actionLoading,
    setLoading: setActionLoading,
  };
};

export default useManagerYears;
