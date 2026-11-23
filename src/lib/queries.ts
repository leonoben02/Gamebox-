import "server-only";
import { db } from "./db";

export type Game = {
  id: number;
  slug: string;
  title: string;
  year: number | null;
  developer: string;
  genres: string;
  platforms: string;
  summary: string;
  cover_url: string | null;
};

export type UserLite = { id: number; username: string; display_name: string; avatar_hue: number };

export type LogEntry = {
  id: number;
  user_id: number;
  game_id: number;
  played_on: string | null;
  rating: number | null;
  liked: number;
  review: string | null;
  spoilers: number;
  replay: number;
  status: string;
  platform: string;
  hours: number | null;
  created_at: string;
};

export type ReviewRow = LogEntry & {
  game: Game;
  user: UserLite;
  like_count: number;
  comment_count: number;
  viewer_liked: number;
};

const GAME_COLS = "g.id, g.slug, g.title, g.year, g.developer, g.genres, g.platforms, g.summary, g.cover_url";

function pick<T>(row: Record<string, unknown>, prefix: string): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (k.startsWith(prefix)) out[k.slice(prefix.length)] = v;
  return out as T;
}

// ---------- games ----------

export function getGameBySlug(slug: string): Game | undefined {
  return db.prepare(`SELECT ${GAME_COLS} FROM games g WHERE slug = ?`).get(slug) as Game | undefined;
}

export function getGamesByIds(ids: number[]): Game[] {
  if (!ids.length) return [];
  const rows = db.prepare(`SELECT ${GAME_COLS} FROM games g WHERE id IN (${ids.map(() => "?").join(",")})`).all(...ids) as Game[];
  const order = new Map(ids.map((id, i) => [id, i]));
  return rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
}

export function searchLocalGames(q: string, limit = 40): Game[] {
  return db
    .prepare(
      `SELECT ${GAME_COLS} FROM games g WHERE title LIKE @like
       ORDER BY (title = @q COLLATE NOCASE) DESC, (title LIKE @prefix) DESC,
         (SELECT COUNT(*) FROM user_games ug WHERE ug.game_id = g.id) DESC, (source = 'seed') DESC, LENGTH(title)
       LIMIT @limit`,
    )
    .all({ like: `%${q}%`, prefix: `${q}%`, q, limit }) as Game[];
}

export type BrowseSort = "popular" | "rating" | "newest" | "oldest" | "title";

export function browseGames(opts: { sort?: BrowseSort; genre?: string; limit?: number }): (Game & { players: number; avg: number | null })[] {
  const order = {
    popular: "players DESC, g.title",
    rating: "avg IS NULL, avg DESC, players DESC",
    newest: "g.year DESC, g.title",
    oldest: "g.year ASC, g.title",
    title: "g.title COLLATE NOCASE",
  }[opts.sort ?? "popular"];
  const conds = [
    "(g.source = 'seed' OR EXISTS (SELECT 1 FROM user_games ug WHERE ug.game_id = g.id) OR EXISTS (SELECT 1 FROM list_items li WHERE li.game_id = g.id))",
  ];
  if (opts.genre) conds.push("(',' || g.genres || ',') LIKE ?");
  const where = `WHERE ${conds.join(" AND ")}`;
  const params: unknown[] = opts.genre ? [`%,${opts.genre},%`] : [];
  return db
    .prepare(
      `SELECT ${GAME_COLS},
        (SELECT COUNT(*) FROM user_games ug WHERE ug.game_id = g.id AND ug.played = 1) AS players,
        (SELECT AVG(rating) FROM user_games ug WHERE ug.game_id = g.id AND ug.rating IS NOT NULL) AS avg
       FROM games g ${where} ORDER BY ${order} LIMIT ?`,
    )
    .all(...params, opts.limit ?? 96) as (Game & { players: number; avg: number | null })[];
}

export function allGenres(): string[] {
  const rows = db
    .prepare("SELECT genres FROM games g WHERE g.source = 'seed' OR EXISTS (SELECT 1 FROM user_games ug WHERE ug.game_id = g.id)")
    .all() as { genres: string }[];
  const counts = new Map<string, number>();
  for (const r of rows) for (const g of r.genres.split(",").filter(Boolean)) counts.set(g, (counts.get(g) ?? 0) + 1);
  return [...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).map(([g]) => g);
}

