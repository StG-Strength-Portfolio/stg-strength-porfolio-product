import type { ReactNode } from "react";
import type { SaveState } from "@/hooks/use-autosave";
import { AutosaveScope } from "@/hooks/use-autosave";
import { TranslateFi } from "@/lib/i18n";
import { ScreenContent } from "@/lib/screen-content";
import { meterContentFor } from "@/lib/meter-content";
import { METER_FIRST_SCREEN, METER_TOP } from "@/lib/meter-data";
import { Screen6Strengths } from "@/components/screens/Screen6Strengths";
import { Screen10Strengths } from "@/components/screens/Screen10Strengths";
import { Screen32Strengths } from "@/components/screens/Screen32Strengths";

export type PortfolioScreenMode = "student" | "teacher-preview";

type Props = {
  n: number;
  mode?: PortfolioScreenMode;
  onSaveStateChange?: (state: SaveState) => void;
};

/**
 * Single source of truth for which implementation renders each Strength
 * Portfolio screen. Student and teacher presentation views both use this
 * component, so future custom screen replacements only need to be registered
 * here once.
 */
export function PortfolioScreen({
  n,
  mode = "student",
  onSaveStateChange,
}: Props) {
  const readOnly = mode === "teacher-preview";
  const saveHandler = readOnly ? undefined : onSaveStateChange;

  let content: ReactNode = null;

  if (n === 6) {
    content = <Screen6Strengths onSaveStateChange={saveHandler} />;
  } else if (n === 10) {
    content = <Screen10Strengths onSaveStateChange={saveHandler} />;
  } else if (n === 32) {
    content = <Screen32Strengths onSaveStateChange={saveHandler} />;
  } else if (n >= METER_FIRST_SCREEN && n <= METER_TOP) {
    content = meterContentFor(n, { onSaveStateChange: saveHandler });
  } else if (n >= 1 && n <= 73) {
    content = <ScreenContent n={n} onSaveStateChange={saveHandler} />;
  }

  if (!content) return null;

  return (
    <AutosaveScope enabled={!readOnly}>
      <div
        aria-disabled={readOnly || undefined}
        className={
          readOnly
            ? "pointer-events-none min-h-full select-none [&_button]:pointer-events-none [&_input]:pointer-events-none [&_select]:pointer-events-none [&_textarea]:pointer-events-none"
            : "h-full min-h-0 overflow-hidden"
        }
      >
        <TranslateFi>{content}</TranslateFi>
      </div>
    </AutosaveScope>
  );
}

export function hasPortfolioScreen(n: number): boolean {
  return (n >= 1 && n <= 73) || (n >= METER_FIRST_SCREEN && n <= METER_TOP);
}
