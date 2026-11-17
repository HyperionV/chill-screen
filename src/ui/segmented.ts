import { h } from './dom';

/** A row of choices where exactly one is picked, like radio buttons drawn as a strip. */
export function segmented<T extends string | number>(label: string, options: readonly T[], current: T, name: (v: T) => string, pick: (v: T) => void): HTMLElement {
  return h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': label },
    ...options.map((v) => h('button', { class: 'seg', role: 'radio', 'aria-checked': String(v === current), onclick: () => pick(v) }, name(v))));
}
