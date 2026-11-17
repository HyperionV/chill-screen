import { clear, h, icon } from './dom';
import { ICONS } from './icons';
import { PACES, type Pace } from '../room/journey/pace';
import type { Rotation } from '../room/slideshow';
import { ROTATION_MINUTES, ROTATIONS, SCENES, type SceneKind, type SceneSwitch } from '../scene/scene-switch';
import type { ToolPanel } from './panel';

const SCENE_LABELS: Record<SceneKind, string> = { journey: 'Journey', seaside: 'Seaside', wallpapers: 'Wallpapers', aquarium: 'Aquarium' };
const ROTATION_LABELS: Record<Rotation, string> = { stay: 'Stay', shuffle: 'Shuffle', order: 'In order' };
const PACE_LABELS: Record<Pace, string> = { still: 'Still', slow: 'Slow', gentle: 'Gentle', brisk: 'Brisk' };

/** A word for how hard it is raining, shown beside the slider. */
const rainWord = (level: number): string => (level === 0 ? 'None' : level < 0.35 ? 'Drizzle' : level < 0.7 ? 'Rain' : 'Downpour');

/** A word for how loud the background sound is. */
const soundWord = (level: number): string => (level === 0 ? 'Off' : level < 0.35 ? 'Soft' : level < 0.7 ? 'Medium' : 'Full');

/** The background sound slider: rain, wind, waves and the like, following the scene. */
function soundField(scenery: SceneSwitch): HTMLElement {
  const word = h('span', { class: 'field-value' }, soundWord(scenery.settings.ambience));
  const slider = h('input', {
    type: 'range', class: 'slider', min: 0, max: 100, step: 1, value: Math.round(scenery.settings.ambience * 100), 'aria-label': 'Ambient sound',
  });
  slider.addEventListener('input', () => {
    const level = Number(slider.value) / 100;
    word.textContent = soundWord(level);
    scenery.setAmbience(level);
  });
  return field(h('span', { class: 'field-label-row' }, 'Sound', word), slider);
}

function segmented<T extends string | number>(label: string, options: readonly T[], current: T, name: (v: T) => string, pick: (v: T) => void): HTMLElement {
  return h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': label },
    ...options.map((v) => h('button', { class: 'seg', role: 'radio', 'aria-checked': String(v === current), onclick: () => pick(v) }, name(v))));
}

const field = (label: string | HTMLElement, control: HTMLElement): HTMLElement => h('div', { class: 'field-row' }, h('span', { class: 'field-label' }, label), control);

/** The rain slider. It updates the scene while dragging without rebuilding the panel. */
function rainField(scenery: SceneSwitch): HTMLElement {
  const word = h('span', { class: 'field-value' }, rainWord(scenery.settings.rain));
  const slider = h('input', {
    type: 'range', class: 'slider', min: 0, max: 100, step: 1, value: Math.round(scenery.settings.rain * 100), 'aria-label': 'Rain',
  });
  slider.addEventListener('input', () => {
    const level = Number(slider.value) / 100;
    word.textContent = rainWord(level);
    scenery.setRain(level);
  });
  return field(h('span', { class: 'field-label-row' }, 'Rain', word), slider);
}

