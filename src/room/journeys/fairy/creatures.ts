import { disc } from '../../sky';
import { hash } from '../noise';
import { FairyAir } from './air';
import type { Landmarks } from './landmarks';
import type { DrawList } from './draw-list';
import type { FairySprites, Sprite } from './sprites';

export interface Pointer {
  x: number;
  y: number;
}

const MAX_WISPS = 12;
const MAX_ANIMALS = 6;
const PIP_SCALE = 2.6;
const PIP_ROW = 0.90;
const STAG_HEIGHT = 56;
const STAR_OFFSETS: readonly (readonly [number, number])[] = [
  [0.34, 0.52], [0.42, 0.58], [0.50, 0.48], [0.56, 0.56],
  [0.46, 0.64], [0.28, 0.58], [0.64, 0.38],
];

interface Wisp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  homeU: number;
  homeV: number;
  phase: number;
  orbitAngle: number;
  trailX: [number, number, number];
  trailY: [number, number, number];
}

interface VergeAnimal {
  kind: 'rabbit' | 'frog';
  x: number;
  y: number;
  dir: 1 | -1;
  mood: 'sit' | 'hop' | 'blink';
  timer: number;
  clock: number;
  seed: number;
}

const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);

/** Pip, wisps, verge wildlife (rabbits, frogs, owl), tiny folk, spirit stag, and ambient air motes. */
export class Creatures {
  private readonly wisps: Wisp[] = [];
  private readonly air = new FairyAir();
  private readonly animals: VergeAnimal[] = Array.from({ length: MAX_ANIMALS }, () => ({
    kind: 'rabbit', x: -Infinity, y: 0, dir: 1, mood: 'sit', timer: 0, clock: 0, seed: 0,
  }));
  private spawnedTo = 0;
  private scroll = 0;
  private width = 0;

  private pipX = 140;
  private pipDir: 1 | -1 = 1;
  private pipTrotting = false;
  private pipTipTimer = 0;
  private pipWalkClock = 0;
  private restX = 0;
  private restHold = 0;
  private previousX = 0;
  private previousY = 0;
  private hadPointer = false;

  private owlTimer = 2.5;
  private owlPose: 'idle' | 'turn' | 'blink' = 'idle';
  private stagPhase = 0;

  private readonly pipLanternScreen = { x: 0, y: 0 };
  private readonly stagDrawInfo = { x: 0, y: 0, w: 0, h: 0, bowing: false, alpha: 0 };

  reset(scroll: number, w: number, h: number): void {
    this.pipX = w * 0.24;
    this.pipDir = 1;
    this.pipTipTimer = 0;
    this.restHold = 0;
    this.hadPointer = false;
    this.spawnedTo = scroll - 40;
    for (const a of this.animals) a.x = -Infinity;
    this.initWisps(w, h);
    this.air.reset(w, h);
  }

  private initWisps(w: number, h: number): void {
    if (!this.wisps.length) {
      for (let i = 0; i < MAX_WISPS; i++) {
        const x = Math.random() * w;
        const y = h * rand(0.62, 0.78);
        this.wisps.push({
          x, y, vx: 0, vy: 0,
          homeU: 0.1 + (i / MAX_WISPS) * 0.8,
          homeV: rand(0.62, 0.77),
          phase: rand(0, 6.28),
          orbitAngle: (i / MAX_WISPS) * Math.PI * 2,
          trailX: [x, x, x],
          trailY: [y, y, y],
        });
      }
      return;
    }
    for (const wisp of this.wisps) {
      wisp.x = wisp.homeU * w;
      wisp.y = wisp.homeV * h;
      wisp.vx = 0;
      wisp.vy = 0;
      wisp.trailX.fill(wisp.x);
      wisp.trailY.fill(wisp.y);
    }
  }

  press(px: number, py: number, h: number, unit: number): boolean {
    const pipY = Math.round(h * PIP_ROW);
    if (Math.abs(px - this.pipX) <= 18 * unit && Math.abs(py - (pipY - 8 * unit)) <= 18 * unit) {
      this.pipTipTimer = 1.4;
      return true;
    }
    return false;
  }

