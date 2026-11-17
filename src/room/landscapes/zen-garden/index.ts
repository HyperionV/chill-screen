import type { NightSky } from '../../night-sky';
import type { OutsideView } from '../../view';
import { ZenGarden } from './view';

export function createZenGarden(_nightSky: NightSky): OutsideView {
  return new ZenGarden(_nightSky);
}
