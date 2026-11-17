import type { NightSky } from '../../night-sky';
import type { OutsideView } from '../../view';
import { InterstellarView } from './interstellar-view';

export function createInterstellar(_nightSky: NightSky): OutsideView {
  return new InterstellarView();
}
