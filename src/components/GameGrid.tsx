import type { Game } from "@/lib/queries";
import { GameCover } from "./GameCover";
import { Heart, Stars } from "./Stars";

type GridGame = Game & { user_rating?: number | null; user_liked?: number };

export function GameGrid({ games, showMeta, empty = "Noch nichts hier." }: { games: GridGame[]; showMeta?: boolean; empty?: string }) {
  if (!games.length) return <p className="py-10 text-center text-muted">{empty}</p>;
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
      {games.map((g) => (
        <div key={g.id}>
          <GameCover game={g} size="fluid" />
          {showMeta && (g.user_rating || g.user_liked) ? (
            <div className="mt-1 flex items-center gap-1 text-xs">
              <Stars rating={g.user_rating} />
              {g.user_liked ? <Heart className="!h-3 !w-3" /> : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
