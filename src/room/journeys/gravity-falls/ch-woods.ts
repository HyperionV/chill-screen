/**
 * Chapter 2, "The Gnome Trail": a green, shady walk between giant trunks. Five strips scroll at different speeds
 * (misty far pines, mid pines with watching gaps, giant trunks, undergrowth, and the ground the cast stands on); this
 * file adds everything that moves (light shafts, mist, hanging boughs, the stream, cloth, smoke, pollen, leaves,
 * fireflies), the cast's places, the four clues, and the lights that come up at dusk.
 */
import { drawHalo, rect, type Ctx } from '../../gravity-falls/art-kit';
import { buildGrass, drawGrass, drawSwayTree } from '../../gravity-falls/art-trees';
import type { Clue, PerformerHome, Point, ScenePlan } from '../../gravity-falls/types';
import { buildBush } from '../../landscapes/gravity-falls/woods-art';
import { buildBeam, buildWisp } from '../../landscapes/gravity-falls/woods-art2';
import { breeze, gust } from '../../wind';
import { hash, ramp } from '../noise';
import {
  BOUGH_PALETTE, buildBough, buildMidPines, buildMistForest, buildTrunks, buildUnderstory, gapsFor, layoutWoods, stripWidth, trunksFor,
  type Gap, type Trunk, type WoodsLayout,
} from './ch-woods-art';
import { buildGround, streamAt, type Anchors } from './ch-woods-art2';
import type { ChapterWorld, Station, WorldBuilder, WorldLayer } from './world';

/** How fast each strip scrolls as a share of the camera; the ground is 1 because the cast walks on it. */
const FACTOR_MIST = 0.15;
const FACTOR_MID = 0.3;
const FACTOR_TRUNKS = 0.5;
const FACTOR_UNDER = 0.75;
const FACTOR_GROUND = 1;
/** Things in front of the cast slide a little faster than the camera, which is what makes them feel close. */
const FACTOR_FOREGROUND = 1.2;
const FACTOR_BOUGH_BACK = 0.6;

/** Where the cast stands (feet rows), as shares of the view's width from the left edge of the camera at each rest. */
const PARTY_FOLLOW = [
  { id: 'dipper', share: 0.12, y: 234 },
  { id: 'mabel', share: 0.2, y: 236 },
  { id: 'waddles', share: 0.26, y: 238 },
] as const;
const GNOME_A = { share: 0.72, y: 231 };
const GNOME_B = { share: 0.88, y: 233 };
const CHIEF = { share: 0.8, y: 232 };
/** Meeting spots at each rest: shares of the view's width and the feet row; all right of the radio's band. */
const SPOT_SHARES: readonly (readonly [number, number])[] = [[0.66, 234], [0.78, 236], [0.92, 233]];
const SPOT_SHARES_COUNCIL: readonly (readonly [number, number])[] = [[0.66, 234], [0.74, 237], [0.9, 233]];

/** The four clues, each in the rows between the clock and the radio. */
const SYMBOL_ROW = 190;
const NOTE_ROW = 202;
/** The page lands on the boulder, whose top is at row 206 (the page is 9 rows tall, centred a little above its middle). */
const PAGE_ROW = 201;
const PEEK_ROW = 206;
const CLUE_SIZE = 14;
/** The bush the shy watcher hides behind: its foot row and size. The watcher's head rises from just under the top. */
const PEEK_BUSH = { w: 34, h: 18, seed: 9, foot: 226 };
const SIDE_BUSH = { w: 24, h: 13, seed: 5, foot: 226, dx: 24 };

const GRASS_BODY = '#2f5f3c';
const GRASS_TIP = '#7fb560';
const GRASS_FOOT = 246;
const GRASS_SPACING = 24;
const GRASS_SWAY = 2;

const SHAFT_FACTOR = 0.55;
const SHAFT_SPACING = 170;
const SHAFT_TOP = 50;
const SHAFT_ALPHA = 0.22;
const WISP_ROWS = [214, 226, 238] as const;
const WISP_SPEEDS = [3.5, 2.2, 4.4] as const;
const WISP_ALPHA = 0.2;
const WISP_NIGHT_ALPHA = 0.1;
const WISP_FACTOR = 0.9;

