import { clamp, lerp, rand } from '../../../world/math';
import type { ViewFrame } from '../../view';
import { CableCarSystem } from './cable-car';
import { SCENE_ANCHORS, glacierProfile, sceneTerrainY } from './scenes';
import type { AlpineSprites, DirectedSprite, SpriteBox } from './sprites';

type IbexMood = 'stand' | 'look' | 'graze' | 'walk' | 'rest' | 'leap';
type MarmotMood = 'sit' | 'whistle' | 'scurry' | 'duck';
type ClimberMood = 'idle' | 'plant' | 'shield';
type RopeMood = 'walk' | 'belay' | 'look';

interface IbexState {
  u: number;
  dir: 1 | -1;
  mood: IbexMood;
  timer: number;
  leapTime: number;
  scene: number;
}

interface MarmotState {
  homeU: number;
  u: number;
  vOffset: number;
  dir: 1 | -1;
  mood: MarmotMood;
  timer: number;
  clock: number;
  seed: number;
}

interface EagleState {
  u: number;
  v: number;
  dir: 1 | -1;
  phase: number;
  soarBoost: number;
  soarTimer: number;
}

interface RopeTeamState {
  u: number;
  dir: 1 | -1;
  mood: RopeMood;
  timer: number;
  stepClock: number;
}

const IBEX_LEAP_SECONDS = 0.68;
const IBEX_LEAP_HEIGHT = 12;
const IBEX_HIT_PAD = 10;
const EAGLE_HIT_PAD = 12;
const MARMOT_SHY_RADIUS = 28;

function pickDirected(sp: DirectedSprite, dir: 1 | -1): SpriteBox {
  return dir >= 0 ? sp.right : sp.left;
}

/** Manages all living wildlife, climbers, cableway, and recurring ibex across the 5 scenes. */
export class AlpineCast {
  private readonly ibex: IbexState = {
    u: 0.785,
    dir: -1,
    mood: 'stand',
    timer: 3.5,
    leapTime: 0,
    scene: -1,
  };

  private readonly marmots: MarmotState[] = [
    { homeU: 0.165, u: 0.165, vOffset: 0.815, dir: 1, mood: 'sit', timer: 2.8, clock: 0, seed: 1.1 },
    { homeU: 0.255, u: 0.255, vOffset: 0.785, dir: -1, mood: 'sit', timer: 4.1, clock: 0, seed: 2.7 },
    { homeU: 0.675, u: 0.675, vOffset: 0.735, dir: -1, mood: 'sit', timer: 3.2, clock: 0, seed: 4.3 },
  ];

  private readonly eagle: EagleState = {
    u: 0.48,
    v: 0.18,
    dir: 1,
    phase: 0,
    soarBoost: 0,
    soarTimer: 0,
  };

  private readonly ropeTeam: RopeTeamState = {
    u: 0.21,
    dir: 1,
    mood: 'walk',
    timer: 5.0,
    stepClock: 0,
  };

  private readonly cableCar = new CableCarSystem();
  private summitMood: ClimberMood = 'idle';
  private summitTimer = 4.2;

  private lastIbexPos = { x: 0, y: 0 };
  private lastEaglePos = { x: 0, y: 0 };

  /** Advances character & wildlife states for the active scene. */
  update(
    dt: number,
    time: number,
    scene: number,
    w: number,
    h: number,
    unit: number,
    pointer: ViewFrame['pointer'],
  ): void {
    this.stepIbex(dt, scene);

    if (scene === 0) {
      this.summitTimer -= dt;
      if (this.summitTimer <= 0) {
        const r = Math.random();
        this.summitMood = r < 0.45 ? 'idle' : r < 0.8 ? 'plant' : 'shield';
        this.summitTimer = this.summitMood === 'plant' ? rand(2.5, 4.2) : rand(3.5, 7);
      }
    }

    if (scene === 1) {
      this.stepMarmots(dt, w, h, unit, pointer);
    }

    if (scene === 2) {
      this.stepRopeTeam(dt);
      this.stepEagle(dt, time);
    }

    if (scene === 3) {
      this.cableCar.step(dt);
    }
  }

