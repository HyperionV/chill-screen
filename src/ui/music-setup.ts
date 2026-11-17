import { h } from './dom';
import type { GoogleAuth } from '../music/google-auth';

const CONSOLE_URL = 'https://console.cloud.google.com/apis/credentials';

const link = (href: string, text: string): HTMLElement => h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, text);

/** Walks through making a Google client ID (a one-off, free) and keeps the one pasted in. */
export function createSetup(auth: GoogleAuth, onSaved: () => void): HTMLElement {
  const origin = location.origin;
  const input = h('input', { class: 'field', type: 'text', placeholder: '1234567890-abc.apps.googleusercontent.com', 'aria-label': 'Google client ID', spellcheck: 'false', autocomplete: 'off' });
  input.value = auth.clientId;
  const save = (): void => {
    if (!input.value.trim()) return;
    auth.setClientId(input.value);
    onSaved();
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') save();
  });
  const copy = h('button', { class: 'text-btn', onclick: () => void navigator.clipboard.writeText(origin).then(() => (copy.textContent = 'Copied')) }, 'Copy');

  return h('div', { class: 'music-setup' },
    h('p', { class: 'hint' }, 'To play your own playlists, ChillScreen needs permission from your Google account. It can only read: nothing on YouTube is ever changed. Set it up once:'),
    h('ol', { class: 'steps' },
      h('li', {}, link(CONSOLE_URL, 'Open Google Cloud'), ' and create a project (any name).'),
      h('li', {}, 'Search for “YouTube Data API v3” and press Enable.'),
      h('li', {}, 'Set up the consent screen as External. Then open Audience, and under Test users add your own Google address. Without that, Google blocks the sign-in.'),
      h('li', {}, 'Create credentials: OAuth client ID, type Web application. Under Authorized JavaScript origins add ', h('code', {}, origin), ' ', copy, '.'),
      h('li', {}, 'Paste the client ID it gives you here.'),
    ),
    input,
    h('div', { class: 'music-actions' }, h('button', { class: 'btn primary', onclick: save }, 'Save client ID')),
  );
}
