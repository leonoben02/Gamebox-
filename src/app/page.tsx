import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { browseGames, friendsRecentLogs, popularLists, popularMembers, popularReviews, trendingGames } from "@/lib/queries";
import { GameCover } from "@/components/GameCover";
import { ReviewCard } from "@/components/ReviewCard";
import { ListCard } from "@/components/ListCard";
import { Avatar } from "@/components/Avatar";
import { Heart, Stars } from "@/components/Stars";

export default async function Home() {
  const user = await getCurrentUser();
  let trending = await trendingGames(30, 12);
  if (trending.length < 6) trending = await browseGames({ sort: "popular", limit: 12 });
  const reviews = await popularReviews(user?.id ?? 0, 365, 6);
  const lists = await popularLists(3);
  const members = await popularMembers(5);
  const friends = user ? await friendsRecentLogs(user.id, 6) : [];

  return (
    <div className="space-y-14">
      {user ? (
        <section className="pt-2 text-center">
          <h1 className="font-display text-3xl font-bold">
            Willkommen zurück, <span className="text-lime">{user.display_name}</span>.
          </h1>
          <p className="mt-2 text-muted">Hier ist, was deine Freunde gerade spielen.</p>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-2xl border border-line bg-bg-2 px-6 py-14 text-center">
          <div className="pointer-events-none absolute inset-0 flex justify-center gap-3 opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent)]">
            {trending.slice(0, 8).map((g) => (
              <GameCover key={g.id} game={g} size="lg" link={false} className="-mt-6 rotate-[-4deg]" />
            ))}
          </div>
          <div className="relative">
            <h1 className="mx-auto max-w-2xl font-display text-4xl font-bold leading-tight sm:text-5xl">
              Logge, was du spielst.
              <br />
              Speichere, was du spielen willst.
              <br />
              <span className="text-lime">Sag allen, was gut ist.</span>
            </h1>
            <Link href="/signup" className="btn-primary mt-8 !px-6 !py-3 !text-base">
              Leg los – kostenlos
            </Link>
            <p className="mt-4 text-sm text-muted">Das soziale Netzwerk für Spieler·innen.</p>
          </div>
        </section>
      )}

      {friends.length > 0 && (
        <section>
          <h2 className="section-title">
            Neu von Freunden <Link href="/activity">Alle Aktivitäten</Link>
          </h2>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            {friends.map((l) => (
              <div key={l.id}>
                <GameCover game={l.game} size="fluid" />
                <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                  <Avatar user={l.user} size={18} />
                  <Stars rating={l.rating} />
                  {l.liked ? <Heart className="!h-3 !w-3" /> : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title">
          Gerade beliebt <Link href="/games">Mehr</Link>
        </h2>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {trending.slice(0, 6).map((g) => (
            <GameCover key={g.id} game={g} size="fluid" />
          ))}
        </div>
      </section>

      {!user && (
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            ["Loggen", "Führe ein Tagebuch über jedes Spiel, das du spielst – mit Datum, Plattform, Spielzeit und Status."],
            ["Bewerten & Reviewen", "Vergib bis zu fünf Sterne in halben Schritten und schreib auf, was dir gefallen hat."],
            ["Backlog & Listen", "Merk dir, was du noch spielen willst, und stell Listen für jeden Anlass zusammen."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl bg-surface p-5">
              <h3 className="font-display text-lg font-bold text-lime">{t}</h3>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </div>
          ))}
        </section>
      )}

      <div className="grid gap-10 md:grid-cols-[1fr_280px]">
        <section className="min-w-0">
          <h2 className="section-title">Beliebte Reviews</h2>
          {reviews.map((r) => (
            <ReviewCard key={r.id} r={r} loggedIn={Boolean(user)} />
          ))}
        </section>
        <aside className="min-w-0 space-y-10">
          <section>
            <h2 className="section-title">
              Beliebte Listen <Link href="/lists">Mehr</Link>
            </h2>
            <div className="space-y-6">
              {lists.map((l) => (
                <ListCard key={l.id} list={l} />
              ))}
            </div>
          </section>
          <section>
            <h2 className="section-title">
              Mitglieder <Link href="/members">Mehr</Link>
            </h2>
            <ul className="space-y-3">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3">
                  <Avatar user={m} size={36} />
                  <div className="text-sm">
                    <Link href={`/u/${m.username}`} className="font-semibold hover:text-lime">
                      {m.display_name}
                    </Link>
                    <p className="text-xs text-muted">
                      {m.played} Spiele · {m.reviews} Reviews
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
