import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { getCurrentRole } from "@/lib/auth-helpers";
import { WORLDS, TOTAL_SCREENS, worldForScreen } from "@/lib/screens";
import { REQUIREMENTS } from "@/lib/screen-completion";
import { METER_STRENGTHS } from "@/lib/meter-data";
import { Printer, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/opettaja_/oppilas/$userId")({
  component: StudentPortfolio,
});

interface ResponseRow { field_key: string; value: unknown; }
interface ProfileRow { id: string; display_name: string | null; current_screen: number | null; }

function StudentPortfolio() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [responses, setResponses] = useState<Map<string, unknown>>(new Map());

  useEffect(() => {
    getCurrentRole().then((r) => {
      if (r !== "teacher") {
        navigate({ to: "/seikkailu", replace: true });
        return;
      }
      setAllowed(true);
    });
  }, [navigate]);

  useEffect(() => {
    if (!allowed) return;
    (async () => {
      const { data: prof } = await supabase
        .from("profiles" as never)
        .select("id,display_name,current_screen")
        .eq("id", userId as never)
        .maybeSingle();
      setProfile((prof as ProfileRow | null) ?? null);
      const { data: rows } = await supabase
        .from("responses" as never)
        .select("field_key,value")
        .eq("user_id", userId as never);
      const m = new Map<string, unknown>();
      for (const r of (rows ?? []) as ResponseRow[]) m.set(r.field_key, r.value);
      setResponses(m);
    })();
  }, [allowed, userId]);

  const stats = useMemo(() => {
    let totalRequired = 0, done = 0;
    for (let n = 1; n <= TOTAL_SCREENS; n++) {
      const req = REQUIREMENTS[n];
      if (!req || req.length === 0) continue;
      totalRequired++;
      if (req.every((k) => isFilled(responses.get(k)))) done++;
    }
    return { totalRequired, done };
  }, [responses]);

  if (!allowed) return <div className="flex min-h-screen items-center justify-center">Ladataan…</div>;

  const meterDone = METER_STRENGTHS.every(
    (s) => isFilled(responses.get(`meter2_${s.id}_s1`)) && isFilled(responses.get(`meter2_${s.id}_s2`)),
  );
  const top5 = responses.get("meter2_top5") as string[] | undefined;
  const growth3 = responses.get("meter2_growth3") as string[] | undefined;

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <CornerBlobs />
      <header className="no-print relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/opettaja" className="inline-flex">
            <Button variant="ghost" className="rounded-full">
              <ArrowLeft className="h-4 w-4 mr-2" /> Takaisin
            </Button>
          </Link>
          <h1 className="text-2xl font-display">
            {profile?.display_name ?? "Opiskelija"} — Portfolio
          </h1>
        </div>
        <Button
          onClick={() => window.print()}
          className="rounded-full bg-[color:var(--coral)] hover:bg-[color:var(--coral)]/90 text-white"
        >
          <Printer className="h-4 w-4 mr-2" /> Tulosta Portfolio
        </Button>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-6 space-y-6">
        <StickyNote tone="yellow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider opacity-70">Edistyminen</div>
              <div className="font-display text-2xl">
                {stats.done} / {stats.totalRequired} näyttöä täytetty
              </div>
              <div className="text-sm opacity-80">
                Nykyinen näyttö: {profile?.current_screen ?? 1} / {TOTAL_SCREENS}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider opacity-70">Vahvuusmittari</div>
              <div className="font-display text-xl">{meterDone ? "Suoritettu ✓" : "Kesken"}</div>
            </div>
          </div>
        </StickyNote>

        {meterDone && (top5?.length || growth3?.length) ? (
          <StickyNote tone="coral">
            <h2 className="font-display text-2xl mb-2">Vahvuustulos</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide opacity-80 mb-1">Top 5 ydinvahvuutta</div>
                <ol className="list-decimal pl-5 text-sm space-y-0.5">
                  {(top5 ?? []).map((id) => {
                    const s = METER_STRENGTHS.find((m) => m.id === id);
                    return <li key={id}>{s?.name ?? id}</li>;
                  })}
                </ol>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wide opacity-80 mb-1">Top 3 kasvuvahvuutta</div>
                <ol className="list-decimal pl-5 text-sm space-y-0.5">
                  {(growth3 ?? []).map((id) => {
                    const s = METER_STRENGTHS.find((m) => m.id === id);
                    return <li key={id}>{s?.name ?? id}</li>;
                  })}
                </ol>
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
              .filter((e) => isFilled(e.value));
            if (entries.length > 0) screens.push({ n, entries });
          }
          if (screens.length === 0) return null;
          return (
            <section key={w.id} className="space-y-2">
              <h2 className="font-display text-2xl flex items-center gap-2">
                <span>{w.emoji}</span> {w.title} — <span className="opacity-70 text-lg">{w.subtitle}</span>
              </h2>
              <div className="grid gap-2">
                {screens.map(({ n, entries }) => (
                  <StickyNote key={n} tone="white">
                    <div className="text-xs uppercase tracking-wider opacity-60 mb-1">
                      Näyttö {n} — {worldForScreen(n).title}
                    </div>
                    <dl className="space-y-1.5">
                      {entries.map((e) => (
                        <div key={e.key}>
                          <dt className="text-xs font-mono opacity-50">{e.key}</dt>
                          <dd className="text-sm whitespace-pre-wrap">{formatValue(e.value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </StickyNote>
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}

function isFilled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0 && v.trim() !== "null";
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function formatValue(v: unknown): string {
  if (typeof v === "string") {
    const t = v.trim();
    if (t.startsWith("[") || t.startsWith("{")) {
      try { return JSON.stringify(JSON.parse(t), null, 2); } catch { return v; }
    }
    return v;
  }
  if (Array.isArray(v) || typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v);
}
