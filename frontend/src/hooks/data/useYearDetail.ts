import { useQueries } from "@tanstack/react-query";
import useAxiosPrivate from "../useAxiosPrivate";
import yearsApi from "../../services/yearsApi";
import periodsApi from "../../services/periodsApi";
import type { Year } from "@/types/entities";

/**
 * Fetches year detail and the period report in parallel.
 *
 * @param yearId
 * @returns {{ year: Year | null, periodReport: unknown | null, loading: boolean }}
 */
const useYearDetail = (
  yearId: string | number | undefined
): { year: Year | null; periodReport: unknown | null; loading: boolean } => {
  const axiosPrivate = useAxiosPrivate();

  const [yearQuery, reportQuery] = useQueries({
    queries: [
      {
        queryKey: ["year", yearId],
        queryFn: async (): Promise<Year | null> => {
          const { method, url } = yearsApi.getYearById();
          const res = await axiosPrivate[method](url + yearId);
          return res?.data ?? null;
        },
        enabled: !!yearId,
      },
      {
        queryKey: ["periodReport", yearId],
        queryFn: async (): Promise<unknown | null> => {
          const { method, url } = periodsApi.getPeriodReport();
          const res = await axiosPrivate[method](url + yearId);
          return res?.data ?? null;
        },
        enabled: !!yearId,
      },
    ],
  });

  return {
    year: yearQuery.data ?? null,
    periodReport: reportQuery.data ?? null,
    loading: yearQuery.isLoading || reportQuery.isLoading,
  };
};

export default useYearDetail;
