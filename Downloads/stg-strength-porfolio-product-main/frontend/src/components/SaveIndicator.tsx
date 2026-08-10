import type { SaveState } from "@/hooks/use-autosave";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { useT } from "@/lib/i18n";

export function SaveIndicator({ state }: { state: SaveState }) {
  const t = useT();
  if (state === "idle") return <span className="text-xs opacity-60">{t("common.save.idle")}</span>;
  if (state === "saving")
    return (
      <span className="text-xs inline-flex items-center gap-1 opacity-90">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("common.save.saving")}
      </span>
    );
  if (state === "saved")
    return (
      <span className="text-xs inline-flex items-center gap-1 opacity-90">
        <Check className="h-3.5 w-3.5" /> {t("common.save.saved")}
      </span>
    );
  return (
    <span className="text-xs inline-flex items-center gap-1 text-[color:var(--coral)]">
      <TriangleAlert className="h-3.5 w-3.5" /> {t("common.save.error")}
    </span>
  );
}
