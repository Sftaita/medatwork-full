/**
 * P0 — YearNotifPrefCard
 *
 * RED attendu : Module not found
 */

import { describe, it, expect, vi, beforeEach, type MockInstance } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as userSettingsModule from "../../../../hooks/useUserSettings";
import { ThemeProvider } from "@mui/material/styles";
import { lightTheme } from "../../../../doc/CustomizedTheme";
import YearNotifPrefCard from "./YearNotifPrefCard";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPatch = vi.hoisted(() => vi.fn());
const mockPrefs = vi.hoisted(() => ({
  COMPLIANCE_ALERT:         { email: true,  push: true,  sms: false, callRh: false },
  MONTH_VALIDATION:         { email: true,  push: false, sms: false, callRh: false },
  STAFFPLANNER_EXPORT_DONE: { email: true,  push: false, sms: false, callRh: false },
  RESIDENT_INACTIVE:        { email: true,  push: true,  sms: false, callRh: false },
  YEAR_ENDING:              { email: true,  push: true,  sms: false, callRh: false },
  SCHEDULE_CHANGED:         { email: false, push: true,  sms: false, callRh: false },
  VALIDATION_REJECTED:      { email: true,  push: true,  sms: false, callRh: false },
}));

// Mock du hook useYearNotifPrefs
vi.mock("../../../../hooks/useYearNotifPrefs", () => ({
  useYearNotifPrefs: vi.fn(() => ({
    prefs:   mockPrefs,
    loading: false,
    error:   null,
    patch:   mockPatch,
  })),
}));

// Mock du hook useUserSettings (global prefs)
vi.mock("../../../../hooks/useUserSettings", () => ({
  useUserSettings: vi.fn(() => ({
    current: {
      notifications: { email: true, push: true, sms: false, callRh: false },
    },
    loading: false,
    error:   null,
  })),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string, fb?: string) => fb ?? k }),
}));

vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderCard(yearId: number | null = 42) {
  return render(
    <ThemeProvider theme={lightTheme}>
      <YearNotifPrefCard yearId={yearId} />
    </ThemeProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPatch.mockResolvedValue(null);
});

// ── C-FE01 : 7 événements rendus ─────────────────────────────────────────────

describe("YearNotifPrefCard — affichage initial", () => {
  it("C-FE01 affiche les 7 événements connus", () => {
    renderCard();

    const knownEvents = [
      "COMPLIANCE_ALERT",
      "MONTH_VALIDATION",
      "STAFFPLANNER_EXPORT_DONE",
      "RESIDENT_INACTIVE",
      "YEAR_ENDING",
      "SCHEDULE_CHANGED",
      "VALIDATION_REJECTED",
    ];

    knownEvents.forEach(event => {
      expect(screen.getByTestId(`event-row-${event}`)).toBeInTheDocument();
    });
  });

  it("C-FE02 affiche 4 canaux par événement (email, push, sms, callRh)", () => {
    renderCard();

    const channels = ["email", "push", "sms", "callRh"];
    channels.forEach(channel => {
      const checkboxes = screen.getAllByTestId(new RegExp(`checkbox-COMPLIANCE_ALERT-${channel}`));
      expect(checkboxes.length).toBeGreaterThan(0);
    });
  });

  it("C-FE03 cases cochées selon les valeurs de l'API", () => {
    renderCard();

    // COMPLIANCE_ALERT.email = true → coché
    expect(screen.getByTestId("checkbox-COMPLIANCE_ALERT-email")).toBeChecked();
    // SCHEDULE_CHANGED.email = false → décoché
    expect(screen.getByTestId("checkbox-SCHEDULE_CHANGED-email")).not.toBeChecked();
  });

  it("C-FE04 cases décochées selon les valeurs false de l'API", () => {
    renderCard();

    // MONTH_VALIDATION.push = false → décoché
    expect(screen.getByTestId("checkbox-MONTH_VALIDATION-push")).not.toBeChecked();
  });

  it("C-FE07 affiche les defaults si aucune préférence en base (tous les events présents)", () => {
    renderCard();
    // Tous les 7 événements doivent être affichés même sans préférence personnalisée
    expect(screen.getAllByTestId(/event-row-/)).toHaveLength(7);
  });
});

