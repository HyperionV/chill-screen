import type { NightSky } from '../../night-sky';
import type { OutsideView } from '../../view';
import { CherryGrove } from './view';

export function createCherryGrove(_nightSky: NightSky): OutsideView {
  return new CherryGrove(_nightSky);
}
