import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { AuthLanguageSwitcher } from "@/components/AuthLanguageSwitcher";
import { ForgotPasswordDialog } from "@/components/ForgotPasswordDialog";
import { toast } from "sonner";
import { useLanguage, useT, useTr } from "@/lib/i18n";
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

const unconfirmedEmailCopy = {
  fi: "Sähköpostiosoitettasi ei ole vielä vahvistettu. Avaa sähköposti ja napsauta vahvistuslinkkiä. Linkki avaa palvelun automaattisesti.",
  en: "Your email address has not been confirmed yet. Open your email and click the confirmation link. The link will open the platform automatically.",
  sv: "Din e-postadress är inte bekräftad ännu. Öppna e-postmeddelandet och klicka på bekräftelselänken. Länken öppnar tjänsten automatiskt.",
} as const;

function LoginPage() {
  const navigate = useNavigate();
  const next = Route.useSearch().next ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const t = useT();
  const tr = useTr();
  const { language } = useLanguage();

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
        const errorText = `${error.code ?? ""} ${error.message}`.toLowerCase();
        const isUnconfirmed =
          errorText.includes("email_not_confirmed") ||
          errorText.includes("email not confirmed") ||
          errorText.includes("email not verified");
        toast.error(isUnconfirmed ? unconfirmedEmailCopy[language] : t("auth.login.wrong"));
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
