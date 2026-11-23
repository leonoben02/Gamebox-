import { createClient, type Client, type InArgs, type Transaction } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { catalogStatements, EXTRA_GAMES, SEED_GAMES, seedStatements } from "./seed";

const SEED_GAMES_TOTAL = SEED_GAMES.length + EXTRA_GAMES.length;

/**
 * Database: libSQL. Locally a SQLite file (./data/gamebox.db); in production a Turso database
 * (set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN). The small wrapper below keeps a
 * small prepare()-style API (prepare().get/all/run), but every call is async.
 */
const URL = process.env.TURSO_DATABASE_URL ?? `file:${process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "gamebox.db")}`;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  avatar_hue INTEGER NOT NULL DEFAULT 260,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  year INTEGER,
  developer TEXT NOT NULL DEFAULT '',
  genres TEXT NOT NULL DEFAULT '',
  platforms TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  cover_url TEXT,
  igdb_id INTEGER UNIQUE,
  source TEXT NOT NULL DEFAULT 'seed', -- 'seed' or 'igdb' (imported by search)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Studios / companies (developer, publisher, porting, support), from IGDB
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY,
  igdb_id INTEGER UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT NOT NULL DEFAULT '',
  country INTEGER,
  founded INTEGER,
  website TEXT,
  synced_at TEXT -- when the full game list was imported
);
CREATE TABLE IF NOT EXISTS game_companies (
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  developer INTEGER NOT NULL DEFAULT 0,
  publisher INTEGER NOT NULL DEFAULT 0,
  porting INTEGER NOT NULL DEFAULT 0,
  supporting INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (game_id, company_id)
);
CREATE INDEX IF NOT EXISTS game_companies_company ON game_companies(company_id);
-- Current relationship between a user and a game (played / liked / rating / backlog)
CREATE TABLE IF NOT EXISTS user_games (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  played INTEGER NOT NULL DEFAULT 0,
  liked INTEGER NOT NULL DEFAULT 0,
  rating INTEGER, -- 1..10 (half stars)
  backlog INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, game_id)
);
-- Diary entries and reviews
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  played_on TEXT, -- YYYY-MM-DD, NULL = not in diary
  rating INTEGER,
  liked INTEGER NOT NULL DEFAULT 0,
  review TEXT,
  spoilers INTEGER NOT NULL DEFAULT 0,
  replay INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'played', -- played | completed | mastered | abandoned
  platform TEXT NOT NULL DEFAULT '',
  hours INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS logs_user ON logs(user_id, played_on);
CREATE INDEX IF NOT EXISTS logs_game ON logs(game_id);
CREATE TABLE IF NOT EXISTS review_likes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_id INTEGER NOT NULL REFERENCES logs(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, log_id)
);
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY,
  log_id INTEGER NOT NULL REFERENCES logs(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS lists (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  ranked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS list_items (
  list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  PRIMARY KEY (list_id, game_id)
);
CREATE TABLE IF NOT EXISTS list_likes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, list_id)
);
CREATE TABLE IF NOT EXISTS follows (
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (follower_id, followee_id)
);
CREATE TABLE IF NOT EXISTS favorites (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  PRIMARY KEY (user_id, position)
);
CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- log | review | backlog | list | follow | like_review | like_list
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  log_id INTEGER REFERENCES logs(id) ON DELETE CASCADE,
  list_id INTEGER REFERENCES lists(id) ON DELETE CASCADE,
  target_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS activity_user ON activity(user_id, created_at);
