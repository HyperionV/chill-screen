/**
 * Chapter 5, "The Hidden Hollow": an indigo-violet twilight walk that climbs through old roots and ferns to a clearing
 * with three standing stones, and on to a round door set in the hillside. Five strips scroll at different speeds (far
 * hills over the valley, hazy pines, giant trunks, a hedge of ferns, and the ground the cast stands on); this file adds
 * everything that moves (mist, sparks, the owl, grass, hanging vines, leaves), the lights, the cast's places, the four
 * clues around the door, and the door itself: `setDoorOpen` makes it glow gold, as the Landscape's hollow does.
 * The pictures are painted in ch-hidden-art.ts and ch-hidden-art2.ts.
 */
import { drawHalo, rect, type Ctx } from '../../gravity-falls/art-kit';
import { buildGrass, drawGrass } from '../../gravity-falls/art-trees';
import type { Clue, PerformerHome, ScenePlan } from '../../gravity-falls/types';
import { DOOR_RADIUS, GOLD, MOSS, TEAL, WARM } from '../../landscapes/gravity-falls/hidden-layout';
import { buildMist, buildOwl, drawFlyers, drawLeaves, drawOwl } from '../../landscapes/gravity-falls/hidden-life';
import { drawRunes } from '../../landscapes/gravity-falls/hidden-stones';
import { breeze } from '../../wind';
import { hash, ramp } from '../noise';
import { buildFarHills, buildMidPines, buildTrunks, buildUnderstory, farWindow, layoutHollow, stripWidth, type HollowLayout } from './ch-hidden-art';
import { buildGround, type Ground } from './ch-hidden-art2';
import type { ChapterWorld, Station, WorldBuilder, WorldLayer } from './world';

/** How fast each strip scrolls as a share of the camera; the ground is 1 because the cast walks on it. */
const FACTOR_FAR = 0.15;
const FACTOR_MID = 0.3;
const FACTOR_TRUNKS = 0.5;
const FACTOR_UNDER = 0.75;
const FACTOR_GROUND = 1;
/** Things in front of the cast slide a little faster than the camera, which is what makes them feel close. */
const FACTOR_FOREGROUND = 1.2;
const FACTOR_VINE = 1.1;

/** Where the cast stands (feet rows), as shares of the view's width from the left edge of the camera at each rest. */
const PARTY_FOLLOW = [
  { id: 'dipper', share: 0.12, y: 233 },
  { id: 'mabel', share: 0.2, y: 235 },
  { id: 'waddles', share: 0.26, y: 237 },
] as const;
const BILL = { share: 0.72, y: 198 };
const STAN = { share: 0.9, y: 232 };
const SOOS = { share: 0.66, y: 235 };
/** Meeting spots at each rest: shares of the view's width and the feet row; all right of the radio's band. */
const SPOT_SHARES_STONES: readonly (readonly [number, number])[] = [[0.66, 234], [0.78, 236], [0.92, 235]];
const SPOT_SHARES_DOOR: readonly (readonly [number, number])[] = [[0.7, 236], [0.8, 234], [0.92, 236]];

/** The four clues, as the Landscape's hollow places them: on a stone, on the lamp, in the bush, at the burrow, and the door. */
const CLUE_SIZE = 14;
const SYMBOL_LIFT = 17;
const NOTE_LIFT = 9;
const PAGE_LIFT = 6;
const PEEK_LIFT = 7;
const NOTE_SIZE = { w: 12, h: 14 };
const PEEK_SIZE = { w: 16, h: 14 };

const GRASS_BODY = '#5f7fb8';
const GRASS_TIP = '#b4d0ff';
const BACK_GRASS_SPACING = 11;
const BACK_GRASS_TOP = 208;
const BACK_GRASS_RANGE = 16;
const BACK_GRASS_SWAY = 1;
const FRONT_GRASS_SPACING = 24;
const FRONT_GRASS_FOOT = 246;
const FRONT_GRASS_SWAY = 2;

const MIST_ROW = 186;
const MIST_DRIFT = 1.4;
const MIST_FACTOR = 0.5;
const MIST_ALPHA = 0.35;
const MIST_NIGHT_ALPHA = 0.15;

const SPARKS = 20;
const SPARK_ROW = 225;
const SPARK_RISE = 80;
const SPARK_DAY = 0.35;
const SPARK_FACTOR = 0.8;
const SPARK_HALO_EVERY = 3;

