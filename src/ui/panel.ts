import { h, icon } from './dom';
import { ICONS } from './icons';

export interface Panel {
  id: string;
  title: string;
  body: HTMLElement;
  /** Called each time the panel opens, e.g. to focus its input. */
  onOpen?(): void;
}

/** A panel with a button in the dock. */
export interface ToolPanel extends Panel {
  icon: string;
}

/** One side panel open at a time, sliding in over the right edge of the tank. */
export class PanelHost {
  readonly el: HTMLElement;
  private readonly titleEl = h('h2', { class: 'panel-title' });
  private readonly content = h('div', { class: 'panel-body' });
  private current: Panel | null = null;
  private readonly listeners = new Set<(id: string | null) => void>();

  constructor() {
    const close = h('button', { class: 'icon-btn', 'aria-label': 'Close panel', title: 'Close (Esc)', onclick: () => this.close() }, icon(ICONS.close));
    this.el = h('aside', { class: 'panel', 'aria-hidden': 'true' }, h('header', { class: 'panel-head' }, this.titleEl, close), this.content);
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.current) this.close();
    });
  }

  get openId(): string | null {
    return this.current?.id ?? null;
  }

  onChange(fn: (id: string | null) => void): void {
    this.listeners.add(fn);
  }

  toggle(panel: Panel): void {
    if (this.current === panel) this.close();
    else this.open(panel);
  }

  open(panel: Panel): void {
    this.current = panel;
    this.titleEl.textContent = panel.title;
    // Bodies stay in the page once shown, so a playing video is not torn down when another panel opens.
    if (panel.body.parentElement !== this.content) this.content.append(panel.body);
    for (const body of this.content.querySelectorAll<HTMLElement>(':scope > *')) body.hidden = body !== panel.body;
    this.el.classList.add('open');
    this.el.setAttribute('aria-hidden', 'false');
    panel.onOpen?.();
    this.emit();
  }

  close(): void {
    this.current = null;
    this.el.classList.remove('open');
    this.el.setAttribute('aria-hidden', 'true');
    this.emit();
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.openId);
  }
}
