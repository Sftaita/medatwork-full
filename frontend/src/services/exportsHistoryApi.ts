import { axiosPrivate } from "./Axios";

// ── Types Phase 3 — Historique exports ───────────────────────────────────────

export interface ExportBatch {
  id: number;
  yearId: number;
  batchNumber: number;
  generatedAt: string;   // ISO 8601
  generatedByType: string; // 'manager' | 'hospital_admin' | 'app_admin' | 'system'
  generatedById: number | null;
  itemCount: number;
  fileHash: string;      // SHA-256, 64 chars
  fileSizeBytes: number;
  notes: string | null;
  createdAt: string;
}

/** Snapshot summary — payloadLines intentionally excluded (use detail endpoint) */
export interface ExportSnapshotSummary {
  id: number;
  yearResidentId: number;
  residentFirstname: string | null;
  residentLastname: string | null;
  month: number;
  calendarYear: number;
  dataFingerprint: string;    // SHA-256, 64 chars
  validatedByMdsAtExport: boolean;
  timesheetCount: number;
  gardeHospitalCount: number;
  absenceCount: number;
  totalMinutes: number;
  workerHRIDAtExport: string | null;
  sectionHRIDAtExport: string | null;
  createdAt: string;
}

/** Snapshot detail — includes payloadLines */
export interface ExportSnapshotDetail extends ExportSnapshotSummary {
  payloadLines: string;
  batchId: number;
  batchNumber: number;
}

export interface PaginatedBatches {
  data: ExportBatch[];
  total: number;
  page: number;
  limit: number;
}

export interface BatchSnapshots {
  data: ExportSnapshotSummary[];
  total: number;
}

export interface BatchListFilters {
  page?: number;
  limit?: number;
  batchNumber?: number;
  generatedByType?: string;
  from?: string;  // Y-m-d
  to?: string;    // Y-m-d
}

// ── API calls ─────────────────────────────────────────────────────────────────

const listBatches = (yearId: number, filters: BatchListFilters = {}): Promise<PaginatedBatches> => {
  const params = new URLSearchParams();
  if (filters.page)            params.set("page",            String(filters.page));
  if (filters.limit)           params.set("limit",           String(filters.limit));
  if (filters.batchNumber)     params.set("batchNumber",     String(filters.batchNumber));
  if (filters.generatedByType) params.set("generatedByType", filters.generatedByType);
  if (filters.from)            params.set("from",            filters.from);
  if (filters.to)              params.set("to",              filters.to);

  return axiosPrivate
    .get(`hospital-admin/years/${yearId}/export-batches?${params.toString()}`)
    .then((r) => r.data);
};

const getBatch = (batchId: number): Promise<ExportBatch> =>
  axiosPrivate
    .get(`hospital-admin/export-batches/${batchId}`)
    .then((r) => r.data);

const listSnapshots = (batchId: number): Promise<BatchSnapshots> =>
  axiosPrivate
    .get(`hospital-admin/export-batches/${batchId}/snapshots`)
    .then((r) => r.data);

const getSnapshotDetail = (snapshotId: number): Promise<ExportSnapshotDetail> =>
  axiosPrivate
    .get(`hospital-admin/export-snapshots/${snapshotId}`)
    .then((r) => r.data);

// ── Types Phase 4 — Diff Viewer ───────────────────────────────────────────────

export interface DiffLine {
  workerHRID: string;
  sectionHRID: string;
  date: string;
  code: string;
  start: number;
  end: number;
  duration: number;
  lunch: number;
  raw: string;
}

export interface DiffModifiedLine {
  from: DiffLine;
  to: DiffLine;
}

export interface DiffEntry {
  yearResidentId: number;
  residentFirstname: string | null;
  residentLastname: string | null;
  month: number;
  calendarYear: number;
  /** 'added' | 'removed' | 'modified' | 'unchanged' */
  status: string;
  fingerprintChanged: boolean;
  validationChanged: boolean;
  hridChanged: boolean;
  snapshotA: ExportSnapshotSummary | null;
  snapshotB: ExportSnapshotSummary | null;
  diff: {
    added: DiffLine[];
    removed: DiffLine[];
    modified: DiffModifiedLine[];
  };
}

export interface DiffResult {
  batchA: Pick<ExportBatch, "id" | "batchNumber" | "generatedAt" | "generatedByType" | "generatedById" | "itemCount" | "fileHash">;
  batchB: Pick<ExportBatch, "id" | "batchNumber" | "generatedAt" | "generatedByType" | "generatedById" | "itemCount" | "fileHash">;
  identical: boolean;
  summary: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
    validationChanged: number;
  };
  items: DiffEntry[];
}

export interface DiffCandidate {
  id: number;
  batchNumber: number;
  generatedAt: string;
  generatedByType: string;
  itemCount: number;
}

// ── Diff API calls ────────────────────────────────────────────────────────────

const listDiffCandidates = (yearId: number): Promise<DiffCandidate[]> =>
  axiosPrivate
    .get(`hospital-admin/years/${yearId}/compare-candidates`)
    .then((r) => r.data);

export interface DiffOptions {
  changedOnly?: boolean;
  yearResidentId?: number;
  month?: number;
  calendarYear?: number;
}

const getDiff = (batchAId: number, batchBId: number, opts: DiffOptions = {}): Promise<DiffResult> => {
  const params = new URLSearchParams();
  if (opts.changedOnly)    params.set("changedOnly",    "true");
  if (opts.yearResidentId) params.set("yearResidentId", String(opts.yearResidentId));
  if (opts.month)          params.set("month",          String(opts.month));
  if (opts.calendarYear)   params.set("calendarYear",   String(opts.calendarYear));
  const q = params.toString();
  return axiosPrivate
    .get(`hospital-admin/export-batches/${batchAId}/diff/${batchBId}${q ? `?${q}` : ""}`)
    .then((r) => r.data);
};

const exportsHistoryApi = {
  listBatches,
  getBatch,
  listSnapshots,
  getSnapshotDetail,
  listDiffCandidates,
  getDiff,
};

export default exportsHistoryApi;
