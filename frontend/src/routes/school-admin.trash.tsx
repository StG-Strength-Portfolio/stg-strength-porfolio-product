import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/DashboardShell";
import { StickyNote } from "@/components/StickyNote";
import { useLanguage, useTr } from "@/lib/i18n";
import { useRoleGuard } from "@/lib/role-guard";
import {
  getSchoolTrash,
  manageClassLifecycle,
  manageSchoolUser,
  type SchoolTrashClass,
  type SchoolTrashUser,
} from "@/lib/school-compliance.functions";

export const Route = createFileRoute("/school-admin/trash")({
  component: SchoolAdminTrash,
});

function SchoolAdminTrash() {
  const tr = useTr();
  const { language } = useLanguage();
  const guard = useRoleGuard(["school_admin"]);
  const navigate = useNavigate();
  const loadTrash = useServerFn(getSchoolTrash);
  const manageUser = useServerFn(manageSchoolUser);
  const manageClass = useServerFn(manageClassLifecycle);
  const [users, setUsers] = useState<SchoolTrashUser[]>([]);
  const [classes, setClasses] = useState<SchoolTrashClass[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const copy = language === "en"
    ? {
        title: "Trash",
        intro: "Deleted users and classes can be restored for 90 days.",
        users: "Deleted users",
        classes: "Deleted classes",
        emptyUsers: "No deleted users.",
        emptyClasses: "No deleted classes.",
        deleted: "Deleted",
        restoreUntil: "Restore until",
        restore: "Restore",
        restored: "Restored",
        back: "Back to dashboard",
        expired: "Restore period expired",
      }
    : language === "sv"
      ? {
          title: "Papperskorg",
          intro: "Raderade användare och klasser kan återställas i 90 dagar.",
          users: "Raderade användare",
          classes: "Raderade klasser",
          emptyUsers: "Inga raderade användare.",
          emptyClasses: "Inga raderade klasser.",
          deleted: "Raderad",
          restoreUntil: "Kan återställas till",
          restore: "Återställ",
          restored: "Återställd",
          back: "Tillbaka till kontrollpanelen",
          expired: "Återställningsperioden har löpt ut",
        }
      : {
          title: "Roskakori",
          intro: "Poistetut käyttäjät ja luokat voidaan palauttaa 90 päivän ajan.",
          users: "Poistetut käyttäjät",
          classes: "Poistetut luokat",
          emptyUsers: "Ei poistettuja käyttäjiä.",
          emptyClasses: "Ei poistettuja luokkia.",
          deleted: "Poistettu",
          restoreUntil: "Palautettavissa asti",
          restore: "Palauta",
          restored: "Palautettu",
          back: "Takaisin hallintapaneeliin",
          expired: "Palautusaika on päättynyt",
        };

  const load = useCallback(async () => {
    if (guard.preview) {
      setUsers([]);
      setClasses([]);
      return;
    }
    try {
      const result = await loadTrash();
      setUsers(result.users);
      setClasses(result.classes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  }, [guard.preview, loadTrash]);

  useEffect(() => {
    if (guard.ready) void load();
  }, [guard.ready, load]);

  if (!guard.ready) return null;

  const expired = (until: string) => new Date(until).getTime() < Date.now();
  const format = (value: string) => new Date(value).toLocaleDateString();

  async function restoreUser(user: SchoolTrashUser) {
    if (expired(user.restoreUntil)) return;
    setBusyId(user.id);
    try {
      await manageUser({ data: { userId: user.id, action: "restore" } });
      toast.success(copy.restored);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setBusyId(null);
    }
  }

  async function restoreClass(cls: SchoolTrashClass) {
    if (expired(cls.restoreUntil)) return;
    setBusyId(cls.id);
    try {
      await manageClass({ data: { classId: cls.id, action: "restore" } });
      toast.success(copy.restored);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <DashboardShell
      title={copy.title}
      tabs={[]}
      active="trash"
      onSelect={() => undefined}
      schoolName={guard.schoolName}
      links={[{ to: "/school-admin/dashboard", label: copy.back }]}
    >
      <StickyNote seed="school-trash-intro" className="space-y-2">
        <h2 className="text-2xl font-bold">{copy.title}</h2>
        <p className="opacity-75">{copy.intro}</p>
        <Button variant="outline" className="rounded-full" onClick={() => navigate({ to: "/school-admin/dashboard" })}>
          {copy.back}
        </Button>
      </StickyNote>

      <TrashTable
        title={copy.users}
        empty={copy.emptyUsers}
        rows={users.map((user) => ({
          id: user.id,
          name: user.name ?? user.email ?? "—",
          detail: `${user.role}${user.email ? ` · ${user.email}` : ""}`,
          deletedAt: user.deletedAt,
          restoreUntil: user.restoreUntil,
          onRestore: () => restoreUser(user),
        }))}
        busyId={busyId}
        labels={copy}
        format={format}
        expired={expired}
      />

      <TrashTable
        title={copy.classes}
        empty={copy.emptyClasses}
        rows={classes.map((cls) => ({
          id: cls.id,
          name: cls.name,
          detail: cls.teacherName ? `${tr("Opettaja")}: ${cls.teacherName}` : "",
          deletedAt: cls.deletedAt,
          restoreUntil: cls.restoreUntil,
          onRestore: () => restoreClass(cls),
        }))}
        busyId={busyId}
        labels={copy}
        format={format}
        expired={expired}
      />
    </DashboardShell>
  );
}

function TrashTable({
  title,
  empty,
  rows,
  busyId,
  labels,
  format,
  expired,
}: {
  title: string;
  empty: string;
  rows: Array<{
    id: string;
    name: string;
    detail: string;
    deletedAt: string;
    restoreUntil: string;
    onRestore: () => Promise<void>;
  }>;
  busyId: string | null;
  labels: { deleted: string; restoreUntil: string; restore: string; expired: string };
  format: (value: string) => string;
  expired: (value: string) => boolean;
}) {
  return (
    <StickyNote seed={`trash-${title}`} className="overflow-x-auto space-y-3">
      <h3 className="text-xl font-bold">{title}</h3>
      {rows.length === 0 ? (
        <p className="opacity-70">{empty}</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/10">
              <th className="py-2 pr-3">{title}</th>
              <th className="py-2 pr-3">{labels.deleted}</th>
              <th className="py-2 pr-3">{labels.restoreUntil}</th>
              <th className="py-2">{labels.restore}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isExpired = expired(row.restoreUntil);
              return (
                <tr key={row.id} className="border-b border-black/5">
                  <td className="py-2 pr-3">
                    <div className="font-medium">{row.name}</div>
                    {row.detail && <div className="text-xs opacity-65">{row.detail}</div>}
                  </td>
                  <td className="py-2 pr-3">{format(row.deletedAt)}</td>
                  <td className="py-2 pr-3">{format(row.restoreUntil)}</td>
                  <td className="py-2">
                    {isExpired ? (
                      <span className="text-xs opacity-60">{labels.expired}</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        disabled={busyId === row.id}
                        onClick={() => void row.onRestore()}
                      >
                        {labels.restore}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </StickyNote>
  );
}
