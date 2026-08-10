import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/** Client-side gate: only users with the `super_admin` role may stay. */
export function useSuperAdminGuard() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        navigate({ to: "/superadmin/login", replace: true });
        return;
      }
      const { data } = await supabase
        .from("user_roles" as never)
        .select("role")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      const role = (data as { role?: string } | null)?.role;
      if (role !== "super_admin") {
        navigate({ to: "/", replace: true });
        return;
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return ready;
}
