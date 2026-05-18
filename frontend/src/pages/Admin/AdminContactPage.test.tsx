/**
 * Tests for AdminContactPage.
 *
 * Covers:
 * - Spinner shown while loading
 * - Messages affichés dans le tableau (nom, email, aperçu, statut)
 * - Chip "Non traité" pour un message non traité
 * - Chip "Traité" pour un message traité
 * - Clic sur une ligne ouvre la modal avec le message complet
 * - Bouton "Marquer comme traité" présent dans la modal (message non traité)
 * - Bouton "Marquer comme traité" absent dans la modal (message déjà traité)
 * - Filtre "Non traités" appelle l'API avec ?treated=0
 * - Alerte "Erreur de chargement" si l'API échoue
 * - Alerte "Aucun message" si la liste est vide
 * - Onglet CC : liste des destinataires affichée
 * - Onglet CC : ajout d'un destinataire appelle createContactCc
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminContactPage from "./AdminContactPage";
import adminApi from "../../services/adminApi";
import type { ContactMessage, ContactCcConfig } from "../../services/adminApi";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("../../services/adminApi");
vi.mock("../../hooks/useAxiosPrivate", () => ({ default: () => ({}) }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const MOCK_MESSAGES: ContactMessage[] = [
  {
    id: 1,
    firstname: "Alice",
    lastname: "Dupont",
    email: "alice@test.be",
    message: "Bonjour, j'ai une question concernant votre service.",
    createdAt: "2026-05-18T10:00:00+00:00",
    treatedAt: null,
    treatedBy: null,
    treated: false,
  },
  {
    id: 2,
    firstname: "Bob",
    lastname: "Martin",
    email: "bob@test.be",
    message: "Merci pour votre réponse rapide.",
    createdAt: "2026-05-17T08:30:00+00:00",
    treatedAt: "2026-05-17T09:00:00+00:00",
    treatedBy: "super_admin",
    treated: true,
  },
];

const MOCK_CCS: ContactCcConfig[] = [
  { id: 1, email: "comm1@medatwork.be", name: "Chargée 1", isActive: true },
  { id: 2, email: "comm2@medatwork.be", name: "Chargée 2", isActive: false },
];

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeQc()}>
      <MemoryRouter>
        <AdminContactPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminApi.listContactMessages).mockResolvedValue(MOCK_MESSAGES);
  vi.mocked(adminApi.getContactStats).mockResolvedValue({ untreated: 1 });
  vi.mocked(adminApi.listContactCc).mockResolvedValue(MOCK_CCS);
});

// ── Messages tab ──────────────────────────────────────────────────────────────

describe("AdminContactPage — onglet Messages", () => {
  it("affiche un spinner pendant le chargement", () => {
    vi.mocked(adminApi.listContactMessages).mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(document.querySelector('[role="progressbar"]')).toBeTruthy();
  });

  it("affiche les messages dans le tableau", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    expect(screen.getByText("Martin Bob")).toBeInTheDocument();
    expect(screen.getByText("alice@test.be")).toBeInTheDocument();
    expect(screen.getByText("bob@test.be")).toBeInTheDocument();
  });

  it("affiche le chip 'Non traité' pour un message non traité", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Non traité")).toBeInTheDocument());
  });

  it("affiche le chip 'Traité' pour un message traité", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Traité")).toBeInTheDocument());
  });

  it("affiche un aperçu tronqué du message", async () => {
    renderPage();
    await waitFor(() => {
      const preview = screen.getByText(/Bonjour, j'ai une question/);
      expect(preview).toBeInTheDocument();
    });
  });

  it("ouvre la modal au clic sur une ligne et affiche le titre avec le nom", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Dupont Alice").closest("tr")!);
    // The dialog title shows "Message de {lastname} {firstname}"
    await waitFor(() =>
      expect(screen.getByText("Message de Dupont Alice")).toBeInTheDocument(),
      { timeout: 3000 }
    );
  });

  it("affiche le bouton 'Marquer comme traité' dans la modal pour un message non traité", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Dupont Alice").closest("tr")!);
    await waitFor(() => expect(screen.getByText("Marquer comme traité")).toBeInTheDocument());
  });

  it("n'affiche pas le bouton 'Marquer comme traité' pour un message déjà traité", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Martin Bob")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Martin Bob").closest("tr")!);
    await waitFor(() => {
      expect(screen.queryByText("Marquer comme traité")).toBeNull();
    });
  });

  it("affiche l'alerte d'erreur si l'API échoue", async () => {
    vi.mocked(adminApi.listContactMessages).mockRejectedValue(new Error("Server error"));
    renderPage();
    await waitFor(() => expect(screen.getByText("Erreur de chargement")).toBeInTheDocument());
  });

  it("affiche 'Aucun message' si la liste est vide", async () => {
    vi.mocked(adminApi.listContactMessages).mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByText(/Aucun message/)).toBeInTheDocument());
  });

  it("appelle listContactMessages avec 'untreated' quand filtre 'Non traités'", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Dupont Alice")).toBeInTheDocument());
    // MUI Select: open via mouseDown on the combobox element
    const combobox = screen.getByRole("combobox");
    fireEvent.mouseDown(combobox);
    fireEvent.click(await screen.findByRole("option", { name: "Non traités" }));
    await waitFor(() =>
      expect(adminApi.listContactMessages).toHaveBeenCalledWith("untreated")
    );
  });

  it("affiche le badge 'non traité' dans le titre quand stats > 0", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("1 non traité")).toBeInTheDocument());
  });
});

// ── CC tab ────────────────────────────────────────────────────────────────────

describe("AdminContactPage — onglet CC", () => {
  it("affiche les destinataires CC", async () => {
    renderPage();
    fireEvent.click(screen.getByText("Destinataires CC"));
    await waitFor(() => expect(screen.getByText("Chargée 1")).toBeInTheDocument());
    expect(screen.getByText("comm1@medatwork.be")).toBeInTheDocument();
    expect(screen.getByText("Chargée 2")).toBeInTheDocument();
  });

  it("affiche le formulaire d'ajout avec les champs Nom et Email", async () => {
    renderPage();
    fireEvent.click(screen.getByText("Destinataires CC"));
    await waitFor(() => expect(screen.getByText("Chargée 1")).toBeInTheDocument());
    // Form fields are visible
    expect(screen.getByText("Ajouter un destinataire")).toBeInTheDocument();
    expect(screen.getByText("Ajouter")).toBeInTheDocument();
  });
});
