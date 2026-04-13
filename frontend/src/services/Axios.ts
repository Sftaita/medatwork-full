import axios, { type AxiosError } from "axios";
import { API_URL } from "../config";
import logger from "./logger";

export const axiosPrivate = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Intercept API errors and forward unexpected ones to Sentry.
// 401/403 are normal auth flow — never log them as errors.
axiosPrivate.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const isAuthError = status === 401 || status === 403;

    if (!isAuthError) {
      logger.error(error as unknown as Error, {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        status: status ?? "network_error",
        responseMessage: (error.response?.data as Record<string, unknown>)?.message ?? null,
      });
    }

    return Promise.reject(error);
  }
);
