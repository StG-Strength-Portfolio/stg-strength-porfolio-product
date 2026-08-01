import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { getCurrentRole } from "@/lib/auth-helpers";
import { toast } from "sonner";
import { Copy, Download, ExternalLink, RefreshCw } from "lucide-react";
import { WORLDS, worldForScreen } from "@/lib/screens";
import {
  useClassRoster,
  summariseClass,
  formatLastActive,
  rosterToCsv,
  downloadCsv,
  type RosterStudent,
} from "@/lib/teacher-data";
import {
  LANGUAGE_LABEL,
  LANGUAGE_FLAG,
  LANGUAGES,
  useT,
  useTr,
  type Language,
} from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CheckIcon } from "@/components/icons/AppIcons";

export const Route = createFileRoute("/_authenticated/opettaja")({
  component: TeacherDashboard,
});

type ClassRow = { id: string; name: string; join_code: string; created_at: string; language: Language };

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(): string {
  let s = "LK-";
  for (let i = 0; i < 4; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  s += "-" + Math.floor(10 + Math.random() * 90);
  return s;
}

function TeacherDashboard() {
  const navigate = useNavigate();
  const [role, setRole] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [name, setName] = useState("");
  const [language, setLanguageChoice] = useState<Language>("en");
  const [busy, setBusy] = useState(false);
  const t = useT();
  const tr = useTr();

  useEffect(() => {
    getCurrentRole().then((r) => {
      setRole(r);
      if (r !== "teacher" && r !== "admin") navigate({ to: "/seikkailu", replace: true });
      else loadClasses();
    });
  }, [navigate]);

  async function loadClasses() {
    const { data, error } = await supabase
      .from("classes" as never)
      .select("id,name,join_code,created_at,language")
      .eq("is_deleted" as never, false as never)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setClasses((data as ClassRow[] | null) ?? []);
  }

  async function createClass(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("No session.");
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const payload = {
          name: name.trim(),
          teacher_id: u.user.id,
          join_code: randomCode(),
          language,
        };
        const { error } = await supabase.from("classes" as never).insert(payload as never);
        if (!error) {
          setName("");
          await loadClasses();
          toast.success(t("teacher.create.success"));
          return;
        }
        lastError = error;
        if ((error as { code?: string }).code !== "23505") break;
      }
      throw lastError;
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

  const isAdmin = role === "admin";

  if (role !== "teacher" && !isAdmin) {
    return <div className="flex min-h-screen items-center justify-center text-foreground">{t("common.loading")}</div>;
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <CornerBlobs />
      <header className="no-print relative z-10 flex items-center justify-between px-6 py-4">
        <h1 className="text-2xl font-display">{t("teacher.title")}</h1>
        <div className="flex items-center gap-2">
        {isAdmin && (
          <Link
            to="/admin/schools"
            className="rounded-full px-3 py-2 text-sm font-semibold text-foreground hover:bg-white/10"
          >
            {tr("Hallinnoi kouluja")}
          </Link>
        )}
        <Button variant="ghost" onClick={signOut} className="text-foreground hover:bg-white/10 rounded-full">
          {t("common.logout")}
        </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-6 space-y-6">
        <StickyNote seed="teacher-create">
          <h2 className="text-2xl mb-1">{t("teacher.create.title")}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t("teacher.create.hint")}
          </p>
          <form onSubmit={createClass} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="className">{t("teacher.create.nameLabel")}</Label>
                <Input
                  id="className"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("teacher.create.namePh")}
                  maxLength={80}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-display font-semibold">
                {t("teacher.create.langLabel")}
              </Label>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("teacher.create.langLabel")}>
                {LANGUAGES.map((lng) => (
                  <button
                    key={lng}
                    type="button"
                    role="radio"
                    aria-checked={language === lng}
                    onClick={() => setLanguageChoice(lng)}
                    className={cn(
                      "group relative rounded-2xl border-2 px-3 py-4 text-left transition-all",
                      "hover:-translate-y-0.5 hover:shadow-md",
                      language === lng
                        ? "border-[color:var(--coral)] bg-[color:var(--coral)]/10 shadow-md"
                        : "border-black/10 bg-white hover:border-[color:var(--purple)]/40",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl leading-none" aria-hidden>{LANGUAGE_FLAG[lng]}</span>
                      <div>
                        <div className="font-display text-base leading-tight text-[color:var(--ink)]">{LANGUAGE_LABEL[lng]}</div>
                        <div className="text-[11px] font-mono uppercase tracking-wider opacity-60 text-[color:var(--ink)]">{lng}</div>
                      </div>
                    </div>
                    {language === lng && (
                      <span
                        className="absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--coral)] text-[11px] font-bold text-white"
                        aria-hidden
                      ><CheckIcon size={12} /></span>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t("teacher.create.langHint")}</p>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={busy || !name.trim()}
                className="rounded-full bg-[color:var(--coral)] hover:bg-[color:var(--coral)]/90 text-white font-bold py-6 px-6"
              >
                {busy ? t("teacher.create.busy") : t("teacher.create.submit")}
              </Button>
            </div>
          </form>
        </StickyNote>

        <div className="space-y-4">
          <h2 className="font-display text-2xl">{t("teacher.mine", { n: classes.length })}</h2>
          {classes.length === 0 && (
            <p className="opacity-80 text-sm">{t("teacher.mine.empty")}</p>
          )}
          {classes.map((c, i) => (
            <ClassDashboard key={c.id} c={c} tone={i % 2 === 0 ? "white" : "yellow"} />
          ))}
        </div>
      </main>
    </div>
  );
}

type SortKey = "progress_behind" | "name_asc" | "last_active_oldest";

function ClassDashboard({ c, tone }: { c: ClassRow; tone: "white" | "yellow" }) {
  const { students, loading, refresh } = useClassRoster(c.id);
  const [sort, setSort] = useState<SortKey>("progress_behind");
  const t = useT();
  const tr = useTr();

  const stats = useMemo(() => summariseClass(students ?? []), [students]);

  const sortedStudents = useMemo<RosterStudent[]>(() => {
    if (!students) return [];
    const list = [...students];
    switch (sort) {
      case "name_asc":
        list.sort((a, b) =>
          (a.displayName ?? "").localeCompare(b.displayName ?? ""),
        );
        break;
      case "last_active_oldest":
        list.sort((a, b) => (a.lastActive?.getTime() ?? 0) - (b.lastActive?.getTime() ?? 0));
        break;
      case "progress_behind":
      default:
        list.sort((a, b) => a.screensFilled - b.screensFilled);
        break;
    }
    return list;
  }, [students, sort]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(c.join_code);
      toast.success(t("teacher.classCard.copyCode.ok"));
    } catch {
      toast.error(t("teacher.classCard.copyCode.fail"));
    }
  }

  function exportCsv() {
    if (!students || students.length === 0) return;
    const csv = rosterToCsv(students);
    const safeName = c.name.replace(/[^\w\-]+/g, "_");
    downloadCsv(`${safeName}_students.csv`, csv);
  }

  const langLabel = LANGUAGE_LABEL[c.language] ?? LANGUAGE_LABEL.en;
  const langFlag = LANGUAGE_FLAG[c.language] ?? LANGUAGE_FLAG.en;

  return (
    <StickyNote tone={tone}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider opacity-70">{t("teacher.classCard.class")}</div>
          <div className="font-display text-xl leading-tight">{c.name}</div>
          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-[color:var(--purple)]/10 px-2 py-0.5 text-xs font-semibold text-[color:var(--ink)]">
            <span aria-hidden>{langFlag}</span>
            <span>{t("teacher.classCard.language")}: {langLabel}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider opacity-70">{t("teacher.classCard.joinCode")}</div>
          <div className="font-mono text-2xl font-bold tracking-wider">{c.join_code}</div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-4 rounded-2xl bg-black/5 p-3 text-sm">
        <Stat label={t("teacher.classCard.students")} value={String(stats.totalStudents)} />
        <Stat label={t("teacher.classCard.avg")} value={stats.totalStudents ? tr("Taso {n}", { n: stats.worldNumber }) : "–"} />
        <Stat
          label={t("teacher.classCard.screensAvg")}
          value={
            stats.totalStudents
              ? `${stats.avgScreensFilled.toFixed(1)} / ${students?.[0]?.totalRequiredScreens ?? "?"}`
              : "–"
          }
        />
        <Stat label={t("teacher.classCard.lastActive")} value={formatLastActive(stats.lastActivity, tr)} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-display">{t("teacher.classCard.sort")}</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm"
          >
            <option value="progress_behind">{t("teacher.classCard.sort.progress")}</option>
            <option value="name_asc">{t("teacher.classCard.sort.nameAsc")}</option>
            <option value="last_active_oldest">{t("teacher.classCard.sort.leastActive")}</option>
          </select>
        </label>
        <Button type="button" variant="secondary" size="sm" onClick={refresh} className="rounded-full">
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> {t("common.refresh")}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={copyCode} className="rounded-full">
          <Copy className="h-4 w-4 mr-1" /> {t("teacher.classCard.copyCode")}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={exportCsv}
          disabled={!students || students.length === 0}
          className="rounded-full bg-[color:var(--ink)] text-white hover:bg-[color:var(--ink)]/90"
        >
          <Download className="h-4 w-4 mr-1" /> {t("teacher.classCard.exportCsv")}
        </Button>
      </div>

      <div className="mt-4">
        {students === null ? (
          <p className="text-sm opacity-70">{t("common.loading")}</p>
        ) : students.length === 0 ? (
          <EmptyState code={c.join_code} />
        ) : (
          <RosterTable students={sortedStudents} />
        )}
      </div>
    </StickyNote>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="leading-tight">
      <div className="text-[0.7rem] uppercase tracking-wider opacity-60">{label}</div>
      <div className="font-display text-base">{value}</div>
    </div>
  );
}

function EmptyState({ code }: { code: string }) {
  const t = useT();
  return (
    <div className="rounded-2xl bg-white/70 p-5 text-center">
      <p className="text-sm mb-3">{t("teacher.classCard.empty")}</p>
      <div className="inline-block rounded-2xl bg-[color:var(--yellow)] px-5 py-3 font-mono text-2xl font-bold tracking-wider text-[color:var(--ink)]">
        {code}
      </div>
    </div>
  );
}

function RosterTable({ students }: { students: RosterStudent[] }) {
  const t = useT();
  const tr = useTr();
  return (
    <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white/60">
      <table className="w-full text-sm">
        <thead className="bg-black/5 text-left">
          <tr>
            <th className="px-3 py-2 font-display">{t("teacher.roster.student")}</th>
            <th className="px-3 py-2 font-display">{t("teacher.roster.progress")}</th>
            <th className="px-3 py-2 font-display">{t("teacher.roster.worlds")}</th>
            <th className="px-3 py-2 font-display">{t("teacher.classCard.lastActive")}</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.studentId} className="border-t border-black/5">
              <td className="px-3 py-2 font-medium text-[color:var(--ink)]">
                {s.displayName?.trim() || t("teacher.roster.nameMissing")}
              </td>
              <td className="px-3 py-2 tabular-nums">
                {t("teacher.roster.worldScreens", { w: worldIndexForScreen(s.currentScreen) })}{" "}
                <strong>{s.screensFilled}</strong>/{s.totalRequiredScreens}
              </td>
              <td className="px-3 py-2 tabular-nums">{s.worldsCompleted} / 7</td>
              <td className="px-3 py-2">{formatLastActive(s.lastActive, tr)}</td>
              <td className="px-3 py-2 text-right">
                <Link
                  to="/opettaja/oppilas/$userId"
                  params={{ userId: s.studentId }}
                  className="inline-flex items-center gap-1 rounded-full bg-[color:var(--ink)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[color:var(--coral)] transition-colors"
                >
                  {t("teacher.roster.viewPortfolio")} <ExternalLink className="h-3 w-3" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function worldIndexForScreen(n: number): number {
  const w = worldForScreen(n);
  const idx = WORLDS.findIndex((x) => x.id === w.id);
  return idx;
}
