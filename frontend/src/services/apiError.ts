import { toast } from "react-toastify";
import type { AxiosError } from "axios";
import logger from "./logger";
import { toastError } from "../doc/ToastParams";

interface ApiErrorResponse {
  message?: string;
}

export function handleApiError(error: unknown): void {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(err);

  const axiosError = error as AxiosError<ApiErrorResponse>;
  const serverMessage = axiosError?.response?.data?.message;
  const message = serverMessage ?? "Oups ! Une erreur s'est produite.";

  toast.error(message, toastError);
}
