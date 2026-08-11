import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { toast } from "sonner";
import { getStudentClassMembership } from "@/lib/auth-helpers";
import { useLanguage, useT, isLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/liity-yhteisoon")({
  component: JoinCommunityPage,
});

function JoinCommunityPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const t = useT();
  const { setLanguage } = useLanguage();

  useEffect(() => {
    getStudentClassMembership().then((m) => {
      if (m) {
        navigate({ to: "/seikkailu", replace: true });
      } else {
        setChecking(false);
      }
    });
  }, [navigate]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc(
        "join_class" as never,
        { p_join_code: code } as never,
      );
      if (error) throw error;
      const result = data as {
        ok: boolean;
        error?: string;
        class_name?: string;
        language?: string;
      };
      if (!result?.ok) {
        toast.error(t("join.err.notFound"));
        return;
      }
      // Adopt the class language immediately.
      if (isLanguage(result.language)) setLanguage(result.language);
      toast.success(t("join.success", { name: result.class_name ?? "" }));
      navigate({ to: "/seikkailu", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center text-foreground">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden flex items-center justify-center px-4 py-10">
      <CornerBlobs />
      <button
        onClick={signOut}
        className="absolute top-4 right-4 z-20 text-sm opacity-80 hover:opacity-100 underline"
      >
        {t("common.logout")}
      </button>
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-5xl font-bold">{t("join.title")}</h1>
          <p className="mt-2 opacity-90">{t("join.subtitle")}</p>
        </div>
        <StickyNote seed="join-card">
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">{t("join.codeLabel")}</Label>
              <Input
                id="code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={t("join.codePh")}
                className="uppercase tracking-wider"
                autoComplete="off"
              />
            </div>
            <Button
              type="submit"
              disabled={busy || !code.trim()}
              className="w-full rounded-full bg-[color:var(--coral)] hover:bg-[color:var(--coral)]/90 text-white font-bold py-6 text-base"
            >
              {busy ? t("join.busy") : t("join.submit")}
            </Button>
          </form>
          <p className="mt-5 text-xs text-muted-foreground">{t("join.hint")}</p>
        </StickyNote>
      </div>
    </div>
  );
}
