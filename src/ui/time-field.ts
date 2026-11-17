import { h } from './dom';
import { goLive, hourNow, setHour, setTimeSpeed, timeSpeed, TIME_SPEEDS, type TimeSpeed } from '../scene/clock';

const MINUTES_PER_DAY = 24 * 60;
const REFRESH_MS = 500;
const SPEED_LABELS: Record<TimeSpeed, string> = { 0: 'Pause', 1: '1×', 10: '10×', 60: '60×', 360: '360×' };

/** "14:05" for an hour such as 14.08. */
function clockText(hour: number): string {
  const minutes = Math.floor(hour * 60) % MINUTES_PER_DAY;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** What the speed means for a day, so "60×" is not left as a riddle. */
function dayLength(speed: TimeSpeed | null): string {
  if (speed === null) return 'Following your clock.';
  if (speed === 0) return 'The sky is held still. Drag the slider to choose its hour.';
  const minutes = MINUTES_PER_DAY / speed;
  return speed === 1 ? 'Your own pace, from the hour you chose.' : `A full day passes in ${minutes < 60 ? `${Math.round(minutes)} minutes` : `${minutes / 60} hours`}.`;
}

let stopPreviousTimer: (() => void) | null = null;

/**
 * The sky's clock: a slider to move to any hour, and a speed to run it at, from held still to a day in four minutes.
 * "Live" goes back to following the wall clock. Keeps itself up to date while on screen.
 */
export function createTimeField(): HTMLElement {
  const value = h('span', { class: 'field-value' });
  const slider = h('input', { type: 'range', class: 'slider', min: 0, max: MINUTES_PER_DAY - 1, step: 1, 'aria-label': 'Time of day' });
  const note = h('p', { class: 'hint' });
  const liveButton = h('button', { class: 'seg', role: 'radio', onclick: () => { goLive(); refresh(); } }, 'Live');
  const speedButtons = TIME_SPEEDS.map((speed) => h('button', { class: 'seg', role: 'radio', onclick: () => { setTimeSpeed(speed); refresh(); } }, SPEED_LABELS[speed]));
  let dragging = false;

  function refresh(): void {
    const hour = hourNow();
    const speed = timeSpeed();
    value.textContent = clockText(hour);
    if (!dragging) slider.value = String(Math.floor(hour * 60) % MINUTES_PER_DAY);
    liveButton.setAttribute('aria-checked', String(speed === null));
    TIME_SPEEDS.forEach((s, i) => speedButtons[i].setAttribute('aria-checked', String(s === speed)));
    note.textContent = dayLength(speed);
  }

  slider.addEventListener('pointerdown', () => (dragging = true));
  slider.addEventListener('change', () => (dragging = false));
  slider.addEventListener('input', () => {
    setHour(Number(slider.value) / 60);
    refresh();
  });

  // The panel rebuilds this field now and then, and lifts it off the page while closed: the newest copy keeps the timer.
  stopPreviousTimer?.();
  const timer = window.setInterval(() => {
    if (slider.isConnected) refresh();
  }, REFRESH_MS);
  stopPreviousTimer = () => window.clearInterval(timer);
  refresh();

  return h('div', { class: 'time-field' },
    h('div', { class: 'field-row' },
      h('span', { class: 'field-label' }, h('span', { class: 'field-label-row' }, 'Time', value)),
      slider),
    h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': 'Speed of time' }, liveButton, ...speedButtons),
    note);
}
