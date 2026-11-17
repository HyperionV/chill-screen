import { approach, clamp, rand } from '../../../world/math';
import type { CastSprites, PigeonSprites, SpriteBox } from './cast-sprites';
import { CatController } from './cat';
import { SCENE_SPACING, WORLD_W, wrapDelta } from './scenes';
import type { ScreenRect } from './skyline';

type PigeonMode = 'idle' | 'shuffle' | 'scatter';

interface Pigeon {
  homeWx: number;
  homeY: number;
  wx: number;
  y: number;
  vx: number;
  vy: number;
  dir: 1 | -1;
  mode: PigeonMode;
  timer: number;
  peckTimer: number;
  phase: number;
  screenRect: ScreenRect | null;
}

interface Bee {
  anchorWx: number;
  anchorY: number;
  wx: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
}

interface Balloon {
  x: number;
  y: number;
  vy: number;
  swayPhase: number;
  kind: number;
  age: number;
}

interface MusicNote {
  wx: number;
  y: number;
  age: number;
  life: number;
  kind: 0 | 1;
}

const POINTER_SHUFFLE_RADIUS = 32;
const MAX_BALLOONS = 20;
const MAX_NOTES = 8;

/**
 * Manages living characters and creatures across Rooftop City:
 * the recurring grey cat, interactive pigeons, garden bees, bar patrons,
 * pigeon keeper, waving neighbour, drifting music notes, and blimp balloons.
 */
export class RooftopCreatures {
  private readonly cat = new CatController();
  private readonly pigeons: Pigeon[] = [];
  private readonly bees: Bee[] = [];
  private readonly balloons: Balloon[] = [];
  private readonly notes: MusicNote[] = [];

  private noteSpawnTimer = 0.8;
  private neighbourWaveTimer = 0;
  private keeperTossTimer = 0;
  private neighbourRect: ScreenRect | null = null;
  private keeperRect: ScreenRect | null = null;

  constructor() {
    const spots: readonly { wx: number; y: number; dir: 1 | -1 }[] = [
      { wx: -86, y: 204, dir: 1 },
      { wx: 194, y: 204, dir: -1 },
      { wx: SCENE_SPACING * 3 + 156, y: 168, dir: -1 },
      { wx: SCENE_SPACING * 3 + 178, y: 168, dir: -1 },
      { wx: SCENE_SPACING * 3 + 152, y: 188, dir: 1 },
      { wx: SCENE_SPACING * 3 + 174, y: 188, dir: -1 },
      { wx: SCENE_SPACING * 3 + 82, y: 204, dir: 1 },
      { wx: SCENE_SPACING * 3 + 104, y: 204, dir: -1 },
      { wx: SCENE_SPACING * 3 + 198, y: 204, dir: -1 },
    ];
    spots.forEach((s, i) => {
      this.pigeons.push({
        homeWx: s.wx,
        homeY: s.y,
        wx: s.wx,
        y: s.y,
        vx: 0,
        vy: 0,
        dir: s.dir,
        mode: 'idle',
        timer: rand(1.5, 4.5),
        peckTimer: rand(0.5, 3),
        phase: i * 1.37,
        screenRect: null,
      });
    });

    const gardenCenter = SCENE_SPACING * 4;
    for (let i = 0; i < 6; i++) {
      const anchorWx = gardenCenter - 196 + i * 21;
      const anchorY = 172 + (i % 3) * 8;
      this.bees.push({ anchorWx, anchorY, wx: anchorWx, y: anchorY, vx: 0, vy: 0, phase: i * 1.1 });
    }
  }

