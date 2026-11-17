import { clear, h } from './dom';
import { segmented } from './segmented';
import { CLOCK_SIZE_IDS, CONTENT_SIZE_IDS, FONT_IDS, FONTS, SIZES, typography, type SizeId } from '../scene/typography';

/** One group of choices for either the clock or the content: which font, and how big. */
function group(part: 'clock' | 'content', title: string, sizes: readonly SizeId[]): HTMLElement {
  const look = typography[part];
  return h('div', { class: 'type-group' },
    h('span', { class: 'field-label' }, title),
    segmented(`${title} font`, FONT_IDS, look.font, (f) => FONTS[f].label, (font) => typography.set(part, { font })),
    segmented(`${title} size`, sizes, look.size, (s) => SIZES[s].label, (size) => typography.set(part, { size })));
}

/** The Fonts card: the big clock and the content (notes, tasks, panels) each get their own font and size. */
export function createFontsField(): HTMLElement {
  const root = h('div', { class: 'fonts-field' });
  const render = (): void => {
    clear(root);
    root.append(group('clock', 'Clock', CLOCK_SIZE_IDS), group('content', 'Content', CONTENT_SIZE_IDS));
  };
  typography.onChange(render);
  render();
  return root;
}
