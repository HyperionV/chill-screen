import { h, icon } from './dom';
import { ICONS } from './icons';
import type { MusicPlayer } from '../music/music-player';

const PROGRESS_STEPS = 1000;
const PROGRESS_REFRESH_MS = 500;

const clock = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** The video, what is playing, the play controls, a progress bar and the volume. Hidden until something is queued. */
export function createNowPlaying(player: MusicPlayer): HTMLElement {
  const video = h('div', { class: 'np-video' }, player.el);
  player.el.className = 'np-embed';
  const title = h('p', { class: 'np-title' });
  const channel = h('p', { class: 'np-channel' });
  const elapsed = h('span', {}, '0:00');
  const length = h('span', {}, '0:00');
  const bar = h('input', { type: 'range', class: 'slider', min: 0, max: PROGRESS_STEPS, step: 1, value: 0, 'aria-label': 'Position in the track' });
  const volume = h('input', { type: 'range', class: 'slider np-volume', min: 0, max: 100, step: 1, value: player.volume, 'aria-label': 'Volume' });
  const playPause = h('button', { class: 'icon-btn np-play', onclick: () => void player.toggle() });
  const controls = h('div', { class: 'np-controls' },
    h('button', { class: 'icon-btn', 'aria-label': 'Previous track', title: 'Previous', onclick: () => void player.previous() }, icon(ICONS.prev)),
    playPause,
    h('button', { class: 'icon-btn', 'aria-label': 'Next track', title: 'Next', onclick: () => void player.next() }, icon(ICONS.next)),
    h('span', { class: 'np-volume-icon' }, icon(ICONS.volume)),
    volume,
  );
  const root = h('section', { class: 'now-playing', hidden: true, 'aria-label': 'Now playing' },
    video,
    h('div', { class: 'np-text' }, title, channel),
    h('div', { class: 'np-progress' }, elapsed, bar, length),
    controls,
  );

  let dragging = false;
  let timer = 0;
  const tick = async (): Promise<void> => {
    if (dragging) return;
    const { time, duration } = await player.progress();
    elapsed.textContent = clock(time);
    length.textContent = clock(duration);
    bar.value = String(duration > 0 ? Math.round((time / duration) * PROGRESS_STEPS) : 0);
  };
  bar.addEventListener('pointerdown', () => (dragging = true));
  // A press and release without moving the thumb fires no change event, so let go here too (after a seek has landed).
  for (const type of ['pointerup', 'pointercancel']) bar.addEventListener(type, () => window.setTimeout(() => (dragging = false), PROGRESS_REFRESH_MS));
  bar.addEventListener('input', async () => {
    const { duration } = await player.progress();
    elapsed.textContent = clock((Number(bar.value) / PROGRESS_STEPS) * duration);
  });
  bar.addEventListener('change', async () => {
    const { duration } = await player.progress();
    await player.seek((Number(bar.value) / PROGRESS_STEPS) * duration);
    dragging = false;
  });
  volume.addEventListener('input', () => player.setVolume(Number(volume.value)));

  const update = (): void => {
    const track = player.track;
    root.hidden = !track;
    title.textContent = track?.title ?? '';
    channel.textContent = track?.channel ?? '';
    playPause.replaceChildren(icon(player.playing ? ICONS.pause : ICONS.play));
    playPause.setAttribute('aria-label', player.playing ? 'Pause' : 'Play');
    playPause.title = player.playing ? 'Pause' : 'Play';
    clearInterval(timer);
    if (!track) return;
    void tick();
    if (player.playing) timer = window.setInterval(() => void tick(), PROGRESS_REFRESH_MS);
  };
  player.onChange(update);
  update();
  return root;
}
