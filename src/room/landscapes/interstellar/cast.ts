import { clamp } from '../../../world/math';
import { breeze } from '../../wind';
import type { Sprite } from './sprites-base';
import type { CraftSprites } from './sprites-craft';

export interface CastPoint {
  x: number;
  y: number;
}

type ProbeState = 'hover' | 'move' | 'scan' | 'look' | 'spin';

const PROBE_SPIN_SECONDS = 2.4;
/** The free end of a short thruster puff can move one stage pixel. */
const EXHAUST_BEND = 1;

/** Recurring explorer probe: appears in every scene with subtle scene-specific behaviour. */
export class ExplorerProbe {
  private x = 0;
  private y = 0;
  private offsetX = 0;
  private offsetY = 0;
  private targetOffsetX = 0;
  private targetOffsetY = 0;
  private state: ProbeState = 'hover';
  private timer = 3;
  private spinTimer = 0;
  private facing = 0;

  position(): CastPoint {
    return { x: this.x, y: this.y };
  }

  contains(px: number, py: number, unit: number): boolean {
    return Math.hypot(px - this.x, py - this.y) <= Math.max(12, 14 * unit);
  }

  triggerSpin(): void {
    this.state = 'spin';
    this.spinTimer = PROBE_SPIN_SECONDS;
  }

  update(
    dt: number,
    time: number,
    w: number,
    h: number,
    weights: Float32Array,
    pointer: CastPoint | null,
  ): void {
    let ax = 0;
    let ay = 0;
    let dominant = 0;
    let bestW = -1;
    for (let i = 0; i < weights.length; i++) {
      const weight = weights[i];
      if (weight > bestW) {
        bestW = weight;
        dominant = i;
      }
      if (weight <= 0) continue;
      const p = this.sceneAnchor(i, w, h, time);
      ax += p.x * weight;
      ay += p.y * weight;
    }

    if (this.spinTimer > 0) {
      this.spinTimer = Math.max(0, this.spinTimer - dt);
      if (this.spinTimer <= 0) {
        this.state = 'hover';
        this.timer = 2.5;
      }
    } else {
      this.timer -= dt;
      if (pointer && Math.hypot(pointer.x - this.x, pointer.y - this.y) < Math.min(w, h) * 0.24) {
        this.state = 'look';
        this.facing = pointer.x > this.x + 8 ? 1 : pointer.x < this.x - 8 ? 3 : 0;
      } else if (this.timer <= 0) {
        const nextIdx = Math.floor((time * 0.7 + dominant * 1.3) % 3);
        this.state = nextIdx === 0 ? 'hover' : nextIdx === 1 ? 'move' : 'scan';
        this.timer = this.state === 'move' ? 4.5 : 3.2;
        if (this.state === 'move') {
          const angle = time * 1.1 + dominant * 2.1;
          this.targetOffsetX = Math.cos(angle) * w * 0.032;
          this.targetOffsetY = Math.sin(angle * 0.8) * h * 0.025;
        } else {
          this.targetOffsetX = 0;
          this.targetOffsetY = 0;
        }
        this.facing = dominant === 1 || dominant === 4 ? 3 : dominant === 0 ? 1 : 0;
      }
    }

    const ease = 1 - Math.exp(-1.8 * dt);
    this.offsetX += (this.targetOffsetX - this.offsetX) * ease;
    this.offsetY += (this.targetOffsetY - this.offsetY) * ease;

    this.x = ax + this.offsetX;
    this.y = ay + this.offsetY;
  }

  draw(ctx: CanvasRenderingContext2D, craft: CraftSprites, time: number, unit: number, alpha: number): void {
    if (alpha <= 0.02) return;
    let frameIdx = this.facing;
    if (this.state === 'spin') {
      const progress = 1 - this.spinTimer / PROBE_SPIN_SECONDS;
      frameIdx = Math.floor(progress * 8) % 4;
    }
    const sprite = craft.probe[frameIdx];
    const sx = Math.round(this.x - sprite.w / 2);
    const sy = Math.round(this.y - sprite.h / 2);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite.canvas, sx, sy);

