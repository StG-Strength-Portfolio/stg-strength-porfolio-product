import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StickyNote } from "@/components/StickyNote";
import { UserIcon } from "@/components/icons/AppIcons";
import { supabase } from "@/integrations/supabase/client";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/student/profile")({
  component: StudentProfilePage,
  head: () => ({
    meta: [
      { title: "Profiili — Vahvuusseikkailu" },
      { name: "description", content: "Muokkaa nimeäsi, sähköpostiasi ja salasanaasi Vahvuusseikkailussa." },
      { property: "og:title", content: "Profiili — Vahvuusseikkailu" },
      { property: "og:description", content: "Muokkaa nimeäsi, sähköpostiasi ja salasanaasi Vahvuusseikkailussa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function initialsOf(name: string, email: string): string {
  const src = name.trim() || email.trim();
  if (!src) return "?";
  const parts = src.split(/[\s.@_-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

function StudentProfilePage() {
  const tr = useTr();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      setOriginalEmail(u.user.email ?? "");
      const { data: prof } = await supabase
        .from("profiles" as never)
        .select("display_name")
        .eq("id", u.user.id)
        .maybeSingle();
      setName((prof as { display_name?: string | null } | null)?.display_name ?? "");
      setLoading(false);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(tr("Nimi ei voi olla tyhjä"));
      return;
    }
    if (password) {
      if (password.length < 8) {
        toast.error(tr("Salasanan pitää olla vähintään 8 merkkiä"));
        return;
      }
      if (password !== confirm) {
        toast.error(tr("Salasanat eivät täsmää"));
        return;
      }
    }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { error: pErr } = await supabase
        .from("profiles" as never)
        .update({ display_name: name.trim() } as never)
        .eq("id", u.user.id);
      if (pErr) throw pErr;

      const patch: { email?: string; password?: string } = {};
      if (email && email !== originalEmail) patch.email = email.trim();
      if (password) patch.password = password;
      if (Object.keys(patch).length) {
        const { error } = await supabase.auth.updateUser(patch);
        if (error) throw error;
        if (patch.email) toast(tr("Vahvista uusi sähköposti postilaatikostasi"));
      }
      setPassword("");
      setConfirm("");
      toast.success(tr("Tallennettu!"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <h1 className="flex items-center gap-2 font-display text-3xl">
        <UserIcon size={24} /> {tr("Profiili")}
      </h1>

      <StickyNote seed="student-profile" className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--purple)] font-display text-2xl uppercase text-white shadow-md">
            {loading ? "…" : initialsOf(name, email)}
          </div>
          <div>
            <div className="font-display text-xl">{name || tr("Nimi")}</div>
            <div className="text-sm opacity-70">{email}</div>
          </div>
        </div>

        <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="sp-name">{tr("Nimi")}</Label>
            <Input id="sp-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sp-mail">{tr("Sähköposti")}</Label>
            <Input
              id="sp-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sp-pass">{tr("Uusi salasana")}</Label>
            <Input
              id="sp-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sp-pass2">{tr("Vahvista salasana")}</Label>
            <Input
              id="sp-pass2"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="md:col-span-2">
            <Button
              type="submit"
              disabled={busy}
              className="rounded-full bg-[color:var(--purple)] font-bold text-white hover:bg-[color:var(--purple)]/90"
            >
              {tr("Tallenna")}
            </Button>
          </div>
        </form>
      </StickyNote>
    </div>
  );
}
