import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useRouter, useNavigate } from "@tanstack/react-router";
import { useIdleLogout } from "@/hooks/use-idle-logout";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
 beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
    const { data: profile } = await supabase
      .from("profiles" as never)
      .select("locked")
      .eq("id", data.user.id)
      .maybeSingle();
    if ((profile as { locked?: boolean } | null)?.locked) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth/login", search: { locked: "1" } });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const router = useRouter();
  const navigate = useNavigate();
  useIdleLogout();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        navigate({ to: "/auth", replace: true });
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        router.invalidate();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router, navigate]);

  return <Outlet />;
}