const BOUGH_STRIP = 3;
const BOUGH_BACK_SPACING = 140;
const BOUGH_FRONT_SPACING = 330;
const BOUGH_BACK_TOP = 44;
const BOUGH_FRONT_TOP = 40;
const BOUGH_SWAY = 2;
const BOUGH_REACH = 80;
const FRONT_BOUGH_PALETTE = { dark: '#081a17', mid: '#12352e', light: '#2f6049', trunk: '#2a1c16', trunkShade: '#1b120e' };

const EYE_COLOR = '#eaff6a';
const EYE_DAY_STRENGTH = 0.4;
const EYE_PERIOD = 22;
const EYE_OUT_FROM = 0.1;
const EYE_OUT_TO = 0.8;
const EYE_FADE = 0.1;
const EYE_BLINK_PERIOD = 5;
const EYE_BLINK_SECONDS = 0.15;
const EYE_EDGE = 6;
const EYE_HIDE_MARGIN = 3;

const SOCK_COUNT = 6;
const SOCK_COLORS = ['#d8584f', '#5aa3d8', '#e8c84a', '#7bd88f', '#c98ad8', '#f0a050'] as const;
const SOCK_CUFF = '#f1ece0';
const STRING_COLOR = '#d8c9a0';
const SOCK_SAG = 3;
const SOCK_KICK_SECONDS = 3;
const SOCK_KICK_SWING = 3;
const PENNANT_LENGTH = 7;
const PENNANT_COLORS = ['#c23b3b', '#c23b3b', '#d8a02e', '#4fae6a'] as const;

const SMOKE_PUFFS = 5;
const SMOKE_RISE = 26;
const SMOKE_RATE = 0.18;
const SMOKE_COLOR = '#e8efe8';

const RIPPLE_COUNT = 8;
const RIPPLE_FROM = 214;
const RIPPLE_SPAN = 17;
const RIPPLE_COLOR = '#b8e8ee';
/** How far past the screen's edge the stream still counts as in view (its glints and splash). */
const STREAM_VIEW_REACH = 40;
/** The clickable props, in world x (offsets from the prop's middle) and design rows. */
const STREAM_CLICK_HALF = 24;
const STREAM_CLICK_TOP = 214;
const STREAM_CLICK_BOTTOM = 242;
const SOCK_CLICK_PAD = 4;
const SOCK_CLICK_TOP = 190;
const SOCK_CLICK_BOTTOM = 222;
const RING_CLICK_HALF = 33;
const RING_CLICK_TOP = 208;
const RING_CLICK_BOTTOM = 224;
const BUSH_SWAY = 1.5;
const SPLASH_SECONDS = 1.2;
const SPLASH_DROPS = 5;
const SPORE_SECONDS = 2.5;
const SPORE_COUNT = 10;
const SPORE_ROW = 216;

const POLLEN_COUNT = 26;
const POLLEN_COLOR = '#fff3b4';
const LEAF_COUNT = 7;
const LEAF_COLORS = ['#c8a050', '#8fb85f', '#d9783a'] as const;
const LEAF_TOP = 52;
const LEAF_FALL = 190;
const FIREFLY_COUNT = 14;
const FIREFLY_COLOR = '#eaff6a';
const GLOW_COLOR = '#ffcf70';
/** The lights come up between this much and that much night, so they are on by dusk and fully lit in the dark. */
const DUSK_FROM = 0.12;
const DUSK_TO = 0.65;
const NEVER = -1e9;

/** The place of item `k` in an endless field with one item about every `spacing` pixels (a little jittered, always the same). */
const fieldX = (k: number, spacing: number): number => k * spacing + (hash(k * 3.1 + 0.5) - 0.5) * spacing * 0.5;

/** `x` wrapped into 0..span, also for negative values. */
const wrap = (x: number, span: number): number => ((x % span) + span) % span;

/** The sprite for item `k` out of a list. */
const variant = (sprites: readonly HTMLCanvasElement[], k: number): HTMLCanvasElement => sprites[((k % sprites.length) + sprites.length) % sprites.length];

