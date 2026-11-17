import { memoryCanvas } from '../../../render/pixel-stage';
import { mirrored, pixmap } from '../pixmap';

export interface Sprite {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
}

export function fromPixmap(rows: readonly string[], palette: Readonly<Record<string, string>>): Sprite {
  const canvas = pixmap(rows, palette);
  return { canvas, w: canvas.width, h: canvas.height };
}

export function flip(s: Sprite): Sprite {
  const canvas = mirrored(s.canvas);
  return { canvas, w: canvas.width, h: canvas.height };
}

// --- Pip (always his red pointed cap and lantern on a stick) ---
const PIP_PAL: Record<string, string> = {
  R: '#e0483e', // red cap lit
  r: '#a62c28', // red cap shade
  s: '#f2cba8', // skin
  k: '#261b18', // dark eye / boots
  c: '#4e6e48', // mossy coat
  d: '#344c32', // coat shade
  w: '#8c623d', // wooden stick
  l: '#ffd978', // lantern core
  g: '#d89234', // lantern rim
  p: '#e8e0c8', // scroll paper
};

const PIP_RUN_1 = fromPixmap([
  '....RR......',
  '...RRRR.....',
  '..rrrrrR....',
  '...sssk...w.',
  '...ssss..wgw',
  '..cccccc.wlw',
  '..ddccdd..g.',
  '..w.cc......',
  '...k..k.....',
  '..k....k....',
], PIP_PAL);

const PIP_RUN_2 = fromPixmap([
  '....RR......',
  '...RRRR.....',
  '..rrrrrR....',
  '...sssk...w.',
  '...ssss..wgw',
  '..cccccc.wlw',
  '..ddccdd..g.',
  '..w.cc......',
  '...k.k......',
  '....k.k.....',
], PIP_PAL);

const PIP_TIP = fromPixmap([
  '...RR.......',
  '..RRRR......',
  '.rrrrrR.....',
  '............',
  '...sssk...w.',
  '...ssss..wgw',
  '..cccccc.wlw',
  '..ddccdd..g.',
  '...k..k.....',
  '...k..k.....',
], PIP_PAL);

const PIP_ASK = fromPixmap([
  '....RR......',
  '...RRRR.....',
  '..rrrrrR....',
  '...sssk...w.',
  '...ssss..wgw',
  '..ccccccswlw',
  '..ddccdd..g.',
  '..w.cc......',
  '...k..k.....',
  '...k..k.....',
], PIP_PAL);

const PIP_SCROLL = fromPixmap([
  '....RR......',
  '...RRRR.....',
  '..rrrrrR....',
  '...sssk...w.',
  '...ssss..wgw',
  '..cccccppwlw',
  '..ddccdppsg.',
  '...k..k.p...',
  '...k..k.....',
], PIP_PAL);

const PIP_KNEEL = fromPixmap([
  '............',
  '.....RR.....',
  '....RRRR....',
  '...rrrrrR...',
  '....sssk..w.',
  '....ssss.wgw',
  '...ccccccwlw',
  '...ddccdd.g.',
  '..kkkkk.....',
], PIP_PAL);

const PIP_WAVE_1 = fromPixmap([
  '....RR......',
  '...RRRR.....',
  '..rrrrrR....',
  '.s.sssk...w.',
  '..sssss..wgw',
  '...cccc..wlw',
  '..ddccdd..g.',
  '...k..k.....',
  '...k..k.....',
], PIP_PAL);

const PIP_WAVE_2 = fromPixmap([
  '..s.RR......',
  '...RRRR.....',
  '..rrrrrR....',
  '...sssk...w.',
  '...ssss..wgw',
  '..ccccc..wlw',
  '..ddccdd..g.',
  '...k..k.....',
  '...k..k.....',
], PIP_PAL);

// Giant marsh snail for Pip in Chapter 2
const SNAIL_PAL: Record<string, string> = {
  S: '#8fa472', // shell highlight
  s: '#6a8052', // shell mid
  d: '#465838', // shell spiral dark
  b: '#c8b896', // soft body
  k: '#3e382e', // eye tip
};

const SNAIL_1 = fromPixmap([
  '......SSSS......',
  '....SSssssSS....',
  '...SssddddssS...',
  '..SsdSSssdssS...',
  '..SsdSddsdssS..k',
  '..SssddddsssS.b.',
  '...SsssssssS.bb.',
  '.bbbbbbbbbbbbb..',
  'bbbbbbbbbbbbbb..',
], SNAIL_PAL);

