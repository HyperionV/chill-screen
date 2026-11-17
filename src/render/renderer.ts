import { bodyLength } from '../world/fish';
import { approach } from '../world/math';
import { depthScale, floorAt, TANK_HEIGHT } from '../world/geometry';
import type { Palette } from '../world/daylight';
import type { Tank } from '../world/types';
import { paintHardscapeLayer, paintVignette, paintWaterLayer, waterColor } from './backdrop';
import { drawFish } from './fish-art';
import { drawFood, drawPlant, drawShrimp, drawSnail } from './life-art';
import { createEffects, drawAlgae, drawParticles, updateEffects, type Effects } from './effects';
import { paintShadowEllipse } from './hardscape';
import { Scenery } from './scenery';
import { Sunlight } from './light';
import { Surface } from './surface';

/** Highest pixel density we draw at; beyond this the soft art gains nothing and costs power. */
const MAX_PIXEL_RATIO = 1.5;
/** The vignette is a smooth gradient, so a small image stretched to full size looks identical. */
const VIGNETTE_RES = 0.25;
/** How far the light may drift (sum of colour channel changes) before the still layers are repainted. */
const REPAINT_COLOR_DRIFT = 8;
/** Fish further than this above the sand cast no visible shadow. */
const SHADOW_REACH = 260;
/** How bright plants, wood, stone and fish stay in the darkest hour, as a share of their daylight colour. */
const NIGHT_AMBIENT = 0.42;

/** Share of daylight falling on everything in the water at this hour. */
const ambientOf = (pal: Palette): number => NIGHT_AMBIENT + (1 - NIGHT_AMBIENT) * Math.min(1, pal.light);

/**
 * The palette with the water and sand pre-brightened by 1/ambient. The whole frame is later dimmed by
 * the ambient light, which brings these back to their intended colour while everything else darkens.
 */
const preLit = (pal: Palette, ambient: number): Palette => {
  const up = (c: Palette['sand']): Palette['sand'] => [c[0] / ambient, c[1] / ambient, c[2] / ambient];
  return { ...pal, waterTop: up(pal.waterTop), waterDeep: up(pal.waterDeep), sand: up(pal.sand) };
};

