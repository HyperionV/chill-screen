import type { RGB } from '../../render/color';
import { memoryCanvas } from '../../render/pixel-stage';

export interface Picture {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
}

const DEER_COLORS: Record<string, RGB> = { b: [160, 105, 58], d: [107, 68, 38], w: [236, 220, 192], k: [28, 18, 12], a: [205, 189, 148] };
const RABBIT_COLORS: Record<string, RGB> = { b: [176, 150, 120], w: [240, 232, 220], k: [30, 22, 18], d: [130, 108, 86] };
const DUCK_COLORS: Record<string, RGB> = { g: [47, 122, 74], b: [138, 122, 98], y: [224, 176, 48], w: [232, 232, 224] };
const FOX_COLORS: Record<string, RGB> = { o: [214, 112, 48], w: [250, 244, 232], k: [34, 22, 18] };
const HEDGEHOG_COLORS: Record<string, RGB> = { s: [78, 58, 44], l: [148, 124, 96], t: [188, 156, 118], k: [28, 20, 16] };
const OWL_COLORS: Record<string, RGB> = {
  b: [112, 84, 58], d: [68, 50, 36], c: [204, 186, 152], e: [236, 192, 68], y: [192, 138, 54],
};
const FOOD_COLORS: Record<string, RGB> = { g: [242, 194, 104], b: [196, 132, 58], d: [114, 68, 30] };

const DEER_UP = [
  '..........a.a...', '...........aa...', '..........bbb...', '.........bbbbk..', '.........bbbb...', '..bbbbbbbbbb....',
  '.wbbbbbbbbbbb...', '.wbbbbbbbbbbb...', '..bbbbbbbbbbb...', '...d.d...d.d....', '...d.d...d.d....', '...d.d...d.d....', '...d.d...d.d....',
];
const DEER_STRIDE = [
  '..........a.a...', '...........aa...', '..........bbb...', '.........bbbbk..', '.........bbbb...', '..bbbbbbbbbb....',
  '.wbbbbbbbbbbb...', '.wbbbbbbbbbbb...', '..bbbbbbbbbbb...', '..d..d....d..d..', '..d...d..d...d..', '.d....d..d....d.', '.d....d..d....d.',
];
const DEER_GRAZE = [
  '................', '................', '................', '................', '................', '..bbbbbbbbbb....',
  '.wbbbbbbbbbbbb..', '.wbbbbbbbbbb.bb.', '..bbbbbbbbbb.bbb', '...d.d...d.d.bbk', '...d.d...d.d....', '...d.d...d.d....', '...d.d...d.d....',
];
const RABBIT = ['....b.b.', '....b.b.', '...bbbbk', '...bbbb.', '.bbbbbb.', 'wbbbbbb.', '.bbbbbb.', '..d..d..'];
const DUCK = ['.....gg.', '..bbbggy', '.bbbbbb.', 'wbbbbb..'];

const FOX_STAND = [
  '.........k.k..', '.........ooo..', 'ww......oook..', 'wooooooooooowk',
  '.oooooooowww..', '..oo.oo..ow...', '...k.k...k.k..',
];
const FOX_TROT = [
  '.........k.k..', '.........ooo..', 'ww......oook..', 'wooooooooooowk',
  '.oooooooowww..', '..oo.oo..ow...', '..k...k.k...k.',
];
const FOX_SIT = [
  '.......k.k..', '.......ooo..', '......oook..', '......oooowk',
  '.....oooow..', '.wwoooooow..', 'wwoooooo....', '...k.k.k....',
];
const FOX_DRINK = [
  '..............', '..............', 'ww.......k.k..', 'wooooooooooo..',
  '.ooooooooook..', '..oo.oo..oowk.', '...k.k...k.k..',
];
const FOX_LOOK = [
  '........k.k...', '........ooo...', 'ww.....okoko..', 'wooooooooow...',
  '.oooooooowww..', '..oo.oo..ow...', '...k.k...k.k..',
];