/** One bough hanging from the canopy, bent by the wind in 3-row strips: the free end moves most, the branch hardly at all. */
function drawBough(ctx: Ctx, sprite: HTMLCanvasElement, x: number, y: number, time: number): void {
  const left = Math.round(x);
  const lean = breeze(time, x) * BOUGH_SWAY;
  for (let sy = 0; sy < sprite.height; sy += BOUGH_STRIP) {
    const rows = Math.min(BOUGH_STRIP, sprite.height - sy);
    const reach = sy / sprite.height;
    ctx.drawImage(sprite, 0, sy, sprite.width, rows, left + Math.round(lean * reach * reach), y + sy, sprite.width, rows);
  }
}

/** A small pennant flying right from the pole top (x, y), rippling in the breeze. */
function drawPennant(ctx: Ctx, x: number, y: number, time: number, color: string): void {
  for (let k = 0; k < PENNANT_LENGTH; k++) {
    rect(ctx, color, x + k, y + Math.round(k * 0.4 + breeze(time, x + k * 5) * 1.2), 1, 3 - Math.floor(k / 3));
  }
}

/** The woods world: built once for a view width, then drawn every frame from the camera's place. */
class WoodsWorld implements ChapterWorld {
  readonly worldWidth: number;
  readonly layers: readonly WorldLayer[];
  readonly stations: readonly Station[];
  readonly plan: ScenePlan;
  private readonly layout: WoodsLayout;
  private readonly anchors: Anchors;
  private readonly gaps: readonly Gap[];
  private readonly trunks: readonly Trunk[];
  private readonly beam = buildBeam();
  private readonly wisp = buildWisp();
  private readonly grass = buildGrass(GRASS_BODY, GRASS_TIP);
  private readonly peekBush = buildBush(PEEK_BUSH.w, PEEK_BUSH.h, PEEK_BUSH.seed);
  private readonly sideBush = buildBush(SIDE_BUSH.w, SIDE_BUSH.h, SIDE_BUSH.seed);
  private readonly backBoughs = [buildBough(44, 34, 1, BOUGH_PALETTE), buildBough(56, 42, 2, BOUGH_PALETTE), buildBough(36, 26, 3, BOUGH_PALETTE)];
  private readonly frontBoughs = [buildBough(70, 52, 4, FRONT_BOUGH_PALETTE), buildBough(54, 40, 5, FRONT_BOUGH_PALETTE)];
  private sockKick = NEVER;
  private splashAt = NEVER;
  private splashX = 0;
  private splashY = 0;
  private sporesAt = NEVER;

  constructor(designWidth: number) {
    const layout = layoutWoods(designWidth);
    const { worldWidth } = layout;
    const midWidth = stripWidth(worldWidth, FACTOR_MID, designWidth);
    const trunkWidth = stripWidth(worldWidth, FACTOR_TRUNKS, designWidth);
    const ground = buildGround(layout);
    this.layout = layout;
    this.anchors = ground.anchors;
    this.gaps = gapsFor(midWidth);
    this.trunks = trunksFor(trunkWidth);
    this.worldWidth = worldWidth;
    this.stations = layout.stations;
    this.layers = [
      { canvas: buildMistForest(stripWidth(worldWidth, FACTOR_MIST, designWidth)), factor: FACTOR_MIST },
      { canvas: buildMidPines(midWidth), factor: FACTOR_MID },
      { canvas: buildTrunks(trunkWidth), factor: FACTOR_TRUNKS },
      { canvas: buildUnderstory(stripWidth(worldWidth, FACTOR_UNDER, designWidth)), factor: FACTOR_UNDER },
      { canvas: ground.canvas, factor: FACTOR_GROUND },
    ];
    this.plan = this.makePlan(layout);
  }

  /** The cast's homes, the meeting spots of each rest, and the four clues. */
  private makePlan(layout: WoodsLayout): ScenePlan {
    const w = layout.designWidth;
    const [gate, council] = layout.stations;
    const homes: PerformerHome[] = PARTY_FOLLOW.map((p): PerformerHome => ({ id: p.id, x: p.share * w, y: p.y, facing: 1, followDx: p.share * w }));
    homes.push(
      { id: 'gnome-a', x: gate.at + GNOME_A.share * w, y: GNOME_A.y, facing: -1 },
      { id: 'gnome-b', x: gate.at + GNOME_B.share * w, y: GNOME_B.y, facing: -1 },
      { id: 'gnome-chief', x: council.at + CHIEF.share * w, y: CHIEF.y, facing: -1 },
    );
    const spots: Point[] = [
      ...SPOT_SHARES.map(([share, y]) => ({ x: gate.at + share * w, y })),
      ...SPOT_SHARES_COUNCIL.map(([share, y]) => ({ x: council.at + share * w, y })),
    ];
    const clue = (id: string, kind: Clue['kind'], x: number, y: number): Clue => ({ id: `woods-${id}`, kind, place: 'woods', x, y, w: CLUE_SIZE, h: CLUE_SIZE });
    return {
      homes,
      spots,
      clues: [
        clue('symbol', 'symbol', layout.symbol, SYMBOL_ROW),
        clue('note', 'note', layout.note, NOTE_ROW),
        clue('page', 'page', layout.page, PAGE_ROW),
        clue('peek', 'peek', layout.peek, PEEK_ROW),
      ],
    };
  }

