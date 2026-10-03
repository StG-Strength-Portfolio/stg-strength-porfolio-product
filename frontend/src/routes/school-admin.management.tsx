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
  getSchoolManagementData,
  getStudentComplianceDetail,
  manageClassLifecycle,
  manageSchoolUser,
  moveStudentToClass,
  type SchoolManagedUser,
  type SchoolManagementData,
  type StudentComplianceDetail,
} from "@/lib/school-compliance.functions";

export const Route = createFileRoute("/school-admin/management")({
  component: SchoolAdminManagement,
});

function SchoolAdminManagement() {
  const guard = useRoleGuard(["school_admin"]);
  const { language } = useLanguage();
  const loadManagement = useServerFn(getSchoolManagementData);
  const manageUser = useServerFn(manageSchoolUser);
  const moveStudent = useServerFn(moveStudentToClass);
  const manageClass = useServerFn(manageClassLifecycle);
  const loadStudent = useServerFn(getStudentComplianceDetail);
  const removeResponse = useServerFn(deleteStudentResponse);

  const copy = language === "en"
    ? {
        title: "School management",
        intro: "Manage users, classes and student access for this school.",
        users: "Users",
        classes: "Classes",
        name: "Name",
        role: "Role",
        class: "Class",
        status: "Status",
        actions: "Actions",
        active: "Active",
        inactive: "Deactivated",
        student: "Student",
        teacher: "Teacher",
        school_admin: "School admin",
        manage: "Manage",
        deactivate: "Deactivate",
        reactivate: "Reactivate",
        delete: "Delete",
        demote: "Change to teacher",
        replacement: "New owner for their classes",
        chooseReplacement: "Choose replacement teacher",
        ownClasses: "Owned classes",
        deleteClass: "Delete class",
        move: "Move student",
        moveTo: "Move to class",
        responses: "Task responses and reflections",
        received: "Received strengths",
        emptyResponses: "No saved responses.",
        emptyReceived: "No received strengths.",
        deleteResponse: "Delete response",
        back: "Back",
        saved: "Updated",
        deleted: "Moved to Trash for 90 days",
        confirmDeleteUser: "Delete this user? The account can be restored from Trash for 90 days.",
        confirmDeactivate: "Deactivate this user now?",
        confirmDeleteClass: "Delete this class? It can be restored from Trash for 90 days.",
        confirmDeleteResponse: "Delete this response/reflection? This cannot be restored from the portfolio.",
        selectReplacementFirst: "Choose a replacement teacher first.",
        cannotSelf: "Your own active school-admin account cannot be removed here.",
        responseKey: "Response key",
        updated: "Updated",
        sender: "Sender",
        strength: "Strength",
        message: "Message",
        date: "Date",
      }
    : language === "sv"
      ? {
          title: "Skoladministration",
          intro: "Hantera användare, klasser och elevåtkomst för skolan.",
          users: "Användare",
          classes: "Klasser",
          name: "Namn",
          role: "Roll",
          class: "Klass",
          status: "Status",
          actions: "Åtgärder",
          active: "Aktiv",
          inactive: "Inaktiverad",
          student: "Elev",
          teacher: "Lärare",
          school_admin: "Skoladministratör",
          manage: "Hantera",
          deactivate: "Inaktivera",
          reactivate: "Återaktivera",
          delete: "Radera",
          demote: "Ändra till lärare",
          replacement: "Ny ägare för personens klasser",
          chooseReplacement: "Välj ersättande lärare",
          ownClasses: "Egna klasser",
          deleteClass: "Radera klass",
          move: "Flytta elev",
          moveTo: "Flytta till klass",
          responses: "Uppgiftssvar och reflektioner",
          received: "Mottagna styrkor",
          emptyResponses: "Inga sparade svar.",
          emptyReceived: "Inga mottagna styrkor.",
          deleteResponse: "Radera svar",
          back: "Tillbaka",
          saved: "Uppdaterad",
          deleted: "Flyttad till papperskorgen i 90 dagar",
          confirmDeleteUser: "Radera användaren? Kontot kan återställas från papperskorgen i 90 dagar.",
          confirmDeactivate: "Inaktivera användaren nu?",
          confirmDeleteClass: "Radera klassen? Den kan återställas från papperskorgen i 90 dagar.",
          confirmDeleteResponse: "Radera svaret/reflektionen? Det kan inte återställas i portföljen.",
          selectReplacementFirst: "Välj först en ersättande lärare.",
          cannotSelf: "Ditt eget aktiva skoladministratörskonto kan inte tas bort här.",
          responseKey: "Svarsnyckel",
          updated: "Uppdaterad",
          sender: "Avsändare",
          strength: "Styrka",
          message: "Meddelande",
          date: "Datum",
        }
      : {
          title: "Koulun hallinta",
          intro: "Hallinnoi koulun käyttäjiä, luokkia ja opiskelijoiden käyttöoikeuksia.",
          users: "Käyttäjät",
          classes: "Luokat",
          name: "Nimi",
          role: "Rooli",
          class: "Luokka",
          status: "Tila",
          actions: "Toiminnot",
          active: "Aktiivinen",
          inactive: "Poistettu käytöstä",
          student: "Opiskelija",
          teacher: "Opettaja",
          school_admin: "Koulun admin",
          manage: "Hallinnoi",
          deactivate: "Poista käytöstä",
          reactivate: "Ota käyttöön",
          delete: "Poista",
          demote: "Muuta opettajaksi",
          replacement: "Uusi omistaja hänen luokilleen",
          chooseReplacement: "Valitse korvaava opettaja",
          ownClasses: "Omistetut luokat",
          deleteClass: "Poista luokka",
          move: "Siirrä opiskelija",
          moveTo: "Siirrä luokkaan",
          responses: "Tehtävävastaukset ja pohdinnat",
          received: "Saadut vahvuudet",
          emptyResponses: "Ei tallennettuja vastauksia.",
          emptyReceived: "Ei saatuja vahvuuksia.",
          deleteResponse: "Poista vastaus",
          back: "Takaisin",
          saved: "Päivitetty",
          deleted: "Siirretty roskakoriin 90 päiväksi",
          confirmDeleteUser: "Poistetaanko käyttäjä? Tili voidaan palauttaa roskakorista 90 päivän ajan.",
          confirmDeactivate: "Poistetaanko käyttäjä käytöstä nyt?",
          confirmDeleteClass: "Poistetaanko luokka? Se voidaan palauttaa roskakorista 90 päivän ajan.",
          confirmDeleteResponse: "Poistetaanko vastaus/pohdinta? Sitä ei voi palauttaa portfolioon.",
          selectReplacementFirst: "Valitse ensin korvaava opettaja.",
          cannotSelf: "Omaa aktiivista koulun admin -tiliä ei voi poistaa täällä.",
          responseKey: "Vastausavain",
          updated: "Päivitetty",
          sender: "Lähettäjä",
          strength: "Vahvuus",
          message: "Viesti",
          date: "Päivämäärä",
        };

  const [data, setData] = useState<SchoolManagementData | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [replacement, setReplacement] = useState<Record<string, string>>({});
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDetail, setStudentDetail] = useState<StudentComplianceDetail | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);

  const load = useCallback(async () => {
    if (guard.preview) {
      setData({ currentUserId: guard.userId ?? "preview", users: [], classes: [] });
      return;
    }
    try {
      setData(await loadManagement());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  }, [guard.preview, guard.userId, loadManagement]);

  useEffect(() => {
    if (guard.ready) void load();
  }, [guard.ready, load]);

  const replacementTeachers = useMemo(
    () =>
      (data?.users ?? []).filter(
        (user) => user.role === "teacher" && !user.deactivatedAt && !user.locked,
      ),
    [data?.users],
  );

  if (!guard.ready) return null;

  async function openStudent(user: SchoolManagedUser) {
    setSelectedStudentId(user.id);
    setStudentDetail(null);
    setDetailBusy(true);
    try {
      setStudentDetail(await loadStudent({ data: { studentId: user.id } }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setDetailBusy(false);
    }
  }

  async function lifecycle(user: SchoolManagedUser, action: "deactivate" | "reactivate" | "delete" | "demote_to_teacher") {
    if (user.id === data?.currentUserId && action !== "reactivate") {
      toast.error(copy.cannotSelf);
      return;
    }
    if (action === "deactivate" && !window.confirm(copy.confirmDeactivate)) return;
    if (action === "delete" && !window.confirm(copy.confirmDeleteUser)) return;

    const needsReplacement = user.ownedClasses.length > 0 && (action === "deactivate" || action === "delete");
    const replacementTeacherId = replacement[user.id] || null;
    if (needsReplacement && !replacementTeacherId) {
      toast.error(copy.selectReplacementFirst);
      return;
    }

    setBusyId(user.id);
    try {
      await manageUser({
        data: { userId: user.id, action, replacementTeacherId },
      });
      toast.success(action === "delete" ? copy.deleted : copy.saved);
      if (selectedStudentId === user.id && action === "delete") {
        setSelectedStudentId(null);
        setStudentDetail(null);
      }
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setBusyId(null);
    }
  }

  async function move(user: SchoolManagedUser, targetClassId: string) {
    if (!targetClassId || targetClassId === user.classId) return;
    setBusyId(user.id);
    try {
      await moveStudent({ data: { studentId: user.id, targetClassId } });
      toast.success(copy.saved);
      await load();
      if (selectedStudentId === user.id) await openStudent(user);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteClass(classId: string) {
    if (!window.confirm(copy.confirmDeleteClass)) return;
    setBusyId(classId);
    try {
      await manageClass({ data: { classId, action: "delete" } });
      toast.success(copy.deleted);
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
      setStudentDetail(await loadStudent({ data: { studentId: selectedStudentId } }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setBusyId(null);
    }
  }

  const roleLabel = (role: string) =>
    role === "student" ? copy.student : role === "school_admin" ? copy.school_admin : copy.teacher;

  return (
    <DashboardShell
      title={copy.title}
      tabs={[]}
      active="management"
      onSelect={() => undefined}
      schoolName={guard.schoolName}
      links={[{ to: "/school-admin/dashboard", label: copy.back }]}
    >
      <StickyNote seed="school-management-intro" className="space-y-2">
        <h2 className="text-2xl font-bold">{copy.title}</h2>
        <p className="opacity-75">{copy.intro}</p>
      </StickyNote>

      <StickyNote seed="school-management-users" className="space-y-3 overflow-x-auto">
        <h3 className="text-xl font-bold">{copy.users}</h3>
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/10">
              <th className="py-2 pr-3">{copy.name}</th>
              <th className="py-2 pr-3">{copy.role}</th>
              <th className="py-2 pr-3">{copy.class}</th>
              <th className="py-2 pr-3">{copy.status}</th>
              <th className="py-2">{copy.actions}</th>
            </tr>
          </thead>
          <tbody>
            {(data?.users ?? []).map((user) => {
              const isInactive = Boolean(user.deactivatedAt || user.locked);
              const needsReplacement = user.ownedClasses.length > 0 && !isInactive;
              return (
                <tr key={user.id} className="border-b border-black/5 align-top">
                  <td className="py-3 pr-3">
                    <div className="font-medium">{user.name ?? user.email ?? "—"}</div>
                    {user.email && <div className="text-xs opacity-65">{user.email}</div>}
                  </td>
                  <td className="py-3 pr-3">{roleLabel(user.role)}</td>
                  <td className="py-3 pr-3">
                    {user.role === "student" ? (
                      <select
                        value={user.classId ?? ""}
                        disabled={busyId === user.id || isInactive}
                        onChange={(event) => void move(user, event.target.value)}
                        className="h-9 max-w-[220px] rounded-md border border-black/15 bg-white px-2 text-sm text-slate-900"
                        aria-label={copy.moveTo}
                      >
                        <option value="">—</option>
                        {(data?.classes ?? []).map((cls) => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="space-y-1">
                        <div>{user.ownedClasses.length ? user.ownedClasses.map((cls) => cls.name).join(", ") : "—"}</div>
                        {needsReplacement && (
                          <select
                            value={replacement[user.id] ?? ""}
                            onChange={(event) => setReplacement((prev) => ({ ...prev, [user.id]: event.target.value }))}
                            className="h-9 max-w-[240px] rounded-md border border-black/15 bg-white px-2 text-sm text-slate-900"
                            aria-label={copy.replacement}
                          >
                            <option value="">{copy.chooseReplacement}</option>
                            {replacementTeachers.filter((teacher) => teacher.id !== user.id).map((teacher) => (
                              <option key={teacher.id} value={teacher.id}>{teacher.name ?? teacher.email ?? "—"}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    <span className={isInactive ? "rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900" : "rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-900"}>
                      {isInactive ? copy.inactive : copy.active}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex max-w-[360px] flex-wrap gap-2">
                      {user.role === "student" && (
                        <Button size="sm" variant="outline" className="rounded-full" onClick={() => void openStudent(user)}>
                          {copy.manage}
                        </Button>
                      )}
                      {isInactive ? (
                        <Button size="sm" variant="outline" className="rounded-full" disabled={busyId === user.id} onClick={() => void lifecycle(user, "reactivate")}>
                          {copy.reactivate}
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="rounded-full" disabled={busyId === user.id || user.id === data?.currentUserId} onClick={() => void lifecycle(user, "deactivate")}>
                          {copy.deactivate}
                        </Button>
                      )}
                      {user.role === "school_admin" && user.id !== data?.currentUserId && !isInactive && (
                        <Button size="sm" variant="outline" className="rounded-full" disabled={busyId === user.id} onClick={() => void lifecycle(user, "demote_to_teacher")}>
                          {copy.demote}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="rounded-full bg-red-600 text-white hover:bg-red-700"
                        disabled={busyId === user.id || user.id === data?.currentUserId}
                        onClick={() => void lifecycle(user, "delete")}
                      >
                        {copy.delete}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </StickyNote>

      <StickyNote seed="school-management-classes" className="space-y-3 overflow-x-auto">
        <h3 className="text-xl font-bold">{copy.classes}</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/10">
              <th className="py-2 pr-3">{copy.name}</th>
              <th className="py-2 pr-3">{copy.teacher}</th>
              <th className="py-2">{copy.actions}</th>
            </tr>
          </thead>
          <tbody>
            {(data?.classes ?? []).map((cls) => (
              <tr key={cls.id} className="border-b border-black/5">
                <td className="py-2 pr-3 font-medium">{cls.name}</td>
                <td className="py-2 pr-3">{cls.ownerName ?? "—"}</td>
                <td className="py-2">
                  <Button size="sm" className="rounded-full bg-red-600 text-white hover:bg-red-700" disabled={busyId === cls.id} onClick={() => void deleteClass(cls.id)}>
                    {copy.deleteClass}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </StickyNote>

      {selectedStudentId && (
        <StudentCompliancePanel
          detail={studentDetail}
          loading={detailBusy}
          copy={copy}
          language={language}
          busyId={busyId}
          onClose={() => {
            setSelectedStudentId(null);
            setStudentDetail(null);
          }}
          onDeleteResponse={deleteResponse}
        />
      )}
    </DashboardShell>
  );
}

function StudentCompliancePanel({
  detail,
  loading,
  copy,
  language,
  busyId,
  onClose,
  onDeleteResponse,
}: {
  detail: StudentComplianceDetail | null;
  loading: boolean;
  copy: Record<string, string>;
  language: "fi" | "en" | "sv";
  busyId: string | null;
  onClose: () => void;
  onDeleteResponse: (fieldKey: string) => Promise<void>;
}) {
  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";
  const printable = (value: unknown) => {
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value ?? "");
    }
  };

  return (
    <StickyNote seed="school-management-student-detail" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xl font-bold">{detail?.name ?? copy.student}</h3>
          {detail?.email && <p className="text-sm opacity-70">{detail.email}</p>}
        </div>
        <Button variant="outline" className="rounded-full" onClick={onClose}>{copy.back}</Button>
      </div>

      {loading && <p className="opacity-70">…</p>}

      {!loading && detail && (
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
                        onClick={() => void onDeleteResponse(response.fieldKey)}
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
                        <td className="py-2 pr-3">{getStrengthName(gift.strengthId, lang)}</td>
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
  );
}
