import type { Game } from "@/lib/queries";
import { GameCover } from "./GameCover";
import { Heart, Stars } from "./Stars";

type GridGame = Game & { user_rating?: number | null; user_liked?: number; user_status?: string };

const STATUS_ICON: Record<string, [string, string]> = { completed: ["🏆", "Durchgespielt"], mastered: ["💯", "100 %"], abandoned: ["✕", "Abgebrochen"] };

export function GameGrid({ games, showMeta, empty = "Noch nichts hier." }: { games: GridGame[]; showMeta?: boolean; empty?: string }) {
  if (!games.length) return <p className="py-10 text-center text-muted">{empty}</p>;
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
      {games.map((g) => (
        <div key={g.id}>
          <GameCover game={g} size="fluid" />
          {showMeta && (g.user_rating || g.user_liked || STATUS_ICON[g.user_status ?? ""]) ? (
            <div className="mt-1 flex items-center gap-1 text-xs">
              <Stars rating={g.user_rating} />
              {g.user_liked ? <Heart className="!h-3 !w-3" /> : null}
              {STATUS_ICON[g.user_status ?? ""] && (
                <span title={STATUS_ICON[g.user_status!][1]} className="ml-auto text-[11px] text-muted">
                  {STATUS_ICON[g.user_status!][0]}
                </span>
              )}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
