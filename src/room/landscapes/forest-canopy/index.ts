import type { NightSky } from '../../night-sky';
import type { OutsideView } from '../../view';
import { ForestCanopy } from './view';

export function createForestCanopy(nightSky: NightSky): OutsideView {
  return new ForestCanopy(nightSky);
}
