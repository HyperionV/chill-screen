import { h } from './dom';
import { readJson, writeJson } from '../store';
import type { Panel } from './panel';

const KEY = 'chillscreen.notes';
const SAVE_DELAY_MS = 400;
const isString = (v: unknown): v is string => typeof v === 'string';

/** A single scratchpad that saves itself as you type. */
export function createNotesPanel(): Panel {
  const area = h('textarea', { class: 'notes-area', placeholder: 'Thoughts, links, the thing you must not forget…', spellcheck: 'true', 'aria-label': 'Notes' });
  area.value = readJson(KEY, '', isString);
  const status = h('p', { class: 'quiet-status' }, area.value ? 'Saved' : '');
  let timer = 0;
  area.addEventListener('input', () => {
    status.textContent = '';
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      writeJson(KEY, area.value);
      status.textContent = 'Saved';
    }, SAVE_DELAY_MS);
  });
  return {
    id: 'notes',
    title: 'Notes',
    body: h('div', { class: 'notes' }, area, status),
    onOpen: () => area.focus(),
  };
}
