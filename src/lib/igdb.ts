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

async function query(body: string, endpoint = "games"): Promise<IgdbGame[]> {
  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
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

/**
 * Upserts IGDB results into the local catalogue so they can be logged, listed and reviewed.
 * Three round trips in total, however many games: look up, one write batch, read back ids.
 */
async function upsert(games: IgdbGame[]): Promise<number[]> {
  if (!games.length) return [];
  const rows = games.map((g) => ({
    g,
    slug: slugify(g.name) || g.slug,
    year: g.first_release_date ? new Date(g.first_release_date * 1000).getUTCFullYear() : null,
    cover_url: g.cover ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg` : null,
  }));
  const ph = (n: number) => Array(n).fill("?").join(",");
  const existing = (await db
    .prepare(`SELECT id, slug, igdb_id FROM games WHERE slug IN (${ph(rows.length)}) OR igdb_id IN (${ph(rows.length)})`)
    .all(...rows.map((r) => r.slug), ...rows.map((r) => r.g.id))) as { id: number; slug: string; igdb_id: number | null }[];
  const bySlug = new Map(existing.map((e) => [e.slug, e]));
  const byIgdb = new Set(existing.filter((e) => e.igdb_id).map((e) => e.igdb_id));
  const taken = new Set(existing.map((e) => e.slug));
  const stmts: { sql: string; args: (string | number | null)[] }[] = [];
  for (const { g, slug, year, cover_url } of rows) {
    if (byIgdb.has(g.id)) {
      stmts.push({ sql: "UPDATE games SET cover_url = COALESCE(?, cover_url) WHERE igdb_id = ?", args: [cover_url, g.id] });
      continue;
    }
    const same = bySlug.get(slug);
    if (same && same.igdb_id === null) {
      // a seeded game with the same title gets linked to IGDB instead of duplicated
      stmts.push({ sql: "UPDATE games SET igdb_id = ?, cover_url = COALESCE(cover_url, ?) WHERE id = ? AND igdb_id IS NULL", args: [g.id, cover_url, same.id] });
      byIgdb.add(g.id);
      continue;
    }
    let unique = slug;
    if (taken.has(unique)) unique = `${slug}-${year ?? g.id}`;
    if (taken.has(unique)) unique = `${slug}-${g.id}`;
    taken.add(unique);
    byIgdb.add(g.id);
    stmts.push({
      sql: `INSERT OR IGNORE INTO games (slug, title, year, developer, genres, platforms, summary, cover_url, igdb_id, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'igdb')`,
      args: [
        unique,
        g.name,
        year,
        g.involved_companies?.find((c) => c.developer)?.company.name ?? "",
        [...(g.genres ?? []), ...(g.themes ?? [])].map((x) => x.name).slice(0, 4).join(","),
        (g.platforms ?? []).map((p) => p.abbreviation ?? p.name).join(","),
        g.summary ?? "",
        cover_url,
        g.id,
      ],
    });
  }
  await db.batch(stmts);
  const ids = (await db.prepare(`SELECT id, igdb_id FROM games WHERE igdb_id IN (${ph(rows.length)})`).all(...rows.map((r) => r.g.id))) as {
    id: number;
    igdb_id: number;
  }[];
  const idOf = new Map(ids.map((r) => [r.igdb_id, r.id]));
  return rows.map((r) => idOf.get(r.g.id) ?? 0); // aligned with `games`; 0 = not stored
}

export async function searchIgdb(q: string): Promise<number[]> {
  if (!igdbEnabled || !q.trim()) return [];
  const safe = q.replace(/"/g, "");
  // Main games, remakes, remasters and expanded games only (no mods, DLC or fan projects), best known first.
  const games = await query(`search "${safe}"; ${FIELDS} where version_parent = null & game_type = (0,8,9,10,11) & cover != null; limit 40;`);
  games.sort((a, b) => (b.total_rating_count ?? 0) - (a.total_rating_count ?? 0));
  return (await upsert(games.slice(0, 20))).filter(Boolean);
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
    await db.prepare("UPDATE games SET igdb_id = ?, cover_url = ? WHERE id = ? AND igdb_id IS NULL").run(g.id, cover, id);
  } catch (e) {
    console.error("IGDB enrich failed", e);
  }
}

declare global {
  var __gameboxCoverSync: boolean | undefined;
}

/** Once per server process: fetch covers for catalogue games that don't have one yet (IGDB allows ~4 req/s). */
/**
 * Fills in covers for catalogue games that have none yet. Runs 4 lookups at a time (IGDB allows 4 requests
 * per second) and returns a promise, so callers can hand it to `after()` and serverless hosts like Vercel
 * keep the function alive until it is done.
 */
export async function syncMissingCovers() {
  if (!igdbEnabled || globalThis.__gameboxCoverSync || process.env.NEXT_PHASE === "phase-production-build") return;
  globalThis.__gameboxCoverSync = true;
  try {
    const missing = (await db.prepare("SELECT id, title FROM games WHERE cover_url IS NULL AND igdb_id IS NULL").all()) as { id: number; title: string }[];
    for (let i = 0; i < missing.length; i += 4) {
      const started = Date.now();
      await Promise.all(missing.slice(i, i + 4).map((g) => enrichGame(g.id, g.title)));
      await new Promise((r) => setTimeout(r, Math.max(0, 1100 - (Date.now() - started))));
    }
  } finally {
    globalThis.__gameboxCoverSync = false;
  }
}

// ---------- studios & details ----------

type InvolvedCompany = {
  developer: boolean;
  publisher: boolean;
  porting: boolean;
  supporting: boolean;
  company: { id: number; name: string; slug: string; country?: number; logo?: { image_id: string } };
};

type IgdbDetails = {
  id: number;
  involved_companies?: InvolvedCompany[];
  release_dates?: { date?: number; human?: string; platform?: { abbreviation?: string; name?: string } }[];
  franchises?: { name: string }[];
  collections?: { name: string }[];
  game_engines?: { name: string }[];
  game_modes?: { name: string }[];
  player_perspectives?: { name: string }[];
};

const COMPANY_FIELDS =
  "involved_companies.developer,involved_companies.publisher,involved_companies.porting,involved_companies.supporting," +
  "involved_companies.company.name,involved_companies.company.slug,involved_companies.company.country,involved_companies.company.logo.image_id";

const DETAIL_FIELDS = `fields ${COMPANY_FIELDS},release_dates.date,release_dates.human,release_dates.platform.abbreviation,release_dates.platform.name,franchises.name,collections.name,game_engines.name,game_modes.name,player_perspectives.name;`;

const logoUrl = (id?: string) => (id ? `https://images.igdb.com/igdb/image/upload/t_logo_med/${id}.png` : null);

const GERMAN: Record<string, string> = {
  "Single player": "Einzelspieler",
  Multiplayer: "Mehrspieler",
  "Co-operative": "Koop",
  "Split screen": "Splitscreen",
  "Massively Multiplayer Online (MMO)": "MMO",
  "Battle Royale": "Battle Royale",
  "First person": "Ego-Perspektive",
  "Third person": "Third-Person",
  "Bird view / Isometric": "Isometrisch",
  "Side view": "Seitenansicht",
  Text: "Text",
  Auditory: "Audio",
  "Virtual Reality": "VR",
};

/** Statements that upsert the companies of one game and link them with their roles (by IGDB ids, no lookups needed). */
function companyStatements(gameId: number, involved: InvolvedCompany[] = []) {
  const stmts: { sql: string; args: (string | number | null)[] }[] = [];
  for (const ic of involved) {
    const c = ic.company;
    if (!c?.id) continue;
    stmts.push({
      sql: `INSERT INTO companies (igdb_id, slug, name, logo_url, country) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(igdb_id) DO UPDATE SET name = excluded.name, logo_url = COALESCE(excluded.logo_url, companies.logo_url)`,
      // IGDB company slugs are unique, so they can be used as-is
      args: [c.id, c.slug || `company-${c.id}`, c.name, logoUrl(c.logo?.image_id), c.country ?? null],
    });
    stmts.push({
      sql: `INSERT INTO game_companies (game_id, company_id, developer, publisher, porting, supporting)
            SELECT ?, id, ?, ?, ?, ? FROM companies WHERE igdb_id = ?
            ON CONFLICT(game_id, company_id) DO UPDATE SET developer = excluded.developer, publisher = excluded.publisher,
              porting = excluded.porting, supporting = excluded.supporting`,
      args: [gameId, +ic.developer, +ic.publisher, +ic.porting, +ic.supporting, c.id],
    });
  }
  const dev = involved.find((i) => i.developer)?.company.name;
  if (dev) stmts.push({ sql: "UPDATE games SET developer = ? WHERE id = ?", args: [dev, gameId] });
  return stmts;
}

/** Loads studios, release dates, engine etc. for a game the first time its page is opened. */
export async function syncGameDetails(gameId: number): Promise<void> {
  if (!igdbEnabled) return;
  const g = (await db.prepare("SELECT igdb_id, details_synced_at FROM games WHERE id = ?").get(gameId)) as
    | { igdb_id: number | null; details_synced_at: string | null }
    | undefined;
  if (!g?.igdb_id || g.details_synced_at) return;
  try {
    const [d] = (await query(`${DETAIL_FIELDS} where id = ${Number(g.igdb_id)};`)) as unknown as IgdbDetails[];
    if (!d) return;
    const seen = new Set<string>();
    const releases = (d.release_dates ?? [])
      .filter((r) => r.date && r.platform)
      .map((r) => ({ platform: r.platform!.abbreviation ?? r.platform!.name ?? "", date: new Date(r.date! * 1000).toISOString().slice(0, 10), human: r.human ?? "" }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((r) => (seen.has(r.platform) ? false : (seen.add(r.platform), true)));
    const names = (xs?: { name: string }[]) => (xs ?? []).map((x) => GERMAN[x.name] ?? x.name).join(",");
    await db.batch([
      ...companyStatements(gameId, d.involved_companies),
      {
        sql: `UPDATE games SET engines = ?, modes = ?, perspectives = ?, franchise = ?, releases = ?, details_synced_at = datetime('now') WHERE id = ?`,
        args: [names(d.game_engines), names(d.game_modes), names(d.player_perspectives), (d.franchises?.[0] ?? d.collections?.[0])?.name ?? "", JSON.stringify(releases), gameId],
      },
    ]);
  } catch (e) {
    console.error("IGDB details failed", e);
  }
}

type IgdbCompany = {
  id: number;
  description?: string;
  country?: number;
  start_date?: number;
  logo?: { image_id: string };
  websites?: { url: string }[];
  developed?: number[];
  published?: number[];
};

/** Imports a studio's whole catalogue (developed + published games) once. */
export async function syncCompany(companyId: number): Promise<void> {
  if (!igdbEnabled) return;
  const c = (await db.prepare("SELECT igdb_id, synced_at FROM companies WHERE id = ?").get(companyId)) as
    | { igdb_id: number | null; synced_at: string | null }
    | undefined;
  if (!c?.igdb_id || c.synced_at) return;
  try {
    const [info] = (await query(
      `fields description,country,start_date,logo.image_id,websites.url,developed,published; where id = ${Number(c.igdb_id)};`,
      "companies",
    )) as unknown as IgdbCompany[];
    if (!info) return;
    const ids = [...new Set([...(info.developed ?? []), ...(info.published ?? [])])].slice(0, 400);
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const games = (await query(
        `${FIELDS.replace(/;$/, "")},${COMPANY_FIELDS}; where id = (${chunk.join(",")}) & version_parent = null & game_type = (0,4,8,9,10,11); limit 200;`,
      )) as unknown as (IgdbGame & { involved_companies?: InvolvedCompany[] })[];
      const localIds = await upsert(games);
      const byIgdb = new Map(games.map((g, k) => [g.id, localIds[k]]));
      // link every game to every studio involved, in one batch
      await db.batch(games.flatMap((g) => (byIgdb.get(g.id) ? companyStatements(byIgdb.get(g.id)!, g.involved_companies) : [])));
    }
    await db
      .prepare(
        "UPDATE companies SET description = ?, country = COALESCE(?, country), founded = ?, logo_url = COALESCE(?, logo_url), website = ?, synced_at = datetime('now') WHERE id = ?",
      )
      .run(
        info.description ?? "",
        info.country ?? null,
        info.start_date ? new Date(info.start_date * 1000).getUTCFullYear() : null,
        logoUrl(info.logo?.image_id),
        info.websites?.[0]?.url ?? null,
        companyId,
      );
  } catch (e) {
    console.error("IGDB company sync failed", e);
  }
}

// ---------- maintenance (used by /sync) ----------

/** Checks the IGDB credentials with one tiny request; returns null when everything works, else a short reason. */
export async function igdbProblem(): Promise<string | null> {
  if (!CLIENT_ID || !CLIENT_SECRET) return "IGDB_CLIENT_ID oder IGDB_CLIENT_SECRET fehlt in den Umgebungsvariablen.";
  try {
    await query("fields id; limit 1;");
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

/**
 * Fills covers, then details + studios for catalogue games, 4 IGDB lookups per second, until the time
 * budget runs out. Safe to call repeatedly: every step skips what is already done.
 */
export async function syncCatalogue(budgetMs: number): Promise<void> {
  const until = Date.now() + budgetMs;
  const inGroups = async <T,>(items: T[], fn: (x: T) => Promise<void>) => {
    for (let i = 0; i < items.length && Date.now() < until; i += 4) {
      const started = Date.now();
      await Promise.all(items.slice(i, i + 4).map(fn));
      await new Promise((r) => setTimeout(r, Math.max(0, 1100 - (Date.now() - started))));
    }
  };
  const noCover = (await db.prepare("SELECT id, title FROM games WHERE source = 'seed' AND cover_url IS NULL").all()) as { id: number; title: string }[];
  await inGroups(noCover, (g) => enrichGame(g.id, g.title));
  const noDetails = (await db
    .prepare("SELECT id FROM games WHERE source = 'seed' AND igdb_id IS NOT NULL AND details_synced_at IS NULL")
    .all()) as { id: number }[];
  await inGroups(noDetails, (g) => syncGameDetails(g.id));
}
