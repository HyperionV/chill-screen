import './music.css';
import { clear, h, icon } from './dom';
import { ICONS } from './icons';
import { createLibrary } from './music-library';
import { createSetup } from './music-setup';
import { createPopover } from './popover';
import { GoogleAuth } from '../music/google-auth';
import type { MusicPlayer } from '../music/music-player';
import { playlistIdFrom } from '../music/playlist-link';
import { readJson, writeJson } from '../store';
import { YouTubeApi } from '../music/youtube-api';
import type { Panel } from './panel';

const LINK_KEY = 'chillscreen.playlistLink';
const isString = (v: unknown): v is string => typeof v === 'string';

const message = (err: unknown): string => (err instanceof Error ? err.message : 'Sign-in did not finish. Try again.');

/**
 * A link button for the Music panel's header. It opens a small card to paste a YouTube or YouTube Music playlist link,
 * which plays with no sign-in, in order or shuffled. `status` is shown in the panel if the playlist cannot be played.
 */
function createLinkPlayer(player: MusicPlayer): { button: HTMLElement; status: HTMLElement } {
  const input = h('input', { class: 'field', type: 'text', placeholder: 'Paste a playlist link', 'aria-label': 'Playlist link', spellcheck: 'false', autocomplete: 'off' });
  input.value = readJson(LINK_KEY, '', isString);
  const invalid = h('p', { class: 'quiet-status', role: 'status' });
  const status = h('p', { class: 'quiet-status', role: 'status' });
  const play = (shuffle: boolean): void => {
    const id = playlistIdFrom(input.value);
    if (!id) {
      invalid.textContent = 'That does not look like a playlist link. It should contain “list=”.';
      return;
    }
    invalid.textContent = '';
    status.textContent = '';
    writeJson(LINK_KEY, input.value.trim());
    popover.close();
    void player.playPlaylist(id, shuffle);
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') play(false);
  });
  player.onChange(() => {
    if (player.problem) status.textContent = player.problem;
  });
  const popover = createPopover(
    h('div', { class: 'config' },
      input,
      h('div', { class: 'music-actions' },
        h('button', { class: 'btn primary', onclick: () => play(false) }, icon(ICONS.play), 'Play'),
        h('button', { class: 'btn', onclick: () => play(true) }, 'Shuffle')),
      invalid),
    'Play a playlist link', true);
  const button = h('button', {
    class: 'icon-btn', title: 'Play a playlist link', 'aria-label': 'Play a playlist link',
    onclick: () => {
      popover.toggle(button);
      input.focus();
    },
  }, icon(ICONS.link));
  return { button, status };
}

/** The Music panel: paste a playlist link, or sign in with Google to pick from your own playlists. The player itself is on the window. */
export function createMusicPanel(player: MusicPlayer): Panel {
  const link = createLinkPlayer(player);
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
      status.textContent = interactive ? message(err) : 'Press Sign in to reconnect.';
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
        h('p', { class: 'hint' }, 'Sign in with Google to reach your own playlists and liked videos. ChillScreen only reads them.'),
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
    action: link.button,
    body: h('div', { class: 'music' }, link.status, browse),
    onOpen: () => {
      player.warm();
      if (!loaded && auth.clientId && auth.wasSignedIn) void signIn(false);
    },
  };
}
