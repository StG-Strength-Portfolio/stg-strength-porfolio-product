import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { AuthLanguageSwitcher } from "@/components/AuthLanguageSwitcher";
import { toast } from "sonner";
import { useTr } from "@/lib/i18n";

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
  // @lovable-new 2026-08-05 — ?source=superadmin keeps Super Admin recovery
  // inside the Super Admin surface (links, wording and post-reset redirect).
  validateSearch: (search: Record<string, unknown>) => ({
    source: search['source'] === "superadmin" ? ("superadmin" as const) : undefined,
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const tr = useTr();
  const navigate = useNavigate();
  const { source } = useSearch({ from: "/reset-password" });
  const isSuperAdmin = source === "superadmin";
  const loginTo = isSuperAdmin ? "/superadmin/login" : "/auth/login";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  // @lovable-new 2026-08-05 — recovery-session state: the page must not offer a
  // password form when the recovery link is missing, expired or already used.
  const [session, setSession] = useState<"checking" | "ready" | "invalid">("checking");

  useEffect(() => {
    let cancelled = false;
    // Supabase parses the recovery hash and emits PASSWORD_RECOVERY / a session.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!cancelled && s) setSession("ready");
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession((prev) => (data.session ? "ready" : prev === "ready" ? prev : "invalid"));
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
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
          setSession("invalid");
          toast.error(tr("Palautuslinkki on vanhentunut tai jo käytetty."));
        } else if (m.includes("weak") || m.includes("password")) {
          toast.error(tr("Salasanan tulee olla vähintään 6 merkkiä."));
        } else {
          toast.error(tr("Salasanan vaihto epäonnistui. Yritä uudelleen."));
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
          {session === "checking" ? (
            <p className="text-center font-semibold opacity-70">{tr("Ladataan…")}</p>
          ) : session === "invalid" ? (
            <div className="space-y-4 text-center">
              <p className="font-semibold">
                {tr("Palautuslinkki on vanhentunut tai jo käytetty.")}
              </p>
              <Link
                to={isSuperAdmin ? "/superadmin/forgot-password" : "/auth/login"}
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
                {tr("Kirjaudu sisään")}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">{tr("Vahvista salasana")}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
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
                {tr("Tallenna")}
              </Button>
            </form>
          )}
        </StickyNote>
      </div>
    </div>
  );
}
