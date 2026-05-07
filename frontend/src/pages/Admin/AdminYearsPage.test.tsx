/**
 * Tests for AdminYearsPage.
 *
 * Covers:
 * - Loading spinner
 * - Rendu : titre, période, lieu, hôpital, résidents
 * - Badge "Sans hôpital" pour les années sans hôpital
 * - Recherche par titre, lieu, hôpital
 * - État vide "Aucune année"
 * - État "Aucun résultat" après recherche
 * - Filtre hôpital (Select dynamique)
 * - Filtre "Sans hôpital"
 * - Tri par Titre asc/desc
 * - Tri par Résidents (numérique)
 * - Tri par Hôpital alphabétique
 * - En-têtes de colonne triables présents
 * - Footer avec compteur
 * - Menu 3-points → "Changer l'hôpital" ouvre le dialog
 * - Dialog appelle assignYearHospital à la confirmation
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminYearsPage from "./AdminYearsPage";
import adminApi from "../../services/adminApi";

vi.mock("../../services/adminApi");
vi.mock("../../hooks/useAxiosPrivate", () => ({ default: () => {} }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_YEARS: any[] = [
  {
    id: 10,
    title: "Stage cardio S1",
    period: "2025-2026",
    location: "Cardiologie",
    speciality: "Cardiologie clinique",
    dateOfStart: "2025-09-01",
    dateOfEnd: "2026-02-28",
    residentCount: 3,
    hospital: { id: 1, name: "CHU Liège" },
  },
  {
    id: 11,
    title: "Stage urgences S2",
    period: "2025-2026",
    location: "Urgences",
    speciality: null,
    dateOfStart: "2026-03-01",
    dateOfEnd: "2026-08-31",
    residentCount: 0,
    hospital: null,
  },
  {
    id: 12,
    title: "Stage pédiatrie S3",
    period: "2024-2025",
    location: "Pédiatrie",
    speciality: null,
    dateOfStart: "2024-09-01",
    dateOfEnd: "2025-02-28",
    residentCount: 5,
    hospital: { id: 2, name: "CHR Namur" },
  },
];

const MOCK_HOSPITALS: any[] = [
  { id: 1, name: "CHU Liège",  city: "Liège",  country: "Belgique", isActive: true },
  { id: 2, name: "CHR Namur",  city: "Namur",  country: "Belgique", isActive: true },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeQc()}>
      <MemoryRouter>
        <AdminYearsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const SEARCH_PLACEHOLDER = "Rechercher par titre, période, lieu, hôpital…";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminApi.listAllYears).mockResolvedValue(MOCK_YEARS);
  vi.mocked(adminApi.listHospitals).mockResolvedValue(MOCK_HOSPITALS);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AdminYearsPage", () => {

  // ── Loading ──────────────────────────────────────────────────────────────

  it("shows loading spinner while fetching", () => {
    vi.mocked(adminApi.listAllYears).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  // ── Rendu ────────────────────────────────────────────────────────────────

  it("renders one row per année avec titre, période, hôpital", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    expect(screen.getByText("Stage urgences S2")).toBeInTheDocument();
    expect(screen.getByText("Stage pédiatrie S3")).toBeInTheDocument();
    expect(screen.getByText("CHU Liège")).toBeInTheDocument();
    expect(screen.getByText("CHR Namur")).toBeInTheDocument();
    // Période visible dans le tableau
    expect(screen.getAllByText("2025-2026").length).toBeGreaterThanOrEqual(2);
  });

  it("affiche la spécialité traduite en français sous le titre", async () => {
    // "Cardiologie clinique" n'est pas dans le dictionnaire → affiché tel quel
    renderPage();
    await waitFor(() => expect(screen.getByText("Cardiologie clinique")).toBeInTheDocument());
  });

  it("affiche le badge 'Sans hôpital' pour les années non rattachées", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Sans hôpital")).toBeInTheDocument());
  });

  it("affiche le compteur de résidents sous forme de pill", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    // 3, 0, 5 résidents
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  // ── En-têtes ────────────────────────────────────────────────────────────

  it("affiche les en-têtes de colonnes triables (sans Lieu)", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    const headers = screen.getAllByRole("columnheader").map((th) => th.textContent ?? "");
    expect(headers.some((h) => h.includes("Titre"))).toBe(true);
    expect(headers.some((h) => h.includes("Période"))).toBe(true);
    expect(headers.some((h) => h.includes("Hôpital"))).toBe(true);
    expect(headers.some((h) => h.includes("Résidents"))).toBe(true);
    // Lieu est retiré du tableau (visible uniquement dans le sidebar)
    expect(headers.some((h) => h === "Lieu")).toBe(false);
  });

  // ── Footer ───────────────────────────────────────────────────────────────

  it("affiche le footer avec le compteur total", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    expect(screen.getByText(/3 sur 3 années/)).toBeInTheDocument();
  });

  // ── Recherche ────────────────────────────────────────────────────────────

  it("filtre par titre", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), {
      target: { value: "cardio" },
    });
    expect(screen.getByText("Stage cardio S1")).toBeInTheDocument();
    expect(screen.queryByText("Stage urgences S2")).not.toBeInTheDocument();
  });

  it("filtre par nom d'hôpital", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("CHU Liège")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), {
      target: { value: "Namur" },
    });
    expect(screen.getByText("Stage pédiatrie S3")).toBeInTheDocument();
    expect(screen.queryByText("Stage cardio S1")).not.toBeInTheDocument();
  });

  it("affiche 'Aucun résultat' si la recherche ne correspond à rien", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), {
      target: { value: "zzz" },
    });
    await waitFor(() =>
      expect(screen.getByText("Aucun résultat pour cette recherche.")).toBeInTheDocument()
    );
  });

  it("affiche 'Aucune année' quand la liste est vide", async () => {
    vi.mocked(adminApi.listAllYears).mockResolvedValue([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Aucune année enregistrée.")).toBeInTheDocument()
    );
  });

  // ── Filtre hôpital ────────────────────────────────────────────────────────

  it("filtre par hôpital via le Select", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByRole("combobox"));
    await waitFor(() => expect(screen.getByRole("option", { name: "CHR Namur" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("option", { name: "CHR Namur" }));
    await waitFor(() => {
      expect(screen.getByText("Stage pédiatrie S3")).toBeInTheDocument();
      expect(screen.queryByText("Stage cardio S1")).not.toBeInTheDocument();
      expect(screen.queryByText("Stage urgences S2")).not.toBeInTheDocument();
    });
  });

  it("filtre 'Sans hôpital' n'affiche que les années non rattachées", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByRole("combobox"));
    await waitFor(() => expect(screen.getByRole("option", { name: "Sans hôpital" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("option", { name: "Sans hôpital" }));
    await waitFor(() => {
      expect(screen.getByText("Stage urgences S2")).toBeInTheDocument();
      expect(screen.queryByText("Stage cardio S1")).not.toBeInTheDocument();
      expect(screen.queryByText("Stage pédiatrie S3")).not.toBeInTheDocument();
    });
  });

  // ── Tri par colonne ───────────────────────────────────────────────────────

  it("trie par Titre asc par défaut (cardio < pédiatrie < urgences)", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0].textContent).toContain("cardio");
    expect(rows[1].textContent).toContain("pédiatrie");
    expect(rows[2].textContent).toContain("urgences");
  });

  it("inverse le tri Titre au 2e clic", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    const titreHeader = screen.getAllByRole("columnheader").find((th) =>
      th.textContent?.includes("Titre")
    )!;
    fireEvent.click(titreHeader); // → desc
    await waitFor(() => {
      const rows = screen.getAllByRole("row").slice(1);
      expect(rows[0].textContent).toContain("urgences");
      expect(rows[2].textContent).toContain("cardio");
    });
  });

  it("trie par Résidents asc — 0 en premier, 5 en dernier", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    const residentsHeader = screen.getAllByRole("columnheader").find((th) =>
      th.textContent?.includes("Résidents")
    )!;
    fireEvent.click(residentsHeader); // → asc
    await waitFor(() => {
      const rows = screen.getAllByRole("row").slice(1);
      expect(rows[0].textContent).toContain("urgences"); // 0 résidents
      expect(rows[2].textContent).toContain("pédiatrie"); // 5 résidents
    });
  });

  it("trie par Hôpital asc — sans hôpital (\"\" ) avant CHR avant CHU", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    const hopitalHeader = screen.getAllByRole("columnheader").find((th) =>
      th.textContent?.includes("Hôpital")
    )!;
    fireEvent.click(hopitalHeader); // → asc : "" < "CHR Namur" < "CHU Liège"
    await waitFor(() => {
      const rows = screen.getAllByRole("row").slice(1);
      expect(rows[0].textContent).toContain("urgences");  // sans hôpital → ""
      expect(rows[1].textContent).toContain("pédiatrie"); // CHR Namur
      expect(rows[2].textContent).toContain("cardio");    // CHU Liège
    });
  });

  // ── Drawer de détail ─────────────────────────────────────────────────────

  it("ouvre le drawer au clic sur une ligne", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Stage cardio S1"));
    await waitFor(() => expect(screen.getByRole("presentation")).toBeInTheDocument());
  });

  it("le drawer affiche le lieu et l'hôpital", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Stage cardio S1"));
    const drawer = await screen.findByRole("presentation");
    expect(within(drawer as HTMLElement).getByText("Cardiologie")).toBeInTheDocument();
    expect(within(drawer as HTMLElement).getAllByText("CHU Liège").length).toBeGreaterThanOrEqual(1);
  });

  it("le drawer affiche la période et les dates", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Stage cardio S1"));
    const drawer = await screen.findByRole("presentation");
    expect(within(drawer as HTMLElement).getByText("2025-2026")).toBeInTheDocument();
  });

  it("le drawer se ferme au clic sur X", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Stage cardio S1"));
    await screen.findByRole("presentation");
    fireEvent.click(screen.getByTestId("CloseIcon").closest("button")!);
    await waitFor(() => expect(screen.queryByRole("presentation")).not.toBeInTheDocument());
  });

  // ── Traduction des spécialités ─────────────────────────────────────────────

  it("traduit les spécialités anglaises en français", async () => {
    vi.mocked(adminApi.listAllYears).mockResolvedValue([
      { ...MOCK_YEARS[0], speciality: "cardiology" },
    ] as any);
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    expect(screen.getByText("Cardiologie")).toBeInTheDocument();
  });

  // ── Menu 3-points / dialog ────────────────────────────────────────────────

  it("le menu 3-points affiche 'Changer l\\'hôpital'", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    const menuButtons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(menuButtons[0].closest("button")!);
    await waitFor(() =>
      expect(screen.getByText("Changer l'hôpital")).toBeInTheDocument()
    );
  });

  it("'Changer l\\'hôpital' ouvre le dialog avec le titre de l'année", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    const menuButtons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(menuButtons[0].closest("button")!);
    await waitFor(() => expect(screen.getByText("Changer l'hôpital")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Changer l'hôpital"));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    // Le titre apparaît dans le corps du dialog
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Stage cardio S1/)).toBeInTheDocument();
  });

  it("le dialog appelle assignYearHospital à la confirmation", async () => {
    vi.mocked(adminApi.assignYearHospital).mockResolvedValue(undefined as any);
    renderPage();
    await waitFor(() => expect(screen.getByText("Stage cardio S1")).toBeInTheDocument());
    const menuButtons = screen.getAllByTestId("MoreVertIcon");
    fireEvent.click(menuButtons[0].closest("button")!);
    await waitFor(() => expect(screen.getByText("Changer l'hôpital")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Changer l'hôpital"));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    // Sélectionner CHR Namur dans le dialog
    const dialog = screen.getByRole("dialog");
    fireEvent.mouseDown(within(dialog).getByRole("combobox"));
    await waitFor(() => expect(screen.getByRole("option", { name: "CHR Namur" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("option", { name: "CHR Namur" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Enregistrer" }));
    // API appelée avec (yearId, hospitalId) en args séparés
    await waitFor(() =>
      expect(adminApi.assignYearHospital).toHaveBeenCalledWith(10, 2)
    );
  });
});
