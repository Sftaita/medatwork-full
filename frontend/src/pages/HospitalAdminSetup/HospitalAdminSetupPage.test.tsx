import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import HospitalAdminSetupPage from "./HospitalAdminSetupPage";
import hospitalAdminSetupApi from "../../services/hospitalAdminSetupApi";

vi.mock("../../services/hospitalAdminSetupApi");

const VALID_TOKEN = "abc123token";

const CONTEXT = { email: "admin@hopital.be", hospitalName: "CHU Liège" };

function renderWithToken(token: string = VALID_TOKEN) {
  return render(
    <MemoryRouter initialEntries={[`/hospital-admin/setup/${token}`]}>
      <Routes>
        <Route path="/hospital-admin/setup/:token" element={<HospitalAdminSetupPage />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function fillForm({
  firstname = "Jean",
  lastname = "Dupont",
  password = "motdepasse1",
  confirm = "motdepasse1",
} = {}) {
  fireEvent.change(screen.getByLabelText(/prénom \*/i), { target: { value: firstname } });
  fireEvent.change(screen.getByLabelText(/^nom \*/i), { target: { value: lastname } });
  fireEvent.change(screen.getByLabelText(/^mot de passe \*/i), { target: { value: password } });
  fireEvent.change(screen.getByLabelText(/confirmer le mot de passe \*/i), {
    target: { value: confirm },
  });
}

describe("HospitalAdminSetupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Loading state ──────────────────────────────────────────────────────────

  it("shows a loading spinner on initial render", () => {
    vi.mocked(hospitalAdminSetupApi.checkToken).mockReturnValue(new Promise(() => {}));
    renderWithToken();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  // ── Ready state (valid token) ──────────────────────────────────────────────

  it("shows the activation form when checkToken resolves", async () => {
    vi.mocked(hospitalAdminSetupApi.checkToken).mockResolvedValue(CONTEXT);
    renderWithToken();

    await waitFor(() =>
      expect(screen.getByText(/activation de votre compte/i)).toBeInTheDocument()
    );

    expect(screen.getByLabelText(/prénom \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^nom \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^mot de passe \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmer le mot de passe \*/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /activer mon compte/i })).toBeInTheDocument();
  });

  it("displays the hospital name and email returned by checkToken", async () => {
    vi.mocked(hospitalAdminSetupApi.checkToken).mockResolvedValue(CONTEXT);
    renderWithToken();

    await waitFor(() => expect(screen.getByText("CHU Liège")).toBeInTheDocument());
    expect(screen.getByText("admin@hopital.be")).toBeInTheDocument();
  });

  // ── Expired state (410) ────────────────────────────────────────────────────

  it("shows the expired message when checkToken rejects with status 410", async () => {
    vi.mocked(hospitalAdminSetupApi.checkToken).mockRejectedValue({
      response: { status: 410 },
    });
    renderWithToken();

    await waitFor(() => expect(screen.getByText(/lien invalide/i)).toBeInTheDocument());
    expect(screen.getByText(/a expiré/i)).toBeInTheDocument();
  });

  // ── Error state (other status) ─────────────────────────────────────────────

  it("shows the generic error message when checkToken rejects with a non-410 status", async () => {
    vi.mocked(hospitalAdminSetupApi.checkToken).mockRejectedValue({
      response: { status: 404 },
    });
    renderWithToken();

    await waitFor(() => expect(screen.getByText(/lien invalide/i)).toBeInTheDocument());
    expect(screen.getByText(/invalide ou a déjà été utilisé/i)).toBeInTheDocument();
  });

  // ── Form validation ────────────────────────────────────────────────────────

  it("shows a validation error when the password is shorter than 8 characters", async () => {
    vi.mocked(hospitalAdminSetupApi.checkToken).mockResolvedValue(CONTEXT);
    renderWithToken();
    await screen.findByRole("button", { name: /activer mon compte/i });

    fillForm({ password: "court", confirm: "court" });
    fireEvent.click(screen.getByRole("button", { name: /activer mon compte/i }));

    await waitFor(() => expect(screen.getByText(/au moins 8 caractères/i)).toBeInTheDocument());
    expect(hospitalAdminSetupApi.activate).not.toHaveBeenCalled();
  });

  it("shows a validation error when passwords do not match", async () => {
    vi.mocked(hospitalAdminSetupApi.checkToken).mockResolvedValue(CONTEXT);
    renderWithToken();
    await screen.findByRole("button", { name: /activer mon compte/i });

    fillForm({ password: "motdepasse1", confirm: "motdepasse2" });
    fireEvent.click(screen.getByRole("button", { name: /activer mon compte/i }));

    await waitFor(() => expect(screen.getByText(/ne correspondent pas/i)).toBeInTheDocument());
    expect(hospitalAdminSetupApi.activate).not.toHaveBeenCalled();
  });

  // ── Successful activation ──────────────────────────────────────────────────

  it("shows 'Compte activé !' and the hospital name after a successful activation", async () => {
    vi.mocked(hospitalAdminSetupApi.checkToken).mockResolvedValue(CONTEXT);
    vi.mocked(hospitalAdminSetupApi.activate).mockResolvedValue({ message: "ok" });
    renderWithToken();
    await screen.findByRole("button", { name: /activer mon compte/i });

    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /activer mon compte/i }));

    await waitFor(() => expect(screen.getByText(/compte activé/i)).toBeInTheDocument());
    expect(screen.getByText(/CHU Liège/i)).toBeInTheDocument();
  });

  it("calls activate with the correct token and form values", async () => {
    vi.mocked(hospitalAdminSetupApi.checkToken).mockResolvedValue(CONTEXT);
    vi.mocked(hospitalAdminSetupApi.activate).mockResolvedValue({ message: "ok" });
    renderWithToken(VALID_TOKEN);
    await screen.findByRole("button", { name: /activer mon compte/i });

    fillForm({ firstname: "Jean", lastname: "Dupont", password: "secret99", confirm: "secret99" });
    fireEvent.click(screen.getByRole("button", { name: /activer mon compte/i }));

    await waitFor(() => expect(hospitalAdminSetupApi.activate).toHaveBeenCalledTimes(1));
    expect(hospitalAdminSetupApi.activate).toHaveBeenCalledWith(VALID_TOKEN, {
      firstname: "Jean",
      lastname: "Dupont",
      password: "secret99",
    });
  });

  // ── Navigation after activation ────────────────────────────────────────────

  it("navigates to /login when 'Se connecter' is clicked after activation", async () => {
    vi.mocked(hospitalAdminSetupApi.checkToken).mockResolvedValue(CONTEXT);
    vi.mocked(hospitalAdminSetupApi.activate).mockResolvedValue({ message: "ok" });
    renderWithToken();
    await screen.findByRole("button", { name: /activer mon compte/i });

    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /activer mon compte/i }));

    await screen.findByRole("button", { name: /se connecter/i });
    fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));

    await waitFor(() => expect(screen.getByText("Login Page")).toBeInTheDocument());
  });

  // ── Activate API error ─────────────────────────────────────────────────────

  it("shows a generic error when activate rejects", async () => {
    vi.mocked(hospitalAdminSetupApi.checkToken).mockResolvedValue(CONTEXT);
    vi.mocked(hospitalAdminSetupApi.activate).mockRejectedValue(new Error("server error"));
    renderWithToken();
    await screen.findByRole("button", { name: /activer mon compte/i });

    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /activer mon compte/i }));

    await waitFor(() => expect(screen.getByText(/une erreur est survenue/i)).toBeInTheDocument());
  });
});