const SNAIL_2 = fromPixmap([
  '......SSSS......',
  '....SSssssSS....',
  '...SssddddssS...',
  '..SsdSSssdssS.k.',
  '..SsdSddsdssS.b.',
  '..SssddddsssS.b.',
  '...SsssssssS.bb.',
  '..bbbbbbbbbbbbb.',
  '.bbbbbbbbbbbbbb.',
], SNAIL_PAL);

// --- The Witch (green shawl, pointed hat) ---
const WITCH_PAL: Record<string, string> = {
  H: '#3a324e', // hat highlight
  h: '#251f36', // hat dark
  b: '#5c4266', // hat band
  s: '#ebd0b4', // skin
  k: '#1c1822', // eyes / dress shadow
  G: '#5fa668', // green shawl lit
  g: '#3e7648', // green shawl shade
  d: '#2c263a', // gown
  w: '#8a5e3c', // wooden spoon / wand
  y: '#ffd978', // wand tip spark
};

const WITCH_STIR_1 = fromPixmap([
  '.....HH......',
  '....HHH......',
  '....hhh......',
  '...bbbbb.....',
  '..hhhhhhh....',
  '....ksssk....',
  '....sssss....',
  '...GGGGGGG...',
  '..gGGgggGGg..',
  '..ggdddddgg..',
  '.w.dddddd....',
  'w..dddddd....',
  '...dddkdd....',
  '...kkkkkk....',
], WITCH_PAL);

const WITCH_STIR_2 = fromPixmap([
  '.....HH......',
  '....HHH......',
  '....hhh......',
  '...bbbbb.....',
  '..hhhhhhh....',
  '....ksssk....',
  '....sssss....',
  '...GGGGGGG...',
  '..gGGgggGGg..',
  '.wggdddddgg..',
  '.w.dddddd....',
  '...dddddd....',
  '...dddkdd....',
  '...kkkkkk....',
], WITCH_PAL);

const WITCH_PLEASED = fromPixmap([
  '.....HH......',
  '....HHH......',
  '....hhh......',
  '...bbbbb.....',
  '..hhhhhhh....',
  '....ksssk....',
  '....ssyss....',
  '...GGGGGGG...',
  '..gGGgggGGg..',
  '..ggdddddgg..',
  '...dddddd....',
  '...dddddd....',
  '...dddkdd....',
  '...kkkkkk....',
], WITCH_PAL);

const WITCH_WAVE_1 = fromPixmap([
  '.....HH......',
  '....HHH......',
  '....hhh......',
  '...bbbbb.....',
  '..hhhhhhh....',
  '....ksssk..y.',
  '....sssss.w..',
  '...GGGGGGGs..',
  '..gGGgggGG...',
  '..ggdddddg...',
  '...dddddd....',
  '...dddddd....',
  '...dddkdd....',
  '...kkkkkk....',
], WITCH_PAL);

const WITCH_WAVE_2 = fromPixmap([
  '.....HH......',
  '....HHH......',
  '....hhh..y...',
  '...bbbbb.w...',
  '..hhhhhhhs...',
  '....ksssk....',
  '....sssss....',
  '...GGGGGGg...',
  '..gGGgggGG...',
  '..ggdddddg...',
  '...dddddd....',
  '...dddddd....',
  '...dddkdd....',
  '...kkkkkk....',
], WITCH_PAL);

// --- Black Cat (on the fence) ---
const CAT_PAL: Record<string, string> = {
  k: '#1a1822',
  d: '#2c2938',
  e: '#f2c14e', // amber eye
  p: '#d87a84', // yawn mouth
};

const CAT_SIT = fromPixmap([
  '..k...k.',
  '..kkkkk.',
  '..kekek.',
  '..ddkdd.',
  '.kkkkkk.',
  '.kkkkkk.',
  'k.kkkkk.',
  'kkkkkkk.',
], CAT_PAL);

const CAT_YAWN = fromPixmap([
  '..k...k.',
  '..kkkkk.',
  '..kkpkk.',
  '..ddpdd.',
  '.kkkkkk.',
  '.kkkkkk.',
  '.kkkkkkk',
  'kkkkkkk.',
], CAT_PAL);

