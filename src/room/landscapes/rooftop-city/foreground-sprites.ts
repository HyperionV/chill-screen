import { memoryCanvas } from '../../../render/pixel-stage';
import { seededRandom } from '../../../world/math';
import { pixmap } from '../../journeys/pixmap';
import type { SpriteBox } from './cast-sprites';

interface CondenserSprite extends SpriteBox {
  fanX: number;
  fanY: number;
}

export interface ForegroundSprites {
  brickPier: SpriteBox;
  acUnits: readonly CondenserSprite[];
  ventStacks: readonly SpriteBox[];
  ladders: readonly SpriteBox[];
  cratePlanters: readonly SpriteBox[];
  chairsTables: readonly SpriteBox[];
  chairsTableGlows: readonly SpriteBox[];
  antennaMasts: readonly SpriteBox[];
  drainGrate: SpriteBox;
  shortGarments: readonly SpriteBox[];
}

function box(canvas: HTMLCanvasElement): SpriteBox {
  return { canvas, w: canvas.width, h: canvas.height };
}

const BRICK_TONES: readonly string[] = ['#7e4c3f', '#6c3f34', '#8b5446', '#74453a'];

/** Brick parapet corner pier with overhanging stone cap (`22x46`). */
function buildBrickPier(): SpriteBox {
  const w = 22;
  const h = 46;
  const { canvas, ctx } = memoryCanvas(w, h);
  const rnd = seededRandom(5101);

  // Overhanging stone cap
  ctx.fillStyle = '#cdd5e0';
  ctx.fillRect(0, 0, w, 1);
  ctx.fillStyle = '#9aa4b4';
  ctx.fillRect(0, 1, w, 3);
  ctx.fillStyle = '#6e7786';
  ctx.fillRect(w - 3, 1, 3, 3);
  ctx.fillStyle = '#2f201f';
  ctx.fillRect(1, 4, w - 2, 1);

  // Brick shaft
  ctx.fillStyle = '#482a24';
  ctx.fillRect(2, 5, w - 4, h - 6);
  let row = 0;
  for (let y = 5; y < h - 2; y += 4) {
    const offset = row % 2 === 1 ? 4 : 0;
    for (let x = 2 - offset; x < w - 2; x += 8) {
      const bx = Math.max(2, x);
      const bw = Math.min(w - 2, x + 7) - bx;
      if (bw <= 0) continue;
      ctx.fillStyle = BRICK_TONES[Math.floor(rnd() * BRICK_TONES.length)] ?? '#7e4c3f';
      ctx.fillRect(bx, y, bw, 3);
    }
    row++;
  }
  // Right-side pier shadow & bottom flashing
  ctx.fillStyle = 'rgba(20, 14, 18, 0.34)';
  ctx.fillRect(w - 5, 5, 3, h - 6);
  ctx.fillStyle = '#343844';
  ctx.fillRect(1, h - 2, w - 2, 2);

  return box(canvas);
}

/** Rooftop air-conditioning condenser units with recessed circular fan grille and pipe box. */
function buildAcUnits(): readonly CondenserSprite[] {
  const buildOne = (w: number, h: number, light: string, mid: string, dark: string): CondenserSprite => {
    const { canvas, ctx } = memoryCanvas(w, h);
    // Mounting rails
    ctx.fillStyle = '#2a2e38';
    ctx.fillRect(2, h - 2, 4, 2);
    ctx.fillRect(w - 8, h - 2, 4, 2);

    // Main metal cabinet
    ctx.fillStyle = mid;
    ctx.fillRect(1, 1, w - 4, h - 3);
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, w - 2, 2);
    ctx.fillRect(1, 2, 1, h - 4);
    ctx.fillStyle = dark;
    ctx.fillRect(w - 5, 2, 2, h - 4);
    ctx.fillRect(1, h - 3, w - 4, 1);

    // Side junction box & copper stub
    ctx.fillStyle = '#4e5664';
    ctx.fillRect(w - 3, 4, 3, 7);
    ctx.fillStyle = '#b4744c';
    ctx.fillRect(w - 2, 11, 2, 3);

    // Circular dark fan recess
    const fanX = Math.floor((w - 6) * 0.42) + 2;
    const fanY = Math.floor((h - 2) * 0.52);
    const r = Math.min(5, Math.floor((h - 6) * 0.5));
    ctx.fillStyle = '#242934';
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.round(Math.sqrt(r * r - dy * dy));
      ctx.fillRect(fanX - half, fanY + dy, half * 2 + 1, 1);
    }
    ctx.fillStyle = '#4c5464';
    ctx.fillRect(fanX - 1, fanY - 1, 3, 3);

    // Louvered grille slats on right of fan
    const lx0 = fanX + r + 2;
    if (lx0 < w - 6) {
      for (let y = 4; y < h - 4; y += 2) {
        ctx.fillStyle = '#3b424e';
        ctx.fillRect(lx0, y, w - 6 - lx0, 1);
      }
    }
    ctx.fillStyle = '#c5c9ce';
    ctx.fillRect(w - 8, 3, 3, 1);
    ctx.fillStyle = '#a57155';
    ctx.fillRect(w - 7, h - 5, 2, 1);
    return { ...box(canvas), fanX, fanY };
  };

  return [
    buildOne(24, 18, '#bfc8d6', '#8892a2', '#525a68'),
    buildOne(20, 16, '#b4becb', '#7b8594', '#4b5260'),
  ];
}

