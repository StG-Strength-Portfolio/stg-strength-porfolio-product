import { LANGUAGES, useLanguage, type Language } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const ORDER: Language[] = ["fi", "sv", "en"];

/**
 * FI | SV | EN switcher for staff surfaces (Super Admin, School Admin, Teacher).
 * Always persists to localStorage; optionally also to the user's profile row.
 */
export function LanguageSwitcher({
  className,
  persistToProfile = false,
}: {
  className?: string;
  persistToProfile?: boolean;
}) {
  const { language, setLanguage } = useLanguage();
  const items = ORDER.filter((l) => LANGUAGES.includes(l));

  async function pick(l: Language) {
    setLanguage(l);
    if (!persistToProfile) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase
      .from("profiles" as never)
      .update({ language: l } as never)
      .eq("id", data.user.id);
  }

  return (
    <div className={cn("flex items-center gap-1 text-[12px] font-semibold", className)}>
      {items.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void pick(l)}
            aria-pressed={language === l}
            className={cn(
              "rounded-full px-2 py-0.5 transition-colors",
              language === l
                ? "bg-foreground/15 text-foreground"
                : "text-foreground/60 hover:text-foreground",
            )}
          >
            {l.toUpperCase()}
          </button>
          {i < items.length - 1 && <span className="text-foreground/30">|</span>}
        </span>
      ))}
    </div>
  );
}
