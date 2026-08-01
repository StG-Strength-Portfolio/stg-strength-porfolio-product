import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { homeForRole, roleOfCurrentUser } from "@/lib/role-guard";
import { z } from "zod";

export const Route = createFileRoute("/auth/login")({
  validateSearch: z
    .object({
      next: z
        .string()
        .refine((v) => v.startsWith("/") && !v.startsWith("//"))
        .optional(),
    })
    .default({}),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const next = Route.useSearch().next ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const t = useT();
  const tr = useTr();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      if (next) {
        window.location.href = next;
        return;
      }
      window.location.href = homeForRole(await roleOfCurrentUser());
    });
  }, [navigate, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(t("auth.login.wrong"));
        return;
      }
      if (next) {
        window.location.href = next;
        return;
      }
      window.location.href = homeForRole(await roleOfCurrentUser());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden flex items-center justify-center px-4 py-10">
      <CornerBlobs />
      <AuthLanguageSwitcher />
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold">{t("auth.login.title")}</h1>
        </div>

        <StickyNote seed="login-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("common.email")}</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.student.emailPh")}
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("common.password")}</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-[color:var(--purple)] hover:bg-[color:var(--purple)]/90 text-white font-bold py-6 text-base h-auto"
            >
              {busy ? t("auth.login.busy") : t("auth.login.submit")}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between gap-3">
            <a
              href="/auth"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-[color:var(--purple)]"
            >
              {tr("Takaisin")}
            </a>
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-[color:var(--purple)]"
            >
              {tr("Unohditko salasanan?")}
            </button>
          </div>
        </StickyNote>

        {forgotOpen && <ForgotPasswordDialog onClose={() => setForgotOpen(false)} />}


      </div>
    </div>
  );
}

function ForgotPasswordDialog({ onClose }: { onClose: () => void }) {
  const tr = useTr();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(tr("Sähköpostia ei löytynyt."));
        return;
      }
      setSent(true);
      toast.success(tr("Palautuslinkki lähetetty sähköpostiisi."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-slate-900 shadow-2xl">
        <h2 className="font-display text-xl">{tr("Salasanan palautus")}</h2>
        {sent ? (
          <p className="mt-3 text-sm">{tr("Palautuslinkki lähetetty sähköpostiisi.")}</p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email">{tr("Sähköpostiosoitteesi")}</Label>
              <Input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-[color:var(--purple)] font-bold text-white hover:bg-[color:var(--purple)]/90"
            >
              {tr("Lähetä palautuslinkki")}
            </Button>
          </form>
        )}
        <Button variant="ghost" className="mt-3 w-full rounded-full" onClick={onClose}>
          {tr("Sulje")}
        </Button>
      </div>
    </div>
  );
}
