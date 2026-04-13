import { useEffect, useState } from "react";
import useAxiosPrivate from "./useAxiosPrivate";
import type { HttpMethod } from "@/services/api.types";

interface UseAxiosConfig {
  method: HttpMethod;
  url: string;
  requestConfig?: Record<string, unknown>;
}

const useAxios = <T = unknown>(
  configObj: UseAxiosConfig
): [T | null, string | null, boolean] => {
  const axiosPrivate = useAxiosPrivate();
  const { method, url, requestConfig = {} } = configObj;

  const [response, setResponse] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        const res = await axiosPrivate[method.toLowerCase() as HttpMethod](url, {
          ...requestConfig,
          signal: controller.signal,
        });
        setResponse(res.data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [axiosPrivate, method, requestConfig, url]);

  return [response, error, loading];
};

export default useAxios;
