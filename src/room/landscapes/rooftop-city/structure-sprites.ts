import { drawText, plainText } from '../../../render/pixel-font';
import { memoryCanvas } from '../../../render/pixel-stage';
import { pixmap } from '../../journeys/pixmap';
import type { SpriteBox } from './cast-sprites';
import { ditherThreshold } from './light-halos';

export const GREENHOUSE_LAMP_OFFSETS = [-22, 22];
export const GREENHOUSE_LAMP_HEIGHT = 45;

function box(canvas: HTMLCanvasElement): SpriteBox {
  return { canvas, w: canvas.width, h: canvas.height };
}

/** Builds the Neon Rooftop Bar pergola, neon sign, and bistro table sprites. */
export function buildBarAndNeon(): {
  barPergola: SpriteBox;
  neonBase: SpriteBox;
  neonGlow: SpriteBox;
  barTable: SpriteBox;
  barTableGlow: SpriteBox;
} {
  const bw = 134;
  const bh = 90;
  const bar = memoryCanvas(bw, bh);
  {
    const c = bar.ctx;
    c.fillStyle = '#462c20';
    c.fillRect(6, 10, 5, 80);
    c.fillRect(122, 10, 5, 80);
    c.fillStyle = '#684430';
    c.fillRect(7, 10, 2, 80);
    c.fillRect(123, 10, 2, 80);

    c.fillStyle = '#38241a';
    c.fillRect(2, 4, 130, 8);
    for (let x = 4; x < 130; x += 6) {
      c.fillStyle = ((x - 4) / 6) % 2 === 0 ? '#9e3e38' : '#e6d8c0';
      c.fillRect(x, 5, 6, 7);
    }
    c.fillStyle = '#281812';
    c.fillRect(2, 12, 130, 2);

    c.fillStyle = '#3a261e';
    c.fillRect(14, 34, 96, 36);
    c.fillStyle = '#583c2c';
    c.fillRect(18, 42, 88, 2);
    c.fillRect(18, 54, 88, 2);

    const bottleColors = ['#6ab07c', '#d88848', '#8cb4d4', '#d86262', '#e4c464'];
    for (let i = 0; i < 11; i++) {
      const bx = 22 + i * 7;
      c.fillStyle = bottleColors[i % bottleColors.length] ?? '#6ab07c';
      c.fillRect(bx, 37, 3, 5);
      c.fillRect(bx + 1, 35, 1, 2);
      if (i % 2 === 0) {
        c.fillStyle = '#cce2ea';
        c.fillRect(bx, 50, 2, 4);
      }
    }

    c.fillStyle = '#262a34';
    c.fillRect(112, 44, 10, 14);
    c.fillStyle = '#404856';
    c.fillRect(114, 46, 6, 5);
    c.fillRect(114, 52, 6, 4);

    // Bar counter rail (cat walks along y = 66)
    c.fillStyle = '#8b5a3c';
    c.fillRect(8, 66, 118, 4);
    c.fillStyle = '#b47c54';
    c.fillRect(8, 66, 118, 1);
    c.fillStyle = '#4e3222';
    c.fillRect(12, 70, 110, 20);
    c.fillStyle = '#3b2418';
    for (let x = 16; x < 120; x += 6) c.fillRect(x, 70, 1, 20);
  }

  const nw = 56;
  const nh = 20;
  const nBase = memoryCanvas(nw, nh);
  const nGlow = memoryCanvas(nw, nh);
  {
    const b = nBase.ctx;
    const g = nGlow.ctx;
    b.fillStyle = '#1c1e2a';
    b.fillRect(0, 0, nw, nh);
    b.fillStyle = '#383d52';
    b.fillRect(1, 1, nw - 2, 1);
    b.fillRect(1, nh - 2, nw - 2, 1);

    drawText(b, plainText('MOON BAR'), 6, 7, '#4c5870', 1);
    b.fillStyle = '#5c4252';
    b.fillRect(42, 5, 7, 1);
    b.fillRect(43, 6, 5, 2);
    b.fillRect(44, 8, 3, 2);
    b.fillRect(45, 10, 1, 4);
    b.fillRect(43, 14, 5, 1);

    // Dithered neon halo wash behind lettering instead of a flat tinted box
    g.fillStyle = 'rgba(110, 238, 248, 0.24)';
    for (let y = 2; y < nh - 2; y++) {
      for (let x = 2; x < nw - 2; x++) {
        if (((x + y) & 1) === 0 || (x >= 5 && x <= nw - 6 && y >= 5 && y <= nh - 6)) {
          g.fillRect(x, y, 1, 1);
        }
      }
    }
    drawText(g, plainText('MOON BAR'), 6, 7, '#7cf4ff', 1);
    g.fillStyle = '#ff7eb6';
    g.fillRect(42, 5, 7, 1);
    g.fillRect(43, 6, 5, 2);
    g.fillRect(44, 8, 3, 2);
    g.fillRect(45, 10, 1, 4);
    g.fillRect(43, 14, 5, 1);
  }

  const tw = 22;
  const th = 18;
  const tBase = memoryCanvas(tw, th);
  const tGlow = memoryCanvas(tw, th);
  {
    const c = tBase.ctx;
    const g = tGlow.ctx;
    c.fillStyle = '#9e6844';
    c.fillRect(3, 4, 16, 3);
    c.fillStyle = '#c48a62';
    c.fillRect(4, 4, 14, 1);
    c.fillStyle = '#2c303a';
    c.fillRect(10, 7, 2, 10);
    c.fillRect(7, 16, 8, 2);
    c.fillStyle = '#b4dce8';
    c.fillRect(6, 1, 2, 3);
    c.fillRect(15, 2, 2, 2);
    c.fillStyle = '#ffe082';
    c.fillRect(10, 2, 2, 2);

    g.fillStyle = 'rgba(255, 206, 108, 0.36)';
    g.fillRect(9, 1, 4, 4);
    g.fillStyle = '#fff0a8';
    g.fillRect(10, 2, 2, 2);
  }

  return {
    barPergola: box(bar.canvas),
    neonBase: box(nBase.canvas),
    neonGlow: box(nGlow.canvas),
    barTable: box(tBase.canvas),
    barTableGlow: box(tGlow.canvas),
  };
}