`;

type Args = unknown[];
type Executor = Pick<Client, "execute"> | Transaction;

export type RunResult = { changes: number; lastInsertRowid: number };

function toArgs(sql: string, args: Args): InArgs {
  // a single plain object = named parameters (@name), otherwise positional (?)
  if (args.length === 1 && args[0] !== null && typeof args[0] === "object" && !Array.isArray(args[0])) {
    // Turso (remote libSQL) rejects named values the statement doesn't use; local SQLite ignores them.
    // Drop unused keys so both behave the same.
    const used = new Set([...sql.matchAll(/[@:$]([A-Za-z_]\w*)/g)].map((m) => m[1]));
    return Object.fromEntries(Object.entries(args[0] as Record<string, unknown>).filter(([k]) => used.has(k))) as InArgs;
  }
  return args as InArgs;
}

function statement(exec: () => Promise<Executor>, sql: string) {
  const run = async (args: Args) => (await exec()).execute({ sql, args: toArgs(sql, args) });
  const plain = (r: Awaited<ReturnType<typeof run>>) =>
    r.rows.map((row) => Object.fromEntries(r.columns.map((c, i) => [c, row[i]])));
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async get(...args: Args): Promise<any> {
      return plain(await run(args))[0];
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async all(...args: Args): Promise<any[]> {
      return plain(await run(args));
    },
    async run(...args: Args): Promise<RunResult> {
      const r = await run(args);
      return { changes: r.rowsAffected, lastInsertRowid: Number(r.lastInsertRowid ?? 0) };
    },
  };
}

declare global {
  var __gameboxDb: Promise<Client> | undefined;
}

async function open(): Promise<Client> {
  if (URL.startsWith("file:")) fs.mkdirSync(path.dirname(URL.slice(5)), { recursive: true });
  const client = createClient({ url: URL, authToken: process.env.TURSO_AUTH_TOKEN });
  if (URL.startsWith("file:")) await client.execute("PRAGMA journal_mode = WAL");
  await client.executeMultiple(SCHEMA);
  // migration for databases created before the `source` column existed
  const cols = new Set((await client.execute("PRAGMA table_info(games)")).rows.map((c) => String(c.name)));
  const add: [string, string][] = [
    ["source", "TEXT NOT NULL DEFAULT 'seed'"],
    ["engines", "TEXT NOT NULL DEFAULT ''"],
    ["modes", "TEXT NOT NULL DEFAULT ''"],
    ["perspectives", "TEXT NOT NULL DEFAULT ''"],
    ["franchise", "TEXT NOT NULL DEFAULT ''"],
    ["releases", "TEXT NOT NULL DEFAULT '[]'"], // JSON [{platform, date, human}]
    ["details_synced_at", "TEXT"],
    ["multiplayer", "TEXT"], // tags from src/lib/multiplayer.ts; NULL = not looked up yet
    ["trending", "INTEGER NOT NULL DEFAULT 0"], // rank score from IGDB's current page visits (higher = hotter right now)
    ["popularity", "INTEGER NOT NULL DEFAULT 0"], // IGDB total_rating_count, for sorting unplayed games
  ];
  for (const [name, type] of add) if (!cols.has(name)) await client.execute(`ALTER TABLE games ADD COLUMN ${name} ${type}`);
  const ugCols = new Set((await client.execute("PRAGMA table_info(user_games)")).rows.map((c) => String(c.name)));
  if (!ugCols.has("playing")) await client.execute("ALTER TABLE user_games ADD COLUMN playing INTEGER NOT NULL DEFAULT 0");
  // how far: played | completed (durchgespielt) | mastered (100 %) | abandoned
  if (!ugCols.has("status")) await client.execute("ALTER TABLE user_games ADD COLUMN status TEXT NOT NULL DEFAULT 'played'");
  const userCols = new Set((await client.execute("PRAGMA table_info(users)")).rows.map((c) => String(c.name)));
  if (!userCols.has("google_sub")) await client.execute("ALTER TABLE users ADD COLUMN google_sub TEXT");
  if (!userCols.has("email")) await client.execute("ALTER TABLE users ADD COLUMN email TEXT");
  await client.execute("CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL");
  const { rows } = await client.execute("SELECT COUNT(*) AS n FROM games");
  if (Number(rows[0].n) === 0) {
    // all seed statements use fixed ids + INSERT OR IGNORE, so concurrent cold starts are harmless
    await client.batch(seedStatements(process.env.SEED_DEMO_USERS !== "false"), "write");
  }
  const seeded = await client.execute("SELECT COUNT(*) AS n FROM games WHERE source = 'seed'");
  if (Number(seeded.rows[0].n) < SEED_GAMES_TOTAL) await client.batch(catalogStatements(), "write");
  return client;
}

function client(): Promise<Client> {
  if (!globalThis.__gameboxDb) {
    globalThis.__gameboxDb = open();
    globalThis.__gameboxDb.catch(() => (globalThis.__gameboxDb = undefined));
  }
  return globalThis.__gameboxDb;
}

type Prepare = (sql: string) => ReturnType<typeof statement>;

export const db: {
  prepare: Prepare;
  transaction<T>(fn: (tx: { prepare: Prepare }) => Promise<T>): Promise<T>;
  batch(stmts: { sql: string; args: InArgs }[]): Promise<void>;
} = {
  /** Many writes in one round trip and one transaction (important for a remote Turso database). */
  async batch(stmts) {
    if (stmts.length) await (await client()).batch(stmts, "write");
  },
  prepare: (sql: string) => statement(client, sql),
  /** Runs fn inside a write transaction; `tx.prepare` has the same API as `db.prepare`. */
  async transaction<T>(fn: (tx: { prepare: Prepare }) => Promise<T>): Promise<T> {
    const t = await (await client()).transaction("write");
    try {
      const out = await fn({ prepare: (sql: string) => statement(async () => t, sql) });
      await t.commit();
      return out;
    } catch (e) {
      await t.rollback().catch(() => {});
      throw e;
    } finally {
      t.close();
    }
  },
};