const VINE_SPACING = 190;
const VINE_TOP = 44;
const VINE_MIN = 40;
const VINE_SPREAD = 30;
const VINE_SWAY = 3;
const VINE_LEAF_EVERY = 5;
const VINE_LEAF = '#8fd6b0';

/** Seconds the door's light takes to come up or die down; a longer gap between two frames (a stalled tab) counts as `MAX_STEP`. */
const DOOR_EASE_SECONDS = 1.6;
const MAX_STEP = 0.1;
/** Seconds the runes shine after a click on a standing stone, and the pixels around a stone that still count as a click. */
const FLARE_SECONDS = 1.4;
const CLICK_SLACK = 2;
const CRYSTAL_HIT_HALF = 6;
const CRYSTAL_HIT_UP = 14;
const BURST_SECONDS = 1.2;
const BURST_SPARKS = 8;
const BURST_REACH = 16;
const BURST_COLOR = '#d8c8ff';

/** The lights come up between this much and that much night, so they are on by dusk and fully lit in the dark. */
const DUSK_FROM = 0.12;
const DUSK_TO = 0.65;
const WINDOW_DAY = 0.35;
const LAMP_DAY = 0.12;
const SHROOM_DAY = 0.25;
const CRYSTAL_DAY = 0.3;
const HALO_WARM = '#ffa94a';
const HALO_LAMP = '#ffc060';
const HALO_CRYSTAL = '#b48aff';
const FLICKER_SPEED = 2.1;
const GLOW_REACH = 40;
const MOTHS = 2;
const FIREFLIES = 12;
const FIREFLY_FACTOR = 0.9;
const DOOR_HALO_FAR = 34;
const DOOR_HALO_NEAR = 18;
const DOOR_POOL = 26;
const DOOR_DAY = 0.6;
const DOOR_PULSE_SPEED = 0.9;
const DOOR_MOTES = 8;
const NEVER = -1e9;

/** The place of item `k` in an endless field with one item about every `spacing` pixels (a little jittered, always the same). */
const fieldX = (k: number, spacing: number): number => k * spacing + (hash(k * 3.1 + 0.5) - 0.5) * spacing * 0.5;

/** `x` wrapped into 0..span, also for negative values. */
const wrap = (x: number, span: number): number => ((x % span) + span) % span;

const flicker = (time: number, seed: number): number => 0.88 + 0.12 * Math.sin(time * FLICKER_SPEED + seed * 5.3);

/** A rectangle at `alpha` of the current opacity (a light's core, which must not glare in daylight). */
function glowRect(ctx: Ctx, color: string, x: number, y: number, w: number, h: number, alpha: number): void {
  const before = ctx.globalAlpha;
  ctx.globalAlpha = before * Math.min(1, alpha);
  rect(ctx, color, x, y, w, h);
  ctx.globalAlpha = before;
}

/** The hollow world: built once for a view width, then drawn every frame from the camera's place. */
class HollowWorld implements ChapterWorld {
  readonly worldWidth: number;
  readonly layers: readonly WorldLayer[];
  readonly stations: readonly Station[];
  readonly plan: ScenePlan;
  private readonly layout: HollowLayout;
  private readonly ground: Ground;
  private readonly grass = buildGrass(GRASS_BODY, GRASS_TIP);
  private readonly mist: HTMLCanvasElement;
  private readonly owl = buildOwl();
  private doorTarget = 0;
  private doorLevel = 0;
  private lastTime: number | null = null;
  private flareAt = NEVER;
  private burstAt = NEVER;
  private burstX = 0;
  private burstY = 0;

  constructor(designWidth: number) {
    const layout = layoutHollow(designWidth);
    const { worldWidth } = layout;
    this.layout = layout;
    this.ground = buildGround(layout);
    this.mist = buildMist(designWidth);
    this.worldWidth = worldWidth;
    this.stations = layout.stations;
    this.layers = [
      { canvas: buildFarHills(stripWidth(worldWidth, FACTOR_FAR, designWidth), layout), factor: FACTOR_FAR },
      { canvas: buildMidPines(stripWidth(worldWidth, FACTOR_MID, designWidth)), factor: FACTOR_MID },
      { canvas: buildTrunks(stripWidth(worldWidth, FACTOR_TRUNKS, designWidth)), factor: FACTOR_TRUNKS },
      { canvas: buildUnderstory(stripWidth(worldWidth, FACTOR_UNDER, designWidth)), factor: FACTOR_UNDER },
      { canvas: this.ground.canvas, factor: FACTOR_GROUND },
    ];
    this.plan = this.makePlan();
  }

