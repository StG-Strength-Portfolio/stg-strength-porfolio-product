import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { StickyNote } from "@/components/StickyNote";
import { useStrengthJar } from "@/hooks/useStrengthJar";
import { useReceivedGifts } from "@/hooks/useReceivedGifts";
import { ALL_STRENGTHS } from "@/lib/strength-jar-data";
import { getStrengthName } from "@/lib/strengths-i18n";
import { useLanguage, useTr } from "@/lib/i18n";
import { CandyIcon, StarIcon, TrophyIcon } from "@/components/icons/AppIcons";
import { TopStrengthCards } from "@/components/strengths/TopStrengthCards";
import { getPeerTopStrengths, type PeerTopStrengths } from "@/lib/student-strengths.functions";

export const Route = createFileRoute("/_authenticated/student/strengths")({
  component: StudentStrengthsPage,
  head: () => ({
    meta: [
      { title: "Vahvuuteni — Vahvuusseikkailu" },
      {
        name: "description",
        content: "Katso valitsemasi, keräämäsi ja opettajilta saamasi vahvuudet.",
      },
      { property: "og:title", content: "Vahvuuteni — Vahvuusseikkailu" },
      {
        property: "og:description",
        content: "Katso valitsemasi, keräämäsi ja opettajilta saamasi vahvuudet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function StudentStrengthsPage() {
  const tr = useTr();
  const { language } = useLanguage();
  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";
  const { selected, collected } = useStrengthJar();
  const { gifts } = useReceivedGifts();
  const fetchPeers = useServerFn(getPeerTopStrengths);
  const [peers, setPeers] = useState<PeerTopStrengths | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = (await fetchPeers()) as PeerTopStrengths;
        if (!cancelled) setPeers(res);
      } catch {
        /* peers are optional extra context */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPeers]);

  // How many times each strength has been earned: candy-shop picks, jar
  // discoveries anywhere in the adventure, and each teacher gift.
  const counts = new Map<number, number>();
  const bump = (id: number) => {
    if (!Number.isFinite(id)) return;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  };
  selected.forEach(bump);
  collected.forEach(bump);
  gifts.forEach((g) => bump(Number(g.strength_id)));

  const uniqueCount = ALL_STRENGTHS.filter((s) => (counts.get(s.id) ?? 0) > 0).length;
  const totalCount = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  const pct = Math.round((uniqueCount / ALL_STRENGTHS.length) * 100);
  const top = ALL_STRENGTHS.reduce<{ id: number; n: number } | null>((best, s) => {
    const n = counts.get(s.id) ?? 0;
    return n > 0 && (!best || n > best.n) ? { id: s.id, n } : best;
  }, null);

  function tierOf(n: number) {
    if (n >= 5) return { label: tr("Mestari!"), Badge: TrophyIcon, glow: true };
    if (n >= 3) return { label: tr("Kasvava"), Badge: StarIcon, glow: false };
    if (n >= 1) return { label: tr("Löydetty"), Badge: CandyIcon, glow: false };
    return { label: "", Badge: null, glow: false };
  }

  function Pills({ ids, empty }: { ids: number[]; empty: string }) {
    if (ids.length === 0) return <p className="text-sm opacity-70">{empty}</p>;
    return (
      <div className="flex flex-wrap gap-2">
        {ids.map((id) => {
          const s = ALL_STRENGTHS.find((x) => x.id === id);
          if (!s) return null;
          return (
            <span
              key={id}
              className="flex items-center gap-2 rounded-full border-l-4 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-900 shadow-sm"
              style={{ borderLeftColor: s.color }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
              {getStrengthName(id, lang)}
            </span>
          );
        })}
      </div>
    );
  }

  const top5 = ALL_STRENGTHS.map((s) => ({ id: s.id, color: s.color, n: counts.get(s.id) ?? 0 }))
    .filter((s) => s.n > 0)
    .sort((a, b) => b.n - a.n || a.id - b.id)
    .slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <h1 className="flex items-center gap-2 font-display text-3xl">
        <CandyIcon size={24} /> {tr("Vahvuuteni")}
      </h1>

      <StickyNote seed="student-strengths-top5" className="space-y-3">
        <h2 className="font-display text-xl">{tr("Top 5 vahvuuttasi")}</h2>
        {top5.length === 0 ? (
          <p className="text-sm opacity-70">{tr("Et ole vielä kerännyt vahvuuksia.")}</p>
        ) : (
          <TopStrengthCards items={top5.map((s) => ({ id: s.id, count: s.n }))} lang={lang} />
        )}
      </StickyNote>

      {peers && peers.classTop.length > 0 && (
        <StickyNote
          seed="student-strengths-class-top5"
          className="space-y-3 border-4 border-[color:var(--blue,#2899B8)]"
        >
          <h2 className="font-display text-xl">
            {tr("Luokkasi top 5")}
            {peers.className ? ` — ${peers.className}` : ""}
          </h2>
          <TopStrengthCards
            items={peers.classTop.map((s) => ({
              id: s.strengthId,
              count: s.count,
              caption: `${s.students} ${tr("opiskelijaa")}`,
            }))}
            lang={lang}
            size="sm"
          />
        </StickyNote>
      )}

      {peers && peers.schoolTop.length > 0 && (
        <StickyNote
          seed="student-strengths-school-top5"
          className="space-y-3 border-4 border-[color:var(--purple)]"
        >
          <h2 className="font-display text-xl">
            {tr("Koulusi top 5")}
            {peers.schoolName ? ` — ${peers.schoolName}` : ""}
          </h2>
          <TopStrengthCards
            items={peers.schoolTop.map((s) => ({
              id: s.strengthId,
              count: s.count,
              caption: `${s.students} ${tr("opiskelijaa")}`,
            }))}
            lang={lang}
            size="sm"
          />
        </StickyNote>
      )}

      <StickyNote seed="student-strengths-picks" className="space-y-3">
        <h2 className="font-display text-xl">{tr("Valitsemasi vahvuudet")}</h2>
        <Pills ids={selected} empty={tr("Et ole vielä valinnut vahvuuksia karkkikaupasta.")} />
      </StickyNote>

      <StickyNote seed="student-strengths-gifts" className="space-y-3">
        <h2 className="font-display text-xl">{tr("Opettajalta saadut vahvuudet")}</h2>
        {gifts.length === 0 ? (
          <p className="text-sm opacity-70">{tr("Et ole vielä saanut vahvuuksia opettajalta.")}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {gifts.map((g) => {
              const id = Number(g.strength_id);
              const s = ALL_STRENGTHS.find((x) => x.id === id);
              return (
                <li
                  key={g.id}
                  className="rounded-2xl border-l-4 bg-white/90 p-4 text-slate-900 shadow-sm"
                  style={{ borderLeftColor: s?.color ?? "var(--purple)" }}
                >
                  <div className="font-display text-lg">
                    <CandyIcon size={18} className="mr-1 inline align-[-3px]" />
                    {Number.isFinite(id) ? getStrengthName(id, lang) : g.strength_id}
                  </div>
                  {g.message && <p className="mt-1 text-sm">{g.message}</p>}
                  <div className="mt-2 text-xs opacity-60">
                    {g.teacher_name ?? tr("Opettaja")} ·{" "}
                    {new Date(g.created_at).toLocaleDateString()}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </StickyNote>

      <StickyNote seed="student-strengths-all" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl">{tr("Vahvuuskokoelmani")}</h2>
          <span className="text-sm font-bold">
            {uniqueCount}/{ALL_STRENGTHS.length}
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/70 px-3 py-2 text-sm text-slate-900">
            <div className="text-[0.7rem] uppercase tracking-wider opacity-60">
              {tr("Löydetyt vahvuudet")}
            </div>
            <div className="font-display text-base">
              {uniqueCount}/{ALL_STRENGTHS.length}
            </div>
          </div>
          <div className="rounded-2xl bg-white/70 px-3 py-2 text-sm text-slate-900">
            <div className="text-[0.7rem] uppercase tracking-wider opacity-60">
              {tr("Kerätyt karkit yhteensä")}
            </div>
            <div className="font-display text-base">{totalCount}</div>
          </div>
          <div className="rounded-2xl bg-white/70 px-3 py-2 text-sm text-slate-900">
            <div className="text-[0.7rem] uppercase tracking-wider opacity-60">
              {tr("Vahvin vahvuutesi")}
            </div>
            <div className="font-display text-base">
              {top ? `${getStrengthName(top.id, lang)} ×${top.n}` : "—"}
            </div>
          </div>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full rounded-full bg-[color:var(--purple)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs opacity-70">
          {pct}% {tr("vahvuuksista löydetty")}
        </p>

        <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {ALL_STRENGTHS.map((s) => {
            const n = counts.get(s.id) ?? 0;
            const tier = tierOf(n);
            return (
              <li
                key={s.id}
                className={
                  "flex items-center justify-between gap-2 rounded-xl border-l-4 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm transition-all " +
                  (n === 0 ? "opacity-40 " : "") +
                  (tier.glow ? "ring-2 ring-[color:var(--yellow)] shadow-md" : "")
                }
                style={{ borderLeftColor: s.color }}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: s.color }}
                    aria-hidden
                  />
                  <span className="break-words text-xs leading-snug">
                    {tier.Badge && <tier.Badge size={14} className="mr-1 inline align-[-2px]" />}
                    {getStrengthName(s.id, lang)}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="font-display text-sm tabular-nums">×{n}</span>
                  {tier.label && (
                    <span className="block text-[0.6rem] uppercase tracking-wider opacity-70">
                      {tier.label}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </StickyNote>
    </div>
  );
}
