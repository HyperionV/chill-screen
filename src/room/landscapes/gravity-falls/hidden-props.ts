/**
 * The near things of the Hidden Hollow, painted once: the hillside bank the round door is set into, the old roots and
 * vines over it, and the small props of the clearing (iron lamp, signpost, berry bush, stump with a burrow, glowing
 * toadstools, crystals) and the foreground frame (drooping branches, ferns).
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { bayer, drawSign, ditherFill, ellipse, lampPost, mushroom, polygon, rect, type Ctx } from '../../gravity-falls/art-kit';
import type { Point } from '../../gravity-falls/types';
import { hash, noise } from '../../journeys/noise';
import { DOOR_RADIUS, EARTH, GROUND, MOSS, MOUND_FOOT, PINE_TWILIGHT, ROOT, landTop, type HiddenLayout } from './hidden-layout';

/** The bank's foot runs flat to this share of its width, then climbs to meet the lawn. */
const FOOT_FLAT_SHARE = 0.75;
const CAP_ROWS = 3;
/** Roots and vines keep this many columns back from the bank's far edge. */
const BANK_MARGIN = 3;
const SOIL_SHADE_BASE = 0.12;
const SOIL_SHADE_ACROSS = 0.35;
const FOOT_SHADE_ROWS = 5;
const FOOT_SHADE_MAX = 0.4;
const STRATA_EVERY = 9;
const LEAF = { dark: '#2f4580', mid: '#4a62a8', light: '#7a92d8' } as const;
const BARK = { base: '#6a4f5e', light: '#8d6f80', top: '#a07f8c' } as const;
const CRYSTAL = { dark: '#6a4fc0', base: '#9a7ae8', light: '#d8c8ff' } as const;
const SHROOM_CAP = '#58c8bc';
const SHROOM_SPOT = '#e8fff8';
const SHROOM_STEM = '#c9c2e8';
const BERRIES = ['#ff9ac8', '#ffd36a'];
const VINE_LEAF = '#8fd6b0';
const LAMP_HEIGHT = 14;
const LAMP_METAL = '#3a3050';
const LAMP_GLASS = '#8a7a9a';
const SIGN_TEXT = 'SHH.';
const SIGN_HEIGHT = 18;
const SIGN_INK = '#2c2038';
const SIGN_PAPER = '#c9b48a';
const FERN_FRONDS = 6;
const FERN_LENGTH = 14;
/** Foreground ferns stand at these shares of the width, between the cast. */
const FERN_SHARES = [0.1, 0.3, 0.72, 0.94];
const FERN_BASE = 248;
/** Drooping branches hang from this row, inside the picture's visible band. */
const BRANCH_TOP = 48;
const BRANCH_STEP = 9;
const BRANCH_REACH_SHARE = 0.22;

function footLine(layout: HiddenLayout, x: number, soilTop: number): number {
  const flat = layout.edge * FOOT_FLAT_SHARE;
  if (x <= flat) return MOUND_FOOT;
  const t = (x - flat) / (layout.edge - flat);
  return Math.round(MOUND_FOOT + (soilTop - MOUND_FOOT) * t * t * (3 - 2 * t));
}

/** The hillside bank on the left: a grassy cap, soil with strata and dithered shade, and a shadow where it meets the lawn. */
export function paintMound(ctx: Ctx, layout: HiddenLayout): void {
  const { width, edge } = layout;
  for (let x = 0; x < edge; x++) {
    const top = landTop(width, x);
    const cap = CAP_ROWS + (hash(x * 2.9) < 0.4 ? 1 : 0);
    rect(ctx, GROUND.light, x, top, 1, 1);
    rect(ctx, GROUND.base, x, top + 1, 1, cap - 1);
    rect(ctx, GROUND.dark, x, top + cap, 1, 1);
    const soilTop = top + cap + 1;
    const foot = footLine(layout, x, soilTop);
    rect(ctx, EARTH.base, x, soilTop, 1, Math.max(0, foot - soilTop));
    for (let y = soilTop; y < foot; y++) {
      const ao = y > foot - FOOT_SHADE_ROWS ? ((y - (foot - FOOT_SHADE_ROWS)) / FOOT_SHADE_ROWS) * FOOT_SHADE_MAX : 0;
      const shade = SOIL_SHADE_BASE + SOIL_SHADE_ACROSS * (x / edge) + ao;
      const n = hash(x * 3.1 + y * 7.7);
      if (bayer(x, y) < shade || n < 0.05 || ((y - top) % STRATA_EVERY === 0 && n < 0.6)) rect(ctx, EARTH.dark, x, y, 1, 1);
      else if (n > 0.96) rect(ctx, EARTH.light, x, y, 1, 1);
    }
  }
  ditherFill(ctx, 0, MOUND_FOOT, Math.round(edge * FOOT_FLAT_SHARE), 3, GROUND.base, GROUND.dark, 0.5);
}