/** Galvanized sheet-metal exhaust vent stacks with flange rings and conical rain caps. */
function buildVentStacks(): readonly SpriteBox[] {
  const buildStack = (h: number, pipeW: number): SpriteBox => {
    const w = pipeW + 8;
    const { canvas, ctx } = memoryCanvas(w, h);
    const cx = Math.floor(w * 0.5);
    const px = cx - Math.floor(pipeW * 0.5);

    // Conical rain cap
    ctx.fillStyle = '#9aa4b4';
    ctx.fillRect(cx - 2, 1, 4, 1);
    ctx.fillStyle = '#bcc6d4';
    ctx.fillRect(cx - 4, 2, 4, 1);
    ctx.fillStyle = '#6c7584';
    ctx.fillRect(cx, 2, 4, 1);
    ctx.fillStyle = '#8e98a8';
    ctx.fillRect(cx - 5, 3, 10, 1);
    ctx.fillStyle = '#383e4a';
    ctx.fillRect(cx - 3, 4, 6, 2);

    // Vertical galvanized pipe
    ctx.fillStyle = '#7e8896';
    ctx.fillRect(px, 6, pipeW, h - 9);
    ctx.fillStyle = '#b8c2d0';
    ctx.fillRect(px, 6, 1, h - 9);
    ctx.fillStyle = '#505866';
    ctx.fillRect(px + pipeW - 1, 6, 1, h - 9);

    // Flange collars
    for (const fy of [11, Math.floor(h * 0.58)]) {
      ctx.fillStyle = '#a4aebc';
      ctx.fillRect(px - 1, fy, pipeW + 2, 1);
      ctx.fillStyle = '#404652';
      ctx.fillRect(px - 1, fy + 1, pipeW + 2, 1);
    }

    // Roof flashing boot
    ctx.fillStyle = '#4a5260';
    ctx.fillRect(px - 2, h - 3, pipeW + 4, 3);
    ctx.fillStyle = '#747e8e';
    ctx.fillRect(px - 2, h - 3, pipeW + 4, 1);

    return box(canvas);
  };

  return [buildStack(34, 4), buildStack(26, 4)];
}

/** Leaning steel & wooden rooftop ladders with crisp rail highlights and rungs. */
function buildLadders(): readonly SpriteBox[] {
  const buildLadder = (h: number, railHi: string, railMid: string, railDark: string): SpriteBox => {
    const w = 13;
    const { canvas, ctx } = memoryCanvas(w, h);
    for (let y = 0; y < h; y++) {
      const lean = Math.round((1 - y / h) * 3);
      ctx.fillStyle = railHi;
      ctx.fillRect(1 + lean, y, 1, 1);
      ctx.fillStyle = railMid;
      ctx.fillRect(2 + lean, y, 1, 1);
      ctx.fillRect(7 + lean, y, 1, 1);
      ctx.fillStyle = railDark;
      ctx.fillRect(8 + lean, y, 1, 1);
      if (y >= 3 && y <= h - 3 && y % 5 === 3) {
        ctx.fillStyle = railHi;
        ctx.fillRect(3 + lean, y, 4, 1);
        ctx.fillStyle = railDark;
        ctx.fillRect(3 + lean, y + 1, 4, 1);
      }
    }
    return box(canvas);
  };

  return [
    buildLadder(38, '#c2ccd8', '#7c8696', '#454c5a'),
    buildLadder(32, '#ba885a', '#8c5e3a', '#52341e'),
  ];
}