    // Calm blue lamp glow + scan/signal telemetry.
    const lampPulse = 0.55 + 0.45 * Math.sin(time * 2.1);
    const lx = Math.round(this.x + (frameIdx === 1 ? 2 * unit : frameIdx === 3 ? -2 * unit : 0));
    const ly = Math.round(this.y - 1 * unit);
    if (frameIdx !== 2) {
      ctx.fillStyle = `rgba(92,236,255,${(0.45 * lampPulse * alpha).toFixed(3)})`;
      ctx.fillRect(lx - 2, ly - 2, 5, 5);
    }

    if (this.state === 'scan') {
      const ray = Math.round(6 * unit + Math.sin(time * 2.4) * 3 * unit);
      ctx.fillStyle = `rgba(110,238,255,${(0.42 * alpha).toFixed(3)})`;
      for (let i = 1; i <= 3; i++) {
        ctx.fillRect(lx + i * Math.round(3 * unit), ly + Math.round(i * ray * 0.15), 1, 1);
      }
    }

    if (this.state === 'spin') {
      const elapsed = PROBE_SPIN_SECONDS - this.spinTimer;
      // Two gentle expanding signal rings, 1.2 s apart (always < 1 flash/s).
      const pulsePhase = (elapsed % 1.2) / 1.2;
      const r = Math.round((8 + pulsePhase * 12) * unit);
      const ringAlpha = (1 - pulsePhase) * 0.7 * alpha;
      ctx.fillStyle = `rgba(118,242,255,${ringAlpha.toFixed(3)})`;
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        ctx.fillRect(Math.round(this.x + Math.cos(a) * r), Math.round(this.y + Math.sin(a) * r), 1, 1);
      }
    }
    ctx.restore();
  }

  private sceneAnchor(scene: number, w: number, h: number, time: number): CastPoint {
    const bob = Math.sin(time * 1.1) * h * 0.012;
    switch (scene) {
      case 0: // Drifting past the ringed giant on the lower left
        return { x: w * 0.23 + Math.sin(time * 0.18) * w * 0.04, y: h * 0.72 + bob };
      case 1: // Nosing the nebula dust pillar on the right
        return { x: w * 0.71 + Math.sin(time * 0.22) * w * 0.018, y: h * 0.70 + bob };
      case 2: // Riding near a tumbling asteroid on the lower right
        return { x: w * 0.75, y: h * 0.67 + bob * 0.85 };
      case 3: // Docking politely at the ring station's left approach port
        return { x: w * 0.67 + Math.sin(time * 0.25) * w * 0.01, y: h * 0.72 + bob * 0.6 };
      default: // Watching the binary suns from the lower left
        return { x: w * 0.23, y: h * 0.76 + bob };
    }
  }
}

type FreighterState = 'cruise' | 'beacon' | 'yield';

/** Cargo freighter crossing Scene 1 (Ringed Giant) with calm running lights. */
export class CargoFreighter {
  private u = 0.15;
  private v = 0.20;
  private dir: 1 | -1 = 1;
  private state: FreighterState = 'cruise';
  private stateTimer = 5;
  private nudgeV = 0;

  update(dt: number, w: number, h: number, pointer: CastPoint | null): void {
    const speed = this.state === 'yield' ? 0.016 : 0.011;
    this.u += this.dir * speed * dt;
    if (this.u > 1.08) {
      this.u = -0.08;
      this.v = 0.18 + (this.v > 0.2 ? 0 : 0.04);
    } else if (this.u < -0.08) {
      this.u = 1.08;
    }

    this.stateTimer -= dt;
    const sx = this.u * w;
    const sy = (this.v + this.nudgeV) * h;
    if (pointer && Math.hypot(pointer.x - sx, pointer.y - sy) < Math.min(w, h) * 0.16) {
      this.state = 'yield';
      this.stateTimer = 2.0;
    } else if (this.stateTimer <= 0) {
      this.state = this.state === 'cruise' ? 'beacon' : 'cruise';
      this.stateTimer = this.state === 'beacon' ? 3.5 : 7.0;
    }

    const targetNudge = this.state === 'yield' ? -0.025 : 0;
    this.nudgeV += (targetNudge - this.nudgeV) * (1 - Math.exp(-2.2 * dt));
  }

