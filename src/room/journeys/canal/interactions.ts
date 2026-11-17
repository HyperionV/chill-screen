import { clamp, rand } from '../../../world/math';
import { pixmap } from '../pixmap';
import { LOCK, wrapDelta } from './chapters';
import type { CanalCast, Crumb, WaterBounds } from './cast';
import type { SpriteBox } from './sprites';

type LineState = 'idle' | 'cast' | 'bite' | 'reel';

interface FishingLine {
  state: LineState;
  x: number;
  y: number;
  timer: number;
  ringPulse: number;
  fishSpecies: number;
  reelDuration: number;
}

export interface PressResult {
  lockBoostSeconds: number;
}

const MAX_CRUMBS = 28;
const BITE_WINDOW = 3.2;
const REEL_DURATION = 1.15;

function box(canvas: HTMLCanvasElement): SpriteBox {
  return { canvas, w: canvas.width, h: canvas.height };
}

function buildBellBracket(): SpriteBox {
  return box(
    pixmap(
      [
        'kkkkkkkkkkkk',
        'kkkkkkkkkkkk',
        'kkk.........',
        'kk..........',
        'kk..........',
        'k...........',
        'k...........',
      ],
      { k: '#3a342e' },
    ),
  );
}

function buildBellFrames(): [SpriteBox, SpriteBox, SpriteBox] {
  const pal = {
    b: '#b88628',
    y: '#f2d35e',
    w: '#fff2a6',
    o: '#875c18',
    k: '#4a3614',
    r: '#a4483a',
  };
  const center = box(
    pixmap(
      [
        '.....bbbb.....',
        '....byyyyb....',
        '...bywyyyob...',
        '...bywyyyob...',
        '..bywwyyyyob..',
        '..bywyyyyoob..',
        '.byywyyyyyoob.',
        '.byyyyyyyyyob.',
        'byyyyyyyyyooob',
        'bbbbbbbbbbbbbb',
        '......kk......',
        '......kk......',
        '......rr......',
        '......rr......',
      ],
      pal,
    ),
  );
  const left = box(
    pixmap(
      [
        '.....bbbb.....',
        '....byyyyb....',
        '..bywyyyyob...',
        '.bywyyyyyoob..',
        '.bywwyyyyoob..',
        'byywyyyyyyoob.',
        'byyyyyyyyyoob.',
        'bbbbbbbbbbbbb.',
        '..........kk..',
        '...........kk.',
        '...........rr.',
        '............rr',
      ],
      pal,
    ),
  );
  const right = box(
    pixmap(
      [
        '.....bbbb.....',
        '....byyyyb....',
        '...bywyyyyob..',
        '..bywyyyyyoob.',
        '..bywwyyyyoob.',
        '.byywyyyyyyoob',
        '.byyyyyyyyyoob',
        '.bbbbbbbbbbbbb',
        '..kk..........',
        '.kk...........',
        '.rr...........',
        'rr............',
      ],
      pal,
    ),
  );
  return [center, left, right];
}

function buildFishSprites(): SpriteBox[] {
  const shapes = [
    [
      '....dddddddd......',
      '..gggggggggggd..dd',
      '.gwwggggggggggdddd',
      'ggwwgggggggggggdd.',
      '.dddddddddddd.....',
    ],
    [
      '....ddddddd......',
      '..oykoykoykod..dd',
      '.oyykoyykoyyooddd',
      'oyyykoyykoyyood..',
      '.dddddddddd......',
    ],
    [
      '....dddddddd.....',
      '..ssrssrssrsd..dd',
      '.swwswswwswssdddd',
      'sswwswswwswssdd..',
      '.ddddddddddd.....',
    ],
    [
      '....ddddddd......',
      '..bbbbbbbbbd...dd',
      '.bbybbbbbbbbddddd',
      'bbbybbbbbbbbddd..',
      '.dddddddddd......',
    ],
    [
      '....dddddddd.....',
      '..ooooooooood..dd',
      '.ooyooooooooowddd',
      'oooyooooooooowd..',
      '.ddddddddddd.....',
    ],
    [
      '....dddddddd.....',
      '..yyyyyyyyyyo..oo',
      '.ywwyyyyyyyyyoooo',
      'yywwyyyyyyyyyoo..',
      '.ddddddddddd.....',
    ],
    [
      '....dddddddd.....',
      '..bbbbbbbbbbd..dd',
      '.swwsssssssssdddd',
      'sswwsssssssssdd..',
      '.ddddddddddd.....',
    ],
  ];
  const palettes: Record<string, string>[] = [
    { d: '#2b4f34', g: '#5a944e', w: '#e0ecd0' },
    { d: '#58441c', o: '#cc963c', y: '#ead060', k: '#342818' },
    { d: '#485c5a', s: '#b4c0ba', r: '#de6854', w: '#eef0e8' },
    { d: '#564026', b: '#ad8048', y: '#dcbe78' },
    { d: '#2d3a22', o: '#5e7438', y: '#a6b058', w: '#d0c682' },
    { d: '#86541c', y: '#e6a238', o: '#b67424', w: '#f8d884' },
    { d: '#34546e', b: '#6c96b6', s: '#d6e4ec', w: '#f2f8fa' },
  ];
  return shapes.map((rows, i) => box(pixmap(rows, palettes[i])));
}

