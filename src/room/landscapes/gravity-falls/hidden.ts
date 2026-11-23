/**
 * The Hidden Hollow, the last scene of the Gravity Falls landscape: a twilight clearing on a high hill, old roots and
 * standing stones, a round door in the hillside and the valley far below. Builds the picture layers once for a design
 * width and hands the view everything it needs; `setDoorOpen` is the one extra, called when the mystery is solved.
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { buildGrass } from '../../gravity-falls/art-trees';
import { DESIGN_HEIGHT, type SceneArt } from './scene-art';
import { paintBackdrop } from './hidden-art';
import { drawHiddenGlow, type GlowKit } from './hidden-glow';
import { hiddenLayout, hiddenPlan, type HiddenLayout } from './hidden-layout';
import {
  buildMist, buildOwl, buildTrees, drawFlyers, drawLakeGlints, drawLeaves, drawMist, drawOwl, drawStars, drawTrees, drawTufts,
  scatterStars, scatterTufts,
} from './hidden-life';
import { paintMound, paintProps, paintRoots, paintForeground } from './hidden-props';
import { buildRuneSheets, paintClearing, paintDoorSurround, paintStones, runeSlots } from './hidden-stones';

/** The scene plus the one thing the view can do to it. */
export type HiddenScene = SceneArt & { setDoorOpen(open: boolean): void };

const GRASS_BODY = '#5f7fb8';
const GRASS_TIP = '#b4d0ff';
const BEHIND_SWAY = 1;
const AHEAD_SWAY = 2;
/** Seconds the door's light takes to come up or die down. */
const DOOR_EASE_SECONDS = 1.6;
/** A longer gap between two frames (a stalled tab) counts as this long. */
const MAX_STEP = 0.1;
/** Seconds the runes shine after a click on a standing stone. */
const FLARE_SECONDS = 1.4;
/** Extra pixels around a stone that still count as a click on it. */
const CLICK_SLACK = 2;

const onStone = (layout: HiddenLayout, x: number, y: number): boolean =>
  layout.stones.some((s) => Math.abs(x - s.x) <= s.w / 2 + CLICK_SLACK && y >= s.base - s.h - CLICK_SLACK && y <= s.base);

export const buildHidden = (width: number): HiddenScene => {
  const layout = hiddenLayout(width);
  const back = memoryCanvas(width, DESIGN_HEIGHT);
  const structures = memoryCanvas(width, DESIGN_HEIGHT);
  const front = memoryCanvas(width, DESIGN_HEIGHT);
  for (const layer of [back, structures, front]) layer.ctx.imageSmoothingEnabled = false;
  const runes = runeSlots(layout);
  paintBackdrop(back.ctx, layout);
  paintMound(back.ctx, layout);
  paintClearing(back.ctx, layout);
  paintDoorSurround(structures.ctx, layout);
  paintRoots(structures.ctx, layout);
  paintStones(structures.ctx, layout, runes);
  const kit: GlowKit = { layout, lamp: paintProps(structures.ctx, layout), runes, sheets: buildRuneSheets() };
  paintForeground(front.ctx, layout);

  const trees = buildTrees(layout);
  const tufts = scatterTufts(layout);
  const grass = buildGrass(GRASS_BODY, GRASS_TIP);
  const stars = scatterStars(layout);
  const mist = buildMist(width);
  const owl = buildOwl();
  let doorTarget = 0;
  let doorLevel = 0;
  let lastTime: number | null = null;
  let flareAt = -Infinity;

  return {
    back: back.canvas,
    front: front.canvas,
    plan: hiddenPlan(layout),
    setDoorOpen(open) {
      doorTarget = open ? 1 : 0;
    },
    drawBehind(ctx, time, night) {
      drawStars(ctx, stars, time, night);
      drawMist(ctx, mist, time, night);
      drawLakeGlints(ctx, layout, time);
      drawTrees(ctx, trees, time);
      drawTufts(ctx, grass, tufts.back, time, BEHIND_SWAY);
      ctx.drawImage(structures.canvas, 0, 0);
      drawOwl(ctx, owl, layout, time);
      drawFlyers(ctx, width, time, night);
    },
    drawAhead(ctx, time) {
      drawTufts(ctx, grass, tufts.front, time, AHEAD_SWAY);
      drawLeaves(ctx, width, time);
    },
    press(x, y, time) {
      if (!onStone(layout, x, y)) return false;
      flareAt = time;
      return true;
    },
    drawGlow(ctx, time, night) {
      if (lastTime === null) doorLevel = doorTarget;
      else {
        const step = Math.min(MAX_STEP, Math.max(0, time - lastTime)) / DOOR_EASE_SECONDS;
        doorLevel = doorTarget > doorLevel ? Math.min(doorTarget, doorLevel + step) : Math.max(doorTarget, doorLevel - step);
      }
      lastTime = time;
      drawHiddenGlow(ctx, kit, time, night, doorLevel, Math.max(0, 1 - (time - flareAt) / FLARE_SECONDS));
    },
  };
};
