import { describe, it, expect } from "vitest";

/**
 * Unit tests for upsertPendingOp logic (pendingChange deduplication)
 *
 * The slot key is (yearWeekTemplateId, weekIntervalId).
 * Assigning someone new to a slot replaces the previous pending op for that slot.
 * Removing from a slot replaces any previous create.
 * Different slots are kept independently.
 */

interface PendingOp {
  method: "create" | "delete";
  residentId: number;
  yearWeekTemplateId: number;
  weekIntervalId: number;
}

function upsertPendingOp(prev: PendingOp[], newOp: PendingOp): PendingOp[] {
  const key = `${newOp.yearWeekTemplateId}-${newOp.weekIntervalId}`;
  const filtered = prev.filter(
    (op) => `${op.yearWeekTemplateId}-${op.weekIntervalId}` !== key
  );
  return [...filtered, newOp];
}

describe("upsertPendingOp (pendingChange deduplication)", () => {
  it("adds a new op when pendingChange is empty", () => {
    const op: PendingOp = { method: "create", residentId: 1, yearWeekTemplateId: 10, weekIntervalId: 5 };
    const result = upsertPendingOp([], op);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(op);
  });

  it("replaces a previous op for the same (template × interval) slot", () => {
    const initial: PendingOp = { method: "create", residentId: 1, yearWeekTemplateId: 10, weekIntervalId: 5 };
    const replacement: PendingOp = { method: "create", residentId: 2, yearWeekTemplateId: 10, weekIntervalId: 5 };

    const result = upsertPendingOp([initial], replacement);

    expect(result).toHaveLength(1);
    expect(result[0].residentId).toBe(2);
  });

  it("create then delete on same slot → only DELETE remains", () => {
    const create: PendingOp = { method: "create", residentId: 1, yearWeekTemplateId: 10, weekIntervalId: 5 };
    const del: PendingOp    = { method: "delete", residentId: 1, yearWeekTemplateId: 10, weekIntervalId: 5 };

    const after1 = upsertPendingOp([], create);
    const after2 = upsertPendingOp(after1, del);

    expect(after2).toHaveLength(1);
    expect(after2[0].method).toBe("delete");
  });

  it("delete then create on same slot → only CREATE remains", () => {
    const del: PendingOp    = { method: "delete", residentId: 1, yearWeekTemplateId: 10, weekIntervalId: 5 };
    const create: PendingOp = { method: "create", residentId: 2, yearWeekTemplateId: 10, weekIntervalId: 5 };

    const after1 = upsertPendingOp([], del);
    const after2 = upsertPendingOp(after1, create);

    expect(after2).toHaveLength(1);
    expect(after2[0].method).toBe("create");
    expect(after2[0].residentId).toBe(2);
  });

  it("ops for different slots are kept independently", () => {
    const op1: PendingOp = { method: "create", residentId: 1, yearWeekTemplateId: 10, weekIntervalId: 5 };
    const op2: PendingOp = { method: "create", residentId: 2, yearWeekTemplateId: 11, weekIntervalId: 5 };
    const op3: PendingOp = { method: "delete", residentId: 3, yearWeekTemplateId: 10, weekIntervalId: 6 };

    let result = upsertPendingOp([], op1);
    result = upsertPendingOp(result, op2);
    result = upsertPendingOp(result, op3);

    expect(result).toHaveLength(3);
  });

  it("moving a resident: DELETE old slot + CREATE new slot → 2 independent ops", () => {
    const delOld: PendingOp    = { method: "delete", residentId: 1, yearWeekTemplateId: 10, weekIntervalId: 5 };
    const createNew: PendingOp = { method: "create", residentId: 1, yearWeekTemplateId: 11, weekIntervalId: 5 };

    let result = upsertPendingOp([], delOld);
    result = upsertPendingOp(result, createNew);

    expect(result).toHaveLength(2);
    expect(result.find((op) => op.yearWeekTemplateId === 10)?.method).toBe("delete");
    expect(result.find((op) => op.yearWeekTemplateId === 11)?.method).toBe("create");
  });
});