  update(
    dt: number,
    time: number,
    scroll: number,
    scrollDelta: number,
    w: number,
    h: number,
    unit: number,
    speed: number,
    weights: readonly number[],
    chapterIndex: number,
    pointer: Pointer | null,
    landmarks: Landmarks,
  ): void {
    this.scroll = scroll;
    this.width = w;
    if (!this.wisps.length) this.initWisps(w, h);
    this.updatePip(dt, w, h, unit, speed, chapterIndex, pointer);
    this.updateWisps(dt, time, w, h, unit, weights[1] + weights[2], pointer, landmarks);
    this.updateAnimals(dt, scroll, w, h, unit, weights, pointer);
    this.air.update(dt, time, scrollDelta, w, h, unit);

    this.owlTimer -= dt;
    if (this.owlTimer <= 0) {
      const r = Math.random();
      this.owlPose = r < 0.25 ? 'blink' : r < 0.65 ? 'turn' : 'idle';
      this.owlTimer = this.owlPose === 'blink' ? 0.22 : 2 + Math.random() * 3.5;
    }

    if (weights[4] > 0.05) {
      this.stagPhase = (this.stagPhase + dt / 22) % 1;
    } else {
      this.stagPhase = 0.05;
    }
  }

  private updatePip(
    dt: number,
    w: number,
    h: number,
    unit: number,
    speed: number,
    chapterIndex: number,
    pointer: Pointer | null,
  ): void {
    const pipY = h * PIP_ROW;
    if (this.pipTipTimer > 0) this.pipTipTimer = Math.max(0, this.pipTipTimer - dt);

    this.restHold = Math.max(0, this.restHold - dt);
    if (pointer) {
      const moved = this.hadPointer
        ? Math.hypot(pointer.x - this.previousX, pointer.y - this.previousY) / Math.max(0.01, dt) : 0;
      if (Math.abs(pointer.x - this.pipX) < 60 * unit && Math.abs(pointer.y - pipY) < 50 * unit && moved < 90 * unit) {
        this.restX = pointer.x;
        this.restHold = 1.8;
      }
      this.previousX = pointer.x;
      this.previousY = pointer.y;
    }
    this.hadPointer = pointer !== null;
    // Pip stays beside the cart, clear of the radio even when invited closer.
    const homeX = w * (chapterIndex === 3 ? 0.26 : 0.24);
    const targetX = this.restHold > 0
      ? Math.max(w * 0.17, Math.min(w * 0.32, this.restX)) : homeX;

    const dx = targetX - this.pipX;
    if (Math.abs(dx) > 10 * unit) {
      this.pipDir = dx > 0 ? 1 : -1;
      const trotSpeed = (this.restHold > 0 ? 36 : 20) * unit;
      this.pipX += Math.sign(dx) * Math.min(Math.abs(dx), trotSpeed * dt);
      this.pipTrotting = true;
      this.pipWalkClock += dt * 7;
    } else {
      this.pipTrotting = false;
      if (this.restHold > 1.2 && Math.abs(dx) <= 10 * unit && this.pipTipTimer <= 0) {
        this.pipTipTimer = 1.4;
      }
      if (speed > 0) {
        this.pipWalkClock += dt * (4 + speed * 3);
      }
      this.pipDir = 1;
    }
  }

