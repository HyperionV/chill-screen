import { h } from './dom';
import { JOURNEYS, JOURNEY_ENTRIES, type JourneyId } from '../room/journeys/registry';

/** The journeys on offer, one row each with a line on where it goes; exactly one is picked. */
export function journeyList(current: JourneyId, pick: (id: JourneyId) => void): HTMLElement {
  return h('div', { class: 'journey-list', role: 'radiogroup', 'aria-label': 'Journey' },
    ...JOURNEYS.map((id) => h('button', { class: 'journey-row', role: 'radio', 'aria-checked': String(id === current), onclick: () => pick(id) },
      h('span', { class: 'journey-name' }, JOURNEY_ENTRIES[id].label),
      h('span', { class: 'journey-hint' }, JOURNEY_ENTRIES[id].hint))));
}
