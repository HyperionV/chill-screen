/**
 * What moves in the Hidden Hollow by day and by night, apart from the lights: pines and grass swaying in the wind, the
 * valley mist, glints on the far lake, twinkling stars, crows by day and bats at dusk, the little owl and falling
 * leaves. Cheap per frame: a handful of small shapes and a few image copies, no allocations.
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { bayer, rect, type Ctx } from '../../gravity-falls/art-kit';
import { drawGrass, drawSwayTree, fadePalette, pineTree } from '../../gravity-falls/art-trees';
import { hash } from '../../journeys/noise';
import { breeze } from '../../wind';
import { HAZE, PINE_TWILIGHT, landTop, type HiddenLayout } from './hidden-layout';

const SWAY_FAR = 1;
const SWAY_NEAR = 2;
const TUFT_GAP = 7;
/** Foreground tufts stand with their feet this low, so the tips just clear the sill. */
const FRONT_TUFT_ROW = 246;
const MIST_HEIGHT = 12;
const MIST_ROW = 178;
const MIST_SPEED = 1.4;
const MIST_COLOUR = '#d6d0f4';
const STARS = 26;
const STAR_TOP = 50;
const STAR_ROWS = 52;
const STAR_SPEED = 0.8;
const FLYERS = 4;
const FLYER_ROW = 58;
const CROW_INK = '#4a4690';
const BAT_INK = '#2a2456';
/** Night level above which the crows have gone and the bats are out. */
const BAT_FROM = 0.45;
const LEAVES = 6;
const LEAF_COLOURS = ['#c9a8ff', '#f0c870'];
const OWL = { body: '#8a78a8', dark: '#463a62', belly: '#c6c2e6', eye: '#ffe08a', width: 5, height: 6 } as const;
/** Every so often the owl looks to one side for a moment, and now and then it blinks. */
const OWL_LOOK_PERIOD = 11;
const OWL_LOOK_SECONDS = 2;
const OWL_BLINK_PERIOD = 4.3;
const OWL_BLINK_SECONDS = 0.2;

export interface MidTree {
  sprite: HTMLCanvasElement;
  x: number;
  y: number;
  amount: number;
}

export interface Tuft {
  x: number;
  y: number;
  variant: number;
}

export interface Star {
  x: number;
  y: number;
  phase: number;
}

interface TreeSpot {
  share: number;
  height: number;
  /** Row of the trunk foot; the bank's own top edge when left out. */
  foot?: number;
  variant: number;
}

/** The swaying pines: tall ones on the bank and at the right, short hazy ones along the crest in the middle. */
const TREE_SPOTS: readonly TreeSpot[] = [
  { share: 0.02, height: 96, variant: 0 }, { share: 0.095, height: 70, variant: 1 }, { share: 0.215, height: 84, variant: 3 },
  { share: 0.275, height: 58, variant: 2 }, { share: 0.32, height: 40, variant: 1 },
  { share: 0.36, height: 26, foot: 194, variant: 1 }, { share: 0.43, height: 22, foot: 193, variant: 3 },
  { share: 0.5, height: 24, foot: 195, variant: 0 }, { share: 0.57, height: 22, foot: 194, variant: 2 },
  { share: 0.63, height: 26, foot: 196, variant: 1 },
  { share: 0.725, height: 70, foot: 203, variant: 1 }, { share: 0.8, height: 96, foot: 201, variant: 0 },
  { share: 0.955, height: 108, foot: 207, variant: 3 }, { share: 0.99, height: 100, foot: 206, variant: 2 },
];
/** Trees shorter than this are far away and sink into the haze. */
const FAR_HEIGHT = 60;
const FAR_FADE = 0.3;

export function buildTrees(layout: HiddenLayout): MidTree[] {
  const { width } = layout;
  return TREE_SPOTS.map((spot) => {
    const x = Math.round(spot.share * width);
    const far = spot.height < FAR_HEIGHT;
    const palette = far ? fadePalette(PINE_TWILIGHT, HAZE, FAR_FADE) : PINE_TWILIGHT;
    return { sprite: pineTree(spot.variant, spot.height, palette), x, y: spot.foot ?? landTop(width, x) + 4, amount: far ? SWAY_FAR : SWAY_NEAR };
  });
}

