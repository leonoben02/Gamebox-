import Link from "next/link";
import { MP_LABELS, type MpTag } from "@/lib/multiplayer";

function Icon({ tag }: { tag: MpTag }) {
  const common = { viewBox: "0 0 24 24", className: "h-3.5 w-3.5", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (tag === "online")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
    );
  if (tag === "local")
    // a couch
    return (
      <svg {...common}>
        <path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
        <path d="M3 13a2 2 0 0 1 4 0v1h10v-1a2 2 0 0 1 4 0v4H3z" />
        <path d="M5 17v2M19 17v2" />
      </svg>
    );
  if (tag === "coop")
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="3" />
        <circle cx="16" cy="8" r="3" />
        <path d="M2 20a6 6 0 0 1 12 0M10 20a6 6 0 0 1 12 0" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

/** "Einzelspieler · Lokaler Multiplayer · Online-Multiplayer · Koop" pills; each links to the matching browse filter. */
export function MultiplayerBadges({ tags, className = "" }: { tags: string | null; className?: string }) {
  const list = (tags ?? "").split(",").filter((t): t is MpTag => t in MP_LABELS);
  if (!list.length) return null;
  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`} aria-label="Spielmodi">
      {list.map((t) => {
        const { label, color } = MP_LABELS[t];
        return (
          <li key={t}>
            <Link
              href={`/games?mode=${t}`}
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-text hover:brightness-125"
              style={{ borderColor: `${color}55`, background: `${color}14` }}
            >
              <span style={{ color }}>
                <Icon tag={t} />
              </span>
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
