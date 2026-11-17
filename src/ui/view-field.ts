import { clear, h } from './dom';
import { segmented } from './segmented';
import { frameSetting } from '../scene/frame-setting';

/** The View card: keep the room around the view (window, sill and radio), or show only the view with a floating player. */
export function createViewField(): HTMLElement {
  const root = h('div', { class: 'view-field' });
  const render = (): void => {
    clear(root);
    root.append(
      h('span', { class: 'field-label' }, 'Window frame'),
      segmented('Window frame', ['keep', 'hide'] as const, frameSetting.framed ? 'keep' : 'hide', (v) => (v === 'keep' ? 'Keep' : 'Hide'), (v) => frameSetting.set(v === 'keep')),
      h('p', { class: 'hint' }, frameSetting.framed
        ? 'The view is seen through a window, with the radio on the sill.'
        : 'The view fills the screen, and the radio becomes a floating player.'));
  };
  frameSetting.onChange(render);
  render();
  return root;
}
