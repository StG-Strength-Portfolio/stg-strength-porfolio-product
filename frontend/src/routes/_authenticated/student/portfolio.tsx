import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CornerBlobs } from "@/components/CornerBlobs";
import { PortfolioView } from "@/components/portfolio/PortfolioView";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentRole } from "@/lib/auth-helpers";
import { useLanguage } from "@/lib/i18n";
import { getSuperAdminPreview } from "@/lib/superadmin-preview";
import { DEMO_STUDENT_ID, getDemoState } from "@/lib/demo-store";

export const Route = createFileRoute("/_authenticated/student/portfolio")({
  component: MyPortfolioPage,
});

interface ResponseRow {
  field_key: string;
  value: unknown;
}

const COPY = {
  fi: {
    title: "Minun portfolioni",
    print: "Tulosta / Tallenna PDF",
    back: "Takaisin",
    loading: "Ladataan…",
  },
  en: {
    title: "My Portfolio",
    print: "Print / Save as PDF",
    back: "Back",
    loading: "Loading…",
  },
  sv: {
    title: "Min portfolio",
    print: "Skriv ut / Spara som PDF",
    back: "Tillbaka",
    loading: "Laddar…",
  },
} as const;

function MyPortfolioPage() {
  const { language } = useLanguage();
  const text = COPY[language];
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [currentScreen, setCurrentScreen] = useState<number | null>(null);
  const [responses, setResponses] = useState<Map<string, unknown>>(new Map());

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const role = await getCurrentRole();
      const previewStudent = role === "super_admin" && getSuperAdminPreview().mode === "student";
      if (role !== "student" && !previewStudent) {
        navigate({ to: role === "teacher" ? "/teacher/dashboard" : role === "school_admin" ? "/school-admin/dashboard" : "/auth", replace: true });
        return;
      }

      if (previewStudent) {
        const demo = getDemoState();
        const student = demo.students.find((item) => item.id === DEMO_STUDENT_ID) ?? demo.students[0];
        if (cancelled) return;
        setName(student?.name ?? null);
        setCurrentScreen(student?.currentScreen ?? 1);
        setResponses(new Map(Object.entries(demo.studentResponses)));
        setReady(true);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        navigate({ to: "/auth", replace: true });
        return;
      }

      const [{ data: profile, error: profileError }, { data: rows, error: responseError }] =
        await Promise.all([
          supabase
            .from("profiles" as never)
            .select("display_name,current_screen")
            .eq("id", user.id as never)
            .maybeSingle(),
          supabase
            .from("responses" as never)
            .select("field_key,value")
            .eq("user_id", user.id as never),
        ]);

      if (profileError) throw profileError;
      if (responseError) throw responseError;
      if (cancelled) return;

      const typedProfile = profile as {
        display_name?: string | null;
        current_screen?: number | null;
      } | null;
      const map = new Map<string, unknown>();
      for (const row of (rows ?? []) as unknown as ResponseRow[]) map.set(row.field_key, row.value);

      setName(typedProfile?.display_name ?? null);
      setCurrentScreen(typedProfile?.current_screen ?? 1);
      setResponses(map);
      setReady(true);
    })().catch((error) => {
      console.error("[student-portfolio]", error);
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center">{text.loading}</div>;
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <CornerBlobs />
      <header className="no-print relative z-10 flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/seikkailu" className="inline-flex">
            <Button variant="ghost" className="rounded-full">
              <ArrowLeft className="mr-2 h-4 w-4" /> {text.back}
            </Button>
          </Link>
          <h1 className="font-display text-2xl">{text.title}</h1>
        </div>
        <Button
          onClick={() => window.print()}
          className="rounded-full bg-[color:var(--coral)] text-white hover:bg-[color:var(--coral)]/90"
        >
          <Printer className="mr-2 h-4 w-4" /> {text.print}
        </Button>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-6">
        <PortfolioView name={name} currentScreen={currentScreen} responses={responses} />
      </main>
    </div>
  );
}
