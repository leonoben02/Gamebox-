"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { endSession, getCurrentUser, requireUser, startSession } from "@/lib/auth";

export type FormState = { error?: string; ok?: boolean } | undefined;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

// ---------- auth ----------

export async function signup(_: FormState, f: FormData): Promise<FormState> {
  const username = str(f, "username").toLowerCase();
  const password = str(f, "password");
  const displayName = str(f, "display_name") || username;
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return { error: "Benutzername: 3–20 Zeichen, nur a–z, 0–9 und _." };
  if (password.length < 8) return { error: "Das Passwort braucht mindestens 8 Zeichen." };
  if (await db.prepare("SELECT 1 FROM users WHERE username = ?").get(username)) return { error: "Dieser Benutzername ist schon vergeben." };
  const hue = Math.floor(Math.random() * 360);
  const r = await db
    .prepare("INSERT INTO users (username, display_name, password_hash, avatar_hue) VALUES (?, ?, ?, ?)")
    .run(username, displayName.slice(0, 40), await bcrypt.hash(password, 10), hue);
  await startSession(Number(r.lastInsertRowid));
  redirect("/");
}

export async function login(_: FormState, f: FormData): Promise<FormState> {
  const username = str(f, "username");
  const row = await db.prepare("SELECT id, password_hash FROM users WHERE username = ?").get(username) as
    | { id: number; password_hash: string }
    | undefined;
  if (!row || !(await bcrypt.compare(str(f, "password"), row.password_hash)))
    return { error: "Benutzername oder Passwort stimmt nicht." };
  await startSession(row.id);
  const next = str(f, "next");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  await endSession();
  redirect("/");
}

// ---------- game status (quick actions) ----------

async function upsertUserGame(userId: number, gameId: number, patch: Partial<{ played: number; liked: number; rating: number | null; backlog: number; playing: number }>) {
  await db.prepare("INSERT INTO user_games (user_id, game_id) VALUES (?, ?) ON CONFLICT DO NOTHING").run(userId, gameId);
  const sets = Object.keys(patch).map((k) => `${k} = @${k}`);
  await db.prepare(`UPDATE user_games SET ${sets.join(", ")}, updated_at = datetime('now') WHERE user_id = @userId AND game_id = @gameId`).run({
    ...patch,
    userId,
    gameId,
  });
  // drop empty rows
  await db.prepare("DELETE FROM user_games WHERE user_id = ? AND game_id = ? AND played = 0 AND liked = 0 AND rating IS NULL AND backlog = 0 AND playing = 0").run(userId, gameId);
}

async function gameSlug(gameId: number) {
  return (await db.prepare("SELECT slug FROM games WHERE id = ?").get(gameId) as { slug: string } | undefined)?.slug;
}

async function refreshGame(gameId: number) {
  const slug = await gameSlug(gameId);
  if (slug) revalidatePath(`/game/${slug}`);
}

export async function togglePlayed(gameId: number) {
  const u = await requireUser();
  const cur = await db.prepare("SELECT played FROM user_games WHERE user_id = ? AND game_id = ?").get(u.id, gameId) as { played: number } | undefined;
  const played = cur?.played ? 0 : 1;
  // Marking played removes it from the backlog, like Letterboxd's watchlist.
  await upsertUserGame(u.id, gameId, played ? { played, backlog: 0 } : { played });
  await refreshGame(gameId);
}

export async function toggleLiked(gameId: number) {
  const u = await requireUser();
  const cur = await db.prepare("SELECT liked FROM user_games WHERE user_id = ? AND game_id = ?").get(u.id, gameId) as { liked: number } | undefined;
  const liked = cur?.liked ? 0 : 1;
  await upsertUserGame(u.id, gameId, liked ? { liked, played: 1, backlog: 0 } : { liked });
  await refreshGame(gameId);
}

export async function toggleBacklog(gameId: number) {
  const u = await requireUser();
  const cur = await db.prepare("SELECT backlog FROM user_games WHERE user_id = ? AND game_id = ?").get(u.id, gameId) as { backlog: number } | undefined;
  const backlog = cur?.backlog ? 0 : 1;
  await upsertUserGame(u.id, gameId, { backlog });
  if (backlog) await db.prepare("INSERT INTO activity (user_id, type, game_id) VALUES (?, 'backlog', ?)").run(u.id, gameId);
  await refreshGame(gameId);
}

