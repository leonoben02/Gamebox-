"use client";

import { useTransition } from "react";
import { toggleListItem } from "@/app/actions";
import { GameSearchPicker } from "./GameSearchPicker";

export function ListAddGame({ listId, existing }: { listId: number; existing: number[] }) {
  const [pending, start] = useTransition();
  return (
    <div className="max-w-md">
      <GameSearchPicker
        placeholder={pending ? "Wird hinzugefügt…" : "Spiel zur Liste hinzufügen…"}
        onPick={(g) => {
          if (!existing.includes(g.id)) start(() => toggleListItem(listId, g.id));
        }}
      />
    </div>
  );
}
