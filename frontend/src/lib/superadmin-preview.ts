export type SuperAdminPreviewMode = "student" | "teacher" | "principal";

const MODE_KEY = "sa_preview_mode";
const SCHOOL_KEY = "sa_preview_school_id";
const TEACHER_KEY = "sa_preview_teacher_id";

export interface SuperAdminPreviewState {
  mode: SuperAdminPreviewMode | null;
  schoolId: string | null;
  teacherId: string | null;
}

export function getSuperAdminPreview(): SuperAdminPreviewState {
  if (typeof window === "undefined") return { mode: null, schoolId: null, teacherId: null };
  const raw = window.sessionStorage.getItem(MODE_KEY);
  const mode: SuperAdminPreviewMode | null =
    raw === "student" || raw === "teacher" || raw === "principal" ? raw : null;
  return {
    mode,
    schoolId: window.sessionStorage.getItem(SCHOOL_KEY),
    teacherId: window.sessionStorage.getItem(TEACHER_KEY),
  };
}

export function setSuperAdminPreview(
  mode: SuperAdminPreviewMode,
  target?: { schoolId?: string | null; teacherId?: string | null },
) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(MODE_KEY, mode);
  if (target?.schoolId) window.sessionStorage.setItem(SCHOOL_KEY, target.schoolId);
  if (target?.teacherId) window.sessionStorage.setItem(TEACHER_KEY, target.teacherId);
}

export function clearSuperAdminPreview() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(MODE_KEY);
  window.sessionStorage.removeItem(SCHOOL_KEY);
  window.sessionStorage.removeItem(TEACHER_KEY);
}

export function isSuperAdminPreview(mode?: SuperAdminPreviewMode): boolean {
  const current = getSuperAdminPreview().mode;
  return mode ? current === mode : current !== null;
}