export function drawTrees(ctx: Ctx, trees: readonly MidTree[], time: number): void {
  for (const t of trees) drawSwayTree(ctx, t.sprite, t.x, t.y, time, t.amount);
}

/**
 * Where grass tufts grow: `back` tufts stand in the lawn behind the cast (clear of the bank and the door steps),
 * `front` tufts along the sill (drawn over the cast), the middle left bare so the radio stays clear.
 */
export function scatterTufts(layout: HiddenLayout): { back: Tuft[]; front: Tuft[] } {
  const { width, edge, door } = layout;
  const back: Tuft[] = [];
  const front: Tuft[] = [];
  for (let x = 2, i = 0; x < width; x += TUFT_GAP, i++) {
    const variant = Math.floor(hash(i + 70) * 6);
    const onLawn = x > edge && x > door.x + 44;
    if (onLawn) back.push({ x, y: landTop(width, x) + 12 + Math.round(hash(i * 2.1) * 14), variant });
    if (x < width * 0.35 || x > width * 0.65) front.push({ x: x + 2, y: FRONT_TUFT_ROW - Math.round(hash(i * 4.3) * 3), variant });
  }
  return { back, front };
}

export function drawTufts(ctx: Ctx, sheet: HTMLCanvasElement, tufts: readonly Tuft[], time: number, amount: number): void {
  for (const t of tufts) drawGrass(ctx, sheet, t.x, t.y, t.variant, time, amount);
}

/** A band of valley mist that wraps around: soft dithered banks, built once and slid sideways. */
export function buildMist(width: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, MIST_HEIGHT);
  const turn = (Math.PI * 2) / width;
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < MIST_HEIGHT; y++) {
      const banks = (0.5 + 0.5 * Math.sin(x * turn * 3 + y * 0.4)) * (0.5 + 0.5 * Math.sin(x * turn * 5 + 1.3));
      const middle = 1 - Math.abs(y - MIST_HEIGHT / 2) / (MIST_HEIGHT / 2);
      if (bayer(x, y) < banks * middle * 0.9) rect(ctx, MIST_COLOUR, x, y, 1, 1);
    }
  }
  return canvas;
}

export function drawMist(ctx: Ctx, mist: HTMLCanvasElement, time: number, night: number): void {
  const offset = Math.round((time * MIST_SPEED) % mist.width);
  const before = ctx.globalAlpha;
  ctx.globalAlpha = before * (0.35 + 0.15 * night);
  ctx.drawImage(mist, -offset, MIST_ROW);
  ctx.drawImage(mist, mist.width - offset, MIST_ROW);
  ctx.globalAlpha = before;
}

/** Faint glints that wander over the far lake and come and go. */
export function drawLakeGlints(ctx: Ctx, layout: HiddenLayout, time: number): void {
  const { lake, width } = layout;
  const reach = Math.max(10, Math.round(width * 0.09)) * 0.6;
  const before = ctx.globalAlpha;
  for (let i = 0; i < 3; i++) {
    const strength = Math.sin(time * 0.5 + i * 2.2);
    if (strength <= 0.2) continue;
    ctx.globalAlpha = before * strength * 0.7;
    rect(ctx, '#f0f4ff', lake.x + Math.sin(i * 2.1 + time * 0.1) * reach, lake.y - 1 + (i % 2), 2, 1);
  }
  ctx.globalAlpha = before;
}

/** Stars placed once over the high sky, outside the clock's patch. */
export function scatterStars(layout: HiddenLayout): Star[] {
  const { width } = layout;
  return Array.from({ length: STARS }, (_, i) => ({ x: Math.round(hash(i * 3.7) * width), y: STAR_TOP + Math.round(hash(i * 5.3 + 1) * STAR_ROWS), phase: hash(i + 31) * 6 }));
}

/**
 * Twinkling stars that brighten towards night, drawn behind whatever is already on the picture (so hills and trees hide
 * them). The brightest ones flare into a small cross at their peak.
 */