  /** The cast's homes, the meeting spots of each rest, and the clues (the door's included). */
  private makePlan(): ScenePlan {
    const { layout } = this;
    const w = layout.designWidth;
    const [stonesStation, doorStation] = layout.stations;
    const { stones, lantern, bush, stump, door } = layout.spec;
    const at = (station: Station, share: number): number => Math.round(station.at + share * w);
    const homes: PerformerHome[] = PARTY_FOLLOW.map((p): PerformerHome => ({ id: p.id, x: p.share * w, y: p.y, facing: 1, followDx: p.share * w }));
    homes.push(
      { id: 'bill', x: at(stonesStation, BILL.share), y: BILL.y, facing: 1 },
      { id: 'stan', x: at(stonesStation, STAN.share), y: STAN.y, facing: -1 },
      { id: 'soos', x: at(doorStation, SOOS.share), y: SOOS.y, facing: 1 },
    );
    const spots = [
      ...SPOT_SHARES_STONES.map(([share, y]) => ({ x: at(stonesStation, share), y })),
      ...SPOT_SHARES_DOOR.map(([share, y]) => ({ x: at(doorStation, share), y })),
    ];
    const centre = stones[1];
    const clues: Clue[] = [
      { id: 'hidden-symbol', kind: 'symbol', place: 'hidden', x: centre.x, y: centre.base - SYMBOL_LIFT, w: CLUE_SIZE, h: CLUE_SIZE },
      { id: 'hidden-note', kind: 'note', place: 'hidden', x: lantern.x, y: lantern.y - NOTE_LIFT, ...NOTE_SIZE },
      { id: 'hidden-page', kind: 'page', place: 'hidden', x: bush.x, y: bush.y - PAGE_LIFT, w: CLUE_SIZE, h: CLUE_SIZE },
      { id: 'hidden-peek', kind: 'peek', place: 'hidden', x: stump.x, y: stump.y - PEEK_LIFT, ...PEEK_SIZE },
      { id: 'hidden-door', kind: 'door', place: 'hidden', x: door.x, y: door.y, w: DOOR_RADIUS * 2, h: DOOR_RADIUS * 2 },
    ];
    return { homes, spots, clues };
  }

  /** Called when the mystery is solved (or reset): the door's light eases toward open or shut. */
  setDoorOpen(open: boolean): void {
    this.doorTarget = open ? 1 : 0;
  }

  drawBehind(ctx: Ctx, cameraX: number, time: number, night: number): void {
    drawFlyers(ctx, this.layout.designWidth, time, night);
    this.drawMist(ctx, cameraX, time, night);
    this.drawBackGrass(ctx, cameraX, time);
    this.drawOwlOnStone(ctx, cameraX, time);
    this.drawSparks(ctx, cameraX, time, night);
    this.drawBurst(ctx, cameraX, time);
  }

  drawAhead(ctx: Ctx, cameraX: number, time: number): void {
    this.drawFrontGrass(ctx, cameraX, time);
    this.drawVines(ctx, cameraX, time);
    drawLeaves(ctx, this.layout.designWidth, time);
  }

  drawGlow(ctx: Ctx, cameraX: number, time: number, night: number): void {
    this.easeDoor(time);
    const lit = ramp(DUSK_FROM, DUSK_TO, night);
    this.drawValley(ctx, cameraX, time, lit);
    this.drawLamp(ctx, cameraX, time, lit);
    this.drawGlowers(ctx, cameraX, time, night);
    this.drawStoneRunes(ctx, cameraX, time, night);
    this.drawDoorGlow(ctx, cameraX, time, night);
    this.drawFireflies(ctx, cameraX, time, lit);
  }

  /** A click on a standing stone makes the runes shine for a moment; a click on a crystal throws a few sparks. */
  press(x: number, y: number, time: number): boolean {
    const { stones, crystals } = this.layout.spec;
    if (stones.some((s) => Math.abs(x - s.x) <= s.w / 2 + CLICK_SLACK && y >= s.base - s.h - CLICK_SLACK && y <= s.base)) {
      this.flareAt = time;
      return true;
    }
    const crystal = crystals.find((c) => Math.abs(x - c.x) <= CRYSTAL_HIT_HALF && y >= c.y - CRYSTAL_HIT_UP && y <= c.y);
    if (!crystal) return false;
    this.burstAt = time;
    this.burstX = crystal.x;
    this.burstY = crystal.y - CRYSTAL_HIT_UP / 2;
    return true;
  }