// ── C-FE08 : canaux désactivés globalement → grisés ──────────────────────────

describe("YearNotifPrefCard — canaux désactivés globalement", () => {
  beforeEach(() => {
    // Override le mock useUserSettings pour simuler push global OFF
    vi.spyOn(userSettingsModule, "useUserSettings").mockReturnValue({
      current: {
        notifications: { email: true, push: false, sms: false, callRh: false },
      },
      loading: false,
      error: null,
    } as ReturnType<typeof userSettingsModule.useUserSettings>);
  });

  it("C-FE08 canal push globalement OFF → checkboxes push désactivées", () => {
    renderCard();

    // Toutes les checkboxes push doivent être désactivées
    const pushCheckboxes = screen.getAllByTestId(/checkbox-.*-push/);
    pushCheckboxes.forEach(cb => {
      expect(cb).toBeDisabled();
    });
  });

  it("C-FE09 canal grisé → tooltip explicatif présent dans le DOM", () => {
    renderCard();

    // Un tooltip ou message expliquant la désactivation doit être présent
    const disabledIndicators = screen.getAllByTestId(/disabled-channel-push/);
    expect(disabledIndicators.length).toBeGreaterThan(0);
  });

  it("C-FE10 clic sur checkbox grisée → aucun changement d'état", async () => {
    renderCard();

    const pushCb = screen.getAllByTestId(/checkbox-.*-push/)[0];
    fireEvent.click(pushCb);

    // mockPatch ne doit pas avoir été appelé
    expect(mockPatch).not.toHaveBeenCalled();
  });
});

// ── C-FE14–19 : interactions ──────────────────────────────────────────────────

