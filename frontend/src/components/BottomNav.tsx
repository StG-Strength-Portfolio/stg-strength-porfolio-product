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

  async function goNext(
    e: React.MouseEvent<HTMLButtonElement>,
  ) {
   
    if (subpages.hasNext) {
      subpages.goNext();
      return;
    }

  
    const btn = e.currentTarget;

    if (onBeforeNext) {
      try {
        await onBeforeNext();
      } catch {
     
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

  const previousDisabled =
    n <= 1 && !subpages.hasPrevious;

  const finalNextDisabled =
    !subpages.hasNext &&
    (n >= TOTAL_SCREENS || nextDisabled);

  const displayedScreen =
    subpages.total > 1
      ? `${n}/${subpages.page + 1}`
      : n;

  return (
    <nav className="no-print sticky bottom-0 z-20 flex items-center justify-between gap-3 border-t border-white/10 bg-[color:var(--purple-dark)]/80 px-4 py-3 backdrop-blur">
      <Button
        variant="secondary"
        disabled={previousDisabled}
        onClick={goPrevious}
        className="game-btn rounded-full font-display font-semibold"
      >
        ← {t("common.previous")}
      </Button>

      <div className="flex min-h-[1.5rem] flex-col items-center justify-center text-center text-xs opacity-90">
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
          <span className="text-[color:var(--yellow)]">
            {nextHint}
          </span>
        ) : null}
      </div>

      <Button
        disabled={finalNextDisabled}
        onClick={goNext}
        className="game-btn rounded-full bg-[color:var(--coral)] px-5 font-display font-semibold text-white hover:bg-[color:var(--coral)]/90"
      >
        <SparkleIcon
          size={16}
          className="sparkle mr-1"
        />

        {t("common.next")} →
      </Button>
    </nav>
  );
}
