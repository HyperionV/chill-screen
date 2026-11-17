import { chime } from './chime';
import { clear, h, icon } from './dom';
import { ICONS } from './icons';
import { readJson, writeJson } from '../store';

const KEY = 'chillscreen.reminders';
const MINUTE = 60_000;
const QUICK_MINUTES = [10, 30, 60] as const;
const DEFAULT_TEXT = 'Reminder';

interface Reminder {
  id: string;
  text: string;
  /** When it goes off (epoch ms). */
  at: number;
}

const isReminderList = (v: unknown): v is Reminder[] =>
  Array.isArray(v) &&
  v.every((r: unknown) =>
    typeof r === 'object' && r !== null &&
    'id' in r && typeof r.id === 'string' &&
    'text' in r && typeof r.text === 'string' &&
    'at' in r && typeof r.at === 'number');

/** The next time the clock will read `hhmm` ("15:30"): today if still ahead, otherwise tomorrow. */
function nextOccurrence(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  const at = new Date();
  at.setHours(hours, minutes, 0, 0);
  if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1);
  return at.getTime();
}

function whenLabel(at: number): string {
  const time = new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const days = Math.round((new Date(at).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
  return days <= 0 ? time : days === 1 ? `${time} tomorrow` : `${time} +${days}d`;
}

function desktopAlert(text: string, id: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification('ChillScreen', { body: text, tag: id });
  } catch (err) {
    console.warn('[reminders] desktop alert failed', err);
  }
}

export interface Reminders {
  /** The card's contents. */
  body: HTMLElement;
  /** Banners for reminders that went off; live in the page whatever the mode, so they show in Zen too. */
  banners: HTMLElement;
}

/** Reminders: pick a time, get a banner, a chime and a desktop alert when it comes. Survives reloads. */
export function createReminders(): Reminders {
  let reminders = readJson<Reminder[]>(KEY, [], isReminderList);
  const text = h('input', { class: 'field', type: 'text', placeholder: 'Remind me to…', 'aria-label': 'Reminder', maxlength: 120 });
  const time = h('input', { class: 'field time-field', type: 'time', 'aria-label': 'Time' });
  const list = h('ul', { class: 'task-list' });
  const status = h('p', { class: 'quiet-status' });
  const banners = h('div', { class: 'banners', role: 'alert' });

  const commit = (): void => {
    writeJson(KEY, reminders);
    render();
  };

  const render = (): void => {
    clear(list);
    for (const r of [...reminders].sort((a, b) => a.at - b.at)) {
      list.append(
        h('li', { class: 'task' },
          h('div', { class: 'reminder-main' },
            h('span', { class: 'reminder-time' }, whenLabel(r.at)),
            h('span', { class: 'task-text' }, r.text)),
          h('button', { class: 'icon-btn ghost', 'aria-label': `Remove ${r.text}`, title: 'Remove', onclick: () => { reminders = reminders.filter((x) => x !== r); commit(); } }, icon(ICONS.trash)),
        ),
      );
    }
    const blocked = 'Notification' in window && Notification.permission === 'denied';
    status.textContent = blocked ? 'Desktop alerts are blocked in this browser; the banner still shows.' : reminders.length === 0 ? 'Nothing to remember right now.' : '';
  };

  const add = (at: number): void => {
    reminders.push({ id: crypto.randomUUID(), text: text.value.trim() || DEFAULT_TEXT, at });
    text.value = '';
    time.value = '';
    // Asked here, in answer to the person's own click, which is the only moment a browser allows it.
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission().then(render);
    commit();
  };
  const addAtTime = (): void => (time.value ? add(nextOccurrence(time.value)) : time.focus());

  const banner = (r: Reminder): void => {
    const el = h('div', { class: 'banner' },
      h('span', { class: 'banner-text' }, r.text),
      h('button', { class: 'btn', onclick: () => el.remove() }, 'Dismiss'));
    banners.append(el);
  };

  const fireDue = (): void => {
    const due = reminders.filter((r) => r.at <= Date.now());
    if (due.length === 0) return;
    reminders = reminders.filter((r) => !due.includes(r));
    commit();
    for (const r of due) {
      banner(r);
      desktopAlert(r.text, r.id);
    }
    chime();
  };

  text.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addAtTime();
  });
  time.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addAtTime();
  });

  const quick = QUICK_MINUTES.map((m) =>
    h('button', { class: 'text-btn', title: `Remind me in ${m} minutes`, onclick: () => add(Date.now() + m * MINUTE) }, m < 60 ? `+${m}m` : `+${m / 60}h`));

  window.setInterval(fireDue, 1000);
  render();
  fireDue();

  return {
    body: h('div', { class: 'reminders' },
      text,
      h('div', { class: 'reminder-add' }, time, h('button', { class: 'btn', onclick: addAtTime }, 'Add'), h('span', { class: 'reminder-quick' }, ...quick)),
      list,
      status),
    banners,
  };
}