const paletteDrift = (a: Palette, b: Palette): number => {
  let d = Math.abs(a.light - b.light) * 255;
  for (const key of ['waterTop', 'waterDeep', 'sand', 'rays'] as const) {
    for (let i = 0; i < 3; i++) d += Math.abs(a[key][i] - b[key][i]);
  }
  return d;
};

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly waterLayer = document.createElement('canvas');
  private readonly hardscapeLayer = document.createElement('canvas');
  private readonly vignette = document.createElement('canvas');
  private readonly scenery = new Scenery();
  private readonly sunlight = new Sunlight();
  private readonly surface = new Surface();
  private readonly bends = new Map<number, number>();
  readonly effects: Effects;
  /** World units to canvas pixels. */
  scale = 1;
  private painted: Palette | null = null;

  constructor(private readonly canvas: HTMLCanvasElement, tank: Tank) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D canvas is not available');
    this.ctx = ctx;
    this.effects = createEffects(tank);
  }

  /** Fits the canvas to the window and returns the tank width in world units for this shape. */
  resize(cssWidth: number, cssHeight: number): number {
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    const w = Math.round(cssWidth * ratio);
    const h = Math.round(cssHeight * ratio);
    for (const c of [this.canvas, this.waterLayer, this.hardscapeLayer]) {
      c.width = w;
      c.height = h;
    }
    this.vignette.width = Math.ceil(w * VIGNETTE_RES);
    this.vignette.height = Math.ceil(h * VIGNETTE_RES);
    paintVignette(this.vignette);
    this.scale = h / TANK_HEIGHT;
    this.surface.resize(w, this.scale);
    this.painted = null;
    return (cssWidth / cssHeight) * TANK_HEIGHT;
  }

  /** Forces the still layers to repaint on the next frame (after the tank changes shape). */
  invalidateBackdrop(): void {
    this.painted = null;
  }

  render(tank: Tank, pal: Palette, dt: number, time: number): void {
    if (!this.painted || paletteDrift(this.painted, pal) > REPAINT_COLOR_DRIFT) this.repaint(tank, pal);
    updateEffects(this.effects, tank, dt, time);
    this.updateBends(tank, dt);

    const ctx = this.ctx;
    const S = this.scale;
    const ambient = ambientOf(pal);
    // Distant things fade into the water as it looks before the frame is dimmed.
    const water = waterColor(preLit(pal, ambient));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.waterLayer, 0, 0);
    ctx.setTransform(S, 0, 0, S, 0, 0);
    this.scenery.drawPlanting(ctx, tank, time, dt, S);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.hardscapeLayer, 0, 0);
    ctx.setTransform(S, 0, 0, S, 0, 0);
    this.scenery.drawMoss(ctx, water, time);
    this.sunlight.drawCaustics(ctx, pal, time);
    drawAlgae(ctx, tank);
    this.drawShadows(tank);
    this.sunlight.drawShafts(ctx, tank, pal, time);

    const fish = [...tank.fish].sort((a, b) => a.z - b.z);
    const plants = [...tank.plants].sort((a, b) => a.z - b.z);
    let fi = 0;
    for (const p of plants) {
      while (fi < fish.length && fish[fi].z < p.z) drawFish(ctx, fish[fi++], water);
      drawPlant(ctx, p, time, this.bends.get(p.id) ?? 0, water);
    }
    ctx.globalAlpha = 1;
    for (const s of tank.snails) drawSnail(ctx, s, time, water);
    for (const s of tank.shrimp) drawShrimp(ctx, s, time, water);
    ctx.globalAlpha = 1;
    drawFood(ctx, tank.food, water);
    while (fi < fish.length) drawFish(ctx, fish[fi++], water);
    ctx.globalAlpha = 1;

    drawParticles(ctx, this.effects, pal);
    this.scenery.drawFloaters(ctx, tank, water, time, dt);

    // Dim everything to the hour's light; the water layer was pre-brightened to cancel this out.
    if (ambient < 0.995) {
      const v = Math.round(ambient * 255);
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(0, 0, tank.width, TANK_HEIGHT);
      ctx.globalCompositeOperation = 'source-over';
    }
    this.surface.draw(ctx, this.canvas, tank, pal, time);

    const night = 1 - pal.light;
    if (night > 0.05) {
      ctx.fillStyle = `rgba(4,10,28,${(night * 0.32).toFixed(3)})`;
      ctx.fillRect(0, 0, tank.width, TANK_HEIGHT);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.vignette, 0, 0, this.canvas.width, this.canvas.height);
  }

  private repaint(tank: Tank, pal: Palette): void {
    const lit = preLit(pal, ambientOf(pal));
    paintWaterLayer(this.waterLayer, tank, lit, this.scale);
    paintHardscapeLayer(this.hardscapeLayer, tank, lit, this.scale);
    this.scenery.rebuild(tank, waterColor(lit), this.scale);
    this.sunlight.resize(tank, this.canvas.width, this.canvas.height, this.scale);
    this.painted = pal;
  }

  /** Soft shadows on the sand under fish swimming low and the creatures on the bottom. */
  private drawShadows(tank: Tank): void {
    const ctx = this.ctx;
    for (const f of tank.fish) {
      const floor = floorAt(f.x, f.z);
      const lift = floor - f.y;
      if (lift > SHADOW_REACH || f.fade < 0.05) continue;
      const k = 1 - Math.max(0, lift) / SHADOW_REACH;
      const size = bodyLength(f) * 0.6;
      paintShadowEllipse(ctx, f.x, floor + 2, size * (1.4 - k * 0.4), size * 0.22, 0.3 * k * k * f.fade);
    }
    for (const s of tank.snails) paintShadowEllipse(ctx, s.x, floorAt(s.x, s.z) + 1, 16 * depthScale(s.z), 4, 0.3 * s.fade);
    for (const s of tank.shrimp) paintShadowEllipse(ctx, s.x, floorAt(s.x, s.z) + 1, 12 * depthScale(s.z), 3, 0.22 * s.fade);
  }

  /** Plants lean away from a passing pointer and with a stirred current, then spring back. */
  private updateBends(tank: Tank, dt: number): void {
    const c = tank.cursor;
    const cur = tank.current;
    for (const p of tank.plants) {
      let target = 0;
      const top = floorAt(p.x, p.z) - p.height;
      if (c.inside && c.speed > 40 && c.y > top && Math.abs(c.x - p.x) < 70) {
        target += Math.sign(p.x - c.x || 1) * (70 - Math.abs(c.x - p.x)) * 0.9;
      }
      if (cur.strength > 0.01) {
        const d = Math.hypot(p.x - cur.x, top + p.height / 2 - cur.y);
        if (d < 350) target += cur.fx * cur.strength * (1 - d / 350) * 0.25;
      }
      const prev = this.bends.get(p.id) ?? 0;
      this.bends.set(p.id, approach(prev, target, target === 0 ? 1.2 : 4, dt));
    }
  }
}
