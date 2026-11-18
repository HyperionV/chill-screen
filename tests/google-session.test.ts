import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleGoogleSession } from '../functions/_lib/google-session';

const ENV = { GOOGLE_CLIENT_SECRET: 'the-secret' };
const CLIENT_ID = 'abc.apps.googleusercontent.com';

interface GoogleCall {
  url: string;
  form: URLSearchParams;
}

/** Stands in for Google's servers only: the app's own handler runs for real. */
function fakeGoogle(status: number, reply: Record<string, unknown>): GoogleCall[] {
  const calls: GoogleCall[] = [];
  vi.stubGlobal('fetch', async (url: string, init: { body: URLSearchParams }) => {
    calls.push({ url, form: new URLSearchParams(init.body) });
    return new Response(JSON.stringify(reply), { status });
  });
  return calls;
}

const post = (action: string, body: unknown, cookie = '', guard = '1'): Promise<Response> =>
  handleGoogleSession(
    new Request(`https://chillscreen.pages.dev/api/google/${action}`, {
      method: 'POST',
      headers: { 'x-chillscreen': guard, ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    }),
    ENV,
    action,
  );

afterEach(() => vi.unstubAllGlobals());

describe('Google sign-in session', () => {
  it('trades the sign-in code for a pass and keeps the renewal key in a cookie the page cannot read', async () => {
    const calls = fakeGoogle(200, { access_token: 'pass-1', expires_in: 3599, refresh_token: 'key-1' });
    const res = await post('session', { code: 'one-time', clientId: CLIENT_ID });

    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ accessToken: 'pass-1', expiresIn: 3599 });
    expect(text).not.toContain('key-1');
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('cs_refresh=key-1');
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Secure/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(calls[0]?.form.get('client_secret')).toBe('the-secret');
    expect(calls[0]?.form.get('redirect_uri')).toBe('postmessage');
  });

  it('renews the pass from the cookie, and signs out only when Google says the key is dead', async () => {
    const renewed = fakeGoogle(200, { access_token: 'pass-2', expires_in: 3599 });
    const ok = await post('token', { clientId: CLIENT_ID }, 'cs_refresh=key-1');
    expect(await ok.json()).toEqual({ accessToken: 'pass-2', expiresIn: 3599 });
    expect(renewed[0]?.form.get('refresh_token')).toBe('key-1');

    fakeGoogle(503, { error: 'backend_error' });
    const outage = await post('token', { clientId: CLIENT_ID }, 'cs_refresh=key-1');
    expect(outage.status).toBe(502);
    expect(outage.headers.get('set-cookie')).toBeNull();

    fakeGoogle(400, { error: 'invalid_grant' });
    const revoked = await post('token', { clientId: CLIENT_ID }, 'cs_refresh=key-1');
    expect(revoked.status).toBe(401);
    expect(revoked.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  it('refuses calls without the guard header, and reports plainly when the secret is missing', async () => {
    fakeGoogle(200, {});
    expect((await post('token', { clientId: CLIENT_ID }, 'cs_refresh=key-1', '')).status).toBe(403);

    const bare = await handleGoogleSession(new Request('https://chillscreen.pages.dev/api/google/status'), {}, 'status');
    expect(await bare.json()).toEqual({ configured: false });
    const noSecret = await handleGoogleSession(
      new Request('https://chillscreen.pages.dev/api/google/token', { method: 'POST', headers: { 'x-chillscreen': '1' }, body: '{}' }),
      {},
      'token',
    );
    expect(noSecret.status).toBe(501);
  });

  it('tells Google to drop the key and clears the cookie on sign-out', async () => {
    const calls = fakeGoogle(200, {});
    const res = await post('signout', {}, 'cs_refresh=key-1');
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(calls[0]?.url).toContain('/revoke');
    expect(calls[0]?.form.get('token')).toBe('key-1');
  });
});
