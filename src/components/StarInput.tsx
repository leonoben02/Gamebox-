"use client";

import { useState } from "react";

/** Half-star rating input. value is 0..10 (0 = none). Click the current value again to clear. */
export function StarInput({ value, onChange, size = 30 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;
  return (
    <div className="inline-flex select-none" onMouseLeave={() => setHover(null)} role="radiogroup" aria-label="Bewertung">
      {[1, 2, 3, 4, 5].map((star) => {
        const full = shown >= star * 2;
        const half = !full && shown === star * 2 - 1;
        return (
          <span key={star} className="relative" style={{ width: size, height: size }}>
            <svg viewBox="0 0 24 24" width={size} height={size} className="absolute inset-0">
              <defs>
                <linearGradient id={`half-${star}`}>
                  <stop offset="50%" stopColor="var(--lime)" />
                  <stop offset="50%" stopColor="var(--line)" />
                </linearGradient>
              </defs>
              <path
                d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
                fill={full ? "var(--lime)" : half ? `url(#half-${star})` : "var(--line)"}
              />
            </svg>
            {[star * 2 - 1, star * 2].map((v, i) => (
              <button
                key={v}
                type="button"
                aria-label={`${v / 2} Sterne`}
                className="absolute top-0 h-full w-1/2"
                style={{ left: i === 0 ? 0 : "50%" }}
                onMouseEnter={() => setHover(v)}
                onClick={() => onChange(value === v ? 0 : v)}
              />
            ))}
          </span>
        );
      })}
    </div>
  );
}