/** Potted shrubs, herbs, and marigolds growing inside slatted wooden crates. */
function buildCratePlanters(): readonly SpriteBox[] {
  const herbCrate = box(
    pixmap(
      [
        '....P...P.....',
        '...GPG.GPG....',
        '..LGGGLGGGL...',
        '.GGGGGGGGGGG..',
        '.DGGGLGGGGGGD.',
        '..DDDDDDDDDD..',
        'CCCCCCCCCCCCCC',
        'CHHHHHHHHHHHHC',
        'CCCCCCCCCCCCCS',
        'CCSSSSSSSSSSCS',
        'CCCCCCCCCCCCCS',
        'SSSSSSSSSSSSSS',
      ],
      { P: '#c68ee0', L: '#86c85e', G: '#4d9240', D: '#2c5828', C: '#9a6842', H: '#bc8458', S: '#5e3b22' },
    ),
  );

  const figCrate = box(
    pixmap(
      [
        '..LL....LL....',
        '.LGG..LLGGL...',
        '.GGGLGGGGGGG..',
        'DGGGGGGGGGGGD.',
        '.DGGGLGGGGGD..',
        '..DDDDDDDDD...',
        'CCCCCCCCCCCCCC',
        'CHHHHHHHHHHHHC',
        'CCSSSSSSSSSSCS',
        'CCCCCCCCCCCCCS',
        'CHHHHHHHHHHHHS',
        'SSSSSSSSSSSSSS',
      ],
      { L: '#7ec05a', G: '#43823a', D: '#275224', C: '#8c5d3a', H: '#b27c52', S: '#56361f' },
    ),
  );

  const marigoldCrate = box(
    pixmap(
      [
        '..YY..OO..YY..',
        '.YOY..OO..YOY.',
        '..GGGGGGGGGG..',
        '.LGGGGGGGGGGD.',
        '..DDDDDDDDDD..',
        'CCCCCCCCCCCCCC',
        'CHHHHHHHHHHHHC',
        'CCCCCCCCCCCCCS',
        'CCSSSSSSSSSSCS',
        'SSSSSSSSSSSSSS',
      ],
      { Y: '#f6d24e', O: '#e88234', L: '#80c258', G: '#4c8e3e', D: '#2c5826', C: '#96643e', H: '#b88256', S: '#5c3a22' },
    ),
  );

  return [herbCrate, figCrate, marigoldCrate];
}

/** Two chairs flanking a small rooftop table with mugs & a warm lantern, plus post-tint lantern glow. */
function buildChairsAndTables(): { base: readonly SpriteBox[]; glow: readonly SpriteBox[] } {
  const bistroBase = pixmap(
    [
      '...........................',
      '............L..............',
      '...........LGL.............',
      '......MM...LLL...MM........',
      '.....TTTTTTTTTTTTTT........',
      '..D..TTTTTTTTTTTTTT..D.....',
      '..D...DDDD.TT.DDDD...D.....',
      '..D........TT........D.....',
      '..DDDD.....TT.....DDDD.....',
      '..D..D.....TT.....D..D.....',
      '..D..D.....TT.....D..D.....',
      '..D..D....TTTT....D..D.....',
    ],
    {
      D: '#38404e',
      T: '#9e6844',
      M: '#e8eef2',
      L: '#485060',
      G: '#ffda78',
    },
  );
  const bistroGlow = memoryCanvas(bistroBase.width, bistroBase.height);
  bistroGlow.ctx.fillStyle = '#ffefaa';
  bistroGlow.ctx.fillRect(12, 2, 1, 1);

  const crateSetBase = pixmap(
    [
      '...........................',
      '...........LLL.............',
      '..........LGGGL............',
      '..W.......LLLLL.......W....',
      '..W...MM..TTTTT.......W....',
      '..W...TTTTTTTTTTT.....W....',
      '..WWWWCCCCCCCCCCC..WWWW....',
      '..W..WCHHHHHHHHHW..W..W....',
      '..W..WCCCCCCCCCCW..W..W....',
      '..W..WCSSSSSSSSSW..W..W....',
    ],
    {
      W: '#7c5234',
      T: '#b48056',
      C: '#8d5d3b',
      H: '#a8744c',
      S: '#563620',
      M: '#d87058',
      L: '#3a404c',
      G: '#ffe082',
    },
  );
  const crateSetGlow = memoryCanvas(crateSetBase.width, crateSetBase.height);
  crateSetGlow.ctx.fillStyle = '#fff0ae';
  crateSetGlow.ctx.fillRect(11, 2, 3, 1);

  return {
    base: [box(bistroBase), box(crateSetBase)],
    glow: [box(bistroGlow.canvas), box(crateSetGlow.canvas)],
  };
}

