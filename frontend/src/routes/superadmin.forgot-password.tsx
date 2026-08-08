/**
 * @lovable-new 2026-08-05 — Super Admin "Forgot password?" screen. Sends a
 * Supabase Auth recovery link to /reset-password on the current origin and
 * always shows a privacy-safe generic confirmation (no account enumeration).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { AuthLanguageSwitcher } from "@/components/AuthLanguageSwitcher";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/superadmin/forgot-password")({
  head: () => ({
    meta: [
      { title: "Salasanan palautus — Vahvuusseikkailu ylläpito" },
      {
        name: "description",
        content: "Pyydä salasanan palautuslinkki Vahvuusseikkailun ylläpitotilille.",
      },
      { property: "og:title", content: "Salasanan palautus — Vahvuusseikkailu ylläpito" },
      { property: "og:description", content: "Pyydä salasanan palautuslinkki ylläpitotilille." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SuperAdminForgotPassword,
});

const COOLDOWN_SECONDS = 30;

function SuperAdminForgotPassword() {
  const tr = useTr();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(tr("Tarkista sähköpostiosoite."));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password?source=superadmin`,
      });
      // Always the same result, whether or not the account exists.
      setSent(true);
      setCooldown(COOLDOWN_SECONDS);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <CornerBlobs />
      <AuthLanguageSwitcher />
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold">{tr("Salasanan palautus")}</h1>
          <p className="mt-1 opacity-80">{tr("Näy hyvää! ylläpitojakso")}</p>
        </div>

        <StickyNote seed="superadmin-forgot">
          {sent ? (
            <div className="space-y-4">
              <p className="text-sm">
                {tr(
                  "Jos sähköpostiosoite löytyy järjestelmästä, salasanan palautuslinkki on lähetetty.",
                )}
              </p>
              <Button
                type="button"
                disabled={cooldown > 0}
                onClick={() => setSent(false)}
                className="w-full rounded-full bg-[color:var(--purple)] py-6 text-base font-bold text-white hover:bg-[color:var(--purple)]/90"
              >
                {cooldown > 0
                  ? `${tr("Lähetä uudelleen")} (${cooldown})`
                  : tr("Lähetä uudelleen")}
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sa-forgot-email">{tr("Sähköposti")}</Label>
                <Input
                  id="sa-forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="h-auto w-full rounded-full bg-[color:var(--purple)] py-6 text-base font-bold text-white hover:bg-[color:var(--purple)]/90"
              >
                {busy ? tr("Lähetetään…") : tr("Lähetä palautuslinkki")}
              </Button>
            </form>
          )}
          <div className="mt-5 text-center text-xs">
            <Link
              to="/superadmin/login"
              className="font-semibold text-[color:var(--purple)] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--purple)]"
            >
              {tr("Takaisin ylläpidon kirjautumiseen")}
            </Link>
          </div>
        </StickyNote>
      </div>
    </div>
  );
}
