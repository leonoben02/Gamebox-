"use client";

import { useActionState, useState } from "react";
import { updateProfile } from "@/app/actions";
import { GameSearchPicker, type PickedGame } from "./GameSearchPicker";
import { GameCover } from "./GameCover";
import { Avatar } from "./Avatar";

export function SettingsForm({
  user,
  favorites,
}: {
  user: { username: string; display_name: string; bio: string; avatar_hue: number };
  favorites: PickedGame[];
}) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  const [favs, setFavs] = useState<(PickedGame | null)[]>([0, 1, 2, 3].map((i) => favorites[i] ?? null));
  const [slot, setSlot] = useState<number | null>(null);
  const [hue, setHue] = useState(user.avatar_hue);
  const [name, setName] = useState(user.display_name);

  return (
    <form action={action} className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar user={{ ...user, display_name: name || user.username, avatar_hue: hue }} size={64} link={false} />
        <div className="flex-1">
          <label className="field-label">Avatar-Farbe</label>
          <input type="range" name="avatar_hue" min={0} max={359} value={hue} onChange={(e) => setHue(Number(e.target.value))} className="w-full accent-lime" />
        </div>
      </div>
      <div>
        <label className="field-label">Anzeigename</label>
        <input name="display_name" value={name} onChange={(e) => setName(e.target.value)} className="field" />
      </div>
      <div>
        <label className="field-label">Bio</label>
        <textarea name="bio" rows={3} defaultValue={user.bio} className="field" />
      </div>
      <div>
        <label className="field-label">Lieblingsspiele</label>
        <div className="grid grid-cols-4 gap-3">
          {favs.map((g, i) => (
            <div key={i}>
              <input type="hidden" name={`fav_${i}`} value={g?.id ?? ""} />
              <button type="button" onClick={() => setSlot(i)} className={`block w-full rounded-md ${slot === i ? "ring-2 ring-lime" : ""}`}>
                {g ? (
                  <GameCover game={g} size="fluid" link={false} />
                ) : (
                  <div className="flex aspect-[3/4] items-center justify-center rounded-md border border-dashed border-line text-2xl text-faint hover:text-lime">+</div>
                )}
              </button>
              {g && (
                <button
                  type="button"
                  className="mt-1 text-xs text-faint hover:text-coral"
                  onClick={() => setFavs((f) => f.map((x, j) => (j === i ? null : x)))}
                >
                  Entfernen
                </button>
              )}
            </div>
          ))}
        </div>
        {slot !== null && (
          <div className="mt-3">
            <GameSearchPicker
              autoFocus
              placeholder={`Lieblingsspiel #${slot + 1} suchen…`}
              onPick={(g) => {
                setFavs((f) => f.map((x, j) => (j === slot ? g : x)));
                setSlot(null);
              }}
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>
          Speichern
        </button>
        {state?.ok && <span className="text-sm text-lime">Gespeichert.</span>}
        {state?.error && <span className="text-sm text-coral">{state.error}</span>}
      </div>
    </form>
  );
}
