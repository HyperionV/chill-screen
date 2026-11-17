import { h, icon } from './dom';
import { ICONS } from './icons';
import type { MusicPlayer } from '../music/music-player';

const SEEK_STEPS = 1000;
const IDLE_TITLE = 'Nothing playing';
const IDLE_HINT = 'Choose something to play';

/**
 * The player as a plain bar, used only where there is no window to stand a radio on (the aquarium). In the window
 * scenes the player is the pixel radio on the sill, drawn by the scene itself.
 */
export function createMusicWidget(player: MusicPlayer, openLibrary: () => void): HTMLElement {
  const title = h('p', { class: 'mw-title' });
  const channel = h('p', { class: 'mw-channel' });
  // A thin line under the song's name that shows how far the track has played; drag it to skip.
  const seek = h('input', { type: 'range', class: 'mw-seek', min: 0, max: SEEK_STEPS, step: 1, value: 0, 'aria-label': 'Position in the track' });
  let dragging = false;
  seek.addEventListener('pointerdown', () => (dragging = true));
  seek.addEventListener('change', () => (dragging = false));
  seek.addEventListener('input', () => {
    seek.style.setProperty('--fill', `${Number(seek.value) / SEEK_STEPS * 100}%`);
    player.seek(Number(seek.value) / SEEK_STEPS);
  });
  // With nothing chosen yet, Play leads to the library instead of doing nothing.
  const playPause = h('button', { class: 'icon-btn mw-play', onclick: () => (player.track ? void player.toggle() : openLibrary()) });
  const volume = h('input', { type: 'range', class: 'slider mw-volume', min: 0, max: 100, step: 1, value: player.volume, 'aria-label': 'Volume' });
  volume.addEventListener('input', () => player.setVolume(Number(volume.value)));

  const root = h('section', { class: 'music-widget', 'aria-label': 'Music player' },
    h('button', { class: 'icon-btn', 'aria-label': 'Previous track', title: 'Previous', onclick: () => void player.previous() }, icon(ICONS.prev)),
    playPause,
    h('button', { class: 'icon-btn', 'aria-label': 'Next track', title: 'Next', onclick: () => void player.next() }, icon(ICONS.next)),
    h('div', { class: 'mw-text' }, title, channel, seek),
    h('span', { class: 'mw-volume-icon' }, icon(ICONS.volume)),
    volume,
    h('button', { class: 'icon-btn', 'aria-label': 'Open your music', title: 'Your playlists and search', onclick: openLibrary }, icon(ICONS.search)),
  );

  const update = (): void => {
    const track = player.track;
    title.textContent = track?.title ?? IDLE_TITLE;
    channel.textContent = track?.channel ?? IDLE_HINT;
    playPause.replaceChildren(icon(player.playing ? ICONS.pause : ICONS.play));
    playPause.setAttribute('aria-label', player.playing ? 'Pause' : 'Play');
    playPause.title = player.playing ? 'Pause' : 'Play';
    volume.value = String(player.volume);
    seek.disabled = player.seconds <= 0;
    if (dragging) return;
    seek.value = String(Math.round(player.fraction * SEEK_STEPS));
    seek.style.setProperty('--fill', `${player.fraction * 100}%`);
  };
  player.onChange(update);
  update();
  return root;
}
