import type { NightSky } from '../../night-sky';
import type { OutsideView } from '../../view';
import { LandscapePlaceholder } from '../placeholder';

export function createCherryGrove(_nightSky: NightSky): OutsideView {
  return new LandscapePlaceholder('Cherry Blossom Grove');
}