  /** Click reaction: makes the recurring ibex leap in a crisp alpine arc. */
  tryClickIbex(x: number, y: number, unit: number): boolean {
    const pad = IBEX_HIT_PAD * unit;
    if (Math.abs(x - this.lastIbexPos.x) > 14 * unit + pad || Math.abs(y - (this.lastIbexPos.y - 8 * unit)) > 12 * unit + pad) {
      return false;
    }
    if (this.ibex.mood !== 'leap') {
      this.ibex.mood = 'leap';
      this.ibex.leapTime = 0;
    }
    return true;
  }

  /** Click reaction: makes the golden eagle bank and soar higher in Scene 3. */
  tryClickEagle(x: number, y: number, scene: number, unit: number): boolean {
    if (scene !== 2) return false;
    const pad = EAGLE_HIT_PAD * unit;
    if (Math.abs(x - this.lastEaglePos.x) > 12 * unit + pad || Math.abs(y - this.lastEaglePos.y) > 8 * unit + pad) {
      return false;
    }
    this.eagle.soarTimer = 2.8;
    return true;
  }

  /** Click reaction: stops and swings the cable car gently in Scene 4, then resumes. */
  tryClickCableCar(x: number, y: number, scene: number, unit: number): boolean {
    if (scene !== 3) return false;
    return this.cableCar.tryClick(x, y, unit);
  }

  /** Current screen anchor of the recurring ibex for dust-fleck effects or inspection. */
  ibexPosition(scene: number, w: number, h: number, parX: number, parY: number): { x: number; y: number } {
    let baseV = sceneTerrainY(scene, this.ibex.u);
    if (scene === 1) {
      const g = glacierProfile(this.ibex.u);
      baseV = lerp(g.topV, g.botV, 0.45);
    } else if (scene === 3) {
      baseV = sceneTerrainY(3, this.ibex.u) + 0.015;
    } else if (scene === 4) {
      baseV = SCENE_ANCHORS.starryHut.v + 0.025;
    }
    return {
      x: Math.round(this.ibex.u * w + parX),
      y: Math.round(baseV * h + parY),
    };
  }

  /** Draws upper-sky wildlife (the soaring golden eagle in Ridge Walk). */
  drawSkyCast(
    ctx: CanvasRenderingContext2D,
    scene: number,
    w: number,
    h: number,
    time: number,
    sprites: AlpineSprites,
  ): void {
    if (scene !== 2) return;
    const ex = Math.round(this.eagle.u * w);
    const ey = Math.round((this.eagle.v - this.eagle.soarBoost) * h);
    this.lastEaglePos = { x: ex, y: ey };

    let sp: DirectedSprite = sprites.eagleGlide;
    if (this.eagle.soarTimer > 0.6) {
      sp = sprites.eagleSoar;
    } else {
      const flapCycle = (time * 2.2 + this.eagle.phase) % 6;
      if (flapCycle < 0.45) sp = sprites.eagleUp;
      else if (flapCycle < 0.9) sp = sprites.eagleDown;
      else if (flapCycle < 1.35) sp = sprites.eagleUp;
    }
    const img = pickDirected(sp, this.eagle.dir);
    ctx.drawImage(img.canvas, Math.round(ex - img.w / 2), Math.round(ey - img.h / 2));
  }

  /** Draws scene cast on the land layer (climbers, marmots, cable car, terrace people, recurring ibex). */
  drawSceneCast(
    L: CanvasRenderingContext2D,
    scene: number,
    w: number,
    h: number,
    unit: number,
    time: number,
    parX: number,
    parY: number,
    sprites: AlpineSprites,
    windDir: number,
  ): void {
    if (scene === 0) {
      this.drawSummitClimber(L, w, h, time, parX, parY, sprites, windDir);
    } else if (scene === 1) {
      this.drawMarmots(L, w, h, time, parX, parY, sprites);
    } else if (scene === 2) {
      this.drawRopedClimbers(L, w, h, unit, parX, parY, sprites);
    } else if (scene === 3) {
      this.cableCar.draw(L, w, h, unit, time, parX, parY, sprites);
    }

    this.drawIbex(L, scene, w, h, unit, parX, parY, sprites);
  }

