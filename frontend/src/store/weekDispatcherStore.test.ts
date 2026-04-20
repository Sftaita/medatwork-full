import { describe, it, expect, beforeEach } from "vitest";
import { useWeekDispatcherStore } from "./weekDispatcherStore";

/**
 * Unit tests for weekDispatcherStore
 *
 * Covers:
 * - setAssignments accepts a plain object (initial load path)
 * - setAssignments accepts a functional updater (edit / remove path)
 * - setPendingChange accepts a plain array
 * - setPendingChange accepts a functional updater (accumulate changes)
 * - setYearWeekTemplates accepts a functional updater
 * - Functional updater correctly reads previous state (no stale closure bug)
 */
describe("weekDispatcherStore", () => {
  beforeEach(() => {
    useWeekDispatcherStore.setState({
      assignments: {},
      pendingChange: [],
      yearWeekTemplates: [],
    });
  });

  // ── setAssignments ──────────────────────────────────────────────────────────

  it("setAssignments — sets a plain object directly", () => {
    const value = { 1: { 10: { residentId: 5, firstname: "Alice" } } };
    useWeekDispatcherStore.getState().setAssignments(value);

    expect(useWeekDispatcherStore.getState().assignments).toEqual(value);
  });

  it("setAssignments — functional updater receives previous state and returns new state", () => {
    const initial = { 1: { 10: { residentId: 5, firstname: "Alice" } } };
    useWeekDispatcherStore.setState({ assignments: initial });

    useWeekDispatcherStore.getState().setAssignments((prev) => ({
      ...prev,
      1: { ...(prev[1] as object), 20: { residentId: 7, firstname: "Bob" } },
    }));

    const result = useWeekDispatcherStore.getState().assignments;
    expect((result[1] as any)[10]).toEqual({ residentId: 5, firstname: "Alice" });
    expect((result[1] as any)[20]).toEqual({ residentId: 7, firstname: "Bob" });
  });

  it("setAssignments — functional updater does NOT store the function as the value", () => {
    useWeekDispatcherStore.getState().setAssignments(() => ({ 99: {} }));

    const stored = useWeekDispatcherStore.getState().assignments;
    expect(typeof stored).toBe("object");
    expect(typeof stored).not.toBe("function");
  });

  it("setAssignments — functional updater can nullify a slot (remove assignment)", () => {
    useWeekDispatcherStore.setState({
      assignments: { 1: { 10: { residentId: 5, firstname: "Alice" } } },
    });

    useWeekDispatcherStore.getState().setAssignments((prev) => ({
      ...prev,
      1: { ...(prev[1] as object), 10: null },
    }));

    expect((useWeekDispatcherStore.getState().assignments[1] as any)[10]).toBeNull();
  });

  // ── setPendingChange ────────────────────────────────────────────────────────

  it("setPendingChange — sets a plain array directly", () => {
    const changes = [{ method: "create", residentId: 1 }];
    useWeekDispatcherStore.getState().setPendingChange(changes);

    expect(useWeekDispatcherStore.getState().pendingChange).toEqual(changes);
  });

  it("setPendingChange — functional updater accumulates changes", () => {
    useWeekDispatcherStore.setState({
      pendingChange: [{ method: "create", residentId: 1 }],
    });

    useWeekDispatcherStore.getState().setPendingChange((prev) => [
      ...prev,
      { method: "delete", residentId: 2 },
    ]);

    expect(useWeekDispatcherStore.getState().pendingChange).toHaveLength(2);
    expect((useWeekDispatcherStore.getState().pendingChange[1] as any).method).toBe("delete");
  });

  it("setPendingChange — functional updater does NOT store the function as the value", () => {
    useWeekDispatcherStore.getState().setPendingChange(() => [{ method: "create" }]);

    const stored = useWeekDispatcherStore.getState().pendingChange;
    expect(Array.isArray(stored)).toBe(true);
  });

  it("setPendingChange — can reset to empty array (save path)", () => {
    useWeekDispatcherStore.setState({ pendingChange: [{ method: "create" }] });

    useWeekDispatcherStore.getState().setPendingChange([]);

    expect(useWeekDispatcherStore.getState().pendingChange).toHaveLength(0);
  });

  // ── setYearWeekTemplates ────────────────────────────────────────────────────

  it("setYearWeekTemplates — functional updater appends new templates", () => {
    useWeekDispatcherStore.setState({
      yearWeekTemplates: [{ id: 1, title: "Semaine A" }],
    });

    useWeekDispatcherStore.getState().setYearWeekTemplates((prev) => [
      ...prev,
      { id: 2, title: "Semaine B" },
    ]);

    expect(useWeekDispatcherStore.getState().yearWeekTemplates).toHaveLength(2);
    expect(useWeekDispatcherStore.getState().yearWeekTemplates[1].title).toBe("Semaine B");
  });
});
