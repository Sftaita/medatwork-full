import { useState, type Dispatch, type SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";
import useAxiosPrivate from "../useAxiosPrivate";
import timesheetsApi from "../../services/timesheetsApi";
import type { Year } from "@/types/entities";

export const RESIDENT_YEARS_KEY = ["residentYears"];

const useResidentYears = (): {
  years: Year[];
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
} => {
  const axiosPrivate = useAxiosPrivate();
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const { data: years = [], isLoading: isFetching } = useQuery<Year[]>({
    queryKey: RESIDENT_YEARS_KEY,
    queryFn: async () => {
      const { method, url } = timesheetsApi.findResidentYears();
      const res = await axiosPrivate[method](url);
      return res?.data ?? [];
    },
  });

  return {
    years,
    loading: isFetching || actionLoading,
    setLoading: setActionLoading,
  };
};

export default useResidentYears;
