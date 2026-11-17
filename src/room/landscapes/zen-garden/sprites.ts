import { memoryCanvas } from '../../../render/pixel-stage';
import { pixmap } from '../../journeys/pixmap';

export const PALETTE = {
  s: '#c8baa1', h: '#eee0bf', d: '#847c68', k: '#383d36',
  m: '#55694a', g: '#7e925c', b: '#594b3b', w: '#b98b5c',
  o: '#ce7b39', r: '#9a4d32', p: '#e0b88b', e: '#292f2b',
  c: '#e7debd', f: '#c5c4af', a: '#879d98', t: '#42766d',
};

/** Rectangle rows keep even circles and curves on the pixel grid. */
export function oval(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color;
  const rows = Math.max(1, Math.round(ry));
  for (let row = -rows; row <= rows; row++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - row * row / (rows * rows))));
    ctx.fillRect(Math.round(x) - half, Math.round(y) + row, half * 2 + 1, 1);
  }
}

export function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string): void {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  ctx.fillStyle = color;
  for (let n = 0; n <= steps; n++) {
    ctx.fillRect(Math.round(x0 + (x1 - x0) * n / steps), Math.round(y0 + (y1 - y0) * n / steps), 1, 1);
  }
}

export interface GardenSprites {
  monk: HTMLCanvasElement;
  bowed: HTMLCanvasElement;
  seated: HTMLCanvasElement;
  cat: HTMLCanvasElement;
  koi: HTMLCanvasElement;
  heron: HTMLCanvasElement;
  bamboo: HTMLCanvasElement;
}

export function buildSprites(): GardenSprites {
  const monk = pixmap([
    '.....pppp.....', '....phpppp....', '....pppppp....', '....pppppe....',
    '.....pppp.....', '......pp......', '....oooooo....', '...oohooroo...',
    '..oohooorrroo.', '..oohooorrroo.', '..oohooorrroo.', '..oohooorrroo.',
    '...ohooorroo..', '...ohooorroo..', '...ohooorroo..', '..oohooorrrro.',
    '..oohooorrrro.', '..oohooorrrro.', '..oohooorrrro.', '..oohooorrrro.',
    '.ooohooorrrrro', '.ooohooorrrrro', '.ooohhoorrrrro', '.ooooooorrrrro',
    '..oooooooooo..', '...ee...ee....', '..bbb...bbb...', '..bbb...bbb...',
  ], PALETTE);
  const bowed = memoryCanvas(18, 28);
  bowed.ctx.drawImage(monk, 0, 6, 14, 22, 0, 6, 14, 22);
  bowed.ctx.drawImage(monk, 2, 0, 10, 6, 7, 7, 10, 6);
  const seated = memoryCanvas(23, 23);
  seated.ctx.drawImage(monk, 0, 0, 14, 18, 4, 0, 14, 18);
  oval(seated.ctx, 11, 19, 11, 3, PALETTE.r);
  line(seated.ctx, 4, 18, 17, 20, PALETTE.o);
  const bamboo = memoryCanvas(40, 170);
  for (let i = 0; i < 3; i++) {
    const x = 7 + i * 12;
    const top = i * 13;
    bamboo.ctx.fillStyle = i === 1 ? '#6e8950' : '#486348';
    bamboo.ctx.fillRect(x, top, 5, 170 - top);
    bamboo.ctx.fillStyle = '#9ca970';
    bamboo.ctx.fillRect(x, top, 1, 170 - top);
    for (let y = top + 12; y < 170; y += 23) {
      line(bamboo.ctx, x - 1, y, x + 5, y, '#bac28c');
      for (let j = 0; j < 3; j++) {
        const dir = j % 2 ? -1 : 1;
        line(bamboo.ctx, x + 2, y - 2, x + dir * (8 + j * 2), y - 9 - j * 3, '#718952');
        line(bamboo.ctx, x + dir * 6, y - 6, x + dir * 11, y - 5, '#435f40');
      }
    }
  }
  return {
    monk, bowed: bowed.canvas, seated: seated.canvas, bamboo: bamboo.canvas,
    cat: pixmap([
      '..bb......bb........', '..bwb....bwb........', '..bwwbbbbwwb........',
      '..bwwwwwwwwb........', '..bwkwwwwkwb........', '...wwwwpwww.........',
      '....bwwwwb..........', '...bwwwwwwbb........', '..bwwwwwwwwwbb......',
      '..bwwwwwwwwwwwbb..bb', '..bwwwwwwwwwwwbb.bwb', '...bwwwwwwwwwwbbwwb.',
      '...bwwb...bwwwbbbb..', '...bbbb...bbbbb.....',
    ], PALETTE),
    koi: pixmap([
      '............h...', '.r.........hhh..', '..rr..ccccoohhh.',
      '...rrccccooocche', '..rr..ccoocchhh.', '.r.........hhh..',
      '............h...',
    ], PALETTE),
    heron: pixmap([
      '.......ffff....', '......fffefffff', '......afff.....', '......af.......',
      '......af.......', '......af.......', '......af.......', '......af.......',
      '......aff......', '.......aff.....', '.......afff....', '.....ffffff....',
      '....ffffffff...', '...fffaaaafff..', '..fffaaaaaafff.', '.fffaaaaaaaaff.',
      '...faaaaaaaff..', '....faaaaaff...', '.....ffffff....', '......bbbb.....',
      '......b..b.....', '......b..b.....', '......b..b.....', '......b..b.....',
      '......b..b.....', '.....bb..bb....',
    ], PALETTE),
  };
}

export function sprite(ctx: CanvasRenderingContext2D, image: HTMLCanvasElement, x: number, feet: number, facing = 1): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(feet));
  ctx.scale(facing, 1);
  ctx.drawImage(image, -Math.floor(image.width / 2), -image.height);
  ctx.restore();
}
