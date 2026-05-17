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

// ── Tests : isChunkLoadError ──────────────────────────────────────────────────

describe("isChunkLoadError", () => {
  it.each([
    "Importing a module script failed.",
    "Failed to fetch dynamically imported module: https://example.com/chunk-abc.js",
    "Unable to preload CSS for https://example.com/assets/index.css",
  ])("retourne true pour : %s", (msg) => {
    expect(isChunkLoadError(msg)).toBe(true);
  });

  it.each([
    "TypeError: Cannot read property 'x' of undefined",
    "ReferenceError: foo is not defined",
    "Network Error",
    "",
  ])("retourne false pour : %s", (msg) => {
    expect(isChunkLoadError(msg)).toBe(false);
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
      "Unable to preload CSS for /assets/style.css",
    ];

    for (const msg of messages) {
      const storage = makeStorage();
      reloadSpy.mockClear();
      handleChunkLoadError(makeErrorEvent(msg), storage);
      expect(reloadSpy).toHaveBeenCalledOnce();
    }
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
