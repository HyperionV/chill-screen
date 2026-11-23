import type { NightSky } from '../../night-sky';
import type { OutsideView } from '../../view';
import { GravityFallsLandscape } from './view';

export function createGravityFalls(nightSky: NightSky): OutsideView {
  return new GravityFallsLandscape(nightSky);
}