  /** Draws glowing cable car windows post-tint at dusk and night in Cable Car Col. */
  drawPostTintCast(ctx: CanvasRenderingContext2D, scene: number, day: number, sprites: AlpineSprites): void {
    if (scene !== 3) return;
    this.cableCar.drawPostTint(ctx, day, sprites);
  }

  private stepIbex(dt: number, scene: number): void {
    const ib = this.ibex;
    if (ib.scene !== scene) {
      ib.scene = scene;
      ib.mood = scene === 4 ? 'rest' : scene === 1 ? 'walk' : 'stand';
      ib.timer = rand(2.5, 5.5);
      ib.leapTime = 0;
      if (scene === 0) {
        ib.u = 0.785;
        ib.dir = -1;
      } else if (scene === 1) {
        ib.u = 0.48;
        ib.dir = 1;
      } else if (scene === 2) {
        ib.u = 0.805;
        ib.dir = -1;
      } else if (scene === 3) {
        ib.u = 0.185;
        ib.dir = 1;
      } else {
        ib.u = 0.675;
        ib.dir = -1;
      }
    }

    if (ib.mood === 'leap') {
      ib.leapTime += dt;
      if (ib.leapTime >= IBEX_LEAP_SECONDS) {
        ib.mood = scene === 4 ? 'rest' : 'stand';
        ib.timer = rand(2.5, 5);
        ib.leapTime = 0;
      }
      return;
    }

    if (ib.mood === 'walk' && scene === 1) {
      ib.u += ib.dir * 0.015 * dt;
      if (ib.u > 0.63) {
        ib.u = 0.63;
        ib.dir = -1;
      } else if (ib.u < 0.43) {
        ib.u = 0.43;
        ib.dir = 1;
      }
    }

    if (scene === 3) {
      ib.dir = this.cableCar.gondolaU >= ib.u ? 1 : -1;
    }

    ib.timer -= dt;
    if (ib.timer > 0) return;

    if (scene === 4) {
      ib.mood = Math.random() < 0.8 ? 'rest' : 'look';
      ib.timer = ib.mood === 'rest' ? rand(5, 10) : rand(2, 3.5);
    } else if (scene === 1) {
      const r = Math.random();
      ib.mood = r < 0.48 ? 'walk' : r < 0.78 ? 'stand' : 'look';
      if (ib.mood === 'walk' && Math.random() < 0.35) ib.dir = ib.dir === 1 ? -1 : 1;
      ib.timer = rand(2.5, 5.5);
    } else {
      const r = Math.random();
      ib.mood = r < 0.45 ? 'stand' : r < 0.75 ? 'graze' : 'look';
      ib.timer = rand(3, 6.5);
    }
  }

  private drawIbex(
    L: CanvasRenderingContext2D,
    scene: number,
    w: number,
    h: number,
    unit: number,
    parX: number,
    parY: number,
    sprites: AlpineSprites,
  ): void {
    const pos = this.ibexPosition(scene, w, h, parX, parY);
    this.lastIbexPos = pos;

    let lift = 0;
    let spriteGroup = sprites.ibex.stand;
    if (this.ibex.mood === 'leap') {
      const p = clamp(this.ibex.leapTime / IBEX_LEAP_SECONDS, 0, 1);
      lift = Math.round(Math.sin(Math.PI * p) * IBEX_LEAP_HEIGHT * unit);
      spriteGroup = sprites.ibex.leap;
    } else if (this.ibex.mood === 'graze') {
      spriteGroup = sprites.ibex.graze;
    } else if (this.ibex.mood === 'rest') {
      spriteGroup = sprites.ibex.rest;
    } else if (this.ibex.mood === 'walk') {
      spriteGroup = Math.floor(this.ibex.timer * 4) % 2 === 0 ? sprites.ibex.walk : sprites.ibex.stand;
    }

    const img = pickDirected(spriteGroup, this.ibex.dir);
    const drawX = Math.round(pos.x - img.w / 2);
    const drawY = Math.round(pos.y - img.h - lift + 1);
    L.fillStyle = 'rgba(20,30,48,0.28)';
    L.fillRect(drawX + 4, pos.y - 1, img.w - 8, 2);
    L.drawImage(img.canvas, drawX, drawY);
  }

