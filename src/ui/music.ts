import './music.css';
import { clear, h, icon } from './dom';
import { ICONS } from './icons';
import { createLibrary } from './music-library';
import { createSetup } from './music-setup';
import { GoogleAuth } from '../music/google-auth';
import type { MusicPlayer } from '../music/music-player';
import { playlistIdFrom } from '../music/playlist-link';
import { readJson, writeJson } from '../store';
import { YouTubeApi } from '../music/youtube-api';
import type { Panel } from './panel';

const LINK_KEY = 'chillscreen.playlistLink';
const isString = (v: unknown): v is string => typeof v === 'string';

const message = (err: unknown): string => (err instanceof Error ? err.message : 'Sign-in did not finish. Try again.');

/** A box to paste a YouTube or YouTube Music playlist link into: plays it with no sign-in, in order or shuffled. */
function createLinkPlayer(player: MusicPlayer): HTMLElement {
  const input = h('input', { class: 'field', type: 'text', placeholder: 'Paste a playlist link', 'aria-label': 'Playlist link', spellcheck: 'false', autocomplete: 'off' });
  input.value = readJson(LINK_KEY, '', isString);
  const status = h('p', { class: 'quiet-status', role: 'status' });
  const play = (shuffle: boolean): void => {
    const id = playlistIdFrom(input.value);
    if (!id) {
      status.textContent = 'That does not look like a playlist link. It should contain “list=”.';
      return;
    }
    status.textContent = '';
    writeJson(LINK_KEY, input.value.trim());
    void player.playPlaylist(id, shuffle);
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') play(false);
  });
  player.onChange(() => {
    if (player.problem) status.textContent = player.problem;
  });
  return h('div', { class: 'music-link' },
    input,
    h('div', { class: 'music-actions' },
      h('button', { class: 'btn primary', onclick: () => play(false) }, icon(ICONS.play), 'Play'),
      h('button', { class: 'btn', onclick: () => play(true) }, 'Shuffle')),
    status);
}

/** The Music panel: paste a playlist link, or sign in with Google to pick from your own playlists. The player itself is on the window. */
export function createMusicPanel(player: MusicPlayer): Panel {
  const auth = new GoogleAuth();
  const library = createLibrary(new YouTubeApi(auth), player, () => {
    auth.signOut();
    library.reset();
    loaded = false;
    show();
  });
  const browse = h('div', { class: 'music-browse' });
  const status = h('p', { class: 'quiet-status', role: 'status' });
  let loaded = false;

  const signIn = async (interactive: boolean): Promise<void> => {
    status.textContent = interactive ? 'Waiting for Google' : '';
    try {
      await auth.getToken(interactive);
      status.textContent = '';
      loaded = true;
      show();
      await library.load();
    } catch (err) {
      status.textContent = interactive ? message(err) : '';
      show();
    }
  };

  /** Shows what the person can do next: set up Google, sign in, or browse. */
  function show(): void {
    clear(browse);
    if (!auth.clientId) {
      browse.append(createSetup(auth, show));
      return;
    }
    if (!auth.wasSignedIn || !loaded) {
      browse.append(
        h('p', { class: 'hint' }, 'Or sign in with Google to reach your own playlists and liked videos. ChillScreen only reads them.'),
        h('div', { class: 'music-actions' },
          h('button', { class: 'btn primary', onclick: () => void signIn(true) }, 'Sign in with Google'),
          ...(auth.isBuiltIn ? [] : [h('button', { class: 'text-btn', onclick: () => {
            auth.setClientId('');
            show();
          } }, 'Change client ID')])),
        status,
      );
      return;
    }
    browse.append(library.el);
  }

  show();
  return {
    id: 'music',
    title: 'Music',
    body: h('div', { class: 'music' }, createLinkPlayer(player), browse),
    onOpen: () => {
      if (!loaded && auth.clientId && auth.wasSignedIn) void signIn(false);
    },
  };
}
