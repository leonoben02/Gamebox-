import Link from "next/link";
import { PlatformBadge } from "@/components/PlatformBadges";
import { notFound } from "next/navigation";
import { diaryYears, getUserByUsername, userDiary } from "@/lib/queries";
import { GameCover } from "@/components/GameCover";
import { Heart, ReplayIcon, Stars } from "@/components/Stars";
import { monthLabel, STATUS_LABELS } from "@/lib/util";

export default async function DiaryPage({ params, searchParams }: PageProps<"/u/[username]/diary">) {
  const profile = await getUserByUsername((await params).username);
  if (!profile) notFound();
  const y = Number((await searchParams).year) || undefined;
  const entries = await userDiary(profile.id, y);
  const years = await diaryYears(profile.id);
  const byMonth = new Map<string, typeof entries>();
  for (const e of entries) {
    const k = e.played_on!.slice(0, 7);
    byMonth.set(k, [...(byMonth.get(k) ?? []), e]);
  }
  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <Link href="?" className={!y ? "text-lime" : "text-muted hover:text-text"}>
          Alle
        </Link>
        {years.map((yr) => (
          <Link key={yr} href={`?year=${yr}`} className={y === yr ? "text-lime" : "text-muted hover:text-text"}>
            {yr}
          </Link>
        ))}
      </div>
      {!entries.length && <p className="text-muted">Das Tagebuch ist noch leer.</p>}
      <div className="space-y-8">
        {[...byMonth.entries()].map(([month, list]) => (
          <section key={month}>
            <h2 className="mb-2 font-display text-lg font-bold text-lime">{monthLabel(month)}</h2>
            <table className="w-full text-sm">
              <tbody>
                {list.map((e) => (
                  <tr key={e.id} className="border-b border-line">
                    <td className="w-14 py-2 font-display text-2xl font-bold text-muted">{e.played_on!.slice(8, 10)}</td>
                    <td className="w-12 py-2">
                      <GameCover game={e.game} size="xs" />
                    </td>
                    <td className="py-2 pl-3">
                      <Link href={`/game/${e.game.slug}`} className="font-semibold hover:text-lime">
                        {e.game.title}
                      </Link>{" "}
                      <span className="text-faint">{e.game.year}</span>
                      <div className="text-xs text-faint">
                        {STATUS_LABELS[e.status]}
                        {e.platform && (
                          <>
                            {" "}
                            <PlatformBadge platform={e.platform} />
                          </>
                        )}
                        {e.hours && ` · ${e.hours} h`}
                      </div>
                    </td>
                    <td className="w-28 py-2">
                      <Stars rating={e.rating} />
                    </td>
                    <td className="w-8 py-2">{e.liked ? <Heart /> : null}</td>
                    <td className="w-8 py-2">{e.replay ? <ReplayIcon /> : null}</td>
                    <td className="w-16 py-2 text-right">
                      <Link href={`/review/${e.id}`} className={e.review ? "text-lime hover:underline" : "text-faint hover:text-text"}>
                        {e.review ? "Review" : "Details"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </div>
  );
}
