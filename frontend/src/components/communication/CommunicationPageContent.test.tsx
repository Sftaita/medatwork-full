/**
 * Tests for CommunicationPageContent (shared admin communication page).
 *
 * Covers:
 * - Shows skeleton rows while loading
 * - Renders message rows (type chip, title, scope, status, date)
 * - 'Actif' / 'Inactif' status chips rendered correctly
 * - 'Notification' / 'Modal' type chips rendered correctly
 * - Empty alert when no messages match the filter
 * - Filter toggles: Notifications, Modals, Actifs, Inactifs
 * - Opens create dialog on "Nouveau message" click
 * - Create dialog validates required fields (title + body)
 * - Toggle-active calls the toggleActive API
 * - Duplicate calls the duplicate API
 * - showHospital=true renders Hospital column
 * - showHospital=false hides Hospital column
 * - Scope label "Tous les utilisateurs" shown for scopeType=all
 * - Scope label shows role name for scopeType=role
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import CommunicationPageContent from "./CommunicationPageContent";
import type { CommunicationMessage } from "../../types/entities";
import type { ApiCall } from "../../services/api.types";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGet   = vi.fn();
const mockPost  = vi.fn().mockResolvedValue({ data: {} });
const mockPatch = vi.fn().mockResolvedValue({ data: {} });
const mockAxios = { get: mockGet, post: mockPost, patch: mockPatch };
vi.mock("../../hooks/useAxiosPrivate", () => ({ default: () => mockAxios }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeMsg = (override: Partial<CommunicationMessage> = {}): CommunicationMessage => ({
  id: 1,
  type: "notification",
  title: "Test notification",
  body: "Contenu",
  imageUrl: null,
  linkUrl: null,
  buttonLabel: null,
  targetUrl: null,
  scopeType: "all",
  targetRole: null,
  targetUserId: null,
  targetUserType: null,
  hospital: null,
  isActive: true,
  authorType: "super_admin",
  authorId: 1,
  readCount: 5,
  createdAt: "2026-04-05T10:00:00+00:00",
  ...override,
});

const MESSAGES: CommunicationMessage[] = [
  makeMsg({ id: 1, type: "notification", title: "Notif active",   isActive: true  }),
  makeMsg({ id: 2, type: "modal",        title: "Modal inactif",  isActive: false }),
];

// Minimal API set
function makeApi(overrides: Partial<Record<string, () => ApiCall>> = {}) {
  return {
    list:         vi.fn((): ApiCall => ({ method: "get",   url: "/comm"            })),
    create:       vi.fn((): ApiCall => ({ method: "post",  url: "/comm"            })),
    toggleActive: vi.fn((id: number): ApiCall => ({ method: "patch", url: `/comm/${id}/toggle-active` })),
    duplicate:    vi.fn((id: number): ApiCall => ({ method: "post",  url: `/comm/${id}/duplicate`     })),
    listUsers:    vi.fn((): ApiCall => ({ method: "get",   url: "/comm/users"      })),
    ...overrides,
  };
}

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderContent(api = makeApi(), showHospital = false, key = ["test-comm"] as const) {
  return render(
    <QueryClientProvider client={makeQc()}>
      <MemoryRouter>
        <CommunicationPageContent queryKey={key} api={api} showHospital={showHospital} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue({ data: MESSAGES });
  mockPost.mockResolvedValue({ data: makeMsg() });
  mockPatch.mockResolvedValue({ data: makeMsg() });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("CommunicationPageContent", () => {
  // ── Loading ──────────────────────────────────────────────────────────────────

  it("shows skeleton rows while fetching", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    renderContent();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.queryByText("Notif active")).not.toBeInTheDocument();
  });

  // ── Rendering ────────────────────────────────────────────────────────────────

  it("renders message titles after load", async () => {
    renderContent();
    await waitFor(() => expect(screen.getByText("Notif active")).toBeInTheDocument());
    expect(screen.getByText("Modal inactif")).toBeInTheDocument();
  });

  it("shows 'Notification' chip for notification type", async () => {
    renderContent();
    await waitFor(() => expect(screen.getByText("Notification")).toBeInTheDocument());
  });

  it("shows 'Modal' chip for modal type", async () => {
    renderContent();
    await waitFor(() => expect(screen.getByText("Modal")).toBeInTheDocument());
  });

  it("shows 'Actif' and 'Inactif' status chips", async () => {
    renderContent();
    await waitFor(() => expect(screen.getByText("Actif")).toBeInTheDocument());
    expect(screen.getByText("Inactif")).toBeInTheDocument();
  });

  it("shows scope 'Tous les utilisateurs' for scopeType=all", async () => {
    renderContent();
    await waitFor(() =>
      expect(screen.getAllByText("Tous les utilisateurs").length).toBeGreaterThan(0)
    );
  });

  it("shows role label for scopeType=role", async () => {
    mockGet.mockResolvedValue({
      data: [makeMsg({ scopeType: "role", targetRole: "resident" })],
    });
    renderContent();
    await waitFor(() => expect(screen.getByText("MACCS")).toBeInTheDocument());
  });

  // ── Hospital column ───────────────────────────────────────────────────────────

  it("shows Hospital column when showHospital=true", async () => {
    renderContent(makeApi(), true);
    await waitFor(() => expect(screen.getByText("Hôpital")).toBeInTheDocument());
  });

  it("hides Hospital column when showHospital=false", async () => {
    renderContent(makeApi(), false);
    await waitFor(() => expect(screen.getByText("Notif active")).toBeInTheDocument());
    expect(screen.queryByText("Hôpital")).not.toBeInTheDocument();
  });

  // ── Filter toggles ────────────────────────────────────────────────────────────

  it("'Notifications' filter shows only notifications", async () => {
    renderContent();
    await waitFor(() => expect(screen.getByText("Notif active")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /^Notifications$/ }));
    expect(screen.getByText("Notif active")).toBeInTheDocument();
    expect(screen.queryByText("Modal inactif")).not.toBeInTheDocument();
  });

  it("'Modals' filter shows only modals", async () => {
    renderContent();
    await waitFor(() => expect(screen.getByText("Modal inactif")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /^Modals$/ }));
    expect(screen.getByText("Modal inactif")).toBeInTheDocument();
    expect(screen.queryByText("Notif active")).not.toBeInTheDocument();
  });

  it("'Actifs' filter shows only active messages", async () => {
    renderContent();
    await waitFor(() => expect(screen.getByText("Notif active")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /^Actifs$/ }));
    expect(screen.getByText("Notif active")).toBeInTheDocument();
    expect(screen.queryByText("Modal inactif")).not.toBeInTheDocument();
  });

  it("'Inactifs' filter shows only inactive messages", async () => {
    renderContent();
    await waitFor(() => expect(screen.getByText("Modal inactif")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /^Inactifs$/ }));
    expect(screen.getByText("Modal inactif")).toBeInTheDocument();
    expect(screen.queryByText("Notif active")).not.toBeInTheDocument();
  });

  it("shows empty alert when filter matches nothing", async () => {
    mockGet.mockResolvedValue({ data: [makeMsg({ isActive: true })] });
    renderContent();
    await waitFor(() => expect(screen.getByText("Test notification")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /^Inactifs$/ }));
    await waitFor(() =>
      expect(screen.getByText("Aucun message dans cette catégorie.")).toBeInTheDocument()
    );
  });

  // ── Create dialog ─────────────────────────────────────────────────────────────

  it("opens create dialog on 'Nouveau message' click", async () => {
    renderContent();
    await waitFor(() => expect(screen.getByText("Notif active")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Nouveau message/i }));
    await waitFor(() =>
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    );
  });

  it("create dialog has Title and Contenu fields", async () => {
    renderContent();
    await waitFor(() => expect(screen.getByText("Notif active")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Nouveau message/i }));
    await waitFor(() => expect(screen.getByLabelText(/Titre/)).toBeInTheDocument());
    expect(screen.getByLabelText(/Contenu/)).toBeInTheDocument();
  });

  it("does not submit when title is empty", async () => {
    renderContent();
    await waitFor(() => expect(screen.getByText("Notif active")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Nouveau message/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Créer" }));
    expect(mockPost).not.toHaveBeenCalled();
  });

  // ── Toggle active ─────────────────────────────────────────────────────────────

  it("calls toggleActive API when power button is clicked", async () => {
    const api = makeApi();
    renderContent(api);
    await waitFor(() => expect(screen.getByText("Notif active")).toBeInTheDocument());
    // Click the first power button (message id=1)
    const powerButtons = screen.getAllByTestId("PowerSettingsNewIcon");
    fireEvent.click(powerButtons[0].closest("button")!);
    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith("/comm/1/toggle-active")
    );
  });

  // ── Duplicate ─────────────────────────────────────────────────────────────────

  it("calls duplicate API when copy button is clicked", async () => {
    const api = makeApi();
    renderContent(api);
    await waitFor(() => expect(screen.getByText("Notif active")).toBeInTheDocument());
    const copyButtons = screen.getAllByTestId("ContentCopyIcon");
    fireEvent.click(copyButtons[0].closest("button")!);
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/comm/1/duplicate")
    );
  });
});
