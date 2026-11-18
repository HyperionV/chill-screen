import { css } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { hash, noise, ramp } from '../../journeys/noise';
import { pixmap } from '../../journeys/pixmap';
import type { SkyState } from '../../sky';
import { gust } from '../../wind';
import { flicker, glow, halo, threshold } from './light-sprites';
import { CANOE_LAMP_X, CANOE_LAMP_Y, canoeX, canoeY, DESIGN_HEIGHT, LILY_COUNT, LILY_FLOWER_HEIGHT, LILY_FLOWER_SPACING, lilySway, lilyX, lilyY, WATERLINE } from './scenes';
import { sprite } from './sprites';

const LAMP_COLUMNS = [0.27, 0.29, 0.77, 0.25, 0.73];
const LAMP_HEIGHT = 15;
const MIST_WISPS = 5;
/** Wisp speed in design pixels per second, with nearer wisps drifting faster. */
const MIST_SPEED = 0.55;
const MIST_SPEED_STEP = 0.16;
const MIST_GUST_BOOST = 0.85;
/** How slowly and how far the wisps blend toward the second outline. */
const MIST_MORPH_RATE = 0.15;
const MIST_MORPH_MAX = 0.55;
const MIST_ALTERNATE_PHASE = 37;
const FIREFLY_COUNT = 17;
const OWL_INTERVAL = 61;
const OWL_CROSSING = 29;
const LANTERN_PALETTE = { d: '#2e3a42', s: '#526066', h: '#849090', g: '#766849' };
const OWL_PALETTE = { d: '#19283d', m: '#46536a', h: '#8993a0', b: '#c1bda2' };

const FIREFLIES = Array.from({ length: FIREFLY_COUNT }, (_, i) => ({
  u: i % 2 ? 0.72 + hash(i + 173) * 0.23 : 0.055 + hash(i + 173) * 0.28,
  v: 0.73 + hash(i + 220) * 0.22,
  phase: hash(i + 361) * Math.PI * 2,
}));

