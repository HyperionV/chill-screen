import './shell.css';
import { h, icon } from './dom';
import { createMode, MODE_LABELS, MODES, type Mode } from './mode';
import { createMusicPanel } from './music';
import { createMusicWidget } from './music-widget';
import { PanelHost, type ToolPanel } from './panel';
import { createSceneryPanel } from './scenery';
import { createSideCards } from './side-cards';
import { createTimerPanel } from './timer';
import { MusicPlayer } from '../music/music-player';
import type { SceneSwitch } from '../scene/scene-switch';

/** The controls fade away after this long without the pointer moving, leaving only the scene. */
const IDLE_MS = 3500;

/**
 * Builds the overlay. Always there: the music player on the window and the dock at the bottom. Zen shows nothing
 * more; business adds the notes (left) and the tasks (right). Scenery, music and the timer open as side panels.
 */
export function mountUi(root: HTMLElement, scenery: SceneSwitch): void {
  const host = new PanelHost();
  const timerBadge = h('span', { class: 'dock-badge', hidden: true });
  const player = new MusicPlayer();
  player.el.className = 'audio-host';
  const music = createMusicPanel(player);
  scenery.setMusic({
    label: () => (player.track ? `${player.track.title} - ${player.track.channel}` : null),
    playing: () => player.playing,
    volume: () => player.volume,
    progress: () => player.fraction,
    previous: () => void player.previous(),
    toggle: () => void player.toggle(),
    next: () => void player.next(),
    setVolume: (volume) => player.setVolume(volume),
    openLibrary: () => host.open(music),
  });
  const tools: ToolPanel[] = [
    createSceneryPanel(scenery),
    createTimerPanel((label) => {
      timerBadge.textContent = label ?? '';
      timerBadge.hidden = label === null;
    }),
  ];
  const extras: Record<string, HTMLElement> = { timer: timerBadge };

  const toolButtons = tools.map((p) => {
    const b = h('button', { class: 'dock-btn', 'aria-label': p.title, title: p.title, 'aria-pressed': 'false', onclick: () => host.toggle(p) }, icon(p.icon), extras[p.id]);
    b.dataset.id = p.id;
    return b;
  });

  const mode = createMode();
  const modeButtons = MODES.map((m) => h('button', { class: 'dock-mode', role: 'radio', 'aria-checked': String(m === mode.current()), onclick: () => pick(m) }, MODE_LABELS[m]));
  const pick = (next: Mode): void => {
    mode.set(next);
    modeButtons.forEach((b, i) => b.setAttribute('aria-checked', String(MODES[i] === next)));
  };

  const dock = h('nav', { class: 'dock', 'aria-label': 'Tools' },
    h('div', { class: 'dock-modes', role: 'radiogroup', 'aria-label': 'Mode' }, ...modeButtons),
    h('span', { class: 'dock-sep' }),
    ...toolButtons);
  host.onChange((id) => {
    for (const b of toolButtons) b.setAttribute('aria-pressed', String(b.dataset.id === id));
    document.body.classList.toggle('panel-open', id !== null);
    wake();
  });

  let idleTimer = 0;
  function wake(): void {
    document.body.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      if (!host.openId && !dock.matches(':hover')) document.body.classList.add('idle');
    }, IDLE_MS);
  }
  addEventListener('pointermove', wake);
  addEventListener('keydown', wake);
  wake();

  root.append(player.el, ...createSideCards(), createMusicWidget(player, () => host.open(music)), host.el, dock);
}
