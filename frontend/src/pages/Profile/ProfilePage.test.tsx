/**
 * Tests for ProfilePage — photo de profil.
 *
 * Flow couvert :
 * - Rendu du nom/rôle/avatar
 * - Rejet des fichiers invalides (mauvais type, trop grand)
 * - Sélection d'un fichier valide → dialog de crop s'ouvre
 * - Annuler dans le dialog → ferme sans preview
 * - Confirmer le crop → preview + boutons Enregistrer/Annuler
 * - Annuler la preview → revient à l'état initial
 * - Enregistrer → POST /api/profile/avatar avec le blob cropé
 * - Succès de l'upload → setAuthentication avec la nouvelle URL + topbar avatar réactif
 * - Erreur d'upload → toast.error
 * - Bouton Supprimer absent sans avatarUrl
 * - Bouton Supprimer présent avec avatarUrl
 * - DELETE /api/profile/avatar au clic sur Supprimer
 * - Succès de la suppression → setAuthentication({ avatarUrl: null })
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { toast } from "react-toastify";
import ProfilePage from "./ProfilePage";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPost   = vi.fn();
const mockDelete = vi.fn();
vi.mock("../../hooks/useAxiosPrivate", () => ({ default: () => ({ post: mockPost, delete: mockDelete }) }));

const mockSetAuthentication = vi.fn();
let mockAuth = {
  firstname: "Alice",
  lastname: "Dupont",
  role: "hospital_admin" as const,
  gender: "female",
  avatarUrl: null as string | null,
  hospitalName: "CHU Liège",
};
vi.mock("../../hooks/useAuth", () => ({
  default: () => ({ authentication: mockAuth, setAuthentication: mockSetAuthentication }),
}));

vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("../../images/icons/Woman.png", () => ({ default: "woman.png" }));
vi.mock("../../images/icons/Man.png",   () => ({ default: "man.png"   }));

// Mock getCroppedImg — canvas/Image ne fonctionnent pas dans jsdom
vi.mock("./cropUtils", () => ({
  getCroppedImg: vi.fn().mockResolvedValue(new Blob(["cropped"], { type: "image/jpeg" })),
}));

// Mock react-easy-crop — le composant appelle onCropComplete immédiatement
vi.mock("react-easy-crop", () => ({
  default: ({ onCropComplete }: { onCropComplete: (a: object, b: object) => void }) => {
    React.useEffect(() => {
      onCropComplete(
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 0, y: 0, width: 100, height: 100 }
      );
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return <div data-testid="cropper" />;
  },
}));

// URL.createObjectURL/revokeObjectURL non disponibles dans jsdom
global.URL.createObjectURL = vi.fn(() => "blob:mock-preview");
global.URL.revokeObjectURL = vi.fn();

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeQc()}>
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function makeFile(name: string, type: string, sizeBytes = 100): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

function triggerFileInput(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.change(input);
}

/** Sélectionne un fichier + confirme le crop → arrive sur la preview. */
async function selectAndCrop(file = makeFile("photo.jpg", "image/jpeg")) {
  triggerFileInput(file);
  // Attendre le dialog de crop
  await waitFor(() => expect(screen.getByText("Recadrer la photo")).toBeInTheDocument());
  // Confirmer le crop
  fireEvent.click(screen.getByRole("button", { name: /^Recadrer$/ }));
  // Attendre la preview (bouton Enregistrer)
  await waitFor(() => expect(screen.getByRole("button", { name: /Enregistrer/i })).toBeInTheDocument());
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth = {
    firstname: "Alice",
    lastname: "Dupont",
    role: "hospital_admin",
    gender: "female",
    avatarUrl: null,
    hospitalName: "CHU Liège",
  };
  mockPost.mockResolvedValue({ data: { avatarUrl: "https://api-link.medatwork.be/uploads/avatars/new.jpg" } });
  mockDelete.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ProfilePage — rendu initial", () => {
  it("affiche le nom complet", () => {
    renderPage();
    expect(screen.getByText("Alice Dupont")).toBeInTheDocument();
  });

  it("affiche le rôle hospital_admin", () => {
    renderPage();
    expect(screen.getByText(/Administrateur d'hôpital/)).toBeInTheDocument();
  });

  it("affiche l'avatar de secours (genre) quand aucun avatarUrl", () => {
    renderPage();
    const avatar = screen.getByRole("img", { name: "Alice Dupont" });
    expect(avatar).toHaveAttribute("src", "woman.png");
  });

  it("affiche l'avatar réel quand avatarUrl est défini", () => {
    mockAuth.avatarUrl = "https://api-link.medatwork.be/uploads/avatars/abc.jpg";
    renderPage();
    const avatar = screen.getByRole("img", { name: "Alice Dupont" });
    expect(avatar).toHaveAttribute("src", "https://api-link.medatwork.be/uploads/avatars/abc.jpg");
  });
});

describe("ProfilePage — validation du fichier", () => {
  it("toast.error si mauvais MIME type", () => {
    renderPage();
    triggerFileInput(makeFile("test.gif", "image/gif"));
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Format non supporté/));
  });

  it("toast.error si fichier > 2 Mo", () => {
    renderPage();
    triggerFileInput(makeFile("big.jpg", "image/jpeg", 3 * 1024 * 1024));
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/2 Mo/));
  });

  it("n'ouvre pas le dialog si le fichier est invalide", () => {
    renderPage();
    triggerFileInput(makeFile("test.gif", "image/gif"));
    expect(screen.queryByText("Recadrer la photo")).not.toBeInTheDocument();
  });
});

