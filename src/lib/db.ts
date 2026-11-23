import { createClient, type Client, type InArgs, type Transaction } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { seedStatements } from "./seed";

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

function toArgs(args: Args): InArgs {
  // a single plain object = named parameters (@name), otherwise positional (?)
  if (args.length === 1 && args[0] !== null && typeof args[0] === "object" && !Array.isArray(args[0])) return args[0] as InArgs;
  return args as InArgs;
}

function statement(exec: () => Promise<Executor>, sql: string) {
  const run = async (args: Args) => (await exec()).execute({ sql, args: toArgs(args) });
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
  const cols = await client.execute("PRAGMA table_info(games)");
  if (!cols.rows.some((c) => c.name === "source")) await client.execute("ALTER TABLE games ADD COLUMN source TEXT NOT NULL DEFAULT 'seed'");
  const { rows } = await client.execute("SELECT COUNT(*) AS n FROM games");
  if (Number(rows[0].n) === 0) {
    // all seed statements use fixed ids + INSERT OR IGNORE, so concurrent cold starts are harmless
    await client.batch(seedStatements(process.env.SEED_DEMO_USERS !== "false"), "write");
  }
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
} = {
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