  drawBehind(ctx: Ctx, cameraX: number, time: number, night: number): void {
    this.drawShafts(ctx, cameraX, time, night);
    this.drawEyes(ctx, cameraX, time, night);
    this.drawBoughs(ctx, this.backBoughs, cameraX * FACTOR_BOUGH_BACK, BOUGH_BACK_SPACING, BOUGH_BACK_TOP, time);
    this.drawMist(ctx, cameraX, time, night);
    this.drawStream(ctx, cameraX, time);
    this.drawCloth(ctx, cameraX, time);
    this.drawSmoke(ctx, cameraX, time);
    this.drawPollen(ctx, cameraX, time, night);
  }

  drawAhead(ctx: Ctx, cameraX: number, time: number): void {
    const { peek } = this.layout;
    drawSwayTree(ctx, this.sideBush, peek + SIDE_BUSH.dx - cameraX, SIDE_BUSH.foot, time, BUSH_SWAY);
    drawSwayTree(ctx, this.peekBush, peek - cameraX, PEEK_BUSH.foot, time, BUSH_SWAY);
    this.drawGrassFront(ctx, cameraX, time);
    this.drawBoughs(ctx, this.frontBoughs, cameraX * FACTOR_FOREGROUND, BOUGH_FRONT_SPACING, BOUGH_FRONT_TOP, time);
    this.drawLeaves(ctx, cameraX, time);
  }

  drawGlow(ctx: Ctx, cameraX: number, time: number, night: number): void {
    const dusk = ramp(DUSK_FROM, DUSK_TO, night);
    if (dusk <= 0) return;
    const view = this.layout.designWidth;
    const { lights } = this.anchors;
    for (let i = 0; i < lights.length; i++) {
      const light = lights[i];
      const sx = light.x - cameraX;
      if (sx < -light.radius || sx > view + light.radius) continue;
      const flicker = 0.85 + 0.15 * Math.sin(time * (1.1 + (i % 3) * 0.27) + i * 1.9);
      drawHalo(ctx, sx, light.y, light.radius, GLOW_COLOR, dusk * flicker);
    }
    this.drawFireflies(ctx, cameraX, time, dusk);
  }

  /** The socks, the stream and the mushroom ring answer a click; anything else is left alone. */
  press(x: number, y: number, time: number): boolean {
    const { ford, ring } = this.layout;
    const { socks: line } = this.anchors;
    if (Math.abs(x - ford) <= STREAM_CLICK_HALF && y >= STREAM_CLICK_TOP && y <= STREAM_CLICK_BOTTOM) {
      this.splashAt = time;
      this.splashX = x;
      this.splashY = y;
      return true;
    }
    if (x >= line.x0 - SOCK_CLICK_PAD && x <= line.x1 + SOCK_CLICK_PAD && y >= SOCK_CLICK_TOP && y <= SOCK_CLICK_BOTTOM) {
      this.sockKick = time;
      return true;
    }
    if (Math.abs(x - ring) <= RING_CLICK_HALF && y >= RING_CLICK_TOP && y <= RING_CLICK_BOTTOM) {
      this.sporesAt = time;
      return true;
    }
    return false;
  }

