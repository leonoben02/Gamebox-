"use client";

import { useState } from "react";
import { GameSearchPicker, type PickedGame } from "./GameSearchPicker";
import { LogDialog } from "./LogDialog";

/** Header "+ Loggen" button: pick a game, then open the log dialog. */
export function LogButton({ variant = "button" }: { variant?: "button" | "icon" }) {
  const [picking, setPicking] = useState(false);
  const [game, setGame] = useState<PickedGame | null>(null);
  return (
    <div className="relative">
      {variant === "icon" ? (
        <button type="button" aria-label="Spiel loggen" className="flex h-11 w-14 items-center justify-center" onClick={() => setPicking((p) => !p)}>
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="var(--lime)" strokeWidth={2.2}>
            <circle cx="12" cy="12" r="9.5" />
            <path d="M12 7.5v9M7.5 12h9" strokeLinecap="round" />
          </svg>
        </button>
      ) : (
        <button type="button" className="btn-primary !py-1.5" onClick={() => setPicking((p) => !p)}>
          + Loggen
        </button>
      )}
      {picking && (
        <div
          className={`absolute z-40 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-bg-2 p-3 shadow-2xl ${
            variant === "icon" ? "bottom-full left-1/2 mb-3 -translate-x-1/2" : "right-0 mt-2"
          }`}
        >
          <p className="mb-2 text-xs uppercase tracking-widest text-muted">Was hast du gespielt?</p>
          <GameSearchPicker
            autoFocus
            onPick={(g) => {
              setGame(g);
              setPicking(false);
            }}
          />
        </div>
      )}
      {game && <LogDialog game={game} open onClose={() => setGame(null)} />}
    </div>
  );
}