/** Handles clicking to cast a fishing line, feed the ducks, ring the ship's bell, and open lock gates. */
export class CanalInteractions {
  private readonly bellBracket = buildBellBracket();
  private readonly bellFrames = buildBellFrames();
  private readonly fishSprites = buildFishSprites();

  readonly crumbs: Crumb[] = [];
  private bellTimer = -1;
  private bellPulse = 0;
  gateNudgeTimer = 0;

  private readonly line: FishingLine = {
    state: 'idle',
    x: 240,
    y: 210,
    timer: 0,
    ringPulse: 0,
    fishSpecies: 0,
    reelDuration: REEL_DURATION,
  };

  /** Processes a glass click at stage pixels (x, y). */
  press(
    x: number,
    y: number,
    w: number,
    unit: number,
    chapter: number,
    chapterT: number,
    scroll: number,
    bounds: WaterBounds,
    cast: CanalCast,
  ): PressResult {
    // 1. Ship's bell at top-right
    const bellX = w - 26 * unit;
    const bellY = 18 * unit;
    if (Math.hypot(x - bellX, y - bellY) <= 26 * unit) {
      this.bellTimer = 0;
      this.bellPulse = 1.3;
      cast.onBellRing(scroll, bounds);
      cast.addRing(w / unit - 26, bounds.shoreY + 14, 14, 'rgba(245,236,196,0.65)');
      return { lockBoostSeconds: 0 };
    }

    // 2. Open the lock gates in Chapter 2 while waiting
    if (chapter === 1 && chapterT >= LOCK.fillStart && chapterT < LOCK.gateOpenStart + 0.14) {
      const gateX = wrapDelta(LOCK.exitGateX, scroll) * unit;
      if (Math.abs(x - gateX) <= 34 * unit && y >= (bounds.shoreY - 46) * unit && y <= (bounds.shoreY + 20) * unit) {
        this.gateNudgeTimer = 0.55;
        cast.addRing(gateX / unit - 2, bounds.shoreY + 4, 13);
        return { lockBoostSeconds: 5 };
      }
    }

    // 3. Water interactions: reel in bite, feed ducks, cancel cast, or cast fishing line
    const waterTop = bounds.shoreY * unit;
    const waterBot = bounds.deckY * unit;
    if (y < waterTop || y > waterBot) return { lockBoostSeconds: 0 };

    const dx = clamp(x / unit, 22, bounds.designW - 22);
    const dy = clamp(y / unit, bounds.shoreY + 5, bounds.deckY - 7);

    if (this.line.state === 'reel') {
      return { lockBoostSeconds: 0 };
    }

    if (this.line.state === 'bite') {
      this.line.state = 'reel';
      this.line.timer = REEL_DURATION;
      this.line.fishSpecies = chapter % this.fishSprites.length;
      cast.addRing(this.line.x, this.line.y, 16, 'rgba(244,250,255,0.85)', true);
      return { lockBoostSeconds: 0 };
    }

    if (cast.isNearDucks(x, y, unit, 48 * unit)) {
      for (let i = 0; i < 6; i++) {
        if (this.crumbs.length >= MAX_CRUMBS) this.crumbs.shift();
        this.crumbs.push({
          x: clamp(dx + rand(-12, 12), 18, bounds.designW - 18),
          y: clamp(dy + rand(-6, 6), bounds.shoreY + 6, bounds.deckY - 8),
          age: 0,
          eaten: false,
        });
      }
      cast.addRing(dx, dy, 12, 'rgba(255,246,214,0.75)');
      return { lockBoostSeconds: 0 };
    }

    if (this.line.state === 'cast') {
      this.line.state = 'idle';
      cast.addRing(this.line.x, this.line.y, 9);
      return { lockBoostSeconds: 0 };
    }

    this.line.state = 'cast';
    this.line.x = dx;
    this.line.y = dy;
    this.line.timer = rand(3, 8);
    this.line.ringPulse = 0.2;
    cast.addRing(dx, dy, 13, 'rgba(235,248,255,0.78)');

    return { lockBoostSeconds: 0 };
  }