  draw(
    ctx: CanvasRenderingContext2D,
    craft: CraftSprites,
    w: number,
    h: number,
    time: number,
    unit: number,
    chapterSlide: number,
    alpha: number,
  ): void {
    if (alpha <= 0.02) return;
    const sprite = this.dir > 0 ? craft.freighterRight : craft.freighterLeft;
    const x = Math.round(this.u * w + chapterSlide - sprite.w / 2);
    const y = Math.round((this.v + this.nudgeV) * h - sprite.h / 2);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite.canvas, x, y);

    // Keep the first pixel of the engine plume at the stern.
    const sternX = this.dir > 0 ? x - 1 : x + sprite.w;
    const plumeY = y + Math.round(sprite.h * 0.5);
    const plumeHeight = Math.max(1, Math.round(unit));
    const bend = Math.round(breeze(time, sternX) * EXHAUST_BEND);
    ctx.fillStyle = `rgba(128,214,255,${(0.65 * alpha).toFixed(3)})`;
    ctx.fillRect(sternX, plumeY, 1, plumeHeight);
    ctx.fillRect(sternX - this.dir, plumeY + bend, 1, plumeHeight);

    // Calm navigation beacons (1.8 s period).
    const pulse = 0.5 + 0.5 * Math.sin(time * 3.4);
    if (pulse > 0.35 || this.state === 'beacon') {
      ctx.fillStyle = `rgba(255,108,88,${(pulse * alpha).toFixed(3)})`;
      ctx.fillRect(x + Math.round(sprite.w * 0.25), y + 1, 1, 1);
      ctx.fillStyle = `rgba(116,246,162,${(pulse * alpha).toFixed(3)})`;
      ctx.fillRect(x + Math.round(sprite.w * 0.78), y + 1, 1, 1);
    }
    ctx.restore();
  }
}

type AstronautState = 'drift' | 'inspect' | 'look' | 'wave';

const WAVE_SECONDS = 2.6;

/** Tethered astronaut drifting beside the nebula dust pillar in Scene 2. */
export class TetheredAstronaut {
  private state: AstronautState = 'drift';
  private timer = 4;
  private waveTimer = 0;
  private x = 0;
  private y = 0;
  private anchorX = 0;
  private anchorY = 0;

  contains(px: number, py: number, unit: number): boolean {
    return Math.hypot(px - this.x, py - this.y) <= Math.max(15, 16 * unit);
  }

  triggerWave(): void {
    this.state = 'wave';
    this.waveTimer = WAVE_SECONDS;
  }

  update(
    dt: number,
    time: number,
    w: number,
    h: number,
    pointer: CastPoint | null,
  ): void {
    this.anchorX = w * 0.1;
    this.anchorY = h * 0.85;
    this.x = w * 0.23 + Math.sin(time * 0.38) * w * 0.025;
    this.y = h * 0.74 + Math.cos(time * 0.52) * h * 0.02;

    if (this.waveTimer > 0) {
      this.waveTimer = Math.max(0, this.waveTimer - dt);
      if (this.waveTimer <= 0) {
        this.state = 'drift';
        this.timer = 4;
      }
      return;
    }

    this.timer -= dt;
    if (pointer && Math.hypot(pointer.x - this.x, pointer.y - this.y) < Math.min(w, h) * 0.22) {
      this.state = 'look';
    } else if (this.timer <= 0) {
      this.state = this.state === 'drift' ? 'inspect' : 'drift';
      this.timer = 4.5;
    }
  }

