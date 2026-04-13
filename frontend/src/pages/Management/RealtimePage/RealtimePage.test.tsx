import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RealTimePage from "./RealtimePage";

// ── Mocks ──────────────────────────────────────────────────────────────────────

// vi.hoisted ensures these are available when vi.mock factories run (which are
// hoisted to the top of the file by Vitest's transform).
const mockGet = vi.hoisted(() => vi.fn());

// IMPORTANT: return the SAME axios object on every hook call.
// If we return a new object each time (`() => ({ get: mockGet })`), the reference
// changes on every render, causing useEffect([axiosPrivate]) to re-run repeatedly
// and consuming all mockResolvedValueOnce entries — leading to undefined state.
const stableAxios = vi.hoisted(() => ({ get: mockGet }));

vi.mock("../../../hooks/useAxiosPrivate", () => ({
  default: () => stableAxios,
}));

vi.mock("../../../hooks/useAuth", () => ({
  default: () => ({ authentication: { AccessToken: "fake-token" } }),
}));
vi.mock("../../../hooks/useRefreshToken", () => ({
  default: () => vi.fn(),
}));

// GraphCard uses recharts + ResizeObserver — stub to avoid jsdom errors
vi.mock("./components/GraphCard", () => ({
  default: () => <div data-testid="graph-card" />,
}));

// TimeCard → StatisticCard uses theme.palette.purple (custom palette extension)
// which is undefined in jsdom without the app ThemeProvider. Stub to keep tests
// focused on page-level orchestration.
vi.mock("./components/TimeCard", () => ({
  default: ({ timesheets }: { timesheets: { firstname: string; lastname: string }[] }) => (
    <div data-testid="time-card">
      {timesheets.map((t, i) => (
        <span key={i}>{t.firstname + " " + t.lastname}</span>
      ))}
    </div>
  ),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────────

const TODAY = new Date();
const CURRENT_MONTH = TODAY.getMonth() + 1;

const makeFirstloadResponse = (timesheets: unknown[]) => ({
  data: {
    years: [
      { yearId: 1, title: "2025 – 2026" },
      { yearId: 2, title: "2024 – 2025" },
    ],
    statistics: timesheets,
  },
});

const makeTimesheet = (id: number) => ({
  id,
  firstname: `Resident${id}`,
  lastname: `Test${id}`,
  totalHours: 160,
  hardHours: 20,
  veryHardHours: 5,
  callableGardeNb: 3,
  hospitalGardeNb: 8,
  monthNbOfAbsences: 1,
  scheduledMonth: 150,
  week: { 1: 40, 2: 40, 3: 40, 4: 40 },
  scheduledWeek: { 1: 38, 2: 38, 3: 38, 4: 36 },
  absences: {
    YearTotalAbsenceDay: 1,
    yearLegalLeaves: 1,
    yearScientificLeaves: 0,
    yearPaternityLeaves: 0,
    yearMaternityLeaves: 0,
    yearUnpaidLeaves: 0,
    yearScheduledAbsences: {
      totalScheduledLeaves: 28,
      legalLeaves: 25,
      scientificLeaves: 3,
      paternityLeave: 0,
      maternityLeave: 0,
      unpaidLeave: 0,
    },
  },
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("RealTimePage", () => {
  beforeEach(() => {
    // resetAllMocks clears both call history AND mock implementations (mockReturnValue
    // etc.), preventing leakage between tests.
    vi.resetAllMocks();
    // Clear localStorage so saved.currentYear from a previous test does not cause
    // an extra getStatisticsByYear call on mount (would make call counts unpredictable).
    localStorage.clear();
  });

  it("shows a loading spinner on first render", () => {
    mockGet.mockReturnValue(new Promise(() => {})); // never resolves → keeps loading=true
    render(<RealTimePage />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders year selector and month button after data loads", async () => {
    mockGet.mockResolvedValueOnce(makeFirstloadResponse([makeTimesheet(1)]));
    render(<RealTimePage />);

    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());

    expect(screen.getByRole("combobox")).toBeInTheDocument();

    // Month button contains a 4-digit year
    const monthButton = screen
      .getAllByRole("button")
      .find((b) => /\d{4}/.test(b.textContent ?? ""));
    expect(monthButton).toBeDefined();
  });

  it("renders TimeCard residents when timesheets are returned", async () => {
    mockGet.mockResolvedValueOnce(makeFirstloadResponse([makeTimesheet(1), makeTimesheet(2)]));
    render(<RealTimePage />);

    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());

    expect(screen.getByText("Resident1 Test1")).toBeInTheDocument();
    expect(screen.getByText("Resident2 Test2")).toBeInTheDocument();
  });

  it("shows info alert when timesheets array is empty", async () => {
    mockGet.mockResolvedValueOnce(makeFirstloadResponse([]));
    render(<RealTimePage />);

    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/Aucun MACCS/i)).toBeInTheDocument();
  });

  it("firstload URL contains only the month, not month+year concatenated (regression)", async () => {
    mockGet.mockResolvedValueOnce(makeFirstloadResponse([]));
    render(<RealTimePage />);

    await waitFor(() => expect(mockGet).toHaveBeenCalledOnce());

    const [url] = mockGet.mock.calls[0] as [string];
    expect(url).toMatch(new RegExp(`managers/statisticsFirstload/${CURRENT_MONTH}$`));
    expect(url).not.toMatch(/\d{5,}/); // no 5+ digit run like "32026"
  });

  it("statistics URL uses month/yearId format, not month+year concatenated (regression)", async () => {
    mockGet
      .mockResolvedValueOnce(makeFirstloadResponse([makeTimesheet(1)])) // firstload
      .mockResolvedValueOnce({ data: [] }); // year select

    render(<RealTimePage />);
    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());

    // Open the MUI Select with mouseDown (recommended pattern for jsdom)
    fireEvent.mouseDown(screen.getByRole("combobox"));
    const option = await screen.findByRole("option", { name: "2024 – 2025" });
    fireEvent.click(option);

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));

    const [url] = mockGet.mock.calls[1] as [string];
    // Must be "managers/statistics/<month>/<yearId>" — e.g. "managers/statistics/3/2"
    expect(url).toMatch(new RegExp(`managers/statistics/${CURRENT_MONTH}/2$`));
    expect(url).not.toMatch(/\d{5,}/);
  });
});

