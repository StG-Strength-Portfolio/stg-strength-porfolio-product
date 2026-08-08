import { Lock } from "lucide-react";
import { WorldIcon } from "@/components/icons/AppIcons";
import { LevelProgressBar } from "@/components/LevelProgressBar";
import type { WorldMeta } from "@/lib/screens";
import { cn } from "@/lib/utils";
import { useT, useTr } from "@/lib/i18n";

export function WorldBadge({
  world, locked, progress, onClick,
}: { world: WorldMeta; locked: boolean; progress: number; onClick?: () => void }) {
  const t = useT();
  const tr = useTr();
  const toneBg =
    world.tone === "coral" ? "bg-[color:var(--coral)]" :
    world.tone === "mint" ? "bg-[color:var(--mint)]" :
    world.tone === "teal" ? "bg-[color:var(--teal)]" :
    world.tone === "purple" ? "bg-[color:var(--purple-dark)]" :
    "bg-[color:var(--yellow)]";
  const ink = world.tone === "purple" || world.tone === "coral" ? "text-white" : "text-[color:var(--ink)]";
  return (
    <button
      type="button"
      onClick={locked ? undefined : onClick}
      disabled={locked}
      className={cn(
        "group relative w-full text-left rounded-3xl p-5 shadow-[6px_8px_0_0_var(--purple-dark)] transition-transform",
        toneBg, ink,
        locked ? "opacity-60 cursor-not-allowed" : "hover:-translate-y-1 hover:-rotate-1",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider opacity-80">{tr(world.title)}</div>
          <div className="font-display text-2xl leading-tight">{tr(world.subtitle)}</div>
        </div>
        <WorldIcon id={world.id} size={36} aria-hidden />
      </div>
      <LevelProgressBar pct={progress * 100} className="mt-4 w-full" />
      <div className="mt-2 flex items-center justify-between text-[11px] opacity-90">
        <span>{t("app.screensSuffix")} {world.start}–{world.end}</span>
        {locked ? <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> {t("common.locked")}</span>
               : <span>{Math.round(progress * 100)}%</span>}
      </div>
    </button>
  );
}
