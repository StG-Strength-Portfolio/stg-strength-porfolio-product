import { getDemoState } from "@/lib/demo-store";

const STORAGE_KEY = "strength_portfolio_sales_demo_v1";
const CHANGE_EVENT = "strength-portfolio-demo-changed";

type DemoStateWithCurrentClassShape = ReturnType<typeof getDemoState> & {
  classes: Array<ReturnType<typeof getDemoState>["classes"][number] & { teacher_id?: string }>;
};

/**
 * Keep the fictional demo seed compatible with the current production UI
 * without changing the production data model. This only rewrites sessionStorage.
 */
export function normalizeDemoStateForCurrentUi() {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  const state = getDemoState() as DemoStateWithCurrentClassShape;
  let changed = false;
  for (const klass of state.classes) {
    if (!klass.teacher_id) {
      klass.teacher_id = klass.teacherId;
      changed = true;
    }
  }
  if (changed) {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

if (typeof window !== "undefined") {
  window.addEventListener(CHANGE_EVENT, normalizeDemoStateForCurrentUi);
}
