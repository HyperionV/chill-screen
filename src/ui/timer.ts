import { chime } from './chime';
import { h, icon } from './dom';
import { ICONS } from './icons';
import { createPopover } from './popover';
import { readJson, writeJson } from '../store';
import type { ToolPanel } from './panel';

const KEY = 'chillscreen.timer';
const MINUTE = 60_000;
const MIN_MINUTES = 1;
const MAX_MINUTES = 180;
const PRESETS = [
  { focus: 25, rest: 5 },
  { focus: 50, rest: 10 },
] as const;

type Phase = 'focus' | 'rest';

interface TimerState {
  /** Minutes for a focus stretch and for the rest after it. */
  focusMinutes: number;
  restMinutes: number;
  phase: Phase;
  /** Set while running: when the current phase ends (epoch ms). */
  endsAt: number | null;
  /** Set while paused or idle: what is left of the current phase (ms). */
  remaining: number;
  /** Focus sessions finished today (the cycle count), and which day that is. */
  done: number;
  day: string;
}

const today = (): string => new Date().toDateString();
const phaseLength = (s: TimerState): number => (s.phase === 'focus' ? s.focusMinutes : s.restMinutes) * MINUTE;
const isMinutes = (v: unknown): v is number => typeof v === 'number' && v >= MIN_MINUTES && v <= MAX_MINUTES;

const isTimerState = (v: unknown): v is TimerState =>
  typeof v === 'object' && v !== null &&
  'focusMinutes' in v && isMinutes(v.focusMinutes) &&
  'restMinutes' in v && isMinutes(v.restMinutes) &&
  'phase' in v && (v.phase === 'focus' || v.phase === 'rest') &&
  'endsAt' in v && (v.endsAt === null || typeof v.endsAt === 'number') &&
  'remaining' in v && typeof v.remaining === 'number' &&
  'done' in v && typeof v.done === 'number' &&
  'day' in v && typeof v.day === 'string';

const format = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** Focus timer: alternates focus and rest, keeps running across reloads, chimes at each change. */
export function createTimerPanel(onTick: (label: string | null) => void): ToolPanel {
  const initial: TimerState = { focusMinutes: PRESETS[0].focus, restMinutes: PRESETS[0].rest, phase: 'focus', endsAt: null, remaining: PRESETS[0].focus * MINUTE, done: 0, day: today() };
  const state = readJson<TimerState>(KEY, initial, isTimerState);
  if (state.day !== today()) {
    state.done = 0;
    state.day = today();
  }

  const readout = h('div', { class: 'timer-readout', role: 'timer', 'aria-live': 'off' });
  const cycles = h('span', { class: 'timer-cycles', title: 'Focus sessions finished today' });
  const startBtn = h('button', { class: 'icon-btn', onclick: () => (state.endsAt ? pause() : start()) });
  const configBtn = h('button', { class: 'text-btn', onclick: () => config.toggle(configBtn) }, 'Config');

  const save = (): void => writeJson(KEY, state);
  const remaining = (): number => (state.endsAt ? state.endsAt - Date.now() : state.remaining);

  const start = (): void => {
    state.endsAt = Date.now() + state.remaining;
    save();
    render();
  };
  const pause = (): void => {
    state.remaining = remaining();
    state.endsAt = null;
    save();
    render();
  };
  const reset = (): void => {
    state.endsAt = null;
    state.phase = 'focus';
    state.remaining = phaseLength(state);
    save();
    render();
  };
  const advance = (finished: boolean): void => {
    if (finished && state.phase === 'focus') state.done += 1;
    state.phase = state.phase === 'focus' ? 'rest' : 'focus';
    state.remaining = phaseLength(state);
    state.endsAt = finished ? Date.now() + state.remaining : null;
    if (finished) chime();
    save();
    render();
  };

  const focusField = h('input', { class: 'field minutes', type: 'number', min: MIN_MINUTES, max: MAX_MINUTES, 'aria-label': 'Focus minutes' });
  const restField = h('input', { class: 'field minutes', type: 'number', min: MIN_MINUTES, max: MAX_MINUTES, 'aria-label': 'Rest minutes' });
  const setLengths = (focus: number, rest: number): void => {
    if (!isMinutes(focus) || !isMinutes(rest)) return;
    state.focusMinutes = Math.round(focus);
    state.restMinutes = Math.round(rest);
    reset();
  };
  focusField.addEventListener('change', () => setLengths(focusField.valueAsNumber, state.restMinutes));
  restField.addEventListener('change', () => setLengths(state.focusMinutes, restField.valueAsNumber));

  const config = createPopover(
    h('div', { class: 'config' },
      h('div', { class: 'config-presets' },
        ...PRESETS.map((p) => h('button', { class: 'text-btn', onclick: () => setLengths(p.focus, p.rest) }, `${p.focus} / ${p.rest}`))),
      h('label', { class: 'config-row' }, 'Focus', focusField, 'min'),
      h('label', { class: 'config-row' }, 'Rest', restField, 'min'),
      h('button', { class: 'text-btn', onclick: () => advance(false) }, 'Skip to the next phase')),
    'Timer settings');

  const render = (): void => {
    const left = remaining();
    readout.textContent = format(left);
    readout.dataset.phase = state.phase;
    cycles.textContent = `×${state.done}`;
    startBtn.replaceChildren(icon(state.endsAt ? ICONS.pause : ICONS.play));
    const startLabel = state.endsAt ? 'Pause' : 'Start';
    startBtn.title = startLabel;
    startBtn.setAttribute('aria-label', startLabel);
    focusField.value = String(state.focusMinutes);
    restField.value = String(state.restMinutes);
    onTick(state.endsAt ? `${state.phase === 'focus' ? 'Focus' : 'Rest'} ${format(left)}` : null);
  };

  window.setInterval(() => {
    if (state.endsAt && Date.now() >= state.endsAt) advance(true);
    else render();
  }, 1000);
  render();

  return {
    id: 'timer',
    title: 'Focus',
    icon: ICONS.timer,
    body: h('div', { class: 'timer' },
      h('div', { class: 'timer-face' }, readout, cycles),
      h('div', { class: 'timer-actions' },
        startBtn,
        h('button', { class: 'icon-btn', onclick: reset, title: 'Back to a fresh focus session', 'aria-label': 'Reset' }, icon(ICONS.reset)),
        configBtn),
    ),
  };
}
