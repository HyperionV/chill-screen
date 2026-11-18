/** The app's own sign-in helper (`functions/api/google`): it keeps Google's long-lived renewal key out of the page. */

export interface Pass {
  value: string;
  expiresAt: number;
}

export class SessionError extends Error {}

const BASE = '/api/google';
/** Must match the guard in `functions/_lib/google-session.ts`. */
const GUARD = { 'x-chillscreen': '1' };

interface PassReply {
  accessToken: string;
  expiresIn: number;
}

const isPassReply = (v: unknown): v is PassReply =>
  typeof v === 'object' && v !== null && 'accessToken' in v && typeof v.accessToken === 'string' && 'expiresIn' in v && typeof v.expiresIn === 'number';

const toPass = (r: PassReply): Pass => ({ value: r.accessToken, expiresAt: Date.now() + r.expiresIn * 1000 });

let configured: Promise<boolean> | null = null;

/** True when the site has its Google secret, so sign-in can last. Any failure (a dev server, no network) counts as no. */
export function sessionConfigured(): Promise<boolean> {
  configured ??= fetch(`${BASE}/status`)
    .then((res) => res.json())
    .then((body: unknown) => typeof body === 'object' && body !== null && 'configured' in body && body.configured === true)
    .catch(() => false);
  return configured;
}

async function post(action: string, body: Record<string, string>): Promise<Response> {
  try {
    return await fetch(`${BASE}/${action}`, { method: 'POST', headers: { ...GUARD, 'content-type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
  } catch {
    throw new SessionError('Could not reach the sign-in service. Check the internet connection.');
  }
}

/** Trades the one-time code from the Google window for a pass; the renewal key goes into a cookie. */
export async function startSession(code: string, clientId: string): Promise<Pass> {
  const res = await post('session', { code, clientId });
  const body: unknown = await res.json().catch(() => null);
  if (res.status === 409) throw new SessionError('One more step to make the sign-in last: choose Sign in again and approve the access.');
  if (!res.ok || !isPassReply(body)) throw new SessionError('Google did not accept the sign-in. Try again.');
  return toPass(body);
}

/** A fresh pass from the cookie's renewal key, or null when there is no key (never signed in, signed out, or revoked). */
export async function renewPass(clientId: string): Promise<Pass | null> {
  const res = await post('token', { clientId });
  if (res.status === 401) return null;
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok || !isPassReply(body)) throw new SessionError('Google could not renew the sign-in just now.');
  return toPass(body);
}

/** Drops the renewal key. Failing to reach the service is fine: the cookie then simply stays until the next try. */
export async function endSession(): Promise<void> {
  await post('signout', {}).catch(() => undefined);
}