  private updateWisps(
    dt: number,
    time: number,
    w: number,
    h: number,
    unit: number,
    presence: number,
    pointer: Pointer | null,
    landmarks: Landmarks,
  ): void {
    if (presence < 0.03) return;
    const lantern = landmarks.lantern;
    let atLantern = 0;

    for (let i = 0; i < this.wisps.length; i++) {
      const wisp = this.wisps[i];
      const homeX = wisp.homeU * w + Math.sin(time * 0.35 + wisp.phase) * 28 * unit;
      const homeY = wisp.homeV * h + Math.cos(time * 0.45 + wisp.phase) * 10 * unit;

      let tx = homeX;
      let ty = homeY;
      let pull = 1.4;

      if (lantern && !pointer) {
        wisp.orbitAngle += dt * 0.7;
        tx = lantern.x + Math.cos(wisp.orbitAngle) * (9 + i % 3 * 3) * unit;
        ty = lantern.y + Math.sin(wisp.orbitAngle) * 9 * unit;
        pull = 3.8;
      }
      if (pointer) {
        wisp.orbitAngle += dt * 1.3;
        const r = (10 + (i % 3) * 5) * unit;
        tx = pointer.x + Math.cos(wisp.orbitAngle) * r;
        ty = pointer.y + Math.sin(wisp.orbitAngle) * r * 0.65;
        pull = 10;
      }

      wisp.vx += (tx - wisp.x) * pull * dt;
      wisp.vy += (ty - wisp.y) * pull * dt;
      wisp.vx *= Math.exp(-2.8 * dt);
      wisp.vy *= Math.exp(-2.8 * dt);
      wisp.x += wisp.vx * dt;
      wisp.y += wisp.vy * dt;
      wisp.x = Math.max(3 * unit, Math.min(w - 3 * unit, wisp.x));
      wisp.y = Math.max(3 * unit, Math.min(h - 3 * unit, wisp.y));

      wisp.trailX[2] += (wisp.trailX[1] - wisp.trailX[2]) * Math.min(1, dt * 5);
      wisp.trailY[2] += (wisp.trailY[1] - wisp.trailY[2]) * Math.min(1, dt * 5);
      wisp.trailX[1] += (wisp.trailX[0] - wisp.trailX[1]) * Math.min(1, dt * 7);
      wisp.trailY[1] += (wisp.trailY[0] - wisp.trailY[1]) * Math.min(1, dt * 7);
      wisp.trailX[0] = wisp.x;
      wisp.trailY[0] = wisp.y;

      if (lantern && Math.hypot(wisp.x - lantern.x, wisp.y - lantern.y) < 24 * unit) {
        atLantern++;
      }
    }

    if (atLantern > 0) landmarks.flareLantern();
  }

  private updateAnimals(
    dt: number,
    scroll: number,
    w: number,
    h: number,
    unit: number,
    weights: readonly number[],
    pointer: Pointer | null,
  ): void {
    const step = 95 * unit;
    while (this.spawnedTo < scroll + w + 40 * unit) {
      this.spawnedTo += step;
      let animal: VergeAnimal | undefined;
      for (const candidate of this.animals) {
        if (candidate.x - scroll < -36 * unit || candidate.x - scroll > w + 150 * unit) {
          animal = candidate;
          break;
        }
      }
      if (!animal) continue;
      const kind = weights[1] > 0.4 ? 'frog' : 'rabbit';
      if (Math.random() > (kind === 'frog' ? 0.5 : 0.65)) continue;
      animal.kind = kind;
      animal.x = this.spawnedTo + rand(-18, 18) * unit;
      animal.y = Math.round(h * (kind === 'frog' ? rand(0.71, 0.78) : rand(0.76, 0.815)));
      animal.dir = Math.random() < 0.5 ? 1 : -1;
      animal.mood = 'sit'; animal.timer = rand(1.5, 4); animal.clock = 0;
      animal.seed = Math.random() * 20;
    }

    for (const a of this.animals) {
      if (!Number.isFinite(a.x)) continue;
      a.clock += dt;
      a.timer -= dt;
      const sx = a.x - scroll;
      if (pointer && Math.hypot(pointer.x - sx, pointer.y - a.y) < 28 * unit && a.mood !== 'hop') {
        a.dir = pointer.x < sx ? 1 : -1;
        a.mood = 'hop';
        a.timer = 0.8;
      }
      if (a.mood === 'hop') a.x += a.dir * (a.kind === 'frog' ? 18 : 26) * unit * dt;
      if (a.timer <= 0) {
        if (a.kind === 'frog') {
          a.mood = Math.random() < 0.35 ? 'hop' : Math.random() < 0.4 ? 'blink' : 'sit';
          a.timer = a.mood === 'hop' ? 0.6 : a.mood === 'blink' ? 0.25 : rand(2, 5);
        } else {
          a.mood = Math.random() < 0.4 ? 'hop' : 'sit';
          if (a.mood === 'hop') a.dir = Math.random() < 0.5 ? 1 : -1;
          a.timer = a.mood === 'hop' ? rand(0.7, 1.4) : rand(2, 5);
        }
      }
    }

  }

