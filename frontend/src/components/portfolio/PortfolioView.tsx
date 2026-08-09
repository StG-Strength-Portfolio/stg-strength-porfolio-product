/**
 * Shared, read-only student portfolio.
 *
 * Presentational only: the caller supplies the already-loaded responses.
 * Used by the teacher portfolio route and by the school-admin drill-down so
 * both show identical, human-readable questions and answers (never raw keys).
 */
import { useState, type ReactNode } from "react";
import { StickyNote } from "@/components/StickyNote";
import { WorldIcon } from "@/components/icons/AppIcons";
import { WORLDS, TOTAL_SCREENS, type WorldId } from "@/lib/screens";
import { REQUIREMENTS } from "@/lib/screen-completion";
import { METER_STRENGTHS } from "@/lib/meter-data";
import { fieldLabel } from "@/lib/portfolio-labels";
import { matchStrengthId, getJarStrength } from "@/lib/strength-jar-data";
import { getStrengthName } from "@/lib/strengths-i18n";
import { useLanguage, useTr } from "@/lib/i18n";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function isFilledValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") {
    const t = v.trim();
    return t.length > 0 && t !== "null" && t !== '""' && t !== "[]";
  }
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/** Parse a stored response into a normalised shape for display. */
function parseValue(v: unknown): unknown {
  if (typeof v === "string") {
    const t = v.trim();
    if (t.startsWith("[") || t.startsWith("{") || t === "true" || t === "false") {
      try {
        return JSON.parse(t);
      } catch {
        return v;
      }
    }
    return v;
  }
  return v;
}

function StrengthPill({ name, lang }: { name: string; lang: "fi" | "sv" | "en" }) {
  const id = matchStrengthId(name);
  const color = id ? (getJarStrength(id)?.color ?? "var(--purple)") : "var(--purple)";
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border-l-4 bg-white/90 px-3 py-1 text-xs font-medium text-slate-900 shadow-sm"
      style={{ borderLeftColor: color }}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
      {id ? getStrengthName(id, lang) : name}
    </span>
  );
}

function YesNo({ yes }: { yes: boolean }) {
  const tr = useTr();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
        yes ? "bg-green-600/15 text-green-800" : "bg-red-600/15 text-red-800",
      )}
    >
      {yes ? "✓" : "✗"} {yes ? tr("Kyllä") : tr("Ei")}
    </span>
  );
}

function AnswerValue({ value, lang }: { value: unknown; lang: "fi" | "sv" | "en" }) {
  const tr = useTr();
  const v = parseValue(value);

  if (typeof v === "boolean") return <YesNo yes={v} />;

  if (typeof v === "number") {
    return (
      <span className="inline-flex items-center rounded-full bg-[color:var(--purple)]/10 px-3 py-1 text-xs font-bold tabular-nums">
        {v} / 5
      </span>
    );
  }

  if (Array.isArray(v)) {
    return (
      <div className="flex flex-wrap gap-2">
        {v.map((item, i) => {
          const text = typeof item === "string" ? item : String(item);
          const meter = METER_STRENGTHS.find((m) => m.id === text);
          return <StrengthPill key={`${text}-${i}`} name={meter?.name ?? text} lang={lang} />;
        })}
      </div>
    );
  }

  if (typeof v === "string") {
    const t = v.trim();
    if (/^(kyllä|kylla|yes|ja)$/i.test(t)) return <YesNo yes />;
    if (/^(ei|no|nej)$/i.test(t)) return <YesNo yes={false} />;
    if (/^[1-5]$/.test(t)) {
      return (
        <span className="inline-flex items-center rounded-full bg-[color:var(--purple)]/10 px-3 py-1 text-xs font-bold tabular-nums">
          {t} / 5
        </span>
      );
    }
    return (
      <blockquote className="rounded-2xl border-l-4 border-[color:var(--purple)]/40 bg-white/70 px-3 py-2 text-sm italic leading-relaxed whitespace-pre-wrap text-slate-900">
        “{t}”
      </blockquote>
    );
  }

  return <span className="text-sm opacity-70">{tr("Ei vastausta")}</span>;
}

export interface PortfolioViewProps {
  name: string | null;
  currentScreen: number | null;
  responses: Map<string, unknown>;
  /** Rendered above the portfolio (back button, breadcrumbs, print button…). */
  header?: ReactNode;
}

