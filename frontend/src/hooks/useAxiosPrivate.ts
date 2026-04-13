import { type AxiosInstance } from "axios";
import { useEffect } from "react";
import { axiosPrivate } from "../services/Axios";
import useRefreshToken from "./useRefreshToken";
import useAuth from "./useAuth";

// Module-level lock: if a refresh is already in flight, all concurrent 401s
// await the same promise instead of triggering multiple refresh calls.
// With single_use:true on the backend, only the first refresh succeeds —
// subsequent parallel refreshes would consume the new token and log the user out.
let refreshPromise: Promise<string> | null = null;

const useAxiosPrivate = (): AxiosInstance => {
  const refresh = useRefreshToken();
  const { authentication } = useAuth();

  useEffect(() => {
    const requestIntercept = axiosPrivate.interceptors.request.use(
      (config) => {
        if (!config.headers["Authorization"]) {
          config.headers["Authorization"] = `Bearer ${authentication.AccessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseIntercept = axiosPrivate.interceptors.response.use(
      (response) => response,
      async (error) => {
        const prevRequest = error?.config as typeof error.config & {
          sent?: boolean;
        };
        if (error?.response?.status === 401 && !prevRequest?.sent) {
          prevRequest.sent = true;

          // If no refresh is in flight, start one and store the promise.
          // If one is already running, reuse it — all waiters get the same token.
          if (!refreshPromise) {
            refreshPromise = refresh().finally(() => {
              refreshPromise = null;
            });
          }

          const newAccessToken = await refreshPromise;
          prevRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
          return axiosPrivate(prevRequest);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axiosPrivate.interceptors.request.eject(requestIntercept);
      axiosPrivate.interceptors.response.eject(responseIntercept);
    };
  }, [authentication, refresh]);

  return axiosPrivate;
};

export default useAxiosPrivate;