  /** Slanted shafts of light through the canopy, drifting past at half the walker's speed and breathing slowly; gone at night. */
  private drawShafts(ctx: Ctx, cameraX: number, time: number, night: number): void {
    const day = 1 - night;
    if (day <= 0.02) return;
    const offset = cameraX * SHAFT_FACTOR;
    const view = this.layout.designWidth;
    for (let k = Math.floor((offset - this.beam.width) / SHAFT_SPACING) - 1; k * SHAFT_SPACING - offset < view + SHAFT_SPACING; k++) {
      const sx = fieldX(k, SHAFT_SPACING) - offset;
      if (sx < -this.beam.width || sx > view) continue;
      ctx.globalAlpha = SHAFT_ALPHA * day * (0.65 + 0.35 * Math.sin(time * 0.4 + k * 2.1)) * (0.5 + 0.5 * hash(k * 1.7));
      ctx.drawImage(this.beam, Math.round(sx), SHAFT_TOP);
    }
    ctx.globalAlpha = 1;
  }

  /** Is something tall (a giant trunk, the carved tree, the gate, the village tree) in front of screen column `sx`? */
  private covered(sx: number, cameraX: number): boolean {
    const { trunks } = this;
    for (let i = 0; i < trunks.length; i++) {
      if (Math.abs(sx - (trunks[i].x - cameraX * FACTOR_TRUNKS)) < trunks[i].w / 2 + EYE_HIDE_MARGIN) return true;
    }
    const { occluders } = this.anchors;
    for (let i = 0; i < occluders.length; i++) {
      if (sx > occluders[i][0] - cameraX - EYE_HIDE_MARGIN && sx < occluders[i][1] - cameraX + EYE_HIDE_MARGIN) return true;
    }
    return false;
  }

  /** Pairs of eyes that open and blink in the dark gaps between the mid trees, brighter at night. */
  private drawEyes(ctx: Ctx, cameraX: number, time: number, night: number): void {
    const strength = EYE_DAY_STRENGTH + (1 - EYE_DAY_STRENGTH) * night;
    const view = this.layout.designWidth;
    for (let i = 0; i < this.gaps.length; i++) {
      const gap = this.gaps[i];
      const sx = gap.x - cameraX * FACTOR_MID;
      if (sx < EYE_EDGE || sx > view - EYE_EDGE) continue;
      const u = ((time + i * 7.3) % EYE_PERIOD) / EYE_PERIOD;
      const open = ramp(EYE_OUT_FROM, EYE_OUT_FROM + EYE_FADE, u) * (1 - ramp(EYE_OUT_TO - EYE_FADE, EYE_OUT_TO, u));
      if (open <= 0 || (time + i * 2.9) % EYE_BLINK_PERIOD < EYE_BLINK_SECONDS || this.covered(sx, cameraX)) continue;
      ctx.globalAlpha = open * strength;
      rect(ctx, EYE_COLOR, sx - 3, gap.y, 1, 2);
      rect(ctx, EYE_COLOR, sx + 2, gap.y, 1, 2);
    }
    ctx.globalAlpha = 1;
  }

  /** Boughs hanging from the canopy along the top of the picture, one about every `spacing` pixels of the field. */
  private drawBoughs(ctx: Ctx, sprites: readonly HTMLCanvasElement[], offset: number, spacing: number, top: number, time: number): void {
    const view = this.layout.designWidth;
    for (let k = Math.floor((offset - BOUGH_REACH) / spacing) - 1; k * spacing - offset < view + BOUGH_REACH; k++) {
      const sx = fieldX(k, spacing) - offset;
      if (sx < -BOUGH_REACH || sx > view) continue;
      drawBough(ctx, variant(sprites, k), sx, top + Math.floor(hash(k * 5.3) * 10), time);
    }
  }

  /** Low mist drifting along the floor of the forest, a little thicker at night. */
  private drawMist(ctx: Ctx, cameraX: number, time: number, night: number): void {
    const span = this.layout.designWidth + this.wisp.width;
    ctx.globalAlpha = WISP_ALPHA + WISP_NIGHT_ALPHA * night;
    for (let i = 0; i < WISP_ROWS.length; i++) {
      const x = wrap(i * 97 + time * WISP_SPEEDS[i] - cameraX * WISP_FACTOR, span) - this.wisp.width;
      ctx.drawImage(this.wisp, Math.round(x), WISP_ROWS[i]);
    }
    ctx.globalAlpha = 1;
  }

