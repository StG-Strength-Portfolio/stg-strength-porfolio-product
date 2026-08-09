import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const tr = useTr();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

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
        toast.error(error.message);
        return;
      }
      setDone(true);
      toast.success(tr("Salasana vaihdettu! Voit nyt kirjautua sisään."));
      setTimeout(() => {
        void navigate({ to: "/auth/login", replace: true });
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
          {done ? (
            <p className="text-center font-semibold">
              {tr("Salasana vaihdettu! Voit nyt kirjautua sisään.")}
            </p>
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
