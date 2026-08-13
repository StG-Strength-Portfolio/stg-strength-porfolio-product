import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import {
  addClassTeacher,
  getClassTeacherManagement,
  removeClassTeacher,
  transferClassOwnership,
  type AvailableClassroomTeacher,
  type ClassroomTeacher,
} from "@/lib/class-teachers.functions";
import { getSuperAdminPreview } from "@/lib/superadmin-preview";
import {
  addDemoClassTeacher,
  getDemoClassTeacherManagement,
  removeDemoClassTeacher,
  transferDemoClassOwnership,
} from "@/lib/demo-class-teachers";

const COPY = {
  fi: {
    title: "Opettajat",
    owner: "Omistaja",
    coTeacher: "Rinnakkaisopettaja",
    addTeacher: "Lisää opettaja",
    chooseTeacher: "Valitse opettaja",
    add: "Lisää",
    remove: "Poista",
    transfer: "Siirrä omistajuus",
    empty: "Kaikki koulun opettajat ovat jo tässä luokassa.",
    loading: "Ladataan opettajia…",
    loadError: "Opettajatietoja ei voitu ladata.",
    databaseUpdate: "Opettajatoiminnon tietokantapäivitys puuttuu. Ota yhteyttä ylläpitäjään.",
    added: "Opettaja lisätty luokkaan.",
    removed: "Opettaja poistettu luokasta.",
    transferred: "Luokan omistajuus siirretty.",
    confirmRemove: "Poistetaanko tämä opettaja luokasta?",
    confirmTransfer: "Siirretäänkö luokan omistajuus opettajalle",
  },
  en: {
    title: "Teachers",
    owner: "Owner",
    coTeacher: "Co-teacher",
    addTeacher: "Add teacher",
    chooseTeacher: "Select a teacher",
    add: "Add",
    remove: "Remove",
    transfer: "Transfer ownership",
    empty: "All teachers from this school are already in this classroom.",
    loading: "Loading teachers…",
    loadError: "Teacher information could not be loaded.",
    databaseUpdate: "The teacher-management database update is missing. Please contact the administrator.",
    added: "Teacher added to the classroom.",
    removed: "Teacher removed from the classroom.",
    transferred: "Classroom ownership transferred.",
    confirmRemove: "Remove this teacher from the classroom?",
    confirmTransfer: "Transfer classroom ownership to",
  },
  sv: {
    title: "Lärare",
    owner: "Ägare",
    coTeacher: "Medlärare",
    addTeacher: "Lägg till lärare",
    chooseTeacher: "Välj lärare",
    add: "Lägg till",
    remove: "Ta bort",
    transfer: "Överför ägarskap",
    empty: "Alla lärare från skolan finns redan i den här klassen.",
    loading: "Laddar lärare…",
    loadError: "Läraruppgifterna kunde inte laddas.",
    databaseUpdate: "Databasuppdateringen för lärarhantering saknas. Kontakta administratören.",
    added: "Läraren har lagts till i klassen.",
    removed: "Läraren har tagits bort ur klassen.",
    transferred: "Klassens ägarskap har överförts.",
    confirmRemove: "Ta bort den här läraren från klassen?",
    confirmTransfer: "Överför klassens ägarskap till",
  },
} as const;

type LoadState = "loading" | "ready" | "error";

