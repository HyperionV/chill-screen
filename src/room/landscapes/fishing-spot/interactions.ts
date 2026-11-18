import { approach, clamp, rand } from '../../../world/math';
import type { FishingCreatures, RippleTrigger } from './creatures';
import type { FishingSprites } from './sprites';
import {
  FISH_SPECIES,
  type CastPhase,
  type CastSnapshot,
  type CatchIcon,
  type FishSpecies,
  type PointerDesign,
  type SceneIndex,
  type SceneLayout,
} from './types';

interface WaterRing {
  x: number;
  y: number;
  age: number;
  duration: number;
  maxR: number;
  bright: boolean;
}

const MAX_RINGS = 28;
const MAX_TALLY = 10;
const CAST_ARC_SECONDS = 0.26;
const REEL_SECONDS = 1.35;
const BITE_WINDOW_SECONDS = 4.8;
const DOG_ALERT_RADIUS = 34;
const CAT_ALERT_RADIUS = 28;

/** Anchors in design pixels for the recurring angler's rod tip, dog, and bucket in each scene. */
export interface SceneAnchors {
  rodTipX: number;
  rodTipY: number;
  dogX: number;
  dogY: number;
  bucketX: number;
  bucketY: number;
  idleFloatX: number;
  idleFloatY: number;
}

/** Computes character & prop anchors for a given scene and responsive layout. */
export function anchorsForScene(scene: SceneIndex, layout: SceneLayout): SceneAnchors {
  const j = layout.jettyRight;
  const d = layout.deckY;
  switch (scene) {
    case 0:
      return {
        rodTipX: j - 16,
        rodTipY: d - 24,
        dogX: j - 68,
        dogY: d,
        bucketX: j - 24,
        bucketY: d,
        idleFloatX: j + 56,
        idleFloatY: 184,
      };
    case 1:
      return {
        rodTipX: 86,
        rodTipY: d - 10,
        dogX: 38,
        dogY: d + 2,
        bucketX: 98,
        bucketY: d + 2,
        idleFloatX: 146,
        idleFloatY: 194,
      };
    case 2:
      return {
        rodTipX: 118,
        rodTipY: d - 18,
        dogX: 46,
        dogY: d + 4,
        bucketX: 70,
        bucketY: d + 4,
        idleFloatX: 170,
        idleFloatY: 190,
      };
    case 3:
      return {
        rodTipX: j - 28,
        rodTipY: d - 14,
        dogX: j - 82,
        dogY: d,
        bucketX: j - 104,
        bucketY: d,
        idleFloatX: j + 44,
        idleFloatY: 186,
      };
    case 4:
      return {
        rodTipX: j - 10,
        rodTipY: d - 14,
        dogX: j - 62,
        dogY: d,
        bucketX: j - 86,
        bucketY: d,
        idleFloatX: j + 42,
        idleFloatY: 188,
      };
  }
}

/** Handles pointer velocity, dog reactivity, water ripples, and cast-and-reel fishing. */
export class FishingInteractions {
  private phase: CastPhase = 'idle';
  private targetX = 220;
  private targetY = 186;
  private timer = 0;
  private rippleTimer = 0;
  private speciesIndex = 0;
  private currentSpecies: FishSpecies = 'perch';

  private readonly pointerPosition: PointerDesign = { x: 0, y: 0, speed: 0 };
  private pointerState: PointerDesign | null = null;
  private dogReact = 0;
  private catReact = 0;

  private readonly rings: WaterRing[] = [];
  readonly catchTally: CatchIcon[] = [];

  get pointer(): PointerDesign | null {
    return this.pointerState;
  }

  get dogAlert(): number {
    return this.dogReact;
  }

  get catAlert(): number {
    return this.catReact;
  }

  addRing(trigger: RippleTrigger): void {
    if (this.rings.length >= MAX_RINGS) this.rings.shift();
    this.rings.push({
      x: trigger.x,
      y: trigger.y,
      age: 0,
      duration: trigger.bright ? 1.15 : 1.4,
      maxR: trigger.maxR,
      bright: Boolean(trigger.bright),
    });
  }

