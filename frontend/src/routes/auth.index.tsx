import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { Button } from "@/components/ui/button";
import { AuthLanguageSwitcher } from "@/components/AuthLanguageSwitcher";
import { useLanguage, useT } from "@/lib/i18n";
import { homeForRole, roleOfCurrentUser } from "@/lib/role-guard";
import { isSsoAuthorityOrigin } from "@/lib/cross-domain-auth";
import { checkAuthoritySilently } from "@/lib/central-sso-client";
import { z } from "zod";

export const Route = createFileRoute("/auth/")({
  validateSearch: z
    .object({
      idle: z.enum(["1"]).optional(),
    })
    .parse,
  component: AuthLanding,
});

function cleanLegacyAuthUrl(idle?: "1") {
  if (typeof window === "undefined" || !window.location.search) return;
  const clean = idle === "1" ? "/auth?idle=1" : "/auth";
  if (`${window.location.pathname}${window.location.search}` !== clean) {
    window.history.replaceState({}, "", clean);
  }
}

function AuthLanding() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [resolving, setResolving] = useState(true);
  const t = useT();
  const { language } = useLanguage();
  const staffLabel =
    language === "en"
      ? "Create staff account"
      : language === "sv"
        ? "Skapa personalkonto"
        : "Luo henkilökunnan tili";

  useEffect(() => {
    let cancelled = false;

    async function resolveAuth() {
      cleanLegacyAuthUrl(search.idle);

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data.session) {
        window.location.replace(homeForRole(await roleOfCurrentUser()));
        return;
      }

      if (!isSsoAuthorityOrigin(window.location.origin)) {
        const transferred = await checkAuthoritySilently();
        if (cancelled) return;
        if (transferred) {
          window.location.replace(homeForRole(await roleOfCurrentUser()));
          return;
        }
      }

      setResolving(false);
    }

    void resolveAuth();
    return () => {
      cancelled = true;
    };
  }, [search.idle]);

  if (resolving) {
    return <div className="min-h-screen bg-background" aria-hidden="true" />;
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden flex items-center justify-center px-4 py-10">
      <CornerBlobs />
      <AuthLanguageSwitcher />
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-5xl font-bold">
            {language === "fi" ? "Vahvuusportfolio" : t("app.title")}
          </h1>
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
            onClick={() => navigate({ to: "/register-staff" })}
            className="w-full rounded-full bg-yellow hover:bg-yellow/90 text-ink font-bold py-6 text-base h-auto"
          >
            {staffLabel}
          </Button>
        </StickyNote>
      </div>
    </div>
  );
}
