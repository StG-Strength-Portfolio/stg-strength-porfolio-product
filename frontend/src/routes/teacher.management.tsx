import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/DashboardShell";
import { StickyNote } from "@/components/StickyNote";
import { useLanguage } from "@/lib/i18n";
import { useRoleGuard } from "@/lib/role-guard";
import { getStrengthName } from "@/lib/strengths-i18n";
import {
  deleteStudentResponse,
  getStudentComplianceDetail,
  moveStudentToClass,
  type StudentComplianceDetail,
} from "@/lib/school-compliance.functions";
import {
  getTeacherManagementData,
  type TeacherManagedStudent,
  type TeacherManagementData,
} from "@/lib/teacher-compliance.functions";

export const Route = createFileRoute("/teacher/management")({
  component: TeacherManagement,
});

function TeacherManagement() {
  const guard = useRoleGuard(["teacher"]);
  const { language } = useLanguage();
  const loadManagement = useServerFn(getTeacherManagementData);
  const moveStudent = useServerFn(moveStudentToClass);
  const loadStudent = useServerFn(getStudentComplianceDetail);
  const removeResponse = useServerFn(deleteStudentResponse);

  const copy = language === "en"
    ? {
        title: "Student management",
        intro: "Manage students only in the classes you teach.",
        students: "Students",
        name: "Name",
        email: "Email",
        class: "Class",
        actions: "Actions",
        manage: "Manage",
        moveTo: "Move to class",
        responses: "Task responses and reflections",
        received: "Received strengths",
        emptyResponses: "No saved responses.",
        emptyReceived: "No received strengths.",
        deleteResponse: "Delete response",
        back: "Back",
        saved: "Updated",
        confirmDeleteResponse: "Delete this response/reflection? This cannot be restored from the portfolio.",
        responseKey: "Response key",
        updated: "Updated",
        sender: "Sender",
        strength: "Strength",
        message: "Message",
        date: "Date",
      }
    : language === "sv"
      ? {
          title: "Elevhantering",
          intro: "Hantera endast elever i de klasser du undervisar i.",
          students: "Elever",
          name: "Namn",
          email: "E-post",
          class: "Klass",
          actions: "Åtgärder",
          manage: "Hantera",
          moveTo: "Flytta till klass",
          responses: "Uppgiftssvar och reflektioner",
          received: "Mottagna styrkor",
          emptyResponses: "Inga sparade svar.",
          emptyReceived: "Inga mottagna styrkor.",
          deleteResponse: "Radera svar",
          back: "Tillbaka",
          saved: "Uppdaterad",
          confirmDeleteResponse: "Radera svaret/reflektionen? Det kan inte återställas i portföljen.",
          responseKey: "Svarsnyckel",
          updated: "Uppdaterad",
          sender: "Avsändare",
          strength: "Styrka",
          message: "Meddelande",
          date: "Datum",
        }
      : {
          title: "Opiskelijoiden hallinta",
          intro: "Hallinnoi vain niiden luokkien opiskelijoita, joissa olet opettajana.",
          students: "Opiskelijat",
          name: "Nimi",
          email: "Sähköposti",
          class: "Luokka",
          actions: "Toiminnot",
          manage: "Hallinnoi",
          moveTo: "Siirrä luokkaan",
          responses: "Tehtävävastaukset ja pohdinnat",
          received: "Saadut vahvuudet",
          emptyResponses: "Ei tallennettuja vastauksia.",
          emptyReceived: "Ei saatuja vahvuuksia.",
          deleteResponse: "Poista vastaus",
          back: "Takaisin",
          saved: "Päivitetty",
          confirmDeleteResponse: "Poistetaanko vastaus/pohdinta? Sitä ei voi palauttaa portfolioon.",
          responseKey: "Vastausavain",
          updated: "Päivitetty",
          sender: "Lähettäjä",
          strength: "Vahvuus",
          message: "Viesti",
          date: "Päivämäärä",
        };

  const [data, setData] = useState<TeacherManagementData>({ classes: [], students: [] });
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [detail, setDetail] = useState<StudentComplianceDetail | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);

  const load = useCallback(async () => {
    if (guard.preview) {
      setData({ classes: [], students: [] });
      return;
    }
    try {
      setData(await loadManagement());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  }, [guard.preview, loadManagement]);

  useEffect(() => {
    if (guard.ready) void load();
  }, [guard.ready, load]);

  const selectedStudent = useMemo(
    () => data.students.find((student) => student.id === selectedStudentId) ?? null,
    [data.students, selectedStudentId],
  );

  if (!guard.ready) return null;

  async function openStudent(student: TeacherManagedStudent) {
    setSelectedStudentId(student.id);
    setDetail(null);
    setDetailBusy(true);
    try {
      setDetail(await loadStudent({ data: { studentId: student.id } }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setDetailBusy(false);
    }
  }

  async function move(student: TeacherManagedStudent, targetClassId: string) {
    if (!targetClassId || targetClassId === student.classId) return;
    setBusyId(student.id);
    try {
      await moveStudent({ data: { studentId: student.id, targetClassId } });
      toast.success(copy.saved);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteResponse(fieldKey: string) {
    if (!selectedStudentId || !window.confirm(copy.confirmDeleteResponse)) return;
    setBusyId(fieldKey);
    try {
      await removeResponse({ data: { studentId: selectedStudentId, fieldKey } });
      toast.success(copy.saved);
      setDetail(await loadStudent({ data: { studentId: selectedStudentId } }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setBusyId(null);
    }
  }

  const printable = (value: unknown) => {
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value ?? "");
    }
  };
  const strengthLang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";

  return (
    <DashboardShell
      title={copy.title}
      tabs={[]}
      active="management"
      onSelect={() => undefined}
      schoolName={guard.schoolName}
      links={[{ to: "/teacher/dashboard", label: copy.back }]}
    >
      <StickyNote seed="teacher-management-intro" className="space-y-2">
        <h2 className="text-2xl font-bold">{copy.title}</h2>
        <p className="opacity-75">{copy.intro}</p>
      </StickyNote>

      <StickyNote seed="teacher-management-students" className="space-y-3 overflow-x-auto">
        <h3 className="text-xl font-bold">{copy.students}</h3>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/10">
              <th className="py-2 pr-3">{copy.name}</th>
              <th className="py-2 pr-3">{copy.email}</th>
              <th className="py-2 pr-3">{copy.class}</th>
              <th className="py-2">{copy.actions}</th>
            </tr>
          </thead>
          <tbody>
            {data.students.map((student) => (
              <tr key={student.id} className="border-b border-black/5">
                <td className="py-2 pr-3 font-medium">{student.name ?? student.id.slice(0, 8)}</td>
                <td className="py-2 pr-3">{student.email ?? "—"}</td>
                <td className="py-2 pr-3">
                  <select
                    value={student.classId}
                    disabled={busyId === student.id}
                    onChange={(event) => void move(student, event.target.value)}
                    className="h-9 max-w-[220px] rounded-md border border-black/15 bg-white px-2 text-sm text-slate-900"
                    aria-label={copy.moveTo}
                  >
                    {data.classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2">
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => void openStudent(student)}>
                    {copy.manage}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </StickyNote>

      {selectedStudentId && (
        <StickyNote seed="teacher-management-detail" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xl font-bold">{detail?.name ?? selectedStudent?.name ?? copy.students}</h3>
              <p className="text-sm opacity-70">{detail?.email ?? selectedStudent?.email ?? ""}</p>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => {
              setSelectedStudentId(null);
              setDetail(null);
            }}>{copy.back}</Button>
          </div>

          {detailBusy && <p className="opacity-70">…</p>}
          {!detailBusy && detail && (
            <>
              <section className="space-y-2">
                <h4 className="text-lg font-bold">{copy.responses}</h4>
                {detail.responses.length === 0 ? (
                  <p className="opacity-70">{copy.emptyResponses}</p>
                ) : (
                  <div className="space-y-2">
                    {detail.responses.map((response) => (
                      <div key={response.fieldKey} className="rounded-2xl bg-white/75 p-3 text-slate-900">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold opacity-60">{copy.responseKey}: {response.fieldKey}</div>
                            <div className="mt-1 whitespace-pre-wrap break-words text-sm">{printable(response.value)}</div>
                            {response.updatedAt && <div className="mt-1 text-xs opacity-60">{copy.updated}: {new Date(response.updatedAt).toLocaleString()}</div>}
                          </div>
                          <Button
                            size="sm"
                            className="rounded-full bg-red-600 text-white hover:bg-red-700"
                            disabled={busyId === response.fieldKey}
                            onClick={() => void deleteResponse(response.fieldKey)}
                          >
                            {copy.deleteResponse}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-2">
                <h4 className="text-lg font-bold">{copy.received}</h4>
                {detail.receivedStrengths.length === 0 ? (
                  <p className="opacity-70">{copy.emptyReceived}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-black/10">
                          <th className="py-2 pr-3">{copy.sender}</th>
                          <th className="py-2 pr-3">{copy.strength}</th>
                          <th className="py-2 pr-3">{copy.message}</th>
                          <th className="py-2">{copy.date}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.receivedStrengths.map((gift) => (
                          <tr key={gift.id} className="border-b border-black/5">
                            <td className="py-2 pr-3">{gift.fromName}</td>
                            <td className="py-2 pr-3">{getStrengthName(gift.strengthId, strengthLang)}</td>
                            <td className="py-2 pr-3 whitespace-pre-wrap">{gift.message ?? "—"}</td>
                            <td className="py-2">{new Date(gift.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </StickyNote>
      )}
    </DashboardShell>
  );
}
