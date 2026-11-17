import './music.css';
import { clear, h } from './dom';
import { createLibrary } from './music-library';
import { createSetup } from './music-setup';
import { GoogleAuth } from '../music/google-auth';
import type { MusicPlayer } from '../music/music-player';
import { YouTubeApi } from '../music/youtube-api';
import type { Panel } from './panel';

const message = (err: unknown): string => (err instanceof Error ? err.message : 'Sign-in did not finish. Try again.');

/** The Music panel: sign in with Google, then pick from your playlists or search. The player itself is on the window. */
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
        h('p', { class: 'hint' }, 'Sign in with Google to reach your playlists and liked videos. ChillScreen only reads them.'),
        h('div', { class: 'music-actions' },
          h('button', { class: 'btn primary', onclick: () => void signIn(true) }, 'Sign in with Google'),
          h('button', { class: 'text-btn', onclick: () => {
            auth.setClientId('');
            show();
          } }, 'Change client ID')),
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
    body: h('div', { class: 'music' }, browse),
    onOpen: () => {
      if (!loaded && auth.clientId && auth.wasSignedIn) void signIn(false);
    },
  };
}
