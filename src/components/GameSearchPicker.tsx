"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { quickSearch } from "@/app/actions";

export type PickedGame = { id: number; slug: string; title: string; year: number | null; cover_url: string | null };

export function GameSearchPicker({
  onPick,
  placeholder = "Spiel suchen…",
  autoFocus,
}: {
  onPick: (g: PickedGame) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PickedGame[]>([]);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) {
      timer.current = setTimeout(() => setResults([]), 0);
      return;
    }
    timer.current = setTimeout(() => start(async () => setResults(await quickSearch(q))), 250);
    return () => clearTimeout(timer.current);
  }, [q]);

  return (
    <div className="relative">
      <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} />
      {pending && <span className="absolute right-3 top-2.5 text-xs text-faint">…</span>}
      {results.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-md border border-line bg-surface shadow-xl">
          {results.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-line"
                onClick={() => {
                  onPick(g);
                  setQ("");
                  setResults([]);
                }}
              >
                <span className="font-semibold">{g.title}</span>
                {g.year && <span className="text-faint">{g.year}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
