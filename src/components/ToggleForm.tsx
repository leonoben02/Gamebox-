"use client";

import { useOptimistic, useTransition } from "react";

/** Small optimistic toggle button that calls a bound server action (follow, like review, like list…). */
export function ToggleButton({
  on,
  count,
  action,
  onLabel,
  offLabel,
  className = "",
  variant = "pill",
}: {
  on: boolean;
  count?: number;
  action: () => Promise<void>;
  onLabel: React.ReactNode;
  offLabel: React.ReactNode;
  className?: string;
  variant?: "pill" | "link";
}) {
  const [state, set] = useOptimistic({ on, count: count ?? 0 }, (s) => ({ on: !s.on, count: s.count + (s.on ? -1 : 1) }));
  const [, start] = useTransition();
  const cls =
    variant === "pill"
      ? `btn ${state.on ? "bg-line text-text" : "bg-lime text-[#151320] hover:brightness-110"} !py-1.5`
      : `text-sm ${state.on ? "text-coral" : "text-muted hover:text-text"}`;
  return (
    <button
      type="button"
      className={`${cls} ${className}`}
      onClick={() =>
        start(async () => {
          set(null);
          await action();
        })
      }
    >
      {state.on ? onLabel : offLabel}
      {count !== undefined && <span className="ml-1 tabular-nums">{state.count}</span>}
    </button>
  );
}
