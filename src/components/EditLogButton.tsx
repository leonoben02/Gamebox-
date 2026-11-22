"use client";

import { useState } from "react";
import { LogDialog, type LogDefaults } from "./LogDialog";

export function EditLogButton({ game, defaults }: { game: { id: number; title: string; year: number | null; platforms: string }; defaults: LogDefaults }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn-ghost !py-1.5" onClick={() => setOpen(true)}>
        Bearbeiten
      </button>
      {open && <LogDialog game={game} open onClose={() => setOpen(false)} defaults={defaults} />}
    </>
  );
}