  update(
    dt: number,
    time: number,
    activeScene: number,
    nextScene: number,
    blend: number,
    camX: number,
    pxShift: number,
    designW: number,
    day: number,
    pointerDesign: { x: number; y: number } | null,
  ): void {
    this.cat.update(dt, activeScene, nextScene, blend);
    this.updatePigeons(dt, time, camX, pxShift, designW, pointerDesign);
    this.updateBees(dt, time, camX, pxShift, designW, day, pointerDesign);

    if (this.neighbourWaveTimer > 0) this.neighbourWaveTimer = Math.max(0, this.neighbourWaveTimer - dt);
    if (this.keeperTossTimer > 0) this.keeperTossTimer = Math.max(0, this.keeperTossTimer - dt);

    const barDist = Math.abs(wrapDelta(SCENE_SPACING * 2, camX, WORLD_W));
    if (barDist < designW * 0.85) {
      this.noteSpawnTimer -= dt;
      if (this.noteSpawnTimer <= 0 && this.notes.length < MAX_NOTES) {
        this.noteSpawnTimer = rand(1.1, 2.0);
        this.notes.push({
          wx: SCENE_SPACING * 2 - 110 + rand(-4, 6),
          y: 158,
          age: 0,
          life: rand(3.0, 4.2),
          kind: Math.random() < 0.5 ? 0 : 1,
        });
      }
    }
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const n = this.notes[i];
      if (!n) continue;
      n.age += dt;
      n.y -= 9 * dt;
      n.wx += Math.sin(time * 2 + n.age * 3) * 4 * dt;
      if (n.age >= n.life) this.notes.splice(i, 1);
    }

    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];
      if (!b) continue;
      b.age += dt;
      b.y += b.vy * dt;
      b.x += Math.sin(time * 1.4 + b.swayPhase) * 6 * dt;
      if (b.y < -14 || b.age > 14) this.balloons.splice(i, 1);
    }
  }

  drawPreTint(
    L: CanvasRenderingContext2D,
    time: number,
    camX: number,
    pxShift: number,
    designW: number,
    day: number,
    unit: number,
    sprites: CastSprites,
  ): void {
    const halfW = designW * 0.5;
    const foreCam = camX + pxShift;
    L.imageSmoothingEnabled = false;

    this.drawBarPeople(L, time, foreCam, halfW, designW, unit, sprites);

    const keeperWx = SCENE_SPACING * 3 + 120;
    const keeperSx = wrapDelta(keeperWx, foreCam, WORLD_W) + halfW;
    if (keeperSx > -32 && keeperSx < designW + 32) {
      const tossing = this.keeperTossTimer > 0 || Math.sin(time * 0.45) > 0.72;
      const kSp = tossing ? sprites.keeper.active : sprites.keeper.idle;
      this.drawSpriteStand(L, kSp, keeperSx, 206, unit, false);
      this.keeperRect = { x: keeperSx - kSp.w * 0.5 - 3, y: 206 - kSp.h - 3, w: kSp.w + 6, h: kSp.h + 6 };
    } else {
      this.keeperRect = null;
    }

    const neighWx = SCENE_SPACING * 4 - 84;
    const neighSx = wrapDelta(neighWx, foreCam, WORLD_W) + halfW;
    if (neighSx > -32 && neighSx < designW + 32) {
      let nSp: SpriteBox;
      if (this.neighbourWaveTimer > 0) {
        nSp = Math.floor(time * 5) % 2 === 0 ? sprites.neighbour.waveA : sprites.neighbour.waveB;
      } else {
        nSp = Math.floor(time * 1.1) % 2 === 0 ? sprites.neighbour.tendA : sprites.neighbour.tendB;
      }
      this.drawSpriteStand(L, nSp, neighSx, 206, unit, false);
      this.neighbourRect = { x: neighSx - nSp.w * 0.5 - 4, y: 206 - nSp.h - 4, w: nSp.w + 8, h: nSp.h + 8 };
    } else {
      this.neighbourRect = null;
    }

    this.cat.drawPreTint(L, time, foreCam, halfW, designW, unit, sprites);

    for (const p of this.pigeons) {
      const sx = wrapDelta(p.wx, foreCam, WORLD_W) + halfW;
      if (sx < -20 || sx > designW + 20) {
        p.screenRect = null;
        continue;
      }
      const set: PigeonSprites = p.dir >= 0 ? sprites.pigeonRight : sprites.pigeonLeft;
      let sp = set.stand;
      if (p.mode === 'scatter') {
        sp = Math.floor(time * 10 + p.phase) % 2 === 0 ? set.flyUp : set.flyDown;
      } else if (p.mode === 'shuffle') {
        sp = Math.floor(time * 8 + p.phase) % 2 === 0 ? set.shuffle : set.stand;
      } else if (p.peckTimer > 0 && Math.floor(time * 5 + p.phase) % 2 === 0) {
        sp = set.peck;
      }
      this.drawSpriteStand(L, sp, sx, p.y, unit, false);
      p.screenRect = { x: sx - sp.w * 0.5 - 5, y: p.y - sp.h - 5, w: sp.w + 10, h: sp.h + 10 };
    }

    if (day > 0.25) {
      for (const b of this.bees) {
        const sx = wrapDelta(b.wx, foreCam, WORLD_W) + halfW;
        if (sx < -8 || sx > designW + 8) continue;
        const bx = Math.round(sx * unit);
        const by = Math.round(b.y * unit);
        const u = Math.max(1, Math.round(unit));
        L.fillStyle = '#f6cc3c';
        L.fillRect(bx, by, u * 2, u);
        L.fillStyle = '#24221c';
        L.fillRect(bx + u, by, u, u);
        if (Math.floor(time * 18 + b.phase) % 2 === 0) {
          L.fillStyle = 'rgba(244, 250, 255, 0.85)';
          L.fillRect(bx, by - u, u * 2, u);
        }
      }
    }
  }

  drawPostTint(
    ctx: CanvasRenderingContext2D,
    time: number,
    camX: number,
    pxShift: number,
    designW: number,
    unit: number,
    sprites: CastSprites,
  ): void {
    const halfW = designW * 0.5;
    const foreCam = camX + pxShift;
    ctx.imageSmoothingEnabled = false;

    for (const b of this.balloons) {
      const sp = sprites.balloons[b.kind % sprites.balloons.length];
      if (!sp) continue;
      const fade = b.age > 11 ? Math.max(0, 1 - (b.age - 11) / 3) : 1;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.drawImage(
        sp.canvas,
        Math.round((b.x - sp.w * 0.5) * unit),
        Math.round((b.y - sp.h * 0.5) * unit),
        Math.round(sp.w * unit),
        Math.round(sp.h * unit),
      );
      ctx.restore();
    }

    for (const n of this.notes) {
      const sx = wrapDelta(n.wx, foreCam, WORLD_W) + halfW;
      if (sx < -10 || sx > designW + 10) continue;
      const alpha = Math.min(1, n.age * 2) * (1 - n.age / n.life) * 0.9;
      const nx = Math.round(sx * unit);
      const ny = Math.round(n.y * unit);
      const u = Math.max(1, Math.round(unit));
      ctx.fillStyle = `rgba(255, 226, 152, ${alpha.toFixed(2)})`;
      ctx.fillRect(nx, ny, u * 2, u * 2);
      ctx.fillRect(nx + u, ny - u * 4, u, u * 4);
      ctx.fillRect(nx + u, ny - u * 4, u * 3, u);
      if (n.kind === 1) {
        ctx.fillRect(nx + u * 4, ny - u * 3, u, u * 4);
        ctx.fillRect(nx + u * 3, ny, u * 2, u * 2);
      }
    }

    this.cat.drawPostTint(ctx, unit);

    if (this.neighbourWaveTimer > 2.4 && this.neighbourRect) {
      const wx = Math.round((this.neighbourRect.x + this.neighbourRect.w * 0.5) * unit);
      const wy = Math.round((this.neighbourRect.y - 4 - Math.sin(time * 6) * 2) * unit);
      const u = Math.max(1, Math.round(unit));
      ctx.fillStyle = 'rgba(255, 236, 148, 0.9)';
      ctx.fillRect(wx, wy, u, u);
      ctx.fillRect(wx - u * 2, wy + u, u, u);
      ctx.fillRect(wx + u * 2, wy + u, u, u);
    }
  }

  tryStretchCat(dx: number, dy: number): boolean {
    return this.cat.tryStretch(dx, dy);
  }

  tryScatterPigeons(dx: number, dy: number): boolean {
    let hit = false;
    for (const p of this.pigeons) {
      const r = p.screenRect;
      if (r && dx >= r.x && dx <= r.x + r.w && dy >= r.y && dy <= r.y + r.h) {
        hit = true;
        break;
      }
    }
    if (!hit) return false;
    for (const p of this.pigeons) {
      if (!p.screenRect) continue;
      const dist = Math.hypot(p.screenRect.x + p.screenRect.w * 0.5 - dx, p.screenRect.y - dy);
      if (dist < 85) {
        p.mode = 'scatter';
        p.timer = rand(3.6, 5.4);
        const away = p.screenRect.x + p.screenRect.w * 0.5 >= dx ? 1 : -1;
        p.dir = away;
        p.vx = away * rand(22, 34);
        p.vy = -rand(24, 34);
      }
    }
    return true;
  }

  tryWaveNeighbour(dx: number, dy: number): boolean {
    const nr = this.neighbourRect;
    if (nr && dx >= nr.x && dx <= nr.x + nr.w && dy >= nr.y && dy <= nr.y + nr.h) {
      this.neighbourWaveTimer = 3.6;
      return true;
    }
    const kr = this.keeperRect;
    if (kr && dx >= kr.x && dx <= kr.x + kr.w && dy >= kr.y && dy <= kr.y + kr.h) {
      this.keeperTossTimer = 1.6;
      return true;
    }
    return false;
  }

  releaseBalloons(blimpRect: ScreenRect): void {
    const cx = blimpRect.x + blimpRect.w * 0.54;
    const cy = blimpRect.y + blimpRect.h - 2;
    for (let i = 0; i < 4; i++) {
      if (this.balloons.length >= MAX_BALLOONS) this.balloons.shift();
      this.balloons.push({
        x: cx + (i - 1.5) * 6 + rand(-2, 2),
        y: cy + rand(-2, 3),
        vy: -rand(12, 18),
        swayPhase: rand(0, Math.PI * 2),
        kind: i,
        age: 0,
      });
    }
  }

  private updatePigeons(
    dt: number,
    time: number,
    camX: number,
    pxShift: number,
    designW: number,
    pointerDesign: { x: number; y: number } | null,
  ): void {
    const halfW = designW * 0.5;
    const foreCam = camX + pxShift;

    for (const p of this.pigeons) {
      const sx = wrapDelta(p.wx, foreCam, WORLD_W) + halfW;
      if (pointerDesign && p.mode === 'idle' && sx > -10 && sx < designW + 10) {
        const dist = Math.hypot(pointerDesign.x - sx, pointerDesign.y - (p.y - 4));
        if (dist < POINTER_SHUFFLE_RADIUS) {
          p.mode = 'shuffle';
          p.timer = 0.55;
          p.dir = pointerDesign.x <= sx ? 1 : -1;
          p.vx = p.dir * 20;
        }
      }

      if (p.mode === 'scatter') {
        p.timer -= dt;
        if (p.timer > 1.4) {
          p.wx += p.vx * dt;
          p.y += p.vy * dt;
          p.vy = approach(p.vy, Math.sin(time * 2.2 + p.phase) * 8, 2.5, dt);
          if (p.y < 64) p.vy = Math.abs(p.vy) * 0.5;
        } else {
          p.wx = approach(p.wx, p.homeWx, 2.2, dt);
          p.y = approach(p.y, p.homeY, 2.4, dt);
          p.dir = p.homeWx >= p.wx ? 1 : -1;
          if (p.timer <= 0 || (Math.abs(p.wx - p.homeWx) < 1.5 && Math.abs(p.y - p.homeY) < 1.5)) {
            p.wx = p.homeWx;
            p.y = p.homeY;
            p.mode = 'idle';
            p.timer = rand(2, 5);
          }
        }
      } else if (p.mode === 'shuffle') {
        p.timer -= dt;
        p.wx = clamp(p.wx + p.vx * dt, p.homeWx - 18, p.homeWx + 18);
        if (p.timer <= 0) {
          p.mode = 'idle';
          p.vx = 0;
          p.timer = rand(1.5, 4);
        }
      } else {
        p.peckTimer -= dt;
        if (p.peckTimer <= -1.2) p.peckTimer = rand(1.4, 4.2);
        p.timer -= dt;
        if (p.timer <= 0) {
          p.wx = approach(p.wx, p.homeWx, 3, dt);
          p.dir = Math.random() < 0.5 ? 1 : -1;
          p.timer = rand(2.0, 4.5);
        }
      }
    }
  }

  private updateBees(
    dt: number,
    time: number,
    camX: number,
    pxShift: number,
    designW: number,
    day: number,
    pointerDesign: { x: number; y: number } | null,
  ): void {
    if (day <= 0.25) return;
    const halfW = designW * 0.5;
    const foreCam = camX + pxShift;
    for (const b of this.bees) {
      const targetX = b.anchorWx + Math.sin(time * 1.1 + b.phase) * 14;
      const targetY = b.anchorY + Math.cos(time * 1.7 + b.phase * 1.3) * 6;
      b.vx += (targetX - b.wx) * 6 * dt;
      b.vy += (targetY - b.y) * 6 * dt;

      if (pointerDesign) {
        const sx = wrapDelta(b.wx, foreCam, WORLD_W) + halfW;
        const dist = Math.hypot(pointerDesign.x - sx, pointerDesign.y - b.y);
        if (dist < 24) {
          b.vx += Math.sign(sx - pointerDesign.x || 1) * 40 * dt;
          b.vy += Math.sign(b.y - pointerDesign.y || -1) * 35 * dt;
        }
      }

      b.vx *= Math.exp(-3.5 * dt);
      b.vy *= Math.exp(-3.5 * dt);
      b.wx += b.vx * dt;
      b.y += b.vy * dt;
    }
  }

  private drawBarPeople(
    L: CanvasRenderingContext2D,
    time: number,
    foreCam: number,
    halfW: number,
    designW: number,
    unit: number,
    sprites: CastSprites,
  ): void {
    const barCenter = SCENE_SPACING * 2;
    const barSx = wrapDelta(barCenter, foreCam, WORLD_W) + halfW;
    if (barSx < -250 || barSx > designW + 250) return;

    const bt = Math.sin(time * 0.9) > 0.35 ? sprites.bartender.active : sprites.bartender.idle;
    this.drawSpriteStand(L, bt, barSx - 178, 183, unit, false);

    const p0 = sprites.patrons[0];
    if (p0) {
      const sp = Math.sin(time * 0.8 + 1) > 0.4 ? p0.active : p0.idle;
      this.drawSpriteStand(L, sp, barSx - 122, 208, unit, false);
    }

    const p1 = sprites.patrons[1];
    const p2 = sprites.patrons[2];
    if (p1) {
      const sp = Math.sin(time * 1.3) > 0.2 ? p1.active : p1.idle;
      this.drawSpriteStand(L, sp, barSx + 114, 210, unit, true);
    }
    if (p2) {
      const sp = Math.sin(time * 1.3 + 2.5) > 0.2 ? p2.active : p2.idle;
      this.drawSpriteStand(L, sp, barSx + 150, 210, unit, false);
    }
  }

  private drawSpriteStand(
    ctx: CanvasRenderingContext2D,
    sp: SpriteBox,
    cx: number,
    feetY: number,
    unit: number,
    mirror: boolean,
  ): void {
    const x = Math.round((cx - sp.w * 0.5) * unit);
    const y = Math.round((feetY - sp.h) * unit);
    const w = Math.round(sp.w * unit);
    const h = Math.round(sp.h * unit);
    if (!mirror) {
      ctx.drawImage(sp.canvas, x, y, w, h);
    } else {
      ctx.save();
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(sp.canvas, 0, 0, w, h);
      ctx.restore();
    }
  }
}
