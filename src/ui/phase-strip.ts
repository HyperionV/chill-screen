import { h, icon } from './dom';
import { ICONS } from './icons';
import type { Route } from '../room/journeys/route';

const REFRESH_MS = 500;

let stopPreviousTimer: (() => void) | null = null;

/**
 * The phases of the scene on screen, as a row of names that slides sideways. The phase showing now is marked and carries
 * a padlock: locked, the scene stays in that phase; unlocked, it moves through the phases by itself. Picking another
 * name goes to that phase (and stays there when the padlock is on). Keeps itself up to date while on screen.
 */
export function createPhaseStrip(route: Route): HTMLElement {
  const chips = route.chapters.map((chapter, index) => {
    const lock = h('button', { class: 'phase-lock', onclick: () => { route.toggleLock(); refresh(); } });
    const name = h('button', { class: 'phase-name', onclick: () => { route.goTo(index); refresh(); } }, chapter.name);
    return { el: h('div', { class: 'phase' }, name, lock), name, lock };
  });
  const track = h('div', { class: 'phase-track', role: 'group', 'aria-label': 'Phases' }, ...chips.map((c) => c.el));
  let shown = -1;

  function refresh(): void {
    const now = route.now.index;
    const held = route.lockedChapter;
    chips.forEach((chip, i) => {
      const locked = held === i;
      chip.el.classList.toggle('current', i === now);
      chip.el.classList.toggle('locked', locked);
      chip.name.setAttribute('aria-current', String(i === now));
      chip.lock.replaceChildren(icon(locked ? ICONS.lock : ICONS.unlock));
      chip.lock.setAttribute('aria-pressed', String(locked));
      chip.lock.title = locked ? 'Locked on this phase. Click to move on again.' : 'Stay on this phase';
      chip.lock.setAttribute('aria-label', chip.lock.title);
    });
    if (now !== shown) {
      shown = now;
      const chip = chips[now].el;
      track.scrollTo({ left: chip.offsetLeft - (track.clientWidth - chip.offsetWidth) / 2, behavior: 'smooth' });
    }
  }

  // A mouse wheel slides the row sideways, unless it is already at its end, so the panel still scrolls past it.
  track.addEventListener('wheel', (e) => {
    const before = track.scrollLeft;
    track.scrollLeft += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (track.scrollLeft !== before) e.preventDefault();
  }, { passive: false });

  // The panel rebuilds this strip now and then: the newest copy keeps the timer.
  stopPreviousTimer?.();
  const timer = window.setInterval(() => {
    if (track.isConnected) refresh();
  }, REFRESH_MS);
  stopPreviousTimer = () => window.clearInterval(timer);

  refresh();
  return h('div', { class: 'phase-strip' }, track);
}
