import { starsText } from "@/lib/util";

export function Stars({ rating, className = "" }: { rating: number | null | undefined; className?: string }) {
  if (!rating) return null;
  return (
    <span className={`whitespace-nowrap text-lime tracking-tight ${className}`} aria-label={`${rating / 2} von 5 Sternen`}>
      {starsText(rating)}
    </span>
  );
}

export function Heart({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`inline h-3.5 w-3.5 fill-coral ${className}`} aria-label="Geliked">
      <path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.5.8-1.3 2.3-2.5 4.4-2.5 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

export function ReplayIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`inline h-3.5 w-3.5 fill-none stroke-muted ${className}`} strokeWidth={2.4} aria-label="Erneut gespielt">
      <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Ratings histogram like on a game page / profile */
export function Histogram({ data, avg }: { data: number[]; avg?: number | null }) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex items-end gap-3">
      <span className="text-[10px] text-lime">★</span>
      <div className="flex h-16 flex-1 items-end gap-[2px]">
        {data.map((n, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-faint/60 hover:bg-lime"
            style={{ height: `${Math.max(3, (n / max) * 100)}%` }}
            title={`${n} × ${starsText(i + 1)}`}
          />
        ))}
      </div>
      <span className="text-[10px] text-lime">★★★★★</span>
      {avg != null && <span className="font-display text-2xl font-semibold text-text">{(avg / 2).toFixed(1)}</span>}
    </div>
  );
}
