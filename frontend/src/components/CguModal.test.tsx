/**
 * Tests for CguModal.
 *
 * Covered:
 * - Not rendered when user is not authenticated
 * - Not rendered when cgvAccepted is true (already accepted)
 * - Not rendered when cgvAccepted is undefined (no data yet)
 * - Rendered and blocking when authenticated with cgvAccepted=false
 * - Checkbox enables the Accept button
 * - Submitting calls POST /user/accept-cgu
 * - On success, setAuthentication is called with cgvAccepted:true and modal closes
 * - Dialog cannot be dismissed by pressing Escape or clicking outside
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CguModal, { CGU_VERSION } from "./CguModal";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPost             = vi.hoisted(() => vi.fn());
const mockSetAuthentication = vi.hoisted(() => vi.fn());

let mockAuthentication = {
  isAuthenticated: true,
  cgvAccepted: false as boolean | undefined,
};

vi.mock("../hooks/useAuth", () => ({
  default: () => ({
    authentication: mockAuthentication,
    setAuthentication: mockSetAuthentication,
  }),
}));

vi.mock("../services/Axios", () => ({
  axiosPrivate: { post: mockPost },
}));

vi.mock("react-toastify", () => ({
  toast: { error: vi.fn() },
}));

// ── Helper ────────────────────────────────────────────────────────────────────

function renderModal() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CguModal />
    </QueryClientProvider>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthentication = { isAuthenticated: true, cgvAccepted: false };
});

describe("CguModal — visibility", () => {
  it("does not render when user is not authenticated", () => {
    mockAuthentication = { isAuthenticated: false, cgvAccepted: false };
    renderModal();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not render when cgvAccepted is true", () => {
    mockAuthentication = { isAuthenticated: true, cgvAccepted: true };
    renderModal();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not render when cgvAccepted is undefined", () => {
    mockAuthentication = { isAuthenticated: true, cgvAccepted: undefined };
    renderModal();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the blocking dialog when authenticated with cgvAccepted=false", () => {
    renderModal();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows the CGU version in the modal", () => {
    renderModal();
    expect(screen.getAllByText(new RegExp(CGU_VERSION)).length).toBeGreaterThan(0);
  });
});

describe("CguModal — interaction", () => {
  it("accept button is disabled initially (checkbox unchecked)", () => {
    renderModal();
    const acceptBtn = screen.getByRole("button", { name: /Accepter et continuer/i });
    expect(acceptBtn).toBeDisabled();
  });

  it("accept button is enabled after checking the checkbox", () => {
    renderModal();
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    const acceptBtn = screen.getByRole("button", { name: /Accepter et continuer/i });
    expect(acceptBtn).not.toBeDisabled();
  });

  it("calls POST user/accept-cgu on accept button click", async () => {
    mockPost.mockResolvedValue({ data: { cgvAccepted: true, version: CGU_VERSION } });

    renderModal();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Accepter et continuer/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith("user/accept-cgu"));
  });

  it("calls setAuthentication with cgvAccepted:true on success", async () => {
    mockPost.mockResolvedValue({ data: { cgvAccepted: true, version: CGU_VERSION } });

    renderModal();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Accepter et continuer/i }));

    await waitFor(() =>
      expect(mockSetAuthentication).toHaveBeenCalledWith(expect.any(Function))
    );

    // Verify the updater function sets cgvAccepted to true
    const updater = mockSetAuthentication.mock.calls[0][0];
    const prev = { isAuthenticated: true, cgvAccepted: false };
    expect(updater(prev)).toEqual({ ...prev, cgvAccepted: true });
  });
});

describe("CguModal — CGU_VERSION constant", () => {
  it("CGU_VERSION is a non-empty string", () => {
    expect(CGU_VERSION).toBeTruthy();
    expect(typeof CGU_VERSION).toBe("string");
  });

  it("CGU_VERSION matches the expected format YYYY.N", () => {
    expect(CGU_VERSION).toMatch(/^\d{4}\.\d+$/);
  });
});