/** Games with the most activity in the last `days` days. */
export function trendingGames(days = 30, limit = 12): Game[] {
  return db
    .prepare(
      `SELECT ${GAME_COLS}, COUNT(a.id) AS n FROM games g
       JOIN activity a ON a.game_id = g.id AND a.created_at > datetime('now', ?)
       GROUP BY g.id ORDER BY n DESC, g.title LIMIT ?`,
    )
    .all(`-${days} days`, limit) as Game[];
}

export function gameStats(gameId: number) {
  const s = db
    .prepare(
      `SELECT
        SUM(played) AS players, SUM(liked) AS likes, SUM(backlog) AS backlogs,
        AVG(rating) AS avg, COUNT(rating) AS ratings
       FROM user_games WHERE game_id = ?`,
    )
    .get(gameId) as { players: number | null; likes: number | null; backlogs: number | null; avg: number | null; ratings: number };
  const lists = (db.prepare("SELECT COUNT(DISTINCT list_id) AS n FROM list_items WHERE game_id = ?").get(gameId) as { n: number }).n;
  const histogram = Array(10).fill(0) as number[];
  for (const r of db.prepare("SELECT rating, COUNT(*) AS n FROM user_games WHERE game_id = ? AND rating IS NOT NULL GROUP BY rating").all(gameId) as {
    rating: number;
    n: number;
  }[])
    histogram[r.rating - 1] = r.n;
  return {
    players: s.players ?? 0,
    likes: s.likes ?? 0,
    backlogs: s.backlogs ?? 0,
    avg: s.avg,
    ratings: s.ratings,
    lists,
    histogram,
  };
}

// ---------- user <-> game ----------

export type UserGame = { played: number; liked: number; rating: number | null; backlog: number };

export function getUserGame(userId: number, gameId: number): UserGame {
  return (
    (db.prepare("SELECT played, liked, rating, backlog FROM user_games WHERE user_id = ? AND game_id = ?").get(userId, gameId) as
      | UserGame
      | undefined) ?? { played: 0, liked: 0, rating: null, backlog: 0 }
  );
}

/** Games a user has played/rated, with their own rating (Letterboxd's "Films" tab). */
export function userGames(userId: number, filter: "played" | "backlog" | "liked", sort: "recent" | "rating" | "title" = "recent") {
  const where = { played: "ug.played = 1", backlog: "ug.backlog = 1", liked: "ug.liked = 1" }[filter];
  const order = { recent: "ug.updated_at DESC", rating: "ug.rating IS NULL, ug.rating DESC", title: "g.title COLLATE NOCASE" }[sort];
  return db
    .prepare(`SELECT ${GAME_COLS}, ug.rating AS user_rating, ug.liked AS user_liked FROM user_games ug JOIN games g ON g.id = ug.game_id WHERE ug.user_id = ? AND ${where} ORDER BY ${order}`)
    .all(userId) as (Game & { user_rating: number | null; user_liked: number })[];
}

// ---------- logs / reviews ----------

const REVIEW_SELECT = `
  SELECT l.*,
    g.id AS g_id, g.slug AS g_slug, g.title AS g_title, g.year AS g_year, g.cover_url AS g_cover_url,
    g.developer AS g_developer, g.genres AS g_genres, g.platforms AS g_platforms, g.summary AS g_summary,
    u.id AS u_id, u.username AS u_username, u.display_name AS u_display_name, u.avatar_hue AS u_avatar_hue,
    (SELECT COUNT(*) FROM review_likes rl WHERE rl.log_id = l.id) AS like_count,
    (SELECT COUNT(*) FROM comments c WHERE c.log_id = l.id) AS comment_count,
    EXISTS (SELECT 1 FROM review_likes rl WHERE rl.log_id = l.id AND rl.user_id = @viewer) AS viewer_liked
  FROM logs l JOIN games g ON g.id = l.game_id JOIN users u ON u.id = l.user_id`;

function toReview(r: Record<string, unknown>): ReviewRow {
  const game = pick<Game>(r, "g_");
  const user = pick<UserLite>(r, "u_");
  return { ...(r as unknown as LogEntry), game, user, like_count: r.like_count as number, comment_count: r.comment_count as number, viewer_liked: r.viewer_liked as number };
}

