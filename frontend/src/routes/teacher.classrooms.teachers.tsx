import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/DashboardShell";
import { StickyNote } from "@/components/StickyNote";
import { useLanguage } from "@/lib/i18n";
import { useRoleGuard } from "@/lib/role-guard";
import { useTeacherData } from "@/lib/teacher-dashboard-data";
import {
  addClassTeacher,
  getClassTeacherManagement,
  removeClassTeacher,
  transferClassOwnership,
  type AvailableClassroomTeacher,
  type ClassroomTeacher,
} from "@/lib/class-teachers.functions";

export const Route = createFileRoute("/teacher/classrooms/teachers")({
  component: ClassroomTeachersPage,
});

const COPY = {
  fi: {
    title: "Luokan opettajat",
    back: "Takaisin hallintapaneeliin",
    chooseClass: "Valitse luokka",
    chooseClassHint: "Valitse luokka, jonka opettajia haluat hallita.",
    teachers: "Opettajat",
    owner: "Omistaja",
    coTeacher: "Rinnakkaisopettaja",
    ownerClass: "Omistamasi luokka",
    sharedClass: "Jaettu luokka",
    addTeacher: "Lisää opettaja",
    chooseTeacher: "Valitse opettaja samasta koulusta",
    add: "Lisää",
    transfer: "Siirrä omistajuus",
    remove: "Poista",
    noAvailable: "Kaikki koulun opettajat ovat jo tässä luokassa.",
    coTeacherInfo: "Vain luokan omistaja voi lisätä tai poistaa opettajia ja siirtää omistajuuden.",
    added: "Opettaja lisätty.",
    removed: "Opettaja poistettu luokasta.",
    transferred: "Luokan omistajuus siirretty.",
    confirmRemove: "Poistetaanko opettaja luokasta?",
    confirmTransfer: "Siirretäänkö luokan omistajuus opettajalle",
  },
  en: {
    title: "Class teachers",
    back: "Back to dashboard",
    chooseClass: "Choose a class",
    chooseClassHint: "Choose the class whose teachers you want to manage.",
    teachers: "Teachers",
    owner: "Owner",
    coTeacher: "Co-teacher",
    ownerClass: "Class you own",
    sharedClass: "Shared class",
    addTeacher: "Add teacher",
    chooseTeacher: "Select a teacher from the same school",
    add: "Add",
    transfer: "Transfer ownership",
    remove: "Remove",
    noAvailable: "All teachers from this school are already in this class.",
    coTeacherInfo: "Only the class owner can add or remove teachers and transfer ownership.",
    added: "Teacher added.",
    removed: "Teacher removed from the class.",
    transferred: "Class ownership transferred.",
    confirmRemove: "Remove this teacher from the class?",
    confirmTransfer: "Transfer class ownership to",
  },
  sv: {
    title: "Klassens lärare",
    back: "Tillbaka till instrumentpanelen",
    chooseClass: "Välj klass",
    chooseClassHint: "Välj den klass vars lärare du vill hantera.",
    teachers: "Lärare",
    owner: "Ägare",
    coTeacher: "Medlärare",
    ownerClass: "Klass du äger",
    sharedClass: "Delad klass",
    addTeacher: "Lägg till lärare",
    chooseTeacher: "Välj en lärare från samma skola",
    add: "Lägg till",
    transfer: "Överför ägarskap",
    remove: "Ta bort",
    noAvailable: "Alla lärare från skolan finns redan i den här klassen.",
    coTeacherInfo: "Endast klassens ägare kan lägga till eller ta bort lärare och överföra ägarskapet.",
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
  const { classes } = useTeacherData();
  const getManagement = useServerFn(getClassTeacherManagement);
  const addTeacher = useServerFn(addClassTeacher);
  const removeTeacher = useServerFn(removeClassTeacher);
  const transferOwner = useServerFn(transferClassOwnership);

  const [classId, setClassId] = useState("");
  const [teachers, setTeachers] = useState<ClassroomTeacher[]>([]);
  const [available, setAvailable] = useState<AvailableClassroomTeacher[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(id: string) {
    if (!id) {
      setTeachers([]);
      setAvailable([]);
      setIsOwner(false);
      return;
    }
    try {
      const result = await getManagement({ data: { classId: id } });
      setTeachers(result.teachers);
      setAvailable(result.available);
      setIsOwner(result.isOwner);
      setSelectedTeacher("");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  useEffect(() => {
    if (!classId && classes.length > 0) setClassId(classes[0].id);
  }, [classes, classId]);

  useEffect(() => {
    if (guard.ready && classId) void load(classId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guard.ready, classId]);

  async function onAdd() {
    if (!classId || !selectedTeacher) return;
    setBusy(true);
    try {
      await addTeacher({ data: { classId, teacherId: selectedTeacher } });
      toast.success(text.added);
      await load(classId);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(teacher: ClassroomTeacher) {
    if (!window.confirm(`${text.confirmRemove} ${teacher.name ?? teacher.id.slice(0, 8)}`)) return;
    setBusy(true);
    try {
      await removeTeacher({ data: { classId, teacherId: teacher.id } });
      toast.success(text.removed);
      await load(classId);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onTransfer(teacher: ClassroomTeacher) {
    if (!window.confirm(`${text.confirmTransfer} ${teacher.name ?? teacher.id.slice(0, 8)}?`)) return;
    setBusy(true);
    try {
      await transferOwner({ data: { classId, teacherId: teacher.id } });
      toast.success(text.transferred);
      await load(classId);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!guard.ready) return null;

  const selectedClass = classes.find((klass) => klass.id === classId);

  return (
    <DashboardShell
      title={text.title}
      tabs={[]}
      active=""
      onSelect={() => undefined}
      schoolName={guard.schoolName}
      links={[{ to: "/teacher/dashboard", label: text.back }]}
    >
      <StickyNote seed="teacher-classroom-teachers" className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold">{text.chooseClass}</h2>
          <p className="mt-1 text-sm opacity-70">{text.chooseClassHint}</p>
        </div>

        <select
          value={classId}
          onChange={(event) => setClassId(event.target.value)}
          className="h-11 w-full max-w-xl rounded-xl border border-black/15 bg-white px-3 text-sm text-slate-900"
        >
          {classes.length === 0 && <option value="">—</option>}
          {classes.map((klass) => (
            <option key={klass.id} value={klass.id}>
              {klass.name} — {klass.teacher_id === guard.userId ? text.ownerClass : text.sharedClass}
            </option>
          ))}
        </select>

        {selectedClass && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-bold">
                {text.teachers}: {selectedClass.name}
              </h2>
              <Link
                to="/teacher/dashboard"
                className="text-sm font-semibold underline underline-offset-4"
              >
                {text.back}
              </Link>
            </div>

            <div className="space-y-2">
              {teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/75 p-3 text-slate-900"
                >
                  <div>
                    <div className="font-semibold">
                      {teacher.name?.trim() || teacher.id.slice(0, 8)}
                    </div>
                    <div className="text-xs opacity-65">
                      {teacher.role === "owner" ? text.owner : text.coTeacher}
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

            {isOwner ? (
              <div className="space-y-3 rounded-2xl border border-black/10 bg-white/60 p-4">
                <h3 className="font-bold">{text.addTeacher}</h3>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    value={selectedTeacher}
                    onChange={(event) => setSelectedTeacher(event.target.value)}
                    className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm text-slate-900"
                  >
                    <option value="">{text.chooseTeacher}</option>
                    {available.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name?.trim() || teacher.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    disabled={busy || !selectedTeacher}
                    onClick={() => void onAdd()}
                    className="rounded-full bg-[color:var(--purple)] font-bold text-white hover:bg-[color:var(--purple)]/90"
                  >
                    {text.add}
                  </Button>
                </div>
                {available.length === 0 && (
                  <p className="text-sm opacity-70">{text.noAvailable}</p>
                )}
              </div>
            ) : (
              <p className="text-sm opacity-70">{text.coTeacherInfo}</p>
            )}
          </div>
        )}
      </StickyNote>
    </DashboardShell>
  );
}
