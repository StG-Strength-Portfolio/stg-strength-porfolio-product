/**
 * Decorative corner shapes used on the playful sticky-note canvas.
 * Non-interactive, hidden in print.
 */
export function CornerBlobs() {
  return (
    <div aria-hidden className="pointer-events-none no-print absolute inset-0 overflow-hidden">
      <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[color:var(--coral)]/70 blur-2xl" />
      <div className="absolute -right-20 top-24 h-40 w-40 rotate-12 bg-[color:var(--yellow)]/80" style={{ clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }} />
      <div className="absolute -bottom-24 -right-12 h-72 w-72 rounded-full bg-[color:var(--teal)]/60 blur-2xl" />
      <div className="absolute bottom-10 left-8 h-24 w-24 rounded-full bg-[color:var(--mint)]/70" />
    </div>
  );
}