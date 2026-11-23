/** Letterboxd-style "Du hast 12 von 40 gespielt · 30 %" bar for studios and lists. */
export function ProgressMeter({ done, total, className = "" }: { done: number; total: number; className?: string }) {
  if (!total) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <div className={`rounded-lg border border-line bg-surface/60 p-3 ${className}`}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted">
          Du hast <span className="font-semibold text-text">{done}</span> von {total} gespielt
        </span>
        <span className="font-display text-xl font-bold text-lime tabular-nums">{pct}&nbsp;%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-lime transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function PlayedMark() {
  return (
    <span title="Gespielt" className="text-lime">
      ✓
    </span>
  );
}
