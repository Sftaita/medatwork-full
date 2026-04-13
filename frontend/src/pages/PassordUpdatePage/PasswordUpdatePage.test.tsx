import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PasswordUpdatePage from "./PasswordUpdatePage";
import authApi from "../../services/authApi";

vi.mock("../../services/authApi");
vi.mock("../../images/Search", () => ({ default: () => null }));

const TOKEN_64 = "4c5a5a1a80c3fedcb8272a5cdedeff9355b109d5882fa35fc6d3d730b790c8c7";
const TOKEN_SHORT = "abc123";

function renderWithToken(token: string) {
  return render(
    <MemoryRouter initialEntries={[`/passwordUpdatePage/${token}`]}>
      <Routes>
        <Route
          path="/passwordUpdatePage/:token"
          element={<PasswordUpdatePage _match={undefined} />}
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function fillForm(password = "password123", confirm = "password123") {
  fireEvent.change(screen.getByLabelText(/nouveau mot de passe \*/i), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText(/confirmer votre mot de passe \*/i), {
    target: { value: confirm },
  });
}

describe("PasswordUpdatePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the form for a valid 64-char token", () => {
    renderWithToken(TOKEN_64);
    expect(screen.getByText(/Modification du mot de passe/i)).toBeInTheDocument();
  });

  it("submit button is disabled when token is too short", async () => {
    renderWithToken(TOKEN_SHORT);
    const btn = await screen.findByRole("button", { name: /réinitialiser/i });
    expect(btn).toBeDisabled();
  });

  it("submit button is enabled when token is valid (64 chars)", async () => {
    renderWithToken(TOKEN_64);
    const btn = await screen.findByRole("button", { name: /réinitialiser/i });
    expect(btn).not.toBeDisabled();
  });

  it("does not call API when token is invalid — button is disabled", () => {
    renderWithToken(TOKEN_SHORT);
    const btn = screen.getByRole("button", { name: /réinitialiser/i });
    expect(btn).toBeDisabled();
    expect(authApi.resetPassword).not.toHaveBeenCalled();
  });

  it("redirects to /login on successful reset", async () => {
    vi.mocked(authApi.resetPassword).mockResolvedValue({} as never);
    renderWithToken(TOKEN_64);

    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /réinitialiser/i }));

    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });

  it("button is disabled while the API call is in flight", async () => {
    let resolve!: (v: unknown) => void;
    vi.mocked(authApi.resetPassword).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }) as never
    );
    renderWithToken(TOKEN_64);

    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /réinitialiser/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /réinitialiser/i })).toBeDisabled()
    );

    resolve({});
  });

  it("shows validation error when passwords do not match", async () => {
    renderWithToken(TOKEN_64);

    fillForm("password123", "different456");
    fireEvent.click(screen.getByRole("button", { name: /réinitialiser/i }));

    await waitFor(() => {
      expect(screen.getByText(/correspondent pas/i)).toBeInTheDocument();
    });
    expect(authApi.resetPassword).not.toHaveBeenCalled();
  });

  it("shows validation error when password is shorter than 8 chars", async () => {
    renderWithToken(TOKEN_64);

    fillForm("short", "short");
    fireEvent.click(screen.getByRole("button", { name: /réinitialiser/i }));

    await waitFor(() => {
      expect(screen.getByText(/8 caractères/i)).toBeInTheDocument();
    });
    expect(authApi.resetPassword).not.toHaveBeenCalled();
  });

  it("stays on page when API returns invalid token error", async () => {
    vi.mocked(authApi.resetPassword).mockRejectedValue({
      response: { data: { message: "invalid token" } },
    });
    renderWithToken(TOKEN_64);

    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /réinitialiser/i }));

    await waitFor(() => expect(screen.queryByText("Login Page")).not.toBeInTheDocument());
  });
});
