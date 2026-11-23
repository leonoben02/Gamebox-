import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import {
  activityFeed,
  browseGames,
  classicGames,
  followingIds,
  friendsPlaying,
  friendsRecentLogs,
  gamesByGenre,
  popularLists,
  popularReviews,
  topRatedGames,
  trendingGames,
} from "@/lib/queries";
import { GameCover } from "@/components/GameCover";
import { ReviewCard } from "@/components/ReviewCard";
import { ListCard } from "@/components/ListCard";
import { ActivityRow } from "@/components/ActivityRow";
import { Avatar } from "@/components/Avatar";
import { CoverRow, RowItem } from "@/components/CoverRow";
import { Heart, ReplayIcon, Stars } from "@/components/Stars";

const TABS = [
  ["games", "Spiele"],
  ["reviews", "Reviews"],
  ["lists", "Listen"],
  ["activity", "Aktivität"],
] as const;

export default async function Home({ searchParams }: PageProps<"/">) {
  const user = await getCurrentUser();
  const t = (await searchParams).tab;
  const tab = TABS.find(([k]) => k === t)?.[0] ?? "games";
  const tabs = user ? TABS : TABS.filter(([k]) => k !== "activity");

  return (
    <div className="-mt-4 space-y-8 sm:-mt-2">
      {!user && tab === "games" && (
        <section className="rounded-2xl border border-line bg-bg-2 px-6 py-8 text-center sm:py-10">
          <h1 className="mx-auto max-w-2xl font-display text-3xl font-bold leading-tight [text-wrap:balance] sm:text-4xl">
            Logge, was du spielst. Merk dir, was du spielen willst. <span className="text-lime">Sag allen, was gut ist.</span>
          </h1>
          <Link href="/signup" className="btn-primary mt-6 !px-6 !py-3 !text-base">
            Leg los – kostenlos
          </Link>
        </section>
      )}

      <nav className="sticky top-[57px] z-20 -mx-4 flex border-b border-line bg-bg/95 px-2 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0">
        {tabs.map(([k, label]) => (
          <Link
            key={k}
            href={k === "games" ? "/" : `/?tab=${k}`}
            className={`flex-1 border-b-[3px] py-3 text-center text-[17px] transition-colors sm:flex-none sm:px-5 ${
              tab === k ? "border-lime text-text" : "border-transparent text-muted hover:text-text"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === "games" && <GamesTab userId={user?.id} />}
      {tab === "reviews" && <ReviewsTab userId={user?.id} />}
      {tab === "lists" && <ListsTab />}
      {tab === "activity" && user && <ActivityTab userId={user.id} />}
    </div>
  );
}

async function GamesTab({ userId }: { userId?: number }) {
  let trending = await trendingGames(7, 12);
  if (trending.length < 6) trending = await trendingGames(60, 12);
  if (trending.length < 6) trending = await browseGames({ sort: "popular", limit: 12 });
  const friends = userId ? await friendsRecentLogs(userId, 12) : [];
  const playingNow = userId ? await friendsPlaying(userId, 12) : [];
  const [top, classics, indies] = await Promise.all([topRatedGames(12), classicGames(2006, 12), gamesByGenre("Indie", 12)]);

  return (
    <div className="space-y-10">
      <CoverRow title="Diese Woche beliebt" href="/games">
        {trending.map((g) => (
          <RowItem key={g.id}>
            <GameCover game={g} size="fluid" />
          </RowItem>
        ))}
      </CoverRow>

      {friends.length > 0 && (
        <CoverRow title="Neu von Freunden" href="/?tab=activity">
          {friends.map((l) => (
            <RowItem key={l.id}>
              <GameCover game={l.game} size="fluid" />
              <Link href={l.review ? `/review/${l.id}` : `/u/${l.user.username}`} className="mt-2 flex items-center gap-2">
                <Avatar user={l.user} size={26} link={false} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold text-muted">{l.user.display_name}</span>
                  <span className="flex items-center gap-1 text-xs">
                    <Stars rating={l.rating} />
                    {l.liked ? <Heart className="!h-3 !w-3" /> : null}
                    {l.replay ? <ReplayIcon className="!h-3 !w-3" /> : null}
                    {l.review ? <span className="text-muted" title="Mit Review">≡</span> : null}
                  </span>
                </span>
              </Link>
            </RowItem>
          ))}
        </CoverRow>
      )}

      {playingNow.length > 0 && (
        <CoverRow title="Freunde spielen gerade">
          {playingNow.map(({ game, user }) => (
            <RowItem key={`${user.id}-${game.id}`}>
              <GameCover game={game} size="fluid" />
              <Link href={`/u/${user.username}`} className="mt-2 flex items-center gap-2">
                <Avatar user={user} size={26} link={false} />
                <span className="truncate text-[15px] font-semibold text-muted">{user.display_name}</span>
              </Link>
            </RowItem>
          ))}
        </CoverRow>
      )}

      {top.length > 0 && (
        <CoverRow title="Bestbewertet" subtitle="Was die Community am meisten liebt." href="/games?sort=rating">
          {top.map((g) => (
            <RowItem key={g.id}>
              <GameCover game={g} size="fluid" />
            </RowItem>
          ))}
        </CoverRow>
      )}

      {indies.length > 0 && (
        <CoverRow title="Indie-Perlen" subtitle="Kleine Studios, große Spiele." href="/games?genre=Indie">
          {indies.map((g) => (
            <RowItem key={g.id}>
              <GameCover game={g} size="fluid" />
            </RowItem>
          ))}
        </CoverRow>
      )}

      {classics.length > 0 && (
        <CoverRow title="Zeitlose Klassiker" subtitle="Vor 2006 erschienen und immer noch großartig." href="/games?sort=oldest">
          {classics.map((g) => (
            <RowItem key={g.id}>
              <GameCover game={g} size="fluid" />
            </RowItem>
          ))}
        </CoverRow>
      )}
    </div>
  );
}

async function ReviewsTab({ userId }: { userId?: number }) {
  const reviews = await popularReviews(userId ?? 0, 365, 20);
  return (
    <section className="mx-auto max-w-3xl">
      {reviews.map((r) => (
        <ReviewCard key={r.id} r={r} loggedIn={Boolean(userId)} />
      ))}
    </section>
  );
}

async function ListsTab() {
  const lists = await popularLists(24);
  return (
    <section className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
      {lists.map((l) => (
        <ListCard key={l.id} list={l} />
      ))}
    </section>
  );
}

async function ActivityTab({ userId }: { userId: number }) {
  const feed = await activityFeed({ userIds: await followingIds(userId), limit: 60 });
  return (
    <ul className="mx-auto max-w-3xl">
      {feed.map((a) => (
        <ActivityRow key={a.id} a={a} />
      ))}
      {!feed.length && (
        <p className="py-10 text-center text-muted">
          Noch nichts los. <Link href="/members" className="text-lime">Finde Leute zum Folgen</Link>.
        </p>
      )}
    </ul>
  );
}