/** Rooftop TV/radio antenna masts with dipole crossbars and red aviation beacon tip at top. */
function buildAntennaMasts(): readonly SpriteBox[] {
  const tall = memoryCanvas(15, 42);
  {
    const c = tall.ctx;
    c.fillStyle = '#363c48';
    c.fillRect(3, 39, 9, 3);
    c.fillStyle = '#5a6476';
    c.fillRect(7, 2, 1, 38);
    c.fillStyle = '#9aa4b4';
    c.fillRect(6, 6, 1, 34);
    // Crossbars
    c.fillStyle = '#7a8494';
    c.fillRect(2, 7, 11, 1);
    c.fillRect(1, 13, 13, 1);
    c.fillRect(4, 19, 7, 1);
    c.fillStyle = '#b4becd';
    c.fillRect(2, 7, 1, 2);
    c.fillRect(12, 7, 1, 2);
    // Junction box
    c.fillStyle = '#404856';
    c.fillRect(5, 29, 4, 5);
    // Beacon bulb housing
    c.fillStyle = '#943234';
    c.fillRect(6, 0, 2, 2);
  }

  const medium = memoryCanvas(13, 34);
  {
    const c = medium.ctx;
    c.fillStyle = '#383e4a';
    c.fillRect(3, 31, 7, 3);
    c.fillStyle = '#626c7e';
    c.fillRect(6, 2, 1, 30);
    c.fillStyle = '#9ea8b8';
    c.fillRect(5, 5, 1, 27);
    c.fillStyle = '#7c8696';
    c.fillRect(1, 7, 11, 1);
    c.fillRect(3, 12, 7, 1);
    c.fillStyle = '#943234';
    c.fillRect(5, 0, 2, 2);
  }

  return [box(tall.canvas), box(medium.canvas)];
}

/** Cast-iron slotted terrace drain grate (`14x5`). */
function buildDrainGrate(): SpriteBox {
  const { canvas, ctx } = memoryCanvas(14, 5);
  ctx.fillStyle = '#626a7a';
  ctx.fillRect(0, 0, 14, 5);
  ctx.fillStyle = '#252934';
  for (let x = 2; x < 12; x += 2) {
    ctx.fillRect(x, 1, 1, 3);
  }
  ctx.fillStyle = '#8a94a4';
  ctx.fillRect(0, 0, 14, 1);
  return box(canvas);
}

/** Compact garments for secondary rooftop laundry lines. */
function buildShortGarments(): readonly SpriteBox[] {
  const apron = box(
    pixmap(
      ['..CC..CC..', '..CCCCCC..', '..CHHHHC..', '..CCCCCC..', '..CCCCCC..', '..CCCCCC..', '..DDDDDD..'],
      { C: '#6c8aa8', H: '#8eb0d0', D: '#4a647e' },
    ),
  );
  const towel = box(
    pixmap(
      ['.HHHHHH.', '.CCCCCC.', '.CCCCCC.', '.WWWWWW.', '.CCCCCC.', '.CCCCCC.', '.DDDDDD.'],
      { C: '#d87a58', H: '#ee9c7e', W: '#f4ece0', D: '#a4543a' },
    ),
  );
  const cloth = box(
    pixmap(
      ['.LLLLLLL.', '.MMMMMMM.', '.MMMMMMM.', '.MMMMMMM.', '.DDDDDDD.'],
      { L: '#e8d898', M: '#d2be74', D: '#9e8c4c' },
    ),
  );
  return [apron, towel, cloth];
}

/** Builds all foreground rooftop architecture and lived-in prop sprites once. */
export function createForegroundSprites(): ForegroundSprites {
  const chairs = buildChairsAndTables();
  return {
    brickPier: buildBrickPier(),
    acUnits: buildAcUnits(),
    ventStacks: buildVentStacks(),
    ladders: buildLadders(),
    cratePlanters: buildCratePlanters(),
    chairsTables: chairs.base,
    chairsTableGlows: chairs.glow,
    antennaMasts: buildAntennaMasts(),
    drainGrate: buildDrainGrate(),
    shortGarments: buildShortGarments(),
  };
}
