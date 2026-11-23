import { h } from './dom';

export interface Choice {
  label: string;
  hint: string;
}

/** A list of choices, one row each with a line of detail; exactly one is picked. `below` can add something under the picked row. */
export function choiceList<Id extends string>(
  name: string, ids: readonly Id[], entries: Record<Id, Choice>, current: Id, pick: (id: Id) => void, below?: () => HTMLElement | null,
): HTMLElement {
  return h('div', { class: 'choice-list', role: 'radiogroup', 'aria-label': name },
    ...ids.flatMap((id) => [
      h('button', { class: 'choice-row', role: 'radio', 'aria-checked': String(id === current), onclick: () => pick(id) },
        h('span', { class: 'choice-name' }, entries[id].label),
        h('span', { class: 'choice-hint' }, entries[id].hint)),
      id === current ? below?.() : null,
    ]));
}
