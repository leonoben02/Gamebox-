import "server-only";

// "Mit Google anmelden" via plain OAuth 2.0 / OpenID Connect (no extra library).
// Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET; the button is hidden while they are missing.

export const GOOGLE_STATE_COOKIE = "gb_google_state";

export function googleEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function redirectUri(origin: string) {
  return `${origin}/auth/google/callback`;
}

export function authUrl(origin: string, state: string) {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

export type GoogleProfile = { sub: string; email?: string; email_verified?: boolean; name?: string; given_name?: string };

export async function exchangeCode(origin: string, code: string): Promise<GoogleProfile> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) throw new Error(`token ${tokenRes.status}: ${(await tokenRes.text()).slice(0, 200)}`);
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${access_token}` } });
  if (!infoRes.ok) throw new Error(`userinfo ${infoRes.status}`);
  const p = (await infoRes.json()) as GoogleProfile;
  if (!p.sub) throw new Error("no sub");
  return p;
}
