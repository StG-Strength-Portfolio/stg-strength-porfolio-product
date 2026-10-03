import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StickyNote } from "@/components/StickyNote";
import { Button } from "@/components/ui/button";
import { AuthLanguageSwitcher } from "@/components/AuthLanguageSwitcher";
import { useLanguage, useT } from "@/lib/i18n";
import { homeForRole, roleOfCurrentUser } from "@/lib/role-guard";
import { hasRecentAuthorityMiss, isSsoAuthorityOrigin } from "@/lib/cross-domain-auth";
import {
  seedAuthorityAndContinue,
  startAuthorityCheck,
  startLegacyAuthorityDiscovery,
} from "@/lib/central-sso-client";
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
        const home = homeForRole(await roleOfCurrentUser());
        if (!isSsoAuthorityOrigin(window.location.origin)) {
          const seeding = await seedAuthorityAndContinue(data.session, home);
          if (seeding || cancelled) return;
        }
        window.location.replace(home);
        return;
      }

      if (hasRecentAuthorityMiss()) {
        setResolving(false);
        return;
      }

      if (isSsoAuthorityOrigin(window.location.origin)) {
        if (!startLegacyAuthorityDiscovery("auth")) setResolving(false);
        return;
      }

      if (!startAuthorityCheck("auth")) setResolving(false);
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <AuthLanguageSwitcher />
      <div className="relative z-10 w-full max-w-md space-y-7">
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            {language === "fi" ? "Vahvuusportfolio" : t("app.title")}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{t("app.tagline")}</p>
        </div>

        {search.idle && (
          <StickyNote tone="yellow" seed="idle" className="text-sm">
            {t("auth.idle.expired")}
          </StickyNote>
        )}

        <StickyNote seed="landing-card" className="space-y-3 text-center">
          <Button
            onClick={() => navigate({ to: "/auth/login" })}
            className="h-11 w-full rounded-lg bg-[color:var(--purple)] text-sm font-semibold text-white hover:bg-[color:var(--purple)]/90"
          >
            {t("auth.landing.loginBtn")}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/auth/student" })}
            className="h-11 w-full rounded-lg border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
          >
            {t("auth.landing.signupBtn")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate({ to: "/register-staff" })}
            className="h-11 w-full rounded-lg text-sm font-semibold text-[color:var(--purple)] hover:bg-purple-50 hover:text-[color:var(--purple)]"
          >
            {staffLabel}
          </Button>
        </StickyNote>
      </div>
    </div>
  );
}