  private drawSummitClimber(
    L: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
    parX: number,
    parY: number,
    sprites: AlpineSprites,
    windDir: number,
  ): void {
    const cx = Math.round(SCENE_ANCHORS.summitClimber.u * w + parX);
    const cy = Math.round(sceneTerrainY(0, SCENE_ANCHORS.summitClimber.u) * h + parY) + 1;
    const sp = sprites.climberPlant;
    const x = Math.round(cx - sp.w / 2);
    const y = Math.round(cy - sp.h + 2);
    L.fillStyle = 'rgba(20,30,48,0.28)';
    L.fillRect(x + 3, cy - 1, sp.w - 6, 2);
    L.drawImage(sp.canvas, x, y);

    const scarfY = y + 4;
    const dir = windDir >= 0 ? 1 : -1;
    const flap = Math.round(Math.sin(time * 5.2) * 1);
    L.fillStyle = '#66d0d8';
    L.fillRect(cx + dir * 4, scarfY, dir * 4, 1);
    L.fillRect(cx + dir * 6, scarfY + flap, dir * 3, 1);

    if (this.summitMood === 'plant') {
      const reach = Math.round(Math.sin(time * 3.5) * 1.5);
      L.fillStyle = '#c2362a';
      L.fillRect(cx + 4, y + 6 + reach, 3, 2);
    } else if (this.summitMood === 'shield') {
      L.fillStyle = '#c2362a';
      L.fillRect(cx + 3, y + 3, 2, 2);
    }
  }

  private stepMarmots(dt: number, w: number, h: number, unit: number, pointer: ViewFrame['pointer']): void {
    for (const m of this.marmots) {
      m.clock += dt;
      const sx = m.u * w;
      const sy = m.vOffset * h;
      if (pointer && Math.hypot(pointer.x - sx, pointer.y - sy) < MARMOT_SHY_RADIUS * unit) {
        m.mood = 'duck';
        m.timer = 1.6;
        continue;
      }
      if (m.mood === 'duck') {
        m.timer -= dt;
        if (m.timer <= 0) {
          m.mood = 'sit';
          m.timer = rand(2.5, 5);
        }
        continue;
      }
      if (m.mood === 'scurry') {
        m.u += m.dir * 0.014 * dt;
        if (Math.abs(m.u - m.homeU) > 0.022) {
          m.dir = m.u > m.homeU ? -1 : 1;
        }
      }
      m.timer -= dt;
      if (m.timer <= 0) {
        const r = Math.random();
        m.mood = r < 0.55 ? 'sit' : r < 0.8 ? 'whistle' : 'scurry';
        if (m.mood === 'scurry') m.dir = m.u >= m.homeU ? -1 : 1;
        m.timer = m.mood === 'whistle' ? rand(1.4, 2.5) : rand(2.5, 5.5);
      }
    }
  }

  private drawMarmots(
    L: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
    parX: number,
    parY: number,
    sprites: AlpineSprites,
  ): void {
    for (const m of this.marmots) {
      const mx = Math.round(m.u * w + parX);
      const my = Math.round(m.vOffset * h + parY);

      L.fillStyle = '#4e566a';
      L.fillRect(mx - 10, my - 2, 20, 6);
      L.fillStyle = '#707a90';
      L.fillRect(mx - 8, my - 3, 15, 2);

      let sp: DirectedSprite = sprites.marmotSit;
      let bob = 0;
      if (m.mood === 'duck') {
        sp = sprites.marmotDuck;
      } else if (m.mood === 'scurry') {
        sp = Math.floor(m.clock * 7) % 2 === 0 ? sprites.marmotRunA : sprites.marmotRunB;
      } else if (m.mood === 'whistle') {
        bob = Math.round(Math.abs(Math.sin(time * 4 + m.seed)));
      }

      const img = pickDirected(sp, m.dir);
      L.drawImage(img.canvas, Math.round(mx - img.w / 2), Math.round(my - img.h - bob));
    }
  }