  update(dt: number, bounds: WaterBounds, cast: CanalCast): void {
    if (this.bellTimer >= 0) {
      this.bellTimer += dt;
      if (this.bellTimer > 2.4) this.bellTimer = -1;
    }
    if (this.bellPulse > 0) this.bellPulse = Math.max(0, this.bellPulse - dt);
    if (this.gateNudgeTimer > 0) this.gateNudgeTimer = Math.max(0, this.gateNudgeTimer - dt);

    for (let i = this.crumbs.length - 1; i >= 0; i--) {
      this.crumbs[i].age += dt;
      if (this.crumbs[i].eaten || this.crumbs[i].age > 18) this.crumbs.splice(i, 1);
    }

    if (this.line.state === 'cast') {
      this.line.y = clamp(this.line.y, bounds.shoreY + 5, bounds.deckY - 7);
      this.line.timer -= dt;
      this.line.ringPulse -= dt;
      if (this.line.ringPulse <= 0) {
        this.line.ringPulse = 1.6;
        cast.addRing(this.line.x, this.line.y, 10, 'rgba(225,242,250,0.55)');
      }
      if (this.line.timer <= 0) {
        this.line.state = 'bite';
        this.line.timer = BITE_WINDOW;
        this.line.ringPulse = 0;
        cast.addRing(this.line.x, this.line.y, 14, 'rgba(245,252,255,0.88)', true);
      }
    } else if (this.line.state === 'bite') {
      this.line.y = clamp(this.line.y, bounds.shoreY + 5, bounds.deckY - 7);
      this.line.timer -= dt;
      this.line.ringPulse -= dt;
      if (this.line.ringPulse <= 0) {
        this.line.ringPulse = 0.38;
        cast.addRing(this.line.x, this.line.y, 13, 'rgba(245,252,255,0.85)');
      }
      if (this.line.timer <= 0) {
        this.line.state = 'idle';
        cast.addRing(this.line.x, this.line.y, 8);
      }
    } else if (this.line.state === 'reel') {
      this.line.timer -= dt;
      if (this.line.timer <= 0) {
        this.line.state = 'idle';
        cast.addRing(this.line.x, this.line.y, 12);
      }
    }
  }

  /** Draws bread crumbs, fishing rod/line, bobber, and leaping caught fish on the water. */
  drawWater(ctx: CanvasRenderingContext2D, time: number, bounds: WaterBounds, unit: number): void {
    ctx.imageSmoothingEnabled = false;
    const dot = Math.max(1, Math.round(unit));

    for (const c of this.crumbs) {
      if (c.eaten) continue;
      const cx = Math.round(c.x * unit);
      const cy = Math.round((c.y + Math.sin(time * 2.5 + c.x) * 0.45) * unit);
      ctx.fillStyle = '#f2d68c';
      ctx.fillRect(cx - dot, cy, dot * 3, dot);
      ctx.fillStyle = '#b4823c';
      ctx.fillRect(cx - dot, cy + dot, dot * 2, dot);
    }

    if (this.line.state === 'idle') return;

    const gunwaleX = Math.round((this.line.x - 26) * unit);
    const gunwaleY = Math.round(bounds.deckY * unit);
    const tipX = Math.round((this.line.x - 14) * unit);
    const tipY = Math.round((bounds.deckY - 12) * unit);

    // Slim wooden rod extending over the gunwale
    ctx.fillStyle = '#6c4928';
    for (let i = 0; i <= 10; i++) {
      const k = i / 10;
      ctx.fillRect(
        Math.round(gunwaleX + (tipX - gunwaleX) * k),
        Math.round(gunwaleY + (tipY - gunwaleY) * k),
        dot,
        dot,
      );
    }

    const bx = Math.round(this.line.x * unit);
    const dip =
      this.line.state === 'bite'
        ? Math.sin(time * 14) * 2.8 * unit + 2.2 * unit
        : Math.sin(time * 2.6) * 0.7 * unit;
    const by = Math.round(this.line.y * unit + dip);

    // Crisp visible fishing line from rod tip to bobber / leaping fish
    ctx.fillStyle = 'rgba(235,244,248,0.72)';
    const targetY =
      this.line.state === 'reel'
        ? by - Math.round(Math.sin(Math.PI * (1 - this.line.timer / this.line.reelDuration)) * 34 * unit)
        : by;
    const steps = 18;
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      const lx = Math.round(tipX + (bx - tipX) * k);
      const sag = this.line.state === 'bite' ? 0 : Math.sin(Math.PI * k) * 3.5 * unit;
      const ly = Math.round(tipY + (targetY - tipY) * k + sag);
      ctx.fillRect(lx, ly, dot, dot);
    }

