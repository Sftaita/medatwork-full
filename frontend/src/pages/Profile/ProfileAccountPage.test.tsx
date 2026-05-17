/**
 * Tests for ProfileAccountPage — Phase 6C.
 *
 * Covered:
 * - Rendu — sections présentes, titre, boutons
 * - Loading — skeletons affichés
 * - Manager — tous les champs visibles, Fonction, Genre
 * - Resident — Spécialité, Université, Date de maîtrise ; pas de Fonction
 * - HospitalAdmin — Hôpital read-only ; pas de Fonction ni Spécialité
 * - AppAdmin — champs de base uniquement
 * - Email read-only — affiché en Chip, aucun input éditable
 * - Sauvegarde — appel mutation avec bons champs par rôle
 * - Sauvegarde — succès affiche alert
 * - Validation frontend — prénom trop court, prénom vide, nom trop court
 * - Mot de passe — confirmation différente
 * - Mot de passe — nouveau trop court
 * - Mot de passe — champ courant requis
 * - Mot de passe — succès
 * - Mot de passe — erreur currentPassword incorrect → message champ
 * - Show/hide password — type bascule sur chaque champ
 * - Navigation — bouton retour
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProfileAccountPage from "./ProfileAccountPage";
import type { ProfileAccount } from "../../services/profileAccountApi";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockSaveInfo       = vi.fn();
const mockChangePassword = vi.fn();

let mockProfile: ProfileAccount | undefined;
let mockIsLoading  = false;
let mockSavingInfo = false;

vi.mock("../../hooks/useProfileAccount", () => ({
  useProfileAccount:       () => ({ data: mockProfile, isLoading: mockIsLoading, isError: false }),
  useUpdateProfileAccount: () => ({ mutate: mockSaveInfo,       isPending: mockSavingInfo }),
  useChangePassword:       () => ({ mutate: mockChangePassword, isPending: false }),
}));

vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// SpecialitySelect est un Select MUI complet — on le simplifie pour les tests.
// Les options utilisent les clés courtes comme value (cardio, neurology…)
// pour refléter ce qui est stocké en base.
vi.mock("../../components/UniversitySelect", () => ({
  default: ({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) => (
    <select
      aria-label="Université"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      data-testid="university-select"
    >
      <option value="">— Non défini —</option>
      <option value="uclouvain">UCLouvain</option>
      <option value="ulb">ULB</option>
      <option value="uliege">ULiège</option>
    </select>
  ),
}));

vi.mock("../../components/SpecialitySelect", () => ({
  default: ({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) => (
    <select
      aria-label="Spécialité"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      data-testid="speciality-select"
    >
      <option value="">— Non défini —</option>
      <option value="cardio">Cardiologie</option>
      <option value="neurology">Neurologie</option>
      <option value="pediatric">Pédiatrie</option>
    </select>
  ),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MANAGER: ProfileAccount = {
  role: "manager", firstname: "Alice", lastname: "Dupont",
  email: "alice@example.com", avatarUrl: null, sexe: "female", job: "doctor",
};

const RESIDENT: ProfileAccount = {
  role: "resident", firstname: "Bob", lastname: "Martin",
  email: "bob@example.com", avatarUrl: null, sexe: "male",
  speciality: "cardio",      // clé stockée en DB
  university:  "uclouvain",  // clé stockée en DB
  dateOfMaster: "2022-06-15",
};

const HOSPITAL_ADMIN: ProfileAccount = {
  role: "hospital_admin", firstname: "Carol", lastname: "Lambert",
  email: "carol@chu.be", avatarUrl: null, hospitalName: "CHU Liège",
};

const APP_ADMIN: ProfileAccount = {
  role: "app_admin", firstname: "Dave", lastname: "Admin",
  email: "dave@admin.com", avatarUrl: null,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPage() {
  return render(<MemoryRouter><ProfileAccountPage /></MemoryRouter>);
}

/** Fills all three password fields and clicks the submit button. */
function fillPasswordForm(current = "ancien123", next = "nouveau456", confirm = "nouveau456") {
  fireEvent.change(screen.getByLabelText("Mot de passe actuel"),             { target: { value: current } });
  fireEvent.change(screen.getByLabelText("Nouveau mot de passe"),            { target: { value: next } });
  fireEvent.change(screen.getByLabelText("Confirmer le nouveau mot de passe"), { target: { value: confirm } });
  fireEvent.click(screen.getByRole("button", { name: /Modifier le mot de passe/ }));
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockProfile   = MANAGER;
  mockIsLoading = false;
  mockSavingInfo = false;
});

