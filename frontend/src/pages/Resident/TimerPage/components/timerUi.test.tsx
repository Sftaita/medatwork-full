/**
 * Tests for timerUi.tsx — atoms, formatters and picker value display.
 *
 * Key regression: after switching to MUI DatePicker / TimePicker, the
 * formatted date/time string was not forwarded to the custom textField slot.
 * These tests verify that the value prop is correctly passed through.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import dayjs from "dayjs";

// ── MUI picker mocks ──────────────────────────────────────────────────────────
// Simulate MUI's behaviour: pass the formatted date/time string as the `value`
// prop to the custom textField slot. This lets us verify that the slot
// components (PickerDateInput, PickerTimeInput, PickerDateInputInline)
// correctly display that value.

vi.mock("@mui/x-date-pickers/DatePicker", () => ({
  DatePicker: ({ value, onChange, slots, slotProps }: any) => {
    const TextField = slots?.textField;
    if (!TextField) return null;
    const formattedValue =
      value && typeof value.format === "function" && value.isValid?.()
        ? value.format("DD/MM/YYYY")
        : "";
    return (
      <TextField
        value={formattedValue}
        onClick={slotProps?.textField?.onClick}
        inputProps={{}}
        onChange={onChange}
      />
    );
  },
}));

vi.mock("@mui/x-date-pickers/TimePicker", () => ({
  TimePicker: ({ value, onChange, slots, slotProps }: any) => {
    const TextField = slots?.textField;
    if (!TextField) return null;
    const formattedValue =
      value && typeof value.format === "function" && value.isValid?.()
        ? value.format("HH:mm")
        : "";
    return (
      <TextField
        value={formattedValue}
        onClick={slotProps?.textField?.onClick}
        inputProps={{}}
        onChange={onChange}
      />
    );
  },
}));

vi.mock("@mui/x-date-pickers/LocalizationProvider", () => ({
  LocalizationProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock("@mui/x-date-pickers/AdapterDayjs", () => ({
  AdapterDayjs: class {},
}));

vi.mock("@mui/x-date-pickers/locales", () => ({
  frFR: {
    components: {
      MuiLocalizationProvider: {
        defaultProps: { localeText: {} },
      },
    },
  },
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────
import { TDateTimeField, TDateField, TToggle, TSelect, fmtHM } from "./timerUi";

// ── fmtHM ─────────────────────────────────────────────────────────────────────

describe("fmtHM", () => {
  it("retourne '0h' pour 0", () => expect(fmtHM(0)).toBe("0h"));
  it("retourne '0h' pour négatif", () => expect(fmtHM(-5)).toBe("0h"));
  it("retourne '1h' pour 60 minutes", () => expect(fmtHM(60)).toBe("1h"));
  it("retourne '1h 30' pour 90 minutes", () => expect(fmtHM(90)).toBe("1h 30"));
  it("retourne '2h 05' pour 125 minutes", () => expect(fmtHM(125)).toBe("2h 05"));
  it("retourne '0h' pour une valeur nulle simulée", () => expect(fmtHM(0)).toBe("0h"));
});

// ── TToggle ───────────────────────────────────────────────────────────────────

describe("TToggle", () => {
  it("affiche le label", () => {
    render(<TToggle checked={false} onChange={vi.fn()} label="Garde appelable" />);
    expect(screen.getByText("Garde appelable")).toBeInTheDocument();
  });

  it("checkbox est décoché quand checked=false", () => {
    render(<TToggle checked={false} onChange={vi.fn()} label="Test" />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("checkbox est coché quand checked=true", () => {
    render(<TToggle checked={true} onChange={vi.fn()} label="Test" />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("appelle onChange avec true quand on clique", () => {
    const onChange = vi.fn();
    render(<TToggle checked={false} onChange={onChange} label="Test" />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

// ── TSelect ───────────────────────────────────────────────────────────────────

describe("TSelect", () => {
  const OPTIONS = [
    { value: "a", label: "Option A" },
    { value: "b", label: "Option B" },
  ];

  it("affiche les options", () => {
    render(<TSelect value="a" options={OPTIONS} onChange={vi.fn()} />);
    expect(screen.getByRole("option", { name: "Option A" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Option B" })).toBeInTheDocument();
  });

  it("appelle onChange avec la valeur sélectionnée", () => {
    const onChange = vi.fn();
    render(<TSelect value="a" options={OPTIONS} onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "b" } });
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("affiche un message d'erreur si error est fourni", () => {
    render(<TSelect value="" options={OPTIONS} onChange={vi.fn()} error="Champ requis" />);
    expect(screen.getByText("Champ requis")).toBeInTheDocument();
  });

  it("affiche le placeholder comme première option", () => {
    render(
      <TSelect value="" options={OPTIONS} onChange={vi.fn()} placeholder="Choisir…" />
    );
    expect(screen.getByRole("option", { name: "Choisir…" })).toBeInTheDocument();
  });
});

// ── TDateTimeField — affichage valeur (régression) ────────────────────────────

describe("TDateTimeField — affichage valeur", () => {
  const VALUE = new Date("2026-05-28T08:30:00");

  it("affiche le numéro du jour dans la tuile calendrier", () => {
    render(
      <TDateTimeField
        title="Début"
        value={VALUE}
        onDateChange={vi.fn()}
        onTimeChange={vi.fn()}
      />
    );
    expect(screen.getByText("28")).toBeInTheDocument();
  });

  it("affiche le mois abrégé dans la tuile calendrier", () => {
    render(
      <TDateTimeField
        title="Début"
        value={VALUE}
        onDateChange={vi.fn()}
        onTimeChange={vi.fn()}
      />
    );
    // dayjs fr locale: "mai"
    expect(screen.getByText(/mai/i)).toBeInTheDocument();
  });

  it("affiche la date formatée dans le champ date (régression: value prop forwarding)", () => {
    render(
      <TDateTimeField
        title="Début"
        value={VALUE}
        onDateChange={vi.fn()}
        onTimeChange={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue("28/05/2026")).toBeInTheDocument();
  });

  it("affiche l'heure dans le champ heure (régression: value prop forwarding)", () => {
    render(
      <TDateTimeField
        title="Début"
        value={VALUE}
        onDateChange={vi.fn()}
        onTimeChange={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue("08:30")).toBeInTheDocument();
  });

  it("affiche '–' et '—' quand aucune valeur", () => {
    render(
      <TDateTimeField
        title="Début"
        value={null}
        onDateChange={vi.fn()}
        onTimeChange={vi.fn()}
      />
    );
    expect(screen.getByText("–")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("affiche le message d'erreur", () => {
    render(
      <TDateTimeField
        title="Fin"
        value={null}
        onDateChange={vi.fn()}
        onTimeChange={vi.fn()}
        error="L'heure de fin doit être après l'heure de début"
      />
    );
    expect(
      screen.getByText("L'heure de fin doit être après l'heure de début")
    ).toBeInTheDocument();
  });
});

// ── TDateField — affichage valeur (régression) ────────────────────────────────

describe("TDateField — affichage valeur", () => {
  const VALUE = "2026-05-28";

  it("affiche le numéro du jour dans la tuile calendrier", () => {
    render(<TDateField value={VALUE} onChange={vi.fn()} />);
    expect(screen.getByText("28")).toBeInTheDocument();
  });

  it("affiche le mois abrégé dans la tuile calendrier", () => {
    render(<TDateField value={VALUE} onChange={vi.fn()} />);
    expect(screen.getByText(/mai/i)).toBeInTheDocument();
  });

  it("affiche la date formatée dans le champ (régression: value prop forwarding)", () => {
    render(<TDateField value={VALUE} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue("28/05/2026")).toBeInTheDocument();
  });

  it("affiche '–' et '—' quand aucune valeur", () => {
    render(<TDateField value={null} onChange={vi.fn()} />);
    expect(screen.getByText("–")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("affiche le message d'erreur", () => {
    render(<TDateField value={null} onChange={vi.fn()} error="Date requise" />);
    expect(screen.getByText("Date requise")).toBeInTheDocument();
  });
});
