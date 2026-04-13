import { QueryCache, QueryClient, MutationCache } from "@tanstack/react-query";
import { handleApiError } from "@/services/apiError";

/**
 * Application-wide QueryClient.
 *
 * Global error handler: every failed query or mutation automatically
 * calls handleApiError (toast + Sentry) so individual hooks don't need
 * to catch errors themselves.
 *
 * Default options:
 *  - staleTime 5 min  — medical scheduling data changes rarely
 *  - retry 1          — one retry on transient network errors
 *  - refetchOnWindowFocus false — avoid unexpected refetches mid-session
 */
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.suppressErrorToast) return;
      handleApiError(error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.suppressErrorToast) return;
      handleApiError(error);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default queryClient;