const HEDGEHOG_A = ['..slsls..', '.lslsltt.', 'slslslttk', '.ttttttt.', '..k...k..'];
const HEDGEHOG_B = ['..slsls..', '.lslsltt.', 'slslslttk', '.ttttttt.', '...k.k...'];
const HEDGEHOG_CURL = ['..lsl..', '.slsls.', 'lslslsl', '.slsls.', '..ttt..'];

const OWL_FRONT = [
  '.d.....d.', '.dbbbbdb.', '.bececeb.', '..ccycc..', '.dbcccbd.',
  'dbcbcbcbd', 'dbbcccbdb', '.dbbbbdb.', '..ddddd..', '..y...y..',
];
const OWL_LEFT = [
  '.d....d..', '.dbbbbdb.', '.eecebbb.', '.cyccbbb.', '.dbcccbd.',
  'dbcbcbcbd', 'dbbcccbdb', '.dbbbbdb.', '..ddddd..', '..y...y..',
];
const OWL_RIGHT = [
  '..d....d.', '.dbbbbdb.', '.bbbecee.', '.bbbccyc.', '.dbcccbd.',
  'dbcbcbcbd', 'dbbcccbdb', '.dbbbbdb.', '..ddddd..', '..y...y..',
];
const OWL_BLINK = [
  '.d.....d.', '.dbbbbdb.', '.bdcdcdb.', '..ccycc..', '.dbcccbd.',
  'dbcbcbcbd', 'dbbcccbdb', '.dbbbbdb.', '..ddddd..', '..y...y..',
];
const OWL_GLIDE_A = ['dd.........dd', '.dbb.....bbd.', '..dbbbbbbdb..', '....dyyyd....', '.....ddd.....'];
const OWL_GLIDE_B = ['.............', '....dbbbd....', '..dbbbbbbdb..', 'dd..dyyyd..dd', '.....ddd.....'];

const FOOD = ['bgb', 'dbd'];

function bake(rows: readonly string[], colors: Readonly<Record<string, RGB>>): Picture {
  const w = rows[0].length;
  const { canvas, ctx } = memoryCanvas(w, rows.length);
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const c = colors[ch];
      if (!c) return;
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.fillRect(x, y, 1, 1);
    });
  });
  return { canvas, w, h: rows.length };
}

export const PICTURES = {
  deerUp: bake(DEER_UP, DEER_COLORS),
  deerStride: bake(DEER_STRIDE, DEER_COLORS),
  deerGraze: bake(DEER_GRAZE, DEER_COLORS),
  rabbit: bake(RABBIT, RABBIT_COLORS),
  duck: bake(DUCK, DUCK_COLORS),
  foxStand: bake(FOX_STAND, FOX_COLORS),
  foxTrot: bake(FOX_TROT, FOX_COLORS),
  foxSit: bake(FOX_SIT, FOX_COLORS),
  foxDrink: bake(FOX_DRINK, FOX_COLORS),
  foxLook: bake(FOX_LOOK, FOX_COLORS),
  hedgehogA: bake(HEDGEHOG_A, HEDGEHOG_COLORS),
  hedgehogB: bake(HEDGEHOG_B, HEDGEHOG_COLORS),
  hedgehogCurl: bake(HEDGEHOG_CURL, HEDGEHOG_COLORS),
  owlFront: bake(OWL_FRONT, OWL_COLORS),
  owlLeft: bake(OWL_LEFT, OWL_COLORS),
  owlRight: bake(OWL_RIGHT, OWL_COLORS),
  owlBlink: bake(OWL_BLINK, OWL_COLORS),
  owlGlideA: bake(OWL_GLIDE_A, OWL_COLORS),
  owlGlideB: bake(OWL_GLIDE_B, OWL_COLORS),
  food: bake(FOOD, FOOD_COLORS),
};

export function drawPicture(ctx: CanvasRenderingContext2D, pic: Picture, x: number, y: number, dir: 1 | -1): void {
  if (dir === 1) {
    ctx.drawImage(pic.canvas, x, y);
    return;
  }
  ctx.save();
  ctx.translate(x + pic.w, y);
  ctx.scale(-1, 1);
  ctx.drawImage(pic.canvas, 0, 0);
  ctx.restore();
}