  private stepRopeTeam(dt: number): void {
    const team = this.ropeTeam;
    team.timer -= dt;
    if (team.mood === 'walk') {
      team.stepClock += dt;
      team.u += team.dir * 0.0085 * dt;
      if (team.u >= SCENE_ANCHORS.ridgeClimberMaxU) {
        team.u = SCENE_ANCHORS.ridgeClimberMaxU;
        team.dir = -1;
        team.mood = 'belay';
        team.timer = rand(3.5, 6);
      } else if (team.u <= SCENE_ANCHORS.ridgeClimberMinU) {
        team.u = SCENE_ANCHORS.ridgeClimberMinU;
        team.dir = 1;
        team.mood = 'belay';
        team.timer = rand(3.5, 6);
      }
    }
    if (team.timer > 0) return;
    const r = Math.random();
    team.mood = r < 0.62 ? 'walk' : r < 0.85 ? 'belay' : 'look';
    team.timer = team.mood === 'walk' ? rand(5, 9) : rand(2.5, 4.8);
  }

  private drawRopedClimbers(
    L: CanvasRenderingContext2D,
    w: number,
    h: number,
    unit: number,
    parX: number,
    parY: number,
    sprites: AlpineSprites,
  ): void {
    const team = this.ropeTeam;
    const leadU = team.u;
    const followU = clamp(team.u - team.dir * 0.055, 0.08, 0.4);
    const lx = Math.round(leadU * w + parX);
    const ly = Math.round(sceneTerrainY(2, leadU) * h + parY) + 2;
    const fx = Math.round(followU * w + parX);
    const fy = Math.round(sceneTerrainY(2, followU) * h + parY) + 2;

    const stepA = team.mood !== 'walk' || Math.floor(team.stepClock * 3.5) % 2 === 0;
    const leadImg = pickDirected(stepA ? sprites.climberLeadA : sprites.climberLeadB, team.dir);
    const followImg = pickDirected(stepA ? sprites.climberFollowB : sprites.climberFollowA, team.dir);

    L.drawImage(followImg.canvas, Math.round(fx - followImg.w / 2), Math.round(fy - followImg.h));
    L.drawImage(leadImg.canvas, Math.round(lx - leadImg.w / 2), Math.round(ly - leadImg.h));

    const x0 = fx;
    const y0 = fy - Math.round(12 * unit);
    const x1 = lx;
    const y1 = ly - Math.round(12 * unit);
    const steps = Math.max(8, Math.abs(x1 - x0));
    L.fillStyle = '#e89642';
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const rx = Math.round(lerp(x0, x1, t));
      const sag = Math.sin(Math.PI * t) * (3.5 + (team.mood === 'walk' ? 0.5 : 1.2)) * unit;
      const ry = Math.round(lerp(y0, y1, t) + sag);
      L.fillRect(rx, ry, 1, 1);
    }
  }

  private stepEagle(dt: number, time: number): void {
    const e = this.eagle;
    e.u += e.dir * 0.022 * dt;
    if (e.u > 0.84) {
      e.u = 0.84;
      e.dir = -1;
    } else if (e.u < 0.16) {
      e.u = 0.16;
      e.dir = 1;
    }
    e.v = 0.185 + Math.sin(time * 0.45 + e.phase) * 0.024;
    if (e.soarTimer > 0) {
      e.soarTimer = Math.max(0, e.soarTimer - dt);
      e.soarBoost = Math.sin((e.soarTimer / 2.8) * Math.PI) * 0.075;
    } else {
      e.soarBoost = 0;
    }
  }
}
