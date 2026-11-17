import { h } from './dom';
import { createNotesPanel } from './notes';
import type { Reminders } from './reminders';
import { createTasksPanel } from './tasks';

const card = (title: string, body: HTMLElement, grow: boolean): HTMLElement =>
  h('section', { class: grow ? 'side-card grow' : 'side-card', 'aria-label': title },
    h('h2', { class: 'panel-title side-card-title' }, title),
    h('div', { class: 'side-card-body' }, body));

export interface SideCards {
  columns: HTMLElement[];
  /** Puts the timer back in its card (the dock's panel borrows it in Zen mode). */
  returnTimer(): void;
}

/**
 * Business mode's two columns: notes with the timer below on the left, tasks with the reminders below on the right.
 * The style sheet shows them only in that mode.
 */
export function createSideCards(timerBody: HTMLElement, reminders: Reminders): SideCards {
  const timerCard = card('Timer', timerBody, false);
  // The task list already says how many are open, so the open count needs no second home.
  const left = h('div', { class: 'side-col left' }, card('Notes', createNotesPanel().body, true), timerCard);
  const right = h('div', { class: 'side-col right' }, card('Tasks', createTasksPanel(() => undefined).body, true), card('Reminders', reminders.body, false));
  const timerSlot = timerCard.querySelector('.side-card-body');
  return {
    columns: [left, right],
    returnTimer: () => {
      timerSlot?.append(timerBody);
      timerBody.hidden = false;
    },
  };
}
