import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { useTr, LANGUAGES, LANGUAGE_LABEL, type Language } from "@/lib/i18n";
import { toast } from "sonner";
import { Copy } from "lucide-react";

export const Route = createFileRoute("/admin/schools")({
  component: AdminSchoolsPage,
  head: () => ({
    meta: [
      { title: "Koulujen hallinta — Vahvuusseikkailu" },
      {
        name: "description",
        content:
          "Luo ja hallinnoi koulukoodeja, joilla opettajat rekisteröityvät Vahvuusseikkailuun.",
      },
      { property: "og:title", content: "Koulujen hallinta — Vahvuusseikkailu" },
      {
        property: "og:description",
        content: "Ylläpitäjän näkymä koulukoodien hallintaan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type School = {
  id: string;
  name: string;
  code: string;
  language: string;
  is_active: boolean;
  created_at: string;
};

function AdminSchoolsPage() {
  const tr = useTr();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<Language>("fi");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("schools" as never)
      .select("*")
      .order("created_at", { ascending: false });
    setSchools((data ?? []) as unknown as School[]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      const { data } = await supabase
        .from("user_roles" as never)
        .select("role")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      const role = (data as { role?: string } | null)?.role;
      if (role !== "admin") {
        navigate({ to: "/", replace: true });
        return;
      }
      if (cancelled) return;
      await load();
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, load]);

  async function addSchool(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("schools" as never).insert({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      language,
      is_active: true,
    } as never);
    setBusy(false);
    if (error) {
      toast.error(error.code === "23505" ? tr("Tämä koulukoodi on jo käytössä.") : error.message);
      return;
    }
    toast.success(tr("Koulu lisätty onnistuneesti!"));
    setName("");
    setCode("");
    void load();
  }

  async function toggleActive(school: School) {
    const { error } = await supabase
      .from("schools" as never)
      .update({ is_active: !school.is_active } as never)
      .eq("id", school.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void load();
  }

  if (!ready) return null;

  return (
    <div className="relative min-h-screen bg-background text-foreground px-4 py-10">
      <CornerBlobs />
      <div className="relative z-10 mx-auto w-full max-w-5xl space-y-6">
        <header>
          <h1 className="text-4xl font-bold">{tr("Koulujen hallinta")}</h1>
          <p className="mt-1 opacity-90">
            {tr("Luo ja hallinnoi koulukoodeja opettajien rekisteröitymistä varten")}
          </p>
        </header>

        <StickyNote seed="admin-add-school" className="space-y-4">
          <form onSubmit={addSchool} className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="school-name">{tr("Koulun nimi")}</Label>
              <Input
                id="school-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tr("esim. Helsingin lukio")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="school-code">{tr("Koulukoodi")}</Label>
              <Input
                id="school-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={tr("esim. HLUKI001")}
                className="font-mono"
              />
              <p className="text-xs opacity-70">
                {tr("Koodi muutetaan automaattisesti isoiksi kirjaimiksi.")}
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="school-lang">{tr("Kieli")}</Label>
              <select
                id="school-lang"
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {LANGUAGE_LABEL[l]} ({l})
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <Button
                type="submit"
                disabled={busy}
                className="rounded-full bg-[color:var(--purple)] hover:bg-[color:var(--purple)]/90 text-white font-bold"
              >
                {tr("Lisää koulu")}
              </Button>
            </div>
          </form>
        </StickyNote>

        <StickyNote seed="admin-school-list" className="overflow-x-auto">
          {schools.length === 0 ? (
            <p className="opacity-70">{tr("Ei kouluja vielä.")}</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/10">
                  <th className="py-2 pr-3">{tr("Koulun nimi")}</th>
                  <th className="py-2 pr-3">{tr("Koulukoodi")}</th>
                  <th className="py-2 pr-3">{tr("Kieli")}</th>
                  <th className="py-2 pr-3">{tr("Tila")}</th>
                  <th className="py-2 pr-3">{tr("Luotu")}</th>
                  <th className="py-2">{tr("Toiminnot")}</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((s) => (
                  <tr key={s.id} className="border-b border-black/5">
                    <td className="py-2 pr-3 font-medium">{s.name}</td>
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center gap-2">
                        <code className="font-mono">{s.code}</code>
                        <button
                          type="button"
                          aria-label={tr("Kopioi")}
                          title={tr("Kopioi")}
                          onClick={() => {
                            void navigator.clipboard.writeText(s.code);
                            toast.success(tr("Kopioitu!"));
                          }}
                          className="opacity-60 hover:opacity-100"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs font-bold uppercase">
                        {s.language}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={
                          s.is_active
                            ? "rounded-full bg-green-600/15 px-2 py-0.5 text-xs font-semibold text-green-800"
                            : "rounded-full bg-red-600/15 px-2 py-0.5 text-xs font-semibold text-red-800"
                        }
                      >
                        {s.is_active ? tr("Aktiivinen") : tr("Ei aktiivinen")}
                      </span>
                    </td>
                    <td className="py-2 pr-3 opacity-70">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => void toggleActive(s)}
                      >
                        {s.is_active ? tr("Poista käytöstä") : tr("Aktivoi")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </StickyNote>
      </div>
    </div>
  );
}
