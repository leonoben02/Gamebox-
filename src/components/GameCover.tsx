import Link from "next/link";
import { hueFor } from "@/lib/util";

type CoverGame = { slug: string; title: string; year?: number | null; cover_url: string | null };

const SIZES = {
  xs: "w-12",
  sm: "w-[70px]",
  md: "w-[110px]",
  lg: "w-[150px]",
  xl: "w-[230px]",
  fluid: "w-full",
};

export function GameCover({
  game,
  size = "md",
  link = true,
  className = "",
  children,
}: {
  game: CoverGame;
  size?: keyof typeof SIZES;
  link?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const hue = hueFor(game.title);
  const inner = (
    <div
      className={`group relative aspect-[3/4] overflow-hidden rounded-md ring-1 ring-white/10 shadow-lg shadow-black/40 ${SIZES[size]} ${className}`}
      title={`${game.title}${game.year ? ` (${game.year})` : ""}`}
      style={{ containerType: "inline-size" }}
    >
      {game.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={game.cover_url} alt={game.title} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div
          className="flex h-full w-full flex-col justify-between p-[9%]"
          style={{
            background: `linear-gradient(155deg, hsl(${hue} 55% 32%), hsl(${(hue + 50) % 360} 60% 14%))`,
          }}
        >
          <span
            className="font-display font-bold leading-[1.05] text-white/95"
            style={{ fontSize: "clamp(7px, 11cqw, 22px)" }}
          >
            {game.title}
          </span>
          {game.year && size !== "xs" && (
            <span className="font-semibold text-white/60" style={{ fontSize: "clamp(7px, 7cqw, 12px)" }}>
              {game.year}
            </span>
          )}
        </div>
      )}
      {link && <div className="pointer-events-none absolute inset-0 rounded-md ring-lime transition group-hover:ring-2" />}
      {children}
    </div>
  );
  return link ? (
    <Link href={`/game/${game.slug}`} className="block shrink-0">
      {inner}
    </Link>
  ) : (
    inner
  );
}
