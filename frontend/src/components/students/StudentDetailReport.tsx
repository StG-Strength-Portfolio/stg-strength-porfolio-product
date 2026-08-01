/**
 * Shared "one student, full report" view used by both the teacher dashboard
 * and the school-admin drill-down. Display only — all data is passed in.
 */
import { useMemo, type ReactNode } from "react";
import { StickyNote } from "@/components/StickyNote";
import { Button } from "@/components/ui/button";
import { TopStrengthCards } from "@/components/strengths/TopStrengthCards";
import { WorldIcon } from "@/components/icons/AppIcons";
import { useLanguage, useTr } from "@/lib/i18n";
import { WORLDS } from "@/lib/screens";
import { ALL_STRENGTHS } from "@/lib/strength-jar-data";
import { getStrengthName } from "@/lib/strengths-i18n";
import { formatLastActive, worldCompletion, TOTAL_REQUIRED } from "@/lib/teacher-data";

export interface StudentGift {
  id: string;
  strength_id: string;
  message: string | null;
  created_at: string;
  teacher_name?: string | null;
}

export interface StudentDetailReportProps {
  name: string | null;
  className?: string | null;
  email?: string | null;
  lastActive: Date | string | null;
  currentScreen: number;
  screensFilled: number;
  filledKeys: string[];
  strengthIds: number[];
  gifts?: StudentGift[];
  /** Breadcrumbs or other chrome rendered above the header. */
  header?: ReactNode;
  onBack?: () => void;
  /** "Open portfolio" action rendered at the bottom. */
  portfolioAction?: ReactNode;
}

export function StudentDetailReport({
  name,
  className,
  email,
  lastActive,
  currentScreen,
  screensFilled,
  filledKeys,
  strengthIds,
  gifts = [],
  header,
  onBack,
  portfolioAction,
}: StudentDetailReportProps) {
  const tr = useTr();
  const { language } = useLanguage();
  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";

  const last =
    lastActive instanceof Date || lastActive === null ? lastActive : new Date(lastActive);
  const pct = Math.round((screensFilled / TOTAL_REQUIRED) * 100);

  const worlds = useMemo(
    () => worldCompletion(new Set(filledKeys), currentScreen),
    [filledKeys, currentScreen],
  );

  const counts = useMemo(() => {
    const m = new Map<number, number>();
    for (const id of strengthIds) if (id >= 1 && id <= 26) m.set(id, (m.get(id) ?? 0) + 1);
    for (const g of gifts) {
      const id = Number(g.strength_id);
      if (id >= 1 && id <= 26) m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  }, [strengthIds, gifts]);

  const top5 = useMemo(
    () =>
      [...counts.entries()]
        .map(([id, count]) => ({ id, count }))
        .sort((a, b) => b.count - a.count || a.id - b.id)
        .slice(0, 5),
    [counts],
  );

  return (
    <>
      <StickyNote seed={`student-hdr-${name ?? "x"}`} className="space-y-4">
        {header}
        {onBack && (
          <Button variant="outline" className="rounded-full" onClick={onBack}>
            {tr("Takaisin")}
          </Button>
        )}
        <div>
          <h2 className="text-2xl font-bold">{name?.trim() || tr("Opiskelija")}</h2>
          <p className="text-sm opacity-80">
            {className ? `${tr("Luokka")}: ${className} · ` : ""}
            {email ? `${email} · ` : ""}
            {tr("Viimeksi aktiivinen")}: {formatLastActive(last, tr)}
          </p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-semibold">
            <span>
              {tr("Näytöt")}: {screensFilled} / {TOTAL_REQUIRED}
            </span>
            <span>{pct} %</span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-full bg-[color:var(--coral)]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </StickyNote>

      <StickyNote seed={`student-top5-${name ?? "x"}`} className="space-y-3">
        <h3 className="text-xl font-bold">{tr("Opiskelijan Top 5 vahvuudet")}</h3>
        {top5.length === 0 ? (
          <p className="opacity-70">{tr("Ei vielä vahvuuksia.")}</p>
        ) : (
          <TopStrengthCards items={top5} lang={lang} />
        )}
      </StickyNote>

      <StickyNote seed={`student-levels-${name ?? "x"}`} className="space-y-2">
        <h3 className="text-xl font-bold">{tr("Tasojen valmistuminen")}</h3>
        {worlds.map((w, i) => {
          const meta = WORLDS[i];
          const state = w.done === 0 ? "Ei aloitettu" : w.done === w.total ? "Valmis" : "Kesken";
          const p = w.total > 0 ? Math.round((w.done / w.total) * 100) : 0;
          return (
            <div key={w.id} className="space-y-1 border-b border-black/5 py-1 text-sm">
              <div className="flex justify-between">
                <span>
                  <WorldIcon id={meta.id} size={18} className="inline align-[-3px]" />{" "}
                  {tr(meta.title)}
                </span>
                <span className="tabular-nums opacity-80">
                  {w.done}/{w.total} · {tr(state)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full rounded-full bg-[color:var(--purple)]"
                  style={{ width: `${p}%` }}
                />
              </div>
            </div>
          );
        })}
      </StickyNote>

      <StickyNote seed={`student-collection-${name ?? "x"}`} className="space-y-3">
        <h3 className="text-xl font-bold">{tr("Vahvuuskokoelma")}</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {ALL_STRENGTHS.map((s) => {
            const n = counts.get(s.id) ?? 0;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-2 rounded-2xl bg-white/90 p-2 text-slate-900 shadow-sm ${
                  n === 0 ? "opacity-40" : ""
                }`}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums text-white"
                  style={{ background: s.color }}
                >
                  {n}
                </span>
                <span className="text-xs font-semibold leading-tight break-words">
                  {getStrengthName(s.id, lang)}
                </span>
              </div>
            );
          })}
        </div>
      </StickyNote>

      <StickyNote seed={`student-gifts-${name ?? "x"}`} className="space-y-2">
        <h3 className="text-xl font-bold">{tr("Opettajilta saadut vahvuudet")}</h3>
        {gifts.length === 0 ? (
          <p className="opacity-70">{tr("Ei vielä vahvuuksia.")}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {gifts.map((g) => (
              <li key={g.id} className="rounded-2xl bg-white/70 p-2 text-slate-900">
                <div className="font-bold">{getStrengthName(Number(g.strength_id), lang)}</div>
                {g.message && <div className="italic opacity-80">“{g.message}”</div>}
                <div className="text-xs opacity-70">
                  {g.teacher_name ? `${g.teacher_name} · ` : ""}
                  {new Date(g.created_at).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </StickyNote>

      {portfolioAction && <div>{portfolioAction}</div>}
    </>
  );
}