describe("RealtimePage — Dialog", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("opens the month/year dialog when the month button is clicked", async () => {
    mockGet.mockResolvedValueOnce(makeFirstloadResponse([makeTimesheet(1)]));
    render(<RealTimePage />);
    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());

    const monthButton = screen
      .getAllByRole("button")
      .find((b) => /\d{4}/.test(b.textContent ?? ""));
    await userEvent.click(monthButton!);

    expect(screen.getByText("Dates recherchées")).toBeInTheDocument();
    expect(screen.getByText("Annuler")).toBeInTheDocument();
    expect(screen.getByText("Valider")).toBeInTheDocument();
  });

  it("closes the dialog when Annuler is clicked", async () => {
    mockGet.mockResolvedValueOnce(makeFirstloadResponse([makeTimesheet(1)]));
    render(<RealTimePage />);
    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());

    const monthButton = screen
      .getAllByRole("button")
      .find((b) => /\d{4}/.test(b.textContent ?? ""));
    await userEvent.click(monthButton!);
    await userEvent.click(screen.getByText("Annuler"));

    await waitFor(() => expect(screen.queryByText("Dates recherchées")).not.toBeInTheDocument());
  });

  it("triggers an additional API call when Valider is clicked", async () => {
    mockGet
      .mockResolvedValueOnce(makeFirstloadResponse([makeTimesheet(1)])) // firstload
      .mockResolvedValue({ data: [makeTimesheet(1)] }); // Valider + any extra

    render(<RealTimePage />);
    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());

    const callsAfterLoad = mockGet.mock.calls.length;

    const monthButton = screen
      .getAllByRole("button")
      .find((b) => /\d{4}/.test(b.textContent ?? ""));
    await userEvent.click(monthButton!);
    await userEvent.click(screen.getByText("Valider"));

    await waitFor(() => expect(mockGet.mock.calls.length).toBeGreaterThan(callsAfterLoad));
  });
});