  /** The door's light level follows its target, taking `DOOR_EASE_SECONDS` to get there. */
  private easeDoor(time: number): void {
    if (this.lastTime === null) this.doorLevel = this.doorTarget;
    else {
      const step = Math.min(MAX_STEP, Math.max(0, time - this.lastTime)) / DOOR_EASE_SECONDS;
      this.doorLevel = this.doorTarget > this.doorLevel ? Math.min(this.doorTarget, this.doorLevel + step) : Math.max(this.doorTarget, this.doorLevel - step);
    }
    this.lastTime = time;
  }

  /** Is world x in (or just beside) the picture? */
  private near(x: number, cameraX: number, reach: number): boolean {
    const sx = x - cameraX;
    return sx > -reach && sx < this.layout.designWidth + reach;
  }

  /** A low bank of valley mist drifting along the foot of the hills, sliding a little with the walk. */
  private drawMist(ctx: Ctx, cameraX: number, time: number, night: number): void {
    const span = this.mist.width;
    const offset = Math.round(wrap(time * MIST_DRIFT + cameraX * MIST_FACTOR, span));
    ctx.globalAlpha = MIST_ALPHA + MIST_NIGHT_ALPHA * night;
    ctx.drawImage(this.mist, -offset, MIST_ROW);
    ctx.drawImage(this.mist, span - offset, MIST_ROW);
    ctx.globalAlpha = 1;
  }

  /** Tufts of grass in the lawn behind the cast, swaying in the wind; none on the door's steps. */
  private drawBackGrass(ctx: Ctx, cameraX: number, time: number): void {
    const view = this.layout.designWidth;
    const doorX = this.layout.spec.door.x;
    for (let k = Math.floor(cameraX / BACK_GRASS_SPACING) - 1; k * BACK_GRASS_SPACING - cameraX < view + BACK_GRASS_SPACING; k++) {
      const x = fieldX(k, BACK_GRASS_SPACING);
      const sx = x - cameraX;
      if (sx < -BACK_GRASS_SPACING || sx > view + BACK_GRASS_SPACING || Math.abs(x - doorX) < DOOR_RADIUS * 3) continue;
      drawGrass(ctx, this.grass, sx, BACK_GRASS_TOP + hash(k * 2.1) * BACK_GRASS_RANGE, Math.floor(hash(k * 4.3) * 6), time, BACK_GRASS_SWAY);
    }
  }

  /** The little owl on the first standing stone, blinking and now and then looking aside. */
  private drawOwlOnStone(ctx: Ctx, cameraX: number, time: number): void {
    const { spec } = this.layout;
    if (!this.near(spec.owl.x, cameraX, GLOW_REACH)) return;
    ctx.save();
    ctx.translate(-Math.round(cameraX), 0);
    drawOwl(ctx, this.owl, spec, time);
    ctx.restore();
  }

  /** Gold and teal sparks rising slowly out of the hollow, swaying on the wind and fading in and out. */
  private drawSparks(ctx: Ctx, cameraX: number, time: number, night: number): void {
    const view = this.layout.designWidth;
    const strength = SPARK_DAY + (1 - SPARK_DAY) * night;
    for (let i = 0; i < SPARKS; i++) {
      const phase = (time * (0.02 + hash(i) * 0.015) + hash(i + 40)) % 1;
      const x = wrap(hash(i + 7) * view + Math.sin(time * 0.4 + i * 2) * 5 + breeze(time, i * 30) * 4 - cameraX * SPARK_FACTOR, view);
      const y = SPARK_ROW - phase * SPARK_RISE;
      const color = i % 2 === 0 ? GOLD : TEAL;
      ctx.globalAlpha = strength * Math.sin(phase * Math.PI);
      rect(ctx, color, x, y, 1, 1);
      if (i % SPARK_HALO_EVERY === 0) drawHalo(ctx, x, y, 4, color, 0.5);
    }
    ctx.globalAlpha = 1;
  }

