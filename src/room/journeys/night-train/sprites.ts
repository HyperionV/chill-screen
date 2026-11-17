import { pixmap } from '../pixmap';
import { memoryCanvas } from '../../../render/pixel-stage';

function pixelDisc(radius: number, color: string): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(radius * 2 + 1, radius * 2 + 1);
  ctx.fillStyle = color;
  for (let row = -radius; row <= radius; row++) {
    const half = Math.floor(Math.sqrt(radius * radius - row * row));
    ctx.fillRect(radius - half, radius + row, half * 2 + 1, 1);
  }
  return canvas;
}

const PALETTE = {
  c: '#344b53', d: '#202d38', h: '#aec1c6', s: '#e0dcd0',
  b: '#b29355', l: '#ffe0a1', w: '#e5edf0', p: '#6b807f',
  r: '#a98668', e: '#182532', a: '#c7ae8d',
};

export function buildSprites() {
  return {
    steam: pixelDisc(12, '#f5fbfa'),
    lampGlow: pixelDisc(18, '#ffdc99'),
    lanternGlow: pixelDisc(7, '#ffce81'),
    darkPine: pixmap([
      '.........h.........', '........hhh........', '........php........',
      '.......pphpp.......', '......ppppppp......', '.......ppppp.......',
      '.....ppppppppp.....', '....ppppppppppp....', '......ppppppp......',
      '....ppppppppppp....', '...ppppppppppppp...', '..ppppppppppppppp..',
      '....ppppppppppp....', '..ppppppppppppppp..', '.ppppppppppppppppp.',
      'ppppppppppppppppppp', '........ddd........', '........ddd........',
      '........ddd........',
    ], { h: '#496274', p: '#243b4b', d: '#1b2c3b' }),
    master: pixmap([
      '....dddd....', '...dbbbbd...', '....ssss....', '....sds.....',
      '...cccccc...', '..cccccccd..', '..cchccc.d..', '..cccccc..b.',
      '...ccccc.blb', '...ccccc.bll', '...ddddd..b.', '...dd.dd....',
      '...dd.dd....', '..ddd.ddd...',
    ], PALETTE),
    pine: pixmap([
      '.........w.........', '........wpw........', '.......wpppw.......',
      '......wpppppw......', '.......ppppp.......', '.....wpppppppw.....',
      '....wwwwppppppw....', '...wpppppppppppw...', '.....ppppppppp.....',
      '...wwwwppppppppw...', '..wpppppppppppppw..', '.wwppppppppppppppw.',
      '....ppppppppppp....', '..wwwwppppppppppw..', '.wpppppppppppppppw.',
      'wwppppppppppppppppw', '........ddd........', '........ddd........',
      '........ddd........',
    ], PALETTE),
    deer: pixmap([
      '............a.a.', '............aa..', '...........arra.',
      '...........rrre.', '...arrrrrrrarr..', '..rrrrrrrrrrr...',
      '.rrrrrrrrrrr....', 'rr.rrrrrrrr.....', '...ra....ra.....',
      '...ra....ra.....', '...r.....r......', '...e.....e......',
    ], PALETTE),
    dog: pixmap([
      '.............rr...', '............rarr..', '...rrrrrrrrrrrre..',
      '..rrrrrrrrrrrrrrr.', '.rrrrrrrrrrrr.....', 'rr.rrrrrrrrrr.....',
      '...ee......ee.....',
    ], PALETTE),
    owl: pixmap([
      '.d...d.', '.daaad.', '.alale.', '..aba..', '..aaa..', '..ddd..', '...b...',
    ], PALETTE),
    cup: pixmap([
      '.wwwwww...', '.whhhhwbb.', '.whhhhw.b.', '..whhw.bb.', '..wwww....', 'bbbbbbbb..',
    ], PALETTE),
  };
}

export type Sprites = ReturnType<typeof buildSprites>;

export function sprite(ctx: CanvasRenderingContext2D, image: HTMLCanvasElement, x: number, y: number, scale = 1): void {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, Math.round(x - image.width * scale / 2), Math.round(y - image.height * scale), Math.round(image.width * scale), Math.round(image.height * scale));
}
