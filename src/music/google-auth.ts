import { loadScript } from './script-loader';
import { readJson, writeJson } from '../store';
import { endSession, type Pass, renewPass, sessionConfigured, SessionError, startSession } from './google-session-api';

const CLIENT_ID_KEY = 'chillscreen.googleClientId';
/** Set at build time with VITE_GOOGLE_CLIENT_ID (see .env.example). */
const BUILT_IN_CLIENT_ID = String(import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim();
const SIGNED_IN_KEY = 'chillscreen.googleSignedIn';
/** The current pass is kept here so a reload within its hour does not ask for sign-in again. */
const TOKEN_KEY = 'chillscreen.googleToken';
/** Read-only access to your YouTube account: playlists, liked videos and search. Nothing can be changed. */
const SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';
/** Ask for a fresh pass a minute before the old one runs out. */
const EXPIRY_MARGIN_MS = 60_000;

const isString = (v: unknown): v is string => typeof v === 'string';
const isPass = (v: unknown): v is Pass | null =>
  v === null || (typeof v === 'object' && 'value' in v && typeof v.value === 'string' && 'expiresAt' in v && typeof v.expiresAt === 'number');
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';

export class GoogleAuthError extends Error {}

const errorText = (err: unknown, fallback: string): string => (err instanceof Error ? err.message : fallback);

/**
 * Signs in with Google and hands out short-lived read-only passes. When the site has its Google secret, the sign-in
 * lasts: a renewal key sits in a cookie and a new pass is fetched quietly each hour. Without it, the browser-only
 * sign-in is used and the person signs in again after an hour.
 */
export class GoogleAuth {
  private token: Pass | null = readJson<Pass | null>(TOKEN_KEY, null, isPass);
  private implicitClient: google.accounts.oauth2.TokenClient | null = null;
  private codeClient: google.accounts.oauth2.CodeClient | null = null;
  private renewal: Promise<Pass | null> | null = null;
  private pending: { promise: Promise<string>; interactive: boolean; resolve: (t: string) => void; reject: (e: Error) => void } | null = null;

  /** The ID baked into this build (the owner's, public by design), else one pasted in on this machine. */
  get clientId(): string {
    return BUILT_IN_CLIENT_ID || readJson(CLIENT_ID_KEY, '', isString);
  }

  /** True when this build already carries a client ID, so nobody has to set one up. */
  get isBuiltIn(): boolean {
    return BUILT_IN_CLIENT_ID !== '';
  }

  setClientId(id: string): void {
    this.fail('The client ID was changed before sign-in finished.');
    writeJson(CLIENT_ID_KEY, id.trim());
    this.implicitClient = null;
    this.codeClient = null;
    this.token = null;
  }

  /** True once the user has signed in on this machine; a pass may still need refreshing. */
  get wasSignedIn(): boolean {
    return readJson(SIGNED_IN_KEY, false, isBool);
  }

  /** A valid pass, renewing it quietly when the site allows, else asking Google. `interactive` shows the consent window. */
  async getToken(interactive = false): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt - EXPIRY_MARGIN_MS) return this.token.value;
    const lasting = await sessionConfigured();
    if (lasting && this.wasSignedIn) {
      const pass = await this.renewQuietly();
      if (pass) {
        this.keep(pass);
        return pass.value;
      }
    }
    if (lasting && !interactive) throw new GoogleAuthError('Google needs you to sign in again.');
    // One request at a time: a second caller waits for the one already open. Only a person's click takes over from a
    // quiet background attempt, which may never get an answer if the browser blocks its window.
    if (this.pending && (!interactive || this.pending.interactive)) return this.pending.promise;
    this.fail('Replaced by a sign-in you started.');
    let settled!: { resolve: (t: string) => void; reject: (e: Error) => void };
    const promise = new Promise<string>((resolve, reject) => (settled = { resolve, reject }));
    this.pending = { promise, interactive, ...settled };
    try {
      if (lasting) (await this.getCodeClient()).requestCode();
      else (await this.getTokenClient()).requestAccessToken({ prompt: interactive ? 'consent' : '' });
    } catch (err) {
      this.fail(errorText(err, 'Google sign-in could not start.'));
    }
    return promise;
  }

  /** Forgets the pass so the next call asks again (after YouTube rejects one). The renewal key stays. */
  expire(): void {
    this.token = null;
    writeJson(TOKEN_KEY, null);
  }

  signOut(): void {
    if (this.token && typeof google !== 'undefined') google.accounts.oauth2.revoke(this.token.value);
    this.expire();
    writeJson(SIGNED_IN_KEY, false);
    void endSession();
  }

  /** One renewal at a time, so several requests waking together do not each ask. */
  private renewQuietly(): Promise<Pass | null> {
    this.renewal ??= renewPass(this.clientId)
      .catch((err: unknown) => {
        throw new GoogleAuthError(errorText(err, 'Google could not renew the sign-in just now.'));
      })
      .finally(() => {
        this.renewal = null;
      });
    return this.renewal;
  }

  private keep(pass: Pass): void {
    this.token = pass;
    writeJson(TOKEN_KEY, pass);
    writeJson(SIGNED_IN_KEY, true);
  }

  private async requireClientId(): Promise<string> {
    const clientId = this.clientId;
    if (!clientId) throw new GoogleAuthError('Add your Google client ID first.');
    await loadScript('https://accounts.google.com/gsi/client');
    return clientId;
  }

  private async getTokenClient(): Promise<google.accounts.oauth2.TokenClient> {
    if (this.implicitClient) return this.implicitClient;
    // Wait for the Google script before touching `google`: a call's target is looked up before its arguments run.
    const clientId = await this.requireClientId();
    this.implicitClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (r) => this.settle(r),
      error_callback: (e) => this.failPopup(e),
    });
    return this.implicitClient;
  }

  private async getCodeClient(): Promise<google.accounts.oauth2.CodeClient> {
    if (this.codeClient) return this.codeClient;
    // Wait for the Google script before touching `google`: a call's target is looked up before its arguments run.
    const clientId = await this.requireClientId();
    this.codeClient = google.accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope: SCOPE,
      ux_mode: 'popup',
      callback: (r) => void this.settleCode(r),
      error_callback: (e) => this.failPopup(e),
    });
    return this.codeClient;
  }

  private failPopup(e: { type: string }): void {
    this.fail(e.type === 'popup_closed' ? 'The Google window was closed before signing in.' : `Google sign-in failed (${e.type}).`);
  }

  private settle(r: google.accounts.oauth2.TokenResponse): void {
    if (r.error || !r.access_token) {
      this.fail(r.error_description ?? r.error ?? 'Google did not return a sign-in pass.');
      return;
    }
    this.finish({ value: r.access_token, expiresAt: Date.now() + (r.expires_in ?? 3600) * 1000 });
  }

  private async settleCode(r: google.accounts.oauth2.CodeResponse): Promise<void> {
    if (r.error || !r.code) {
      this.fail(r.error_description ?? r.error ?? 'Google did not return a sign-in code.');
      return;
    }
    try {
      this.finish(await startSession(r.code, this.clientId));
    } catch (err) {
      this.fail(err instanceof SessionError ? err.message : 'Google sign-in could not finish.');
    }
  }

  private finish(pass: Pass): void {
    this.keep(pass);
    this.pending?.resolve(pass.value);
    this.pending = null;
  }

  private fail(message: string): void {
    this.pending?.reject(new GoogleAuthError(message));
    this.pending = null;
  }
}
