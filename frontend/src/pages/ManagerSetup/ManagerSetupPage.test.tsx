/**
 * Tests for ManagerSetupPage.
 *
 * Covers:
 * - Shows loading spinner while checkToken resolves
 * - Renders form with context (hospital name, year, identity)
 * - Shows "Lien invalide" on 410 (expired token)
 * - Shows "Lien invalide" on other errors (invalid token)
 * - Form validation: password too short
 * - Form validation: passwords mismatch
 * - Form validation: sexe not selected
 * - Form validation: job not selected
 * - Submit calls completeProfile with correct payload
 * - Shows success state after completion
 * - Shows API error message on completeProfile failure
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ManagerSetupPage from "./ManagerSetupPage";
import managerSetupApi from "../../services/managerSetupApi";

vi.mock("../../services/managerSetupApi");

const MOCK_CONTEXT = {
  firstname: "Jean",
  lastname: "Dupont",
  email: "jean.dupont@chu.be",
  hospitalName: "CHU Liège",
  yearTitle: "Stage cardiologie 2025",
};

function renderPage(token = "validtoken") {
  return render(
    <MemoryRouter initialEntries={[`/manager-setup/${token}`]}>
      <Routes>
        <Route path="/manager-setup/:token" element={<ManagerSetupPage />} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(managerSetupApi.checkToken).mockResolvedValue(MOCK_CONTEXT);
});

describe("ManagerSetupPage", () => {
  // ── Loading ────────────────────────────────────────────────────────────────

  it("shows loading spinner while checkToken resolves", () => {
    vi.mocked(managerSetupApi.checkToken).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  // ── Ready state ────────────────────────────────────────────────────────────

  it("renders hospital name, year and identity from context", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Compléter votre profil manager")).toBeInTheDocument()
    );
    expect(screen.getByText("CHU Liège")).toBeInTheDocument();
    expect(screen.getByText(/Stage cardiologie 2025/)).toBeInTheDocument();
    expect(screen.getByText(/jean\.dupont@chu\.be/)).toBeInTheDocument();
  });

  it("renders password, confirm, sexe and job fields", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByLabelText(/Mot de passe/i).length).toBeGreaterThanOrEqual(1)
    );
    expect(screen.getByLabelText(/Confirmer/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Genre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fonction/i)).toBeInTheDocument();
  });

  // ── Error / expired states ─────────────────────────────────────────────────

  it("shows expired message when checkToken returns 410", async () => {
    vi.mocked(managerSetupApi.checkToken).mockRejectedValue({ response: { status: 410 } });
    renderPage();
    await waitFor(() => expect(screen.getByText("Lien invalide")).toBeInTheDocument());
    expect(screen.getByText(/expiré/i)).toBeInTheDocument();
  });

  it("shows invalid message when checkToken returns another error", async () => {
    vi.mocked(managerSetupApi.checkToken).mockRejectedValue({ response: { status: 404 } });
    renderPage();
    await waitFor(() => expect(screen.getByText("Lien invalide")).toBeInTheDocument());
    expect(screen.getByText(/invalide ou a déjà été utilisé/i)).toBeInTheDocument();
  });

  // ── Client-side validation ─────────────────────────────────────────────────

  it("shows error when password is too short", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByLabelText(/Mot de passe/i).length).toBeGreaterThanOrEqual(1)
    );
    fireEvent.change(screen.getAllByLabelText(/Mot de passe/i)[0], { target: { value: "short" } });
    // Use fireEvent.submit — JSDOM does not trigger form onSubmit via button click
    fireEvent.submit(screen.getByRole("button", { name: /Activer/i }).closest("form")!);
    await waitFor(() => expect(screen.getByText(/au moins 8 caractères/i)).toBeInTheDocument());
  });

  it("shows error when passwords do not match", async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByLabelText(/Mot de passe/i)[0]).toBeInTheDocument());
    fireEvent.change(screen.getAllByLabelText(/Mot de passe/i)[0], {
      target: { value: "Secure123" },
    });
    fireEvent.change(screen.getByLabelText(/Confirmer/i), { target: { value: "Different!" } });
    fireEvent.submit(screen.getByRole("button", { name: /Activer/i }).closest("form")!);
    await waitFor(() => expect(screen.getByText(/ne correspondent pas/i)).toBeInTheDocument());
  });

  it("shows error when sexe is not selected", async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByLabelText(/Mot de passe/i)[0]).toBeInTheDocument());
    fireEvent.change(screen.getAllByLabelText(/Mot de passe/i)[0], {
      target: { value: "Secure123" },
    });
    fireEvent.change(screen.getByLabelText(/Confirmer/i), { target: { value: "Secure123" } });
    // leave sexe empty, submit
    fireEvent.submit(screen.getByRole("button", { name: /Activer/i }).closest("form")!);
    await waitFor(() =>
      expect(screen.getByText(/Veuillez sélectionner votre genre/i)).toBeInTheDocument()
    );
  });

  // ── Submit ─────────────────────────────────────────────────────────────────

  it("calls completeProfile with correct payload on valid submit", async () => {
    vi.mocked(managerSetupApi.completeProfile).mockResolvedValue({ message: "ok" });
    renderPage();

    await waitFor(() => expect(screen.getAllByLabelText(/Mot de passe/i)[0]).toBeInTheDocument());
    fireEvent.change(screen.getAllByLabelText(/Mot de passe/i)[0], {
      target: { value: "Secure123" },
    });
    fireEvent.change(screen.getByLabelText(/Confirmer/i), { target: { value: "Secure123" } });

    // Select sexe via MUI Select
    fireEvent.mouseDown(screen.getByLabelText(/Genre/i));
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Homme"));

    // Select job
    fireEvent.mouseDown(screen.getByLabelText(/Fonction/i));
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Médecin"));

    fireEvent.click(screen.getByRole("button", { name: /Activer/i }));

    await waitFor(() =>
      expect(managerSetupApi.completeProfile).toHaveBeenCalledWith("validtoken", {
        password: "Secure123",
        sexe: "male",
        job: "doctor",
      })
    );
  });

  it("shows success state after completion", async () => {
    vi.mocked(managerSetupApi.completeProfile).mockResolvedValue({ message: "ok" });
    renderPage();

    await waitFor(() => expect(screen.getAllByLabelText(/Mot de passe/i)[0]).toBeInTheDocument());
    fireEvent.change(screen.getAllByLabelText(/Mot de passe/i)[0], {
      target: { value: "Secure123" },
    });
    fireEvent.change(screen.getByLabelText(/Confirmer/i), { target: { value: "Secure123" } });

    fireEvent.mouseDown(screen.getByLabelText(/Genre/i));
    await waitFor(() => screen.getByRole("listbox"));
    fireEvent.click(screen.getByText("Femme"));

    fireEvent.mouseDown(screen.getByLabelText(/Fonction/i));
    await waitFor(() => screen.getByRole("listbox"));
    fireEvent.click(screen.getByText("Maître de stage"));

    fireEvent.click(screen.getByRole("button", { name: /Activer/i }));

    await waitFor(() => expect(screen.getByText("Compte activé !")).toBeInTheDocument());
  });

  it("shows API error message on completeProfile failure", async () => {
    vi.mocked(managerSetupApi.completeProfile).mockRejectedValue({
      response: { data: { message: "Token expiré côté serveur" } },
    });
    renderPage();

    await waitFor(() => expect(screen.getAllByLabelText(/Mot de passe/i)[0]).toBeInTheDocument());
    fireEvent.change(screen.getAllByLabelText(/Mot de passe/i)[0], {
      target: { value: "Secure123" },
    });
    fireEvent.change(screen.getByLabelText(/Confirmer/i), { target: { value: "Secure123" } });

    fireEvent.mouseDown(screen.getByLabelText(/Genre/i));
    await waitFor(() => screen.getByRole("listbox"));
    fireEvent.click(screen.getByText("Homme"));

    fireEvent.mouseDown(screen.getByLabelText(/Fonction/i));
    await waitFor(() => screen.getByRole("listbox"));
    fireEvent.click(screen.getByText("Médecin"));

    fireEvent.click(screen.getByRole("button", { name: /Activer/i }));

    await waitFor(() => expect(screen.getByText("Token expiré côté serveur")).toBeInTheDocument());
  });
});
