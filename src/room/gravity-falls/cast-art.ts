import { buildCreatureArt } from './cast-art-creatures';
import { buildFamilyArt } from './cast-art-family';
import { buildTownArt } from './cast-art-town';
import { CAST_IDS, type CastArt, type CastId } from './types';

/** The drawn height of each character in stage pixels, for hit boxes and for placing speech above the head. */
export const CAST_HEIGHT: Readonly<Record<CastId, number>> = {
  dipper: 22,
  mabel: 22,
  stan: 26,
  soos: 28,
  wendy: 28,
  waddles: 10,
  bill: 18,
  mcgucket: 24,
  blubs: 26,
  durland: 28,
  susan: 24,
  pacifica: 24,
  gideon: 20,
  'gnome-a': 13,
  'gnome-b': 13,
  'gnome-chief': 16,
  'lake-monster': 22,
};

/** Draws every character once. Throws, naming the character, if a frame differs in size from its stand frame or from the expected height. */
export function buildCastArt(): CastArt {
  const art: CastArt = { ...buildFamilyArt(), ...buildTownArt(), ...buildCreatureArt() };
  for (const id of CAST_IDS) {
    const { stand, step, act } = art[id];
    const frames = [step[0], step[1], act];
    const mismatched = frames.some((frame) => frame.width !== stand.width || frame.height !== stand.height);
    if (mismatched) throw new Error(`Cast art "${id}": the frames are not all ${stand.width} x ${stand.height}`);
    if (stand.height !== CAST_HEIGHT[id]) {
      throw new Error(`Cast art "${id}": drawn ${stand.height} tall but CAST_HEIGHT says ${CAST_HEIGHT[id]}`);
    }
  }
  return art;
}
