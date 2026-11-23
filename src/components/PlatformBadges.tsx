import { groupPlatforms, parsePlatform, FAMILIES, type Family } from "@/lib/platforms";

function FamilyIcon({ family, className = "h-3.5 w-3.5" }: { family: Family; className?: string }) {
  if (family === "pc")
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    );
  if (family === "mobile")
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
        <path d="M11 18h2" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M7.5 6h9a5.5 5.5 0 0 1 5.3 4l1 3.8a3.2 3.2 0 0 1-5.6 2.8L15.6 15H8.4l-1.6 1.6a3.2 3.2 0 0 1-5.6-2.8l1-3.8A5.5 5.5 0 0 1 7.5 6Zm-.5 3v1.5H5.5v1.5H7v1.5h1.5V12H10v-1.5H8.5V9H7Zm9.5.2a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm-2 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
    </svg>
  );
}

/** Coloured pills per platform family, e.g. [🎮 PS5 · PS4] [🎮 Switch] [🖥 PC]. */
export function PlatformBadges({ platforms, className = "" }: { platforms: string; className?: string }) {
  const groups = groupPlatforms(platforms);
  if (!groups.length) return null;
  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`} aria-label="Plattformen">
      {groups.map(({ family, items }) => (
        <li
          key={family.key}
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-text"
          style={{ borderColor: `${family.color}55`, background: `${family.color}14` }}
          title={family.label}
        >
          <span style={{ color: family.color }}>
            <FamilyIcon family={family.key} />
          </span>
          {items.join(" · ")}
        </li>
      ))}
    </ul>
  );
}

/** A single small badge for the platform someone played on (diary, reviews). */
export function PlatformBadge({ platform }: { platform: string }) {
  const p = parsePlatform(platform);
  const color = FAMILIES.find((f) => f.key === p.family)!.color;
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 align-middle text-[11px] font-medium text-text/90" style={{ background: `${color}22` }}>
      <span style={{ color }}>
        <FamilyIcon family={p.family} className="h-3 w-3" />
      </span>
      {p.label}
    </span>
  );
}

export { FamilyIcon };
