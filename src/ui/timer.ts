import { h, icon } from './dom';
import { ICONS } from './icons';
import { readJson, writeJson } from '../store';
import type { ToolPanel } from './panel';

const KEY = 'chillscreen.timer';
const MINUTE = 60_000;
const PRESETS = [
  { label: '25 / 5', focus: 25, rest: 5 },
  { label: '50 / 10', focus: 50, rest: 10 },
] as const;

type Phase = 'focus' | 'rest';

interface TimerState {
  preset: number;
  phase: Phase;
  /** Set while running: when the current phase ends (epoch ms). */
  endsAt: number | null;
  /** Set while paused or idle: what is left of the current phase (ms). */
  remaining: number;
  /** Focus sessions finished today, and which day that is. */
  done: number;
  day: string;
}

const today = (): string => new Date().toDateString();
const phaseLength = (s: TimerState): number => (s.phase === 'focus' ? PRESETS[s.preset].focus : PRESETS[s.preset].rest) * MINUTE;

const isTimerState = (v: unknown): v is TimerState =>
  typeof v === 'object' && v !== null &&
  'preset' in v && typeof v.preset === 'number' && v.preset >= 0 && v.preset < PRESETS.length &&
  'phase' in v && (v.phase === 'focus' || v.phase === 'rest') &&
  'endsAt' in v && (v.endsAt === null || typeof v.endsAt === 'number') &&
  'remaining' in v && typeof v.remaining === 'number' &&
  'done' in v && typeof v.done === 'number' &&
  'day' in v && typeof v.day === 'string';

/** A soft two-note chime made on the spot, so no sound file is needed. */
function chime(): void {
  const ac = new AudioContext();
  const now = ac.currentTime;
  [659.25, 880].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + i * 0.35);
    gain.gain.linearRampToValueAtTime(0.18, now + i * 0.35 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.35 + 1.6);
    osc.connect(gain).connect(ac.destination);
    osc.start(now + i * 0.35);
    osc.stop(now + i * 0.35 + 1.7);
  });
  window.setTimeout(() => void ac.close(), 2600);
}

const format = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** Focus timer: alternates focus and rest, keeps running across reloads, chimes at each change. */
export function createTimerPanel(onTick: (label: string | null) => void): ToolPanel {
  const initial: TimerState = { preset: 0, phase: 'focus', endsAt: null, remaining: PRESETS[0].focus * MINUTE, done: 0, day: today() };
  const state = readJson<TimerState>(KEY, initial, isTimerState);
  if (state.day !== today()) {
    state.done = 0;
    state.day = today();
  }

  const readout = h('div', { class: 'timer-readout', role: 'timer', 'aria-live': 'off' });
  const phaseLabel = h('p', { class: 'timer-phase' });
  const startBtn = h('button', { class: 'btn primary', onclick: () => (state.endsAt ? pause() : start()) });
  const presetRow = h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': 'Timer length' });
  const doneLabel = h('p', { class: 'quiet-status' });

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

  const render = (): void => {
    const left = remaining();
    readout.textContent = format(left);
    phaseLabel.textContent = state.phase === 'focus' ? 'Focus' : 'Rest';
    startBtn.replaceChildren(icon(state.endsAt ? ICONS.pause : ICONS.play), state.endsAt ? 'Pause' : 'Start');
    doneLabel.textContent = state.done === 1 ? '1 focus session today' : `${state.done} focus sessions today`;
    presetRow.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-checked', String(i === state.preset)));
    onTick(state.endsAt ? `${state.phase === 'focus' ? 'Focus' : 'Rest'} ${format(left)}` : null);
  };

  PRESETS.forEach((p, i) => {
    presetRow.append(
      h('button', {
        class: 'seg', role: 'radio', 'aria-checked': String(i === state.preset),
        onclick: () => {
          state.preset = i;
          reset();
        },
      }, p.label),
    );
  });

  window.setInterval(() => {
    if (state.endsAt && Date.now() >= state.endsAt) advance(true);
    else render();
  }, 1000);
  render();

  return {
    id: 'timer',
    title: 'Focus timer',
    icon: ICONS.timer,
    body: h('div', { class: 'timer' },
      presetRow, phaseLabel, readout,
      h('div', { class: 'timer-actions' },
        startBtn,
        h('button', { class: 'btn', onclick: () => advance(false), title: 'Skip to the next phase' }, icon(ICONS.next), 'Skip'),
        h('button', { class: 'btn', onclick: reset, title: 'Back to a fresh focus session' }, icon(ICONS.reset), 'Reset'),
      ),
      doneLabel,
    ),
  };
}
