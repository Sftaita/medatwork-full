/**
 * P0 — useYearNotifPrefs hook
 *
 * RED attendu : Module "src/hooks/useYearNotifPrefs" not found
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useYearNotifPrefs } from "../hooks/useYearNotifPrefs";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGet  = vi.hoisted(() => vi.fn());
const mockPut  = vi.hoisted(() => vi.fn());
const mockPatch = vi.hoisted(() => vi.fn());
const stableAxios = vi.hoisted(() => ({
  get:   mockGet,
  patch: mockPatch,
  put:   mockPut,
}));

vi.mock("../hooks/useAxiosPrivate", () => ({ default: () => stableAxios }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fb?: string) => fb ?? key,
  }),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const YEAR_ID = 42;

const DEFAULT_PREFS = {
  COMPLIANCE_ALERT:         { email: true,  push: true,  sms: false, callRh: false },
  MONTH_VALIDATION:         { email: true,  push: false, sms: false, callRh: false },
  STAFFPLANNER_EXPORT_DONE: { email: true,  push: false, sms: false, callRh: false },
  RESIDENT_INACTIVE:        { email: true,  push: true,  sms: false, callRh: false },
  YEAR_ENDING:              { email: true,  push: true,  sms: false, callRh: false },
  SCHEDULE_CHANGED:         { email: false, push: true,  sms: false, callRh: false },
  VALIDATION_REJECTED:      { email: true,  push: true,  sms: false, callRh: false },
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── H-FE01 : GET réussi → données retournées ─────────────────────────────────

describe("useYearNotifPrefs — lecture", () => {
  it("H-FE01 retourne les prefs si GET réussit", async () => {
    mockGet.mockResolvedValueOnce({ data: { prefs: DEFAULT_PREFS } });

    const { result } = renderHook(() => useYearNotifPrefs(YEAR_ID));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.prefs).toEqual(DEFAULT_PREFS);
    expect(result.current.error).toBeNull();
  });

  it("H-FE02 retourne une erreur ACCESS_DENIED si GET retourne 403", async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 403 } });

    const { result } = renderHook(() => useYearNotifPrefs(YEAR_ID));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.prefs).toBeNull();
    expect(result.current.error).toBe("ACCESS_DENIED");
  });

  it("H-FE03 retourne une erreur YEAR_NOT_FOUND si GET retourne 404", async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 404 } });

    const { result } = renderHook(() => useYearNotifPrefs(YEAR_ID));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("YEAR_NOT_FOUND");
  });

  it("H-FE04 retourne une erreur NETWORK_ERROR si GET échoue sans réponse", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network Error"));

    const { result } = renderHook(() => useYearNotifPrefs(YEAR_ID));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("NETWORK_ERROR");
  });

  it("H-FE11 ne déclenche pas de requête si yearId est null", async () => {
    const { result } = renderHook(() => useYearNotifPrefs(null));

    // Petit délai pour laisser le temps à un éventuel effect de se déclencher
    await new Promise(r => setTimeout(r, 50));

    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.prefs).toBeNull();
  });
});

// ── H-FE05–08 : PATCH ─────────────────────────────────────────────────────────

describe("useYearNotifPrefs — écriture", () => {
  it("H-FE05 met à jour les prefs après un PATCH réussi", async () => {
    const updatedPrefs = {
      ...DEFAULT_PREFS,
      COMPLIANCE_ALERT: { email: false, push: true, sms: false, callRh: false },
    };

    mockGet.mockResolvedValueOnce({ data: { prefs: DEFAULT_PREFS } });
    mockPatch.mockResolvedValueOnce({ data: { prefs: updatedPrefs } });

    const { result } = renderHook(() => useYearNotifPrefs(YEAR_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.patch({ COMPLIANCE_ALERT: { email: false } });
    });

    expect(result.current.prefs?.COMPLIANCE_ALERT.email).toBe(false);
  });

  it("H-FE06 retourne une erreur 400 si PATCH retourne 400", async () => {
    mockGet.mockResolvedValueOnce({ data: { prefs: DEFAULT_PREFS } });
    mockPatch.mockRejectedValueOnce({ response: { status: 400, data: { message: "Invalid channel" } } });

    const { result } = renderHook(() => useYearNotifPrefs(YEAR_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let patchError: string | null = null;
    await act(async () => {
      patchError = await result.current.patch({ COMPLIANCE_ALERT: { email: false } });
    });

    expect(patchError).toBeTruthy();
  });

  it("H-FE07 retourne erreur ACCESS_DENIED si PATCH retourne 403", async () => {
    mockGet.mockResolvedValueOnce({ data: { prefs: DEFAULT_PREFS } });
    mockPatch.mockRejectedValueOnce({ response: { status: 403 } });

    const { result } = renderHook(() => useYearNotifPrefs(YEAR_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let patchError: string | null = null;
    await act(async () => {
      patchError = await result.current.patch({});
    });

    expect(patchError).toContain("ACCESS_DENIED");
  });

  it("H-FE08 retourne erreur NETWORK_ERROR si PATCH échoue sans réponse", async () => {
    mockGet.mockResolvedValueOnce({ data: { prefs: DEFAULT_PREFS } });
    mockPatch.mockRejectedValueOnce(new Error("Network Error"));

    const { result } = renderHook(() => useYearNotifPrefs(YEAR_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let patchError: string | null = null;
    await act(async () => {
      patchError = await result.current.patch({});
    });

    expect(patchError).toContain("NETWORK_ERROR");
  });

  it("le payload PATCH ne contient jamais userId ni yearId", async () => {
    mockGet.mockResolvedValueOnce({ data: { prefs: DEFAULT_PREFS } });
    mockPatch.mockResolvedValueOnce({ data: { prefs: DEFAULT_PREFS } });

    const { result } = renderHook(() => useYearNotifPrefs(YEAR_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.patch({ COMPLIANCE_ALERT: { email: false } });
    });

    const [patchUrl, patchBody] = mockPatch.mock.calls[0] as [string, unknown];

    // L'URL contient le yearId → pas dans le body
    expect(patchUrl).toContain(`${YEAR_ID}`);

    // Le body ne doit pas contenir userId ni yearId
    const bodyStr = JSON.stringify(patchBody);
    expect(bodyStr).not.toContain('"userId"');
    expect(bodyStr).not.toContain('"yearId"');
    expect(bodyStr).not.toContain('"user_id"');
  });
});

// ── H-FE10 : changement de yearId déclenche un refetch ───────────────────────

describe("useYearNotifPrefs — changement d'année", () => {
  it("H-FE10 refetch quand le yearId change", async () => {
    mockGet.mockResolvedValue({ data: { prefs: DEFAULT_PREFS } });

    const { rerender } = renderHook(
      ({ id }: { id: number | null }) => useYearNotifPrefs(id),
      { initialProps: { id: 1 } }
    );

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    rerender({ id: 2 });

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));

    // Le 2e GET doit cibler l'année 2
    expect(mockGet.mock.calls[1][0]).toContain("2");
  });
});
