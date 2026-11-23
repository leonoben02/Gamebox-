import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { CATALOGUE_TARGET, igdbProblem, syncCatalogue } from "@/lib/igdb";
import {
  activityFeed,
  favoriteGames,
  getUserByUsername,
  profileStats,
  userDiary,
  userGames,
  userLists,
  userRatingHistogram,
  userReviews,
} from "@/lib/queries";

/** Runs the queries behind each profile page for the newest members and reports the ones that fail. */
async function profileSelfTest(): Promise<string[]> {
  const users = (await db.prepare("SELECT username FROM users ORDER BY id DESC LIMIT 5").all()) as { username: string }[];
  const problems: string[] = [];
  for (const { username } of users) {
    const u = await getUserByUsername(username);
    if (!u) continue;
    const checks: [string, () => Promise<unknown>][] = [
      ["Statistik", () => profileStats(u.id)],
      ["Lieblingsspiele", () => favoriteGames(u.id)],
      ["Gespielt", () => userGames(u.id, "played", "recent")],
      ["Playlist", () => userGames(u.id, "backlog", "recent")],
      ["Spielt gerade", () => userGames(u.id, "playing", "recent")],
      ["Reviews", () => userReviews(u.id, 0, 3)],
      ["Tagebuch", () => userDiary(u.id)],
      ["Bewertungen", () => userRatingHistogram(u.id)],
      ["Listen", () => userLists(u.id)],
      ["Aktivität", () => activityFeed({ userIds: [u.id], limit: 8 })],
    ];
    for (const [label, run] of checks) {
      try {
        await run();
      } catch (e) {
        problems.push(`@${username} · ${label}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  return problems;
}

export const metadata: Metadata = { title: "Spieldaten laden", robots: { index: false } };
// Vercel keeps the function alive this long; each visit continues where the last one stopped.
export const maxDuration = 60;

async function counts() {
  return (await db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(cover_url IS NOT NULL) AS covers,
              SUM(details_synced_at IS NOT NULL) AS details,
              (SELECT COUNT(*) FROM companies) AS studios
       FROM games WHERE source = 'seed'`,
    )
    .get()) as { total: number; covers: number; details: number; studios: number };
}

function Row({ label, n, total }: { label: string; n: number; total: number }) {
  return (
    <li className="flex justify-between border-b border-line py-3">
      <span>{label}</span>
      <span className={n === total ? "text-lime" : "text-coral"}>
        {n} / {total}
      </span>
    </li>
  );
}

export default async function SyncPage() {
  const problem = await igdbProblem();
  if (!problem) await syncCatalogue(35_000);
  const c = await counts();
  const profileProblems = await profileSelfTest();
  const done = !problem && Number(c.total) >= CATALOGUE_TARGET && Number(c.covers) === Number(c.total);
  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-3xl font-bold">Spieldaten laden</h1>
      {problem ? (
        <p className="mt-4 rounded-lg border border-coral/50 bg-coral/10 p-4 text-sm">
          <b>IGDB funktioniert noch nicht:</b> {problem}
        </p>
      ) : (
        <p className="mt-4 text-sm text-muted">Verbindung zu IGDB klappt. ✓</p>
      )}
      <ul className="mt-6 text-sm">
        <Row label="Spiele im Katalog mit Cover" n={Number(c.covers)} total={Number(c.total)} />
        <li className="flex justify-between border-b border-line py-3">
          <span>Spiele mit Studios & Details</span>
          <span>{c.details}</span>
        </li>
        <li className="flex justify-between py-3">
          <span>Studios in der Datenbank</span>
          <span>{c.studios}</span>
        </li>
      </ul>
      {done ? (
        <p className="mt-6 text-lime">Alles geladen. 🎉</p>
      ) : (
        <p className="mt-6 text-sm text-muted">Noch nicht fertig: Lade diese Seite einfach noch einmal neu, sie macht dort weiter.</p>
      )}
      <h2 className="mt-8 font-display text-lg font-bold">Selbsttest Profile</h2>
      {profileProblems.length ? (
        <ul className="mt-2 space-y-2 text-xs text-coral">
          {profileProblems.map((p) => (
            <li key={p} className="break-words rounded bg-coral/10 p-2">
              {p}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted">Keine Fehler gefunden. ✓</p>
      )}
      <Link href="/" className="btn btn-primary mt-6 inline-block">
        Zur Startseite
      </Link>
    </div>
  );
}
