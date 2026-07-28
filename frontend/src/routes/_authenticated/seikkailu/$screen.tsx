import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StickyNote } from "@/components/StickyNote";
import { BottomNav } from "@/components/BottomNav";
import { PencilBadge } from "@/components/PencilBadge";
import { ScreenChrome } from "@/components/ScreenChrome";
import { TOTAL_SCREENS, worldForScreen } from "@/lib/screens";
import { ScreenContent, hasContent } from "@/lib/screen-content";
import { REQUIREMENTS, useNavGate } from "@/lib/screen-completion";
import { supabase } from "@/integrations/supabase/client";
import type { SaveState } from "@/hooks/use-autosave";
import { TranslateFi, useT, useTr } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/seikkailu/$screen")({
  component: ScreenView,
});

function ScreenView() {
  const { screen } = Route.useParams();
  const n = Math.max(1, Math.min(TOTAL_SCREENS, Number(screen) || 1));
  const world = worldForScreen(n);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const { setScreen, isComplete } = useNavGate();
  const t = useT();
  const tr = useTr();
  const hint = t("nav.finishFirst");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
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
        <div className="mb-4 flex items-center gap-2">
          <PencilBadge>{tr(world.title)}</PencilBadge>
          <span className="text-sm opacity-80">{tr(world.subtitle)}</span>
          <span className="ml-auto text-base" aria-hidden>{world.emoji ?? "🗺️"}</span>
        </div>
        {built ? (
          <TranslateFi>
            <ScreenContent n={n} onSaveStateChange={setSaveState} />
          </TranslateFi>
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