/** The Scenery panel: pick the scene, set the rain, manage wallpapers and how they rotate. */
export function createSceneryPanel(scenery: SceneSwitch): ToolPanel {
  const body = h('div', { class: 'scenery' });
  const status = h('p', { class: 'quiet-status', 'aria-live': 'polite' });
  const picker = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
  const thumbUrls = new Map<string, string>();

  const add = async (files: File[]): Promise<void> => {
    if (!files.length) return;
    status.textContent = files.length === 1 ? 'Adding 1 picture' : `Adding ${files.length} pictures`;
    const { added, skipped } = await scenery.add(files);
    status.textContent = [
      added ? `Added ${added}` : '',
      skipped.length ? `Could not open ${skipped.join(', ')}` : '',
    ].filter(Boolean).join('. ');
  };
  picker.addEventListener('change', () => {
    void add([...(picker.files ?? [])]);
    picker.value = '';
  });

  const thumbOf = (id: string, blob: Blob): string => {
    let url = thumbUrls.get(id);
    if (!url) {
      url = URL.createObjectURL(blob);
      thumbUrls.set(id, url);
    }
    return url;
  };

  const render = (): void => {
    const s = scenery.settings;
    const kept = new Set(scenery.wallpapers.map((w) => w.id));
    for (const [id, url] of thumbUrls) {
      if (kept.has(id)) continue;
      URL.revokeObjectURL(url);
      thumbUrls.delete(id);
    }
    clear(body);
    body.append(field('Scene', segmented('Scene', SCENES, s.scene, (v) => SCENE_LABELS[v], (scene) => scenery.update({ scene }))));
    body.append(soundField(scenery));
    if (s.scene === 'aquarium') return;
    body.append(rainField(scenery));
    if (s.scene === 'journey') {
      body.append(field('Pace', segmented('Pace', PACES, s.pace, (pace) => PACE_LABELS[pace], (pace) => scenery.update({ pace }))));
    }
    if (s.scene === 'journey' || s.scene === 'seaside') {
      body.append(h('p', { class: 'hint' }, s.scene === 'journey'
        ? 'Forest, meadow, lake and autumn woods at your pace. Move the pointer over the grass to startle the animals, and across the glass to wipe it.'
        : 'Move the pointer across the glass to wipe it.'));
      return;
    }

    const grid = h('div', { class: 'thumbs' },
      ...scenery.wallpapers.map((w) => h('figure', { class: w.id === s.wallpaper ? 'thumb active' : 'thumb' },
        h('button', { class: 'thumb-pick', 'aria-label': `Show ${w.name}`, title: w.name, 'aria-pressed': String(w.id === s.wallpaper), onclick: () => scenery.choose(w.id) },
          h('img', { src: thumbOf(w.id, w.thumb), alt: '', loading: 'lazy', draggable: 'false' })),
        h('button', { class: 'thumb-remove', 'aria-label': `Remove ${w.name}`, title: 'Remove', onclick: () => void scenery.remove(w.id) }, icon(ICONS.close)),
      )),
      h('button', { class: 'thumb add', 'aria-label': 'Add pictures', title: 'Add pictures', onclick: () => picker.click() }, icon(ICONS.plus)),
    );
    body.append(grid, picker, h('p', { class: 'hint' }, scenery.wallpapers.length
      ? 'Pick one to show it. Drop pictures anywhere on the screen to add more; they show as pixel art, darker ones at night.'
      : 'Add wallpapers you love, or drop them anywhere on the screen. The journey shows until then.'));
    if (!scenery.wallpapers.length) {
      body.append(status);
      return;
    }
    body.append(field('Change', segmented('Change', ROTATIONS, s.rotation, (r) => ROTATION_LABELS[r], (rotation) => scenery.update({ rotation }))));
    if (s.rotation !== 'stay') {
      body.append(field('Change every', segmented('Change every', ROTATION_MINUTES, s.every, (m) => `${m} min`, (every) => scenery.update({ every }))));
    }
    body.append(h('div', { class: 'scenery-actions' },
      h('button', { class: 'btn', onclick: () => scenery.next() }, icon(ICONS.next), 'Next wallpaper'),
      status,
    ));
  };

  scenery.onChange(render);
  mountDropZone((files) => void add(files));
  render();
  return { id: 'scenery', title: 'Scenery', icon: ICONS.scenery, body };
}

/** Lets pictures be dropped anywhere on the screen, with a quiet frame showing where they will go. */
function mountDropZone(add: (files: File[]) => void): void {
  const zone = h('div', { class: 'drop-zone', 'aria-hidden': 'true' }, h('p', {}, 'Drop to add wallpapers'));
  document.body.append(zone);
  const hasFiles = (e: DragEvent): boolean => e.dataTransfer?.types.includes('Files') ?? false;
  addEventListener('dragover', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    zone.classList.add('on');
  });
  addEventListener('dragleave', (e) => {
    if (e.relatedTarget === null) zone.classList.remove('on');
  });
  addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    zone.classList.remove('on');
    add([...(e.dataTransfer?.files ?? [])]);
  });
}