    if (this.line.state === 'cast' || this.line.state === 'bite') {
      // Bold 4x5 design-px red-and-white float bobber
      ctx.fillStyle = '#242a2e';
      ctx.fillRect(bx, by - dot * 4, dot, dot);
      ctx.fillStyle = '#f2f0e6';
      ctx.fillRect(bx - dot * 2, by - dot * 3, dot * 4, dot * 2);
      ctx.fillStyle = '#de4438';
      ctx.fillRect(bx - dot * 2, by - dot, dot * 4, dot * 2);

      if (this.line.state === 'bite') {
        const alertY = by - dot * 9 - Math.round(Math.abs(Math.sin(time * 8)) * 2 * unit);
        ctx.fillStyle = '#fff3b0';
        ctx.fillRect(bx - Math.round(dot * 0.5), alertY, dot, dot * 3);
        ctx.fillRect(bx - Math.round(dot * 0.5), alertY + dot * 4, dot, dot);
      }
    } else if (this.line.state === 'reel') {
      const p = 1 - this.line.timer / this.line.reelDuration;
      const arcY = Math.sin(Math.PI * p) * 34 * unit;
      const arcX = bx - p * 12 * unit;
      const fish = this.fishSprites[this.line.fishSpecies];
      const fw = Math.round(fish.w * unit);
      const fh = Math.round(fish.h * unit);
      ctx.drawImage(fish.canvas, 0, 0, fish.w, fish.h, Math.round(arcX - fw / 2), Math.round(by - arcY - fh / 2), fw, fh);
      // Trailing water splash droplets below the leaping fish
      ctx.fillStyle = 'rgba(232,248,255,0.85)';
      ctx.fillRect(Math.round(arcX + 2 * unit), Math.round(by - arcY + 4 * unit), dot, dot * 2);
      ctx.fillRect(Math.round(arcX - 3 * unit), Math.round(by - arcY * 0.6), dot, dot);
    }
  }

  /** Draws the hanging brass ship's bell in the top-right corner of the window. */
  drawBell(ctx: CanvasRenderingContext2D, w: number, unit: number): void {
    ctx.imageSmoothingEnabled = false;
    const anchorX = Math.round(w - 26 * unit);
    const anchorY = Math.round(10 * unit);

    const bw = Math.round(this.bellBracket.w * unit);
    const bh = Math.round(this.bellBracket.h * unit);
    ctx.drawImage(this.bellBracket.canvas, 0, 0, this.bellBracket.w, this.bellBracket.h, Math.round(w - bw - 14 * unit), anchorY, bw, bh);

    const swing = this.bellTimer >= 0 ? Math.sin(this.bellTimer * 12) * Math.exp(-this.bellTimer * 1.8) : 0;
    const bellSprite = swing > 0.18 ? this.bellFrames[2] : swing < -0.18 ? this.bellFrames[1] : this.bellFrames[0];
    const bellW = Math.round(bellSprite.w * unit);
    const bellH = Math.round(bellSprite.h * unit);
    const offsetX = Math.round(swing * 3.5 * unit);
    ctx.drawImage(
      bellSprite.canvas,
      0,
      0,
      bellSprite.w,
      bellSprite.h,
      Math.round(anchorX - bellW / 2) + offsetX,
      anchorY + Math.round(3 * unit),
      bellW,
      bellH,
    );

    if (this.bellPulse > 0) {
      const k = 1 - this.bellPulse / 1.3;
      const r = Math.round((10 + k * 14) * unit);
      const dot = Math.max(1, Math.round(unit));
      ctx.fillStyle = `rgba(255,240,180,${((1 - k) * 0.72).toFixed(3)})`;
      ctx.fillRect(anchorX - r, anchorY + Math.round(6 * unit), dot, Math.round(5 * unit));
      ctx.fillRect(anchorX + r, anchorY + Math.round(6 * unit), dot, Math.round(5 * unit));
      ctx.fillRect(anchorX - r - dot * 2, anchorY + Math.round(7 * unit), dot, Math.round(3 * unit));
      ctx.fillRect(anchorX + r + dot * 2, anchorY + Math.round(7 * unit), dot, Math.round(3 * unit));
    }
  }
}