  draw(ctx: CanvasRenderingContext2D, craft: CraftSprites, time: number, unit: number, alpha: number): void {
    if (alpha <= 0.02) return;
    ctx.save();
    ctx.globalAlpha = alpha;

    // Anchor pod & slack pixel tether line.
    const ax = Math.round(this.anchorX);
    const ay = Math.round(this.anchorY);
    ctx.fillStyle = '#5c6a84';
    ctx.fillRect(ax - 3, ay - 2, 6, 4);
    ctx.fillStyle = '#9aa8c4';
    ctx.fillRect(ax - 2, ay - 3, 4, 1);

    const endX = Math.round(this.x - 4 * unit);
    const endY = Math.round(this.y - 2 * unit);
    const steps = 18;
    ctx.fillStyle = 'rgba(166,184,214,0.8)';
    for (let i = 1; i < steps; i++) {
      const k = i / steps;
      const sag = Math.sin(k * Math.PI) * 8 * unit;
      const tx = Math.round(ax + (endX - ax) * k);
      const ty = Math.round(ay + (endY - ay) * k + sag);
      ctx.fillRect(tx, ty, 1, 1);
    }

    let sprite: Sprite = craft.astronautIdle;
    if (this.state === 'wave') {
      sprite = Math.floor(time * 3) % 2 === 0 ? craft.astronautWaveA : craft.astronautWaveB;
    } else if (this.state === 'look' || this.state === 'inspect') {
      sprite = craft.astronautLookRight;
    }

    const sx = Math.round(this.x - sprite.w / 2);
    const sy = Math.round(this.y - sprite.h / 2);
    ctx.drawImage(sprite.canvas, sx, sy);

    // Gentle thruster puff while waving.
    if (this.state === 'wave') {
      const puffY = sy + Math.round(sprite.h * 0.42);
      const bend = Math.round(breeze(time, sx) * EXHAUST_BEND);
      ctx.fillStyle = `rgba(184,234,255,${(0.55 * alpha).toFixed(3)})`;
      ctx.fillRect(sx - 1, puffY, 1, 2);
      ctx.fillRect(sx - 2, puffY + bend, 1, 2);
    }
    ctx.restore();
  }
}

type DroneState = 'patrol' | 'scan' | 'evade';

/** Mining patrol drone in Scene 3 (Asteroid Garden). */
export class PatrolDrone {
  private u = 0.72;
  private v = 0.78;
  private dir: 1 | -1 = 1;
  private state: DroneState = 'patrol';
  private timer = 4;

  update(dt: number, w: number, h: number, pointer: CastPoint | null): void {
    this.timer -= dt;
    const sx = this.u * w;
    const sy = this.v * h;

    if (pointer && Math.hypot(pointer.x - sx, pointer.y - sy) < Math.min(w, h) * 0.14) {
      this.state = 'evade';
      this.timer = 1.6;
      const dx = sx - pointer.x;
      const dy = sy - pointer.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      this.u = clamp(this.u + (dx / d) * 0.045 * dt, 0.65, 0.92);
      this.v = clamp(this.v + (dy / d) * 0.045 * dt, 0.58, 0.88);
      this.dir = dx >= 0 ? 1 : -1;
      return;
    }

    if (this.timer <= 0) {
      this.state = this.state === 'patrol' ? 'scan' : 'patrol';
      this.timer = this.state === 'scan' ? 3.2 : 5.5;
    }

    if (this.state === 'patrol') {
      this.u += this.dir * 0.022 * dt;
      this.v += Math.sin(this.u * 14) * 0.01 * dt;
      if (this.u > 0.91) {
        this.u = 0.91;
        this.dir = -1;
      } else if (this.u < 0.65) {
        this.u = 0.65;
        this.dir = 1;
      }
    }
  }

