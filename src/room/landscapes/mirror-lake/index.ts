import type { NightSky } from '../../night-sky';
import type { OutsideView } from '../../view';
import { LandscapePlaceholder } from '../placeholder';

export function createMirrorLake(_nightSky: NightSky): OutsideView {
  return new LandscapePlaceholder('Mirror Lake');
}
