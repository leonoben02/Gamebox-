"use client";

import { useState } from "react";

const STAR = "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z";

/**
 * Half-star rating input. value is 0..10 (0 = none).
 * Tap the left half of a star for x.5, the right half for a full star. The star that changed pops,
 * the chosen value is shown as text (e.g. "3,5"), and a clear "Entfernen" link removes the rating.
 */
export function StarInput({
  value,
  onChange,
  size = 30,
  removable = true,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
  removable?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [pop, setPop] = useState<{ star: number; key: number } | null>(null);
  const shown = hover ?? value;

  function pick(v: number) {
    setHover(null);
    setPop({ star: Math.ceil(v / 2), key: Date.now() });
    onChange(v);
  }

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <div className="inline-flex select-none touch-manipulation" onMouseLeave={() => setHover(null)} role="radiogroup" aria-label="Bewertung">
        {[1, 2, 3, 4, 5].map((star) => {
          const full = shown >= star * 2;
          const half = !full && shown === star * 2 - 1;
          const popping = pop?.star === star;
          return (
            <span
              key={popping ? `${star}-${pop.key}` : star}
              className={`relative ${popping ? "star-pop" : ""}`}
              style={{ width: size, height: size }}
            >
              <svg viewBox="0 0 24 24" width={size} height={size} className="absolute inset-0 overflow-visible">
                <path d={STAR} fill="var(--line)" />
                {(full || half) && (
                  <path
                    d={STAR}
                    fill="var(--lime)"
                    className="transition-[clip-path] duration-150"
                    style={{ clipPath: full ? "inset(0 0 0 0)" : "inset(0 50% 0 0)" }}
                  />
                )}
                {half && <line x1="12" y1="3" x2="12" y2="18" stroke="var(--bg)" strokeWidth="0.8" opacity="0.6" />}
              </svg>
              {[star * 2 - 1, star * 2].map((v, i) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={value === v}
                  aria-label={`${String(v / 2).replace(".", ",")} Sterne`}
                  className="absolute top-0 h-full w-1/2"
                  style={{ left: i === 0 ? 0 : "50%" }}
                  onMouseEnter={() => setHover(v)}
                  onClick={() => pick(value === v ? 0 : v)}
                />
              ))}
            </span>
          );
        })}
      </div>
      <div className="flex h-4 items-center gap-2 text-xs">
        {shown > 0 ? (
          <span key={shown} className="star-label font-semibold text-lime tabular-nums">
            {String(shown / 2).replace(".", ",")} / 5
          </span>
        ) : (
          <span className="text-faint">Links tippen = halber Stern</span>
        )}
        {removable && value > 0 && hover === null && (
          <button type="button" onClick={() => pick(0)} className="text-muted underline underline-offset-2 hover:text-text">
            Entfernen
          </button>
        )}
      </div>
    </div>
  );
}
