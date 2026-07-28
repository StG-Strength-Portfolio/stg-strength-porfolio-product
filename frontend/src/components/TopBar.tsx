import { useEffect, useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";
import { useT } from "@/lib/i18n";

export function TopBar({ subtitle }: { subtitle?: string }) {
  const navigate = useNavigate();
  const t = useT();
  const fallbackName = t("common.name");
  const [name, setName] = useState<string>(fallbackName);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) {
          setName(fallbackName);
          return;
        }
        const { data: prof, error } = await supabase
          .from("profiles" as never)
          .select("display_name")
          .eq("id", u.user.id)
          .maybeSingle();
        if (error) {
          console.error("Error fetching profile:", error);
          setName(fallbackName);
          return;
        }
        const trimmed = (prof as { display_name?: string | null } | null)?.display_name?.trim();
        setName(trimmed || fallbackName);
      } catch (err) {
        console.error("Profile fetch failed:", err);
        setName(fallbackName);
      }
    }

    fetchProfile();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
        fetchProfile();
      }
      if (event === "SIGNED_OUT") {
        setName(fallbackName);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [fallbackName]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/10 bg-[color:var(--purple-dark)]/70 px-3 backdrop-blur">
      <SidebarTrigger className="text-foreground" />
      <div className="font-display text-lg leading-none">{t("app.title")}</div>
      {subtitle && <div className="hidden md:block text-sm opacity-80 truncate">— {subtitle}</div>}
      <div className="ml-auto flex items-center gap-2">
        <span className="inline-flex max-w-[40vw] items-center rounded-full px-3 py-1 font-display text-base sm:text-lg leading-none truncate text-foreground">
          {name}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={signOut}
          aria-label={t("common.logout")}
          title={t("common.logout")}
          className="text-foreground hover:bg-white/10 rounded-full"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
