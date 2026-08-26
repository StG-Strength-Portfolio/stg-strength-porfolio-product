import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { SaveIndicator } from "@/components/SaveIndicator";
import type { SaveState } from "@/hooks/use-autosave";
import { TOTAL_SCREENS } from "@/lib/screens";
import { SparkleIcon } from "@/components/icons/AppIcons";
import { celebrateSave } from "@/lib/celebrate";
import { useT } from "@/lib/i18n";
import { useScreenSubPageNav } from "@/lib/screen-subpages";

export function BottomNav({
  n,
  saveState = "idle",
  showProgress = true,
  nextDisabled = false,
  nextHint,
  onBeforeNext,
}: {
  n: number;
  saveState?: SaveState;
  showProgress?: boolean;
  nextDisabled?: boolean;
  nextHint?: string;
  onBeforeNext?: () => void | Promise<void>;
}) {
  const navigate = useNavigate();
  const t = useT();

  const subpages = useScreenSubPageNav();

  async function goNext(e: React.MouseEvent<HTMLButtonElement>) {
    if (subpages.hasNext) {
      subpages.goNext();
      return;
    }

    const btn = e.currentTarget;

    if (onBeforeNext) {
      try {
        await onBeforeNext();
      } catch {
        // Navigation remains available if a best-effort pre-navigation save fails.
      }
    }

    await celebrateSave(btn);

    navigate({
      to: "/seikkailu/$screen",
      params: {
        screen: String(n + 1),
      },
    });
  }

  function goPrevious() {
    if (subpages.hasPrevious) {
      subpages.goPrevious();
      return;
    }

    navigate({
      to: "/seikkailu/$screen",
      params: {
        screen: String(n - 1),
      },
    });
  }

  const previousDisabled = n <= 1 && !subpages.hasPrevious;

  const finalNextDisabled =
    !subpages.hasNext &&
    (n >= TOTAL_SCREENS || nextDisabled);

  const displayedScreen =
    subpages.total > 1
      ? `${n}/${subpages.page + 1}`
      : n;

  return (
    <nav className="no-print sticky bottom-0 z-20 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
      <Button
        variant="outline"
        disabled={previousDisabled}
        onClick={goPrevious}
        className="rounded-lg border-slate-200 bg-white font-display font-semibold text-slate-700 shadow-none hover:bg-slate-50 hover:text-slate-900"
      >
        ← {t("common.previous")}
      </Button>

      <div className="flex min-h-[1.5rem] flex-col items-center justify-center text-center text-xs text-slate-500">
        {showProgress && (
          <span>
            {t("app.screenOfTotal", {
              n: displayedScreen,
              total: TOTAL_SCREENS,
            })}
          </span>
        )}

        {showProgress ? (
          <SaveIndicator state={saveState} />
        ) : finalNextDisabled && nextHint ? (
          <span className="text-slate-500">{nextHint}</span>
        ) : null}
      </div>

      <Button
        disabled={finalNextDisabled}
        onClick={goNext}
        className="rounded-lg bg-[color:var(--purple)] px-5 font-display font-semibold text-white shadow-none hover:bg-[color:var(--purple)]/90"
      >
        <SparkleIcon size={16} className="mr-1" />
        {t("common.next")} →
      </Button>
    </nav>
  );
}
