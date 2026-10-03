import { TOTAL_SCREENS } from "@/lib/screens";
import { SaveIndicator } from "@/components/SaveIndicator";
import type { SaveState } from "@/hooks/use-autosave";
import { useT } from "@/lib/i18n";
import { useScreenSubPageNav } from "@/lib/screen-subpages";

export function ScreenChrome({
  n,
  saveState = "idle",
}: {
  n: number;
  displayName?: string | null;
  saveState?: SaveState;
}) {
  const t = useT();

  const subpages = useScreenSubPageNav();

  const displayedScreen =
    subpages.total > 1
      ? `${n}/${subpages.page + 1}`
      : n;

  return (
    <div className="no-print sticky top-14 z-10 flex items-center justify-end gap-3 border-b border-slate-200 bg-white px-4 py-2 text-xs text-slate-500">
      <span className="whitespace-nowrap font-mono">
        {t("app.screenOfTotal", {
          n: displayedScreen,
          total: TOTAL_SCREENS,
        })}
      </span>

      <span className="text-slate-300">•</span>

      <SaveIndicator state={saveState} />
    </div>
  );
}
