/**
 * Tests for manager signup Form.
 *
 * MUI Select renders role="combobox" elements without an accessible name
 * resolvable by jsdom (aria-labelledby points to a sibling label, not a
 * parent). We identify selects by their position in the DOM:
 *   [0] Genre  [1] Hôpital  [2] Rôle
 *
 * Covers:
 * - Hospital dropdown populated from API
 * - "Mon hôpital n'est pas dans la liste" shows hospitalName text field
 * - hospitalName field hidden when a real hospital is selected
 * - Submit with existing hospital sends hospitalId
 * - Submit with "other" sends hospitalName
 * - Required-field validation
 * - Passwords mismatch validation
 * - Password too short validation
 * - Navigates to /success on success
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import axios from "axios";
import managersApi from "../../../../services/managersApi";

vi.mock("axios");
vi.mock("../../../../services/managersApi");
vi.mock("../../../../config", () => ({ API_URL: "http://localhost:8000/api/" }));
vi.mock("@/services/apiError", () => ({ handleApiError: vi.fn() }));

const { default: Form } = await import("./Form");

const MOCK_HOSPITALS = [
  { id: 1, name: "CHU Liège" },
  { id: 2, name: "UZ Leuven" },
];

const IDX_GENRE = 0;
const IDX_HOPITAL = 1;
const IDX_ROLE = 2;

function renderForm() {
  return render(
    <MemoryRouter initialEntries={["/managerSignup"]}>
      <Routes>
        <Route path="/managerSignup" element={<Form />} />
        <Route path="/success" element={<div>Success page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

async function openSelect(idx: number) {
  const comboboxes = screen.getAllByRole("combobox");
  fireEvent.mouseDown(comboboxes[idx]);
}

async function selectOption(idx: number, optionLabel: RegExp | string) {
  await openSelect(idx);
  const option = await screen.findByRole("option", { name: optionLabel });
  fireEvent.click(option);
}

async function fillBaseFields() {
  fireEvent.change(screen.getByLabelText(/prénom \*/i), { target: { value: "Jean" } });
  fireEvent.change(screen.getByLabelText(/nom de famille \*/i), { target: { value: "Dupont" } });
  await selectOption(IDX_GENRE, /je suis un homme/i);
  fireEvent.change(screen.getByLabelText(/email \*/i), { target: { value: "j@ex.com" } });
}

async function fillPasswords(password = "Secret123!", confirm = "Secret123!") {
  const [pw] = screen.getAllByLabelText(/mot de passe \*/i);
  fireEvent.change(pw, { target: { value: password } });
  fireEvent.change(screen.getByLabelText(/confirmation \*/i), { target: { value: confirm } });
}

describe("Manager signup Form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(axios.get).mockResolvedValue({ data: MOCK_HOSPITALS });
  });

  // ── Hospital dropdown ─────────────────────────────────────────────────────

  it("loads and shows hospitals in the dropdown", async () => {
    renderForm();
    await openSelect(IDX_HOPITAL);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "CHU Liège" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "UZ Leuven" })).toBeInTheDocument();
    });
  });

  it("shows the 'other' option in the dropdown", async () => {
    renderForm();
    await openSelect(IDX_HOPITAL);

    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /mon hôpital n'est pas dans la liste/i })
      ).toBeInTheDocument();
    });
  });

  it("shows hospitalName text field when 'other' is selected", async () => {
    renderForm();
    await selectOption(IDX_HOPITAL, /mon hôpital n'est pas/i);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/CHU de Liège/i)).toBeInTheDocument();
    });
  });

  it("hides hospitalName field when a real hospital is selected", async () => {
    renderForm();
    await selectOption(IDX_HOPITAL, "CHU Liège");

    expect(screen.queryByPlaceholderText(/CHU de Liège/i)).not.toBeInTheDocument();
  });

  // ── Submit with hospitalId ────────────────────────────────────────────────

  it("sends hospitalId (not hospitalName) when a real hospital is selected", async () => {
    vi.mocked(managersApi.create).mockResolvedValue({} as never);
    renderForm();

    await fillBaseFields();
    await selectOption(IDX_HOPITAL, "CHU Liège");
    await selectOption(IDX_ROLE, /médecin/i);
    await fillPasswords();

    fireEvent.click(screen.getByRole("button", { name: /s'enregistrer/i }));

    await waitFor(() => {
      expect(managersApi.create).toHaveBeenCalledWith(expect.objectContaining({ hospitalId: 1 }));
    });
    const call = vi.mocked(managersApi.create).mock.calls[0][0] as Record<string, unknown>;
    expect(call).not.toHaveProperty("hospitalName");
  });

  // ── Submit with hospitalName ──────────────────────────────────────────────

  it("sends hospitalName (not hospitalId) when 'other' is selected", async () => {
    vi.mocked(managersApi.create).mockResolvedValue({} as never);
    renderForm();

    await fillBaseFields();
    await selectOption(IDX_HOPITAL, /mon hôpital n'est pas/i);

    const nameInput = await screen.findByPlaceholderText(/CHU de Liège/i);
    fireEvent.change(nameInput, { target: { value: "Ma Clinique" } });

    await selectOption(IDX_ROLE, /médecin/i);
    await fillPasswords();

    fireEvent.click(screen.getByRole("button", { name: /s'enregistrer/i }));

    await waitFor(() => {
      expect(managersApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ hospitalName: "Ma Clinique" })
      );
    });
    const call = vi.mocked(managersApi.create).mock.calls[0][0] as Record<string, unknown>;
    expect(call).not.toHaveProperty("hospitalId");
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it("shows validation errors when form is submitted empty", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: /s'enregistrer/i }));

    await waitFor(() => {
      expect(screen.getByText(/prénom requis/i)).toBeInTheDocument();
    });
    expect(managersApi.create).not.toHaveBeenCalled();
  });

  it("shows error when passwords do not match", async () => {
    renderForm();
    await fillPasswords("Password1!", "Different1!");

    fireEvent.click(screen.getByRole("button", { name: /s'enregistrer/i }));

    await waitFor(() => {
      expect(screen.getByText(/ne correspondent pas/i)).toBeInTheDocument();
    });
    expect(managersApi.create).not.toHaveBeenCalled();
  });

  it("shows error when password is too short", async () => {
    renderForm();
    await fillPasswords("short", "short");

    fireEvent.click(screen.getByRole("button", { name: /s'enregistrer/i }));

    await waitFor(() => {
      expect(screen.getByText(/minimum 8 caractères/i)).toBeInTheDocument();
    });
    expect(managersApi.create).not.toHaveBeenCalled();
  });

  // ── Success ───────────────────────────────────────────────────────────────

  it("navigates to /success on successful submit", async () => {
    vi.mocked(managersApi.create).mockResolvedValue({} as never);
    renderForm();

    await fillBaseFields();
    await selectOption(IDX_HOPITAL, "CHU Liège");
    await selectOption(IDX_ROLE, /médecin/i);
    await fillPasswords();

    fireEvent.click(screen.getByRole("button", { name: /s'enregistrer/i }));

    await waitFor(() => {
      expect(screen.getByText("Success page")).toBeInTheDocument();
    });
  });
});
