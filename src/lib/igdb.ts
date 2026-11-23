import "server-only";
import { db } from "./db";
import { slugify } from "./util";

/**
 * IGDB (owned by Twitch) is the game catalogue behind search and cover art.
 * Requires a free Twitch developer app: set IGDB_CLIENT_ID and IGDB_CLIENT_SECRET.
 * Without them, Gamebox only searches its local catalogue.
 */
const CLIENT_ID = process.env.IGDB_CLIENT_ID;
const CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET;

export const igdbEnabled = Boolean(CLIENT_ID && CLIENT_SECRET);

let token: { value: string; expires: number } | null = null;

async function getToken(): Promise<string> {
  if (token && token.expires > Date.now() + 60_000) return token.value;
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
    { method: "POST" },
  );
  if (!res.ok) throw new Error(`Twitch auth failed: ${res.status}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: j.access_token, expires: Date.now() + j.expires_in * 1000 };
  return token.value;
}

type IgdbGame = {
  id: number;
  name: string;
  slug: string;
  summary?: string;
  first_release_date?: number;
  total_rating_count?: number;
  cover?: { image_id: string };
  genres?: { name: string }[];
  themes?: { name: string }[];
  platforms?: { abbreviation?: string; name: string }[];
  involved_companies?: { developer: boolean; company: { name: string } }[];
};

async function query(body: string): Promise<IgdbGame[]> {
  const res = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": CLIENT_ID!,
      Authorization: `Bearer ${await getToken()}`,
      "Content-Type": "text/plain",
    },
    body,
  });
  if (!res.ok) throw new Error(`IGDB request failed: ${res.status}`);
  return (await res.json()) as IgdbGame[];
}

const FIELDS =
  "fields name,slug,summary,first_release_date,total_rating_count,cover.image_id,genres.name,themes.name,platforms.name,platforms.abbreviation,involved_companies.developer,involved_companies.company.name;";

/** Upserts IGDB results into the local catalogue so they can be logged, listed and reviewed. */
function upsert(games: IgdbGame[]): number[] {
  const stmt = db.prepare(
    `INSERT INTO games (slug, title, year, developer, genres, platforms, summary, cover_url, igdb_id, source)
     VALUES (@slug, @title, @year, @developer, @genres, @platforms, @summary, @cover_url, @igdb_id, 'igdb')
     ON CONFLICT(igdb_id) DO UPDATE SET cover_url = excluded.cover_url, summary = excluded.summary
     RETURNING id`,
  );
  const bySlug = db.prepare("SELECT id, igdb_id FROM games WHERE slug = ?");
  const attach = db.prepare("UPDATE games SET igdb_id = ?, cover_url = ? WHERE id = ? RETURNING id");
  const ids: number[] = [];
  db.transaction(() => {
    for (const g of games) {
      const cover_url = g.cover ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg` : null;
      const year = g.first_release_date ? new Date(g.first_release_date * 1000).getUTCFullYear() : null;
      const slug = slugify(g.name) || g.slug;
      // A seeded game with the same title/slug gets linked to IGDB instead of duplicated.
      const existing = bySlug.get(slug) as { id: number; igdb_id: number | null } | undefined;
      if (existing && (existing.igdb_id === null || existing.igdb_id === g.id)) {
        ids.push((attach.get(g.id, cover_url, existing.id) as { id: number }).id);
        continue;
      }
      let unique = existing ? `${slug}-${year ?? g.id}` : slug;
      if (bySlug.get(unique)) unique = `${slug}-${g.id}`;
      const row = stmt.get({
        slug: unique,
        title: g.name,
        year,
        developer: g.involved_companies?.find((c) => c.developer)?.company.name ?? "",
        genres: [...(g.genres ?? []), ...(g.themes ?? [])].map((x) => x.name).slice(0, 4).join(","),
        platforms: (g.platforms ?? []).map((p) => p.abbreviation ?? p.name).join(","),
        summary: g.summary ?? "",
        cover_url,
        igdb_id: g.id,
      }) as { id: number };
      ids.push(row.id);
    }
  })();
  return ids;
}

export async function searchIgdb(q: string): Promise<number[]> {
  if (!igdbEnabled || !q.trim()) return [];
  const safe = q.replace(/"/g, "");
  // Main games, remakes, remasters and expanded games only (no mods, DLC or fan projects), best known first.
  const games = await query(`search "${safe}"; ${FIELDS} where version_parent = null & game_type = (0,8,9,10,11) & cover != null; limit 40;`);
  games.sort((a, b) => (b.total_rating_count ?? 0) - (a.total_rating_count ?? 0));
  return upsert(games.slice(0, 20));
}

/** Seeded games start without cover art; link them to IGDB the first time they are viewed. */
export async function enrichGame(id: number, title: string): Promise<void> {
  if (!igdbEnabled) return;
  try {
    // Exact (case-insensitive) title match, also trying roman numerals ("Baldur's Gate 3" -> "Baldur's Gate III").
    const roman: Record<string, string> = { "2": "II", "3": "III", "4": "IV", "5": "V" };
    const names = [title, title.replace(/\b([2-5])\b/g, (d) => roman[d])].map((n) => `name ~ "${n.replace(/"/g, "")}"`);
    const games = await query(`${FIELDS} where (${[...new Set(names)].join(" | ")}) & version_parent = null & cover != null; sort total_rating_count desc; limit 1;`);
    const g = games[0];
    if (!g?.cover) return;
    const cover = `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`;
    db.prepare("UPDATE games SET igdb_id = ?, cover_url = ? WHERE id = ? AND igdb_id IS NULL").run(g.id, cover, id);
  } catch (e) {
    console.error("IGDB enrich failed", e);
  }
}

declare global {
  var __gameboxCoverSync: boolean | undefined;
}

/** Once per server process: fetch covers for catalogue games that don't have one yet (IGDB allows ~4 req/s). */
export function syncMissingCovers() {
  if (!igdbEnabled || globalThis.__gameboxCoverSync) return;
  globalThis.__gameboxCoverSync = true;
  const missing = db.prepare("SELECT id, title FROM games WHERE cover_url IS NULL AND igdb_id IS NULL").all() as { id: number; title: string }[];
  void (async () => {
    for (const g of missing) {
      await enrichGame(g.id, g.title);
      await new Promise((r) => setTimeout(r, 300));
    }
  })();
}
