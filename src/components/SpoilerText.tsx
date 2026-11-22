"use client";

import { useState } from "react";

export function SpoilerText({ text, spoilers, clamp }: { text: string; spoilers: boolean; clamp?: boolean }) {
  const [shown, setShown] = useState(!spoilers);
  const [expanded, setExpanded] = useState(false);
  if (!shown)
    return (
      <p className="italic text-muted">
        Diese Review enthält Spoiler.{" "}
        <button type="button" className="text-lime hover:underline" onClick={() => setShown(true)}>
          Trotzdem lesen
        </button>
      </p>
    );
  const long = clamp && text.length > 450;
  const t = long && !expanded ? text.slice(0, 450).trimEnd() + "…" : text;
  return (
    <>
      {t.split(/\n{2,}/).map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {p}
        </p>
      ))}
      {long && !expanded && (
        <button type="button" className="mt-1 text-sm text-lime hover:underline" onClick={() => setExpanded(true)}>
          Weiterlesen
        </button>
      )}
    </>
  );
}