function mistWisp(phase: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(116, 11);
  const mid = '#8198aa';
  const top = '#b2c3ce';
  for (let x = 0; x < canvas.width; x++) {
    const t = x / (canvas.width - 1);
    const taper = Math.sin(t * Math.PI);
    const crest = 4 + (noise((x + phase) / 21) - 0.5) * 4;
    for (let y = 0; y < canvas.height; y++) {
      const distance = (y - crest) / (y < crest ? 3 : 6);
      const density = taper * Math.max(0, 1 - Math.abs(distance)) * (0.5 + noise((x + phase) / 14) * 0.5);
      if (density < threshold(x, y) * 0.94) continue;
      ctx.fillStyle = distance < -0.12 ? top : mid;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

export class LakeLighting {
  private w = 1;
  private h = 1;
  private unit = 1;
  private horizon = 1;
  private mistTravel = 0;
  private readonly moonHalo = halo(32, 32, [161, 191, 229], 6);
  private readonly amberHalo = halo(17, 13, [255, 186, 91]);
  private readonly bankSpill = halo(29, 5, [246, 176, 96]);
  private readonly budHalo = halo(7, 5, [200, 229, 142]);
  private readonly fireflyHalo = halo(5, 4, [214, 230, 124]);
  private readonly mist = mistWisp(0);
  private readonly mistAlternate = mistWisp(MIST_ALTERNATE_PHASE);
  private readonly lantern = pixmap([
    '........d........', '.......dhd.......', '......dhhsd......', '.....ddddddd.....',
    '.....dggggsd.....', '.....dgggghd.....', '.....dggggsd.....', '.....ddddddd.....',
    '......dhhsd......', '.......dhd.......', '.......dsd.......', '.......dsd.......',
    '.......dsd.......', '......dhhsd......', '.....dhhsssd.....', '...dhdsssssddd...',
    '.dhdhsssdsdssddd.', 'ddddsdddddddddddd', '..ddd.d...dd.d...',
  ], LANTERN_PALETTE);
  private readonly owl = [
    pixmap([
      '.hh.....................', 'hdmm.............mmm....', 'ddmdmm.........mmdhmm...',
      '.ddddmm..m...mmdddmh....', '..dddddmmhdmmddddmd.....', '....ddddmhmdddddmd......',
      '......dddmbhdddd........', '.......ddmhdd...........', '........ddd.............',
      '.......dd...............',
    ], OWL_PALETTE),
    pixmap([
      '...........m............', '.........mhhm...........', '........mdmbh...........',
      '......mmddmhddddmm......', '....mmddddddddddmdmm....', '...mdddddmdddmmdddmhm...',
      '..mdddmdd.ddd..ddmdmhm..', '..dddddd..dd.....dddmm..', '...ddddd.dd........dmm..',
      '.....dd.d...............',
    ], OWL_PALETTE),
  ];

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.unit = h / DESIGN_HEIGHT;
    this.horizon = Math.round(h * WATERLINE);
  }

  moon(ctx: CanvasRenderingContext2D, x: number, y: number, state: SkyState): void {
    if (state.moon.up <= 0 || state.day >= 1) return;
    glow(ctx, this.moonHalo, x, y, this.unit, (1 - state.day) * 0.57 * ramp(0, 0.18, state.moon.up));
  }

  lampX(scene: number): number {
    return Math.round(this.w * LAMP_COLUMNS[scene]);
  }

  lampPower(state: SkyState, time: number): number {
    return ramp(0.08, 0.9, 1 - state.day) * flicker(time);
  }

  canoePower(state: SkyState, time: number): number {
    return ramp(0.05, 0.8, 1 - state.day) * flicker(time, 2.9);
  }

  farShore(ctx: CanvasRenderingContext2D, x: number, power: number, day: number): void {
    const u = this.unit;
    const y = Math.round(this.horizon - LAMP_HEIGHT * u);
    ctx.globalAlpha = 0.9 - day * 0.12;
    sprite(ctx, this.lantern, x, this.horizon, u);
    ctx.globalAlpha = 1;
    if (power <= 0) return;
    glow(ctx, this.bankSpill, x, this.horizon - 2 * u, u, power * 0.75);
    glow(ctx, this.amberHalo, x, y, u, power);
    ctx.fillStyle = css([255, 188, 98], power);
    ctx.fillRect(Math.round(x - 2 * u), Math.round(y + u), Math.max(1, Math.round(5 * u)), Math.max(1, Math.round(3 * u)));
    ctx.fillStyle = css([255, 234, 181], power);
    ctx.fillRect(Math.round(x - u), Math.round(y + u), Math.max(1, Math.round(2 * u)), Math.max(1, Math.round(2 * u)));
  }

  updateMist(dt: number, time: number): void {
    this.mistTravel += dt * (1 + MIST_GUST_BOOST * gust(time));
  }

  lakeMist(ctx: CanvasRenderingContext2D, scene: number, state: SkyState, time: number): void {
    const night = 1 - state.day;
    const strength = scene === 0 ? 0.16 + night * 0.1 : 0.23 * night;
    if (strength < 0.015) return;
    const wispW = Math.max(1, Math.round(this.w * 0.31));
    const wispH = Math.max(1, Math.round(this.mist.height * this.unit));
    const span = this.w + wispW;
    for (let i = 0; i < MIST_WISPS; i++) {
      const distance = this.mistTravel * this.unit * (MIST_SPEED + i * MIST_SPEED_STEP);
      const x = Math.round((i / MIST_WISPS * span + distance) % span - wispW);
      const y = Math.round(this.h * (0.57 + (i % 3) * 0.033));
      const nearMoon = state.moon.up > 0 ? Math.max(0, 1 - Math.abs((x + wispW / 2) / this.w - state.moon.u) * 4) : 0;
      const opacity = strength * (0.48 + nearMoon * night * 0.52);
      const morph = MIST_MORPH_MAX * (0.5 + 0.5 * Math.sin(time * MIST_MORPH_RATE + i));
      ctx.globalAlpha = opacity * (1 - morph);
      ctx.drawImage(this.mist, x, y, wispW, wispH);
      ctx.globalAlpha = opacity * morph;
      ctx.drawImage(this.mistAlternate, x, y, wispW, wispH);
    }
    ctx.globalAlpha = 1;
  }

  owlFlight(ctx: CanvasRenderingContext2D, scene: number, state: SkyState, time: number): void {
    const night = ramp(0.2, 0.82, 1 - state.day);
    if (night <= 0) return;
    const t = ((time + scene * 6) % OWL_INTERVAL - 3) / OWL_CROSSING;
    if (t <= 0 || t >= 1) return;
    const x = this.w * (-0.08 + t * 1.16);
    const u = this.unit;
    if (x < -16 * u || x > this.w + 16 * u) return;
    const y = this.h * (0.219 + Math.sin(t * Math.PI) * 0.045) + Math.sin(time * 1.3) * u;
    const wing = Math.sin(time * 4.2) > 0.55 ? 1 : 0;
    ctx.globalAlpha = night * 0.88;
    sprite(ctx, this.owl[wing], x, y, u * 1.25);
    ctx.globalAlpha = 1;
  }

  foreground(ctx: CanvasRenderingContext2D, scene: number, state: SkyState, time: number): void {
    const night = ramp(0.05, 0.8, 1 - state.day);
    if (night <= 0) return;
    const { w, h, unit: u } = this;
    if (scene === 2) {
      for (let i = 0; i < LILY_COUNT; i += LILY_FLOWER_SPACING) {
        const x = lilyX(i, w);
        this.bud(ctx, x + lilySway(time, x), lilyY(i, h) - LILY_FLOWER_HEIGHT * u, night * flicker(time, i));
      }
    }
    if (scene === 4) {
      const x = canoeX(w, u, time) + CANOE_LAMP_X * u;
      const y = canoeY(h, u, time) - CANOE_LAMP_Y * u;
      const power = this.canoePower(state, time);
      glow(ctx, this.bankSpill, x - 3 * u, y + 7 * u, u * 0.7, power * 0.75);
      glow(ctx, this.amberHalo, x, y, u * 0.8, power);
      ctx.fillStyle = css([255, 229, 159], power);
      ctx.fillRect(Math.round(x - u), Math.round(y), Math.max(1, Math.round(3 * u)), Math.max(1, Math.round(2 * u)));
    }
    const count = scene === 4 ? FIREFLY_COUNT : FIREFLY_COUNT - 5;
    for (let i = 0; i < count; i++) {
      const fly = FIREFLIES[i];
      const x = fly.u * w + Math.sin(time * 0.43 + fly.phase) * (5 + i % 3 * 3) * u;
      const y = fly.v * h + Math.cos(time * 0.61 + fly.phase) * 6 * u;
      const pulse = 0.5 + 0.5 * Math.sin(time * 1.37 + fly.phase);
      const power = night * pulse * pulse * 0.85;
      if (power < 0.08 || x < 0 || x >= w || y >= h) continue;
      glow(ctx, this.fireflyHalo, x, y, u, power);
      ctx.fillStyle = css([241, 240, 164], power);
      ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(u)), Math.max(1, Math.round(u)));
    }
  }

  bud(ctx: CanvasRenderingContext2D, x: number, y: number, strength: number): void {
    const u = this.unit;
    glow(ctx, this.budHalo, x, y + u, u, strength * 0.8);
    ctx.fillStyle = css([142, 182, 130], strength * 0.5);
    ctx.fillRect(Math.round(x - 3 * u), Math.round(y + 4 * u), Math.max(1, Math.round(6 * u)), 1);
    ctx.fillStyle = css([223, 238, 157], strength * 0.9);
    ctx.fillRect(Math.round(x - u), Math.round(y), Math.max(1, Math.round(2 * u)), Math.max(1, Math.round(2 * u)));
  }
}
