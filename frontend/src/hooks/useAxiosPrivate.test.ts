import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useAxiosPrivate from "./useAxiosPrivate";

// ── Shared state captured from the mock ───────────────────────────────────────
//
// The hook adds interceptors to `axiosPrivate` inside a useEffect.
// We capture the callbacks here so tests can invoke them directly,
// without needing a real HTTP layer.

const captured = vi.hoisted(() => ({
  requestHandler: null as ((config: any) => any) | null,
  responseErrorHandler: null as ((error: any) => Promise<any>) | null,
}));

// ── Mock: axiosPrivate ────────────────────────────────────────────────────────
//
// A callable mock (acts as `axiosPrivate(prevRequest)` for retries) with the
// interceptors API attached.

const mockAxiosCall = vi.hoisted(() => vi.fn());

vi.mock("../services/Axios", () => ({
  axiosPrivate: Object.assign(mockAxiosCall, {
    interceptors: {
      request: {
        use: (onFulfilled: any) => {
          captured.requestHandler = onFulfilled;
          return 1;
        },
        eject: vi.fn(),
      },
      response: {
        use: (_: any, onRejected: any) => {
          captured.responseErrorHandler = onRejected;
          return 2;
        },
        eject: vi.fn(),
      },
    },
  }),
}));

// ── Mock: useRefreshToken ─────────────────────────────────────────────────────

const mockRefresh = vi.hoisted(() => vi.fn());

vi.mock("./useRefreshToken", () => ({
  default: () => mockRefresh,
}));

// ── Mock: useAuth ─────────────────────────────────────────────────────────────

vi.mock("./useAuth", () => ({
  default: () => ({
    authentication: { AccessToken: "current-access-token" },
    setAuthentication: vi.fn(),
  }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Simulates an Axios error with a 401 response. */
const make401 = () => ({
  response: { status: 401 },
  config: {
    headers: { Authorization: "Bearer expired-token" } as Record<string, string>,
  } as Record<string, any>,
});

/** Renders the hook and returns the captured interceptor handlers. */
const setup = () => {
  renderHook(() => useAxiosPrivate());
  return {
    request: captured.requestHandler!,
    responseError: captured.responseErrorHandler!,
  };
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useAxiosPrivate — request interceptor", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("ajoute le header Authorization si absent", () => {
    const { request } = setup();
    const config = { headers: {} as Record<string, string> };

    const result = request(config);

    expect(result.headers["Authorization"]).toBe("Bearer current-access-token");
  });

  it("ne modifie pas le header Authorization s'il est déjà présent", () => {
    const { request } = setup();
    const config = { headers: { Authorization: "Bearer autre-token" } };

    const result = request(config);

    expect(result.headers["Authorization"]).toBe("Bearer autre-token");
  });
});

describe("useAxiosPrivate — response interceptor", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("laisse passer les erreurs non-401 sans déclencher de refresh", async () => {
    const { responseError } = setup();
    const error = { response: { status: 500 }, config: { headers: {} } };

    await expect(responseError(error)).rejects.toMatchObject({ response: { status: 500 } });
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("déclenche un refresh et retente la requête sur une 401", async () => {
    mockRefresh.mockResolvedValueOnce("new-token");
    mockAxiosCall.mockResolvedValueOnce({ data: "retried-response" });

    const { responseError } = setup();
    const result = await responseError(make401());

    expect(mockRefresh).toHaveBeenCalledOnce();
    expect(mockAxiosCall).toHaveBeenCalledOnce();
    // La requête rejouée doit porter le nouveau token
    expect(mockAxiosCall.mock.calls[0][0].headers["Authorization"]).toBe("Bearer new-token");
    expect(result).toEqual({ data: "retried-response" });
  });

  it("ne retente pas une requête déjà marquée 'sent' (évite les boucles infinies)", async () => {
    const { responseError } = setup();
    const error = make401();
    error.config.sent = true; // already retried once

    await expect(responseError(error)).rejects.toMatchObject({ response: { status: 401 } });
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});

describe("useAxiosPrivate — verrou de refresh concurrent", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("deux 401 simultanés ne déclenchent qu'un seul appel à refresh()", async () => {
    // Refresh qui se résout manuellement — on contrôle le timing
    let resolveRefresh!: (token: string) => void;
    const refreshPromise = new Promise<string>((res) => {
      resolveRefresh = res;
    });
    mockRefresh.mockReturnValueOnce(refreshPromise);
    mockAxiosCall.mockResolvedValue({ data: "retried" });

    const { responseError } = setup();

    // Deux requêtes 401 arrivent en même temps (avant que le refresh soit résolu)
    const error1 = make401();
    const error2 = make401();

    const p1 = responseError(error1);
    const p2 = responseError(error2);

    // Résoudre le refresh — les deux requêtes doivent s'en sortir
    await act(async () => {
      resolveRefresh("new-token");
      await Promise.all([p1, p2]);
    });

    // Malgré deux 401, refresh() n'a été appelé qu'une seule fois
    expect(mockRefresh).toHaveBeenCalledOnce();

    // Les deux requêtes ont bien été rejouées avec le nouveau token
    expect(mockAxiosCall).toHaveBeenCalledTimes(2);
    expect(mockAxiosCall.mock.calls[0][0].headers["Authorization"]).toBe("Bearer new-token");
    expect(mockAxiosCall.mock.calls[1][0].headers["Authorization"]).toBe("Bearer new-token");
  });

  it("après un refresh réussi, une nouvelle 401 déclenche bien un nouveau refresh", async () => {
    mockRefresh
      .mockResolvedValueOnce("token-1") // premier refresh
      .mockResolvedValueOnce("token-2"); // deuxième refresh (nouvelle expiration)
    mockAxiosCall.mockResolvedValue({ data: "ok" });

    const { responseError } = setup();

    // Première 401
    await responseError(make401());
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    // Deuxième 401 (le token a de nouveau expiré après le premier refresh)
    await responseError(make401());
    expect(mockRefresh).toHaveBeenCalledTimes(2);
  });
});