export async function togglePlaying(gameId: number) {
  const u = await requireUser();
  const cur = await db.prepare("SELECT playing FROM user_games WHERE user_id = ? AND game_id = ?").get(u.id, gameId) as { playing: number } | undefined;
  const playing = cur?.playing ? 0 : 1;
  // Starting a game takes it off the Playlist.
  await upsertUserGame(u.id, gameId, playing ? { playing, backlog: 0 } : { playing });
  if (playing) await db.prepare("INSERT INTO activity (user_id, type, game_id) VALUES (?, 'playing', ?)").run(u.id, gameId);
  await refreshGame(gameId);
}

export async function setRating(gameId: number, rating: number | null) {
  const u = await requireUser();
  const r = rating && rating >= 1 && rating <= 10 ? Math.round(rating) : null;
  await upsertUserGame(u.id, gameId, r ? { rating: r, played: 1, backlog: 0 } : { rating: null });
  await refreshGame(gameId);
}

// ---------- logging / reviews ----------

export async function saveLog(_: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser();
  const gameId = Number(f.get("game_id"));
  const logId = Number(f.get("log_id") || 0);
  if (!await gameSlug(gameId)) return { error: "Spiel nicht gefunden." };
  const rating = Number(f.get("rating") || 0) || null;
  const review = str(f, "review") || null;
  const inDiary = f.get("in_diary") === "on";
  const playedOn = inDiary ? str(f, "played_on") || new Date().toISOString().slice(0, 10) : null;
  if (playedOn && !/^\d{4}-\d{2}-\d{2}$/.test(playedOn)) return { error: "Ungültiges Datum." };
  const status = ["played", "completed", "mastered", "abandoned"].includes(str(f, "status")) ? str(f, "status") : "played";
  const hours = Number(f.get("hours") || 0) || null;
  const data = {
    userId: u.id,
    gameId,
    playedOn,
    rating: rating && rating >= 1 && rating <= 10 ? rating : null,
    liked: f.get("liked") === "on" ? 1 : 0,
    review: review?.slice(0, 10000) ?? null,
    spoilers: f.get("spoilers") === "on" ? 1 : 0,
    replay: f.get("replay") === "on" ? 1 : 0,
    status,
    platform: str(f, "platform").slice(0, 40),
    hours: hours && hours > 0 && hours < 100000 ? Math.round(hours) : null,
  };
  if (!data.playedOn && !data.review && !data.rating && !data.liked) return { error: "Gib eine Bewertung, ein Datum oder eine Review an." };

  let id = logId;
  if (logId) {
    const own = await db.prepare("SELECT 1 FROM logs WHERE id = ? AND user_id = ?").get(logId, u.id);
    if (!own) return { error: "Eintrag nicht gefunden." };
    await db.prepare(
      `UPDATE logs SET played_on=@playedOn, rating=@rating, liked=@liked, review=@review, spoilers=@spoilers, replay=@replay,
        status=@status, platform=@platform, hours=@hours WHERE id=@id`,
    ).run({ ...data, id: logId });
  } else {
    id = (
      await db
        .prepare(
          `INSERT INTO logs (user_id, game_id, played_on, rating, liked, review, spoilers, replay, status, platform, hours)
           VALUES (@userId, @gameId, @playedOn, @rating, @liked, @review, @spoilers, @replay, @status, @platform, @hours)`,
        )
        .run(data)
    ).lastInsertRowid;
    await db.prepare("INSERT INTO activity (user_id, type, game_id, log_id) VALUES (?, ?, ?, ?)").run(u.id, data.review ? "review" : "log", gameId, id);
  }
  await upsertUserGame(u.id, gameId, {
    played: 1,
    backlog: 0,
    ...(data.rating ? { rating: data.rating } : {}),
    ...(data.liked ? { liked: 1 } : {}),
  });
  await refreshGame(gameId);
  revalidatePath(`/u/${u.username}`, "layout");
  return { ok: true };
}