const CAT_BLINK = fromPixmap([
  '..k...k.',
  '..kkkkk.',
  '..kkkkk.',
  '..ddkdd.',
  '.kkkkkk.',
  '.kkkkkk.',
  'k.kkkkk.',
  'kkkkkkk.',
], CAT_PAL);

// --- Owl on a branch ---
const OWL_PAL: Record<string, string> = {
  b: '#7b5b44',
  d: '#523b2c',
  c: '#d8c8a8',
  e: '#f2ca52',
  k: '#221a16',
};

const OWL_IDLE = fromPixmap([
  '.k...k.',
  '.bbbbb.',
  'becbceb',
  '.bbkbb.',
  '.bcccb.',
  '.bdcdb.',
  '..d.d..',
], OWL_PAL);

const OWL_BLINK = fromPixmap([
  '.k...k.',
  '.bbbbb.',
  'bkcbckb',
  '.bbkbb.',
  '.bcccb.',
  '.bdcdb.',
  '..d.d..',
], OWL_PAL);

const OWL_TURN = fromPixmap([
  '.k...k.',
  '.bbbbb.',
  'bbecbeb',
  '.bbkbb.',
  '.bcccb.',
  '.bdcdb.',
  '..d.d..',
], OWL_PAL);

// --- Rabbit with tiny lantern ---
const RABBIT_PAL: Record<string, string> = {
  b: '#b89b7a',
  d: '#866c54',
  w: '#efe6d8',
  k: '#221a16',
  l: '#ffe07a',
  g: '#c88a34',
};

const RABBIT_SIT = fromPixmap([
  '....b.b....',
  '....b.b....',
  '...bbbbk...',
  '...bbbb..g.',
  '.bbbbbb.glg',
  'wbbbbbb..g.',
  '.bbbbbb....',
  '..d..d.....',
], RABBIT_PAL);

const RABBIT_HOP = fromPixmap([
  '....b.b....',
  '....b.b....',
  '...bbbbk...',
  '...bbbb..g.',
  '.bbbbbb.glg',
  'wbbbbbb..g.',
  '..bbbbb....',
  '.d....d....',
], RABBIT_PAL);

// --- Frog ---
const FROG_PAL: Record<string, string> = {
  g: '#58a65c',
  d: '#387442',
  l: '#b6da7c',
  e: '#f2da68',
  k: '#1c2a1e',
};

const FROG_SIT = fromPixmap([
  '.e...e.',
  'ggk.kgg',
  'ggggggg',
  'glllllg',
  'ddg.gdd',
], FROG_PAL);

const FROG_BLINK = fromPixmap([
  '.k...k.',
  'ggk.kgg',
  'ggggggg',
  'glllllg',
  'ddg.gdd',
], FROG_PAL);

// --- Tiny Folk (waving goodbye in Ch 6) ---
function makeTinyFolk(capLit: string, capShade: string, coat: string): [Sprite, Sprite] {
  const pal = { C: capLit, c: capShade, s: '#f0cca8', k: '#221814', o: coat, d: '#3c3430' };
  return [
    fromPixmap([
      '..CC...',
      '.CCCC..',
      'cccccc.',
      '.sssk..',
      'soooo..',
      '.oooo..',
      '.d..d..',
    ], pal),
    fromPixmap([
      's.CC...',
      '.CCCC..',
      'cccccc.',
      '.sssk..',
      '.oooo..',
      '.oooo..',
      '.d..d..',
    ], pal),
  ];
}

// --- Deer Spirit (translucent stag silhouette filled with twinkling stars) ---
const STAG_PAL: Record<string, string> = {
  a: '#d8f4ff',
  s: '#629cc4',
  e: '#ffffff',
};

const STAG_WALK_1 = fromPixmap([
  '................a.a...a.',
  '.................a.a.a..',
  '..................aaa...',
  '.................sssss..',
  '................ssssses.',
  '....ssssssssssssss......',
  '..ssssssssssssssss......',
  '.asssssssssssssss.......',
  '..ssssssssssssss........',
  '....sss....sss..........',
  '...ss.s....s.ss.........',
  '..ss..s....s..ss........',
  '..s...s....s...s........',
], STAG_PAL);

