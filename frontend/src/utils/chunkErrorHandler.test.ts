import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isChunkLoadError,
  handleChunkLoadError,
  registerChunkErrorHandler,
  CHUNK_RELOAD_KEY,
} from "./chunkErrorHandler";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeErrorEvent(message: string): ErrorEvent {
  return new ErrorEvent("error", { message });
}

function makeStorage(initial: Record<string, string> = {}): Pick<Storage, "getItem" | "setItem"> {
  const store = { ...initial };
  return {
    getItem:  (k: string) => store[k] ?? null,
    setItem:  (k: string, v: string) => { store[k] = v; },
  };
}

function makeThrowingGetStorage(): Pick<Storage, "getItem" | "setItem"> {
  return {
    getItem:  ()           => { throw new DOMException("SecurityError", "SecurityError"); },
    setItem:  (_k, _v)     => { /* never reached */ },
  };
}

function makeThrowingSetStorage(): Pick<Storage, "getItem" | "setItem"> {
  const store: Record<string, string> = {};
  return {
    getItem:  (k: string)  => store[k] ?? null,
    setItem:  ()           => { throw new DOMException("QuotaExceededError", "QuotaExceededError"); },
  };
}

// ── Tests : isChunkLoadError ──────────────────────────────────────────────────

describe("isChunkLoadError", () => {
  // strings (window.error path)
  it.each([
    "Importing a module script failed.",
    "Failed to fetch dynamically imported module: https://example.com/chunk-abc.js",
    "error loading dynamically imported module: https://example.com/chunk-abc.js",
    "Unable to preload CSS for https://example.com/assets/index.css",
    "Loading chunk 42 failed.",
    "ChunkLoadError: Loading chunk 42 failed.",
  ])("retourne true pour string : %s", (msg) => {
    expect(isChunkLoadError(msg)).toBe(true);
  });

  it.each([
    "TypeError: Cannot read property 'x' of undefined",
    "ReferenceError: foo is not defined",
    "Network Error",
    "",
  ])("retourne false pour string : %s", (msg) => {
    expect(isChunkLoadError(msg)).toBe(false);
  });

  // Error objects (ErrorBoundary path)
  it("retourne true pour TypeError avec message de chunk (iOS Safari)", () => {
    expect(isChunkLoadError(new TypeError("Importing a module script failed."))).toBe(true);
  });

  it("retourne true pour TypeError avec message de chunk (Chrome)", () => {
    expect(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: /chunk.js"))).toBe(true);
  });

  it("retourne true pour une erreur dont le name est ChunkLoadError", () => {
    const err = Object.assign(new Error("Loading chunk 5 failed."), { name: "ChunkLoadError" });
    expect(isChunkLoadError(err)).toBe(true);
  });

  it("retourne false pour une Error ordinaire", () => {
    expect(isChunkLoadError(new Error("Something went wrong"))).toBe(false);
  });

  it("retourne false pour undefined", () => {
    expect(isChunkLoadError(undefined)).toBe(false);
  });

  it("retourne true pour TypeError avec message Firefox", () => {
    expect(
      isChunkLoadError(new TypeError("error loading dynamically imported module: /chunk.js"))
    ).toBe(true);
  });
});

// ── Tests : handleChunkLoadError ──────────────────────────────────────────────

describe("handleChunkLoadError", () => {
  let reloadSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    reloadSpy = vi.fn();
    vi.stubGlobal("location", { reload: reloadSpy });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("recharge la page sur une erreur de chunk", () => {
    const storage = makeStorage();
    handleChunkLoadError(makeErrorEvent("Importing a module script failed."), storage);
    expect(reloadSpy).toHaveBeenCalledOnce();
  });

  it("marque la tentative dans le storage", () => {
    const storage = makeStorage();
    handleChunkLoadError(makeErrorEvent("Importing a module script failed."), storage);
    expect(storage.getItem(CHUNK_RELOAD_KEY)).toBe("1");
  });

  it("ne recharge PAS une deuxième fois si la tentative est déjà marquée", () => {
    const storage = makeStorage({ [CHUNK_RELOAD_KEY]: "1" });
    handleChunkLoadError(makeErrorEvent("Importing a module script failed."), storage);
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("ignore les erreurs qui ne sont pas des erreurs de chunk", () => {
    const storage = makeStorage();
    handleChunkLoadError(makeErrorEvent("TypeError: cannot read property foo"), storage);
    expect(reloadSpy).not.toHaveBeenCalled();
    expect(storage.getItem(CHUNK_RELOAD_KEY)).toBeNull();
  });

  it("gère un message undefined sans planter", () => {
    const storage = makeStorage();
    const evt = { message: undefined } as unknown as ErrorEvent;
    expect(() => handleChunkLoadError(evt, storage)).not.toThrow();
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("couvre toutes les variantes de messages de chunk", () => {
    const messages = [
      "Importing a module script failed.",
      "Failed to fetch dynamically imported module: /chunk.js",
      "error loading dynamically imported module: /chunk.js",
      "Unable to preload CSS for /assets/style.css",
    ];

    for (const msg of messages) {
      const storage = makeStorage();
      reloadSpy.mockClear();
      handleChunkLoadError(makeErrorEvent(msg), storage);
      expect(reloadSpy).toHaveBeenCalledOnce();
    }
  });

  it("ne recharge PAS et ne plante PAS si storage.getItem lance une exception", () => {
    handleChunkLoadError(
      makeErrorEvent("Importing a module script failed."),
      makeThrowingGetStorage()
    );
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("ne recharge PAS et ne plante PAS si storage.setItem lance une exception", () => {
    handleChunkLoadError(
      makeErrorEvent("Importing a module script failed."),
      makeThrowingSetStorage()
    );
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("ne pose pas la clé si setItem lance (pas de boucle infinie possible)", () => {
    const storage = makeThrowingSetStorage();
    handleChunkLoadError(makeErrorEvent("Importing a module script failed."), storage);
    // getItem still works — key was never written
    expect(storage.getItem(CHUNK_RELOAD_KEY)).toBeNull();
  });
});

// ── Tests : registerChunkErrorHandler ────────────────────────────────────────

describe("registerChunkErrorHandler", () => {
  let reloadSpy: ReturnType<typeof vi.fn>;
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    reloadSpy = vi.fn();
    vi.stubGlobal("location", { reload: reloadSpy });
    addEventListenerSpy = vi.spyOn(window, "addEventListener");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    addEventListenerSpy.mockRestore();
  });

  it("enregistre un listener sur l'événement 'error'", () => {
    registerChunkErrorHandler();
    expect(addEventListenerSpy).toHaveBeenCalledWith("error", expect.any(Function));
  });

  it("le listener enregistré déclenche reload sur erreur de chunk", () => {
    const storage = makeStorage();
    registerChunkErrorHandler(storage);

    // Récupère le handler passé à addEventListener
    const [, handler] = addEventListenerSpy.mock.calls.find(
      ([evt]) => evt === "error"
    )!;

    (handler as EventListener)(makeErrorEvent("Importing a module script failed."));
    expect(reloadSpy).toHaveBeenCalledOnce();
  });
});
