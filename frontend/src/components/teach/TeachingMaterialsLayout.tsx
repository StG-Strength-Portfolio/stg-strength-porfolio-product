/**
 * @lovable-new 2026-08-05 — Shared full-width Teaching Materials page layout for
 * teachers and school admins. Replaces DashboardShell on those two routes so the
 * duplicated purple sidebar is gone and the browser uses the whole viewport width.
 */
import type { ReactNode } from "react";
import { CornerBlobs } from "@/components/CornerBlobs";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTr } from "@/lib/i18n";

export function TeachingMaterialsLayout({ children }: { children: ReactNode }) {
  const tr = useTr();

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <CornerBlobs />
      <div className="relative z-10 mx-auto w-full max-w-[1560px] px-6 py-6 md:px-8 md:py-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl md:text-4xl">{tr("Opetusmateriaalit")}</h1>
          <LanguageSwitcher persistToProfile />
        </header>

        <main className="mt-4 min-w-0">{children}</main>
      </div>
    </div>
  );
}