const STAG_WALK_2 = fromPixmap([
  '................a.a...a.',
  '.................a.a.a..',
  '..................aaa...',
  '.................sssss..',
  '................ssssses.',
  '....ssssssssssssss......',
  '..ssssssssssssssss......',
  '.asssssssssssssss.......',
  '..ssssssssssssss........',
  '....sss....sss..........',
  '....s..s..s..s..........',
  '....s..s..s..s..........',
  '...s...s..s...s.........',
], STAG_PAL);

const STAG_BOW = fromPixmap([
  '........................',
  '........................',
  '........................',
  '........................',
  '....ssssssssssss........',
  '..ssssssssssssss...a.a..',
  '.asssssssssssssss.a.a.a.',
  '..ssssssssssssss...aaa..',
  '....sss....sssss..sssss.',
  '...ss.s....ss.ssssssses.',
  '...s..s.....s...........',
  '..s...s.....s...........',
  '..s...s.....s...........',
], STAG_PAL);

/** Builds the starry translucent mask for the stag silhouette (pre-baked dark indigo night coat). */
function starryStag(src: Sprite): Sprite {
  const { canvas, ctx } = memoryCanvas(src.w, src.h);
  ctx.drawImage(src.canvas, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(20, 32, 68, 0.55)';
  ctx.fillRect(0, 0, src.w, src.h);
  return { canvas, w: src.w, h: src.h };
}

export interface CastSprites {
  pip: {
    run: [Sprite, Sprite];
    runL: [Sprite, Sprite];
    tip: Sprite;
    tipL: Sprite;
    ask: Sprite;
    scroll: Sprite;
    kneel: Sprite;
    wave: [Sprite, Sprite];
    snail: [Sprite, Sprite];
    snailL: [Sprite, Sprite];
  };
  witch: {
    stir: [Sprite, Sprite];
    pleased: Sprite;
    wave: [Sprite, Sprite];
  };
  cat: { sit: Sprite; yawn: Sprite; blink: Sprite };
  owl: { idle: Sprite; blink: Sprite; turn: Sprite };
  rabbit: { sit: Sprite; hop: Sprite; sitL: Sprite; hopL: Sprite };
  frog: { sit: Sprite; blink: Sprite };
  tinyFolk: [Sprite, Sprite][];
  stag: { walk: [Sprite, Sprite]; walkL: [Sprite, Sprite]; bow: Sprite; bowL: Sprite };
}

export function buildCastSprites(): CastSprites {
  const stagW1 = starryStag(STAG_WALK_1);
  const stagW2 = starryStag(STAG_WALK_2);
  const stagB = starryStag(STAG_BOW);
  return {
    pip: {
      run: [PIP_RUN_1, PIP_RUN_2],
      runL: [flip(PIP_RUN_1), flip(PIP_RUN_2)],
      tip: PIP_TIP,
      tipL: flip(PIP_TIP),
      ask: PIP_ASK,
      scroll: PIP_SCROLL,
      kneel: PIP_KNEEL,
      wave: [PIP_WAVE_1, PIP_WAVE_2],
      snail: [SNAIL_1, SNAIL_2],
      snailL: [flip(SNAIL_1), flip(SNAIL_2)],
    },
    witch: {
      stir: [WITCH_STIR_1, WITCH_STIR_2],
      pleased: WITCH_PLEASED,
      wave: [WITCH_WAVE_1, WITCH_WAVE_2],
    },
    cat: { sit: CAT_SIT, yawn: CAT_YAWN, blink: CAT_BLINK },
    owl: { idle: OWL_IDLE, blink: OWL_BLINK, turn: OWL_TURN },
    rabbit: {
      sit: RABBIT_SIT,
      hop: RABBIT_HOP,
      sitL: flip(RABBIT_SIT),
      hopL: flip(RABBIT_HOP),
    },
    frog: { sit: FROG_SIT, blink: FROG_BLINK },
    tinyFolk: [
      makeTinyFolk('#e25648', '#a2322c', '#588254'),
      makeTinyFolk('#f0b84c', '#b47a28', '#6e5888'),
      makeTinyFolk('#6eb4a4', '#427c72', '#b86c52'),
    ],
    stag: {
      walk: [stagW1, stagW2],
      walkL: [flip(stagW1), flip(stagW2)],
      bow: stagB,
      bowL: flip(stagB),
    },
  };
}
