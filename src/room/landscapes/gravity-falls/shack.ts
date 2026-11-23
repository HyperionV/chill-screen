/**
 * The Mystery Shack scene of the Gravity Falls landscape: builds the picture layers once for a design width and
 * hands the view everything it needs (layers, who stands where, clues, moving parts, lights, click reactions).
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { buildGrass } from '../../gravity-falls/art-trees';
import type { Clue, PerformerHome, ScenePlan } from '../../gravity-falls/types';
import { DESIGN_HEIGHT, type SceneArt, type SceneBuilder } from './scene-art';
import { buildMidTrees, drawMidTrees, drawTufts, paintBackdrop, paintForeground, scatterTufts } from './shack-backdrop';
import { drawBirds, drawButterflies, drawFallingLeaves, drawShackGlow, drawSmoke, type Excite } from './shack-life';
import { paintStructures, paintYardProps, shackLayout, type ShackLayout } from './shack-props';

const GRASS_BODY = '#4f8a3f';
const GRASS_TIP = '#9cc765';
/** Seconds a click's glow or chase takes to fade out. */
const EXCITE_SECONDS = 1.2;
/** Seconds the can that drops out of the vending machine stays visible. */
const CAN_SECONDS = 1.5;
/** Extra pixels around the machine and the sign that still count as a click on them. */
const CLICK_SLACK = 2;
const BACK_TUFT_SWAY = 1;
const FRONT_TUFT_SWAY = 2;

/** Who stands where (left group by the shack, right group by the cart and fence), where they gather, what can be found. */
function shackPlan(layout: ShackLayout): ScenePlan {
  const { geometry: g, width } = layout;
  const at = (share: number): number => Math.round(width * share);
  const homes: PerformerHome[] = [
    { id: 'stan', x: g.doorX - 26, y: 228, facing: 1 },
    { id: 'soos', x: g.x1 - 22, y: 238, facing: 1 },
    { id: 'wendy', x: at(0.915), y: 232, facing: -1 },
    { id: 'dipper', x: at(0.685), y: 240, facing: 1 },
    { id: 'mabel', x: at(0.8), y: 241, facing: -1 },
    { id: 'waddles', x: at(0.725), y: 246, facing: 1 },
  ];
  const clues: Clue[] = [
    { id: 'shack-symbol', kind: 'symbol', place: 'shack', x: layout.symbol.x, y: layout.symbol.y, w: 14, h: 14 },
    { id: 'shack-note', kind: 'note', place: 'shack', x: layout.mailbox.x, y: layout.mailbox.y - 9, w: 12, h: 14 },
    { id: 'shack-page', kind: 'page', place: 'shack', x: layout.bush.x + 3, y: layout.bush.y - 8, w: 14, h: 14 },
    { id: 'shack-peek', kind: 'peek', place: 'shack', x: layout.peek.x, y: layout.peek.y, w: 16, h: 14 },
  ];
  return { homes, spots: [{ x: at(0.21), y: 244 }, { x: at(0.76), y: 243 }, { x: at(0.875), y: 242 }], clues };
}

const inside = (x: number, y: number, r: { x: number; y: number; w: number; h: number }): boolean =>
  x >= r.x - CLICK_SLACK && x <= r.x + r.w + CLICK_SLACK && y >= r.y - CLICK_SLACK && y <= r.y + r.h + CLICK_SLACK;

/** 1 right after a click, falling to 0 over `EXCITE_SECONDS`. */
const fadeSince = (time: number, pressedAt: number): number => Math.max(0, 1 - (time - pressedAt) / EXCITE_SECONDS);

export const buildShack: SceneBuilder = (width): SceneArt => {
  const layout = shackLayout(width);
  const back = memoryCanvas(width, DESIGN_HEIGHT);
  const structures = memoryCanvas(width, DESIGN_HEIGHT);
  const front = memoryCanvas(width, DESIGN_HEIGHT);
  for (const layer of [back, structures, front]) layer.ctx.imageSmoothingEnabled = false;
  paintBackdrop(back.ctx, width, layout);
  paintStructures(structures.ctx, layout);
  paintForeground(front.ctx, width);
  paintYardProps(front.ctx, layout);
  const trees = buildMidTrees(width);
  const tufts = scatterTufts(width, layout);
  const grass = buildGrass(GRASS_BODY, GRASS_TIP);
  const excite: Excite = { vending: 0, sign: 0 };
  let vendingPressedAt = -Infinity;
  let signPressedAt = -Infinity;

  return {
    back: back.canvas,
    front: front.canvas,
    plan: shackPlan(layout),
    drawBehind(ctx, time, night) {
      drawMidTrees(ctx, trees, time);
      drawTufts(ctx, grass, tufts.back, time, BACK_TUFT_SWAY);
      ctx.drawImage(structures.canvas, 0, 0);
      const canAge = time - vendingPressedAt;
      if (canAge >= 0 && canAge < CAN_SECONDS) {
        const v = layout.vending;
        const drop = Math.min(3, Math.round(canAge * 12));
        ctx.fillStyle = '#c4473b';
        ctx.fillRect(v.x + 4, v.y + v.h - 8 + drop, 3, 4);
        ctx.fillStyle = '#eadfc2';
        ctx.fillRect(v.x + 4, v.y + v.h - 8 + drop, 3, 1);
      }
      drawSmoke(ctx, layout, time);
      drawBirds(ctx, width, time, night);
      drawButterflies(ctx, width, time, night);
    },
    drawAhead(ctx, time) {
      drawTufts(ctx, grass, tufts.front, time, FRONT_TUFT_SWAY);
      drawFallingLeaves(ctx, width, time);
    },
    press(x, y, time) {
      if (inside(x, y, layout.vending)) {
        vendingPressedAt = time;
        return true;
      }
      if (inside(x, y, layout.geometry.sign)) {
        signPressedAt = time;
        return true;
      }
      return false;
    },
    drawGlow(ctx, time, night) {
      excite.vending = fadeSince(time, vendingPressedAt);
      excite.sign = fadeSince(time, signPressedAt);
      drawShackGlow(ctx, layout, time, night, excite);
    },
  };
};
