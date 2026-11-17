import { h } from './dom';
import { createNotesPanel } from './notes';
import { createTasksPanel } from './tasks';

const card = (side: 'left' | 'right', title: string, body: HTMLElement): HTMLElement =>
  h('section', { class: `side-card ${side}`, 'aria-label': title },
    h('h2', { class: 'panel-title side-card-title' }, title),
    h('div', { class: 'side-card-body' }, body));

/** Business mode's two cards: the notes on the left, the tasks on the right. The style sheet shows them only in that mode. */
export function createSideCards(): HTMLElement[] {
  // The task list already says how many are open, so the open count needs no second home.
  return [card('left', 'Notes', createNotesPanel().body), card('right', 'Tasks', createTasksPanel(() => undefined).body)];
}
