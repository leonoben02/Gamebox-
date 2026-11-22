"use client";

import { useState } from "react";
import { GameSearchPicker, type PickedGame } from "./GameSearchPicker";
import { LogDialog } from "./LogDialog";

/** Header "+ Loggen" button: pick a game, then open the log dialog. */
export function LogButton() {
  const [picking, setPicking] = useState(false);
  const [game, setGame] = useState<PickedGame | null>(null);
  return (
    <div className="relative">
      <button type="button" className="btn-primary !py-1.5" onClick={() => setPicking((p) => !p)}>
        + Loggen
      </button>
      {picking && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-lg border border-line bg-bg-2 p-3 shadow-2xl">
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
