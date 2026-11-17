import type { Pace } from '../journey/pace';
import type { OutsideView } from '../view';

/** What every journey is: a view out of the window that also knows the pace the person chose. */
export interface JourneyView extends OutsideView {
  setPace(pace: Pace): void;
}
