import { h, icon } from './dom';
import { PanelHost, type Panel } from './panel';
import { createNotesPanel } from './notes';
import { createSceneryPanel } from './scenery';
import { createTasksPanel } from './tasks';
import { createTimerPanel } from './timer';
import type { SceneSwitch } from '../scene/scene-switch';

/** The controls fade away after this long without the pointer moving, leaving only the scene. */
const IDLE_MS = 3500;

/** Builds the overlay: the dock at the bottom and the one side panel it opens. */
export function mountUi(root: HTMLElement, scenery: SceneSwitch): void {
  const host = new PanelHost();
  const taskCount = h('span', { class: 'dock-count' });
  const timerBadge = h('span', { class: 'dock-badge', hidden: true });

  const panels: Panel[] = [
    createSceneryPanel(scenery),
    createNotesPanel(),
    createTasksPanel((open) => (taskCount.textContent = open ? String(open) : '')),
    createTimerPanel((label) => {
      timerBadge.textContent = label ?? '';
      timerBadge.hidden = label === null;
    }),
  ];
  const extras: Record<string, HTMLElement> = { tasks: taskCount, timer: timerBadge };

  const buttons = panels.map((p) => {
    const b = h('button', { class: 'dock-btn', 'aria-label': p.title, title: p.title, 'aria-pressed': 'false', onclick: () => host.toggle(p) }, icon(p.icon), extras[p.id]);
    b.dataset.id = p.id;
    return b;
  });
  const dock = h('nav', { class: 'dock', 'aria-label': 'Tools' }, ...buttons);
  host.onChange((id) => {
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.id === id));
    wake();
  });

  let idleTimer = 0;
  function wake(): void {
    document.body.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      if (!host.openId && !dock.matches(':hover')) document.body.classList.add('idle');
    }, IDLE_MS);
  }
  addEventListener('pointermove', wake);
  addEventListener('keydown', wake);
  wake();

  root.append(host.el, dock);
}
