/** Shared vocabulary of the Gravity Falls Journey and Landscape: who is in the cast, how they talk, what can be found. */

/** Everyone who can stand in a scene. Pixel designs and names are a fan homage. */
export const CAST_IDS = [
  'dipper', 'mabel', 'stan', 'soos', 'wendy', 'waddles', 'bill',
  'mcgucket', 'blubs', 'durland', 'susan', 'pacifica', 'gideon',
  'gnome-a', 'gnome-b', 'gnome-chief', 'lake-monster',
] as const;
export type CastId = (typeof CAST_IDS)[number];

/** The five places both views visit, in order. A chapter of either view is one place. */
export const PLACES = ['shack', 'woods', 'town', 'lake', 'hidden'] as const;
export type PlaceId = (typeof PLACES)[number];

export type Facing = 1 | -1;

/**
 * How a character fills a quiet moment. The performer code turns each into a small loop:
 * breathe = 1px rise and fall, bounce = lively hops, sway = slow side lean, read = holds the act pose with now and then a glance,
 * lean = rests on the act pose, trot = small walks to and fro, hover = floats up and down, bob = gentle bob (creatures in water).
 */
export type IdleStyle = 'breathe' | 'bounce' | 'sway' | 'read' | 'lean' | 'trot' | 'hover' | 'bob' | 'still';

/** One character's pictures. Every frame has the same size, the feet on the bottom row and the body centred, facing right. */
export interface CastSprites {
  stand: HTMLCanvasElement;
  /** The two stepping frames of a walk (alternated while moving). */
  step: readonly [HTMLCanvasElement, HTMLCanvasElement];
  /** The character's own signature pose: used for pointing, cheering, reading, leaning. */
  act: HTMLCanvasElement;
}
export type CastArt = Readonly<Record<CastId, CastSprites>>;

/** What a character does while they say a line (the performer maps these to a pose, a hop, a shake or a small mark over the head). */
export type Emote = 'surprise' | 'think' | 'laugh' | 'scared' | 'point' | 'cheer' | 'shrug';

export interface Reaction {
  who: CastId;
  emote: Emote;
}

/**
 * One spoken line. Text uses only the pixel font's characters: letters, digits, space and . , - : ! ? ' ( ) & / + * [ ]
 * (no double quotes, no semicolons, no accents). About 60 characters at most; the bubble wraps by itself.
 */
export interface Line {
  who: CastId;
  text: string;
  emote?: Emote;
  /** A listener reacting while this line is spoken. */
  react?: Reaction;
}

/**
 * How the speakers come together:
 * here = they stay where they are and face each other (they must already stand near each other),
 * approach = the first in `cast` walks over and stands beside the second,
 * gather = everyone walks to the nearest free meeting spot of the scene.
 */
export type Meet = 'here' | 'approach' | 'gather';

export interface Script {
  /** Unique across all scripts, e.g. 'shack-register-01'. */
  id: string;
  place: PlaceId;
  /** Everyone who takes part. A script is only played when all of them are in the scene (and, in a view that scrolls, on screen). */
  cast: readonly CastId[];
  meet: Meet;
  /** True when it suits the travelling party chatting as they walk (Journey only; needs no spot). */
  walking?: true;
  lines: readonly Line[];
}

export interface Point {
  x: number;
  y: number;
}

/** Where a character starts and idles in a scene. Coordinates are stage pixels (feet, bottom-centre) in the view's own space. */
export interface PerformerHome {
  id: CastId;
  x: number;
  y: number;
  facing: Facing;
  /** Journey only: while the world scrolls, the performer keeps this many pixels right of the camera's left edge. */
  followDx?: number;
}

/** What a scene gives the shared performers: who is there, where they meet to talk, which clues can be found. */
export interface ScenePlan {
  homes: readonly PerformerHome[];
  /** Meeting points for `gather` scripts (feet positions); keep them out of the radio band. */
  spots: readonly Point[];
  clues: readonly Clue[];
}

export type ClueKind = 'symbol' | 'note' | 'page' | 'door' | 'peek';

/** Something to find and click. x, y is the centre of its hit box in the view's own space; w, h are its size (at least 10 x 10). */
export interface Clue {
  /** Unique across the whole story, e.g. 'shack-symbol'. */
  id: string;
  kind: ClueKind;
  place: PlaceId;
  x: number;
  y: number;
  w: number;
  h: number;
}
