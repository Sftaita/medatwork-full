/**
 * Tests for YearPage (/manager/year)
 *
 * Covers:
 * - buildValidationSchema: required fields, invalid values (unit — no render)
 * - Hospital filtering: endpoint-driven, client-side fallback, both-failure case
 * - Title field: input-first layout (DOM order), character counter, reset
 * - Form validation: required-field error messages after submit attempt
 * - Live preview: rendered and reactive
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import YearPage, { buildValidationSchema } from "./YearPage";
import type { Hospital } from "./YearPage";

// ── Mock declarations — vi.hoisted() ensures they're ready before factory calls ─

const mockPrivateGet = vi.hoisted(() => vi.fn());
const mockPrivatePost = vi.hoisted(() => vi.fn());
const mockDefaultGet = vi.hoisted(() => vi.fn());
const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock("../../../hooks/useAxiosPrivate", () => ({
  default: () => ({
    get: mockPrivateGet,
    post: mockPrivatePost,
    put: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock("../../../hooks/useAuth", () => ({
  default: () => ({ authentication: { hospitalId: 1 } }),
}));

vi.mock("axios", () => ({
  default: { get: mockDefaultGet },
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
  };
});

vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/services/apiError", () => ({ handleApiError: vi.fn() }));

vi.mock("../../../components/medium/DateHandler", () => ({
  default: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: any;
    onChange: (v: any) => void;
  }) => (
    <input
      aria-label={label}
      value={value != null ? String(value) : ""}
      onChange={e => onChange(e.target.value)}
    />
  ),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CHU_LIEGE: Hospital = { id: 1, name: "CHU Liège", city: "Liège" };
const CHR_NAMUR: Hospital = { id: 2, name: "CHR Namur", city: "Namur" };

function renderPage() {
  return render(<YearPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrivateGet.mockResolvedValue({ data: [CHU_LIEGE] });
});

// ── buildValidationSchema — unit tests ─────────────────────────────────────────

describe("buildValidationSchema", () => {
  const schema = buildValidationSchema((key: string) => key);

  const valid = {
    hospitalId: 1,
    speciality: "cardio",
    title: "Cardiologie 2026",
    period: "2025-2026",
    dateOfStart: "2025-11-01",
    dateOfEnd: "2026-10-31",
  };

  it("passes for valid complete data", async () => {
    await expect(schema.validate(valid)).resolves.toBeTruthy();
  });

  it("fails when hospitalId is absent", async () => {
    const { hospitalId: _omit, ...data } = valid;
    await expect(schema.validate(data)).rejects.toThrow("yearCreate.errHospitalRequired");
  });

  it("fails when hospitalId = 0 (not positive)", async () => {
    await expect(schema.validate({ ...valid, hospitalId: 0 })).rejects.toThrow(
      "yearCreate.errHospitalInvalid"
    );
  });

  it("fails when hospitalId is negative", async () => {
    await expect(schema.validate({ ...valid, hospitalId: -1 })).rejects.toThrow(
      "yearCreate.errHospitalInvalid"
    );
  });

  it("fails when speciality is empty", async () => {
    await expect(schema.validate({ ...valid, speciality: "" })).rejects.toThrow(
      "yearCreate.errSpecialityRequired"
    );
  });

  it("fails when title is empty", async () => {
    await expect(schema.validate({ ...valid, title: "" })).rejects.toThrow(
      "yearCreate.errTitleRequired"
    );
  });

  it("fails when title is one character (too short)", async () => {
    await expect(schema.validate({ ...valid, title: "X" })).rejects.toThrow(
      "yearCreate.errTooShort"
    );
  });

  it("fails when period is empty", async () => {
    await expect(schema.validate({ ...valid, period: "" })).rejects.toThrow(
      "yearCreate.errPeriodRequired"
    );
  });

  it("fails when dateOfStart is missing", async () => {
    await expect(
      schema.validate({ ...valid, dateOfStart: undefined })
    ).rejects.toThrow("yearCreate.errDateStartRequired");
  });

  it("fails when dateOfEnd is missing", async () => {
    await expect(
      schema.validate({ ...valid, dateOfEnd: undefined })
    ).rejects.toThrow("yearCreate.errDateEndRequired");
  });
});

// ── Hospital filtering ─────────────────────────────────────────────────────────

describe("YearPage – hospital filtering", () => {

  async function openHospitalDropdown() {
    // "Hôpital de formation" appears twice: once in the form, once in the live preview.
    // The form label is always the first occurrence.
    const [formLabel] = screen.getAllByText("Hôpital de formation");
    const container = formLabel.parentElement as HTMLElement;
    const combobox = within(container).getByRole("combobox");
    fireEvent.mouseDown(combobox);
    return screen.findByRole("listbox");
  }

  it("shows only the hospitals returned by the authenticated endpoint", async () => {
    mockPrivateGet.mockResolvedValue({ data: [CHU_LIEGE] });
    renderPage();
    await waitFor(() =>
      expect(mockPrivateGet).toHaveBeenCalledWith("managers/hospitals")
    );

    const listbox = await openHospitalDropdown();
    expect(within(listbox).getByText("CHU Liège — Liège")).toBeInTheDocument();
    expect(within(listbox).queryByText("CHR Namur — Namur")).not.toBeInTheDocument();
  });

  it("shows multiple hospitals when the endpoint returns several", async () => {
    mockPrivateGet.mockResolvedValue({ data: [CHU_LIEGE, CHR_NAMUR] });
    renderPage();
    await waitFor(() =>
      expect(mockPrivateGet).toHaveBeenCalledWith("managers/hospitals")
    );

    const listbox = await openHospitalDropdown();
    expect(within(listbox).getByText("CHU Liège — Liège")).toBeInTheDocument();
    expect(within(listbox).getByText("CHR Namur — Namur")).toBeInTheDocument();
  });

  it("falls back to auth.hospitalId filter when the endpoint rejects", async () => {
    // Primary endpoint fails; fallback fetches all hospitals and filters by auth.hospitalId (= 1)
    mockPrivateGet.mockRejectedValue(new Error("403 Forbidden"));
    mockDefaultGet.mockResolvedValue({ data: [CHU_LIEGE, CHR_NAMUR] });
    renderPage();
    await waitFor(() => expect(mockDefaultGet).toHaveBeenCalled());

    const listbox = await openHospitalDropdown();
    expect(within(listbox).getByText("CHU Liège — Liège")).toBeInTheDocument();
    expect(within(listbox).queryByText("CHR Namur — Namur")).not.toBeInTheDocument();
  });

  it("shows no hospital options when both the endpoint and the fallback fail", async () => {
    mockPrivateGet.mockRejectedValue(new Error("500 Server Error"));
    mockDefaultGet.mockRejectedValue(new Error("network error"));
    renderPage();
    await waitFor(() => expect(mockDefaultGet).toHaveBeenCalled());

    const listbox = await openHospitalDropdown();
    const realOptions = within(listbox)
      .queryAllByRole("option")
      .filter(o => o.getAttribute("aria-disabled") !== "true");
    expect(realOptions).toHaveLength(0);
  });
});

// ── Title field layout ─────────────────────────────────────────────────────────

describe("YearPage – title field layout", () => {

  it("renders the title input with id='year-title-input'", () => {
    renderPage();
    const input = document.getElementById("year-title-input");
    expect(input).not.toBeNull();
    expect((input as HTMLInputElement).tagName.toLowerCase()).toBe("input");
  });

  it("title input appears before the preview strip in DOM order", () => {
    renderPage();
    const input = document.getElementById("year-title-input")!;
    const previewTag = screen.getByText("par défaut");
    // DOCUMENT_POSITION_FOLLOWING = the second node comes after the first in the tree
    expect(
      input.compareDocumentPosition(previewTag) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("shows '0/60' counter when title is empty", () => {
    renderPage();
    expect(screen.getByText("0/60")).toBeInTheDocument();
  });

  it("counter updates when typing into the title input", () => {
    renderPage();
    const input = document.getElementById("year-title-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Hello" } });
    expect(screen.getByText("5/60")).toBeInTheDocument();
  });

  it("shows 'par défaut' badge while title field is empty", () => {
    renderPage();
    expect(screen.getByText("par défaut")).toBeInTheDocument();
  });

  it("shows 'Réinit.' button after typing and hides 'par défaut'", () => {
    renderPage();
    const input = document.getElementById("year-title-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Mon titre" } });
    expect(screen.getByText(/Réinit\./)).toBeInTheDocument();
    expect(screen.queryByText("par défaut")).not.toBeInTheDocument();
  });

  it("clicking 'Réinit.' clears the title and restores 'par défaut'", () => {
    renderPage();
    const input = document.getElementById("year-title-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Mon titre" } });
    fireEvent.click(screen.getByText(/Réinit\./));
    expect(screen.getByText("par défaut")).toBeInTheDocument();
    expect(screen.queryByText(/Réinit\./)).not.toBeInTheDocument();
  });
});

// ── Form validation — required fields ─────────────────────────────────────────

describe("YearPage – form validation", () => {

  async function clickSubmit() {
    // The "Enregistrer" button (first, outlined — not "Enregistrer & ajouter des MACCs")
    fireEvent.click(screen.getByRole("button", { name: /^Enregistrer$/ }));
  }

  it("shows hospital required error when submitting empty form", async () => {
    renderPage();
    await clickSubmit();
    await waitFor(() =>
      expect(
        screen.getByText("Veuillez sélectionner l'hôpital de formation")
      ).toBeInTheDocument()
    );
  });

  it("shows speciality required error when submitting empty form", async () => {
    renderPage();
    await clickSubmit();
    await waitFor(() =>
      expect(
        screen.getByText("Veuillez renseigner la spécialité de formation")
      ).toBeInTheDocument()
    );
  });

  it("shows title required error when submitting empty form", async () => {
    renderPage();
    await clickSubmit();
    await waitFor(() =>
      expect(
        screen.getByText("Veuillez nommer cette année de formation")
      ).toBeInTheDocument()
    );
  });

  it("shows period required error when submitting empty form", async () => {
    renderPage();
    await clickSubmit();
    await waitFor(() =>
      expect(
        screen.getByText("Veuillez indiquer la période de formation")
      ).toBeInTheDocument()
    );
  });

  it("does not call the API when required fields are missing", async () => {
    renderPage();
    await clickSubmit();
    await waitFor(() =>
      expect(
        screen.getByText("Veuillez sélectionner l'hôpital de formation")
      ).toBeInTheDocument()
    );
    expect(mockPrivatePost).not.toHaveBeenCalled();
  });
});

// ── Live preview ───────────────────────────────────────────────────────────────

describe("YearPage – live preview", () => {

  it("renders the preview card with header and live badge", () => {
    renderPage();
    expect(screen.getByText("Aperçu")).toBeInTheDocument();
    expect(screen.getByText("synchro live")).toBeInTheDocument();
    expect(screen.getByText("Nouvelle année")).toBeInTheDocument();
  });

  it("cancel button navigates to /manager/years", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(mockNavigate).toHaveBeenCalledWith("/manager/years");
  });

  it("preview shows hospital name after selecting a hospital", async () => {
    mockPrivateGet.mockResolvedValue({ data: [CHU_LIEGE] });
    renderPage();
    await waitFor(() =>
      expect(mockPrivateGet).toHaveBeenCalledWith("managers/hospitals")
    );

    // Open the hospital dropdown and select CHU Liège (first label = form, second = preview)
    const [formLabel] = screen.getAllByText("Hôpital de formation");
    const combobox = within(formLabel.parentElement as HTMLElement).getByRole("combobox");
    fireEvent.mouseDown(combobox);
    const listbox = await screen.findByRole("listbox");
    fireEvent.click(within(listbox).getByText("CHU Liège — Liège"));

    // Live preview shows "Name · City" (different separator from the select option)
    await waitFor(() =>
      expect(screen.getByText("CHU Liège · Liège")).toBeInTheDocument()
    );
  });
});
