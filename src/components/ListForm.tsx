"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions";

export function ListForm({
  action,
  defaults,
  gameId,
  submitLabel,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  defaults?: { title: string; description: string; ranked: number };
  gameId?: number;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-4">
      {gameId ? <input type="hidden" name="game_id" value={gameId} /> : null}
      <div>
        <label className="field-label">Titel</label>
        <input name="title" required defaultValue={defaults?.title} className="field" />
      </div>
      <div>
        <label className="field-label">Beschreibung</label>
        <textarea name="description" rows={4} defaultValue={defaults?.description} className="field" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="ranked" defaultChecked={Boolean(defaults?.ranked)} className="accent-lime" />
        Rangliste (Einträge nummerieren)
      </label>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>
          {submitLabel}
        </button>
        {state?.ok && <span className="text-sm text-lime">Gespeichert.</span>}
        {state?.error && <span className="text-sm text-coral">{state.error}</span>}
      </div>
    </form>
  );
}
