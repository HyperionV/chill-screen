import { clear, h, icon } from './dom';
import { ICONS } from './icons';
import { readJson, writeJson } from '../store';
import type { Panel } from './panel';

const KEY = 'chillscreen.tasks';

interface Task {
  id: string;
  text: string;
  done: boolean;
}

const isTaskList = (v: unknown): v is Task[] =>
  Array.isArray(v) &&
  v.every((t: unknown) =>
    typeof t === 'object' && t !== null &&
    'id' in t && typeof t.id === 'string' &&
    'text' in t && typeof t.text === 'string' &&
    'done' in t && typeof t.done === 'boolean');

/** A short to-do list: add, tick off, remove, clear what is done. */
export function createTasksPanel(onCountChange: (open: number) => void): Panel {
  let tasks = readJson<Task[]>(KEY, [], isTaskList);
  const input = h('input', { class: 'field', type: 'text', placeholder: 'Add a task and press Enter', 'aria-label': 'New task', maxlength: 200 });
  const list = h('ul', { class: 'task-list' });
  const footer = h('div', { class: 'task-footer' });

  const commit = (): void => {
    writeJson(KEY, tasks);
    render();
  };

  const render = (): void => {
    clear(list);
    for (const t of tasks) {
      const box = h('input', { type: 'checkbox', class: 'check', 'aria-label': `Done: ${t.text}`, onchange: () => { t.done = !t.done; commit(); } });
      box.checked = t.done;
      list.append(
        h('li', { class: t.done ? 'task done' : 'task' },
          h('label', { class: 'task-main' }, box, h('span', { class: 'task-text' }, t.text)),
          h('button', { class: 'icon-btn ghost', 'aria-label': `Remove ${t.text}`, title: 'Remove', onclick: () => { tasks = tasks.filter((x) => x !== t); commit(); } }, icon(ICONS.trash)),
        ),
      );
    }
    const open = tasks.filter((t) => !t.done).length;
    const done = tasks.length - open;
    clear(footer);
    if (tasks.length === 0) footer.append(h('p', { class: 'quiet-status' }, 'Nothing on the list. Enjoy the water.'));
    else {
      footer.append(h('p', { class: 'quiet-status' }, `${open} open`));
      if (done > 0) footer.append(h('button', { class: 'text-btn', onclick: () => { tasks = tasks.filter((t) => !t.done); commit(); } }, `Clear ${done} done`));
    }
    onCountChange(open);
  };

  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const text = input.value.trim();
    if (!text) return;
    tasks.push({ id: crypto.randomUUID(), text, done: false });
    input.value = '';
    commit();
  });

  render();
  return {
    id: 'tasks',
    title: 'Tasks',
    icon: ICONS.tasks,
    body: h('div', { class: 'tasks' }, input, list, footer),
    onOpen: () => input.focus(),
  };
}
