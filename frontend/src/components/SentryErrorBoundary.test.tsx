import React, { Suspense } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CHUNK_RELOAD_KEY } from "../utils/chunkErrorHandler";
import SentryErrorBoundary from "./SentryErrorBoundary";

// ── Mock @sentry/react ────────────────────────────────────────────────────────
// Replace ErrorBoundary with a minimal class component that faithfully
// simulates the Sentry boundary: catches render errors, calls onError,
// and shows the fallback prop.

vi.mock("@sentry/react", async () => {
  const { Component } = await import("react");

  class MockErrorBoundary extends Component<{
    children: React.ReactNode;
    fallback: (props: { error: Error; resetError: () => void }) => React.ReactNode;
    onError?: (error: Error) => void;
    showDialog?: boolean;
  }, { error: Error | null }> {
    constructor(props: MockErrorBoundary["props"]) {
      super(props);
      this.state = { error: null };
    }

    static getDerivedStateFromError(error: Error) {
      return { error };
    }

    componentDidCatch(error: Error) {
      this.props.onError?.(error);
    }

    render() {
      if (this.state.error) {
        return this.props.fallback({
          error: this.state.error,
          resetError: () => this.setState({ error: null }),
        });
      }
      return this.props.children;
    }
  }

  return { ErrorBoundary: MockErrorBoundary };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function ThrowOnRender({ error }: { error: Error }) {
  throw error;
  // eslint-disable-next-line no-unreachable
  return null;
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  sessionStorage.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("SentryErrorBoundary — chunk errors", () => {
  it("recharge automatiquement la page lors d'une chunk error (iOS Safari)", () => {
    const reloadSpy = vi.fn();
    vi.stubGlobal("location", { reload: reloadSpy });

    render(
      <SentryErrorBoundary>
        <ThrowOnRender error={new TypeError("Importing a module script failed.")} />
      </SentryErrorBoundary>
    );

    expect(reloadSpy).toHaveBeenCalledOnce();
  });

  it("recharge automatiquement la page lors d'une chunk error (Chrome)", () => {
    const reloadSpy = vi.fn();
    vi.stubGlobal("location", { reload: reloadSpy });

    render(
      <SentryErrorBoundary>
        <ThrowOnRender
          error={new TypeError("Failed to fetch dynamically imported module: /assets/chunk.js")}
        />
      </SentryErrorBoundary>
    );

    expect(reloadSpy).toHaveBeenCalledOnce();
  });

  it("marque la tentative dans sessionStorage avant le reload", () => {
    vi.stubGlobal("location", { reload: vi.fn() });

    render(
      <SentryErrorBoundary>
        <ThrowOnRender error={new TypeError("Importing a module script failed.")} />
      </SentryErrorBoundary>
    );

    expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBe("1");
  });
});

describe("SentryErrorBoundary — erreurs ordinaires", () => {
  it("n'effectue pas de reload et affiche le fallback pour une erreur ordinaire", () => {
    const reloadSpy = vi.fn();
    vi.stubGlobal("location", { reload: reloadSpy });

    render(
      <SentryErrorBoundary>
        <ThrowOnRender error={new Error("Something went wrong")} />
      </SentryErrorBoundary>
    );

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/erreur inattendue/i)).toBeInTheDocument();
  });

  it("affiche le bouton Réessayer dans le fallback", () => {
    vi.stubGlobal("location", { reload: vi.fn() });

    render(
      <SentryErrorBoundary>
        <ThrowOnRender error={new Error("Something went wrong")} />
      </SentryErrorBoundary>
    );

    expect(screen.getByRole("button", { name: /Réessayer/i })).toBeInTheDocument();
  });
});

describe("SentryErrorBoundary — protection boucle infinie", () => {
  it("n'effectue pas de reload si un reload a déjà été tenté (sessionStorage)", () => {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
    const reloadSpy = vi.fn();
    vi.stubGlobal("location", { reload: reloadSpy });

    render(
      <SentryErrorBoundary>
        <ThrowOnRender error={new TypeError("Importing a module script failed.")} />
      </SentryErrorBoundary>
    );

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/erreur inattendue/i)).toBeInTheDocument();
  });

  it("réinitialise la clé sessionStorage après un chargement réussi", () => {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");

    render(
      <SentryErrorBoundary>
        <div>Application chargée correctement</div>
      </SentryErrorBoundary>
    );

    expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBeNull();
  });
});

describe("SentryErrorBoundary — robustesse sessionStorage", () => {
  it("n'effectue pas de reload et affiche le fallback si sessionStorage.getItem lance", () => {
    const reloadSpy = vi.fn();
    vi.stubGlobal("location", { reload: reloadSpy });
    // vi.spyOn doesn't intercept jsdom sessionStorage methods reliably — stub the whole object.
    vi.stubGlobal("sessionStorage", {
      getItem:    () => { throw new DOMException("SecurityError", "SecurityError"); },
      setItem:    () => {},
      removeItem: () => {},
      clear:      () => {},
      key:        () => null,
      length:     0,
    });

    render(
      <SentryErrorBoundary>
        <ThrowOnRender error={new TypeError("Importing a module script failed.")} />
      </SentryErrorBoundary>
    );

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/erreur inattendue/i)).toBeInTheDocument();
  });

  it("n'effectue pas de reload et affiche le fallback si sessionStorage.setItem lance", () => {
    const reloadSpy = vi.fn();
    vi.stubGlobal("location", { reload: reloadSpy });
    vi.stubGlobal("sessionStorage", {
      getItem:    () => null,   // key absent — passes the "already retried" guard
      setItem:    () => { throw new DOMException("QuotaExceededError", "QuotaExceededError"); },
      removeItem: () => {},
      clear:      () => {},
      key:        () => null,
      length:     0,
    });

    render(
      <SentryErrorBoundary>
        <ThrowOnRender error={new TypeError("Importing a module script failed.")} />
      </SentryErrorBoundary>
    );

    expect(reloadSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/erreur inattendue/i)).toBeInTheDocument();
  });

  it("recharge normalement sur une chunk error classique après les correctifs storage", () => {
    const reloadSpy = vi.fn();
    vi.stubGlobal("location", { reload: reloadSpy });

    render(
      <SentryErrorBoundary>
        <ThrowOnRender error={new TypeError("Importing a module script failed.")} />
      </SentryErrorBoundary>
    );

    expect(reloadSpy).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBe("1");
  });

  it("détecte le pattern Firefox comme chunk error et recharge", () => {
    const reloadSpy = vi.fn();
    vi.stubGlobal("location", { reload: reloadSpy });

    render(
      <SentryErrorBoundary>
        <ThrowOnRender
          error={new TypeError("error loading dynamically imported module: /chunk.js")}
        />
      </SentryErrorBoundary>
    );

    expect(reloadSpy).toHaveBeenCalledOnce();
  });
});

describe("SentryErrorBoundary — intégration React.lazy()", () => {
  it("recharge la page quand un composant React.lazy() échoue à charger", async () => {
    const reloadSpy = vi.fn();
    vi.stubGlobal("location", { reload: reloadSpy });

    const LazyBroken = React.lazy(() =>
      Promise.reject(
        new TypeError("Failed to fetch dynamically imported module: /assets/DataManagement.js")
      )
    );

    render(
      <SentryErrorBoundary>
        <Suspense fallback={<div>Chargement…</div>}>
          <LazyBroken />
        </Suspense>
      </SentryErrorBoundary>
    );

    await waitFor(() => {
      expect(reloadSpy).toHaveBeenCalledOnce();
    });
  });
});
