import { lerp, rand } from '../../../world/math';
import type { CastSprites, SpriteBox } from './cast-sprites';
import { SCENE_SPACING, WORLD_W, deckTopAt, wrapCoord, wrapDelta } from './scenes';
import type { ScreenRect } from './skyline';

type CatSceneMood = 'vent' | 'overlook' | 'rail' | 'watch' | 'sleep';

/**
 * Controls the recurring grey cat across all five scenes:
 * sitting/grooming on the vent, overlooking the skyline, walking the bar rail,
 * watching pigeons on the billboard roof, sleeping in the garden, and trotting
 * along the parapet during scene glides.
 */
export class CatController {
  private sceneIndex = 0;
  private travelling = false;
  private wx = 132;
  private y = 188;
  private dir: 1 | -1 = -1;
  private railX = SCENE_SPACING * 2 - 165;
  private railDir: 1 | -1 = 1;
  private railPause = 0;
  private stretchTimer = 0;
  private purrTimer = 0;
  private blinkTimer = 2.5;
  private groomTimer = 6;
  private screenRect: ScreenRect | null = null;

  update(dt: number, activeScene: number, nextScene: number, blend: number): void {
    this.sceneIndex = activeScene;
    this.stretchTimer = Math.max(0, this.stretchTimer - dt);
    this.purrTimer = Math.max(0, this.purrTimer - dt);

    this.blinkTimer -= dt;
    if (this.blinkTimer <= -0.18) this.blinkTimer = rand(2.4, 5.2);
    this.groomTimer -= dt;
    if (this.groomTimer <= -1.6) this.groomTimer = rand(5, 11);

    if (blend > 0 && blend < 1) {
      this.travelling = true;
      const from = this.perchForScene(activeScene);
      const to = this.perchForScene(nextScene);
      let span = to.wx - from.wx;
      if (span < 0) span += WORLD_W;
      this.wx = wrapCoord(from.wx + span * blend, WORLD_W);
      const ledgeY = deckTopAt(this.wx) - 2;
      const arc =
        Math.sin(Math.PI * Math.min(1, blend / 0.14)) * 4 +
        Math.sin(Math.PI * Math.max(0, (blend - 0.86) / 0.14)) * 4;
      const baseY =
        blend < 0.14
          ? lerp(from.y, ledgeY, blend / 0.14)
          : blend > 0.86
            ? lerp(ledgeY, to.y, (blend - 0.86) / 0.14)
            : ledgeY;
      this.y = baseY - arc;
      this.dir = 1;
      return;
    }

    this.travelling = false;
    if (this.moodForScene(activeScene) === 'rail') {
      const minX = SCENE_SPACING * 2 - 204;
      const maxX = SCENE_SPACING * 2 - 120;
      if (this.stretchTimer <= 0) {
        if (this.railPause > 0) {
          this.railPause -= dt;
        } else {
          this.railX += this.railDir * 14 * dt;
          if (this.railX >= maxX) {
            this.railX = maxX;
            this.railDir = -1;
            this.railPause = rand(1.4, 2.8);
          } else if (this.railX <= minX) {
            this.railX = minX;
            this.railDir = 1;
            this.railPause = rand(1.4, 2.8);
          }
        }
      }
      this.wx = this.railX;
      this.y = 182;
      this.dir = this.railDir;
    } else {
      const perch = this.perchForScene(activeScene);
      this.wx = perch.wx;
      this.y = perch.y;
      this.dir = perch.dir;
    }
  }

  drawPreTint(
    L: CanvasRenderingContext2D,
    time: number,
    foreCam: number,
    halfW: number,
    designW: number,
    unit: number,
    sprites: CastSprites,
  ): void {
    const sx = wrapDelta(this.wx, foreCam, WORLD_W) + halfW;
    if (sx < -24 || sx > designW + 24) {
      this.screenRect = null;
      return;
    }
    const set = this.dir >= 0 ? sprites.catRight : sprites.catLeft;
    const mood = this.moodForScene(this.sceneIndex);
    let sp: SpriteBox = set.sit;
    if (this.stretchTimer > 0) {
      sp = set.stretch;
    } else if (this.travelling) {
      sp = Math.floor(time * 7) % 2 === 0 ? set.walkA : set.walkB;
    } else if (mood === 'sleep') {
      sp = Math.floor(time * 1.1) % 2 === 0 ? set.sleepA : set.sleepB;
    } else if (mood === 'watch') {
      sp = set.watch;
    } else if (mood === 'rail') {
      sp =
        this.railPause > 0
          ? this.blinkTimer < 0
            ? set.blink
            : set.sit
          : Math.floor(time * 5) % 2 === 0
            ? set.walkA
            : set.walkB;
    } else if (this.groomTimer < 0) {
      sp = Math.floor(time * 4) % 2 === 0 ? set.groomA : set.groomB;
    } else if (this.blinkTimer < 0) {
      sp = set.blink;
    }

    const x = Math.round((sx - sp.w * 0.5) * unit);
    const y = Math.round((this.y - sp.h) * unit);
    L.drawImage(sp.canvas, x, y, Math.round(sp.w * unit), Math.round(sp.h * unit));
    this.screenRect = { x: sx - sp.w * 0.5 - 4, y: this.y - sp.h - 4, w: sp.w + 8, h: sp.h + 8 };
  }

  drawPostTint(ctx: CanvasRenderingContext2D, unit: number): void {
    if (this.purrTimer <= 0 || !this.screenRect) return;
    const lift = (1.4 - this.purrTimer) * 7;
    const alpha = Math.min(1, this.purrTimer / 0.5);
    const hx = Math.round((this.screenRect.x + this.screenRect.w * 0.5) * unit);
    const hy = Math.round((this.screenRect.y - 3 - lift) * unit);
    const u = Math.max(1, Math.round(unit));
    ctx.fillStyle = `rgba(244, 124, 142, ${alpha.toFixed(2)})`;
    ctx.fillRect(hx - u * 2, hy, u, u);
    ctx.fillRect(hx, hy, u, u);
    ctx.fillRect(hx - u * 2, hy + u, u * 3, u);
    ctx.fillRect(hx - u, hy + u * 2, u, u);
  }

  tryStretch(dx: number, dy: number): boolean {
    const r = this.screenRect;
    if (!r || dx < r.x || dx > r.x + r.w || dy < r.y || dy > r.y + r.h) return false;
    this.stretchTimer = 1.8;
    this.purrTimer = 1.4;
    return true;
  }

  private moodForScene(sceneIndex: number): CatSceneMood {
    if (sceneIndex === 0) return 'vent';
    if (sceneIndex === 1) return 'overlook';
    if (sceneIndex === 2) return 'rail';
    if (sceneIndex === 3) return 'watch';
    return 'sleep';
  }

  private perchForScene(sceneIndex: number): { wx: number; y: number; dir: 1 | -1 } {
    if (sceneIndex === 0) return { wx: 132, y: 188, dir: -1 };
    if (sceneIndex === 1) return { wx: SCENE_SPACING - 152, y: 188, dir: 1 };
    if (sceneIndex === 2) return { wx: this.railX, y: 182, dir: this.railDir };
    if (sceneIndex === 3) return { wx: SCENE_SPACING * 3 - 82, y: 192, dir: 1 };
    return { wx: SCENE_SPACING * 4 + 86, y: 192, dir: 1 };
  }
}
