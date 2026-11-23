import type { Chapter } from '../../journeys/route';
import type { SceneBuilder } from './scene-art';
import { buildHidden } from './hidden';
import { buildLake } from './lake';
import { buildShack } from './shack';
import { buildTown } from './town';
import { buildWoods } from './woods';

/** How long each place stays on show, and how long it takes to dissolve into the next one. */
export const SCENE_SECONDS = 210;
export const DISSOLVE_SECONDS = 10;

/** The woods are painted with their ground low on the page, so the sill would hide the gnome village. */
const WOODS_EXTRA_LIFT = 14;

interface SceneEntry {
  name: string;
  build: SceneBuilder;
  /** Rows a scene drawn low on the page lifts beyond the shared lift (see `sceneLift`). */
  extraLift: number;
}

/**
 * The places in story order: the position here is the position in `PLACES` (shack, woods, town, lake, hidden), because the
 * cast, the conversations and the clues of a chapter are looked up by that place. Add a place by adding its line.
 */
export const SCENES: readonly SceneEntry[] = [
  { name: 'The Mystery Shack', build: buildShack, extraLift: 0 },
  { name: 'Gnome Woods', build: buildWoods, extraLift: WOODS_EXTRA_LIFT },
  { name: 'Water Tower Hill', build: buildTown, extraLift: 0 },
  { name: 'The Lake', build: buildLake, extraLift: 0 },
  { name: 'The Hidden Hollow', build: buildHidden, extraLift: 0 },
];

export const CHAPTERS: readonly Chapter[] = SCENES.map((scene) => ({ name: scene.name, seconds: SCENE_SECONDS }));
