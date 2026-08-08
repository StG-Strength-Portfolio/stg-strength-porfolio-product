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
    <div className="relative min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10">
      <CornerBlobs />
      <AuthLanguageSwitcher />
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold">{tr("Ylläpidon kirjautuminen")}</h1>
          <p className="mt-1 opacity-80">{tr("Näy hyvää! ylläpitojakso")}</p>
        </div>

        <StickyNote seed="superadmin-login">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sa-email">{tr("Sähköposti")}</Label>
              <Input
                id="sa-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sa-password">{tr("Salasana")}</Label>
              <Input
                id="sa-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {/* @lovable-new 2026-08-05 — Forgot password entry point for admins. */}
            <div className="text-right">
              <Link
                to="/superadmin/forgot-password"
                className="text-xs font-semibold text-[color:var(--purple)] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--purple)]"
              >
                {tr("Unohditko salasanasi?")}
              </Link>
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-[color:var(--purple)] hover:bg-[color:var(--purple)]/90 text-white font-bold py-6 text-base h-auto"
            >
              {tr("Kirjaudu ylläpitoon")}
            </Button>
          </form>
          <div className="mt-5 text-center text-xs">
            <Link to="/auth" className="font-semibold text-[color:var(--purple)] underline">
              {tr("Takaisin pääsivulle")}
            </Link>
          </div>
        </StickyNote>
      </div>
    </div>
  );
}
