import { h, icon } from './dom';
import { ICONS } from './icons';
import type { MusicPlayer } from '../music/music-player';

const PROGRESS_REFRESH_MS = 1000;
const IDLE_TITLE = 'Nothing playing';
const IDLE_HINT = 'Choose something to play';

/**
 * The music player that sits on the window: what is playing, the buttons, the volume, and a way into the library.
 * Only the sound is used; the video stays out of sight.
 */
export function createMusicWidget(player: MusicPlayer, openLibrary: () => void): HTMLElement {
  const title = h('p', { class: 'mw-title' });
  const channel = h('p', { class: 'mw-channel' });
  const progress = h('div', { class: 'mw-progress' });
  // With nothing chosen yet, Play leads to the library instead of doing nothing.
  const playPause = h('button', { class: 'icon-btn mw-play', onclick: () => (player.track ? void player.toggle() : openLibrary()) });
  const volume = h('input', { type: 'range', class: 'slider mw-volume', min: 0, max: 100, step: 1, value: player.volume, 'aria-label': 'Volume' });
  volume.addEventListener('input', () => player.setVolume(Number(volume.value)));

  const root = h('section', { class: 'music-widget', 'aria-label': 'Music player' },
    h('button', { class: 'icon-btn', 'aria-label': 'Previous track', title: 'Previous', onclick: () => void player.previous() }, icon(ICONS.prev)),
    playPause,
    h('button', { class: 'icon-btn', 'aria-label': 'Next track', title: 'Next', onclick: () => void player.next() }, icon(ICONS.next)),
    h('div', { class: 'mw-text' }, title, channel),
    h('span', { class: 'mw-volume-icon' }, icon(ICONS.volume)),
    volume,
    h('button', { class: 'icon-btn', 'aria-label': 'Open your music', title: 'Your playlists and search', onclick: openLibrary }, icon(ICONS.search)),
    progress,
  );

  let timer = 0;
  const tick = async (): Promise<void> => {
    const { time, duration } = await player.progress();
    progress.style.width = `${duration > 0 ? Math.min(100, (time / duration) * 100) : 0}%`;
  };

  const update = (): void => {
    const track = player.track;
    title.textContent = track?.title ?? IDLE_TITLE;
    channel.textContent = track?.channel ?? IDLE_HINT;
    playPause.replaceChildren(icon(player.playing ? ICONS.pause : ICONS.play));
    playPause.setAttribute('aria-label', player.playing ? 'Pause' : 'Play');
    playPause.title = player.playing ? 'Pause' : 'Play';
    volume.value = String(player.volume);
    clearInterval(timer);
    if (!track) return;
    void tick();
    if (player.playing) timer = window.setInterval(() => void tick(), PROGRESS_REFRESH_MS);
  };
  player.onChange(update);
  update();
  return root;
}