  /** The sparks a clicked crystal throws out and lets fall. */
  private drawBurst(ctx: Ctx, cameraX: number, time: number): void {
    const age = time - this.burstAt;
    if (age < 0 || age >= BURST_SECONDS) return;
    const u = age / BURST_SECONDS;
    ctx.globalAlpha = 1 - u;
    for (let i = 0; i < BURST_SPARKS; i++) {
      const angle = (i * Math.PI * 2) / BURST_SPARKS;
      rect(ctx, BURST_COLOR, this.burstX - cameraX + Math.cos(angle) * BURST_REACH * u, this.burstY + Math.sin(angle) * BURST_REACH * u * 0.7 + u * u * 8, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  /** Grass tufts in front of the cast's feet, sliding a little faster than the walk and swaying in the wind. */
  private drawFrontGrass(ctx: Ctx, cameraX: number, time: number): void {
    const view = this.layout.designWidth;
    const offset = cameraX * FACTOR_FOREGROUND;
    for (let k = Math.floor(offset / FRONT_GRASS_SPACING) - 1; k * FRONT_GRASS_SPACING - offset < view + FRONT_GRASS_SPACING; k++) {
      const sx = fieldX(k, FRONT_GRASS_SPACING) - offset;
      if (sx < -FRONT_GRASS_SPACING || sx > view + FRONT_GRASS_SPACING) continue;
      drawGrass(ctx, this.grass, sx, FRONT_GRASS_FOOT, Math.floor(hash(k * 2.7) * 6), time, FRONT_GRASS_SWAY);
    }
  }

  /** Vines hanging from the canopy along the top of the picture; their free ends swing most in the wind. */
  private drawVines(ctx: Ctx, cameraX: number, time: number): void {
    const view = this.layout.designWidth;
    const offset = cameraX * FACTOR_VINE;
    for (let k = Math.floor(offset / VINE_SPACING) - 1; k * VINE_SPACING - offset < view + VINE_SPACING; k++) {
      const sx = fieldX(k, VINE_SPACING) - offset;
      if (sx < -VINE_SPACING || sx > view) continue;
      const length = VINE_MIN + Math.floor(hash(k * 4.1) * VINE_SPREAD);
      for (let r = 0; r < length; r++) {
        const bend = Math.round(breeze(time, sx + cameraX) * VINE_SWAY * (r / length) ** 2);
        rect(ctx, MOSS, sx + bend, VINE_TOP + r, 1, 1);
        if (r % VINE_LEAF_EVERY === VINE_LEAF_EVERY - 1) rect(ctx, VINE_LEAF, sx + bend + (r % 2 === 0 ? 1 : -2), VINE_TOP + r, 2, 1);
      }
    }
  }

  /** The Shack's one window and the roofs far down in the valley, in the far strip's own pixels. */
  private drawValley(ctx: Ctx, cameraX: number, time: number, lit: number): void {
    const pane = farWindow(this.layout);
    const farX = cameraX * FACTOR_FAR;
    const strength = WINDOW_DAY + (1 - WINDOW_DAY) * lit;
    glowRect(ctx, WARM, pane.x - farX, pane.y, 2, 2, strength);
    drawHalo(ctx, pane.x + 1 - farX, pane.y + 1, 7, HALO_WARM, 0.5 * strength * flicker(time, 1));
    if (lit <= 0) return;
    this.layout.houses.forEach((house, i) => {
      glowRect(ctx, WARM, house.x + 1 - farX, house.y + 1, 1, 1, 0.9 * lit * flicker(time, i + 3));
      drawHalo(ctx, house.x + 1 - farX, house.y + 1, 3, HALO_WARM, 0.3 * lit);
    });
  }

  /** The old iron lamp's halo and two moths circling it. */
  private drawLamp(ctx: Ctx, cameraX: number, time: number, lit: number): void {
    const { lamp } = this.ground;
    if (!this.near(lamp.x, cameraX, GLOW_REACH)) return;
    const x = lamp.x - cameraX;
    const strength = LAMP_DAY + (1 - LAMP_DAY) * lit;
    drawHalo(ctx, x, lamp.y, 20, HALO_LAMP, 0.75 * strength * flicker(time, 7));
    glowRect(ctx, '#fff3c4', x - 1, lamp.y - 1, 3, 3, strength);
    if (lit <= 0) return;
    for (let i = 0; i < MOTHS; i++) {
      const a = time * (1.6 + i * 0.5) + i * 3;
      rect(ctx, '#f2ead0', x + Math.cos(a) * (6 + i * 2), lamp.y + Math.sin(a * 1.3) * 5, lit > 0.5 ? 2 : 1, 1);
    }
  }

  /** Glowing toadstool caps and crystals: soft halos that deepen toward night. */
  private drawGlowers(ctx: Ctx, cameraX: number, time: number, night: number): void {
    const { shrooms, crystals } = this.layout.spec;
    const shroom = SHROOM_DAY + (1 - SHROOM_DAY) * night;
    shrooms.forEach((p, i) => {
      if (!this.near(p.x, cameraX, GLOW_REACH)) return;
      const x = p.x - cameraX;
      drawHalo(ctx, x, p.y - 4, 6, TEAL, 0.45 * shroom * flicker(time, i + 2));
      glowRect(ctx, TEAL, x - 1, p.y - 5, 3, 1, shroom);
    });
    const crystal = CRYSTAL_DAY + (1 - CRYSTAL_DAY) * night;
    crystals.forEach((p, i) => {
      if (!this.near(p.x, cameraX, GLOW_REACH)) return;
      const x = p.x - cameraX;
      drawHalo(ctx, x, p.y - 5, 8, HALO_CRYSTAL, 0.4 * crystal * flicker(time, i + 5));
      glowRect(ctx, '#ffffff', x - 1, p.y - 9 - (i % 2) * 3, 1, 1, crystal * (0.5 + 0.5 * Math.sin(time * 0.7 + i * 2)));
    });
  }

  /** The runes carved in the standing stones: faint teal, a glint now and then, gold once the door is open or a stone was clicked. */
  private drawStoneRunes(ctx: Ctx, cameraX: number, time: number, night: number): void {
    const { stones } = this.layout.spec;
    if (!this.near(stones[0].x, cameraX, GLOW_REACH) && !this.near(stones[stones.length - 1].x, cameraX, GLOW_REACH)) return;
    const flare = Math.max(0, 1 - (time - this.flareAt) / FLARE_SECONDS);
    ctx.save();
    ctx.translate(-Math.round(cameraX), 0);
    drawRunes(ctx, this.ground.sheets, this.ground.runes, time, night, Math.max(this.doorLevel, flare));
    ctx.restore();
  }

  /** Light from the open door: a wide halo, a bright core, a pool on the steps and path, and gold motes drifting up out of the doorway. */
  private drawDoorGlow(ctx: Ctx, cameraX: number, time: number, night: number): void {
    const open = this.doorLevel;
    const { door } = this.layout.spec;
    if (open <= 0 || !this.near(door.x, cameraX, DOOR_HALO_FAR)) return;
    const x = door.x - cameraX;
    const strength = open * (DOOR_DAY + (1 - DOOR_DAY) * night) * (0.92 + 0.08 * Math.sin(time * DOOR_PULSE_SPEED));
    drawHalo(ctx, x, door.y, DOOR_HALO_FAR, GOLD, 0.45 * strength);
    drawHalo(ctx, x, door.y, DOOR_HALO_NEAR, '#fff0b0', 0.55 * strength);
    drawHalo(ctx, x + 2, door.y + 22, DOOR_POOL, GOLD, 0.35 * strength);
    for (let i = 0; i < DOOR_MOTES; i++) {
      const phase = (time * 0.12 + hash(i + 60)) % 1;
      ctx.globalAlpha = strength * Math.sin(phase * Math.PI);
      rect(ctx, '#fff0b0', x + Math.sin(time * 0.6 + i * 1.9) * 9, door.y + 4 - phase * 40, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  /** Fireflies wandering through the hollow after dusk, each blinking on its own slow beat. */
  private drawFireflies(ctx: Ctx, cameraX: number, time: number, lit: number): void {
    if (lit <= 0) return;
    const view = this.layout.designWidth;
    for (let i = 0; i < FIREFLIES; i++) {
      const x = wrap(hash(i * 2.3) * view + Math.sin(time * 0.35 + i * 1.7) * 14 - cameraX * FIREFLY_FACTOR, view);
      const y = 130 + hash(i * 5.9) * 90 + Math.sin(time * 0.5 + i * 2.3) * 8;
      const blink = 0.5 + 0.5 * Math.sin(time * 0.9 + i * 2.1);
      const color = i % 2 === 0 ? TEAL : GOLD;
      ctx.globalAlpha = lit * blink;
      rect(ctx, color, x, y, 1, 1);
      drawHalo(ctx, x, y, 3, color, lit * blink * 0.5);
    }
    ctx.globalAlpha = 1;
  }
}

export const buildHiddenWorld: WorldBuilder = (designWidth) => new HollowWorld(designWidth);