/** A gnarled root wandering from (x0, y0) to (x1, y1): thick at the top, tapering, lit on its left edge. */
function rootPath(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, wander: number, seed: number, thick: number): void {
  const steps = Math.max(Math.abs(y1 - y0), Math.abs(x1 - x0));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(x0 + (x1 - x0) * t + Math.sin(t * Math.PI * 2 + seed) * wander * Math.sin(t * Math.PI));
    const y = Math.round(y0 + (y1 - y0) * t);
    const w = Math.max(1, Math.round(thick * (1 - t * 0.6)));
    rect(ctx, ROOT.base, x, y, w, 1);
    rect(ctx, ROOT.dark, x + w, y, 1, 1);
    if (i % 3 !== 2) rect(ctx, ROOT.light, x, y, 1, 1);
  }
}

/** A thin vine hanging from (x, y) with a leaf every few rows. */
function vine(ctx: Ctx, x: number, y: number, length: number, seed: number): void {
  for (let i = 0; i < length; i++) {
    const vx = x + Math.round(Math.sin(i * 0.5 + seed) * 1.2);
    rect(ctx, MOSS, vx, y + i, 1, 1);
    if (i % 4 === 3) rect(ctx, VINE_LEAF, vx + (i % 8 === 3 ? 1 : -2), y + i, 2, 1);
  }
}

/** A small spider web in the corner of the doorway, drawn with a few pale lines. */
function web(ctx: Ctx, x: number, y: number): void {
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 7; i++) {
    rect(ctx, '#e8e4ff', x + i, y, 1, 1);
    rect(ctx, '#e8e4ff', x, y + i, 1, 1);
    rect(ctx, '#e8e4ff', x + i, y + i, 1, 1);
  }
  for (const r of [3, 5]) {
    rect(ctx, '#e8e4ff', x + r, y + 1, 1, 1);
    rect(ctx, '#e8e4ff', x + 1, y + r, 1, 1);
    rect(ctx, '#e8e4ff', x + Math.round(r * 0.7), y + Math.round(r * 0.7), 1, 1);
  }
  ctx.globalAlpha = 1;
}

/** Old roots arching over the door and running down the bank, hanging roots along its top edge, vines and a cobweb. */
export function paintRoots(ctx: Ctx, layout: HiddenLayout): void {
  const { door, edge, width } = layout;
  const arch = DOOR_RADIUS + 6;
  for (let i = 0; i <= 60; i++) {
    const angle = Math.PI * (1.12 + (0.76 * i) / 60);
    const x = Math.round(door.x + Math.cos(angle) * arch);
    const y = Math.round(door.y + Math.sin(angle) * arch);
    rect(ctx, ROOT.dark, x, y + 1, 3, 2);
    rect(ctx, ROOT.base, x, y, 3, 2);
    rect(ctx, ROOT.light, x, y, 1, 1);
  }
  const onBank = (x: number): boolean => x < edge - BANK_MARGIN;
  const runs: readonly (readonly [number, number, number, number])[] = [[-19, -15, 1, 3], [17, 22, 2, 3], [30, 27, 3, 2], [-31, -28, 4, 2]];
  for (const [from, to, seed, thick] of runs) {
    if (onBank(door.x + from)) rootPath(ctx, door.x + from, landTop(width, door.x + from) + 3, door.x + to, 220, 3, seed, thick);
  }
  for (let x = 2; x < edge - 4; x += 4) {
    if (Math.abs(x - door.x) < DOOR_RADIUS + 6 || hash(x * 1.3) < 0.45) continue;
    const top = landTop(width, x);
    const length = 3 + Math.floor(hash(x * 0.7) * 6);
    rect(ctx, ROOT.base, x, top + CAP_ROWS + 1, 1, length);
    rect(ctx, ROOT.light, x, top + CAP_ROWS + length, 1, 1);
  }
  for (const [dx, length] of [[24, 18], [34, 14], [-17, 16]]) {
    if (onBank(door.x + dx)) vine(ctx, door.x + dx, landTop(width, door.x + dx) + CAP_ROWS + 1, length, dx);
  }
  web(ctx, door.x + 11, door.y - 16);
}

