import { css, mix, type RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { hourNow } from '../../../scene/clock';
import type { Look } from '../../../wallpapers/look';
import { clamp } from '../../../world/math';
import { drawHalo } from '../../gravity-falls/art-kit';
import type { NightSky } from '../../night-sky';
import { SkyDome, type SkyState } from '../../sky';
import type { OutsideView, ViewFrame } from '../../view';
import { Drift } from './drift';
import { buildCanopy, drawClumps, type Canopy } from './foliage';
import { Ground } from './ground';
import { DESIGN_HEIGHT, GAP_HALF_H, GAP_HALF_W, GAP_ROW, LIFT, SUN_SHARE_X } from './layout';
import { Sunlight } from './light';
import { paintTrunks, type Trunk } from './trunks';

/** The sky is painted from the top down to this share of the height; leaves and trunks cover the rest. */
const SKY_HORIZON = 0.45;
/** Strongest the beams get in high sun, and in moonlight. */
const SUN_BEAM = 1;
const MOON_BEAM = 0.2;
/** The sun is at its highest at 1 and the beams reach full strength a little before that. */
const BEAM_RISE = 2.2;
const NIGHT_LIGHT: RGB = [14, 28, 58];
const NIGHT_SHADE = 0.5;
const DUSK_ORANGE: RGB = [238, 146, 88];
const DUSK_SHADE = 0.14;
const DUSK_SKY_MIX = 0.4;
const GAP_GLOW = '#fff2c0';
const GAP_GLOW_RADIUS = 96;
const GAP_GLOW_ROW = GAP_ROW - 14;
/** Seconds the canopy sways harder after a click, and how much harder at the start. */
const SHAKE_SECONDS = 4;
const SHAKE_FORCE = 2.2;
/** A soft shade behind the clock, so its white numbers stay readable against the sky. */
const CLOCK_SHADE = '#071a12';
const CLOCK_SHADE_ROW = 140;
const CLOCK_SHADE_RADIUS = 120;
const CLOCK_SHADE_STRENGTH = 0.9;
/** The pale green-gold light between the trunks, which the sky only replaces around the opening in the leaves. */
const CANOPY_HAZE: RGB = [84, 126, 78];
const HAZE_DAY_SHARE = 0.8;
const HAZE_NIGHT_SHARE = 0.18;
/** The sky shows through a soft oval this many times the size of the opening. */
const SKY_WINDOW = 1.7;
/** Sunbeams in a forest look golden: the sky's light is pulled towards this gold by day. */
const BEAM_GOLD: RGB = [255, 216, 120];
const BEAM_GOLD_SHARE = 0.55;
const FOREST_LIGHT: RGB = [86, 124, 74];

interface Depth {
  trunks: readonly Trunk[];
  haze: number;
  hazeColour: string;
}

/** Trunk positions are shares of the width at the bottom row; they lean in towards the middle as they rise. */
const FAR: Depth = {
  haze: 0.5, hazeColour: '#6f9f7c',
  trunks: [-0.3, -0.16, -0.03, 0.08, 0.17, 0.26, 0.34, 0.42, 0.5, 0.58, 0.66, 0.75, 0.84, 0.94, 1.05, 1.17, 1.3].map((s, i) => ({ baseX: s, width: 20 + (i % 3) * 5 })),
};
const MID: Depth = {
  haze: 0.3, hazeColour: '#4f7f62',
  trunks: [-0.16, 0.05, 0.3, 0.52, 0.76, 0.98, 1.2].map((s, i) => ({ baseX: s, width: 38 + (i % 2) * 10 })),
};
const NEAR: Depth = {
  haze: 0, hazeColour: '#000000',
  trunks: [{ baseX: -0.05, width: 96 }, { baseX: 1.06, width: 92 }, { baseX: 0.18, width: 62 }],
};

const scaled = (depth: Depth, width: number): Trunk[] => depth.trunks.map((t) => ({ baseX: t.baseX * width, width: t.width }));

interface Built {
  width: number;
  far: HTMLCanvasElement;
  mid: HTMLCanvasElement;
  near: HTMLCanvasElement;
  canopy: Canopy;
  light: Sunlight;
  drift: Drift;
  ground: Ground;
}

/** Lying in a pasture on a tree root, looking up through tall trunks and leaves into the sun. */
export class ForestCanopy implements OutsideView {
  private w = 0;
  private h = 0;
  private unit = 1;
  private built: Built | null = null;
  private shakenAt = -Infinity;
  private time = 0;
  private readonly dome: SkyDome;
  private readonly sky = memoryCanvas(1, 1);
  private readonly picture = memoryCanvas(1, 1);
  private readonly window = memoryCanvas(1, 1);
  private readonly look: Look = { mean: 0.35, sun: null, sky: [], night: 0, tint: [70, 100, 60] };

  constructor(nightSky: NightSky) {
    this.dome = new SkyDome(nightSky, SKY_HORIZON);
    this.dome.fillSkyCells(this.look);
  }

  resize(w: number, h: number): void {
    this.w = Math.max(0, Math.round(w));
    this.h = Math.max(0, Math.round(h));
    if (this.w === 0 || this.h === 0) return;
    this.unit = this.h / DESIGN_HEIGHT;
    const width = Math.max(1, Math.round(this.w / this.unit));
    this.dome.resize(this.w, this.h);
    this.sky.canvas.width = this.w;
    this.sky.canvas.height = this.h;
    this.picture.canvas.width = width;
    this.picture.canvas.height = DESIGN_HEIGHT;
    this.picture.ctx.imageSmoothingEnabled = false;
    this.window.canvas.width = width;
    this.window.canvas.height = DESIGN_HEIGHT;
    if (this.built?.width === width) return;
    this.built = {
      width,
      far: paintTrunks(width, scaled(FAR, width), FAR.hazeColour, FAR.haze, 3),
      mid: paintTrunks(width, scaled(MID, width), MID.hazeColour, MID.haze, 29),
      near: paintTrunks(width, scaled(NEAR, width), NEAR.hazeColour, NEAR.haze, 57),
      canopy: buildCanopy(width),
      light: new Sunlight(width),
      drift: new Drift(width),
      ground: new Ground(width),
    };
  }

  /** A click shakes the canopy: the leaves sway harder for a few seconds and some let go. */
  press(x: number): void {
    if (!this.built) return;
    this.shakenAt = this.time;
    this.built.drift.shake(this.time, x / this.unit);
  }

  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look {
    const { built } = this;
    if (!built || this.w === 0 || this.h === 0) return this.look;
    this.time = frame.time;
    const state = this.dome.stateAt(hourNow());
    const beam = this.beamStrength(state);
    this.updateLook(state, beam);
    this.dome.draw(this.sky.ctx, state, frame, this.look);
    this.paint(this.picture.ctx, built, state, beam, frame.time);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0c1f18';
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.drawImage(this.picture.canvas, 0, -LIFT * this.unit, this.w, DESIGN_HEIGHT * this.unit);
    ctx.restore();
    return this.look;
  }

  private beamStrength(state: SkyState): number {
    const sun = state.day * clamp(state.sun.up * BEAM_RISE, 0, 1) * SUN_BEAM;
    const moon = (1 - state.day) * clamp(state.moon.up * BEAM_RISE, 0, 1) * MOON_BEAM;
    return Math.max(sun, moon);
  }

  private paint(c: CanvasRenderingContext2D, built: Built, state: SkyState, beam: number, time: number): void {
    const { width } = built;
    const shake = 1 + SHAKE_FORCE * clamp(1 - (time - this.shakenAt) / SHAKE_SECONDS, 0, 1);
    const light = mix(state.sky.light, BEAM_GOLD, BEAM_GOLD_SHARE * state.day);
    const lit = beam / SUN_BEAM;
    c.fillStyle = css(mix(state.sky.horizon, CANOPY_HAZE, HAZE_NIGHT_SHARE + (HAZE_DAY_SHARE - HAZE_NIGHT_SHARE) * state.day));
    c.fillRect(0, 0, width, DESIGN_HEIGHT);
    this.skyWindow(width);
    c.drawImage(this.window.canvas, 0, 0);
    c.save();
    c.globalCompositeOperation = 'lighter';
    drawHalo(c, width * SUN_SHARE_X, GAP_GLOW_ROW, GAP_GLOW_RADIUS, GAP_GLOW, clamp(lit, 0, 1) * state.day);
    c.restore();
    c.drawImage(built.far, 0, 0);
    drawClumps(c, built.canopy.far, time, shake);
    built.light.drawBeams(c, time, beam, light);
    c.drawImage(built.mid, 0, 0);
    drawClumps(c, built.canopy.mid, time, shake);
    c.drawImage(built.near, 0, 0);
    drawClumps(c, built.canopy.near, time, shake);
    drawHalo(c, width / 2, CLOCK_SHADE_ROW, CLOCK_SHADE_RADIUS, CLOCK_SHADE, CLOCK_SHADE_STRENGTH);
    built.light.drawSparkle(c, time, beam * 1.1, css(light));
    built.drift.draw(c, time, state.day);
    built.ground.draw(c, time);
    this.tint(c, width, state);
  }

  /** The sky, faded out to nothing round the opening in the leaves. */
  private skyWindow(width: number): void {
    const s = this.window.ctx;
    s.globalCompositeOperation = 'source-over';
    s.clearRect(0, 0, width, DESIGN_HEIGHT);
    s.drawImage(this.sky.canvas, 0, 0, width, DESIGN_HEIGHT);
    s.globalCompositeOperation = 'destination-in';
    s.save();
    s.translate(width * SUN_SHARE_X, GAP_ROW);
    s.scale(GAP_HALF_W * SKY_WINDOW, GAP_HALF_H * SKY_WINDOW);
    const fade = s.createRadialGradient(0, 0, 0, 0, 0, 1);
    fade.addColorStop(0, 'rgba(0,0,0,1)');
    fade.addColorStop(0.55, 'rgba(0,0,0,0.9)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    s.fillStyle = fade;
    s.fillRect(-1, -1, 2, 2);
    s.restore();
    s.globalCompositeOperation = 'source-over';
  }

  /** Night blue over everything drawn, and a warm wash when the sun is low. */
  private tint(c: CanvasRenderingContext2D, width: number, state: SkyState): void {
    const night = 1 - state.day;
    const warm = (1 - clamp(state.sun.up * 2, 0, 1)) * state.day;
    c.save();
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = css(NIGHT_LIGHT, night * NIGHT_SHADE);
    c.fillRect(0, 0, width, DESIGN_HEIGHT);
    c.fillStyle = css(mix(DUSK_ORANGE, state.sky.light, DUSK_SKY_MIX), warm * DUSK_SHADE);
    c.fillRect(0, 0, width, DESIGN_HEIGHT);
    c.restore();
  }

  /** The room gets green forest light, with a gold glint where the sun comes through. */
  private updateLook(state: SkyState, beam: number): void {
    const tint = mix(FOREST_LIGHT, NIGHT_LIGHT, (1 - state.day) * NIGHT_SHADE);
    this.look.tint = tint;
    this.look.mean = (tint[0] * 0.2126 + tint[1] * 0.7152 + tint[2] * 0.0722) / 255;
    this.look.night = 1 - state.day;
    this.look.sun = beam > 0.05 ? { u: SUN_SHARE_X, v: 0.05, strength: Math.min(1, beam * 1.4), color: state.sky.light } : null;
  }
}
