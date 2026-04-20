/**
 * Tests for ActivatePage.
 *
 * Covers:
 * - Shows loading spinner while the POST is in flight
 * - Success (200): shows success alert + "Se connecter" link to /login
 * - Success (200): navigates to /login after the 3-second setTimeout
 * - Expired (410): shows expired alert with link to /token-expired
 * - Error (404 / other): shows error alert
 * - Invalid type param: shows error immediately (no API call)
 * - Calls activateAccount with the correct type and token
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ActivatePage from "./ActivatePage";
import publicApi from "../../services/publicApi";

vi.mock("../../services/publicApi");

const VALID_TOKEN = "a".repeat(64);

function renderPage(type: string, token: string = VALID_TOKEN) {
  return render(
    <MemoryRouter initialEntries={[`/activate/${type}/${token}`]}>
      <Routes>
        <Route path="/activate/:type/:token" element={<ActivatePage />} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/token-expired" element={<div>Token Expired Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ActivatePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Loading ────────────────────────────────────────────────────────────────

  it("shows a loading spinner on mount", () => {
    vi.mocked(publicApi.activateAccount).mockReturnValue(new Promise(() => {}));
    renderPage("manager");
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  // ── Success ────────────────────────────────────────────────────────────────

  it("shows success alert after successful activation", async () => {
    vi.mocked(publicApi.activateAccount).mockResolvedValue({ success: true });
    renderPage("manager");

    await waitFor(() => {
      expect(screen.getByText(/votre compte est activé/i)).toBeInTheDocument();
    });
  });

  it("shows a Se connecter button linking to /login after success", async () => {
    vi.mocked(publicApi.activateAccount).mockResolvedValue({ success: true });
    renderPage("manager");

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /se connecter maintenant/i })).toBeInTheDocument();
    });
  });

  it("navigates to /login after the 3-second redirect", async () => {
    vi.useFakeTimers();
    vi.mocked(publicApi.activateAccount).mockResolvedValue({ success: true });
    renderPage("manager");

    // Flush the promise resolution (state update: loading → success)
    await act(async () => {
      await Promise.resolve();
    });

    // Fire the 3-second setTimeout
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByText("Login Page")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("calls activateAccount with type=manager and the token", async () => {
    vi.mocked(publicApi.activateAccount).mockResolvedValue({ success: true });
    renderPage("manager", VALID_TOKEN);

    await waitFor(() => {
      expect(publicApi.activateAccount).toHaveBeenCalledWith("manager", VALID_TOKEN);
    });
  });

  it("calls activateAccount with type=resident and the token", async () => {
    vi.mocked(publicApi.activateAccount).mockResolvedValue({ success: true });
    renderPage("resident", VALID_TOKEN);

    await waitFor(() => {
      expect(publicApi.activateAccount).toHaveBeenCalledWith("resident", VALID_TOKEN);
    });
  });

  // ── Expired ────────────────────────────────────────────────────────────────

  it("shows expired alert when backend returns 410", async () => {
    vi.mocked(publicApi.activateAccount).mockRejectedValue({ response: { status: 410 } });
    renderPage("manager");

    await waitFor(() => {
      expect(screen.getByText(/lien a expiré/i)).toBeInTheDocument();
    });
  });

  it("shows link to /token-expired when expired", async () => {
    vi.mocked(publicApi.activateAccount).mockRejectedValue({ response: { status: 410 } });
    renderPage("manager");

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /nouveau lien/i })).toBeInTheDocument();
    });
  });

  // ── Error ──────────────────────────────────────────────────────────────────

  it("shows error alert when backend returns 404 (already used / not found)", async () => {
    vi.mocked(publicApi.activateAccount).mockRejectedValue({ response: { status: 404 } });
    renderPage("manager");

    await waitFor(() => {
      expect(screen.getByText(/invalide ou a déjà été utilisé/i)).toBeInTheDocument();
    });
  });

  it("shows error alert for any unexpected error", async () => {
    vi.mocked(publicApi.activateAccount).mockRejectedValue(new Error("Network Error"));
    renderPage("manager");

    await waitFor(() => {
      expect(screen.getByText(/invalide ou a déjà été utilisé/i)).toBeInTheDocument();
    });
  });

  // ── Invalid type ───────────────────────────────────────────────────────────

  it("shows error immediately when type param is invalid (no API call)", async () => {
    renderPage("unknown");

    await waitFor(() => {
      expect(screen.getByText(/invalide ou a déjà été utilisé/i)).toBeInTheDocument();
    });

    expect(publicApi.activateAccount).not.toHaveBeenCalled();
  });
});
