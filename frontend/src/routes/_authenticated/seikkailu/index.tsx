import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { WORLDS, TOTAL_SCREENS, worldForScreen } from "@/lib/screens";
import { WorldBadge } from "@/components/WorldBadge";
import { StickyNote } from "@/components/StickyNote";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useStudentProgress } from "@/lib/progress";
import { useT, useTr } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/seikkailu/")({
  component: WorldMap,
});

function WorldMap() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const t = useT();
  const tr = useTr();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);
  const progress = useStudentProgress(userId);

  const current = progress?.currentScreen ?? 1;
  const currentWorld = worldForScreen(current);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl">{t("worldmap.title")}</h1>
          <p className="opacity-85 mt-1">{t("worldmap.subtitle")}</p>
        </div>
        <StickyNote tone="yellow" className="!p-3 !px-4 max-w-xs">
          <div className="text-xs font-semibold uppercase tracking-wide">
            {t("worldmap.resumeHeader")}
          </div>
          <div className="font-display text-lg leading-tight">
            {t("worldmap.resumeAt", { world: tr(currentWorld.title), n: current })}
          </div>
          <Button
            className="mt-2 rounded-full bg-[color:var(--coral)] hover:bg-[color:var(--coral)]/90 text-white"
            onClick={() =>
              navigate({ to: "/seikkailu/$screen", params: { screen: String(current) } })
            }
          >
            {t("common.continue")} →
          </Button>
        </StickyNote>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {WORLDS.map((w, idx) => {
          const wp = progress?.byWorld[w.id] ?? { completed: 0, total: 0 };
          const prev = idx > 0 ? WORLDS[idx - 1] : null;
          const prevWP = prev ? (progress?.byWorld[prev.id] ?? { completed: 0, total: 0 }) : null;
          const prevDone = !prevWP || prevWP.total === 0 || prevWP.completed >= prevWP.total;
          const locked = idx > 0 && current < w.start && !prevDone;
          const ratio = wp.total > 0 ? wp.completed / wp.total : current > w.end ? 1 : 0;
          return (
            <WorldBadge
              key={w.id}
              world={w}
              locked={locked}
              progress={ratio}
              onClick={() =>
                navigate({
                  to: "/seikkailu/$screen",
                  params: { screen: String(Math.max(w.start, Math.min(current, w.end))) },
                })
              }
            />
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs opacity-70">
        {TOTAL_SCREENS} {t("app.screensSuffix")} • {t("app.title")}
      </p>
    </div>
  );
}