describe("YearNotifPrefCard — interactions", () => {
  it("C-FE14 clic sur une checkbox active la bascule de valeur", async () => {
    renderCard();

    const emailCb = screen.getByTestId("checkbox-COMPLIANCE_ALERT-email");
    expect(emailCb).toBeChecked(); // était true

    fireEvent.click(emailCb);

    // L'état local doit basculer (dirty = modifications locales non sauvegardées)
    await waitFor(() =>
      expect(screen.getByText(/Non sauvegardé/i)).toBeInTheDocument()
    );
  });

  it("C-FE15 après modification → badge 'Non sauvegardé' apparaît", async () => {
    renderCard();

    expect(screen.queryByText(/Non sauvegardé/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("checkbox-MONTH_VALIDATION-email"));

    await waitFor(() =>
      expect(screen.getByText(/Non sauvegardé/i)).toBeInTheDocument()
    );
  });

  it("C-FE16 sans modification → badge 'Non sauvegardé' absent", () => {
    renderCard();
    expect(screen.queryByText(/Non sauvegardé/i)).not.toBeInTheDocument();
  });

  it("C-FE18 modifier un event n'affecte pas les autres events", async () => {
    renderCard();

    const monthEmail = screen.getByTestId("checkbox-MONTH_VALIDATION-email");
    const compliancePush = screen.getByTestId("checkbox-COMPLIANCE_ALERT-push");

    const compliancePushBefore = compliancePush.getAttribute("data-checked") ?? compliancePush.getAttribute("aria-checked");

    fireEvent.click(monthEmail);

    // COMPLIANCE_ALERT.push ne doit pas changer
    expect(compliancePush.getAttribute("data-checked") ?? compliancePush.getAttribute("aria-checked"))
      .toBe(compliancePushBefore);
  });
});

// ── C-FE20–25 : sauvegarde ────────────────────────────────────────────────────

describe("YearNotifPrefCard — sauvegarde", () => {
  it("C-FE20 clic Enregistrer → appelle patch avec les modifications", async () => {
    mockPatch.mockResolvedValue(null);
    renderCard();

    fireEvent.click(screen.getByTestId("checkbox-COMPLIANCE_ALERT-email"));

    await waitFor(() => screen.getByText(/Non sauvegardé/i));

    fireEvent.click(screen.getByTestId("btn-save-notif-prefs"));

    await waitFor(() => expect(mockPatch).toHaveBeenCalled());

    const [patchArg] = mockPatch.mock.calls[0] as [Record<string, unknown>];
    expect(patchArg).toHaveProperty("COMPLIANCE_ALERT");
    expect(patchArg).not.toHaveProperty("userId");
  });

  it("C-FE22 PATCH réussi → badge 'Non sauvegardé' disparaît", async () => {
    mockPatch.mockResolvedValue(null);
    renderCard();

    fireEvent.click(screen.getByTestId("checkbox-COMPLIANCE_ALERT-email"));
    await waitFor(() => screen.getByText(/Non sauvegardé/i));

    fireEvent.click(screen.getByTestId("btn-save-notif-prefs"));

    await waitFor(() =>
      expect(screen.queryByText(/Non sauvegardé/i)).not.toBeInTheDocument()
    );
  });

  it("C-FE23 bouton Enregistrer désactivé pendant le PATCH (anti double-clic)", async () => {
    let resolvePatch!: (v: null) => void;
    mockPatch.mockReturnValue(new Promise<null>(r => { resolvePatch = r; }));

    const { toast } = await import("react-toastify");
    renderCard();
    fireEvent.click(screen.getByTestId("checkbox-COMPLIANCE_ALERT-email"));
    await waitFor(() => screen.getByText(/Non sauvegardé/i));

    const saveBtn = screen.getByTestId("btn-save-notif-prefs");
    fireEvent.click(saveBtn);

    // PENDANT la sauvegarde → bouton désactivé (loading=true)
    await waitFor(() => expect(saveBtn).toBeDisabled());

    // Résoudre → save réussi, dirty=false → bouton reste disabled (plus de changements en attente)
    resolvePatch(null);
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    // Après save, dirty=false donc disabled={!dirty}=true → comportement correct
    expect(saveBtn).toBeDisabled();
  });

  it("C-FE25 PATCH échoue → données locales conservées (dirty reste true)", async () => {
    const { toast } = await import("react-toastify");
    mockPatch.mockRejectedValue({ response: { status: 500 } });

    renderCard();
    fireEvent.click(screen.getByTestId("checkbox-COMPLIANCE_ALERT-email"));
    await waitFor(() => screen.getByText(/Non sauvegardé/i));

    fireEvent.click(screen.getByTestId("btn-save-notif-prefs"));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    // Dirty reste true (badge toujours présent)
    expect(screen.getByText(/Non sauvegardé/i)).toBeInTheDocument();
  });
});

// ── C-FE31–34 : sécurité ─────────────────────────────────────────────────────

describe("YearNotifPrefCard — sécurité et accès", () => {
  it("C-FE31 yearId=null → composant vide ou message d'absence", () => {
    renderCard(null);
    expect(screen.queryAllByTestId(/event-row-/)).toHaveLength(0);
  });

  it("SEC-FE01 le payload PATCH ne contient jamais userId ni yearId", async () => {
    mockPatch.mockResolvedValue(null);
    renderCard();

    fireEvent.click(screen.getByTestId("checkbox-COMPLIANCE_ALERT-email"));
    await waitFor(() => screen.getByText(/Non sauvegardé/i));
    fireEvent.click(screen.getByTestId("btn-save-notif-prefs"));

    await waitFor(() => expect(mockPatch).toHaveBeenCalled());

    const [patchArg] = mockPatch.mock.calls[0] as [Record<string, unknown>];
    expect(patchArg).not.toHaveProperty("userId");
    expect(patchArg).not.toHaveProperty("yearId");
    expect(patchArg).not.toHaveProperty("user_id");
  });
});
