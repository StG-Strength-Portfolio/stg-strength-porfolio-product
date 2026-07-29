import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { isCurrentUserAdmin } from "@/lib/auth-helpers";
import { adminListUsers, adminSetLocked, type AdminUserRow } from "@/lib/admin-actions";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { Lock, Unlock, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminDashboard,
});

async function authHeader(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function AdminDashboard() {
  const navigate = useNavigate();
  const t = useT();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await authHeader();
      const rows = await adminListUsers({ headers });
      setUsers(rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    isCurrentUserAdmin().then((ok) => {
      setAllowed(ok);
      if (!ok) {
        navigate({ to: "/seikkailu", replace: true });
        return;
      }
      load();
    });
  }, [navigate, load]);

  async function toggleLock(row: AdminUserRow) {
    const willLock = !row.locked;
    const msg = willLock ? t("admin.confirm.lock") : t("admin.confirm.unlock");
    if (!window.confirm(msg)) return;
    setBusyId(row.id);
    try {
      const headers = await authHeader();
      await adminSetLocked({ headers, data: { userId: row.id, locked: willLock } });
      setUsers((prev) =>
        prev.map((u) => (u.id === row.id ? { ...u, locked: willLock } : u)),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusyId(null);
    }
  }

  if (allowed === null || allowed === false) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden px-4 py-10">
      <CornerBlobs />
      <div className="relative z-10 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("admin.title")}</h1>
            <p className="text-muted-foreground">{t("admin.subtitle")}</p>
          </div>
          <Button variant="outline" onClick={() => load()} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        </div>

        <StickyNote seed="admin-users">
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">{t("admin.loading")}</p>
          ) : users.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">{t("admin.empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-4">{t("admin.col.name")}</th>
                    <th className="py-2 pr-4">{t("admin.col.email")}</th>
                    <th className="py-2 pr-4">{t("admin.col.role")}</th>
                    <th className="py-2 pr-4">{t("admin.col.language")}</th>
                    <th className="py-2 pr-4">{t("admin.col.status")}</th>
                    <th className="py-2 pr-4" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">
                        {u.displayName || "—"}
                        {u.isAdmin && (
                          <span className="ml-2 text-xs rounded-full bg-[color:var(--purple)]/10 text-[color:var(--purple)] px-2 py-0.5">
                            admin
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">{u.email || "—"}</td>
                      <td className="py-2 pr-4">{u.role}</td>
                      <td className="py-2 pr-4">{u.language || "—"}</td>
                      <td className="py-2 pr-4">
                        {u.locked ? (
                          <span className="text-destructive font-medium">
                            {t("admin.status.locked")}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium">
                            {t("admin.status.active")}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {!u.isAdmin && (
                          <Button
                            size="sm"
                            variant={u.locked ? "outline" : "destructive"}
                            disabled={busyId === u.id}
                            onClick={() => toggleLock(u)}
                          >
                            {u.locked ? <Unlock /> : <Lock />}
                            {u.locked ? t("admin.action.unlock") : t("admin.action.lock")}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </StickyNote>
      </div>
    </div>
  );
}