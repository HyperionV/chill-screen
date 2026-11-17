import { memoryCanvas } from '../../../render/pixel-stage';
import type { RGB } from '../../../render/color';
import type { Look } from '../../../wallpapers/look';
import { PACE_SPEED, type Pace } from '../../journey/pace';
import type { NightSky } from '../../night-sky';
import { SkyDome, type SkyState } from '../../sky';
import type { ViewFrame } from '../../view';
import { ChapterTitle } from '../chapter-title';
import type { JourneyView } from '../journey-view';
import { lerp, ramp } from '../noise';
import { Route } from '../route';
import { Atmosphere, LAMP_X, LAMP_Y, LAMP_WIDTH, LAMP_HEIGHT } from './atmosphere';
import { FrostGlass } from './frost';
import { BLEND_START, CHAPTERS, DESIGN_HEIGHT, FROST, routeHour, stationMotion, TRAVEL_SPEED } from './chapters';
import { Scenery, type SceneryFrame } from './scenery';
import { buildSprites, type Sprites } from './sprites';
import { leaveRadioClear } from './radio-space';

const WHISTLE_SECONDS = 1.5;
const SHAKE_SECONDS = 0.3;
const LAMP_HIT_PADDING = 5;
const FROST_RATE = 0.012;
const MELT_RATE = 0.045;
const LUMA_RED = 0.2126;
const LUMA_GREEN = 0.7152;
const LUMA_BLUE = 0.0722;
const NIGHT_TINT: RGB = [75, 94, 116];
const LAMP_TINT: RGB = [96, 77, 52];
const TUNNEL_TINT: RGB = [10, 17, 26];
const LAMP_COLOR: RGB = [255, 218, 154];

function mixColor(a: RGB, b: RGB, t: number, result: RGB): RGB {
  for (let channel = 0; channel < 3; channel++) result[channel] = lerp(a[channel], b[channel], t);
  return result;
}

export class NightTrain implements JourneyView {
  private readonly route = new Route('night-train', CHAPTERS);
  private readonly title = new ChapterTitle();
  private readonly fog = new FrostGlass();
  private readonly scenery = new Scenery();
  private readonly air = new Atmosphere();
  private readonly dome: SkyDome;
  private readonly look: Look = { mean: 0.2, sun: null, sky: [], night: 1, tint: [40, 50, 70] };
  private readonly light: NonNullable<Look['sun']> = { u: 0, v: 0, strength: 0, color: LAMP_COLOR };
  private readonly skyColors = { zenith: [0, 0, 0], horizon: [0, 0, 0], light: [0, 0, 0], water: [0, 0, 0] } satisfies Record<string, RGB>;
  private readonly pointer = { x: 0, y: 0 };
  private readonly sceneryFrame: SceneryFrame = { width: 1, scroll: 0, time: 0, chapter: 0, progress: 0, alarm: 0, pointer: null };
  private stage: ReturnType<typeof memoryCanvas> | null = null;
  private land: ReturnType<typeof memoryCanvas> | null = null;
  private nextLand: ReturnType<typeof memoryCanvas> | null = null;
  private art: Sprites | null = null;
  private w = 1;
  private h = 1;
  private width = 480;
  private unit = 1;
  private speed = PACE_SPEED.gentle;
  private scroll = this.route.progress * this.route.total * TRAVEL_SPEED;
  private whistle = 0;
  private shake = 0;
  private chosenLamp = false;
  private lamp = false;

  constructor(nightSky: NightSky) {
    this.dome = new SkyDome(nightSky, 0.66);
    this.dome.fillSkyCells(this.look);
  }

  setPace(pace: Pace): void {
    this.speed = PACE_SPEED[pace];
  }

  resize(w: number, h: number): void {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.unit = this.h / DESIGN_HEIGHT;
    this.width = Math.max(1, Math.ceil(this.w / this.unit));
    this.stage = memoryCanvas(this.width, DESIGN_HEIGHT);
    this.land = memoryCanvas(this.width, DESIGN_HEIGHT);
    this.nextLand = memoryCanvas(this.width, DESIGN_HEIGHT);
    this.art ??= buildSprites();
    this.dome.resize(this.width, DESIGN_HEIGHT);
    this.fog.resize(this.w, this.h);
    this.fog.grow((FROST[this.route.now.index] ?? 0) * 0.6);
  }

