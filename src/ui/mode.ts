import { readJson, writeJson } from '../store';

/** Zen shows only the scene; business adds the notes on the left and the tasks on the right. */
export const MODES = ['zen', 'business'] as const;
export type Mode = (typeof MODES)[number];
export const MODE_LABELS: Record<Mode, string> = { zen: 'Zen', business: 'Business' };

const KEY = 'chillscreen.mode';
const isMode = (v: unknown): v is Mode => MODES.some((m) => m === v);

/** Reads the saved mode, and keeps the page's `data-mode` in step so the style sheet can react to it. */
export function createMode(): { current(): Mode; set(mode: Mode): void } {
  let mode = readJson<Mode>(KEY, 'zen', isMode);
  document.body.dataset.mode = mode;
  return {
    current: () => mode,
    set(next) {
      mode = next;
      document.body.dataset.mode = next;
      writeJson(KEY, next);
    },
  };
}
