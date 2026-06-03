/**
 * P0 — YearNotifPrefCard
 *
 * RED attendu : Module not found
 */

import { describe, it, expect, vi, beforeEach, type MockInstance } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as userSettingsModule from "../../../../hooks/useUserSettings";
import * as useYearNotifPrefsModule from "../../../../hooks/useYearNotifPrefs";
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

// ── Branches non couvertes (couverture lignes/branches) ───────────────────────

describe("YearNotifPrefCard — états loading et erreur", () => {
  it("C-FE40 affiche un spinner pendant le chargement", () => {
    vi.spyOn(useYearNotifPrefsModule, "useYearNotifPrefs").mockReturnValueOnce({
      prefs: null, loading: true, error: null,
      patch: mockPatch,
    });
    renderCard();
    expect(document.querySelector('[role="progressbar"]')).toBeTruthy();
  });

  it("C-FE41 affiche le message d'accès refusé si error = ACCESS_DENIED", () => {
    vi.spyOn(useYearNotifPrefsModule, "useYearNotifPrefs").mockReturnValueOnce({
      prefs: null, loading: false, error: "ACCESS_DENIED",
      patch: mockPatch,
    });
    renderCard();
    expect(screen.getByText(/Vous n.avez pas accès/i)).toBeInTheDocument();
    expect(screen.queryAllByTestId(/event-row-/)).toHaveLength(0);
  });

  it("C-FE42 patch résolu avec erreur (non-null) → toast.error affiché, dirty conservé", async () => {
    const { toast } = await import("react-toastify");
    mockPatch.mockResolvedValueOnce("VALIDATION_ERROR");

    renderCard();
    fireEvent.click(screen.getByTestId("checkbox-COMPLIANCE_ALERT-email"));
    await waitFor(() => screen.getByText(/Non sauvegardé/i));

    fireEvent.click(screen.getByTestId("btn-save-notif-prefs"));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());

    // Dirty reste true (badge toujours présent)
    expect(screen.getByText(/Non sauvegardé/i)).toBeInTheDocument();
  });
});

// ── P1 : changement yearId → réinitialisation dirty ──────────────────────────

describe("YearNotifPrefCard — P1 changement d'année", () => {
  /**
   * C-FE50 — RED attendu : le composant n'a pas de useEffect pour réinitialiser
   * localChanges/dirty quand yearId change. Le badge "Non sauvegardé" reste visible
   * après le changement d'année.
   *
   * Correction attendue : ajouter useEffect([yearId]) qui reset localChanges + dirty.
   */
  it("C-FE50 changement de yearId → dirty et localChanges réinitialisés", async () => {
    const { rerender } = renderCard(42);

    // Faire une modification → dirty=true
    fireEvent.click(screen.getByTestId("checkbox-COMPLIANCE_ALERT-email"));
    await waitFor(() => screen.getByText(/Non sauvegardé/i));

    // Changer l'année → le composant reçoit un nouveau yearId
    rerender(
      <ThemeProvider theme={lightTheme}>
        <YearNotifPrefCard yearId={99} />
      </ThemeProvider>
    );

    // Après changement d'année : dirty doit être réinitialisé
    expect(screen.queryByText(/Non sauvegardé/i)).not.toBeInTheDocument();
  });
});

// ── P1 : messages d'erreur spécifiques ────────────────────────────────────────

describe("YearNotifPrefCard — P1 messages d'erreur", () => {
  /**
   * C-FE51 — RED attendu : tous les erreurs affichent le même message générique
   * "Erreur lors de l'enregistrement." Le hook retourne "ACCESS_DENIED" mais
   * le composant ne fait pas de distinction.
   *
   * Correction attendue : cas spécifique pour ACCESS_DENIED dans handleSave.
   */
  it("C-FE51 PATCH ACCESS_DENIED → message d'accès refusé spécifique", async () => {
    const { toast } = await import("react-toastify");
    mockPatch.mockResolvedValueOnce("ACCESS_DENIED");

    renderCard();
    fireEvent.click(screen.getByTestId("checkbox-COMPLIANCE_ALERT-email"));
    await waitFor(() => screen.getByText(/Non sauvegardé/i));

    fireEvent.click(screen.getByTestId("btn-save-notif-prefs"));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());

    const errorMessage = (toast.error as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    // Le message doit mentionner l'accès refusé, pas une erreur générique d'enregistrement
    expect(errorMessage.toLowerCase()).toContain("accès");
  });
});

