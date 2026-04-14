/**
 * Tests for HospitalAdminNotificationsPage.
 *
 * Covers:
 * - Shows skeleton rows while loading
 * - Renders notification rows (title, date, statut chip)
 * - "Non lu" chip for unread, "Lu" chip for read
 * - "Aucune notification" alert when list is empty
 * - "Aucune notification non lue" alert when filtering unread on an all-read list
 * - Filter toggle: "Non lues" tab hides read notifications
 * - "Tout marquer comme lu" button visible only when unread count > 0
 * - Clicking "Tout marquer comme lu" calls markAllNotificationsRead
 * - Clicking an unread row calls markNotificationRead
 * - Clicking any row opens the detail dialog with full body
 * - Dialog shows the notification title and body
 * - Dialog "Fermer" button closes the dialog
 * - Dialog shows "Ouvrir le lien" button only when targetUrl is set
 * - Clicking "Ouvrir le lien" closes dialog and navigates to targetUrl
 * - Dialog does NOT show "Ouvrir le lien" when targetUrl is null
 * - Dialog shows "Marquer non lu" button when notification is read
 * - Dialog does NOT show "Marquer non lu" when notification is unread
 * - Clicking "Marquer non lu" calls markNotificationUnread API
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import HospitalAdminNotificationsPage from "./HospitalAdminNotificationsPage";
import communicationsApi from "../../services/communicationsApi";
import type { CommNotification } from "../../types/entities";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("../../services/communicationsApi", () => ({
  default: {
    getNotifications:          vi.fn(() => ({ method: "get",    url: "/notifications" })),
    markNotificationRead:      vi.fn((id: number) => ({ method: "patch",  url: `/notifications/${id}/read` })),
    markNotificationUnread:    vi.fn((id: number) => ({ method: "delete", url: `/notifications/${id}/read` })),
    markAllNotificationsRead:  vi.fn(() => ({ method: "patch",  url: "/notifications/read-all" })),
  },
}));

const mockGet    = vi.fn();
const mockPatch  = vi.fn().mockResolvedValue({});
const mockDelete = vi.fn().mockResolvedValue({});
const mockAxios  = { get: mockGet, patch: mockPatch, delete: mockDelete };
vi.mock("../../hooks/useAxiosPrivate", () => ({ default: () => mockAxios }));
vi.mock("../../hooks/useAuth", () => ({
  default: () => ({ authentication: { role: "hospital_admin" } }),
}));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../../hooks/useCommNotifications", () => ({ commUnreadCountQueryKey: () => [] }))

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeNotif = (override: Partial<CommNotification> = {}): CommNotification => ({
  id: 1,
  type: "notification",
  title: "Bienvenue",
  body: "Contenu de la notification",
  imageUrl: null,
  linkUrl: null,
  buttonLabel: null,
  targetUrl: null,
  isRead: false,
  readAt: null,
  createdAt: "2026-04-05T10:00:00+00:00",
  ...override,
});

const NOTIFICATIONS: CommNotification[] = [
  makeNotif({ id: 1, title: "Notification non lue", isRead: false }),
  makeNotif({ id: 2, title: "Notification lue",     isRead: true  }),
];

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeQc()}>
      <MemoryRouter>
        <HospitalAdminNotificationsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue({ data: NOTIFICATIONS });
  mockPatch.mockResolvedValue({});
  mockDelete.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("HospitalAdminNotificationsPage", () => {
  // ── Loading ──────────────────────────────────────────────────────────────────

  it("shows skeleton rows while fetching", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("table")).toBeInTheDocument();
    // Skeleton rows are present — no real data yet
    expect(screen.queryByText("Notification non lue")).not.toBeInTheDocument();
  });

  // ── Rendering ────────────────────────────────────────────────────────────────

  it("renders notification titles after load", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Notification non lue")).toBeInTheDocument()
    );
    expect(screen.getByText("Notification lue")).toBeInTheDocument();
  });

  it("shows 'Non lu' chip for unread and 'Lu' chip for read", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Non lu")).toBeInTheDocument());
    expect(screen.getByText("Lu")).toBeInTheDocument();
  });

  // ── Empty states ──────────────────────────────────────────────────────────────

  it("shows empty alert when list is empty", async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Aucune notification.")).toBeInTheDocument()
    );
  });

  it("shows 'non lue' alert when filtering unread on an all-read list", async () => {
    mockGet.mockResolvedValue({ data: [makeNotif({ isRead: true, title: "Already read" })] });
    renderPage();
    await waitFor(() => expect(screen.getByText("Already read")).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Non lues/));
    await waitFor(() =>
      expect(screen.getByText("Aucune notification non lue.")).toBeInTheDocument()
    );
  });

  // ── Filter toggle ─────────────────────────────────────────────────────────────

  it("'Non lues' tab hides read notifications", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Notification non lue")).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Non lues/));
    expect(screen.getByText("Notification non lue")).toBeInTheDocument();
    expect(screen.queryByText("Notification lue")).not.toBeInTheDocument();
  });

  // ── Mark all ──────────────────────────────────────────────────────────────────

  it("shows 'Tout marquer comme lu' button when unread count > 0", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Tout marquer/i })).toBeInTheDocument()
    );
  });

  it("hides 'Tout marquer' button when all are read", async () => {
    mockGet.mockResolvedValue({ data: [makeNotif({ isRead: true })] });
    renderPage();
    await waitFor(() => expect(screen.getByText("Lu")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Tout marquer/i })).not.toBeInTheDocument();
  });

  it("calls markAllNotificationsRead on 'Tout marquer comme lu'", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Tout marquer/i })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /Tout marquer/i }));
    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith("/notifications/read-all")
    );
  });

  // ── Row interaction ───────────────────────────────────────────────────────────

  it("clicking an unread row calls markNotificationRead", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Notification non lue")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Notification non lue").closest("tr")!);
    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith("/notifications/1/read")
    );
  });

  it("does not call markNotificationRead when row is already read", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Notification lue")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Notification lue").closest("tr")!);
    // PATCH must not be called for an already-read notification
    await waitFor(() => expect(mockPatch).not.toHaveBeenCalled());
  });

  // ── Detail dialog ─────────────────────────────────────────────────────────────

  it("clicking a row opens the detail dialog", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Notification non lue")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Notification non lue").closest("tr")!);
    await waitFor(() =>
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    );
  });

  it("dialog shows notification title and full body", async () => {
    mockGet.mockResolvedValue({
      data: [makeNotif({ id: 3, title: "Titre complet", body: "Corps du message complet ici.", isRead: false })],
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Titre complet")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Titre complet").closest("tr")!);
    const dialog = await screen.findByRole("dialog");
    // Body text may also appear in the table cell — query within the dialog
    expect(within(dialog).getByText("Corps du message complet ici.")).toBeInTheDocument();
  });

  it("dialog 'Fermer' button closes the dialog", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Notification non lue")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Notification non lue").closest("tr")!);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Fermer/i }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });

  it("dialog shows 'Ouvrir le lien' when targetUrl is set", async () => {
    mockGet.mockResolvedValue({
      data: [makeNotif({ id: 4, title: "Notif avec lien", targetUrl: "/hospital-admin/dashboard", isRead: false })],
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Notif avec lien")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Notif avec lien").closest("tr")!);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Ouvrir le lien/i })).toBeInTheDocument();
  });

  it("dialog does not show 'Ouvrir le lien' when targetUrl is null", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Notification non lue")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Notification non lue").closest("tr")!);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Ouvrir le lien/i })).not.toBeInTheDocument();
  });

  it("clicking 'Ouvrir le lien' closes dialog and navigates", async () => {
    mockGet.mockResolvedValue({
      data: [makeNotif({ id: 5, title: "Notif lien nav", targetUrl: "/hospital-admin/residents", isRead: true })],
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Notif lien nav")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Notif lien nav").closest("tr")!);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Ouvrir le lien/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/hospital-admin/residents"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  // ── Marquer non lu ────────────────────────────────────────────────────────────

  it("shows 'Marquer non lu' in dialog when notification is read", async () => {
    mockGet.mockResolvedValue({
      data: [makeNotif({ id: 6, title: "Notif déjà lue", isRead: true })],
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Notif déjà lue")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Notif déjà lue").closest("tr")!);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Marquer non lu/i })).toBeInTheDocument();
  });

  it("does not show 'Marquer non lu' in dialog when notification is unread", async () => {
    mockGet.mockResolvedValue({
      data: [makeNotif({ id: 7, title: "Notif non lue", isRead: false })],
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Notif non lue")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Notif non lue").closest("tr")!);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Marquer non lu/i })).not.toBeInTheDocument();
  });

  it("clicking 'Marquer non lu' calls markNotificationUnread API", async () => {
    mockGet.mockResolvedValue({
      data: [makeNotif({ id: 8, title: "Notif à dépointée", isRead: true })],
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Notif à dépointée")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Notif à dépointée").closest("tr")!);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Marquer non lu/i }));
    await waitFor(() =>
      expect(mockDelete).toHaveBeenCalledWith("/notifications/8/read")
    );
  });
});