// ═════════════════════════════════════════════════════════════════════════════
// Rendu global
// ═════════════════════════════════════════════════════════════════════════════

describe("ProfileAccountPage — rendu global", () => {
  it("affiche le titre Mon compte", () => {
    renderPage();
    expect(screen.getByText("Mon compte")).toBeInTheDocument();
  });

  it("affiche la section Informations personnelles", () => {
    renderPage();
    expect(screen.getByText("Informations personnelles")).toBeInTheDocument();
  });

  it("affiche la section Mot de passe", () => {
    renderPage();
    expect(screen.getByText("Mot de passe", { selector: "h6" })).toBeInTheDocument();
  });

  it("affiche le bouton Enregistrer", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /^Enregistrer$/ })).toBeInTheDocument();
  });

  it("affiche le bouton Modifier le mot de passe", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /Modifier le mot de passe/ })).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Loading state
// ═════════════════════════════════════════════════════════════════════════════

describe("ProfileAccountPage — loading", () => {
  beforeEach(() => { mockIsLoading = true; mockProfile = undefined; });

  it("affiche des skeletons pendant le chargement", () => {
    renderPage();
    expect(document.querySelectorAll(".MuiSkeleton-root").length).toBeGreaterThan(0);
  });

  it("n'affiche pas les champs de formulaire pendant le chargement", () => {
    renderPage();
    expect(screen.queryByDisplayValue("Alice")).not.toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Manager
// ═════════════════════════════════════════════════════════════════════════════

describe("ProfileAccountPage — rôle manager", () => {
  it("affiche l'email en Chip (non éditable)", () => {
    renderPage();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    // Le Chip n'est pas un input
    expect(screen.queryByDisplayValue("alice@example.com")).not.toBeInTheDocument();
  });

  it("affiche les inputs Prénom et Nom pré-remplis", () => {
    renderPage();
    expect(screen.getByDisplayValue("Alice")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Dupont")).toBeInTheDocument();
  });

  it("affiche le select Fonction", () => {
    renderPage();
    expect(screen.getByLabelText("Fonction")).toBeInTheDocument();
  });

  it("affiche le select Genre", () => {
    renderPage();
    expect(screen.getByLabelText("Genre")).toBeInTheDocument();
  });

  it("n'affiche pas les champs Resident (Spécialité, Université)", () => {
    renderPage();
    expect(screen.queryByLabelText("Spécialité")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Université")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Date de maîtrise")).not.toBeInTheDocument();
  });

  it("n'affiche pas le nom de l'hôpital", () => {
    renderPage();
    expect(screen.queryByText("Hôpital")).not.toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Resident
// ═════════════════════════════════════════════════════════════════════════════

describe("ProfileAccountPage — rôle resident", () => {
  beforeEach(() => { mockProfile = RESIDENT; });

  it("affiche l'email read-only (Chip, pas input)", () => {
    renderPage();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("bob@example.com")).not.toBeInTheDocument();
  });

  it("affiche la spécialité pré-remplie dans le Select", () => {
    renderPage();
    // La valeur stockée est la clé "cardio" — l'option affichée est "Cardiologie"
    expect(screen.getByTestId("speciality-select")).toHaveValue("cardio");
  });

  it("affiche Université pré-remplie dans le Select", () => {
    renderPage();
    expect(screen.getByTestId("university-select")).toHaveValue("uclouvain");
  });

  it("affiche Date de maîtrise pré-remplie", () => {
    renderPage();
    expect(screen.getByDisplayValue("2022-06-15")).toBeInTheDocument();
  });

  it("affiche le select Genre", () => {
    renderPage();
    expect(screen.getByLabelText("Genre")).toBeInTheDocument();
  });

  it("n'affiche pas Fonction (manager uniquement)", () => {
    renderPage();
    expect(screen.queryByLabelText("Fonction")).not.toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// HospitalAdmin
// ═════════════════════════════════════════════════════════════════════════════

describe("ProfileAccountPage — rôle hospital_admin", () => {
  beforeEach(() => { mockProfile = HOSPITAL_ADMIN; });

  it("affiche le nom de l'hôpital en lecture seule", () => {
    renderPage();
    expect(screen.getByText("CHU Liège")).toBeInTheDocument();
    // Chip, pas input
    expect(screen.queryByDisplayValue("CHU Liège")).not.toBeInTheDocument();
  });

  it("affiche Prénom et Nom éditables", () => {
    renderPage();
    expect(screen.getByDisplayValue("Carol")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Lambert")).toBeInTheDocument();
  });

  it("n'affiche pas Fonction (manager uniquement)", () => {
    renderPage();
    expect(screen.queryByLabelText("Fonction")).not.toBeInTheDocument();
  });

  it("n'affiche pas Genre (hospital_admin n'a pas sexe)", () => {
    renderPage();
    expect(screen.queryByLabelText("Genre")).not.toBeInTheDocument();
  });

  it("n'affiche pas Spécialité ni Université", () => {
    renderPage();
    expect(screen.queryByLabelText("Spécialité")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Université")).not.toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// AppAdmin
// ═════════════════════════════════════════════════════════════════════════════

describe("ProfileAccountPage — rôle app_admin", () => {
  beforeEach(() => { mockProfile = APP_ADMIN; });

  it("affiche Prénom et Nom éditables", () => {
    renderPage();
    expect(screen.getByDisplayValue("Dave")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Admin")).toBeInTheDocument();
  });

  it("affiche l'email read-only", () => {
    renderPage();
    expect(screen.getByText("dave@admin.com")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("dave@admin.com")).not.toBeInTheDocument();
  });

  it("n'affiche aucun champ role-spécifique", () => {
    renderPage();
    expect(screen.queryByLabelText("Fonction")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Genre")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Spécialité")).not.toBeInTheDocument();
    expect(screen.queryByText("Hôpital")).not.toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Sauvegarde informations personnelles
// ═════════════════════════════════════════════════════════════════════════════

describe("ProfileAccountPage — sauvegarde infos manager", () => {
  it("appelle la mutation avec firstname, lastname, sexe, job", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /^Enregistrer$/ }));
    expect(mockSaveInfo).toHaveBeenCalledWith(
      expect.objectContaining({ firstname: "Alice", lastname: "Dupont" }),
      expect.any(Object),
    );
  });

  it("affiche l'alerte succès après sauvegarde", async () => {
    mockSaveInfo.mockImplementation((_p: unknown, { onSuccess }: { onSuccess: () => void }) => {
      onSuccess();
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /^Enregistrer$/ }));
    await waitFor(() =>
      expect(screen.getByText("Informations enregistrées.")).toBeInTheDocument()
    );
  });

  it("affiche l'erreur serveur sous le bouton", async () => {
    mockSaveInfo.mockImplementation((_p: unknown, { onError }: { onError: (e: unknown) => void }) => {
      onError({ response: { data: { message: "Email déjà utilisé" } } });
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /^Enregistrer$/ }));
    await waitFor(() =>
      expect(screen.getByText("Email déjà utilisé")).toBeInTheDocument()
    );
  });
});

describe("ProfileAccountPage — sauvegarde infos resident", () => {
  beforeEach(() => { mockProfile = RESIDENT; });

  it("envoie les champs spécifiques du résident", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /^Enregistrer$/ }));
    expect(mockSaveInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        firstname:    "Bob",
        lastname:     "Martin",
        speciality:   "cardio",      // clé stockée en DB
        university:   "uclouvain",   // clé stockée en DB
        dateOfMaster: "2022-06-15",
      }),
      expect.any(Object),
    );
  });

  it("peut modifier la spécialité via le Select avant sauvegarde", () => {
    renderPage();
    // Sélectionne la clé "neurology" dans le mock
    fireEvent.change(screen.getByTestId("speciality-select"), { target: { value: "neurology" } });
    fireEvent.click(screen.getByRole("button", { name: /^Enregistrer$/ }));
    expect(mockSaveInfo).toHaveBeenCalledWith(
      expect.objectContaining({ speciality: "neurology" }),
      expect.any(Object),
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Validation frontend — informations personnelles
// ═════════════════════════════════════════════════════════════════════════════

describe("ProfileAccountPage — validation infos personnelles", () => {
  it("bloque si prénom < 2 caractères", () => {
    renderPage();
    fireEvent.change(screen.getByDisplayValue("Alice"), { target: { value: "A" } });
    fireEvent.click(screen.getByRole("button", { name: /^Enregistrer$/ }));
    expect(screen.getByText(/minimum 2 caractères/)).toBeInTheDocument();
    expect(mockSaveInfo).not.toHaveBeenCalled();
  });

  it("bloque si prénom est vide", () => {
    renderPage();
    fireEvent.change(screen.getByDisplayValue("Alice"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /^Enregistrer$/ }));
    expect(screen.getByText(/minimum 2 caractères/)).toBeInTheDocument();
    expect(mockSaveInfo).not.toHaveBeenCalled();
  });

  it("bloque si nom < 2 caractères", () => {
    renderPage();
    fireEvent.change(screen.getByDisplayValue("Dupont"), { target: { value: "X" } });
    fireEvent.click(screen.getByRole("button", { name: /^Enregistrer$/ }));
    expect(screen.getByText(/minimum 2 caractères/)).toBeInTheDocument();
    expect(mockSaveInfo).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Validation frontend — mot de passe
// ═════════════════════════════════════════════════════════════════════════════

describe("ProfileAccountPage — validation mot de passe", () => {
  it("bloque si confirmation ≠ nouveau mot de passe", () => {
    renderPage();
    fillPasswordForm("ancien123", "nouveau456", "different");
    expect(screen.getByText(/ne correspondent pas/)).toBeInTheDocument();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("bloque si nouveau mot de passe < 8 caractères", () => {
    renderPage();
    fillPasswordForm("ancien123", "court", "court");
    expect(screen.getByText(/Minimum 8 caractères/)).toBeInTheDocument();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("bloque si mot de passe actuel vide", () => {
    renderPage();
    fillPasswordForm("", "nouveau456", "nouveau456");
    expect(screen.getByText(/Ce champ est requis/)).toBeInTheDocument();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("appelle la mutation quand tous les champs sont valides", () => {
    renderPage();
    fillPasswordForm();
    expect(mockChangePassword).toHaveBeenCalledWith(
      { currentPassword: "ancien123", newPassword: "nouveau456", confirmPassword: "nouveau456" },
      expect.any(Object),
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Résultats mutation mot de passe
// ═════════════════════════════════════════════════════════════════════════════

describe("ProfileAccountPage — résultat changement mot de passe", () => {
  it("affiche l'alerte succès et vide les champs", async () => {
    mockChangePassword.mockImplementation((_b: unknown, { onSuccess }: { onSuccess: () => void }) => {
      onSuccess();
    });
    renderPage();
    fillPasswordForm();
    await waitFor(() =>
      expect(screen.getByText(/Mot de passe modifié avec succès/)).toBeInTheDocument()
    );
    // Champs vidés après succès
    expect(screen.getByLabelText("Mot de passe actuel")).toHaveValue("");
  });

  it("affiche l'erreur dans le champ courant si mot de passe actuel incorrect", async () => {
    mockChangePassword.mockImplementation((_b: unknown, { onError }: { onError: (e: unknown) => void }) => {
      onError({ response: { data: { message: "Mot de passe actuel incorrect" } } });
    });
    renderPage();
    fillPasswordForm("wrong");
    await waitFor(() =>
      expect(screen.getByText(/Mot de passe actuel incorrect/)).toBeInTheDocument()
    );
    // Pas d'alerte succès
    expect(screen.queryByText(/modifié avec succès/)).not.toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Show / hide password
// ═════════════════════════════════════════════════════════════════════════════

describe("ProfileAccountPage — show/hide password", () => {
  it("le champ mot de passe actuel est masqué par défaut", () => {
    renderPage();
    expect(screen.getByLabelText("Mot de passe actuel")).toHaveAttribute("type", "password");
  });

  it("le bouton Afficher bascule le type en text", () => {
    renderPage();
    // 3 boutons "Afficher" (un par champ) — le premier correspond au mot de passe actuel
    const [showCurrentBtn] = screen.getAllByRole("button", { name: "Afficher" });
    fireEvent.click(showCurrentBtn);
    expect(screen.getByLabelText("Mot de passe actuel")).toHaveAttribute("type", "text");
  });

  it("le bouton Masquer rebascule en password", () => {
    renderPage();
    const [showCurrentBtn] = screen.getAllByRole("button", { name: "Afficher" });
    fireEvent.click(showCurrentBtn);
    // Après le clic, l'aria-label change en "Masquer"
    const hideBtn = screen.getAllByRole("button", { name: "Masquer" })[0];
    fireEvent.click(hideBtn);
    expect(screen.getByLabelText("Mot de passe actuel")).toHaveAttribute("type", "password");
  });

  it("les trois champs ont leur propre toggle indépendant", () => {
    renderPage();
    const showBtns = screen.getAllByRole("button", { name: "Afficher" });
    expect(showBtns).toHaveLength(3);

    // Toggle uniquement le premier
    fireEvent.click(showBtns[0]);
    expect(screen.getByLabelText("Mot de passe actuel")).toHaveAttribute("type", "text");
    // Les deux autres restent masqués
    expect(screen.getByLabelText("Nouveau mot de passe")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Confirmer le nouveau mot de passe")).toHaveAttribute("type", "password");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Navigation
// ═════════════════════════════════════════════════════════════════════════════

describe("ProfileAccountPage — navigation", () => {
  it("le bouton retour appelle navigate(-1)", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Retour/ }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