export function getLog(id: number, viewer = 0): ReviewRow | undefined {
  const r = db.prepare(`${REVIEW_SELECT} WHERE l.id = @id`).get({ id, viewer }) as Record<string, unknown> | undefined;
  return r ? toReview(r) : undefined;
}

export function gameReviews(gameId: number, viewer = 0, sort: "popular" | "recent" = "popular", limit = 20, onlyUserIds?: number[]) {
  const order = sort === "popular" ? "like_count DESC, l.created_at DESC" : "l.created_at DESC";
  const friends = onlyUserIds ? `AND l.user_id IN (${onlyUserIds.map(Number).join(",") || "0"})` : "";
  return (
    db.prepare(`${REVIEW_SELECT} WHERE l.game_id = @gameId AND l.review IS NOT NULL ${friends} ORDER BY ${order} LIMIT @limit`).all({ gameId, viewer, limit }) as Record<
      string,
      unknown
    >[]
  ).map(toReview);
}

export function popularReviews(viewer = 0, days = 365, limit = 6) {
  return (
    db
      .prepare(`${REVIEW_SELECT} WHERE l.review IS NOT NULL AND l.created_at > datetime('now', @since) ORDER BY like_count DESC, l.created_at DESC LIMIT @limit`)
      .all({ viewer, since: `-${days} days`, limit }) as Record<string, unknown>[]
  ).map(toReview);
}

export function userReviews(userId: number, viewer = 0, limit = 50) {
  return (
    db.prepare(`${REVIEW_SELECT} WHERE l.user_id = @userId AND l.review IS NOT NULL ORDER BY l.created_at DESC LIMIT @limit`).all({ userId, viewer, limit }) as Record<
      string,
      unknown
    >[]
  ).map(toReview);
}

export function userDiary(userId: number, year?: number) {
  const yearFilter = year ? "AND substr(l.played_on, 1, 4) = @year" : "";
  return (
    db
      .prepare(`${REVIEW_SELECT} WHERE l.user_id = @userId AND l.played_on IS NOT NULL ${yearFilter} ORDER BY l.played_on DESC, l.id DESC`)
      .all({ userId, viewer: 0, year: String(year ?? "") }) as Record<string, unknown>[]
  ).map(toReview);
}

export function diaryYears(userId: number): number[] {
  return (db.prepare("SELECT DISTINCT CAST(substr(played_on,1,4) AS INTEGER) AS y FROM logs WHERE user_id = ? AND played_on IS NOT NULL ORDER BY y DESC").all(userId) as { y: number }[]).map(
    (r) => r.y,
  );
}

export function logComments(logId: number) {
  return db
    .prepare(
      `SELECT c.id, c.body, c.created_at, u.id AS user_id, u.username, u.display_name, u.avatar_hue
       FROM comments c JOIN users u ON u.id = c.user_id WHERE c.log_id = ? ORDER BY c.created_at`,
    )
    .all(logId) as { id: number; body: string; created_at: string; user_id: number; username: string; display_name: string; avatar_hue: number }[];
}

// ---------- users ----------

export function getUserByUsername(username: string) {
  return db.prepare("SELECT id, username, display_name, bio, avatar_hue, created_at FROM users WHERE username = ?").get(username) as
    | (UserLite & { bio: string; created_at: string })
    | undefined;
}

export function profileStats(userId: number) {
  const q = (sql: string) => (db.prepare(sql).get(userId) as { n: number }).n;
  return {
    played: q("SELECT COUNT(*) AS n FROM user_games WHERE user_id = ? AND played = 1"),
    thisYear: q("SELECT COUNT(DISTINCT game_id) AS n FROM logs WHERE user_id = ? AND substr(played_on,1,4) = strftime('%Y','now')"),
    lists: q("SELECT COUNT(*) AS n FROM lists WHERE user_id = ?"),
    following: q("SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?"),
    followers: q("SELECT COUNT(*) AS n FROM follows WHERE followee_id = ?"),
    backlog: q("SELECT COUNT(*) AS n FROM user_games WHERE user_id = ? AND backlog = 1"),
    reviews: q("SELECT COUNT(*) AS n FROM logs WHERE user_id = ? AND review IS NOT NULL"),
  };
}

