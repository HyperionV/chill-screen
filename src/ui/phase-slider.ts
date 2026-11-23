import { h, icon } from './dom';
import { ICONS } from './icons';
import type { Route } from '../room/journeys/route';

const REFRESH_MS = 500;

let stopPreviousTimer: (() => void) | null = null;

/**
 * The phases of the scene on screen as a slider with one stop per phase, its name above and a padlock beside it.
 * Locked, the scene stays in the phase it is in; unlocked, it moves through the phases by itself. Sliding to another
 * stop goes to that phase (and stays there when the padlock is on). Keeps itself up to date while on screen.
 */
export function createPhaseSlider(route: Route): HTMLElement {
  const last = route.chapters.length - 1;
  const name = h('span', { class: 'phase-name' });
  const lockLabel = h('span', {});
  const lock = h('button', { class: 'phase-lock', onclick: () => { route.toggleLock(); refresh(); } });
  const slider = h('input', { type: 'range', class: 'slider', min: 0, max: last, step: 1, 'aria-label': 'Phase' });
  const ticks = route.chapters.map(() => h('span', { class: 'phase-tick' }));
  let dragging = false;

  function refresh(): void {
    const now = route.now.index;
    const locked = route.lockedChapter !== null;
    name.textContent = route.chapters[now].name;
    if (!dragging) slider.value = String(now);
    slider.setAttribute('aria-valuetext', route.chapters[now].name);
    ticks.forEach((tick, i) => tick.classList.toggle('current', i === now));
    lock.classList.toggle('locked', locked);
    lock.setAttribute('aria-pressed', String(locked));
    lock.title = locked ? 'Locked on this phase. Click to let the scene move on.' : 'Click to stay on this phase';
    lock.setAttribute('aria-label', lock.title);
    lock.replaceChildren(icon(locked ? ICONS.lock : ICONS.unlock), lockLabel);
    lockLabel.textContent = locked ? 'Locked' : 'Moving';
  }

  slider.addEventListener('pointerdown', () => (dragging = true));
  slider.addEventListener('change', () => {
    dragging = false;
    refresh();
  });
  slider.addEventListener('input', () => {
    const picked = Number(slider.value);
    if (picked !== route.now.index) route.goTo(picked);
    refresh();
  });

  // The panel rebuilds this slider now and then: the newest copy keeps the timer.
  stopPreviousTimer?.();
  const timer = window.setInterval(() => {
    if (slider.isConnected) refresh();
  }, REFRESH_MS);
  stopPreviousTimer = () => window.clearInterval(timer);

  refresh();
  return h('div', { class: 'phase-card' },
    h('div', { class: 'phase-head' }, name, lock),
    slider,
    h('div', { class: 'phase-ticks', 'aria-hidden': 'true' }, ...ticks));
}
