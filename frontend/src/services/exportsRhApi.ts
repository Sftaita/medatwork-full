import { axiosPrivate } from "./Axios";

// ── Types Staff Planner ───────────────────────────────────────────────────────

/** Un MACCS pour un mois donné — toujours présent même sans ResidentValidation */
export interface StaffPlannerItem {
  yearResidentId: number;
  /** true si une ResidentValidation existe pour ce MACCS × mois */
  hasResidentValidation: boolean;
  /** null si aucune ResidentValidation n'existe pour ce MACCS × mois */
  residentValidationId: number | null;
  residentId: number | null;
  residentFirstname: string | null;
  residentLastname: string | null;
  residentEmail: string | null;
  residentAvatarUrl: string | null;
  /** true uniquement si ResidentValidation.validated=true — informatif, ne bloque pas l'export */
  validatedByMds: boolean;
  treated: boolean;
  treatedAt: string | null;
  treatedByType: string | null;
  /** Nombre de fois que cet item a été inclus dans un export Staff Planner */
  downloadCount: number;
  /** Date du dernier export Staff Planner incluant cet item (null si jamais exporté) */
  lastGeneratedAt: string | null;
  // ── Phase 1 V2 — dirty flag ────────────────────────────────────────────────
  /** true si les données ont changé depuis le dernier export. false avant premier export. */
  dirtySinceExport: boolean;
  /** ISO date de la dernière modification post-export (null si pas dirty) */
  dirtyAt: string | null;
  /** ex: 'timesheet_added' | 'garde_modified' | 'absence_deleted' | 'validation_changed' */
  dirtyReason: string | null;
  /** SHA-256 des données au moment du dernier export (null avant premier export) */
  dataFingerprint: string | null;
}

export interface StaffPlannerMonthGroup {
  month: number;
  calendarYear: number;
  label: string;
  items: StaffPlannerItem[];
}

/** Clé unique d'un item : yearResidentId-month-calendarYear */
export function spItemKey(item: StaffPlannerItem, month: number, calendarYear: number): string {
  return `${item.yearResidentId}-${month}-${calendarYear}`;
}

export interface PatchItemTreatedResult {
  yearResidentId: number;
  month: number;
  calendarYear: number;
  treated: boolean;
  treatedAt: string | null;
  treatedByType: string | null;
  downloadCount: number;
  lastGeneratedAt: string | null;
}

export interface SpImportItem {
  yearResidentId: number;
  month: number;
  calendarYear: number;
}

// ── Staff Planner API ─────────────────────────────────────────────────────────

const listStaffPlannerMonths = (yearId: number): Promise<StaffPlannerMonthGroup[]> =>
  axiosPrivate
    .get(`hospital-admin/years/${yearId}/staff-planner-months`)
    .then((r) => r.data);

const setItemTreated = (
  yearResidentId: number,
  month: number,
  calendarYear: number,
  treated: boolean,
): Promise<PatchItemTreatedResult> =>
  axiosPrivate
    .patch(`hospital-admin/staff-planner-items/${yearResidentId}/${month}/${calendarYear}/treated`, { treated })
    .then((r) => r.data);

const generateStaffPlanner = (items: SpImportItem[]): Promise<Blob> =>
  axiosPrivate
    .post("managers/SPImport", { items }, { responseType: "blob" })
    .then((r) => r.data);

// ── Excel MACCS ───────────────────────────────────────────────────────────────

/**
 * Résidents d'une année — format simplifié retourné par l'endpoint backend.
 * L'endpoint /api/hospital-admin/years/{id}/residents retourne { id, firstname, lastname, email },
 * pas le format MaccsRow complet. On mappe explicitement pour éviter la confusion.
 */
export interface YearResident {
  id: number;           // Resident entity ID (utilisé pour l'URL ExcelGenerator)
  firstname: string;
  lastname: string;
  email: string;
}

const listYearResidents = (yearId: number): Promise<YearResident[]> =>
  axiosPrivate.get(`hospital-admin/years/${yearId}/residents`).then((r) => r.data);

const downloadResidentExcel = async (
  yearId: number,
  residentId: number,
  residentName: string,
): Promise<void> => {
  const response = await axiosPrivate.get(
    `managers/ExcelGenerator/${yearId}/${residentId}`,
    { responseType: "blob" },
  );
  const url = URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = `Horaire-${residentName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const exportsRhApi = {
  listStaffPlannerMonths,
  setItemTreated,
  generateStaffPlanner,
  listYearResidents,
  downloadResidentExcel,
};
export default exportsRhApi;