export async function deleteLog(logId: number) {
  const u = await requireUser();
  const row = await db.prepare("SELECT game_id FROM logs WHERE id = ? AND user_id = ?").get(logId, u.id) as { game_id: number } | undefined;
  if (!row) return;
  // explicit cleanup: foreign-key cascades are not guaranteed on every libSQL connection
  await db.transaction(async (tx) => {
    for (const t of ["review_likes", "comments", "activity"]) await tx.prepare(`DELETE FROM ${t} WHERE log_id = ?`).run(logId);
    await tx.prepare("DELETE FROM logs WHERE id = ?").run(logId);
  });
  await refreshGame(row.game_id);
  redirect(`/u/${u.username}/diary`);
}

export async function toggleReviewLike(logId: number) {
  const u = await requireUser();
  const del = await db.prepare("DELETE FROM review_likes WHERE user_id = ? AND log_id = ?").run(u.id, logId);
  if (!del.changes) {
    await db.prepare("INSERT INTO review_likes (user_id, log_id) VALUES (?, ?)").run(u.id, logId);
    const owner = await db.prepare("SELECT user_id FROM logs WHERE id = ?").get(logId) as { user_id: number } | undefined;
    if (owner && owner.user_id !== u.id)
      await db.prepare("INSERT INTO activity (user_id, type, log_id, target_user_id) VALUES (?, 'like_review', ?, ?)").run(u.id, logId, owner.user_id);
  }
  revalidatePath("/", "layout");
}

export async function addComment(logId: number, f: FormData) {
  const u = await requireUser();
  const body = str(f, "body").slice(0, 2000);
  if (!body) return;
  await db.prepare("INSERT INTO comments (log_id, user_id, body) VALUES (?, ?, ?)").run(logId, u.id, body);
  revalidatePath("/", "layout");
}

export async function deleteComment(commentId: number) {
  const u = await requireUser();
  await db.prepare(
    "DELETE FROM comments WHERE id = ? AND (user_id = ? OR log_id IN (SELECT id FROM logs WHERE user_id = ?))",
  ).run(commentId, u.id, u.id);
  revalidatePath("/", "layout");
}

// ---------- social ----------

export async function toggleFollow(targetId: number) {
  const u = await requireUser();
  if (targetId === u.id) return;
  const del = await db.prepare("DELETE FROM follows WHERE follower_id = ? AND followee_id = ?").run(u.id, targetId);
  if (!del.changes) {
    await db.prepare("INSERT INTO follows (follower_id, followee_id) VALUES (?, ?)").run(u.id, targetId);
    await db.prepare("INSERT INTO activity (user_id, type, target_user_id) VALUES (?, 'follow', ?)").run(u.id, targetId);
  }
  revalidatePath("/", "layout");
}

