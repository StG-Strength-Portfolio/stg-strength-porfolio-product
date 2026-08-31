import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useRouter, useNavigate } from "@tanstack/react-router";
import { useIdleLogout } from "@/hooks/use-idle-logout";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Password-recovery links land here (e.g. "/" or any authenticated path)
    // carrying #access_token=...&type=recovery in the URL hash. If we let the
    // normal "are you logged in?" check run first, it either bounces the user
    // to /auth (no session yet) or — worse — silently authenticates them via
    // the recovery token and sends them straight to their role dashboard,
    // skipping the "set new password" screen entirely. Catch that case first
    // and force them to /reset-password before anything else evaluates.
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      throw redirect({ to: "/reset-password" });
    }

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
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
