import { css, mix, type RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { hourNow } from '../../../scene/clock';
import type { Look } from '../../../wallpapers/look';
import { clamp } from '../../../world/math';
import { drawHalo } from '../../gravity-falls/art-kit';
import { ChapterTitle } from '../../journeys/chapter-title';
import { ramp } from '../../journeys/noise';
import { Route } from '../../journeys/route';
import type { NightSky } from '../../night-sky';
import { SkyDome, type SkyState } from '../../sky';
import type { OutsideView, ViewFrame } from '../../view';
import { CHAPTER_SECONDS, CHAPTER_SPECS, CHAPTERS, DISSOLVE_SECONDS } from './chapters';
import { drawClumps } from './foliage';
import { DESIGN_HEIGHT, LIFT } from './layout';
import { buildScene, type Scene } from './scene';

/** The sky is painted from the top down to this share of the height; leaves and trunks cover the rest. */
const SKY_HORIZON = 0.45;
const MAX_STEP = 0.1;
/** Strongest the beams get in high sun, and in moonlight. */
const SUN_BEAM = 1;
const MOON_BEAM = 0.2;
/** The beams reach full strength a little before the sun is at its highest. */
const BEAM_RISE = 2.2;
const NIGHT_LIGHT: RGB = [14, 28, 58];
const NIGHT_SHADE = 0.5;
const DUSK_ORANGE: RGB = [238, 146, 88];
const DUSK_SHADE = 0.14;
const DUSK_SKY_MIX = 0.4;
const GAP_GLOW = '#fff2c0';
const GAP_GLOW_RADIUS = 96;
const GAP_GLOW_LIFT = 14;
/** A soft shade behind the clock, so its white numbers stay readable against the sky. */
const CLOCK_SHADE = '#071a12';
const CLOCK_SHADE_ROW = 140;
const CLOCK_SHADE_RADIUS = 120;
const CLOCK_SHADE_STRENGTH = 0.9;
/** The pale green-gold light between the trunks, which the sky only replaces around the opening in the leaves. */
const CANOPY_HAZE: RGB = [62, 106, 62];
const HAZE_DAY_SHARE = 0.85;
const HAZE_NIGHT_SHARE = 0.18;
/** The sky shows through a soft oval this many times the size of the opening. */
const SKY_WINDOW = 1.7;
/** Sunbeams in a forest look golden: the sky's light is pulled towards this gold by day. */
const BEAM_GOLD: RGB = [255, 216, 120];
const FOREST_LIGHT: RGB = [86, 124, 74];
/** Seconds the canopy sways harder after a click, and how much harder at the start. */
const SHAKE_SECONDS = 4;
const SHAKE_FORCE = 2.2;
/** The next chapter is built this many seconds before the dissolve starts, so no frame has to build it in a hurry. */
const PREBUILD_LEAD = 8;

/** Lying in a pasture beneath old oaks, looking up through boughs, leaves and sunbeams. */
export class ForestCanopy implements OutsideView {
  private w = 0;
  private h = 0;
  private unit = 1;
  private width = 0;
  private time = 0;
  private scenes: (Scene | null)[] = CHAPTER_SPECS.map(() => null);
  private shakenAt = -Infinity;
  private shown = 0;
  readonly route = new Route('landscape-forest-canopy', CHAPTERS);
  private readonly title = new ChapterTitle();
  private readonly dome: SkyDome;
  private readonly sky = memoryCanvas(1, 1);
  private readonly window = memoryCanvas(1, 1);
  private readonly picture = memoryCanvas(1, 1);
  private readonly nextPicture = memoryCanvas(1, 1);
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
    for (const buffer of [this.window, this.picture, this.nextPicture]) {
      buffer.canvas.width = width;
      buffer.canvas.height = DESIGN_HEIGHT;
      buffer.ctx.imageSmoothingEnabled = false;
    }
    if (width !== this.width) this.scenes = CHAPTER_SPECS.map(() => null);
    this.width = width;
  }

  /** A click shakes the canopy: the leaves sway harder for a few seconds and some let go. */
  press(x: number): void {
    const scene = this.scenes[this.shown];
    if (!scene) return;
    this.shakenAt = this.time;
    scene.drift.shake(this.time, x / this.unit);
  }

  private sceneFor(index: number): Scene {
    const known = this.scenes[index];
    if (known) return known;
    const built = buildScene(this.width, CHAPTER_SPECS[index]);
    this.scenes[index] = built;
    return built;
  }

  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look {
    if (this.w === 0 || this.h === 0 || this.width === 0) return this.look;
    const dt = Math.min(MAX_STEP, Math.max(0, frame.dt));
    this.time = frame.time;
    this.route.advance(dt, 1);
    const now = this.route.now;
    const seconds = now.t * CHAPTER_SECONDS;
    const fade = ramp(CHAPTER_SECONDS - DISSOLVE_SECONDS, CHAPTER_SECONDS, seconds);
    if (seconds > CHAPTER_SECONDS - DISSOLVE_SECONDS - PREBUILD_LEAD) this.sceneFor(now.next);
    const scene = this.sceneFor(now.index);
    this.shown = fade > 0.5 ? now.next : now.index;
    const state = this.dome.stateAt(hourNow());
    this.updateLook(state, scene);
    this.dome.draw(this.sky.ctx, state, frame, this.look);
    this.paint(this.picture.ctx, scene, state, frame.time);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0c1f18';
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.drawImage(this.picture.canvas, 0, -LIFT * this.unit, this.w, DESIGN_HEIGHT * this.unit);
    if (fade > 0) {
      this.paint(this.nextPicture.ctx, this.sceneFor(now.next), state, frame.time);
      ctx.globalAlpha = fade;
      ctx.drawImage(this.nextPicture.canvas, 0, -LIFT * this.unit, this.w, DESIGN_HEIGHT * this.unit);
    }
    ctx.restore();
    this.title.draw(ctx, dt, this.w, this.h, CHAPTERS[this.shown].name);
    return this.look;
  }

  private beamStrength(state: SkyState, scene: Scene): number {
    const sun = state.day * clamp(state.sun.up * BEAM_RISE, 0, 1) * SUN_BEAM;
    const moon = (1 - state.day) * clamp(state.moon.up * BEAM_RISE, 0, 1) * MOON_BEAM;
    return Math.max(sun, moon) * scene.spec.beam;
  }

  private paint(c: CanvasRenderingContext2D, scene: Scene, state: SkyState, time: number): void {
    const { width, p, leaves, light } = scene;
    const beam = this.beamStrength(state, scene);
    const shake = 1 + SHAKE_FORCE * clamp(1 - (time - this.shakenAt) / SHAKE_SECONDS, 0, 1);
    const colour = mix(state.sky.light, BEAM_GOLD, scene.spec.gold * state.day);
    c.fillStyle = css(mix(state.sky.horizon, CANOPY_HAZE, HAZE_NIGHT_SHARE + (HAZE_DAY_SHARE - HAZE_NIGHT_SHARE) * state.day));
    c.fillRect(0, 0, width, DESIGN_HEIGHT);
    this.skyWindow(scene);
    c.drawImage(this.window.canvas, 0, 0);
    c.save();
    c.globalCompositeOperation = 'lighter';
    drawHalo(c, p.sunX, p.gapRow - GAP_GLOW_LIFT, GAP_GLOW_RADIUS * scene.spec.gapScale, GAP_GLOW, clamp(beam, 0, 1) * state.day);
    c.restore();
    c.drawImage(scene.far, 0, 0);
    drawClumps(c, leaves.far, time, shake);
    light.drawBeams(c, time, beam, colour);
    c.drawImage(scene.mid, 0, 0);
    drawClumps(c, leaves.mid, time, shake);
    c.drawImage(scene.near, 0, 0);
    drawClumps(c, leaves.near, time, shake);
    drawHalo(c, width / 2, CLOCK_SHADE_ROW, CLOCK_SHADE_RADIUS, CLOCK_SHADE, CLOCK_SHADE_STRENGTH);
    light.drawSparkle(c, time, beam * 1.1, css(colour));
    scene.drift.draw(c, time, state.day);
    scene.ground.draw(c, time);
    this.tint(c, width, state);
  }

  /** The sky, faded out to nothing round the opening in the leaves. */
  private skyWindow(scene: Scene): void {
    const { p, width } = scene;
    const s = this.window.ctx;
    s.globalCompositeOperation = 'source-over';
    s.clearRect(0, 0, width, DESIGN_HEIGHT);
    s.drawImage(this.sky.canvas, 0, 0, width, DESIGN_HEIGHT);
    s.globalCompositeOperation = 'destination-in';
    s.save();
    s.translate(p.sunX, p.gapRow);
    s.scale(p.gapHalfW * SKY_WINDOW, p.gapHalfH * SKY_WINDOW);
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
  private updateLook(state: SkyState, scene: Scene): void {
    const beam = this.beamStrength(state, scene);
    const tint = mix(FOREST_LIGHT, NIGHT_LIGHT, (1 - state.day) * NIGHT_SHADE);
    this.look.tint = tint;
    this.look.mean = (tint[0] * 0.2126 + tint[1] * 0.7152 + tint[2] * 0.0722) / 255;
    this.look.night = 1 - state.day;
    this.look.sun = beam > 0.05 ? { u: scene.spec.sunShare, v: 0.05, strength: Math.min(1, beam * 1.4), color: state.sky.light } : null;
  }
}