export function userRatingHistogram(userId: number): number[] {
  const h = Array(10).fill(0) as number[];
  for (const r of db.prepare("SELECT rating, COUNT(*) AS n FROM user_games WHERE user_id = ? AND rating IS NOT NULL GROUP BY rating").all(userId) as {
    rating: number;
    n: number;
  }[])
    h[r.rating - 1] = r.n;
  return h;
}

export function favoriteGames(userId: number): Game[] {
  return db.prepare(`SELECT ${GAME_COLS} FROM favorites f JOIN games g ON g.id = f.game_id WHERE f.user_id = ? ORDER BY f.position`).all(userId) as Game[];
}

export function isFollowing(follower: number, followee: number): boolean {
  return Boolean(db.prepare("SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?").get(follower, followee));
}

export function followList(userId: number, dir: "following" | "followers") {
  const [join, where] = dir === "following" ? ["f.followee_id", "f.follower_id"] : ["f.follower_id", "f.followee_id"];
  return db
    .prepare(
      `SELECT u.id, u.username, u.display_name, u.avatar_hue, u.bio,
        (SELECT COUNT(*) FROM user_games ug WHERE ug.user_id = u.id AND ug.played = 1) AS played
       FROM follows f JOIN users u ON u.id = ${join} WHERE ${where} = ? ORDER BY f.created_at DESC`,
    )
    .all(userId) as (UserLite & { bio: string; played: number })[];
}

export function followingIds(userId: number): number[] {
  return (db.prepare("SELECT followee_id AS id FROM follows WHERE follower_id = ?").all(userId) as { id: number }[]).map((r) => r.id);
}

export function popularMembers(limit = 30) {
  return db
    .prepare(
      `SELECT u.id, u.username, u.display_name, u.avatar_hue, u.bio,
        (SELECT COUNT(*) FROM user_games ug WHERE ug.user_id = u.id AND ug.played = 1) AS played,
        (SELECT COUNT(*) FROM logs l WHERE l.user_id = u.id AND l.review IS NOT NULL) AS reviews,
        (SELECT COUNT(*) FROM follows f WHERE f.followee_id = u.id) AS followers
       FROM users u ORDER BY followers DESC, played DESC LIMIT ?`,
    )
    .all(limit) as (UserLite & { bio: string; played: number; reviews: number; followers: number })[];
}

/** Ratings by people the viewer follows, shown on a game page. */
export function friendsOnGame(viewerId: number, gameId: number) {
  return db
    .prepare(
      `SELECT u.id, u.username, u.display_name, u.avatar_hue, ug.rating, ug.liked
       FROM follows f JOIN user_games ug ON ug.user_id = f.followee_id AND ug.game_id = ? AND ug.played = 1
       JOIN users u ON u.id = f.followee_id WHERE f.follower_id = ? ORDER BY ug.updated_at DESC`,
    )
    .all(gameId, viewerId) as (UserLite & { rating: number | null; liked: number })[];
}

// ---------- lists ----------

export type ListSummary = {
  id: number;
  title: string;
  description: string;
  ranked: number;
  updated_at: string;
  user: UserLite;
  count: number;
  likes: number;
  covers: Game[];
};

const LIST_SELECT = `
  SELECT l.id, l.title, l.description, l.ranked, l.updated_at,
    u.id AS u_id, u.username AS u_username, u.display_name AS u_display_name, u.avatar_hue AS u_avatar_hue,
    (SELECT COUNT(*) FROM list_items li WHERE li.list_id = l.id) AS count,
    (SELECT COUNT(*) FROM list_likes ll WHERE ll.list_id = l.id) AS likes
  FROM lists l JOIN users u ON u.id = l.user_id`;

function withCovers(rows: Record<string, unknown>[]): ListSummary[] {
  const coverStmt = db.prepare(`SELECT ${GAME_COLS} FROM list_items li JOIN games g ON g.id = li.game_id WHERE li.list_id = ? ORDER BY li.position LIMIT 5`);
  return rows.map((r) => ({
    id: r.id as number,
    title: r.title as string,
    description: r.description as string,
    ranked: r.ranked as number,
    updated_at: r.updated_at as string,
    count: r.count as number,
    likes: r.likes as number,
    user: pick<UserLite>(r, "u_"),
    covers: coverStmt.all(r.id) as Game[],
  }));
}

export function popularLists(limit = 12) {
  return withCovers(db.prepare(`${LIST_SELECT} ORDER BY likes DESC, l.updated_at DESC LIMIT ?`).all(limit) as Record<string, unknown>[]);
}

