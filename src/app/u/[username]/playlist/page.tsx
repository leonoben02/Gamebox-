import { notFound } from "next/navigation";
import { getUserByUsername, userGames } from "@/lib/queries";
import { GameGrid } from "@/components/GameGrid";

export default async function PlaylistPage({ params }: PageProps<"/u/[username]/playlist">) {
  const profile = await getUserByUsername((await params).username);
  if (!profile) notFound();
  const games = await userGames(profile.id, "backlog", "recent");
  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        {profile.display_name} will {games.length} {games.length === 1 ? "Spiel" : "Spiele"} spielen.
      </p>
      <GameGrid games={games} empty="Die Playlist ist leer." />
    </div>
  );
}
