import './shell.css';
import { h, icon } from './dom';
import { createMode, MODE_LABELS, MODES, type Mode } from './mode';
import { createMusicPanel } from './music';
import { createMusicWidget } from './music-widget';
import { PanelHost, type ToolPanel } from './panel';
import { createReminders } from './reminders';
import { createSceneryPanel } from './scenery';
import { createSideCards } from './side-cards';
import { createTimerPanel } from './timer';
import { MusicPlayer } from '../music/music-player';
import type { SceneSwitch } from '../scene/scene-switch';

/** The controls fade away after this long without the pointer moving, leaving only the scene. */
const IDLE_MS = 3500;

/**
 * Builds the overlay. Always there: the music player on the window and the dock at the bottom. Zen shows nothing
 * more; business adds the notes and timer (left) and the tasks and reminders (right). Scenery and music open as side
 * panels. In Zen the timer is a small floating card instead: it opens from the dock and appears by itself when a
 * session starts.
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
    duration: () => player.seconds,
    seek: (fraction) => player.seek(fraction),
    previous: () => void player.previous(),
    toggle: () => void player.toggle(),
    next: () => void player.next(),
    setVolume: (volume) => player.setVolume(volume),
    openLibrary: () => host.open(music),
  });
  let sessionActive = false;
  let focusReady = false;
  const timer = createTimerPanel((label, active) => {
    timerBadge.textContent = label ?? '';
    timerBadge.hidden = label === null;
    // A session starting brings the card up by itself; resetting it puts the card away.
    if (focusReady && active !== sessionActive) setFocusOpen(active);
    sessionActive = active;
  });
  const tools: ToolPanel[] = [createSceneryPanel(scenery)];
  const reminders = createReminders();
  const sideCards = createSideCards(timer.body, reminders);

  const toolButtons = tools.map((p) => {
    const b = h('button', { class: 'dock-btn', 'aria-label': p.title, title: p.title, 'aria-pressed': 'false', onclick: () => host.toggle(p) }, icon(p.icon));
    b.dataset.id = p.id;
    return b;
  });

  // Zen's timer: a small floating card above the dock, shown only when asked for or while a session is under way.
  const focusBody = h('div', { class: 'focus-float-body' });
  const focusFloat = h('section', { class: 'focus-float', 'aria-label': timer.title, hidden: true }, focusBody);
  const focusButton = h('button', { class: 'dock-btn', 'aria-label': timer.title, title: timer.title, 'aria-pressed': 'false', onclick: () => setFocusOpen(focusButton.getAttribute('aria-pressed') !== 'true') }, icon(timer.icon), timerBadge);
  focusButton.dataset.id = timer.id;
  function setFocusOpen(open: boolean): void {
    focusFloat.hidden = !open;
    focusButton.setAttribute('aria-pressed', String(open));
  }
  focusReady = true;
  setFocusOpen(sessionActive);
  /** Zen keeps the timer in the floating card; business keeps it in its own card on the left. */
  const placeTimer = (m: Mode): void => {
    if (m === 'business') sideCards.returnTimer();
    else focusBody.append(timer.body);
  };

  const mode = createMode();
  const modeButtons = MODES.map((m) => h('button', { class: 'dock-mode', role: 'radio', 'aria-checked': String(m === mode.current()), onclick: () => pick(m) }, MODE_LABELS[m]));
  const pick = (next: Mode): void => {
    mode.set(next);
    placeTimer(next);
    modeButtons.forEach((b, i) => b.setAttribute('aria-checked', String(MODES[i] === next)));
  };

  const dock = h('nav', { class: 'dock', 'aria-label': 'Tools' },
    h('div', { class: 'dock-modes', role: 'radiogroup', 'aria-label': 'Mode' }, ...modeButtons),
    h('span', { class: 'dock-sep' }),
    ...toolButtons,
    focusButton);
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

  placeTimer(mode.current());
  root.append(player.el, ...sideCards.columns, focusFloat, reminders.banners, createMusicWidget(player, () => host.open(music)), host.el, dock);
}