export function PortfolioView({ name, currentScreen, responses, header }: PortfolioViewProps) {
  const tr = useTr();
  const { language } = useLanguage();
  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";

  let totalRequired = 0;
  let done = 0;
  for (let n = 1; n <= TOTAL_SCREENS; n++) {
    const req = REQUIREMENTS[n];
    if (!req || req.length === 0) continue;
    totalRequired++;
    if (req.every((k) => isFilledValue(responses.get(k)))) done++;
  }

  const meterDone = METER_STRENGTHS.every(
    (s) =>
      isFilledValue(responses.get(`meter2_${s.id}_s1`)) &&
      isFilledValue(responses.get(`meter2_${s.id}_s2`)),
  );
  const top5 = parseValue(responses.get("meter2_top5")) as string[] | undefined;
  const growth3 = parseValue(responses.get("meter2_growth3")) as string[] | undefined;

  return (
    <div className="space-y-6">
      {header}

      <StickyNote tone="yellow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-70">{tr("Edistyminen")}</div>
            <div className="font-display text-2xl">
              {done} / {totalRequired} {tr("näyttöä täytetty")}
            </div>
            <div className="text-sm opacity-80">
              {tr("Nykyinen näyttö")}: {currentScreen ?? 1} / {TOTAL_SCREENS}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider opacity-70">
              {tr("Vahvuusmittari")}
            </div>
            <div className="font-display text-xl">
              {meterDone ? tr("Suoritettu") : tr("Kesken")}
            </div>
          </div>
        </div>
      </StickyNote>

      {top5?.length || growth3?.length ? (
        <StickyNote tone="coral">
          <h2 className="mb-2 font-display text-2xl">{tr("Vahvuustulos")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wide opacity-80">
                {tr("Top 5 ydinvahvuutta")}
              </div>
              <AnswerValue value={top5 ?? []} lang={lang} />
            </div>
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wide opacity-80">
                {tr("Top 3 kasvuvahvuutta")}
              </div>
              <AnswerValue value={growth3 ?? []} lang={lang} />
            </div>
          </div>
        </StickyNote>
      ) : null}

      {WORLDS.map((w) => {
        const screens: Array<{ n: number; entries: Array<{ key: string; value: unknown }> }> = [];
        for (let n = w.start; n <= w.end; n++) {
          const req = REQUIREMENTS[n];
          if (!req || req.length === 0) continue;
          const entries = req
            .map((k) => ({ key: k, value: responses.get(k) }))
            .filter((e) => isFilledValue(e.value));
          if (entries.length > 0) screens.push({ n, entries });
        }
        if (screens.length === 0) return null;
        return (
          <LevelSection
            key={w.id}
            worldId={w.id}
            title={`${tr(w.title)} — ${tr(w.subtitle)}`}
            count={screens.length}
          >
            {screens.map(({ n, entries }) => (
              <StickyNote key={n} tone="white" className="space-y-3">
                <div className="text-xs uppercase tracking-wider opacity-60">
                  {tr("Näyttö")} {n}
                </div>
                <dl className="space-y-3">
                  {entries.map((e) => (
                    <div key={e.key} className="space-y-1">
                      <dt className="text-sm font-bold leading-snug">
                        {tr(fieldLabel(e.key) ?? tr("Vastaus"))}
                      </dt>
                      <dd>
                        <AnswerValue value={e.value} lang={lang} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </StickyNote>
            ))}
          </LevelSection>
        );
      })}

      {done === 0 && <p className="opacity-70">{tr("Ei vielä vastauksia.")}</p>}
    </div>
  );
}

function LevelSection({
  worldId,
  title,
  count,
  children,
}: {
  worldId: WorldId;
  title: string;
  count: number;
  children: ReactNode;
}) {
  const tr = useTr();
  const [open, setOpen] = useState(true);
  return (
    <section className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-left font-display text-xl shadow-sm hover:bg-white"
      >
        <WorldIcon id={worldId} size={18} />
        <span className="min-w-0 flex-1 break-words">{title}</span>
        <span className="shrink-0 text-xs font-semibold opacity-60">
          {count} {tr("näyttöä")}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 transition-transform", !open && "-rotate-90")}
        />
      </button>
      {open && <div className="grid gap-2">{children}</div>}
    </section>
  );
}
