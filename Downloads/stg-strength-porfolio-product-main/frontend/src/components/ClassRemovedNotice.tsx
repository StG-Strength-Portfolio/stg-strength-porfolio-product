import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CornerBlobs } from "@/components/CornerBlobs";
import { StickyNote } from "@/components/StickyNote";
import { LockIcon } from "@/components/icons/AppIcons";
import { supabase } from "@/integrations/supabase/client";
import { useTr } from "@/lib/i18n";

/**
 * Shown to a student whose class has been removed by the teacher.
 * Blocks access to the adventure until they join a new class.
 */
export function ClassRemovedNotice() {
  const tr = useTr();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <CornerBlobs />
      <StickyNote seed="class-removed" className="relative z-10 max-w-md space-y-4 text-center">
        <div className="flex justify-center">
          <LockIcon size={36} />
        </div>
        <h1 className="font-display text-2xl">{tr("Luokkasi on poistettu")}</h1>
        <p className="text-sm opacity-80">
          {tr(
            "Luokkasi on poistettu. Ota yhteyttä opettajaasi tai liity uuteen luokkaan koodilla.",
          )}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            className="rounded-full bg-[color:var(--purple)] font-bold text-white hover:bg-[color:var(--purple)]/90"
            onClick={() => navigate({ to: "/liity-yhteisoon" })}
          >
            {tr("Liity uuteen luokkaan")}
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => void signOut()}>
            {tr("Kirjaudu ulos")}
          </Button>
        </div>
      </StickyNote>
    </div>
  );
}