export function drawStars(ctx: Ctx, stars: readonly Star[], time: number, night: number): void {
  if (night < 0.05) return;
  const before = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = '#f4f0ff';
  for (const star of stars) {
    const twinkle = 0.5 + 0.5 * Math.sin(time * STAR_SPEED + star.phase);
    ctx.globalAlpha = before * night * (0.35 + 0.65 * twinkle);
    ctx.fillRect(star.x, star.y, 1, 1);
    if (twinkle > 0.9 && star.phase > 3) {
      ctx.fillRect(star.x - 1, star.y, 1, 1);
      ctx.fillRect(star.x + 1, star.y, 1, 1);
      ctx.fillRect(star.x, star.y - 1, 1, 1);
      ctx.fillRect(star.x, star.y + 1, 1, 1);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = before;
}

/** Crows cross the high sky by day; at dusk they are replaced by quicker, wobblier bats. Same five-pixel wing shape, two beats. */
export function drawFlyers(ctx: Ctx, width: number, time: number, night: number): void {
  const bats = night > BAT_FROM;
  ctx.fillStyle = bats ? BAT_INK : CROW_INK;
  const span = width + 60;
  const count = bats ? FLYERS : FLYERS - 1;
  for (let i = 0; i < count; i++) {
    const x = Math.round(((time * (bats ? 9 + i : 5 + i * 1.5) + (i * span) / count) % span) - 30);
    const y = FLYER_ROW + i * 9 + Math.round(Math.sin(time * (bats ? 1.7 : 0.5) + i) * (bats ? 6 : 3));
    const up = Math.floor(time * (bats ? 7 : 4) + i * 2) % 2 === 0 ? 1 : 0;
    ctx.fillRect(x - 2, y - up, 1, 1);
    ctx.fillRect(x - 1, y, 1, 1);
    ctx.fillRect(x, y + 1, 1, 1);
    ctx.fillRect(x + 1, y, 1, 1);
    ctx.fillRect(x + 2, y - up, 1, 1);
  }
}

/** The owl picture: ears, a round head and a lighter belly, drawn once. The eyes are added each frame. */
export function buildOwl(): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(OWL.width, OWL.height);
  rect(ctx, OWL.dark, 0, 0, 1, 1);
  rect(ctx, OWL.dark, 4, 0, 1, 1);
  rect(ctx, OWL.body, 0, 1, 5, 2);
  rect(ctx, OWL.body, 0, 3, 5, 3);
  rect(ctx, OWL.belly, 1, 4, 3, 2);
  rect(ctx, OWL.dark, 0, 5, 1, 1);
  rect(ctx, OWL.dark, 4, 5, 1, 1);
  return canvas;
}

/** The owl on top of the first standing stone: it blinks, and now and then looks off to one side. */
export function drawOwl(ctx: Ctx, owl: HTMLCanvasElement, layout: HiddenLayout, time: number): void {
  const left = layout.owl.x - 2;
  const top = layout.owl.y - 5;
  ctx.drawImage(owl, left, top);
  const glance = time % OWL_LOOK_PERIOD < OWL_LOOK_SECONDS ? -1 : 0;
  const shut = time % OWL_BLINK_PERIOD < OWL_BLINK_SECONDS;
  rect(ctx, shut ? OWL.dark : OWL.eye, left + 1 + glance, top + 2, 1, 1);
  rect(ctx, shut ? OWL.dark : OWL.eye, left + 3 + glance, top + 2, 1, 1);
}

/** A few violet and golden leaves drifting down on the wind in front of the picture, two pixels each. */
export function drawLeaves(ctx: Ctx, width: number, time: number): void {
  for (let i = 0; i < LEAVES; i++) {
    const x = (hash(i) * width + time * (3 + i) + breeze(time, i * 40) * 8 + width) % width;
    const y = (time * (6 + i) + hash(i + 9) * 270) % 270;
    rect(ctx, LEAF_COLOURS[i % LEAF_COLOURS.length], x, y, 2, 1);
  }
}