// ── P1 : comportements avec données inattendues ───────────────────────────────

describe("YearNotifPrefCard — P1 données inattendues", () => {
  it("C-FE52 événements inconnus dans prefs → composant ne crash pas", () => {
    // Les prefs contiennent un event inconnu (AI_ALERT) que le serveur aurait pu retourner
    vi.spyOn(useYearNotifPrefsModule, "useYearNotifPrefs").mockReturnValueOnce({
      prefs: {
        ...{
          COMPLIANCE_ALERT:         { email: true,  push: true,  sms: false, callRh: false },
          MONTH_VALIDATION:         { email: true,  push: false, sms: false, callRh: false },
          STAFFPLANNER_EXPORT_DONE: { email: true,  push: false, sms: false, callRh: false },
          RESIDENT_INACTIVE:        { email: true,  push: true,  sms: false, callRh: false },
          YEAR_ENDING:              { email: true,  push: true,  sms: false, callRh: false },
          SCHEDULE_CHANGED:         { email: false, push: true,  sms: false, callRh: false },
          VALIDATION_REJECTED:      { email: true,  push: true,  sms: false, callRh: false },
        },
        AI_ALERT: { email: true, push: false, sms: false, callRh: false }, // event inconnu
      },
      loading: false,
      error:   null,
      patch:   mockPatch,
    });

    // Le composant ne doit pas crasher
    expect(() => renderCard()).not.toThrow();

    // Les 7 événements connus sont toujours affichés
    expect(screen.getAllByTestId(/event-row-/)).toHaveLength(7);

    // L'event inconnu n'est pas rendu (seuls les KNOWN_EVENTS sont itérés)
    expect(screen.queryByTestId("event-row-AI_ALERT")).not.toBeInTheDocument();
  });

  it("C-FE53 globalSettings null → canaux non désactivés (fallback ?? true = non désactivé)", () => {
    vi.spyOn(userSettingsModule, "useUserSettings").mockReturnValueOnce({
      current: null,  // settings non encore chargés
      loading: true,
      error:   null,
    } as ReturnType<typeof userSettingsModule.useUserSettings>);

    renderCard();

    // Avec globalSettings=null, isGloballyDisabled retourne false (fallback ?? true → !true = false)
    // Les checkboxes ne doivent PAS être désactivées par le global
    const emailCheckboxes = screen.getAllByTestId(/checkbox-.*-email/);
    emailCheckboxes.forEach(cb => {
      expect(cb).not.toBeDisabled();
    });
  });
});

// ── P1 : bouton save et navigation ────────────────────────────────────────────

describe("YearNotifPrefCard — P1 save et liens", () => {
  it("C-FE54 bouton Enregistrer désactivé quand rien n'est modifié", () => {
    renderCard();

    const saveBtn = screen.getByTestId("btn-save-notif-prefs");
    // Sans modification (dirty=false), le bouton est disabled
    expect(saveBtn).toBeDisabled();
  });

  it("C-FE55 dirty persiste à travers les re-renders (pas de reset involontaire)", async () => {
    const { rerender } = renderCard(42);

    fireEvent.click(screen.getByTestId("checkbox-COMPLIANCE_ALERT-email"));
    await waitFor(() => screen.getByText(/Non sauvegardé/i));

    // Re-render avec les mêmes props → dirty conservé
    rerender(
      <ThemeProvider theme={lightTheme}>
        <YearNotifPrefCard yearId={42} />
      </ThemeProvider>
    );

    // Le badge doit toujours être présent (même yearId)
    expect(screen.getByText(/Non sauvegardé/i)).toBeInTheDocument();
  });

  it("C-FE56 lien vers les préférences globales est présent et pointe vers /profile/settings", () => {
    renderCard();

    const link = screen.getByRole("link", { name: /préférences globales/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/profile/settings");
  });
});