export function ClassTeacherManager({
  classId,
  showTitle = true,
  onTeacherCountChange,
}: {
  classId: string;
  showTitle?: boolean;
  onTeacherCountChange?: (count: number) => void;
}) {
  const { language } = useLanguage();
  const text = COPY[language];
  const isDemo = getSuperAdminPreview().mode === "teacher";
  const getManagement = useServerFn(getClassTeacherManagement);
  const addTeacher = useServerFn(addClassTeacher);
  const removeTeacher = useServerFn(removeClassTeacher);
  const transferOwner = useServerFn(transferClassOwnership);

  const [teachers, setTeachers] = useState<ClassroomTeacher[]>([]);
  const [available, setAvailable] = useState<AvailableClassroomTeacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedTeacher = useMemo(
    () => available.find((teacher) => teacher.id === selectedTeacherId) ?? null,
    [available, selectedTeacherId],
  );

  async function load() {
    setLoadState("loading");
    setErrorMessage("");
    try {
      const result = isDemo
        ? getDemoClassTeacherManagement(classId, language)
        : await getManagement({ data: { classId } });
      setTeachers(result.teachers);
      onTeacherCountChange?.(result.teachers.length);
      setAvailable(result.available);
      setSelectedTeacherId("");
      setLoadState("ready");
    } catch (error) {
      const message = (error as Error).message || text.loadError;
      setErrorMessage(message);
      setLoadState("error");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, language, isDemo]);

  async function run(action: () => Promise<unknown> | unknown, successMessage: string) {
    setBusy(true);
    try {
      await action();
      toast.success(successMessage);
      await load();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loadState === "loading") {
    return <p className="text-sm opacity-70">{text.loading}</p>;
  }

  if (loadState === "error") {
    const databaseMissing = /class_teachers|add_class_teacher|relation .* does not exist/i.test(errorMessage);
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {databaseMissing ? text.databaseUpdate : `${text.loadError} ${errorMessage}`}
      </div>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-black/10 bg-white/55 p-4">
      {showTitle && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold">{text.title}</h3>
          <span className="text-xs opacity-60">{teachers.length}</span>
        </div>
      )}

      <div className="space-y-2">
        {teachers.map((teacher) => (
          <div
            key={teacher.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="truncate font-semibold">{teacher.name || teacher.id.slice(0, 8)}</div>
              <div className="text-xs opacity-65">
                {teacher.role === "owner" ? text.owner : text.coTeacher}
              </div>
            </div>

            {teacher.role === "co_teacher" && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    const name = teacher.name || teacher.id.slice(0, 8);
                    if (!window.confirm(`${text.confirmTransfer} ${name}?`)) return;
                    void run(
                      () =>
                        isDemo
                          ? transferDemoClassOwnership(classId, teacher.id)
                          : transferOwner({ data: { classId, teacherId: teacher.id } }),
                      text.transferred,
                    );
                  }}
                  className="rounded-full"
                >
                  {text.transfer}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm(text.confirmRemove)) return;
                    void run(
                      () =>
                        isDemo
                          ? removeDemoClassTeacher(classId, teacher.id)
                          : removeTeacher({ data: { classId, teacherId: teacher.id } }),
                      text.removed,
                    );
                  }}
                  className="rounded-full bg-red-600 text-white hover:bg-red-700"
                >
                  {text.remove}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t border-black/10 pt-3">
        <h4 className="font-semibold">{text.addTeacher}</h4>
        {available.length > 0 ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={selectedTeacherId}
              onChange={(event) => setSelectedTeacherId(event.target.value)}
              className="h-10 w-full rounded-full border border-[color:var(--purple)] bg-[color:var(--purple)] px-4 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-[color:var(--purple)]/30 sm:w-64 sm:flex-none"
            >
              <option value="" className="bg-white text-slate-900">
                {text.chooseTeacher}
              </option>
              {available.map((teacher) => (
                <option key={teacher.id} value={teacher.id} className="bg-white text-slate-900">
                  {teacher.name || teacher.id.slice(0, 8)}
                </option>
              ))}
            </select>
            <Button
              type="button"
              disabled={busy || !selectedTeacher}
              onClick={() => {
                if (!selectedTeacher) return;
                void run(
                  () =>
                    isDemo
                      ? addDemoClassTeacher(classId, selectedTeacher.id)
                      : addTeacher({ data: { classId, teacherId: selectedTeacher.id } }),
                  text.added,
                );
              }}
              className="self-start rounded-full bg-[color:var(--purple)] font-bold text-white hover:bg-[color:var(--purple)]/90 sm:self-auto"
            >
              {text.add}
            </Button>
          </div>
        ) : (
          <p className="text-sm opacity-70">{text.empty}</p>
        )}
      </div>
    </section>
  );
}
