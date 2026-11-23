import { notFound } from "next/navigation";
import { getUserByUsername, userGames } from "@/lib/queries";
import { GameGrid } from "@/components/GameGrid";

export default async function PlayingPage({ params }: PageProps<"/u/[username]/playing">) {
  const profile = await getUserByUsername((await params).username);
  if (!profile) notFound();
  const games = await userGames(profile.id, "playing", "recent");
  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        {profile.display_name} spielt gerade {games.length} {games.length === 1 ? "Spiel" : "Spiele"}.
      </p>
      <GameGrid games={games} empty="Gerade wird nichts gespielt. Tippe auf einer Spielseite auf „Spiele ich“." />
    </div>
  );
}
