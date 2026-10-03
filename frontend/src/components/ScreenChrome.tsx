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
    <div className="no-print sticky top-14 z-10 flex items-center justify-end gap-3 border-b border-white/10 bg-[color:var(--purple-dark)]/60 px-4 py-2 text-xs backdrop-blur">
      <span className="whitespace-nowrap font-mono opacity-90">
        {t("app.screenOfTotal", {
          n: displayedScreen,
          total: TOTAL_SCREENS,
        })}
      </span>

      <span className="opacity-30">•</span>

      <SaveIndicator state={saveState} />
    </div>
  );
}
