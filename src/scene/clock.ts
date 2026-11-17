import { readJson, writeJson } from '../store';

const KEY = 'chillscreen.time';
const HOUR_MS = 3_600_000;

/** How fast the sky's clock runs, as a multiple of real time. 1 is the same pace as the wall clock; 0 holds the sky still. */
export const TIME_SPEEDS = [0, 1, 10, 60, 360] as const;
export type TimeSpeed = (typeof TIME_SPEEDS)[number];

/** The sky's clock when it is not simply following the wall clock: a time of day that moves at `speed` from the moment `at`. */
interface Anchor {
  hour: number;
  at: number;
  speed: TimeSpeed;
}

const isAnchor = (v: unknown): v is Anchor =>
  typeof v === 'object' && v !== null &&
  'hour' in v && typeof v.hour === 'number' && v.hour >= 0 && v.hour < 24 &&
  'at' in v && typeof v.at === 'number' &&
  'speed' in v && TIME_SPEEDS.some((s) => s === v.speed);

const wallClockHour = (): number => {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
};
const wrap = (hour: number): number => ((hour % 24) + 24) % 24;

/** Null means live: the sky follows the wall clock. */
let anchor: Anchor | null = readJson<Anchor | null>(KEY, null, (v): v is Anchor | null => v === null || isAnchor(v));

const save = (): void => writeJson(KEY, anchor);

/** Hour of day as a fraction (13.5 = half past one), overridable with ?hour=21 to preview another time. */
export function hourNow(): number {
  const forced = new URLSearchParams(location.search).get('hour');
  if (forced !== null && !Number.isNaN(Number(forced))) return Number(forced);
  if (!anchor) return wallClockHour();
  return wrap(anchor.hour + ((Date.now() - anchor.at) / HOUR_MS) * anchor.speed);
}

/** The speed the sky is running at, or null while it follows the wall clock. */
export const timeSpeed = (): TimeSpeed | null => anchor?.speed ?? null;

/** Sets the speed from the current moment of the sky, so it never jumps. */
export function setTimeSpeed(speed: TimeSpeed): void {
  anchor = { hour: hourNow(), at: Date.now(), speed };
  save();
}

/** Moves the sky to an hour (0 to 24), keeping its speed. */
export function setHour(hour: number): void {
  anchor = { hour: wrap(hour), at: Date.now(), speed: anchor?.speed ?? 0 };
  save();
}

/** Back to the wall clock. */
export function goLive(): void {
  anchor = null;
  save();
}
