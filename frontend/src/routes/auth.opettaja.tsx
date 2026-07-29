import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/auth/opettaja")({
  component: TeacherSignup,
});

function TeacherSignup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [school, setSchool] = useState("");
  const [teacherCode, setTeacherCode] = useState("");
  const [busy, setBusy] = useState(false);
  const t = useT();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (teacherCode.trim() !== "OPETTAJA-2026") {
      toast.error(t("auth.teacher.err.badCode"));
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { school: school.trim(), display_name: displayName.trim() },
        },
      });
      if (error) throw error;
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        await supabase.auth.signInWithPassword({ email, password });
      }
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { error: profileErr } = await supabase
          .from("profiles" as never)
          .upsert({ id: u.user.id, display_name: displayName.trim() } as never);
        if (profileErr) {
          console.error("Failed to save display name:", profileErr);
        }
      }
      const { data, error: rpcErr } = await supabase.rpc(
        "claim_teacher_role" as never,
        { p_code: teacherCode.trim() } as never,
      );
      if (rpcErr) throw rpcErr;
      if (data !== true) {
        toast.error(t("auth.teacher.err.badCode"));
        await supabase.auth.signOut();
        return;
      }
      navigate({ to: "/opettaja", replace: true });
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
          <h1 className="text-4xl font-bold">{t("auth.teacher.title")}</h1>
        </div>

        <StickyNote seed="teacher-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("common.email")}</Label>
              <Input
                id="email" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@school.example" autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("common.password")}</Label>
              <Input
                id="password" type="password" required minLength={6} value={password}
                onChange={(e) => setPassword(e.target.value)} autoComplete="new-password"
              />
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
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="school">{t("auth.teacher.school")}</Label>
              <Input
                id="school" required value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder={t("auth.teacher.schoolPh")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">{t("auth.teacher.teacherCode")}</Label>
              <Input
                id="code" required value={teacherCode}
                onChange={(e) => setTeacherCode(e.target.value)}
                placeholder={t("auth.teacher.teacherCodePh")}
              />
            </div>
            <Button
              type="submit" disabled={busy}
              className="w-full rounded-full bg-[color:var(--coral)] hover:bg-[color:var(--coral)]/90 text-white font-bold py-6 text-base"
            >
              {busy ? t("auth.login.busy") : t("auth.teacher.submit")}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            {t("auth.teacher.hasAccount")}{" "}
            <Link to="/auth/login" className="font-semibold text-[color:var(--purple)] underline">
              {t("common.login")}
            </Link>
          </p>
        </StickyNote>
      </div>
    </div>
  );
}