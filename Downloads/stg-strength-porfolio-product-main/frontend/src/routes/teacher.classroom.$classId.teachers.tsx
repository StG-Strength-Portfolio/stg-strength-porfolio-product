import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StickyNote } from "@/components/StickyNote";
import { DashboardShell } from "@/components/DashboardShell";
import { useRoleGuard } from "@/lib/role-guard";
import { useTr } from "@/lib/i18n";
import {
  addClassTeacher,
  getClassTeacherManagement,
  removeClassTeacher,
  transferClassOwnership,
  type AvailableClassroomTeacher,
  type ClassroomTeacher,
} from "@/lib/class-teachers.functions";

export const Route = createFileRoute("/teacher/classroom/$classId/teachers")({
  component: ClassroomTeachersPage,
});

function ClassroomTeachersPage() {
  const tr = useTr();
  const guard = useRoleGuard(["teacher"]);
  const { classId } = Route.useParams();
  const getManagement = useServerFn(getClassTeacherManagement);
  const addTeacher = useServerFn(addClassTeacher);
  const removeTeacher = useServerFn(removeClassTeacher);
  const transferOwner = useServerFn(transferClassOwnership);
  const [teachers, setTeachers] = useState<ClassroomTeacher[]>([]);
  const [available, setAvailable] = useState<AvailableClassroomTeacher[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const result = await getManagement({ data: { classId } });
      setTeachers(result.teachers);
      setAvailable(result.available);
      setIsOwner(result.isOwner);
      setSelected("");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  useEffect(() => {
    if (guard.ready) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guard.ready, classId]);

  async function onAdd() {
    if (!selected) return;
    setBusy(true);
    try {
      await addTeacher({ data: { classId, teacherId: selected } });
      toast.success(tr("Opettaja lisätty."));
      await load();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(teacher: ClassroomTeacher) {
    if (!window.confirm(`${tr("Poistetaanko opettaja luokasta?")} ${teacher.name ?? teacher.email ?? ""}`)) return;
    setBusy(true);
    try {
      await removeTeacher({ data: { classId, teacherId: teacher.id } });
      toast.success(tr("Opettaja poistettu luokasta."));
      await load();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onTransfer(teacher: ClassroomTeacher) {
    if (!window.confirm(`${tr("Siirretäänkö luokan omistajuus opettajalle")} ${teacher.name ?? teacher.email ?? ""}?`)) return;
    setBusy(true);
    try {
      await transferOwner({ data: { classId, teacherId: teacher.id } });
      toast.success(tr("Luokan omistajuus siirretty."));
      await load();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!guard.ready) return null;

  return (
    <DashboardShell title={tr("Luokan opettajat")} schoolName={guard.schoolName}>
      <StickyNote seed={`class-teachers-${classId}`} className="space-y-5">
        <Link
          to="/teacher/dashboard"
          className="inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold"
        >
          {tr("Takaisin luokkiin")}
        </Link>

        <div>
          <h1 className="text-2xl font-bold">{tr("Luokan opettajat")}</h1>
          <p className="mt-1 text-sm opacity-70">
            {tr("Luokan omistaja voi lisätä saman koulun opettajia ja siirtää omistajuuden toiselle opettajalle.")}
          </p>
        </div>

        <div className="space-y-2">
          {teachers.map((teacher) => (
            <div key={teacher.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/70 p-3 text-slate-900">
              <div>
                <div className="font-semibold">{teacher.name ?? teacher.email ?? teacher.id.slice(0, 8)}</div>
                <div className="text-xs opacity-70">
                  {teacher.email ?? ""} {teacher.role === "owner" ? `· ${tr("Omistaja")}` : `· ${tr("Rinnakkaisopettaja")}`}
                </div>
              </div>
              {isOwner && teacher.role === "co_teacher" && (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void onTransfer(teacher)} className="rounded-full">
                    {tr("Siirrä omistajuus")}
                  </Button>
                  <Button type="button" size="sm" disabled={busy} onClick={() => void onRemove(teacher)} className="rounded-full bg-red-600 text-white hover:bg-red-700">
                    {tr("Poista")}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {isOwner && (
          <div className="space-y-2 rounded-2xl border border-black/10 bg-white/60 p-4">
            <h2 className="font-bold">{tr("Lisää opettaja")}</h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
                className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{tr("Valitse opettaja")}</option>
                {available.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name ?? teacher.email ?? teacher.id.slice(0, 8)}{teacher.email ? ` (${teacher.email})` : ""}
                  </option>
                ))}
              </select>
              <Button type="button" disabled={busy || !selected} onClick={() => void onAdd()} className="rounded-full bg-[color:var(--purple)] font-bold text-white hover:bg-[color:var(--purple)]/90">
                {tr("Lisää opettaja")}
              </Button>
            </div>
            {available.length === 0 && <p className="text-sm opacity-70">{tr("Kaikki koulun opettajat ovat jo tässä luokassa.")}</p>}
          </div>
        )}

        {!isOwner && (
          <p className="text-sm opacity-70">
            {tr("Vain luokan omistaja voi lisätä tai poistaa opettajia ja siirtää omistajuuden.")}
          </p>
        )}
      </StickyNote>
    </DashboardShell>
  );
}
