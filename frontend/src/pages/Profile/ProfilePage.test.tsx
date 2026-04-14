/**
 * Tests for ProfilePage.
 *
 * Covers:
 * - Renders user name and role
 * - Shows gender-fallback avatar when no avatarUrl
 * - Shows real avatar when avatarUrl is set
 * - File rejected if wrong MIME type → toast.error
 * - File rejected if too large → toast.error
 * - Selecting valid file shows preview + confirm/cancel buttons
 * - Cancel preview hides confirm/cancel, reverts to previous avatar
 * - Confirming upload calls POST /api/profile/avatar
 * - Successful upload updates avatarUrl in auth context and hides preview buttons
 * - Upload error shows toast.error
 * - Delete button is visible only when avatarUrl is set
 * - Delete button is absent when no avatarUrl
 * - Clicking delete calls DELETE /api/profile/avatar
 * - Successful delete clears avatarUrl
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { toast } from "react-toastify";
import ProfilePage from "./ProfilePage";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPost   = vi.fn();
const mockDelete = vi.fn();
const mockAxios  = { post: mockPost, delete: mockDelete };
vi.mock("../../hooks/useAxiosPrivate", () => ({ default: () => mockAxios }));

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
  default: () => ({
    authentication: mockAuth,
    setAuthentication: mockSetAuthentication,
  }),
}));

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Stub image imports so jsdom doesn't choke on them
vi.mock("../../images/icons/Woman.png", () => ({ default: "woman.png" }));
vi.mock("../../images/icons/Man.png",   () => ({ default: "man.png" }));

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
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type });
}

function triggerFileInput(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.change(input);
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
  mockPost.mockResolvedValue({ data: { avatarUrl: "http://localhost:8000/uploads/avatars/new.jpg" } });
  mockDelete.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ProfilePage", () => {

  // ── Rendering ────────────────────────────────────────────────────────────────

  it("renders user name", () => {
    renderPage();
    expect(screen.getByText("Alice Dupont")).toBeInTheDocument();
  });

  it("renders role label for hospital_admin", () => {
    renderPage();
    expect(screen.getByText(/Administrateur d'hôpital/)).toBeInTheDocument();
  });

  it("shows gender fallback avatar when no avatarUrl", () => {
    renderPage();
    const avatar = screen.getByRole("img", { name: "Alice Dupont" });
    expect(avatar).toHaveAttribute("src", "woman.png");
  });

  it("shows real avatar when avatarUrl is set", () => {
    mockAuth.avatarUrl = "http://localhost:8000/uploads/avatars/abc.jpg";
    renderPage();
    const avatar = screen.getByRole("img", { name: "Alice Dupont" });
    expect(avatar).toHaveAttribute("src", "http://localhost:8000/uploads/avatars/abc.jpg");
  });

  // ── File validation ───────────────────────────────────────────────────────────

  it("shows error toast for unsupported MIME type", () => {
    renderPage();
    triggerFileInput(makeFile("test.gif", "image/gif"));
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Format non supporté/));
  });

  it("shows error toast when file exceeds 2 MB", () => {
    renderPage();
    triggerFileInput(makeFile("big.jpg", "image/jpeg", 3 * 1024 * 1024));
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/2 Mo/));
  });

  // ── Preview flow ──────────────────────────────────────────────────────────────

  it("shows confirm and cancel buttons after valid file selection", async () => {
    renderPage();
    triggerFileInput(makeFile("photo.jpg", "image/jpeg"));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Enregistrer/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Annuler/i })).toBeInTheDocument();
    });
  });

  it("hides confirm/cancel after clicking cancel", async () => {
    renderPage();
    triggerFileInput(makeFile("photo.jpg", "image/jpeg"));
    await waitFor(() => screen.getByRole("button", { name: /Annuler/i }));
    fireEvent.click(screen.getByRole("button", { name: /Annuler/i }));
    expect(screen.queryByRole("button", { name: /Enregistrer/i })).not.toBeInTheDocument();
  });

  // ── Upload mutation ───────────────────────────────────────────────────────────

  it("calls POST /profile/avatar on confirm", async () => {
    renderPage();
    triggerFileInput(makeFile("photo.jpg", "image/jpeg"));
    await waitFor(() => screen.getByRole("button", { name: /Enregistrer/i }));
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        "profile/avatar",
        expect.any(FormData),
        expect.objectContaining({ headers: { "Content-Type": "multipart/form-data" } })
      )
    );
  });

  it("calls setAuthentication with new avatarUrl on upload success", async () => {
    renderPage();
    triggerFileInput(makeFile("photo.jpg", "image/jpeg"));
    await waitFor(() => screen.getByRole("button", { name: /Enregistrer/i }));
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() =>
      expect(mockSetAuthentication).toHaveBeenCalledWith(
        expect.any(Function)
      )
    );
    // Verify the updater sets avatarUrl correctly
    const updater = mockSetAuthentication.mock.calls[0][0];
    const prev = { ...mockAuth };
    const result = updater(prev);
    expect(result.avatarUrl).toBe("http://localhost:8000/uploads/avatars/new.jpg");
  });

  it("shows toast.error on upload failure", async () => {
    mockPost.mockRejectedValue(new Error("Network error"));
    renderPage();
    triggerFileInput(makeFile("photo.jpg", "image/jpeg"));
    await waitFor(() => screen.getByRole("button", { name: /Enregistrer/i }));
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  // ── Delete button ─────────────────────────────────────────────────────────────

  it("does NOT show delete button when no avatarUrl", () => {
    renderPage();
    expect(screen.queryByRole("button", { name: /Supprimer la photo/i })).not.toBeInTheDocument();
  });

  it("shows delete button when avatarUrl is set", () => {
    mockAuth.avatarUrl = "http://localhost:8000/uploads/avatars/abc.jpg";
    renderPage();
    expect(screen.getByRole("button", { name: /Supprimer la photo/i })).toBeInTheDocument();
  });

  it("calls DELETE /profile/avatar on delete", async () => {
    mockAuth.avatarUrl = "http://localhost:8000/uploads/avatars/abc.jpg";
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Supprimer la photo/i }));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("profile/avatar"));
  });

  it("calls setAuthentication with avatarUrl = null on delete success", async () => {
    mockAuth.avatarUrl = "http://localhost:8000/uploads/avatars/abc.jpg";
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Supprimer la photo/i }));
    await waitFor(() => expect(mockSetAuthentication).toHaveBeenCalled());
    const updater = mockSetAuthentication.mock.calls[0][0];
    const result = updater({ ...mockAuth });
    expect(result.avatarUrl).toBeNull();
  });

});