  /** Glints that flow down the stream toward the walker, a splash where a click landed and the spores of a clicked ring. */
  private drawStream(ctx: Ctx, cameraX: number, time: number): void {
    const { ford, ring, designWidth: view } = this.layout;
    if (ford - cameraX > -STREAM_VIEW_REACH && ford - cameraX < view + STREAM_VIEW_REACH) {
      for (let j = 0; j < RIPPLE_COUNT; j++) {
        const y = RIPPLE_FROM + Math.floor((time * 2.2 + j * 4.5) % RIPPLE_SPAN);
        const { left, right } = streamAt(ford, y);
        rect(ctx, RIPPLE_COLOR, left + 3 + hash(j * 7.7) * (right - left - 8) - cameraX, y, 3, 1);
      }
      const splash = time - this.splashAt;
      if (splash >= 0 && splash < SPLASH_SECONDS) this.drawSplash(ctx, cameraX, splash / SPLASH_SECONDS);
    }
    const spores = time - this.sporesAt;
    if (spores >= 0 && spores < SPORE_SECONDS && Math.abs(ring - cameraX - view / 2) < view) {
      for (let i = 0; i < SPORE_COUNT; i++) {
        const u = spores / SPORE_SECONDS;
        ctx.globalAlpha = 1 - u;
        rect(ctx, i % 3 === 0 ? '#ee6a58' : '#f4ecd2', ring - cameraX + (i - SPORE_COUNT / 2) * 3 + Math.sin(spores * 3 + i) * 4, SPORE_ROW - spores * 14 - (i % 3) * 3, 1 + (i % 2), 1);
      }
      ctx.globalAlpha = 1;
    }
  }

