import * as Sentry from "@sentry/react";
import type { Role } from "@/types/entities";

interface LogExtra {
  [key: string]: unknown;
}

interface UserContext {
  id: number;
  role: Role;
}

const logger = {
  error(error: Error, extra: LogExtra = {}): void {
    Sentry.captureException(error, { extra });
  },

  warn(message: string, extra: LogExtra = {}): void {
    Sentry.captureMessage(message, { level: "warning", extra });
  },

  info(message: string, extra: LogExtra = {}): void {
    Sentry.captureMessage(message, { level: "info", extra });
  },

  setUser(user: UserContext): void {
    Sentry.setUser({ id: String(user.id), role: user.role });
  },

  clearUser(): void {
    Sentry.setUser(null);
  },
};

export default logger;
