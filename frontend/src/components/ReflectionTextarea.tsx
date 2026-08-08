import { useEffect, useState } from "react";
import { useAutosave, useResponseReader, type SaveState } from "@/hooks/use-autosave";
import { useReportCompletion } from "@/lib/screen-completion";
import { useTFi } from "@/lib/i18n";

export function ReflectionTextarea({
  fieldKey,
  label,
  placeholder,
  rows = 4,
  onSaveStateChange,
}: {
  fieldKey: string;
  label?: string;
  placeholder?: string;
  rows?: number;
  onSaveStateChange?: (s: SaveState) => void;
}) {
  const [value, setValue] = useState("");
  const [loaded, setLoaded] = useState(false);
  const report = useReportCompletion();
  const tFi = useTFi();

  // @lovable-new 2026-08-05 — mode-aware read (empty in teacher preview).
  const readResponse = useResponseReader();
  useEffect(() => {
    (async () => {
      const v = await readResponse<string>(fieldKey);
      if (typeof v === "string") setValue(v);
      setLoaded(true);
    })();
  }, [fieldKey, readResponse]);

  const state = useAutosave(fieldKey, value, { enabled: loaded });
  useEffect(() => { onSaveStateChange?.(state); }, [state, onSaveStateChange]);

  useEffect(() => {
    if (!loaded) return;
    report(fieldKey, value.trim().length > 0);
  }, [value, loaded, fieldKey, report]);

  const minHeight = `calc(${rows} * 1.65rem + 1rem)`;
  const displayLabel = label ? tFi(label) : undefined;
  const displayPlaceholder = placeholder ? tFi(placeholder) : undefined;

  return (
    <div className="flex flex-1 flex-col text-left">
      {displayLabel && (
        <label
          htmlFor={fieldKey}
          className="mb-1.5 block text-left text-sm font-display font-semibold text-[color:var(--ink)]"
        >
          {displayLabel}
        </label>
      )}
      <div className="workbook-paper flex-1">
        <textarea
          id={fieldKey}
          data-notrans
          className="block w-full flex-1 bg-transparent text-left text-[0.95rem] leading-[1.65rem] focus:outline-none resize-y px-0 py-0"
          style={{ minHeight, color: "var(--ink)" }}
          rows={rows}
          placeholder={displayPlaceholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
    </div>
  );
}

export function ReflectionInput({
  fieldKey,
  placeholder,
  prefix,
  onSaveStateChange,
}: {
  fieldKey: string;
  placeholder?: string;
  prefix?: string;
  onSaveStateChange?: (s: SaveState) => void;
}) {
  const [value, setValue] = useState("");
  const [loaded, setLoaded] = useState(false);
  const report = useReportCompletion();
  const tFi = useTFi();

  // @lovable-new 2026-08-05 — mode-aware read (empty in teacher preview).
  const readResponse = useResponseReader();
  useEffect(() => {
    (async () => {
      const v = await readResponse<string>(fieldKey);
      if (typeof v === "string") setValue(v);
      setLoaded(true);
    })();
  }, [fieldKey, readResponse]);
  const state = useAutosave(fieldKey, value, { enabled: loaded });
  useEffect(() => { onSaveStateChange?.(state); }, [state, onSaveStateChange]);
  useEffect(() => {
    if (!loaded) return;
    report(fieldKey, value.trim().length > 0);
  }, [value, loaded, fieldKey, report]);

  const displayPrefix = prefix ? tFi(prefix) : undefined;
  const displayPlaceholder = placeholder ? tFi(placeholder) : undefined;

  return (
    <div className="workbook-line flex items-baseline gap-2 text-left">
      {displayPrefix && (
        <span className="font-display text-sm font-semibold whitespace-nowrap text-[color:var(--ink)]/80">
          {displayPrefix}
        </span>
      )}
      <input
        data-notrans
        className="flex-1 bg-transparent text-[0.95rem] leading-[1.65rem] focus:outline-none"
        value={value}
        placeholder={displayPlaceholder}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}
