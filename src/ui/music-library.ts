import { clear, h, icon } from './dom';
import { ICONS } from './icons';
import type { MusicPlayer } from '../music/music-player';
import type { PlaylistSummary, Track, YouTubeApi } from '../music/youtube-api';

export interface Library {
  el: HTMLElement;
  /** Fetches the account's playlists and shows them. */
  load(): Promise<void>;
  /** Forgets everything shown, so another account never sees the last one's lists. */
  reset(): void;
}

const message = (err: unknown): string => (err instanceof Error ? err.message : 'Something went wrong. Try again.');

function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const picture = (url: string): HTMLElement => (url ? h('img', { class: 'row-thumb', src: url, alt: '', loading: 'lazy', draggable: 'false' }) : h('span', { class: 'row-thumb blank' }));

/** Search, the account's playlists, and the tracks inside one: pick anything to play it. */
export function createLibrary(api: YouTubeApi, player: MusicPlayer, onSignOut: () => void): Library {
  const status = h('p', { class: 'quiet-status', role: 'status' });
  const content = h('div', { class: 'music-list' });
  const search = h('input', { class: 'field', type: 'search', placeholder: 'Search YouTube', 'aria-label': 'Search YouTube', maxlength: 100 });
  let playlists: PlaylistSummary[] = [];

  const run = async <T>(label: string, work: () => Promise<T>): Promise<T | null> => {
    status.textContent = label;
    try {
      const result = await work();
      status.textContent = '';
      return result;
    } catch (err) {
      status.textContent = message(err);
      return null;
    }
  };

  const trackRow = (track: Track, queue: Track[], index: number): HTMLElement =>
    h('button', { class: 'row track', 'data-id': track.videoId, onclick: () => void player.playQueue(queue, index) },
      picture(track.thumb),
      h('span', { class: 'row-text' }, h('span', { class: 'row-title' }, track.title), h('span', { class: 'row-sub' }, track.channel)));

  const showTracks = (heading: string, tracks: Track[]): void => {
    clear(content);
    content.append(
      h('div', { class: 'list-head' },
        h('button', { class: 'icon-btn', 'aria-label': 'Back', title: 'Back', onclick: showPlaylists }, icon(ICONS.back)),
        h('h3', { class: 'list-title' }, heading),
      ),
      h('div', { class: 'music-actions' },
        h('button', { class: 'btn primary', onclick: () => void player.playQueue(tracks) }, icon(ICONS.play), 'Play'),
        h('button', { class: 'btn', onclick: () => void player.playQueue(shuffled(tracks)) }, 'Shuffle'),
      ),
      ...(tracks.length ? tracks.map((t, i) => trackRow(t, tracks, i)) : [h('p', { class: 'quiet-status' }, 'No playable videos here.')]),
    );
    markPlaying();
  };

  const openPlaylist = async (list: PlaylistSummary): Promise<void> => {
    const tracks = await run(`Opening ${list.title}`, () => api.playlistTracks(list.id));
    if (tracks) showTracks(list.title, tracks);
  };

  function showPlaylists(): void {
    clear(content);
    if (!playlists.length) {
      content.append(h('p', { class: 'quiet-status' }, 'No playlists on this account yet. Search still works.'));
      return;
    }
    for (const list of playlists) {
      content.append(h('button', { class: 'row', onclick: () => void openPlaylist(list) },
        picture(list.thumb),
        h('span', { class: 'row-text' }, h('span', { class: 'row-title' }, list.title), h('span', { class: 'row-sub' }, list.count >= 0 ? `${list.count} videos` : 'Everything you have liked'))));
    }
  }

  function markPlaying(): void {
    const current = player.track?.videoId;
    for (const row of content.querySelectorAll<HTMLElement>('.track')) row.classList.toggle('playing', row.dataset.id === current);
  }
  player.onChange(markPlaying);

  const form = h('form', { class: 'music-search', onsubmit: (e: Event) => {
    e.preventDefault();
    const query = search.value.trim();
    if (!query) return;
    void run('Searching', () => api.search(query)).then((tracks) => tracks && showTracks(`Results for “${query}”`, tracks));
  } }, search);

  const el = h('div', { class: 'music-library' },
    form,
    content,
    status,
    h('div', { class: 'music-footer' },
      h('button', { class: 'text-btn', onclick: () => void load() }, 'Refresh'),
      h('button', { class: 'text-btn', onclick: onSignOut }, 'Sign out')),
  );

  function reset(): void {
    playlists = [];
    clear(content);
    search.value = '';
    status.textContent = '';
  }

  async function load(): Promise<void> {
    reset();
    const found = await run('Loading your playlists', () => api.myPlaylists());
    if (!found) return;
    playlists = found;
    showPlaylists();
  }

  return { el, load, reset };
}