export async function updateProfile(_: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser();
  const hue = Math.max(0, Math.min(359, Number(f.get("avatar_hue") ?? u.avatar_hue)));
  await db.prepare("UPDATE users SET display_name = ?, bio = ?, avatar_hue = ? WHERE id = ?").run(
    (str(f, "display_name") || u.username).slice(0, 40),
    str(f, "bio").slice(0, 500),
    hue,
    u.id,
  );
  const favs = [0, 1, 2, 3].map((i) => Number(f.get(`fav_${i}`) || 0));
  await db.transaction(async (tx) => {
    await tx.prepare("DELETE FROM favorites WHERE user_id = ?").run(u.id);
    const seen = new Set<number>();
    let pos = 0;
    for (const g of favs) {
      if (!g || seen.has(g)) continue;
      seen.add(g);
      await tx.prepare("INSERT INTO favorites (user_id, game_id, position) SELECT ?, id, ? FROM games WHERE id = ?").run(u.id, pos++, g);
    }
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------- lists ----------

export async function createList(_: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser();
  const title = str(f, "title").slice(0, 120);
  if (!title) return { error: "Die Liste braucht einen Titel." };
  const r = await db
    .prepare("INSERT INTO lists (user_id, title, description, ranked) VALUES (?, ?, ?, ?)")
    .run(u.id, title, str(f, "description").slice(0, 2000), f.get("ranked") === "on" ? 1 : 0);
  const listId = Number(r.lastInsertRowid);
  const firstGame = Number(f.get("game_id") || 0);
  if (firstGame) await db.prepare("INSERT OR IGNORE INTO list_items (list_id, game_id, position) VALUES (?, ?, 0)").run(listId, firstGame);
  await db.prepare("INSERT INTO activity (user_id, type, list_id) VALUES (?, 'list', ?)").run(u.id, listId);
  redirect(`/list/${listId}`);
}

async function ownList(userId: number, listId: number) {
  return Boolean(await db.prepare("SELECT 1 FROM lists WHERE id = ? AND user_id = ?").get(listId, userId));
}

export async function updateList(listId: number, _: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser();
  if (!await ownList(u.id, listId)) return { error: "Keine Berechtigung." };
  const title = str(f, "title").slice(0, 120);
  if (!title) return { error: "Die Liste braucht einen Titel." };
  await db.prepare("UPDATE lists SET title = ?, description = ?, ranked = ?, updated_at = datetime('now') WHERE id = ?").run(
    title,
    str(f, "description").slice(0, 2000),
    f.get("ranked") === "on" ? 1 : 0,
    listId,
  );
  revalidatePath(`/list/${listId}`);
  return { ok: true };
}

export async function deleteList(listId: number) {
  const u = await requireUser();
  if (!await ownList(u.id, listId)) return;
  await db.transaction(async (tx) => {
    for (const t of ["list_items", "list_likes", "activity"]) await tx.prepare(`DELETE FROM ${t} WHERE list_id = ?`).run(listId);
    await tx.prepare("DELETE FROM lists WHERE id = ?").run(listId);
  });
  redirect(`/u/${u.username}/lists`);
}

export async function toggleListItem(listId: number, gameId: number) {
  const u = await requireUser();
  if (!await ownList(u.id, listId)) return;
  const del = await db.prepare("DELETE FROM list_items WHERE list_id = ? AND game_id = ?").run(listId, gameId);
  if (!del.changes) {
    const { p } = await db.prepare("SELECT COALESCE(MAX(position), -1) + 1 AS p FROM list_items WHERE list_id = ?").get(listId) as { p: number };
    await db.prepare("INSERT INTO list_items (list_id, game_id, position) VALUES (?, ?, ?)").run(listId, gameId, p);
  }
  await db.prepare("UPDATE lists SET updated_at = datetime('now') WHERE id = ?").run(listId);
  revalidatePath(`/list/${listId}`);
  await refreshGame(gameId);
}

export async function moveListItem(listId: number, gameId: number, dir: -1 | 1) {
  const u = await requireUser();
  if (!await ownList(u.id, listId)) return;
  const items = (await db.prepare("SELECT game_id FROM list_items WHERE list_id = ? ORDER BY position").all(listId) as { game_id: number }[]).map((r) => r.game_id);
  const i = items.indexOf(gameId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= items.length) return;
  [items[i], items[j]] = [items[j], items[i]];
  await db.transaction(async (tx) => {
    const upd = tx.prepare("UPDATE list_items SET position = ? WHERE list_id = ? AND game_id = ?");
    for (const [p, g] of items.entries()) await upd.run(p, listId, g);
  });
  revalidatePath(`/list/${listId}`);
}

export async function toggleListLike(listId: number) {
  const u = await requireUser();
  const del = await db.prepare("DELETE FROM list_likes WHERE user_id = ? AND list_id = ?").run(u.id, listId);
  if (!del.changes) await db.prepare("INSERT INTO list_likes (user_id, list_id) VALUES (?, ?)").run(u.id, listId);
  revalidatePath(`/list/${listId}`);
}

// ---------- search helper for client pickers ----------

export async function quickSearch(q: string) {
  const viewer = await getCurrentUser();
  if (!viewer || q.trim().length < 2) return [];
  const { searchIgdb } = await import("@/lib/igdb");
  try {
    await searchIgdb(q);
  } catch (e) {
    console.error(e);
  }
  return await db
    .prepare(
      `SELECT id, slug, title, year, cover_url FROM games g WHERE title LIKE @like
       ORDER BY (title = @q COLLATE NOCASE) DESC, (title LIKE @prefix) DESC,
         (SELECT COUNT(*) FROM user_games ug WHERE ug.game_id = g.id) DESC, (source = 'seed') DESC, LENGTH(title)
       LIMIT 8`,
    )
    .all({ like: `%${q}%`, prefix: `${q}%`, q }) as { id: number; slug: string; title: string; year: number | null; cover_url: string | null }[];
}
