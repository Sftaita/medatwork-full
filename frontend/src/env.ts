/**
 * Validated environment variables.
 *
 * All access to import.meta.env should go through this module.
 * If a required variable is missing the app throws at boot with a clear message
 * rather than failing silently at runtime.
 */
import { z } from "zod";

const envSchema = z.object({
  /** Base URL of the REST API — must end with /api/ */
  VITE_API_URL: z
    .string()
    .url()
    .default("http://localhost:8000/api/"),

  /**
   * Sentry DSN — optional in development, expected in production.
   * An empty string disables Sentry (Sentry's own behaviour).
   */
  VITE_SENTRY_DSN: z.string().default(""),

  /** Semantic version injected at build time (e.g. "1.2.3"). */
  VITE_APP_VERSION: z.string().default("0.0.0"),
});

const _parsed = envSchema.safeParse({
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION,
});

if (!_parsed.success) {
  const issues = _parsed.error.issues
    .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`[env] Invalid environment variables:\n${issues}`);
}

const env = _parsed.data;

export default env;
