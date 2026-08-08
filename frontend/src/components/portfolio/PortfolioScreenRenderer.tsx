/**
 * @lovable-new 2026-08-05 — ONE shared student/teacher portfolio screen renderer.
 *
 * Both the student adventure route and the teacher "Strength Portfolio" preview
 * render through this component, so screen wording, illustrations, layout,
 * translations and screen-specific components can never drift apart.
 *
 * mode="student"         → normal behaviour (loads answers, autosaves).
 * mode="teacher-preview" → the exact same JSX inside a PortfolioDataProvider
 *                          with reads and writes disabled, so every control
 *                          renders empty and no student response request is
 *                          ever made. No global flag, no MutationObserver and
 *                          no direct DOM value mutation.
 */
import { type ReactNode } from "react";
import { ScreenContent, hasContent } from "@/lib/screen-content";
import { TranslateFi } from "@/lib/i18n";
import { PortfolioDataProvider } from "@/hooks/use-autosave";
import type { SaveState } from "@/hooks/use-autosave";
import { cn } from "@/lib/utils";

export type PortfolioScreenMode = "student" | "teacher-preview";

export function PortfolioScreenRenderer({
  screenNumber,
  mode = "student",
  onSaveStateChange,
  className,
  fallback,
}: {
  screenNumber: number;
  mode?: PortfolioScreenMode;
  onSaveStateChange?: (s: SaveState) => void;
  className?: string;
  fallback?: ReactNode;
}) {
  const preview = mode === "teacher-preview";

  if (!hasContent(screenNumber)) return <>{fallback ?? null}</>;

  const content = (
    <PortfolioDataProvider mode={mode}>
      <TranslateFi>
        <ScreenContent n={screenNumber} {...(preview ? {} : { onSaveStateChange })} />
      </TranslateFi>
    </PortfolioDataProvider>
  );

  if (!preview) return <div className={className}>{content}</div>;

  /* @lovable-new 2026-08-05 — Read-only presentation wrapper: interaction is
     blocked at the container level (no DOM writes into React-owned inputs). */
  return (
    <div
      className={cn("portfolio-preview", className)}
      aria-label="preview"
      aria-readonly="true"
      onClickCapture={block}
      onSubmitCapture={block}
      onKeyDownCapture={blockEditKeys}
      onDragStartCapture={block}
      onDropCapture={block}
    >
      <div className="pointer-events-none select-none">{content}</div>
    </div>
  );
}

function block(e: React.SyntheticEvent) {
  e.preventDefault();
  e.stopPropagation();
}

function blockEditKeys(e: React.KeyboardEvent) {
  const nav = ["ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Escape", "Tab"];
  if (!nav.includes(e.key)) block(e);
}
