import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StickyNote } from "@/components/StickyNote";
import { AuthLanguageSwitcher } from "@/components/AuthLanguageSwitcher";
import { ForgotPasswordDialog } from "@/components/ForgotPasswordDialog";
import { toast } from "sonner";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/superadmin/login")({
  head: () => ({
    meta: [
      { title: "Super Admin Login — Vahvuusseikkailu" },
      {
        name: "description",
        content:
          "See the Good! admin portal sign-in for managing schools, billing and user accounts.",
      },
      { property: "og:title", content: "Super Admin Login — Vahvuusseikkailu" },
      { property: "og:description", content: "See the Good! admin portal sign-in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SuperAdminLogin,
});

function SuperAdminLogin() {
  const tr = useTr();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: signIn, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !signIn.user) {
        toast.error(tr("Kirjautuminen epäonnistui."));
        return;
      }
      const { data: roleRow } = await supabase
        .from("user_roles" as never)
        .select("role")
        .eq("user_id", signIn.user.id)
        .maybeSingle();
      if ((roleRow as { role?: string } | null)?.role !== "super_admin") {
        toast.error(tr("Sinulla ei ole ylläpito-oikeuksia."));
        await supabase.auth.signOut();
        return;
      }
      navigate({ to: "/superadmin/dashboard", replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <AuthLanguageSwitcher />
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{tr("Ylläpidon kirjautuminen")}</h1>
          <p className="mt-1 text-sm text-slate-500">{tr("Näy hyvää! ylläpitojakso")}</p>
        </div>

        <StickyNote seed="superadmin-login">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sa-email">{tr("Sähköposti")}</Label>
              <Input id="sa-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sa-password">{tr("Salasana")}</Label>
              <Input id="sa-password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="h-11 w-full rounded-lg bg-[color:var(--purple)] text-sm font-semibold text-white shadow-none hover:bg-[color:var(--purple)]/90"
            >
              {tr("Kirjaudu ylläpitoon")}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between gap-3">
            <Link to="/auth" className="text-xs font-medium text-[color:var(--purple)] hover:underline">
              {tr("Takaisin pääsivulle")}
            </Link>
            <button type="button" onClick={() => setForgotOpen(true)} className="text-xs font-medium text-slate-500 hover:text-[color:var(--purple)] hover:underline">
              {tr("Unohditko salasanan?")}
            </button>
          </div>
        </StickyNote>

        {forgotOpen && <ForgotPasswordDialog onClose={() => setForgotOpen(false)} source="superadmin" />}
      </div>
    </div>
  );
}
