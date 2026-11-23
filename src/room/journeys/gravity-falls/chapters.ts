import { ramp } from '../noise';
import type { Chapter } from '../route';
import type { Station } from './world';

/** The five places in the order of the story: shack, woods, town, lake, hidden. */
const CHAPTER_NAMES = ['Morning at the Shack', 'The Gnome Trail', 'Main Street', 'The Lakeshore', 'The Hidden Hollow'] as const;

export const CHAPTER_SECONDS = 240;
/** The last seconds of a chapter, in which the next place fades in and the cast changes over at the half point. */
export const DISSOLVE_SECONDS = 12;

export const CHAPTERS: readonly Chapter[] = CHAPTER_NAMES.map((name) => ({ name, seconds: CHAPTER_SECONDS }));

/** The calm walking speed the worlds are designed for, in design pixels a second (at the normal pace). */
export const WALK_SPEED = 9;
/** A walk starts and stops gently: speed rises and falls over this many seconds. */
const EASE_SECONDS = 4;

/** Returned by `pauseAt` while the camera is walking. */
export const NO_STATION = -1;

/** The distance covered while speed rises from rest to full over the ease (a smoothstep's integral, scaled), as a share of `EASE_SECONDS * speed`. */
const easeDistance = (u: number): number => u * u * u - (u * u * u * u) / 2;

/**
 * Distance walked `age` seconds into a walk of `duration` seconds covering `distance`: it eases in, strolls at a steady
 * speed and eases out. A walk too short for both eases is a plain smooth glide.
 */
function walked(age: number, duration: number, distance: number): number {
  if (duration <= 0) return distance;
  if (duration <= EASE_SECONDS * 2) return distance * ramp(0, 1, age / duration);
  const speed = distance / (duration - EASE_SECONDS);
  if (age < EASE_SECONDS) return speed * EASE_SECONDS * easeDistance(age / EASE_SECONDS);
  if (age > duration - EASE_SECONDS) return distance - speed * EASE_SECONDS * easeDistance((duration - age) / EASE_SECONDS);
  return speed * (age - EASE_SECONDS / 2);
}

/** After the last station: eases away and then strolls at `WALK_SPEED` until the chapter ends. */
function walkedOnward(age: number): number {
  if (age < EASE_SECONDS) return WALK_SPEED * EASE_SECONDS * easeDistance(age / EASE_SECONDS);
  return WALK_SPEED * (age - EASE_SECONDS / 2);
}

/**
 * Where the camera's left edge is (world design pixels) at a point of the chapter (0..1): it starts at 0, walks to
 * each station and rests there for the station's pause, then walks on at a calm pace until the chapter ends.
 */
export function cameraAt(chapterT: number, stations: readonly Station[]): number {
  const seconds = chapterT * CHAPTER_SECONDS;
  let restedAt = 0;
  let restedUntil = 0;
  for (let i = 0; i < stations.length; i++) {
    const station = stations[i];
    const pauseStart = station.from * CHAPTER_SECONDS;
    if (seconds < pauseStart) {
      return restedAt + walked(seconds - restedUntil, pauseStart - restedUntil, station.at - restedAt);
    }
    const pauseEnd = station.to * CHAPTER_SECONDS;
    if (seconds <= pauseEnd) return station.at;
    restedAt = station.at;
    restedUntil = pauseEnd;
  }
  return restedAt + walkedOnward(seconds - restedUntil);
}

/** The station whose pause is on at this point of the chapter, or `NO_STATION` while the camera walks. */
export function pauseAt(chapterT: number, stations: readonly Station[]): number {
  for (let i = 0; i < stations.length; i++) {
    if (chapterT >= stations[i].from && chapterT <= stations[i].to) return i;
  }
  return NO_STATION;
}