  draw(
    ctx: CanvasRenderingContext2D,
    craft: CraftSprites,
    w: number,
    h: number,
    time: number,
    unit: number,
    chapterSlide: number,
    alpha: number,
  ): void {
    if (alpha <= 0.02) return;
    const sprite = this.dir > 0 ? craft.droneRight : craft.droneLeft;
    const cx = Math.round(this.u * w + chapterSlide);
    const cy = Math.round(this.v * h);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite.canvas, Math.round(cx - sprite.w / 2), Math.round(cy - sprite.h / 2));

    if (this.state === 'scan') {
      const pulse = 0.45 + 0.35 * Math.sin(time * 2.2);
      ctx.fillStyle = `rgba(92,238,255,${(pulse * alpha).toFixed(3)})`;
      for (let i = 1; i <= 5; i++) {
        ctx.fillRect(cx + this.dir * Math.round(i * 3 * unit), cy + Math.round(i * 2.2 * unit), 1, 1);
      }
    }
    ctx.restore();
  }
}

type ShuttlePhase = 'approach' | 'align' | 'docked' | 'depart';

interface Shuttle {
  phase: ShuttlePhase;
  timer: number;
  u: number;
  v: number;
  dir: 1 | -1;
}

/** Docking shuttles visiting the rotating ring station in Scene 4. */
export class DockingTraffic {
  private readonly shuttles: Shuttle[] = [
    { phase: 'approach', timer: 0, u: 0.98, v: 0.61, dir: -1 },
    { phase: 'depart', timer: 4, u: 0.87, v: 0.74, dir: 1 },
  ];
  private autoDockPulse = 0;

  dockBeaconActive(): number {
    return this.autoDockPulse;
  }

  update(dt: number): void {
    this.autoDockPulse = Math.max(0, this.autoDockPulse - dt);
    const dockU = 0.84;
    const dockV = 0.68;

    for (let i = 0; i < this.shuttles.length; i++) {
      const s = this.shuttles[i];
      const laneOffset = i === 0 ? -0.025 : 0.03;
      if (s.phase === 'approach') {
        s.dir = -1;
        s.u -= 0.024 * dt;
        s.v += (dockV + laneOffset - s.v) * (1 - Math.exp(-1.5 * dt));
        if (s.u <= dockU + 0.05) {
          s.phase = 'align';
          s.timer = 2.0;
        }
      } else if (s.phase === 'align') {
        s.u += (dockU - s.u) * (1 - Math.exp(-2 * dt));
        s.v += (dockV + laneOffset - s.v) * (1 - Math.exp(-2 * dt));
        s.timer -= dt;
        if (s.timer <= 0) {
          s.phase = 'docked';
          s.timer = 4.5;
          this.autoDockPulse = 1.6;
        }
      } else if (s.phase === 'docked') {
        s.timer -= dt;
        if (s.timer <= 0) {
          s.phase = 'depart';
          s.dir = 1;
        }
      } else {
        s.u += 0.026 * dt;
        s.v += laneOffset * 0.3 * dt;
        if (s.u > 1.1) {
          s.u = 1.08;
          s.v = i === 0 ? 0.59 : 0.77;
          s.phase = 'approach';
        }
      }
    }
  }

  draw(
    ctx: CanvasRenderingContext2D,
    craft: CraftSprites,
    w: number,
    h: number,
    chapterSlide: number,
    alpha: number,
  ): void {
    if (alpha <= 0.02) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    for (const s of this.shuttles) {
      if (s.u < -0.06 || s.u > 1.06) continue;
      const sprite = s.dir > 0 ? craft.shuttleRight : craft.shuttleLeft;
      const sx = Math.round(s.u * w + chapterSlide - sprite.w / 2);
      const sy = Math.round(s.v * h - sprite.h / 2);
      ctx.drawImage(sprite.canvas, sx, sy);
    }
    ctx.restore();
  }
}
