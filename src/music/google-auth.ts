import { loadScript } from './script-loader';
import { readJson, writeJson } from '../store';

const CLIENT_ID_KEY = 'chillscreen.googleClientId';
const SIGNED_IN_KEY = 'chillscreen.googleSignedIn';
/** Read-only access to your YouTube account: playlists, liked videos and search. Nothing can be changed. */
const SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';
/** Ask for a fresh pass a minute before the old one runs out. */
const EXPIRY_MARGIN_MS = 60_000;

const isString = (v: unknown): v is string => typeof v === 'string';
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';

export class GoogleAuthError extends Error {}

/** Signs in with Google in the browser alone and hands out short-lived read-only passes. */
export class GoogleAuth {
  private token: { value: string; expiresAt: number } | null = null;
  private client: google.accounts.oauth2.TokenClient | null = null;
  private pending: { promise: Promise<string>; interactive: boolean; resolve: (t: string) => void; reject: (e: Error) => void } | null = null;

  get clientId(): string {
    return readJson(CLIENT_ID_KEY, '', isString);
  }

  setClientId(id: string): void {
    this.fail('The client ID was changed before sign-in finished.');
    writeJson(CLIENT_ID_KEY, id.trim());
    this.client = null;
    this.token = null;
  }

  /** True once the user has signed in on this machine; a pass may still need refreshing. */
  get wasSignedIn(): boolean {
    return readJson(SIGNED_IN_KEY, false, isBool);
  }

  /** A valid pass, asking Google for one if needed. `interactive` shows the consent window. */
  async getToken(interactive = false): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt - EXPIRY_MARGIN_MS) return this.token.value;
    // One request at a time: a second caller waits for the one already open. Only a person's click takes over from a
    // quiet background attempt, which may never get an answer if the browser blocks its window.
    if (this.pending && (!interactive || this.pending.interactive)) return this.pending.promise;
    this.fail('Replaced by a sign-in you started.');
    let settled!: { resolve: (t: string) => void; reject: (e: Error) => void };
    const promise = new Promise<string>((resolve, reject) => (settled = { resolve, reject }));
    this.pending = { promise, interactive, ...settled };
    try {
      const client = await this.tokenClient();
      client.requestAccessToken({ prompt: interactive ? 'consent' : '' });
    } catch (err) {
      this.fail(err instanceof Error ? err.message : 'Google sign-in could not start.');
    }
    return promise;
  }

  /** Forgets the pass so the next call asks Google again (after YouTube rejects one). */
  expire(): void {
    this.token = null;
  }

  signOut(): void {
    if (this.token) google.accounts.oauth2.revoke(this.token.value);
    this.token = null;
    writeJson(SIGNED_IN_KEY, false);
  }

  private async tokenClient(): Promise<google.accounts.oauth2.TokenClient> {
    if (this.client) return this.client;
    const clientId = this.clientId;
    if (!clientId) throw new GoogleAuthError('Add your Google client ID first.');
    await loadScript('https://accounts.google.com/gsi/client');
    this.client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (r) => this.settle(r),
      error_callback: (e) => this.fail(e.type === 'popup_closed' ? 'The Google window was closed before signing in.' : `Google sign-in failed (${e.type}).`),
    });
    return this.client;
  }

  private settle(r: google.accounts.oauth2.TokenResponse): void {
    if (r.error || !r.access_token) {
      this.fail(r.error_description ?? r.error ?? 'Google did not return a sign-in pass.');
      return;
    }
    this.token = { value: r.access_token, expiresAt: Date.now() + (r.expires_in ?? 3600) * 1000 };
    writeJson(SIGNED_IN_KEY, true);
    this.pending?.resolve(r.access_token);
    this.pending = null;
  }

  private fail(message: string): void {
    this.pending?.reject(new GoogleAuthError(message));
    this.pending = null;
  }
}