export function userLists(userId: number) {
  return withCovers(db.prepare(`${LIST_SELECT} WHERE l.user_id = ? ORDER BY l.updated_at DESC`).all(userId) as Record<string, unknown>[]);
}

export function listsWithGame(gameId: number, limit = 6) {
  return withCovers(
    db.prepare(`${LIST_SELECT} WHERE l.id IN (SELECT list_id FROM list_items WHERE game_id = ?) ORDER BY likes DESC LIMIT ?`).all(gameId, limit) as Record<
      string,
      unknown
    >[],
  );
}

export function getList(id: number) {
  const r = db.prepare(`${LIST_SELECT} WHERE l.id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!r) return undefined;
  const [summary] = withCovers([r]);
  const games = db.prepare(`SELECT ${GAME_COLS} FROM list_items li JOIN games g ON g.id = li.game_id WHERE li.list_id = ? ORDER BY li.position`).all(id) as Game[];
  return { ...summary, games };
}

export function hasLikedList(userId: number, listId: number) {
  return Boolean(db.prepare("SELECT 1 FROM list_likes WHERE user_id = ? AND list_id = ?").get(userId, listId));
}

export function myListsForGame(userId: number, gameId: number) {
  return db
    .prepare(
      `SELECT l.id, l.title, EXISTS(SELECT 1 FROM list_items li WHERE li.list_id = l.id AND li.game_id = ?) AS has
       FROM lists l WHERE l.user_id = ? ORDER BY l.updated_at DESC`,
    )
    .all(gameId, userId) as { id: number; title: string; has: number }[];
}

// ---------- activity ----------

export type ActivityItem = {
  id: number;
  type: string;
  created_at: string;
  user: UserLite;
  game: Game | null;
  log: { id: number; rating: number | null; liked: number; review: string | null; replay: number; status: string } | null;
  list: { id: number; title: string } | null;
  target: UserLite | null;
};

export function activityFeed(opts: { userIds?: number[]; limit?: number }): ActivityItem[] {
  const where = opts.userIds ? `WHERE a.user_id IN (${opts.userIds.map(Number).join(",") || "0"})` : "";
  const rows = db
    .prepare(
      `SELECT a.id, a.type, a.created_at,
        u.id AS u_id, u.username AS u_username, u.display_name AS u_display_name, u.avatar_hue AS u_avatar_hue,
        g.id AS g_id, g.slug AS g_slug, g.title AS g_title, g.year AS g_year, g.cover_url AS g_cover_url,
        lg.id AS lg_id, lg.rating AS lg_rating, lg.liked AS lg_liked, lg.review AS lg_review, lg.replay AS lg_replay, lg.status AS lg_status,
        li.id AS li_id, li.title AS li_title,
        t.id AS t_id, t.username AS t_username, t.display_name AS t_display_name, t.avatar_hue AS t_avatar_hue
       FROM activity a JOIN users u ON u.id = a.user_id
       LEFT JOIN games g ON g.id = a.game_id
       LEFT JOIN logs lg ON lg.id = a.log_id
       LEFT JOIN lists li ON li.id = a.list_id
       LEFT JOIN users t ON t.id = a.target_user_id
       ${where} ORDER BY a.created_at DESC, a.id DESC LIMIT ?`,
    )
    .all(opts.limit ?? 50) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as number,
    type: r.type as string,
    created_at: r.created_at as string,
    user: pick<UserLite>(r, "u_"),
    game: r.g_id ? pick<Game>(r, "g_") : null,
    log: r.lg_id ? (pick(r, "lg_") as ActivityItem["log"]) : null,
    list: r.li_id ? (pick(r, "li_") as ActivityItem["list"]) : null,
    target: r.t_id ? pick<UserLite>(r, "t_") : null,
  }));
}

/** Recent diary entries from followed users, as covers (home page "New from friends"). */
export function friendsRecentLogs(userId: number, limit = 12) {
  return (
    db
      .prepare(`${REVIEW_SELECT} WHERE l.user_id IN (SELECT followee_id FROM follows WHERE follower_id = @userId) ORDER BY l.created_at DESC LIMIT @limit`)
      .all({ userId, viewer: userId, limit }) as Record<string, unknown>[]
  ).map(toReview);
}
