import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { startSession } from "@/lib/auth";
import { GOOGLE_STATE_COOKIE, exchangeCode, googleEnabled, type GoogleProfile } from "@/lib/google";

async function freeUsername(p: GoogleProfile) {
  const base =
    (p.email?.split("@")[0] ?? p.given_name ?? "spieler")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 16) || "spieler";
  const padded = base.length < 3 ? `${base}_gb` : base;
  for (let i = 0; i < 50; i++) {
    const name = i === 0 ? padded : `${padded}${Math.floor(Math.random() * 9000) + 100}`;
    if (!(await db.prepare("SELECT 1 FROM users WHERE username = ?").get(name))) return name;
  }
  return `spieler${crypto.randomBytes(3).toString("hex")}`;
}

export async function GET(req: NextRequest) {
  if (!googleEnabled()) redirect("/login?error=google-off");
  const jar = await cookies();
  const saved = jar.get(GOOGLE_STATE_COOKIE)?.value;
  jar.delete(GOOGLE_STATE_COOKIE);
  let expected: { state: string; next: string } | null = null;
  try {
    expected = saved ? JSON.parse(saved) : null;
  } catch {}
  const code = req.nextUrl.searchParams.get("code");
  if (!code || !expected || expected.state !== req.nextUrl.searchParams.get("state")) redirect("/login?error=google");

  let profile: GoogleProfile;
  try {
    profile = await exchangeCode(req.nextUrl.origin, code);
  } catch (e) {
    console.error("Google login failed", e);
    redirect("/login?error=google");
  }

  const email = profile.email_verified ? profile.email?.toLowerCase() : undefined;
  let row = (await db.prepare("SELECT id FROM users WHERE google_sub = ?").get(profile.sub)) as { id: number } | undefined;
  if (!row) {
    const r = await db
      .prepare("INSERT INTO users (username, display_name, password_hash, avatar_hue, google_sub, email) VALUES (?, ?, '!google', ?, ?, ?)")
      .run(await freeUsername(profile), (profile.name || profile.given_name || "Spieler").slice(0, 40), Math.floor(Math.random() * 360), profile.sub, email ?? null);
    row = { id: Number(r.lastInsertRowid) };
  }
  await startSession(row.id);
  const next = expected.next;
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}
