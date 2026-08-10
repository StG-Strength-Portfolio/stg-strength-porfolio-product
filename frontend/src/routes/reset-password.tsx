import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { AuthLanguageSwitcher } from "@/components/AuthLanguageSwitcher";
import { toast } from "sonner";
import { useT, useTr } from "@/lib/i18n";
import { z } from "zod";

// How long we wait for Supabase to parse the recovery token out of the URL
// hash and establish a session before concluding the link is missing/expired.
const RECOVERY_WAIT_MS = 4000;

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Salasanan palautus — Vahvuusseikkailu" },
      { name: "description", content: "Aseta uusi salasana Vahvuusseikkailu-tilillesi." },
      { property: "og:title", content: "Salasanan palautus — Vahvuusseikkailu" },
      { property: "og:description", content: "Aseta uusi salasana Vahvuusseikkailu-tilillesi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  // ?source=superadmin keeps Super Admin recovery inside the Super Admin
  // surface (post-reset redirect target, "request a new link" link, etc).
  validateSearch: (search: Record<string, unknown>) =>
    z
      .object({
        source: z
          .string()
          .optional()
          .transform((v) => (v === "superadmin" ? ("superadmin" as const) : undefined)),
      })
      .parse(search),
  ssr: false,
  component: ResetPasswordPage,
});

type SessionState = "checking" | "ready" | "invalid";

function ResetPasswordPage() {
  const t = useT();
  const tr = useTr();
  const navigate = useNavigate();
  const { source } = Route.useSearch();
  const isSuperAdmin = source === "superadmin";
  const loginTo = isSuperAdmin ? "/superadmin/login" : "/auth/login";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>("checking");

  // Supabase-js parses the #access_token=...&type=recovery hash on mount and
  // fires an auth event once the recovery session is established. We can't
  // just check getSession() once on mount — that races the hash parsing — so
  // we listen for the event AND poll getSession(), and only give up after a
  // grace period (covers a genuinely missing/expired/already-used link, or
  // someone landing here with no token at all).
  useEffect(() => {
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled && session) setSessionState("ready");
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) setSessionState("ready");
    });

    const timeout = setTimeout(() => {
      if (!cancelled) {
        setSessionState((prev) => (prev === "ready" ? prev : "invalid"));
      }
    }, RECOVERY_WAIT_MS);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error(tr("Salasanan tulee olla vähintään 6 merkkiä."));
      return;
    }
    if (password !== confirm) {
      toast.error(tr("Salasanat eivät täsmää."));
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        const m = error.message.toLowerCase();
        if (m.includes("expired") || m.includes("invalid") || m.includes("session")) {
          setSessionState("invalid");
          toast.error(tr("Palautuslinkki on vanhentunut tai jo käytetty."));
        } else if (m.includes("weak") || m.includes("password") || m.includes("short")) {
          toast.error(tr("Salasanan tulee olla vähintään 6 merkkiä."));
        } else {
          toast.error(error.message);
        }
        return;
      }
      setDone(true);
      toast.success(tr("Salasana vaihdettu! Voit nyt kirjautua sisään."));
      setTimeout(() => {
        void navigate({ to: loginTo, replace: true });
      }, 3000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <CornerBlobs />
      <AuthLanguageSwitcher />
      <div className="relative z-10 w-full max-w-md space-y-6">
        <h1 className="text-center text-3xl font-bold">{tr("Salasanan palautus")}</h1>
        <StickyNote seed="reset-card">
          {sessionState === "checking" ? (
            <p className="text-center font-semibold opacity-70">{t("common.loading")}</p>
          ) : sessionState === "invalid" ? (
            <div className="space-y-4 text-center">
              <p className="font-semibold">
                {tr("Palautuslinkki on vanhentunut tai jo käytetty.")}
              </p>
              <Link
                to={loginTo}
                className="inline-block rounded-full bg-[color:var(--purple)] px-5 py-2 text-sm font-bold text-white"
              >
                {tr("Pyydä uusi palautuslinkki")}
              </Link>
            </div>
          ) : done ? (
            <div className="space-y-4 text-center">
              <p className="font-semibold">
                {tr("Salasana vaihdettu! Voit nyt kirjautua sisään.")}
              </p>
              <Link
                to={loginTo}
                className="inline-block rounded-full bg-[color:var(--purple)] px-5 py-2 text-sm font-bold text-white"
              >
                {t("common.login")}
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">{tr("Uusi salasana")}</Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">{tr("Vahvista salasana")}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="h-auto w-full rounded-full bg-[color:var(--purple)] py-6 text-base font-bold text-white hover:bg-[color:var(--purple)]/90"
              >
                {busy ? t("auth.login.busy") : tr("Tallenna")}
              </Button>
            </form>
          )}
        </StickyNote>
      </div>
    </div>
  );
}
