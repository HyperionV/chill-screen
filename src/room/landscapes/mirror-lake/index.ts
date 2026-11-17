import type { NightSky } from '../../night-sky';
import type { OutsideView } from '../../view';
import { MirrorLake } from './view';

export function createMirrorLake(_nightSky: NightSky): OutsideView {
  return new MirrorLake(_nightSky);
}
