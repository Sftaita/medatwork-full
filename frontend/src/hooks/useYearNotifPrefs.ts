import { useState, useEffect, useCallback } from "react";
import useAxiosPrivate from "./useAxiosPrivate";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Channel   = "email" | "push" | "sms" | "callRh";
export type EventPrefs = Record<Channel, boolean>;
export type YearPrefs  = Record<string, EventPrefs>;

export type PatchBody = Record<string, Partial<EventPrefs>>;

type HookError = "ACCESS_DENIED" | "YEAR_NOT_FOUND" | "NETWORK_ERROR" | string | null;

export interface UseYearNotifPrefsResult {
  prefs:   YearPrefs | null;
  loading: boolean;
  error:   HookError;
  /** Envoie un PATCH partiel. Retourne null si succès, message d'erreur sinon. */
  patch:   (body: PatchBody) => Promise<string | null>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useYearNotifPrefs(yearId: number | null): UseYearNotifPrefsResult {
  const axiosPrivate = useAxiosPrivate();

  const [prefs,   setPrefs]   = useState<YearPrefs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<HookError>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchPrefs = useCallback(async () => {
    if (yearId === null) return;

    setLoading(true);
    setError(null);

    try {
      const res = await axiosPrivate.get<{ prefs: YearPrefs }>(
        `years/${yearId}/my-notif-prefs`
      );
      setPrefs(res.data.prefs);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setError("ACCESS_DENIED");
      } else if (status === 404) {
        setError("YEAR_NOT_FOUND");
      } else {
        setError("NETWORK_ERROR");
      }
      setPrefs(null);
    } finally {
      setLoading(false);
    }
  }, [yearId, axiosPrivate]);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  // ── Patch ─────────────────────────────────────────────────────────────────

  const patch = useCallback(async (body: PatchBody): Promise<string | null> => {
    if (yearId === null) return "YEAR_NOT_FOUND";

    // Sécurité : s'assurer que userId/yearId ne sont pas dans le body
    const safeBody = { ...body };
    delete (safeBody as Record<string, unknown>)["userId"];
    delete (safeBody as Record<string, unknown>)["yearId"];

    try {
      const res = await axiosPrivate.patch<{ prefs: YearPrefs }>(
        `years/${yearId}/my-notif-prefs`,
        safeBody
      );
      setPrefs(res.data.prefs);
      return null; // succès
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) return "ACCESS_DENIED";
      if (status === 404) return "YEAR_NOT_FOUND";
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      return msg ?? "NETWORK_ERROR";
    }
  }, [yearId, axiosPrivate]);

  return { prefs, loading, error, patch };
}

export default useYearNotifPrefs;
