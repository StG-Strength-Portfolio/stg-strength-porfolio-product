import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StickyNote } from "@/components/StickyNote";
import { DashboardShell } from "@/components/DashboardShell";
import { useRoleGuard } from "@/lib/role-guard";
import { useLanguage } from "@/lib/i18n";
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

const COPY = {
  fi: {
    pageTitle: "Luokan opettajat",
    back: "Takaisin luokkiin",
    description:
      "Luokan omistaja voi lisätä saman koulun opettajia ja siirtää omistajuuden toiselle opettajalle.",
    owner: "Omistaja",
    coTeacher: "Rinnakkaisopettaja",
    transfer: "Siirrä omistajuus",
    remove: "Poista",
    addTitle: "Lisää opettaja",
    choose: "Valitse opettaja",
    add: "Lisää opettaja",
    allAdded: "Kaikki koulun opettajat ovat jo tässä luokassa.",
    ownerOnly:
      "Vain luokan omistaja voi lisätä tai poistaa opettajia ja siirtää omistajuuden.",
    added: "Opettaja lisätty.",
    removed: "Opettaja poistettu luokasta.",
    transferred: "Luokan omistajuus siirretty.",
    confirmRemove: "Poistetaanko opettaja luokasta?",
    confirmTransfer: "Siirretäänkö luokan omistajuus opettajalle",
  },
  en: {
    pageTitle: "Class teachers",
    back: "Back to classes",
    description:
      "The class owner can add teachers from the same school and transfer ownership to another teacher.",
    owner: "Owner",
    coTeacher: "Co-teacher",
    transfer: "Transfer ownership",
    remove: "Remove",
    addTitle: "Add teacher",
    choose: "Select a teacher",
    add: "Add teacher",
    allAdded: "All teachers from this school are already in this class.",
    ownerOnly: "Only the class owner can add or remove teachers and transfer ownership.",
    added: "Teacher added.",
    removed: "Teacher removed from the class.",
    transferred: "Class ownership transferred.",
    confirmRemove: "Remove this teacher from the class?",
    confirmTransfer: "Transfer class ownership to",
  },
  sv: {
    pageTitle: "Klassens lärare",
    back: "Tillbaka till klasser",
    description:
      "Klassens ägare kan lägga till lärare från samma skola och överföra ägarskapet till en annan lärare.",
    owner: "Ägare",
    coTeacher: "Medlärare",
    transfer: "Överför ägarskap",
    remove: "Ta bort",
    addTitle: "Lägg till lärare",
    choose: "Välj en lärare",
    add: "Lägg till lärare",
    allAdded: "Alla lärare från skolan finns redan i den här klassen.",
    ownerOnly: "Endast klassens ägare kan lägga till eller ta bort lärare och överföra ägarskapet.",
    added: "Lärare tillagd.",
    removed: "Lärare borttagen från klassen.",
    transferred: "Klassens ägarskap har överförts.",
    confirmRemove: "Ta bort den här läraren från klassen?",
    confirmTransfer: "Överför klassens ägarskap till",
  },
} as const;

function ClassroomTeachersPage() {
  const guard = useRoleGuard(["teacher"]);
  const { language } = useLanguage();
  const text = COPY[language];
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
      toast.success(text.added);
      await load();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(teacher: ClassroomTeacher) {
    if (!window.confirm(`${text.confirmRemove} ${teacher.name ?? teacher.email ?? ""}`)) return;
    setBusy(true);
    try {
      await removeTeacher({ data: { classId, teacherId: teacher.id } });
      toast.success(text.removed);
      await load();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onTransfer(teacher: ClassroomTeacher) {
    if (!window.confirm(`${text.confirmTransfer} ${teacher.name ?? teacher.email ?? ""}?`)) return;
    setBusy(true);
    try {
      await transferOwner({ data: { classId, teacherId: teacher.id } });
      toast.success(text.transferred);
      await load();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!guard.ready) return null;

  return (
    <DashboardShell title={text.pageTitle} schoolName={guard.schoolName}>
      <StickyNote seed={`class-teachers-${classId}`} className="space-y-5">
        <Link
          to="/teacher/dashboard"
          className="inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold"
        >
          {text.back}
        </Link>

        <div>
          <h1 className="text-2xl font-bold">{text.pageTitle}</h1>
          <p className="mt-1 text-sm opacity-70">{text.description}</p>
        </div>

        <div className="space-y-2">
          {teachers.map((teacher) => (
            <div
              key={teacher.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/70 p-3 text-slate-900"
            >
              <div>
                <div className="font-semibold">
                  {teacher.name ?? teacher.email ?? teacher.id.slice(0, 8)}
                </div>
                <div className="text-xs opacity-70">
                  {teacher.email ?? ""} {teacher.role === "owner" ? `· ${text.owner}` : `· ${text.coTeacher}`}
                </div>
              </div>
              {isOwner && teacher.role === "co_teacher" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void onTransfer(teacher)}
                    className="rounded-full"
                  >
                    {text.transfer}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() => void onRemove(teacher)}
                    className="rounded-full bg-red-600 text-white hover:bg-red-700"
                  >
                    {text.remove}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {isOwner && (
          <div className="space-y-2 rounded-2xl border border-black/10 bg-white/60 p-4">
            <h2 className="font-bold">{text.addTitle}</h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
                className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{text.choose}</option>
                {available.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name ?? teacher.email ?? teacher.id.slice(0, 8)}
                    {teacher.email ? ` (${teacher.email})` : ""}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                disabled={busy || !selected}
                onClick={() => void onAdd()}
                className="rounded-full bg-[color:var(--purple)] font-bold text-white hover:bg-[color:var(--purple)]/90"
              >
                {text.add}
              </Button>
            </div>
            {available.length === 0 && <p className="text-sm opacity-70">{text.allAdded}</p>}
          </div>
        )}

        {!isOwner && <p className="text-sm opacity-70">{text.ownerOnly}</p>}
      </StickyNote>
    </DashboardShell>
  );
}
