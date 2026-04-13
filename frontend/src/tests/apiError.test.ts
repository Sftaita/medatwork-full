import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (must be hoisted before the import under test) ─────────────────────
vi.mock("react-toastify", () => ({ toast: { error: vi.fn() } }));
vi.mock("../services/logger", () => ({ default: { error: vi.fn() } }));
vi.mock("../doc/ToastParams", () => ({ toastError: { autoClose: 4000 } }));

import { toast } from "react-toastify";
import logger from "../services/logger";
import { handleApiError } from "../services/apiError";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAxiosError(message: string, status = 500): object {
  return {
    response: { status, data: { message } },
    isAxiosError: true,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("handleApiError — toast messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the server message when response.data.message is present", () => {
    const error = makeAxiosError("Identifiants incorrects", 401);
    handleApiError(error);
    expect(toast.error).toHaveBeenCalledWith("Identifiants incorrects", expect.anything());
  });

  it("shows the generic fallback message when no server message", () => {
    handleApiError(new Error("Network Error"));
    expect(toast.error).toHaveBeenCalledWith(
      "Oups ! Une erreur s'est produite.",
      expect.anything()
    );
  });

  it("shows the generic fallback when error has no response", () => {
    handleApiError({ isAxiosError: true });
    expect(toast.error).toHaveBeenCalledWith(
      "Oups ! Une erreur s'est produite.",
      expect.anything()
    );
  });

  it("shows the generic fallback for undefined", () => {
    handleApiError(undefined);
    expect(toast.error).toHaveBeenCalledWith(
      "Oups ! Une erreur s'est produite.",
      expect.anything()
    );
  });

  it("shows the generic fallback for a plain string", () => {
    handleApiError("something went wrong");
    expect(toast.error).toHaveBeenCalledWith(
      "Oups ! Une erreur s'est produite.",
      expect.anything()
    );
  });
});

describe("handleApiError — logger calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls logger.error exactly once per invocation", () => {
    handleApiError(new Error("boom"));
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it("passes an Error instance to logger.error when given an Error", () => {
    const err = new Error("original");
    handleApiError(err);
    expect(logger.error).toHaveBeenCalledWith(err);
  });

  it("wraps a non-Error value into an Error before passing to logger", () => {
    handleApiError("raw string error");
    const [logged] = (logger.error as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(logged).toBeInstanceOf(Error);
  });

  it("wraps null into an Error before passing to logger", () => {
    handleApiError(null);
    const [logged] = (logger.error as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(logged).toBeInstanceOf(Error);
  });
});
