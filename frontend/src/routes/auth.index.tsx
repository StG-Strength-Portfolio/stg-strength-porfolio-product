import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { Button } from "@/components/ui/button";
import { AuthLanguageSwitcher } from "@/components/AuthLanguageSwitcher";
import { useLanguage, useT } from "@/lib/i18n";
import { homeForRole, roleOfCurrentUser } from "@/lib/role-guard";
import { otherStrengthPortfolioOrigin, safeAuthReturnPath } from "@/lib/cross-domain-auth";
import { z } from "zod";

export const Route = createFileRoute("/auth/")({
  validateSearch: z
    .object({
      idle: z.enum(["1"]).optional(),
      sso: z.enum(["miss"]).optional(),
      token_hash: z.string().optional(),
      type: z.enum(["email", "magiclink"]).optional(),
      returnTo: z.enum(["/auth", "/auth/login"]).optional(),
    })
    .parse,
  component: AuthLanding,
});

function AuthLanding() {
  const navigate = useNavigate();
  const search = Route.useSearch();
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
      if (search.token_hash && search.type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: search.token_hash,
          type: search.type,
        });

        if (cancelled) return;

        if (error) {
          console.error("[cross-domain-auth] Handoff verification failed", error);
          window.location.replace(`${safeAuthReturnPath(search.returnTo)}?sso=miss`);
          return;
        }

        window.history.replaceState({}, "", "/auth");
        window.location.replace(homeForRole(await roleOfCurrentUser()));
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data.session) {
        window.location.href = homeForRole(await roleOfCurrentUser());
        return;
      }

      if (search.sso === "miss") return;

      const otherOrigin = otherStrengthPortfolioOrigin(window.location.origin);
      if (!otherOrigin) return;

      const bridge = new URL("/auth/cross-domain", otherOrigin);
      bridge.searchParams.set("target", window.location.origin);
      bridge.searchParams.set("returnTo", "/auth");
      window.location.replace(bridge.toString());
    }

    void resolveAuth();
    return () => {
      cancelled = true;
    };
  }, [navigate, search.returnTo, search.sso, search.token_hash, search.type]);

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
