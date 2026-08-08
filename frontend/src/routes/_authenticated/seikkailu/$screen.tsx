import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StickyNote } from "@/components/StickyNote";
import { BottomNav } from "@/components/BottomNav";
import { PencilBadge } from "@/components/PencilBadge";
import { ScreenChrome } from "@/components/ScreenChrome";
import { TOTAL_SCREENS, worldForScreen } from "@/lib/screens";
import { hasContent } from "@/lib/screen-content";
// @lovable-new 2026-08-05 — student route now renders through the shared
// student/teacher portfolio renderer so both views can never drift apart.
import { PortfolioScreenRenderer } from "@/components/portfolio/PortfolioScreenRenderer";
import { REQUIREMENTS, useNavGate } from "@/lib/screen-completion";
import { supabase } from "@/integrations/supabase/client";
import type { SaveState } from "@/hooks/use-autosave";
import { useT, useTr } from "@/lib/i18n";
import { useStudentProgress } from "@/lib/progress";
import { LevelProgressBar } from "@/components/LevelProgressBar";
import { WorldIcon } from "@/components/icons/AppIcons";

export const Route = createFileRoute("/_authenticated/seikkailu/$screen")({
  component: ScreenView,
});

function ScreenView() {
  const { screen } = Route.useParams();
  const n = Math.max(1, Math.min(TOTAL_SCREENS, Number(screen) || 1));
  const world = worldForScreen(n);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [userId, setUserId] = useState<string | null>(null);
  const { setScreen, isComplete } = useNavGate();
  const t = useT();
  const tr = useTr();
  const hint = t("nav.finishFirst");
  const progress = useStudentProgress(userId);
  const stats = progress?.byWorld[world.id];
  const pct = stats && stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const { data: prof } = await supabase
        .from("profiles" as never)
        .select("current_screen")
        .eq("id", u.user.id)
        .maybeSingle();
      const p = prof as { current_screen?: number } | null;
      const cur = p?.current_screen ?? 1;
      if (n > cur) {
        await supabase.from("profiles" as never).update({ current_screen: n } as never).eq("id", u.user.id);
      }
    })();
  }, [n]);

  useEffect(() => {
    setScreen(n, REQUIREMENTS[n] ?? []);
    return () => setScreen(null, []);
  }, [n, setScreen]);

  const built = hasContent(n);

  return (
    <div className="journey-bg flex min-h-[calc(100vh-3.5rem)] flex-col">
      <ScreenChrome n={n} saveState={saveState} />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="mb-2 flex items-center gap-2">
          <PencilBadge icon={<WorldIcon id={world.id} size={14} />}>{tr(world.title)}</PencilBadge>
          <span className="text-sm opacity-80">{tr(world.subtitle)}</span>
        </div>
        <div className="mb-5 w-56 max-w-full">
          <LevelProgressBar pct={pct} />
        </div>
        {built ? (
          <PortfolioScreenRenderer
            screenNumber={n}
            mode="student"
            onSaveStateChange={setSaveState}
          />
        ) : (
          <StickyNote seed={`s${n}`}>
            <h1 className="text-3xl mb-3">{t("app.screenOfTotal", { n, total: TOTAL_SCREENS })}</h1>
          </StickyNote>
        )}
      </div>

      <BottomNav
        n={n}
        saveState={saveState}
        showProgress={false}
        nextDisabled={!isComplete}
        nextHint={!isComplete ? hint : undefined}
      />
    </div>
  );
}
