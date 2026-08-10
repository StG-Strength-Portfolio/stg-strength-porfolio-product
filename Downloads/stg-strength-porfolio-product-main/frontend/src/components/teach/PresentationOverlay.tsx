/**
 * @lovable-new 2026-08-04
 * Shared fullscreen presentation overlay used by the teacher "Teach" section:
 * arrow-key / click navigation, Escape to exit, auto-hiding bottom toolbar.
 * Display only — it renders whatever children it is handed.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTr } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function PresentationOverlay({
  index,
  total,
  onPrev,
  onNext,
  onExit,
  counter,
  children,
}: {
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
  /** e.g. "Screen 14 / 106" */
  counter: string;
  children: ReactNode;
}) {
  const tr = useTr();
  const [toolbar, setToolbar] = useState(true);
  const hideTimer = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // Only treat "left fullscreen" as an exit when we actually entered it.
  const enteredFullscreen = useRef(false);

  const wake = useCallback(() => {
    setToolbar(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setToolbar(false), 2500);
  }, []);

  useEffect(() => {
    wake();
    // Fullscreen is a nice-to-have: if the browser refuses it (no gesture,
    // embedded preview iframe), the overlay still covers the whole viewport.
    void document.documentElement
      .requestFullscreen?.()
      .then(() => {
        enteredFullscreen.current = true;
      })
      .catch(() => undefined);
    // Freeze the page underneath so the presentation is the only scrollable layer.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
    };
  }, [wake]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        onNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        onPrev();
      } else if (e.key === "Escape") {
        onExit();
      }
      wake();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNext, onPrev, onExit, wake]);

  // Leaving browser fullscreen (F11, Esc on some browsers) closes the overlay.
  useEffect(() => {
    function onFsChange() {
      if (!document.fullscreenElement && enteredFullscreen.current) onExit();
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [onExit]);

  if (typeof document === "undefined") return null;

  // Rendered into <body> so it never nests inside (or duplicates) the page
  // content that opened it.
  return createPortal(
    <div
      ref={rootRef}
      className="journey-bg fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[color:var(--purple-dark)]"
      onMouseMove={wake}
    >
      <div className="pointer-events-none absolute right-6 top-5 z-20 font-mono text-sm text-white/80">
        {counter}
      </div>

      {/* Click zones: left third = previous, right two thirds = next */}
      <button
        type="button"
        aria-label={tr("Edellinen")}
        className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-w-resize"
        onClick={onPrev}
      />
      <button
        type="button"
        aria-label={tr("Seuraava")}
        className="absolute inset-y-0 right-0 z-10 w-2/3 cursor-e-resize"
        onClick={onNext}
      />

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-6 md:p-12">
        <div className="w-full max-w-5xl">{children}</div>
      </div>

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-center justify-center gap-3 bg-black/45 px-6 py-3 backdrop-blur transition-opacity",
          toolbar ? "opacity-100" : "opacity-0",
        )}
      >
        <button
          type="button"
          className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold text-white hover:bg-white/25 disabled:opacity-40"
          disabled={index <= 0}
          onClick={onPrev}
        >
          {tr("Edellinen")}
        </button>
        <span className="font-mono text-sm text-white/85">{counter}</span>
        <button
          type="button"
          className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold text-white hover:bg-white/25 disabled:opacity-40"
          disabled={index >= total - 1}
          onClick={onNext}
        >
          {tr("Seuraava")}
        </button>
        <button
          type="button"
          className="rounded-full bg-[color:var(--yellow)] px-4 py-1.5 text-sm font-bold text-slate-900 hover:brightness-95"
          onClick={onExit}
        >
          {tr("Sulje esitys")}
        </button>
      </div>
    </div>,
    document.body,
  );
}