  press(x: number, y: number): void {
    const lampX = x / this.unit;
    const lampY = y / this.unit;
    if (lampX >= LAMP_X - LAMP_HIT_PADDING && lampX <= LAMP_X + LAMP_WIDTH + LAMP_HIT_PADDING
      && lampY >= LAMP_Y - LAMP_HIT_PADDING && lampY <= LAMP_Y + LAMP_HEIGHT + LAMP_HIT_PADDING) {
      this.chosenLamp = !this.chosenLamp;
      return;
    }
    // Resetting bounded ages makes repeated whistles safe at every pace.
    this.whistle = WHISTLE_SECONDS;
    this.shake = SHAKE_SECONDS;
  }

  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look {
    if (!this.stage || !this.land || !this.nextLand || !this.art) return this.look;
    this.route.advance(frame.dt, this.speed);
    const now = this.route.now;
    const blend = ramp(BLEND_START, 1, now.t);
    const tunnel = (now.index === 4 ? 1 - blend : 0) + (now.next === 4 ? blend : 0);
    const motion = now.index === 5 ? stationMotion(now.t) : now.next === 5 ? 1 - blend : 1;
    this.scroll += frame.dt * TRAVEL_SPEED * this.speed * motion;
    this.whistle = Math.max(0, this.whistle - frame.dt);
    this.shake = Math.max(0, this.shake - frame.dt);
    const alarm = this.whistle / WHISTLE_SECONDS;
    this.lamp = this.chosenLamp || tunnel > 0.02;
    this.air.update(frame.dt, this.lamp, now.index, now.t);
    this.scenery.update(frame.dt, alarm);
    const state = this.skyState();
    this.updateLook(state, tunnel);
    const C = this.stage.ctx;
    C.imageSmoothingEnabled = false;
    C.clearRect(0, 0, this.width, DESIGN_HEIGHT);
    this.dome.draw(C, state, frame, this.look);
    const snowPass = (now.index === 3 ? 1 - blend : 0) + (now.next === 3 ? blend : 0);
    this.air.aurora(C, this.width, frame.time, snowPass * (1 - state.day));
    if (frame.pointer) {
      this.pointer.x = frame.pointer.x / this.unit;
      this.pointer.y = frame.pointer.y / this.unit;
    }
    const sceneryFrame = this.sceneryFrame;
    sceneryFrame.width = this.width;
    sceneryFrame.scroll = this.scroll;
    sceneryFrame.time = frame.time;
    sceneryFrame.chapter = now.index;
    sceneryFrame.progress = now.t;
    sceneryFrame.alarm = alarm;
    sceneryFrame.pointer = frame.pointer ? this.pointer : null;
    this.paintLand(this.land, sceneryFrame, state);
    C.drawImage(this.land.canvas, 0, 0);
    if (blend > 0) {
      sceneryFrame.chapter = now.next;
      sceneryFrame.progress = 0;
      this.paintLand(this.nextLand, sceneryFrame, state);
      C.save();
      C.globalAlpha = blend;
      C.drawImage(this.nextLand.canvas, 0, 0);
      C.restore();
    }
    C.save();
    leaveRadioClear(C, this.width, DESIGN_HEIGHT);
    // On broad bends the engine and its steam can be seen far along the line.
    if (tunnel < 1) {
      C.save();
      C.globalAlpha = 1 - tunnel;
      const bend = now.index === 2 || now.index === 3 || now.index === 6;
      const engineX = Math.round(this.width * 0.86);
      if (bend || alarm > 0) {
        C.fillStyle = '#43545d';
        C.fillRect(engineX - 9, 183, 18, 5);
        C.fillRect(engineX + 3, 179, 3, 5);
        C.fillStyle = '#d3bb87';
        C.fillRect(engineX - 7, 184, 2, 2);
        this.scenery.steam(C, engineX + 4, 178, frame.time, 0.5 + alarm);
        if (alarm > 0) {
          this.air.whistleSteam(C, engineX + 4, 178, 1 - alarm, this.art);
        }
      }
      C.restore();
    }
    this.air.mist(C, this.width, frame.time, now.index === 6 ? 1 - blend : now.next === 6 ? blend : 0);
    this.air.snow(C, this.width, frame.time, snowPass, tunnel);
    this.air.passingTrain(C, this.width, frame.time);
    C.restore();
    const bridgeBob = now.index === 2 && this.speed > 0 && Math.sin(frame.time * 3) > 0.65;
    const bump = this.shake > 0 || this.air.pressure > 0 || bridgeBob;
    const offset = bump && Math.sin(frame.time * 25) > 0 ? 1 : 0;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#182333';
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.drawImage(this.stage.canvas, 0, offset, this.w, this.h);
    const cold = lerp(FROST[now.index] ?? 0, FROST[now.next] ?? 0, blend);
    if (cold > 0) this.fog.grow(frame.dt * FROST_RATE, cold);
    if (cold < 0.01) this.fog.fade(frame.dt * MELT_RATE);
    if (frame.pointer) this.fog.wipe(frame.pointer.x, frame.pointer.y, 15 * this.unit);
    ctx.save();
    leaveRadioClear(ctx, this.w, this.h);
    this.fog.draw(ctx, this.w, this.h);
    ctx.restore();
    // Reflection and lamp stay fixed when the carriage gently moves.
    C.clearRect(0, 0, this.width, DESIGN_HEIGHT);
    C.save();
    leaveRadioClear(C, this.width, DESIGN_HEIGHT);
    this.air.reflection(C, this.width, tunnel, this.art, this.chosenLamp);
    C.restore();
    ctx.drawImage(this.stage.canvas, 0, 0, this.w, this.h);
    this.title.draw(ctx, frame.dt, this.w, this.h, now.name);
    return this.look;
  }

