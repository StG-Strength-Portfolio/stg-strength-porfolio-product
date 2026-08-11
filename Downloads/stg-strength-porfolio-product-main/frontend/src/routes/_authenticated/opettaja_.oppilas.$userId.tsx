import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CornerBlobs } from "@/components/CornerBlobs";
import { getCurrentRole } from "@/lib/auth-helpers";
import { Printer, ArrowLeft } from "lucide-react";
import { useTr } from "@/lib/i18n";
import { PortfolioView } from "@/components/portfolio/PortfolioView";

export const Route = createFileRoute("/_authenticated/opettaja_/oppilas/$userId")({
  component: StudentPortfolioRoute,
});

interface ResponseRow {
  field_key: string;
  value: unknown;
}
interface ProfileRow {
  id: string;
  display_name: string | null;
  current_screen: number | null;
}

function StudentPortfolioRoute() {
  const tr = useTr();
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

  if (!allowed)
    return <div className="flex min-h-screen items-center justify-center">{tr("Ladataan…")}</div>;

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <CornerBlobs />
      <header className="no-print relative z-10 flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/teacher/dashboard" className="inline-flex">
            <Button variant="ghost" className="rounded-full">
              <ArrowLeft className="mr-2 h-4 w-4" /> {tr("Takaisin")}
            </Button>
          </Link>
          <h1 className="font-display text-2xl">
            {profile?.display_name ?? tr("Opiskelija")} — {tr("Portfolio")}
          </h1>
        </div>
        <Button
          onClick={() => window.print()}
          className="rounded-full bg-[color:var(--coral)] text-white hover:bg-[color:var(--coral)]/90"
        >
          <Printer className="mr-2 h-4 w-4" /> {tr("Tulosta portfolio")}
        </Button>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-6">
        <PortfolioView
          name={profile?.display_name ?? null}
          currentScreen={profile?.current_screen ?? null}
          responses={responses}
        />
      </main>
    </div>
  );
}
