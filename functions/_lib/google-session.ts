/**
 * Keeps a person signed in to Google for months. The browser-only sign-in hands out a pass that lasts one hour and
 * cannot renew itself quietly, so the long-lived renewal key lives here, in a cookie the page's scripts cannot read.
 */

export interface Env {
  /** Set in the Cloudflare Pages project. Without it the app falls back to the one-hour browser sign-in. */
  GOOGLE_CLIENT_SECRET?: string;
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const COOKIE_NAME = 'cs_refresh';
const COOKIE_PATH = '/api/google';
/** One year; Google ends the key earlier when the person revokes access or their app is still in testing. */
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
/** Every call must carry this header: a cross-site page cannot add it without Google-style preflight approval. */
const GUARD_HEADER = 'x-chillscreen';
/** The code a Google sign-in window hands back was issued for this address, not a real web address. */
const POPUP_REDIRECT = 'postmessage';

interface GoogleTokenReply {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });

const refreshCookie = (value: string, maxAge: number): string =>
  `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=${COOKIE_PATH}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;

function readRefreshKey(request: Request): string {
  const match = (request.headers.get('cookie') ?? '').split(/;\s*/).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.slice(COOKIE_NAME.length + 1)) : '';
}

async function askGoogle(url: string, form: Record<string, string>): Promise<{ ok: boolean; reply: GoogleTokenReply }> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form) });
  const reply: GoogleTokenReply = await res.json().catch(() => ({}));
  return { ok: res.ok, reply };
}

function passResponse(reply: GoogleTokenReply, extra: Record<string, string> = {}): Response {
  if (!reply.access_token) return json({ error: 'no_pass' }, 502);
  return json({ accessToken: reply.access_token, expiresIn: reply.expires_in ?? 3600 }, 200, extra);
}

/** Trades the one-time code from the Google sign-in window for a pass, and keeps the renewal key in a cookie. */
async function startSession(request: Request, secret: string): Promise<Response> {
  const body: { code?: unknown; clientId?: unknown } = await request.json().catch(() => ({}));
  if (typeof body.code !== 'string' || typeof body.clientId !== 'string' || !body.code || !body.clientId) return json({ error: 'bad_request' }, 400);
  const { ok, reply } = await askGoogle(TOKEN_URL, {
    code: body.code,
    client_id: body.clientId,
    client_secret: secret,
    redirect_uri: POPUP_REDIRECT,
    grant_type: 'authorization_code',
  });
  if (!ok) return json({ error: reply.error ?? 'google_refused' }, 401);
  const cookie: Record<string, string> = reply.refresh_token ? { 'set-cookie': refreshCookie(reply.refresh_token, COOKIE_MAX_AGE_SECONDS) } : {};
  return passResponse(reply, cookie);
}

/** Hands out a fresh one-hour pass, using the cookie's renewal key. A key Google no longer accepts is cleared. */
async function renewPass(request: Request, secret: string): Promise<Response> {
  const body: { clientId?: unknown } = await request.json().catch(() => ({}));
  const key = readRefreshKey(request);
  if (typeof body.clientId !== 'string' || !body.clientId) return json({ error: 'bad_request' }, 400);
  if (!key) return json({ error: 'signed_out' }, 401);
  const { ok, reply } = await askGoogle(TOKEN_URL, { client_id: body.clientId, client_secret: secret, refresh_token: key, grant_type: 'refresh_token' });
  if (ok) return passResponse(reply);
  // Only a key Google calls dead is forgotten; a passing Google outage must not sign everyone out.
  if (reply.error === 'invalid_grant') return json({ error: 'signed_out' }, 401, { 'set-cookie': refreshCookie('', 0) });
  return json({ error: 'google_unavailable' }, 502);
}

/** Tells Google to drop the renewal key and clears the cookie. */
async function endSession(request: Request): Promise<Response> {
  const key = readRefreshKey(request);
  if (key) await askGoogle(REVOKE_URL, { token: key });
  return json({ ok: true }, 200, { 'set-cookie': refreshCookie('', 0) });
}

export async function handleGoogleSession(request: Request, env: Env, action: string): Promise<Response> {
  const secret = env.GOOGLE_CLIENT_SECRET?.trim() ?? '';
  if (action === 'status') return json({ configured: secret !== '' });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
  if (request.headers.get(GUARD_HEADER) !== '1') return json({ error: 'forbidden' }, 403);
  if (action === 'signout') return endSession(request);
  if (!secret) return json({ error: 'not_configured' }, 501);
  if (action === 'session') return startSession(request, secret);
  if (action === 'token') return renewPass(request, secret);
  return json({ error: 'not_found' }, 404);
}
