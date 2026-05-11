import { axiosPrivate } from "./Axios";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AuditEventType =
  | "rh_lock_applied"
  | "rh_lock_removed"
  | "export_generated"
  | "timesheet_created"
  | "timesheet_modified"
  | "timesheet_deleted"
  | "garde_created"
  | "garde_deleted"
  | "absence_created"
  | "absence_deleted"
  | "validation_accepted"
  | "validation_rejected"
  | "validation_blocked_by_lock"
  | "blocked_modification_attempt";

export type AuditActorType = "resident" | "manager" | "hospital_admin" | "app_admin" | "system";

export interface AuditEvent {
  id: number;
  eventType: AuditEventType;
  actorType: AuditActorType;
  actorId: number | null;
  month: number | null;
  calendarYear: number | null;
  yearResidentId: number | null;
  residentName: string | null;
  batchId: number | null;
  batchNumber: number | null;
  occurredAt: string;
  context: Record<string, unknown>;
}

export interface PaginatedAuditEvents {
  data: AuditEvent[];
  total: number;
  page: number;
  limit: number;
}

export interface MaccsAuditTimeline {
  yearResidentId: number;
  data: AuditEvent[];
}

export interface BatchAuditTimeline {
  batchId: number;
  data: AuditEvent[];
}

export interface AuditFilters {
  eventType?: AuditEventType | "";
  actorType?: AuditActorType | "";
  month?: number | "";
  calendarYear?: number | "";
  yearResidentId?: number | "";
  batchId?: number | "";
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

// ── API ───────────────────────────────────────────────────────────────────────

const listByYear = (yearId: number, filters: AuditFilters = {}): Promise<PaginatedAuditEvents> => {
  const params: Record<string, string | number> = {};
  if (filters.eventType)      params.eventType      = filters.eventType;
  if (filters.actorType)      params.actorType      = filters.actorType;
  if (filters.month)          params.month          = filters.month;
  if (filters.calendarYear)   params.calendarYear   = filters.calendarYear;
  if (filters.yearResidentId) params.yearResidentId = filters.yearResidentId;
  if (filters.batchId)        params.batchId        = filters.batchId;
  if (filters.from)           params.from           = filters.from;
  if (filters.to)             params.to             = filters.to;
  if (filters.page)           params.page           = filters.page;
  if (filters.limit)          params.limit          = filters.limit;

  return axiosPrivate
    .get(`hospital-admin/years/${yearId}/audit-events`, { params })
    .then((r) => r.data);
};

const listByMaccs = (yrId: number): Promise<MaccsAuditTimeline> =>
  axiosPrivate
    .get(`hospital-admin/staff-planner-items/${yrId}/audit`)
    .then((r) => r.data);

const listByBatch = (batchId: number): Promise<BatchAuditTimeline> =>
  axiosPrivate
    .get(`hospital-admin/export-batches/${batchId}/audit`)
    .then((r) => r.data);

// ── Labels ────────────────────────────────────────────────────────────────────

export const EVENT_TYPE_LABELS: Record<AuditEventType, string> = {
  rh_lock_applied:              "Clôture RH appliquée",
  rh_lock_removed:              "Clôture RH levée",
  export_generated:             "Export généré",
  timesheet_created:            "Horaire ajouté",
  timesheet_modified:           "Horaire modifié",
  timesheet_deleted:            "Horaire supprimé",
  garde_created:                "Garde ajoutée",
  garde_deleted:                "Garde supprimée",
  absence_created:              "Absence ajoutée",
  absence_deleted:              "Absence supprimée",
  validation_accepted:          "Validation MDS acceptée",
  validation_rejected:          "Validation MDS rejetée",
  validation_blocked_by_lock:   "Validation bloquée (clôture)",
  blocked_modification_attempt: "Modification bloquée (clôture)",
};

export const EVENT_TYPE_COLORS: Record<AuditEventType, "default" | "success" | "error" | "warning" | "info" | "primary"> = {
  rh_lock_applied:              "error",
  rh_lock_removed:              "success",
  export_generated:             "primary",
  timesheet_created:            "success",
  timesheet_modified:           "info",
  timesheet_deleted:            "error",
  garde_created:                "success",
  garde_deleted:                "error",
  absence_created:              "success",
  absence_deleted:              "error",
  validation_accepted:          "success",
  validation_rejected:          "warning",
  validation_blocked_by_lock:   "error",
  blocked_modification_attempt: "error",
};

export const ACTOR_TYPE_LABELS: Record<AuditActorType, string> = {
  resident:       "MACCS",
  manager:        "Manager",
  hospital_admin: "Admin hôpital",
  app_admin:      "Super Admin",
  system:         "Système",
};

const auditTimelineApi = { listByYear, listByMaccs, listByBatch };
export default auditTimelineApi;
