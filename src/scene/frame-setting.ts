import { readJson, writeJson } from '../store';

const KEY = 'chillscreen.windowFrame';
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';

let framed = readJson(KEY, true, isBool);
const listeners = new Set<() => void>();

/** Keeps the page's `data-frame` in step, so the style sheet shows the plain player bar when there is no window to stand a radio on. */
const mark = (): void => {
  document.body.dataset.frame = framed ? 'window' : 'none';
};

/** Whether the window scenes show the room around the view (the window, its sill and the radio) or just the view. */
export const frameSetting = {
  get framed(): boolean {
    return framed;
  },
  set(next: boolean): void {
    framed = next;
    writeJson(KEY, framed);
    mark();
    for (const fn of listeners) fn();
  },
  onChange(fn: () => void): void {
    listeners.add(fn);
  },
};

mark();
