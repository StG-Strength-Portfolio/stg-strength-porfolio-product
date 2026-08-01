import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { AuthLanguageSwitcher } from "@/components/AuthLanguageSwitcher";
import { toast } from "sonner";
import { useTr, useLanguage, isLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/register-teacher")({
  head: () => ({
    meta: [
      { title: "Create teacher account — Vahvuusseikkailu" },
      {
        name: "description",
        content:
          "Register as a teacher with your school code and guide your class through the Vahvuusseikkailu strengths adventure.",
      },
      { property: "og:title", content: "Create teacher account — Vahvuusseikkailu" },
      {
        property: "og:description",
        content: "Register as a teacher with your school code to start the strengths adventure.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegisterTeacher,
});

function RegisterTeacher() {
  const navigate = useNavigate();
  const tr = useTr();
  const { setLanguage } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = schoolCode.trim().toUpperCase();
    const fullName = name.trim();
    if (!email.trim() || !email.includes("@")) {
      toast.error(tr("Tarkista sähköpostiosoite."));
      return;
    }
    if (password.length < 8) {
      toast.error(tr("Salasana on liian heikko."));
      return;
    }
    if (!fullName) {
      toast.error(tr("Nimi"));
      return;
    }
    if (!code) {
      toast.error(tr("Anna koulukoodi."));
      return;
    }

    setBusy(true);
    try {
      const { error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: fullName, name: fullName, role: "teacher" },
        },
      });
      if (signUpErr) {
        const msg = signUpErr.message.toLowerCase();
        if (msg.includes("already registered") || msg.includes("already been registered")) {
          toast.error(tr("Tämä sähköposti on jo käytössä."));
        } else if (msg.includes("password")) {
          toast.error(tr("Salasana on liian heikko."));
        } else {
          toast.error(signUpErr.message);
        }
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
        await supabase
          .from("profiles" as never)
          .upsert({ id: u.user.id, display_name: fullName } as never);
      }

      const { data: rpcData, error: rpcErr } = await supabase.rpc(
        "register_teacher_with_any_code" as never,
        { p_code: code } as never,
      );
      if (rpcErr) throw rpcErr;
      const res = rpcData as { ok?: boolean; language?: string } | null;
      if (!res?.ok) {
        toast.error(tr("Virheellinen koulukoodi. Tarkista koodi ja yritä uudelleen."));
        await supabase.auth.signOut();
        return;
      }
      if (isLanguage(res.language)) setLanguage(res.language);
      navigate({ to: "/teacher/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
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
          <h1 className="text-4xl font-bold">{tr("Luo opettajatili")}</h1>
          <p className="mt-2 opacity-90">{tr("Liity seikkailuun koulukoodillasi")}</p>
        </div>

        <StickyNote seed="teacher-register-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{tr("Sähköposti")}</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={tr("etunimi.sukunimi@koulu.fi")}
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{tr("Salasana")}</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tr("Luo vahva salasana")}
                autoComplete="new-password"
              />
              <p className="text-sm text-muted-foreground">
                {tr("Vähintään 8 merkkiä. Sisällytä kirjaimia, numeroita ja erikoismerkkejä.")}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">{tr("Nimi (Etunimi Sukunimi)")}</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tr("esim. Anna Virtanen")}
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schoolCode">{tr("Koulukoodi")}</Label>
              <Input
                id="schoolCode"
                required
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                placeholder={tr("esim. SCHOOL001")}
              />
              <p className="text-sm text-muted-foreground">
                {tr("Sait koulukoodin koulusi yhteyshenkilöltä.")}
              </p>
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-[color:var(--coral)] hover:bg-[color:var(--coral)]/90 text-white font-bold py-6 text-base h-auto"
            >
              {busy ? tr("Rekisteröidytään…") : tr("Rekisteröidy opettajaksi")}
            </Button>
          </form>

          <div className="mt-5 flex justify-between text-xs text-muted-foreground">
            <Link to="/auth/login" className="font-semibold text-[color:var(--purple)] underline">
              {tr("Takaisin")}
            </Link>
            <Link to="/auth/login" className="font-semibold text-[color:var(--purple)] underline">
              {tr("Kirjaudu sisään")}
            </Link>
          </div>
        </StickyNote>
      </div>
    </div>
  );
}
