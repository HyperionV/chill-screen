import { drawText } from '../../../render/pixel-font';
import { hash } from '../../journeys/noise';
import { breeze } from '../../wind';
import { DESIGN_HEIGHT, HOLLOW_SCENE, HOLLOW_Y, hollowX, STONE_ROWS, stoneX, STREAM_SCENE, type Pine } from './scenes';
import type { CastSprites } from './sprites';
import type { Creatures } from './creatures';

const PARTICLES = 22;
const FALL_SECONDS = 3.5;
const SPLASH_SECONDS = 1.2;
const CLIMB_SECONDS = 3;
const CALL_SECONDS = 3;
interface Falling { x: number; y: number; vx: number; vy: number; age: number; cone: boolean; scene: number }

export class Interactions {
  private readonly particles: Falling[] = Array.from({ length: PARTICLES }, () => ({ x: 0, y: 0, vx: 0, vy: 0, age: FALL_SECONDS, cone: false, scene: 0 }));
  private splashX = 0;
  private splashY = 0;
  private splashAge = SPLASH_SECONDS;
  private callAge = CALL_SECONDS;
  private climbAge = CLIMB_SECONDS;
  private climbX = 0;
  private climbBase = 0;
  private climbHeight = 0;
  private climbScene = 0;

  reset(): void {
    for (const p of this.particles) p.age = FALL_SECONDS;
    this.splashAge = SPLASH_SECONDS; this.callAge = CALL_SECONDS; this.climbAge = CLIMB_SECONDS;
  }

  press(x: number, y: number, width: number, scene: number, trees: readonly Pine[], cast: Creatures): void {
    if (scene === HOLLOW_SCENE && Math.abs(x - hollowX(width)) < 23 && Math.abs(y - HOLLOW_Y + 12) < 30) {
      this.callAge = 0; cast.react(scene, 'owl'); return;
    }
    if (scene === STREAM_SCENE) {
      for (const row of STONE_ROWS) {
        const sx = stoneX(width, row);
        if (Math.abs(x - sx) < 15 && Math.abs(y - row + 2) < 11) {
          this.splashX = sx; this.splashY = row; this.splashAge = 0;
          cast.react(scene, 'frog'); return;
        }
      }
    }
    for (const p of trees) {
      const tx = p.x;
      const top = p.base - p.height;
      const t = (y - top) / p.height;
      const half = t < 0.83 ? p.width * 0.5 * t / 0.83 : 5;
      if (t < 0 || t > 1 || Math.abs(x - tx) > half + 3) continue;
      this.climbX = tx; this.climbBase = p.base; this.climbHeight = p.height * 0.7;
      this.climbAge = 0; this.climbScene = scene;
      for (let i = 0; i < PARTICLES; i++) {
        const f = this.particles[i];
        f.x = tx + (hash(i * 11) - 0.5) * p.width * 0.65;
        f.y = Math.max(top + 12, y - 10 - hash(i * 7) * 24);
        f.vx = (hash(i * 19) - 0.5) * 16;
        f.vy = 4 + hash(i * 31) * 8; f.age = 0; f.cone = i % 7 === 0; f.scene = scene;
      }
      return;
    }
  }

  update(dt: number, time: number): void {
    this.splashAge += dt; this.callAge += dt; this.climbAge += dt;
    for (const p of this.particles) {
      if (p.age >= FALL_SECONDS) continue;
      const drift = p.cone ? 0 : breeze(time, p.x) * 3;
      p.age += dt; p.x += (p.vx + drift) * dt; p.y += p.vy * dt;
      p.vy += (p.cone ? 24 : 5) * dt;
    }
  }

  draw(c: CanvasRenderingContext2D, scene: number, width: number, sprites: CastSprites): void {
    for (const p of this.particles) {
      if (p.scene !== scene || p.age >= FALL_SECONDS || p.y > DESIGN_HEIGHT) continue;
      c.save(); c.globalAlpha = Math.min(1, FALL_SECONDS - p.age);
      c.fillStyle = p.cone ? '#856342' : '#b2a164';
      c.fillRect(Math.round(p.x), Math.round(p.y), p.cone ? 3 : 1, p.cone ? 4 : 3);
      if (p.cone) { c.fillStyle = '#c19c62'; c.fillRect(Math.round(p.x), Math.round(p.y) + 1, 1, 1); }
      c.restore();
    }
    if (scene === this.climbScene && this.climbAge < CLIMB_SECONDS) {
      const progress = this.climbAge / CLIMB_SECONDS;
      const sprite = sprites.squirrel[Math.floor(progress * 8) % 2 ? 'walk' : 'alert'];
      const x = Math.round(this.climbX - 8 + Math.sin(progress * 9) * 3);
      const y = Math.round(this.climbBase - progress * this.climbHeight);
      c.save(); c.globalAlpha = Math.min(1, (1 - progress) * 5);
      c.drawImage(sprite, x - 18, y - 34); c.restore();
    }
    if (scene === STREAM_SCENE && this.splashAge < SPLASH_SECONDS) {
      const t = this.splashAge / SPLASH_SECONDS;
      c.save(); c.globalAlpha = 1 - t; c.fillStyle = '#c6d9c5';
      for (let i = 0; i < 9; i++) {
        const side = (i - 4) / 4;
        c.fillRect(Math.round(this.splashX + side * (3 + t * 20)), Math.round(this.splashY - Math.sin(t * Math.PI) * (16 - Math.abs(side) * 7)), 1, 2);
      }
      const span = Math.round(5 + t * 24);
      c.fillRect(Math.round(this.splashX - span), this.splashY + 3, span * 2, 1);
      c.restore();
    }
    if (scene === HOLLOW_SCENE && this.callAge < CALL_SECONDS) {
      c.save(); c.globalAlpha = Math.min(1, (CALL_SECONDS - this.callAge) * 2);
      const x = Math.round(hollowX(width) - 38);
      const y = HOLLOW_Y - 38 - Math.round(this.callAge * 2);
      c.fillStyle = '#344b43'; c.fillRect(x - 3, y - 3, 19, 11);
      drawText(c, 'HOO', x, y, '#e0d6a8'); c.restore();
    }
  }
}