/** The old iron lamp. Returns the point its light shines from, for the glow code. */
function paintLamp(ctx: Ctx, layout: HiddenLayout): Point {
  const { x, y } = layout.lantern;
  return lampPost(ctx, x, y, LAMP_HEIGHT, LAMP_METAL, LAMP_GLASS);
}

/** The signpost: a crooked board on a post with a one-word warning in the pixel font. */
function paintSign(ctx: Ctx, layout: HiddenLayout): void {
  const { x, y } = layout.sign;
  const scratch = memoryCanvas(40, 12);
  const board = drawSign(scratch.ctx, SIGN_TEXT, 0, 0, 1, SIGN_INK, SIGN_PAPER);
  const left = x - Math.floor(board.w / 2);
  const top = y - SIGN_HEIGHT;
  rect(ctx, ROOT.dark, x - 1, top + board.h, 3, SIGN_HEIGHT - board.h);
  rect(ctx, ROOT.base, x - 1, top + board.h, 2, SIGN_HEIGHT - board.h);
  ctx.drawImage(scratch.canvas, 0, 0, board.w, board.h, left, top, board.w, board.h);
}

/** A berry bush: three overlapping leaf blobs with lit tops and a few berries. The journal page gets caught in it. */
function paintBush(ctx: Ctx, layout: HiddenLayout): void {
  const { x, y } = layout.bush;
  for (const [dx, dy, rx, ry] of [[-4, 3, 5, 3], [4, 3, 5, 3], [0, 5, 6, 4]]) ellipse(ctx, LEAF.dark, x + dx, y - dy, rx, ry);
  for (const [dx, dy, rx, ry] of [[-4, 4, 4, 2], [4, 4, 4, 2], [0, 6, 5, 3]]) ellipse(ctx, LEAF.mid, x + dx, y - dy, rx, ry);
  for (let i = 0; i < 6; i++) rect(ctx, LEAF.light, x - 6 + i * 2, y - 8 + (i % 3), 2, 1);
  for (let i = 0; i < 5; i++) rect(ctx, BERRIES[i % BERRIES.length], x - 5 + i * 2, y - 5 + (i % 2) * 2, 1, 1);
}

/** A mossy stump with a dark burrow at its foot: the peeking creature looks out of it. */
function paintStump(ctx: Ctx, layout: HiddenLayout): void {
  const { x, y } = layout.stump;
  rect(ctx, ROOT.dark, x - 7, y - 10, 14, 10);
  rect(ctx, BARK.base, x - 6, y - 10, 12, 10);
  for (let i = 0; i < 5; i++) rect(ctx, i % 2 === 0 ? BARK.light : ROOT.base, x - 5 + i * 2, y - 9, 1, 8);
  ellipse(ctx, ROOT.dark, x, y - 10, 7, 2);
  ellipse(ctx, BARK.top, x, y - 10, 6, 1);
  rect(ctx, BARK.light, x - 3, y - 10, 2, 1);
  rect(ctx, MOSS, x - 6, y - 11, 3, 1);
  ellipse(ctx, '#140e26', x, y - 2, 4, 3);
  rect(ctx, ROOT.base, x - 9, y - 1, 3, 1);
  rect(ctx, ROOT.base, x + 6, y - 1, 3, 1);
}