  private skyState(): SkyState {
    const state = this.dome.stateAt(routeHour(this.route.progress));
    const seconds = this.route.progress * this.route.total;
    if (seconds >= 60) return state;
    const dawn = this.dome.stateAt(7);
    const fade = ramp(0, 60, seconds);
    state.sky.zenith = mixColor(dawn.sky.zenith, state.sky.zenith, fade, this.skyColors.zenith);
    state.sky.horizon = mixColor(dawn.sky.horizon, state.sky.horizon, fade, this.skyColors.horizon);
    state.sky.light = mixColor(dawn.sky.light, state.sky.light, fade, this.skyColors.light);
    state.sky.water = mixColor(dawn.sky.water, state.sky.water, fade, this.skyColors.water);
    state.day = lerp(dawn.day, state.day, fade);
    state.sun.u = lerp(dawn.sun.u, state.sun.u, fade);
    state.sun.v = lerp(dawn.sun.v, state.sun.v, fade);
    state.sun.up = lerp(dawn.sun.up, state.sun.up, fade);
    return state;
  }

  private paintLand(target: ReturnType<typeof memoryCanvas>, frame: SceneryFrame, state: SkyState): void {
    const art = this.art;
    if (!art) return;
    const L = target.ctx;
    L.clearRect(0, 0, this.width, DESIGN_HEIGHT);
    this.scenery.draw(L, frame, art);
    if (frame.chapter === 4) return;
    L.save();
    L.globalCompositeOperation = 'source-atop';
    const shade = frame.chapter >= 1 && frame.chapter <= 3 ? 0.42 : 0.58;
    L.fillStyle = '#0a142b';
    L.globalAlpha = shade * (1 - state.day);
    L.fillRect(0, 0, this.width, DESIGN_HEIGHT);
    const low = Math.max(0, 1 - Math.abs(state.sun.up) * 4) * state.day;
    L.fillStyle = '#dc9b69';
    L.globalAlpha = low * 0.13;
    L.fillRect(0, 0, this.width, DESIGN_HEIGHT);
    L.restore();
  }

  private updateLook(state: SkyState, tunnel: number): void {
    const tint = mixColor(state.sky.horizon, NIGHT_TINT, 0.4 * (1 - state.day), this.look.tint);
    mixColor(tint, this.lamp ? LAMP_TINT : TUNNEL_TINT, tunnel, tint);
    const color = this.look.tint;
    this.look.mean = (color[0] * LUMA_RED + color[1] * LUMA_GREEN + color[2] * LUMA_BLUE) / 255 * (this.lamp ? 0.84 : 1);
    this.look.night = Math.max(tunnel, 1 - state.day);
    this.light.u = this.lamp ? (LAMP_X + LAMP_WIDTH / 2) / this.width : state.sun.u;
    this.light.v = this.lamp ? LAMP_Y / DESIGN_HEIGHT : state.sun.v;
    this.light.strength = this.lamp ? 0.32 : 0.6 * (1 - tunnel);
    this.light.color = this.lamp ? LAMP_COLOR : state.sky.light;
    this.look.sun = this.lamp || (state.sun.up > -0.02 && tunnel < 0.5) ? this.light : null;
  }
}