describe("ProfilePage — dialog de crop", () => {
  it("ouvre le dialog après sélection d'un fichier valide", async () => {
    renderPage();
    triggerFileInput(makeFile("photo.jpg", "image/jpeg"));
    await waitFor(() =>
      expect(screen.getByText("Recadrer la photo")).toBeInTheDocument()
    );
    expect(screen.getByTestId("cropper")).toBeInTheDocument();
  });

  it("ferme le dialog sans preview si on annule", async () => {
    renderPage();
    triggerFileInput(makeFile("photo.jpg", "image/jpeg"));
    await waitFor(() => screen.getByText("Recadrer la photo"));
    fireEvent.click(screen.getByRole("button", { name: /Annuler/i }));
    await waitFor(() =>
      expect(screen.queryByText("Recadrer la photo")).not.toBeInTheDocument()
    );
    expect(screen.queryByRole("button", { name: /Enregistrer/i })).not.toBeInTheDocument();
  });

  it("confirmer le crop affiche les boutons de preview", async () => {
    renderPage();
    await selectAndCrop();
    expect(screen.getByRole("button", { name: /Enregistrer/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Annuler/i })).toBeInTheDocument();
  });

  it("confirmer le crop ferme le dialog", async () => {
    renderPage();
    await selectAndCrop();
    expect(screen.queryByText("Recadrer la photo")).not.toBeInTheDocument();
  });
});

describe("ProfilePage — preview et upload", () => {
  it("Annuler la preview cache les boutons", async () => {
    renderPage();
    await selectAndCrop();
    fireEvent.click(screen.getByRole("button", { name: /^Annuler$/ }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Enregistrer/i })).not.toBeInTheDocument()
    );
  });

  it("Enregistrer appelle POST /profile/avatar avec un FormData", async () => {
    renderPage();
    await selectAndCrop();
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        "profile/avatar",
        expect.any(FormData),
        expect.objectContaining({ headers: { "Content-Type": "multipart/form-data" } })
      )
    );
  });

  it("upload réussi → setAuthentication avec la nouvelle URL", async () => {
    renderPage();
    await selectAndCrop();
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() => expect(mockSetAuthentication).toHaveBeenCalled());

    const updater = mockSetAuthentication.mock.calls[0][0];
    const result = updater({ ...mockAuth });
    expect(result.avatarUrl).toBe("https://api-link.medatwork.be/uploads/avatars/new.jpg");
  });

  it("upload réussi → l'avatar dans le topbar se met à jour immédiatement (store réactif)", async () => {
    // Le store Zustand est partagé ; setAuthentication doit être appelé avec la bonne URL
    // pour que le Topbar (qui lit authentication.avatarUrl) se mette à jour sans reconnexion.
    renderPage();
    await selectAndCrop();
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() => expect(mockSetAuthentication).toHaveBeenCalled());

    const updater = mockSetAuthentication.mock.calls[0][0];
    expect(typeof updater).toBe("function"); // doit être un updater fonctionnel (pas une valeur brute)
    const result = updater({ firstname: "Alice", lastname: "Dupont", avatarUrl: null });
    expect(result.avatarUrl).not.toBeNull();
  });

  it("upload réussi → toast.success affiché", async () => {
    renderPage();
    await selectAndCrop();
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("upload réussi → les boutons de preview disparaissent", async () => {
    renderPage();
    await selectAndCrop();
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Enregistrer/i })).not.toBeInTheDocument()
    );
  });

  it("erreur d'upload → toast.error", async () => {
    mockPost.mockRejectedValue(new Error("Network error"));
    renderPage();
    await selectAndCrop();
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});

describe("ProfilePage — suppression de la photo", () => {
  it("bouton Supprimer absent quand aucun avatarUrl", () => {
    renderPage();
    expect(screen.queryByRole("button", { name: /Supprimer la photo/i })).not.toBeInTheDocument();
  });

  it("bouton Supprimer présent quand avatarUrl est défini", () => {
    mockAuth.avatarUrl = "https://api-link.medatwork.be/uploads/avatars/abc.jpg";
    renderPage();
    expect(screen.getByRole("button", { name: /Supprimer la photo/i })).toBeInTheDocument();
  });

  it("clic sur Supprimer appelle DELETE /profile/avatar", async () => {
    mockAuth.avatarUrl = "https://api-link.medatwork.be/uploads/avatars/abc.jpg";
    renderPage();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Supprimer la photo/i }));
    });
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("profile/avatar"));
  });

  it("suppression réussie → setAuthentication avec avatarUrl = null", async () => {
    mockAuth.avatarUrl = "https://api-link.medatwork.be/uploads/avatars/abc.jpg";
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Supprimer la photo/i }));
    await waitFor(() => expect(mockSetAuthentication).toHaveBeenCalled());

    const updater = mockSetAuthentication.mock.calls[0][0];
    const result = updater({ ...mockAuth });
    expect(result.avatarUrl).toBeNull();
  });

  it("suppression réussie → toast.success affiché", async () => {
    mockAuth.avatarUrl = "https://api-link.medatwork.be/uploads/avatars/abc.jpg";
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Supprimer la photo/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });
});