/** Builds the Rooftop Garden greenhouse, raised vegetable beds, sunflowers, and sprinkler. */
export function buildGardenStructures(): {
  greenhouse: SpriteBox;
  greenhouseGlow: SpriteBox;
  vegBeds: readonly SpriteBox[];
  sunflower: SpriteBox;
  sprinkler: SpriteBox;
} {
  const gw = 118;
  const gh = 74;
  const ghBase = memoryCanvas(gw, gh);
  const ghGlow = memoryCanvas(gw, gh);
  {
    const c = ghBase.ctx;
    const g = ghGlow.ctx;

    for (let y = 4; y < 26; y++) {
      const t = (y - 4) / 22;
      const half = Math.round(6 + t * 50);
      const x0 = 59 - half;
      c.fillStyle = 'rgba(136, 186, 206, 0.42)';
      c.fillRect(x0, y, half * 2, 1);
    }

    c.fillStyle = 'rgba(148, 198, 214, 0.36)';
    c.fillRect(8, 26, 102, 38);

    c.fillStyle = '#386e34';
    c.fillRect(14, 42, 24, 18);
    c.fillRect(46, 38, 28, 22);
    c.fillRect(82, 44, 22, 16);
    c.fillStyle = '#66aa4c';
    c.fillRect(16, 40, 12, 8);
    c.fillRect(50, 36, 16, 10);
    c.fillRect(84, 42, 14, 8);
    c.fillStyle = '#e05844';
    c.fillRect(54, 42, 2, 2);
    c.fillRect(62, 45, 2, 2);
    c.fillRect(22, 46, 2, 2);

    c.fillStyle = '#8b4d3b';
    c.fillRect(6, 62, 106, 12);
    c.fillStyle = '#6a382b';
    for (let y = 65; y < 74; y += 3) c.fillRect(6, y, 106, 1);

    c.fillStyle = '#323a44';
    c.fillRect(6, 25, 106, 2);
    for (let x = 6; x <= 112; x += 17) c.fillRect(x, 26, 2, 36);
    c.fillRect(6, 44, 106, 1);
    c.fillStyle = '#485260';
    c.fillRect(52, 2, 14, 3);
    for (let y = 4; y < 26; y++) {
      const t = (y - 4) / 22;
      const half = Math.round(6 + t * 50);
      c.fillRect(59 - half, y, 2, 1);
      c.fillRect(59 + half - 2, y, 2, 1);
      c.fillRect(59 - Math.round(half * 0.45), y, 1, 1);
      c.fillRect(59 + Math.round(half * 0.45), y, 1, 1);
    }

    paintGreenhouseLight(g, gw / 2, gh - GREENHOUSE_LAMP_HEIGHT);
  }

  const buildBed = (withTomatoes: boolean): SpriteBox => {
    const bw = 58;
    const bh = 22;
    const { canvas, ctx } = memoryCanvas(bw, bh);
    ctx.fillStyle = '#4a3222';
    ctx.fillRect(2, 10, 54, 4);
    ctx.fillStyle = '#8b5c3a';
    ctx.fillRect(0, 12, 58, 10);
    ctx.fillStyle = '#a6744c';
    ctx.fillRect(0, 12, 58, 2);
    ctx.fillStyle = '#5c3c24';
    ctx.fillRect(0, 17, 58, 1);
    ctx.fillRect(0, 21, 58, 1);

    if (withTomatoes) {
      for (const px of [10, 24, 38, 50]) {
        ctx.fillStyle = '#b4925a';
        ctx.fillRect(px, 1, 1, 11);
        ctx.fillStyle = '#386e32';
        ctx.fillRect(px - 4, 4, 9, 8);
        ctx.fillStyle = '#62a84a';
        ctx.fillRect(px - 3, 3, 6, 6);
        ctx.fillStyle = '#e04a3a';
        ctx.fillRect(px - 2, 6, 2, 2);
        ctx.fillRect(px + 2, 8, 2, 2);
      }
    } else {
      for (const px of [8, 20, 32, 44]) {
        ctx.fillStyle = '#3c7a42';
        ctx.fillRect(px - 4, 6, 9, 6);
        ctx.fillStyle = '#72bc68';
        ctx.fillRect(px - 3, 5, 7, 5);
        ctx.fillStyle = '#9ad88c';
        ctx.fillRect(px - 1, 6, 3, 2);
      }
      ctx.fillStyle = '#f2a838';
      ctx.fillRect(51, 8, 2, 2);
      ctx.fillRect(54, 9, 2, 2);
    }
    return box(canvas);
  };

  const sunflower = box(
    pixmap(
      [
        '...YYYYY....',
        '..YOOOOOY...',
        '.YOOOBOOOY..',
        '.YOOOBOOOY..',
        '..YOOOOOY...',
        '...YYYYY....',
        '.....G......',
        '...GGG......',
        '....GG.GG...',
        '.....GGG....',
        '.....G......',
        '....GG......',
        '.....G......',
        '.....G......',
        '.....G......',
      ],
      { Y: '#f6d64e', O: '#e2a42c', B: '#5c341e', G: '#4d8e3e' },
    ),
  );

  const sprinkler = box(
    pixmap(
      [
        '....SS....',
        '...SSSS...',
        '..DDDDDD..',
        '.SS....SS.',
        'SS......SS',
      ],
      { S: '#9aa4b2', D: '#545c68' },
    ),
  );

  return {
    greenhouse: box(ghBase.canvas),
    greenhouseGlow: box(ghGlow.canvas),
    vegBeds: [buildBed(true), buildBed(false)],
    sunflower,
    sprinkler,
  };
}

