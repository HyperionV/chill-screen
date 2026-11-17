import { h } from './dom';

const GAP = 8;
const EDGE = 8;

export interface Popover {
  /** Opens the card above `anchor`, or closes it if it is already open. */
  toggle(anchor: HTMLElement): void;
  close(): void;
}

/**
 * A small floating card for settings that need no space while closed. It lives on the page itself, so a card with
 * scrolling or clipped contents can still open it, and it closes on Escape or a click anywhere else.
 */
export function createPopover(content: HTMLElement, label: string): Popover {
  const el = h('div', { class: 'popover', role: 'dialog', 'aria-label': label, hidden: true }, content);
  document.body.append(el);
  let anchor: HTMLElement | null = null;

  const close = (): void => {
    el.hidden = true;
    anchor = null;
  };

  const place = (from: HTMLElement): void => {
    const rect = from.getBoundingClientRect();
    const width = el.offsetWidth;
    // Open toward the middle of the screen, so a card on the right edge grows leftward.
    const left = rect.left > innerWidth / 2 ? rect.right - width : rect.left;
    el.style.left = `${Math.max(EDGE, Math.min(left, innerWidth - width - EDGE))}px`;
    el.style.bottom = `${innerHeight - rect.top + GAP}px`;
  };

  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !el.hidden) close();
  });
  addEventListener('pointerdown', (e) => {
    if (!el.hidden && e.target instanceof Node && !el.contains(e.target) && !anchor?.contains(e.target)) close();
  });
  addEventListener('resize', () => anchor && place(anchor));

  return {
    toggle(from) {
      if (!el.hidden && anchor === from) {
        close();
        return;
      }
      anchor = from;
      el.hidden = false;
      place(from);
    },
    close,
  };
}