  collectStanding(
    sprites: FairySprites, scroll: number, w: number, h: number, unit: number,
    time: number, speed: number, weights: readonly number[], chapterIndex: number,
    out: DrawList,
  ): void {
    for (const animal of this.animals) {
      const sx = animal.x - scroll;
      if (sx < -30 * unit || sx > w + 30 * unit) continue;
      const rabbit = animal.kind === 'rabbit';
      const sp = rabbit
        ? animal.mood === 'hop'
          ? animal.dir === 1 ? sprites.rabbit.hop : sprites.rabbit.hopL
          : animal.dir === 1 ? sprites.rabbit.sit : sprites.rabbit.sitL
        : animal.mood === 'blink' ? sprites.frog.blink : sprites.frog.sit;
      const scale = (rabbit ? 1.8 : 1.5) * unit;
      const rw = sp.w * scale;
      const rh = sp.h * scale;
      const lift = animal.mood === 'hop' ? Math.sin(Math.PI * ((animal.clock * 2.5) % 1)) * 4 * unit : 0;
      out.add(sp, sx - rw / 2, animal.y - rh - lift, rw, rh, animal.y);
    }
    if (weights[0] > 0.1) {
      const owl = this.owlPose === 'blink' ? sprites.owl.blink : this.owlPose === 'turn' ? sprites.owl.turn : sprites.owl.idle;
      const cell = 180 * unit;
      const k = Math.floor((scroll + w * 0.5) / cell);
      const x = (k + 0.45) * cell - scroll;
      out.add(owl, x, h * 0.67 - owl.h * 2 * unit, owl.w * 2 * unit, owl.h * 2 * unit, h * 0.79, weights[0]);
    }

    const stag = this.stagDrawInfo;
    stag.alpha = 0;
    if (weights[4] > 0.02) {
      const p = this.stagPhase;
      // The bow happens in the right third, above the radio's top edge.
      const x = p < 0.35 ? w * (0.91 - 0.15 * p / 0.35)
        : p < 0.68 ? w * 0.76 : w * (0.76 - 0.12 * (p - 0.68) / 0.32);
      stag.bowing = p >= 0.35 && p < 0.68;
      const sp = stag.bowing ? sprites.stag.bowL : sprites.stag.walkL[Math.floor(time * 3) % 2];
      stag.h = STAG_HEIGHT * unit;
      stag.w = sp.w / sp.h * stag.h;
      stag.x = Math.round(x - stag.w / 2);
      stag.y = Math.round(h * 0.79 - stag.h);
      stag.alpha = weights[4] * Math.min(1, p * 16, (1 - p) * 10);
    }

    if (weights[5] > 0.02) {
      const cell = 110 * unit;
      for (let k = Math.floor(scroll / cell); k <= Math.ceil((scroll + w) / cell); k++) {
        if (hash(k * 97 + 3) > 0.65) continue;
        const pair = sprites.tinyFolk[Math.abs(k) % sprites.tinyFolk.length];
        const sp = pair[Math.floor(time * 3 + k) % 2];
        const x = (k + 0.35) * cell - scroll;
        const y = h * 0.79;
        out.add(sp, x, y - sp.h * 2 * unit, sp.w * 2 * unit, sp.h * 2 * unit, y, weights[5]);
      }
    }
    this.collectPip(sprites, h, unit, time, speed, chapterIndex, out);
  }

  private collectPip(sprites: FairySprites, h: number, unit: number, time: number,
    speed: number, chapterIndex: number, out: DrawList): void {
    const pipY = Math.round(h * PIP_ROW);
    const scale = PIP_SCALE * unit;
    let sp: Sprite;
    if (this.pipTipTimer > 0) {
      sp = this.pipDir === 1 ? sprites.pip.tip : sprites.pip.tipL;
    } else if (this.pipTrotting || speed > 0) {
      const f = Math.floor(this.pipWalkClock) % 2;
      sp = this.pipDir === 1 ? sprites.pip.run[f] : sprites.pip.runL[f];
    } else if (chapterIndex === 2) sp = sprites.pip.ask;
    else if (chapterIndex === 3) sp = sprites.pip.scroll;
    else if (chapterIndex === 4) sp = sprites.pip.kneel;
    else if (chapterIndex === 5) sp = sprites.pip.wave[Math.floor(time * 3) % 2];
    else sp = sprites.pip.run[0];
    const width = sp.w * scale;
    const height = sp.h * scale;
    const x = this.pipX - width / 2;
    const y = pipY - height;
    this.pipLanternScreen.x = x + (this.pipDir === 1 ? width * 0.85 : width * 0.15);
    this.pipLanternScreen.y = y + height * 0.52;
    out.add(sp, x, y, width, height, pipY);
  }