/** Glowing toadstools; the glow code lights their caps at dusk. */
function paintShrooms(ctx: Ctx, layout: HiddenLayout): void {
  layout.shrooms.forEach((p, i) => {
    const sprite = mushroom(i % 2 === 0 ? 7 : 5, SHROOM_CAP, SHROOM_SPOT, SHROOM_STEM);
    ctx.drawImage(sprite, p.x - Math.floor(sprite.width / 2), p.y - sprite.height);
  });
}

/** Little crystal clusters: a tall prism with a lit left facet and a short one beside it. */
function paintCrystals(ctx: Ctx, layout: HiddenLayout): void {
  layout.crystals.forEach((p, i) => {
    const h = 9 + (i % 2) * 3;
    polygon(ctx, CRYSTAL.base, [{ x: p.x - 2, y: p.y }, { x: p.x - 1, y: p.y - h }, { x: p.x + 1, y: p.y - h + 2 }, { x: p.x + 2, y: p.y }]);
    polygon(ctx, CRYSTAL.light, [{ x: p.x - 2, y: p.y }, { x: p.x - 1, y: p.y - h }, { x: p.x, y: p.y - h + 1 }, { x: p.x, y: p.y }]);
    rect(ctx, CRYSTAL.dark, p.x + 2, p.y - 2, 1, 2);
    polygon(ctx, CRYSTAL.base, [{ x: p.x + 3, y: p.y }, { x: p.x + 3, y: p.y - 4 }, { x: p.x + 5, y: p.y - 3 }, { x: p.x + 5, y: p.y }]);
    rect(ctx, CRYSTAL.light, p.x + 3, p.y - 4, 1, 3);
  });
}

/** Paints the clearing's props into the back layer and returns the point the iron lamp shines from. */
export function paintProps(ctx: Ctx, layout: HiddenLayout): Point {
  paintStump(ctx, layout);
  paintSign(ctx, layout);
  paintBush(ctx, layout);
  paintShrooms(ctx, layout);
  paintCrystals(ctx, layout);
  return paintLamp(ctx, layout);
}

/** One fern: curved fronds fanning up from the base, dark teal with a pale tip. */
function fern(ctx: Ctx, x: number, base: number, seed: number): void {
  for (let f = 0; f < FERN_FRONDS; f++) {
    const lean = (f - (FERN_FRONDS - 1) / 2) * 1.6;
    const length = Math.round(FERN_LENGTH - Math.abs(f - 2.5) * 1.5 + hash(seed + f) * 3);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const px = Math.round(x + lean * i * 0.55 + lean * t * t * 3);
      rect(ctx, i === length - 1 ? '#8fd6c8' : t > 0.5 ? '#3d7f8a' : '#27506a', px, base - i, 1, 1);
    }
  }
}

/** Drooping needle branches from the top corners and ferns at the bottom: the frame that holds the picture in. */
export function paintForeground(ctx: Ctx, layout: HiddenLayout): void {
  const { width } = layout;
  const count = Math.min(9, Math.floor((width * BRANCH_REACH_SHARE) / BRANCH_STEP));
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < count; i++) {
      const x = side === 0 ? Math.round(width * 0.93) - i * BRANCH_STEP : Math.round(width * 0.07) + i * BRANCH_STEP;
      const drop = 6 + Math.round(noise(i * 0.8 + side * 5) * 10) + i * 2;
      rect(ctx, ROOT.dark, x, BRANCH_TOP + i, BRANCH_STEP, 2);
      for (let n = 0; n < 5; n++) rect(ctx, n % 2 ? PINE_TWILIGHT.mid : PINE_TWILIGHT.dark, x + n * 2, BRANCH_TOP + 2 + i, 1, drop - i);
      rect(ctx, PINE_TWILIGHT.light, x + 1, BRANCH_TOP + 2 + i, 1, 3);
    }
  }
  FERN_SHARES.forEach((share, i) => fern(ctx, Math.round(width * share), FERN_BASE, i * 4));
}
