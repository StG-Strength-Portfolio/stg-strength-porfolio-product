import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { toast } from "sonner";
import { useT, useLanguage, isLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/auth/student")({
  component: StudentSignup,
});

function StudentSignup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const t = useT();
  const { setLanguage } = useLanguage();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/seikkailu", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    const name = displayName.trim();
    if (!email.trim() || !email.includes("@")) {
      toast.error(t("auth.student.err.emailInvalid"));
      return;
    }
    if (password.length < 8) {
      toast.error(t("auth.student.err.passwordShort"));
      return;
    }
    if (!name) {
      toast.error(t("auth.student.err.nameMissing"));
      return;
    }
    if (!code) {
      toast.error(t("auth.student.err.codeMissing"));
      return;
    }
    setBusy(true);
    try {
      const { error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: name },
        },
      });
      if (signUpErr) {
        const msg = signUpErr.message;
        toast.error(
          msg.includes("already registered") ? t("auth.student.err.emailTaken") : msg,
        );
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) {
          toast.error(signInErr.message);
          return;
        }
      }
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { error: profileErr } = await supabase
          .from("profiles" as never)
          .upsert({ id: u.user.id, display_name: name } as never);
        if (profileErr) {
          console.error("Failed to save display name:", profileErr);
        }
      }
      const { data: rpcData, error: rpcErr } = await supabase.rpc(
        "join_class" as never,
        { p_join_code: code } as never,
      );
      if (rpcErr) throw rpcErr;
      const res = rpcData as { ok?: boolean; error?: string; language?: string } | null;
      if (!res?.ok) {
        toast.error(t("auth.student.err.codeInvalid"));
        await supabase.auth.signOut();
        return;
      }
      // Inherit and lock the class language for this student.
      if (isLanguage(res.language)) setLanguage(res.language);
      navigate({ to: "/liity-yhteisoon", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden flex items-center justify-center px-4 py-10">
      <CornerBlobs />
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold">{t("auth.student.title")}</h1>
          <p className="mt-2 opacity-90">{t("auth.student.subtitle")}</p>
        </div>

        <StickyNote seed="student-signup-card">
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
                placeholder={t("auth.student.passwordPh")}
                autoComplete="new-password"
              />
              <p className="text-sm text-muted-foreground">
                {t("auth.student.passwordHint")}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="displayName">{t("auth.student.nameLabel")}</Label>
              <Input
                id="displayName"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("auth.student.namePh")}
                autoComplete="name"
              />
              <p className="text-sm text-muted-foreground">
                {t("auth.student.nameHint")}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">{t("auth.student.codeLabel")}</Label>
              <Input
                id="code"
                required
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder={t("auth.student.codePh")}
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-[color:var(--coral)] hover:bg-[color:var(--coral)]/90 text-white font-bold py-6 text-base"
            >
              {busy ? t("auth.login.busy") : t("auth.student.submit")}
            </Button>
          </form>

          <div className="mt-5 flex justify-between text-xs text-muted-foreground">
            <Link to="/auth" className="font-semibold text-[color:var(--purple)] underline">
              {t("common.back")}
            </Link>
            <Link to="/auth/login" className="font-semibold text-[color:var(--purple)] underline">
              {t("common.login")}
            </Link>
          </div>
        </StickyNote>
      </div>
    </div>
  );
}