function paintGreenhouseLight(ctx: CanvasRenderingContext2D, glassCenter: number, lampY: number): void {
  const lightRadius = 24;
  const glassLeft = 8;
  const glassRight = 110;
  for (const offset of GREENHOUSE_LAMP_OFFSETS) {
    const lampX = glassCenter + offset;
    for (let y = 14; y < 44; y++) {
      const halfGlass = Math.round(6 + (y - 4) * 50 / 22);
      for (let x = Math.max(glassLeft, lampX - lightRadius); x < Math.min(glassRight, lampX + lightRadius); x++) {
        if (y < 26 && Math.abs(x - glassCenter) >= halfGlass - 2) continue;
        if (y >= 25 && (y <= 26 || (x - 6) % 17 < 2)) continue;
        const strength = 1 - Math.hypot(x - lampX, (y - lampY) * 1.4) / lightRadius;
        if (strength <= ditherThreshold(x, y)) continue;
        ctx.fillStyle = strength > 0.55 ? '#ffc47751' : '#ffd79525';
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillStyle = '#ffe6a5';
    ctx.fillRect(lampX - 4, lampY, 9, 1);
    ctx.fillStyle = '#fff4c7';
    ctx.fillRect(lampX - 1, lampY, 3, 1);
  }
  // The leaves that face the panes pick up narrow warm edges.
  ctx.fillStyle = '#efd08068';
  ctx.fillRect(17, 41, 6, 1);
  ctx.fillRect(51, 36, 8, 1);
  ctx.fillRect(85, 43, 5, 1);
}
