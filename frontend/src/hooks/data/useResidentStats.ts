import { useQuery } from "@tanstack/react-query";
import useAxiosPrivate from "../useAxiosPrivate";
import timesheetsApi from "../../services/timesheetsApi";
import type { Year } from "@/types/entities";

interface UseResidentStatsParams {
  month: number;
  year: number;
  yearId?: string | number;
}

/**
 * Fetches resident statistics.
 *
 * First load (no yearId): fetches from getResidentStatisticsAtFirstLoad,
 * which returns both a years list and initial stats.
 *
 * When yearId is provided: fetches from getResidentRealtimeByMonthAndYear
 * for the specific month/year/yearId combination, keyed so React Query
 * re-fetches automatically when any of those values change.
 */
const useResidentStats = ({
  month,
  year,
  yearId,
}: UseResidentStatsParams): {
  stats: unknown | null;
  years: Year[];
  loading: boolean;
} => {
  const axiosPrivate = useAxiosPrivate();

  const firstLoadQuery = useQuery<{ years: Year[]; statistics: unknown[] }>({
    queryKey: ["residentStats", "firstLoad", month, year],
    queryFn: async () => {
      const { method, url } = timesheetsApi.getResidentStatisticsAtFirstLoad();
      const res = await axiosPrivate[method](url + month + "" + year);
      return res?.data ?? { years: [], statistics: [] };
    },
  });

  const byYearQuery = useQuery<unknown | null>({
    queryKey: ["residentStats", yearId, month, year],
    queryFn: async () => {
      const { method, url } = timesheetsApi.getResidentRealtimeByMonthAndYear();
      const res = await axiosPrivate[method](url + month + year + "/" + yearId);
      return res?.data ?? null;
    },
    enabled: !!yearId,
  });

  const firstLoadData = firstLoadQuery.data;
  const stats = yearId ? (byYearQuery.data ?? null) : (firstLoadData?.statistics?.[0] ?? null);
  const years: Year[] = firstLoadData?.years ?? [];

  return {
    stats,
    years,
    loading: firstLoadQuery.isLoading || (!!yearId && byYearQuery.isLoading),
  };
};

export default useResidentStats;
