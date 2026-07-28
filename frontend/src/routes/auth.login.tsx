import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
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
  const t = useT();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        if (next) {
          window.location.href = next;
        } else {
          navigate({ to: "/seikkailu", replace: true });
        }
      }
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
      const { data: u } = await supabase.auth.getUser();
      let isTeacher = false;
      if (u.user) {
        const { data: roleRow } = await supabase
          .from("user_roles" as never)
          .select("role")
          .eq("user_id", u.user.id)
          .eq("role", "teacher" as never)
          .maybeSingle();
        isTeacher = !!roleRow;
      }
      navigate({ to: isTeacher ? "/opettaja" : "/seikkailu", replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden flex items-center justify-center px-4 py-10">
      <CornerBlobs />
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

          <div className="mt-5 text-center text-xs text-muted-foreground">
            <Link to="/auth" className="font-semibold text-[color:var(--purple)] underline">
              {t("auth.login.newAccount")}
            </Link>
          </div>
        </StickyNote>
      </div>
    </div>
  );
}