  /** Two rings spreading over the water and a few drops thrown up and falling back. */
  private drawSplash(ctx: Ctx, cameraX: number, u: number): void {
    const x = this.splashX - cameraX;
    ctx.globalAlpha = 1 - u;
    for (let ring = 0; ring < 2; ring++) {
      const radius = 2 + (u + ring * 0.25) * 14;
      for (let a = 0; a < 8; a++) {
        const angle = (a * Math.PI) / 4;
        rect(ctx, RIPPLE_COLOR, x + Math.cos(angle) * radius, this.splashY + Math.sin(angle) * radius * 0.4, 1, 1);
      }
    }
    for (let d = 0; d < SPLASH_DROPS; d++) {
      rect(ctx, '#dff6fa', x + (d - 2) * 3 * u * 3, this.splashY - (18 * u - 22 * u * u), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  /** The gnomes' sock line (it swings when clicked) and the pennants on the gate, the council pole and the tavern. */
  private drawCloth(ctx: Ctx, cameraX: number, time: number): void {
    const { socks, pennants, tavernFlag } = this.anchors;
    const view = this.layout.designWidth;
    if (socks.x1 - cameraX > 0 && socks.x0 - cameraX < view) {
      const kick = Math.max(0, 1 - (time - this.sockKick) / SOCK_KICK_SECONDS);
      const swing = 1 + gust(time) * 1.5 + kick * kick * SOCK_KICK_SWING;
      const length = socks.x1 - socks.x0;
      for (let dx = 0; dx <= length; dx++) {
        rect(ctx, STRING_COLOR, socks.x0 + dx - cameraX, socks.y + Math.round(SOCK_SAG * Math.sin((Math.PI * dx) / length)), 1, 1);
      }
      for (let i = 0; i < SOCK_COUNT; i++) {
        const t = (i + 0.7) / (SOCK_COUNT + 0.4);
        const px = socks.x0 + t * length;
        const hang = socks.y + 1 + Math.round(SOCK_SAG * Math.sin(Math.PI * t));
        const sway = Math.round(breeze(time + i * 0.4, px) * swing);
        const x = px - cameraX;
        rect(ctx, SOCK_CUFF, x, hang, 3, 1);
        rect(ctx, SOCK_COLORS[i], x + Math.round(sway / 2), hang + 1, 2, 3);
        rect(ctx, SOCK_COLORS[i], x + sway, hang + 4, 3, 2);
      }
    }
    for (let i = 0; i < pennants.length; i++) {
      const sx = pennants[i].x - cameraX;
      if (sx > -PENNANT_LENGTH && sx < view) drawPennant(ctx, sx, pennants[i].y, time, PENNANT_COLORS[i]);
    }
    const flagX = tavernFlag.x - cameraX;
    if (flagX > -PENNANT_LENGTH && flagX < view) drawPennant(ctx, flagX, tavernFlag.y, time, PENNANT_COLORS[3]);
  }

  /** Smoke rising from the village tree's chimney, leaning with the wind as it climbs. */
  private drawSmoke(ctx: Ctx, cameraX: number, time: number): void {
    const { chimney } = this.anchors;
    const sx = chimney.x - cameraX;
    if (sx < -SMOKE_RISE || sx > this.layout.designWidth + SMOKE_RISE) return;
    for (let i = 0; i < SMOKE_PUFFS; i++) {
      const u = (time * SMOKE_RATE + i / SMOKE_PUFFS) % 1;
      ctx.globalAlpha = (1 - u) * 0.5;
      const size = 2 + Math.floor(u * 3);
      rect(ctx, SMOKE_COLOR, sx + breeze(time, chimney.x) * 5 * u + Math.sin(u * 6 + i) - size / 2, chimney.y - u * SMOKE_RISE, size, size);
    }
    ctx.globalAlpha = 1;
  }

  /** Specks of pollen drifting in the light, fewer and fainter at night. */
  private drawPollen(ctx: Ctx, cameraX: number, time: number, night: number): void {
    const view = this.layout.designWidth;
    ctx.globalAlpha = 0.55 - 0.35 * night;
    for (let i = 0; i < POLLEN_COUNT; i++) {
      const speed = 1.2 + hash(i * 3.3) * 1.6;
      const x = wrap(hash(i * 1.9) * view + time * speed - cameraX * 0.8, view);
      const y = 70 + hash(i * 6.1) * 140 + Math.sin(time * 0.7 + i) * 4;
      rect(ctx, POLLEN_COLOR, x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  /** Grass tufts in front of the cast's feet, sliding a little faster than the walk and swaying in the wind. */
  private drawGrassFront(ctx: Ctx, cameraX: number, time: number): void {
    const view = this.layout.designWidth;
    const offset = cameraX * FACTOR_FOREGROUND;
    for (let k = Math.floor(offset / GRASS_SPACING) - 1; k * GRASS_SPACING - offset < view + GRASS_SPACING; k++) {
      const sx = fieldX(k, GRASS_SPACING) - offset;
      if (sx < -GRASS_SPACING || sx > view + GRASS_SPACING) continue;
      drawGrass(ctx, this.grass, sx, GRASS_FOOT, Math.floor(hash(k * 2.7) * 6), time, GRASS_SWAY);
    }
  }

  /** Leaves letting go of the canopy and spinning slowly down, each on its own beat. */
  private drawLeaves(ctx: Ctx, cameraX: number, time: number): void {
    const view = this.layout.designWidth;
    for (let i = 0; i < LEAF_COUNT; i++) {
      const u = ((time + i * 3.7) / (13 + i * 1.7)) % 1;
      const x = wrap(hash(i * 4.1) * view + Math.sin(time * 0.9 + i) * 10 + breeze(time, i * 40) * 6 - cameraX * FACTOR_FOREGROUND, view + 40) - 20;
      const flat = Math.floor(time * 2.5 + i) % 2 === 0;
      rect(ctx, LEAF_COLORS[i % LEAF_COLORS.length], x, LEAF_TOP + u * LEAF_FALL, flat ? 2 : 1, flat ? 1 : 2);
    }
  }

  /** Fireflies wandering through the trees after dusk, each blinking on its own slow beat. */
  private drawFireflies(ctx: Ctx, cameraX: number, time: number, dusk: number): void {
    const view = this.layout.designWidth;
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      const x = wrap(hash(i * 2.3) * view + Math.sin(time * 0.35 + i * 1.7) * 14 - cameraX * 0.9, view);
      const y = 120 + hash(i * 5.9) * 100 + Math.sin(time * 0.5 + i * 2.3) * 8;
      const blink = 0.5 + 0.5 * Math.sin(time * 0.9 + i * 2.1);
      ctx.globalAlpha = dusk * blink;
      rect(ctx, FIREFLY_COLOR, x, y, 1, 1);
      drawHalo(ctx, x, y, 3, FIREFLY_COLOR, dusk * blink * 0.5);
    }
    ctx.globalAlpha = 1;
  }
}

export const buildWoodsWorld: WorldBuilder = (designWidth) => new WoodsWorld(designWidth);