  /** Processes a stage-pixel click `(sx, sy)` on the window. */
  press(
    sx: number,
    sy: number,
    scene: SceneIndex,
    layout: SceneLayout,
    creatures: FishingCreatures,
  ): void {
    const dx = sx / layout.unit;
    const dy = sy / layout.unit;

    // 1. Clicking a bird anywhere makes it take off.
    if (creatures.tryStartleBird(dx, dy, scene, layout, (r) => this.addRing(r))) {
      return;
    }

    // 2. If reeling a caught fish, let the showcase finish cleanly.
    if (this.phase === 'reel') {
      return;
    }

    const anchors = anchorsForScene(scene, layout);
    const floatX = this.phase === 'idle' ? anchors.idleFloatX : this.targetX;
    const floatY = this.phase === 'idle' ? anchors.idleFloatY : this.targetY;
    const nearFloat = Math.hypot(dx - floatX, dy - floatY) <= 22;
    const onWater = dy >= layout.waterTopY + 3 && dy <= layout.designH - 8;

    // 3. Click float or water during bite -> reel in a fish!
    if (this.phase === 'bite' && (onWater || nearFloat)) {
      this.startReel();
      return;
    }

    if (!onWater && !nearFloat) return;

    // 4. Clicking right on the active bobbing float retracts gently; clicking water casts to that spot.
    if (this.phase === 'bob' && nearFloat) {
      this.phase = 'idle';
      this.addRing({ x: this.targetX, y: this.targetY, maxR: 10 });
      return;
    }

    const castX = clamp(dx, layout.jettyRight - 4, layout.designW - 14);
    const castY = clamp(dy, layout.waterTopY + 5, layout.designH - 12);
    this.phase = 'arc';
    this.targetX = castX;
    this.targetY = castY;
    this.timer = CAST_ARC_SECONDS;
    this.rippleTimer = 0.3;
  }

  private startReel(): void {
    this.phase = 'reel';
    this.timer = REEL_SECONDS;
    this.currentSpecies = FISH_SPECIES[this.speciesIndex % FISH_SPECIES.length] ?? 'perch';
    this.speciesIndex = (this.speciesIndex + 1) % FISH_SPECIES.length;
    this.addRing({ x: this.targetX, y: this.targetY, maxR: 16, bright: true });
  }