  drawEffects(
    ctx: CanvasRenderingContext2D,
    sprites: FairySprites,
    time: number,
    unit: number,
    day: number,
    weights: readonly number[],
    sunHeight: number,
  ): void {
    const nightBoost = 1 - day;

    if (this.pipLanternScreen) {
      const lx = Math.round(this.pipLanternScreen.x);
      const ly = Math.round(this.pipLanternScreen.y);
      ctx.fillStyle = `rgba(255,220,118,${(0.2 + 0.35 * nightBoost).toFixed(3)})`;
      disc(ctx, lx, ly, Math.max(2, Math.round(6 * unit)));
    }

    if (this.stagDrawInfo.alpha > 0) {
      const s = this.stagDrawInfo;
      const sp = s.bowing ? sprites.stag.bowL : sprites.stag.walkL[Math.floor(time * 3) % 2];
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = s.alpha * 0.85;
      ctx.drawImage(sp.canvas, s.x, s.y, s.w, s.h);
      for (let i = 0; i < STAR_OFFSETS.length; i++) {
        const [ox, oy] = STAR_OFFSETS[i];
        const tw = 0.65 + 0.35 * Math.sin(time * (0.7 + i * 0.05) + i);
        ctx.globalAlpha = s.alpha * tw;
        ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#b8f0ff';
        ctx.fillRect(Math.round(s.x + s.w * ox), Math.round(s.y + s.h * oy), 1, 1);
      }
      ctx.restore();
    }

    const wispPresence = Math.min(1, weights[1] + weights[2]);
    if (wispPresence > 0.03) {
      for (const wisp of this.wisps) {
        const pulse = 0.7 + 0.3 * Math.sin(time * 2.2 + wisp.phase);
        const alpha = wispPresence * (0.55 + 0.45 * nightBoost) * pulse;
        for (let t = 2; t >= 0; t--) {
          ctx.fillStyle = `rgba(144,244,224,${(alpha * (0.28 - t * 0.07)).toFixed(3)})`;
          ctx.fillRect(Math.round(wisp.trailX[t]), Math.round(wisp.trailY[t]), Math.max(1, Math.round(2 * unit)), Math.max(1, Math.round(2 * unit)));
        }
        const x = Math.round(wisp.x);
        const y = Math.round(wisp.y);
        ctx.fillStyle = `rgba(128,236,216,${(alpha * 0.25).toFixed(3)})`;
        disc(ctx, x, y, Math.max(2, Math.round(6 * unit)));
        ctx.fillStyle = `rgba(224,255,244,${alpha.toFixed(3)})`;
        ctx.fillRect(x, y, Math.max(1, Math.round(2.5 * unit)), Math.max(1, Math.round(1.5 * unit)));
      }
    }

    for (const animal of this.animals) {
      const x = animal.x - this.scroll;
      if (animal.kind !== 'rabbit' || x < 0 || x > this.width) continue;
      const lift = animal.mood === 'hop' ? Math.sin(Math.PI * ((animal.clock * 2.5) % 1)) * 4 * unit : 0;
      const lx = Math.round(x + animal.dir * 5 * unit);
      const ly = Math.round(animal.y - 6 * unit - lift);
      ctx.fillStyle = `rgba(255,220,120,${0.04 + 0.3 * nightBoost})`;
      disc(ctx, lx, ly, Math.max(1, Math.round(4 * unit)));
    }
    this.air.draw(ctx, time, day, weights, unit, sunHeight);
  }
}
