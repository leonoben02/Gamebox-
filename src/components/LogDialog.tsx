"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveLog, type FormState } from "@/app/actions";
import { StarInput } from "./StarInput";
import { STATUS_LABELS } from "@/lib/util";

export type LogDefaults = {
  log_id?: number;
  played_on?: string | null;
  rating?: number | null;
  liked?: number;
  review?: string | null;
  spoilers?: number;
  replay?: number;
  status?: string;
  platform?: string;
  hours?: number | null;
};

export function LogDialog({
  game,
  open,
  onClose,
  defaults = {},
}: {
  game: { id: number; title: string; year: number | null; platforms?: string };
  open: boolean;
  onClose: () => void;
  defaults?: LogDefaults;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<FormState, FormData>(saveLog, undefined);
  const [rating, setRating] = useState(defaults.rating ?? 0);
  const [inDiary, setInDiary] = useState(defaults.log_id ? Boolean(defaults.played_on) : true);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  const platforms = (game.platforms ?? "").split(",").filter(Boolean);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(640px,calc(100vw-2rem))] rounded-xl border border-line bg-bg-2 p-0 text-text backdrop:bg-black/70"
    >
      <form action={action} className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted">{defaults.log_id ? "Eintrag bearbeiten" : "Ich habe gespielt …"}</p>
            <h2 className="font-display text-2xl font-bold">
              {game.title} {game.year && <span className="font-normal text-muted">{game.year}</span>}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-muted hover:text-text" aria-label="Schließen">
            ×
          </button>
        </div>
        <input type="hidden" name="game_id" value={game.id} />
        {defaults.log_id && <input type="hidden" name="log_id" value={defaults.log_id} />}
        <input type="hidden" name="rating" value={rating} />

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="in_diary" checked={inDiary} onChange={(e) => setInDiary(e.target.checked)} className="accent-lime" />
            Gespielt am
          </label>
          <input type="date" name="played_on" defaultValue={defaults.played_on ?? today} max={today} disabled={!inDiary} className="field !w-auto" />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="replay" defaultChecked={Boolean(defaults.replay)} className="accent-lime" />
            Schon mal gespielt
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="field-label">Status</label>
            <select name="status" defaultValue={defaults.status ?? "completed"} className="field">
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Plattform</label>
            <input name="platform" list={`platforms-${game.id}`} defaultValue={defaults.platform ?? ""} className="field" placeholder="z. B. PS5" />
            <datalist id={`platforms-${game.id}`}>
              {platforms.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="field-label">Spielzeit (h)</label>
            <input name="hours" type="number" min={0} defaultValue={defaults.hours ?? ""} className="field" />
          </div>
        </div>

        <div>
          <label className="field-label">Review</label>
          <textarea name="review" rows={6} defaultValue={defaults.review ?? ""} className="field resize-y" placeholder="Was hat dir gefallen, was nicht?" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div>
              <span className="field-label">Bewertung</span>
              <StarInput value={rating} onChange={setRating} />
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" name="liked" defaultChecked={Boolean(defaults.liked)} className="peer sr-only" />
              <span className="text-2xl text-line peer-checked:text-coral">♥</span> Like
            </label>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input type="checkbox" name="spoilers" defaultChecked={Boolean(defaults.spoilers)} className="accent-lime" />
              Spoiler
            </label>
          </div>
          <button className="btn-primary" disabled={pending}>
            {pending ? "Speichern…" : "Speichern"}
          </button>
        </div>
        {state?.error && <p className="text-sm text-coral">{state.error}</p>}
      </form>
    </dialog>
  );
}
