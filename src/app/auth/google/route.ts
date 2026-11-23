import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { GOOGLE_STATE_COOKIE, authUrl, googleEnabled } from "@/lib/google";

export async function GET(req: NextRequest) {
  if (!googleEnabled()) redirect("/login?error=google-off");
  const state = crypto.randomBytes(16).toString("hex");
  const next = req.nextUrl.searchParams.get("next") ?? "/";
  (await cookies()).set(GOOGLE_STATE_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  redirect(authUrl(req.nextUrl.origin, state));
}
