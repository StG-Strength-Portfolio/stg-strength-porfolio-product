import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { Button } from "@/components/ui/button";
import { AuthLanguageSwitcher } from "@/components/AuthLanguageSwitcher";
import { useLanguage, useT, useTr } from "@/lib/i18n";
import { z } from "zod";

export const Route = createFileRoute("/auth/")({
  validateSearch: z.object({ idle: z.enum(["1"]).optional() }).parse,
  component: AuthLanding,
});

const schoolAdminLabel = {
  fi: "Luo koulun admin-tili",
  en: "Create school admin account",
  sv: "Skapa konto för skoladministratör",
} as const;

function AuthLanding() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const t = useT();
  const tr = useTr();
  const { language } = useLanguage();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/seikkailu", replace: true });
    });
  }, [navigate]);

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden flex items-center justify-center px-4 py-10">
      <CornerBlobs />
      <AuthLanguageSwitcher />
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-5xl font-bold">{t("app.title")}</h1>
          <p className="mt-2 opacity-90">{t("app.tagline")}</p>
        </div>

        {search.idle && (
          <StickyNote tone="yellow" seed="idle" className="text-sm">
            {t("auth.idle.expired")}
          </StickyNote>
        )}

        <StickyNote seed="landing-card" className="space-y-4 text-center">
          <Button
            onClick={() => navigate({ to: "/auth/login" })}
            className="w-full rounded-full bg-[color:var(--purple)] hover:bg-[color:var(--purple)]/90 text-white font-bold py-6 text-base h-auto"
          >
            {t("auth.landing.loginBtn")}
          </Button>
          <Button
            onClick={() => navigate({ to: "/auth/student" })}
            className="w-full rounded-full bg-[color:var(--coral)] hover:bg-[color:var(--coral)]/90 text-white font-bold py-6 text-base h-auto"
          >
            {t("auth.landing.signupBtn")}
          </Button>
          <Button
            onClick={() => navigate({ to: "/register-teacher" })}
            className="w-full rounded-full bg-yellow hover:bg-yellow/90 text-ink font-bold py-6 text-base h-auto"
          >
            {tr("Luo opettajatili")}
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full rounded-full border-2 border-[color:var(--purple)] bg-white py-6 text-base font-bold text-[color:var(--purple)] h-auto"
          >
            <a href="/register-school-admin">{schoolAdminLabel[language]}</a>
          </Button>
        </StickyNote>
      </div>
    </div>
  );
}
