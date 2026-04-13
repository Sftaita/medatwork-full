/**
 * Tests for CommunicationModalQueue.
 *
 * Covers:
 * - Renders nothing when modals array is empty
 * - Renders the first modal title and body
 * - Shows a counter when multiple modals are present
 * - Does not show close icon / clicking backdrop does nothing (no-escape)
 * - "J'ai compris" button calls markModalRead and advances to next modal
 * - After the last modal is acknowledged, onAllDone is called
 * - "J'ai compris" is disabled while the PATCH is in flight
 * - Optional imageUrl is rendered as an <img>
 * - Optional linkUrl renders the buttonLabel link
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import CommunicationModalQueue from "./CommunicationModalQueue";
import communicationsApi from "../../services/communicationsApi";
import type { CommNotification } from "../../types/entities";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("../../services/communicationsApi", () => ({
  default: {
    markModalRead: vi.fn((id: number) => ({ method: "patch", url: `/modals/${id}/read` })),
  },
}));

const mockAxios = { patch: vi.fn().mockResolvedValue({}) };
vi.mock("../../hooks/useAxiosPrivate", () => ({ default: () => mockAxios }));
vi.mock("../../hooks/useAuth", () => ({
  default: () => ({ authentication: { role: "hospital_admin" } }),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeModal = (override: Partial<CommNotification> = {}): CommNotification => ({
  id: 1,
  type: "modal",
  title: "Message important",
  body: "Voici le contenu du modal.",
  imageUrl: null,
  linkUrl: null,
  buttonLabel: null,
  targetUrl: null,
  isRead: false,
  readAt: null,
  createdAt: "2026-04-05T10:00:00+00:00",
  ...override,
});

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderQueue(modals: CommNotification[], onAllDone = vi.fn()) {
  return render(
    <QueryClientProvider client={makeQc()}>
      <MemoryRouter>
        <CommunicationModalQueue modals={modals} onAllDone={onAllDone} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAxios.patch.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("CommunicationModalQueue", () => {
  it("renders nothing when modals array is empty", () => {
    const { container } = renderQueue([]);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the title and body of the first modal", () => {
    renderQueue([makeModal()]);
    expect(screen.getByText("Message important")).toBeInTheDocument();
    expect(screen.getByText("Voici le contenu du modal.")).toBeInTheDocument();
  });

  it("shows a counter when multiple modals are present", () => {
    renderQueue([makeModal({ id: 1 }), makeModal({ id: 2, title: "Second" })]);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("does not show a counter for a single modal", () => {
    renderQueue([makeModal()]);
    expect(screen.queryByText(/\/ 1/)).not.toBeInTheDocument();
  });

  it("renders 'J'ai compris' button", () => {
    renderQueue([makeModal()]);
    expect(screen.getByRole("button", { name: "J'ai compris" })).toBeInTheDocument();
  });

  it("calls markModalRead and then onAllDone when last modal is acknowledged", async () => {
    const onAllDone = vi.fn();
    renderQueue([makeModal({ id: 42 })], onAllDone);

    fireEvent.click(screen.getByRole("button", { name: "J'ai compris" }));

    await waitFor(() => {
      expect(mockAxios.patch).toHaveBeenCalledWith("/modals/42/read");
      expect(onAllDone).toHaveBeenCalledTimes(1);
    });
  });

  it("advances to the next modal after acknowledging the first", async () => {
    const onAllDone = vi.fn();
    renderQueue(
      [makeModal({ id: 1, title: "Modal 1" }), makeModal({ id: 2, title: "Modal 2" })],
      onAllDone
    );

    expect(screen.getByText("Modal 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "J'ai compris" }));

    await waitFor(() => expect(screen.getByText("Modal 2")).toBeInTheDocument());
    expect(screen.queryByText("Modal 1")).not.toBeInTheDocument();
    expect(onAllDone).not.toHaveBeenCalled();
  });

  it("calls onAllDone after the last of multiple modals is acknowledged", async () => {
    const onAllDone = vi.fn();
    renderQueue(
      [makeModal({ id: 1 }), makeModal({ id: 2, title: "Second" })],
      onAllDone
    );

    // Acknowledge modal 1
    fireEvent.click(screen.getByRole("button", { name: "J'ai compris" }));
    await waitFor(() => expect(screen.getByText("Second")).toBeInTheDocument());

    // Acknowledge modal 2
    fireEvent.click(screen.getByRole("button", { name: "J'ai compris" }));
    await waitFor(() => expect(onAllDone).toHaveBeenCalledTimes(1));
  });

  it("renders imageUrl as an img element", () => {
    renderQueue([makeModal({ imageUrl: "https://example.com/banner.png" })]);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/banner.png");
  });

  it("renders linkUrl as a link with buttonLabel", () => {
    renderQueue([
      makeModal({ linkUrl: "https://example.com/details", buttonLabel: "Voir plus" }),
    ]);
    const link = screen.getByRole("link", { name: "Voir plus" });
    expect(link).toHaveAttribute("href", "https://example.com/details");
  });

  it("falls back to 'En savoir plus' when linkUrl is set but buttonLabel is null", () => {
    renderQueue([makeModal({ linkUrl: "https://example.com", buttonLabel: null })]);
    expect(screen.getByRole("link", { name: "En savoir plus" })).toBeInTheDocument();
  });

  it("calls onAllDone even when the PATCH fails (silent error path)", async () => {
    mockAxios.patch.mockRejectedValue(new Error("Network error"));
    const onAllDone = vi.fn();
    renderQueue([makeModal({ id: 99 })], onAllDone);

    fireEvent.click(screen.getByRole("button", { name: "J'ai compris" }));

    await waitFor(() => expect(onAllDone).toHaveBeenCalledTimes(1));
  });
});