  update(
    dt: number,
    pointerStage: { x: number; y: number } | null,
    scene: SceneIndex,
    layout: SceneLayout,
  ): void {
    // 1. Update pointer velocity.
    if (pointerStage) {
      const px = pointerStage.x / layout.unit;
      const py = pointerStage.y / layout.unit;
      let speed = 0;
      if (this.pointerState && dt > 0.001) {
        speed = Math.hypot(px - this.pointerState.x, py - this.pointerState.y) / dt;
      }
      this.pointerPosition.x = px;
      this.pointerPosition.y = py;
      this.pointerPosition.speed = speed;
      this.pointerState = this.pointerPosition;
    } else {
      this.pointerState = null;
    }

    // 2. Dog & pier cat proximity checks
    const anchors = anchorsForScene(scene, layout);
    const nearDog =
      this.pointerState !== null &&
      Math.hypot(this.pointerState.x - anchors.dogX, this.pointerState.y - (anchors.dogY - 7)) <= DOG_ALERT_RADIUS;
    this.dogReact = approach(this.dogReact, nearDog ? 1 : 0, nearDog ? 9 : 2.5, dt);

    const catX = scene === 3 ? layout.jettyRight - 18 : 42;
    const catY = scene === 3 ? layout.deckY - 6 : layout.deckY - 17;
    const nearCat =
      (scene === 0 || scene === 3 || scene === 4) &&
      this.pointerState !== null &&
      Math.hypot(this.pointerState.x - catX, this.pointerState.y - catY) <= CAT_ALERT_RADIUS;
    this.catReact = approach(this.catReact, nearCat ? 1 : 0, nearCat ? 8 : 2.2, dt);

    // 3. Cast & reel state machine
    if (this.phase === 'arc') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.phase = 'bob';
        this.timer = rand(2.6, 5.2);
        this.rippleTimer = 0.9;
        this.addRing({ x: this.targetX, y: this.targetY, maxR: 13, bright: true });
      }
    } else if (this.phase === 'bob') {
      this.timer -= dt;
      this.rippleTimer -= dt;
      if (this.rippleTimer <= 0) {
        this.rippleTimer = 1.6;
        this.addRing({ x: this.targetX, y: this.targetY, maxR: 9 });
      }
      if (this.timer <= 0) {
        this.phase = 'bite';
        this.timer = BITE_WINDOW_SECONDS;
        this.rippleTimer = 0;
        this.addRing({ x: this.targetX, y: this.targetY, maxR: 14, bright: true });
      }
    } else if (this.phase === 'bite') {
      this.timer -= dt;
      this.rippleTimer -= dt;
      if (this.rippleTimer <= 0) {
        this.rippleTimer = 0.42;
        this.addRing({ x: this.targetX, y: this.targetY, maxR: 12, bright: true });
      }
      if (this.timer <= 0) {
        // Gentle calm reset if missed; nothing to lose.
        this.phase = 'bob';
        this.timer = rand(3.5, 6.5);
      }
    } else if (this.phase === 'reel') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.phase = 'idle';
        if (this.catchTally.length >= MAX_TALLY) this.catchTally.shift();
        this.catchTally.push({ species: this.currentSpecies });
        this.addRing({ x: this.targetX, y: this.targetY, maxR: 11 });
      }
    }

    // 4. Advance water rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      if (!r) continue;
      r.age += dt;
      if (r.age >= r.duration) this.rings.splice(i, 1);
    }
  }

  get castSnapshot(): CastSnapshot {
    const progress =
      this.phase === 'arc'
        ? clamp(1 - this.timer / CAST_ARC_SECONDS, 0, 1)
        : this.phase === 'reel'
          ? clamp(1 - this.timer / REEL_SECONDS, 0, 1)
          : 0;
    return {
      phase: this.phase,
      x: this.targetX,
      y: this.targetY,
      progress,
      species: this.currentSpecies,
    };
  }

  /** Draws expanding pixel-art concentric elliptical ripple rings on the lake surface. */
  drawRings(ctx: CanvasRenderingContext2D, unit: number, day: number): void {
    const dot = Math.max(1, Math.round(unit));
    for (const r of this.rings) {
      const k = r.age / r.duration;
      const alpha = (1 - k) * (r.bright ? 0.65 : 0.42) * (0.45 + 0.55 * day);
      if (alpha < 0.03) continue;
      const rx = Math.max(2, Math.round((2 + r.maxR * k) * unit));
      const ry = Math.max(dot, Math.round(rx * 0.34));
      const cx = Math.round(r.x * unit);
      const cy = Math.round(r.y * unit);
      this.drawPixelEllipse(ctx, cx, cy, rx, ry, dot, `rgba(232,246,255,${alpha.toFixed(3)})`);
      if (r.bright && k > 0.25) {
        const innerAlpha = alpha * 0.55;
        const irx = Math.max(2, Math.round(rx * 0.58));
        const iry = Math.max(dot, Math.round(irx * 0.34));
        this.drawPixelEllipse(ctx, cx, cy, irx, iry, dot, `rgba(220,242,252,${innerAlpha.toFixed(3)})`);
      }
    }
  }

  private drawPixelEllipse(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    dot: number,
    color: string,
  ): void {
    ctx.fillStyle = color;
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const px = Math.round(cx + Math.cos(a) * rx);
      const py = Math.round(cy + Math.sin(a) * ry);
      ctx.fillRect(px, py, dot, dot);
    }
  }

  /** Draws the fishing line, float bobber, and lifted caught fish in the active scene. */
  drawFishingLine(
    ctx: CanvasRenderingContext2D,
    sprites: FishingSprites,
    scene: SceneIndex,
    layout: SceneLayout,
    time: number,
  ): void {
    const anchors = anchorsForScene(scene, layout);
    const u = layout.unit;
    const dot = Math.max(1, Math.round(u));
    const snap = this.castSnapshot;

    // Scene 1 (napping) & Scene 3 (cooking): only show line when actively cast/bitten/reeling.
    if (snap.phase === 'idle' && (scene === 1 || scene === 3)) return;

    const fx = snap.phase === 'idle' ? anchors.idleFloatX : snap.x;
    const fy = snap.phase === 'idle' ? anchors.idleFloatY : snap.y;

    const tipX = anchors.rodTipX * u;
    const tipY = anchors.rodTipY * u;

    if (snap.phase === 'arc') {
      const p = snap.progress;
      const curX = anchors.rodTipX + (fx - anchors.rodTipX) * p;
      const curY = anchors.rodTipY + (fy - anchors.rodTipY) * p - Math.sin(Math.PI * p) * 28;
      this.drawLineCurve(ctx, tipX, tipY, curX * u, curY * u, 2, dot, u);
      this.drawFloat(ctx, curX * u, curY * u, false, dot);
      return;
    }

    if (snap.phase === 'reel') {
      const p = snap.progress;
      const arcLift = Math.sin(Math.min(1, p * 1.15) * Math.PI) * 34;
      const fishX = fx + (anchors.bucketX - fx) * p * 0.35;
      const fishY = fy - arcLift;
      this.drawLineCurve(ctx, tipX, tipY, fishX * u, (fishY - 3) * u, 1.5, dot, u);

      const fishSprite = sprites.caughtFish[snap.species];
      const fw = Math.round(fishSprite.w * u);
      const fh = Math.round(fishSprite.h * u);
      ctx.drawImage(
        fishSprite.canvas,
        0,
        0,
        fishSprite.w,
        fishSprite.h,
        Math.round(fishX * u - fw / 2),
        Math.round(fishY * u - fh / 2),
        fw,
        fh,
      );
      if (p < 0.35) {
        ctx.fillStyle = 'rgba(235,248,255,0.85)';
        ctx.fillRect(Math.round(fishX * u - 3 * u), Math.round((fishY + 4) * u), dot, dot * 2);
        ctx.fillRect(Math.round(fishX * u + 3 * u), Math.round((fishY + 3) * u), dot, dot * 2);
      }
      return;
    }

    const isBite = snap.phase === 'bite';
    const bobOffset = isBite
      ? Math.sin(time * 5.2) * 2.2 + 2.4
      : Math.sin(time * 2.2) * 0.8;
    const bx = Math.round(fx * u);
    const by = Math.round((fy + bobOffset) * u);

    this.drawLineCurve(ctx, tipX, tipY, bx, by - dot * 3, isBite ? 0.5 : 4.5, dot, u);
    this.drawFloat(ctx, bx, by, isBite, dot);
  }

  private drawLineCurve(
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    sag: number,
    dot: number,
    unit: number,
  ): void {
    ctx.fillStyle = 'rgba(232,242,246,0.68)';
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      const lx = Math.round(x0 + (x1 - x0) * k);
      const ly = Math.round(y0 + (y1 - y0) * k + Math.sin(Math.PI * k) * sag * unit);
      ctx.fillRect(lx, ly, dot, dot);
    }
  }

  private drawFloat(ctx: CanvasRenderingContext2D, bx: number, by: number, bite: boolean, dot: number): void {
    const x = Math.round(bx);
    const y = Math.round(by);
    // Thin dark antenna + white top + red base
    ctx.fillStyle = '#242a2e';
    ctx.fillRect(x, y - dot * 4, dot, dot);
    ctx.fillStyle = '#f4f0e4';
    ctx.fillRect(x - dot, y - dot * 3, dot * 3, dot * 2);
    ctx.fillStyle = '#de4438';
    ctx.fillRect(x - dot, y - dot, dot * 3, dot * 2);
    if (bite) {
      ctx.fillStyle = 'rgba(255,246,192,0.85)';
      ctx.fillRect(x - dot * 2, y - dot * 6, dot, dot);
      ctx.fillRect(x + dot * 2, y - dot * 6, dot, dot);
    }
  }

  /** Draws tiny caught-fish icons neatly alongside/on the bucket (no text). */
  drawBucketTally(
    ctx: CanvasRenderingContext2D,
    sprites: FishingSprites,
    bucketX: number,
    bucketY: number,
    unit: number,
  ): void {
    if (this.catchTally.length === 0) return;
    const cols = 2;
    const startX = bucketX + 9;
    const startY = bucketY - 4;
    for (let i = 0; i < this.catchTally.length; i++) {
      const item = this.catchTally[i];
      if (!item) continue;
      const icon = sprites.tallyFish[item.species];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const iw = Math.round(icon.w * unit);
      const ih = Math.round(icon.h * unit);
      const ix = Math.round((startX + col * 8) * unit);
      const iy = Math.round((startY - row * 4) * unit);
      ctx.drawImage(icon.canvas, 0, 0, icon.w, icon.h, ix, iy, iw, ih);
    }
  }
}
