import { memoryCanvas } from '../../../render/pixel-stage';
import { pixmap } from '../../journeys/pixmap';
import { hash } from '../../journeys/noise';

export interface Sprites {
  swan: HTMLCanvasElement;
  sleeping: HTMLCanvasElement;
  duck: HTMLCanvasElement;
  cygnet: HTMLCanvasElement;
  frog: HTMLCanvasElement;
  turtle: HTMLCanvasElement;
  pine: HTMLCanvasElement;
  canoe: HTMLCanvasElement;
  lilyPad: HTMLCanvasElement;
  reflections: Record<'swan' | 'sleeping' | 'duck' | 'cygnet' | 'canoe', HTMLCanvasElement>;
}

const BIRD = { w: '#f2eee0', s: '#bacdc9', d: '#738f97', b: '#dd994e', e: '#243d46' };

export function buildSprites(): Sprites {
  const pine = memoryCanvas(39, 66);
  pine.ctx.fillStyle = '#69584b';
  pine.ctx.fillRect(18, 7, 3, 59);
  const needles = ['#254c44', '#346352', '#47765b', '#658966'];
  for (let y = 0; y < 59; y++) {
    const tier = (y % 12) / 12;
    const half = Math.round((2 + y * 0.29) * (0.65 + tier * 0.35));
    for (let x = -half; x <= half; x++) {
      pine.ctx.fillStyle = needles[x < -half * 0.3 ? 2 : x > half * 0.4 ? 0 : 1];
      if (hash(y * 53 + x) > 0.88) pine.ctx.fillStyle = needles[3];
      pine.ctx.fillRect(19 + x, y + 1, 1, 1);
    }
  }
  const art = {
    pine: pine.canvas,
    lilyPad: pixmap([
      '.....hhhhhh.....', '..hhhmhhmhhhm...', '.hhmmmmmmmmssm..',
      'hmmmmdmsss......', '.smmddmmmsssdd..', '..ssssmmssssdd..', '....ddddddd.....',
    ], { h: '#a2ad72', m: '#738f5e', s: '#4c7655', d: '#37594c' }),
    swan: pixmap([
      '..................wwww...', '.................wwwwwb..', '.................wwewwbb.',
      '.................wwss....', '.................wws.....', '.................wws.....',
      '................wws......', '...............wws.......', '..............wws........',
      '...w.........wwws........', '..www......wwwws.........', '.wwwwwwwwwwwwwws.........',
      'wwwwwwwwwwwwwwww.........', '.wwwwwwsswwwwwww.........', '..wwwwsssssswww..........',
      '...sssssssssss...........', '.....ddddddd.............',
    ], BIRD),
    sleeping: pixmap([
      '.......wwww.............', '......wwswww............', '.....wwswwwe............',
      '...wwwwwwwwwwww.........', '..wwwwwwwwwwwwww........', '.wwwwwwsswwwwwwww.......',
      'wwwwwwsssswwwwwwww......', '.wwwwsssssssswwww.......', '..ssssssssssssss........',
      '....dddddddddd..........',
    ], BIRD),
    duck: pixmap([
      '...........gggg...', '..........gggggb..', '..........ggegbbb.', '..........gggg....',
      '..........gss.....', '.........sss......', '..b.....sssss.....', '.bbbbbbbbssss.....',
      'bbbbbbbbbbbbss....', '.bbbbbdddbbbbs....', '..bbddddddbbs.....', '....ssssssss......',
    ], { ...BIRD, g: '#507c66', b: '#bf945b', s: '#a9b2a0' }),
    cygnet: pixmap(['........sss.', '.......ssseb', '.......ss...', '..ss..sss...', '.ssssssss...', 'sssssssss...', '.ssdddds....', '..ddddd.....'], BIRD),
    frog: pixmap([
      '...gg....gg....', '..gweg..gweg...', '..gggggggggg...', '.gggggggggggg..',
      'gggggssggggggg.', '.gggssssssggg..', '..ggssssssgg...', '.gggggggggggg..',
      'ggg..gggg..ggg.', 'gg...g..g...gg.',
    ], { g: '#69965d', s: '#afbd78', w: '#e5d8a0', e: '#203f39' }),
    turtle: pixmap([
      '.....dddddd........', '...dggggggggd......', '..dggssggssggd.....',
      '.dggsggssggsggd....', '.dgggggssgggggdgg..', 'dggssggggggssgggeg.',
      '.dgggssggssggdggg..', '..ddddddddddd......', '...gg......gg......',
    ], { d: '#39564a', g: '#7d925b', s: '#a2ac6c', e: '#172f30' }),
    canoe: pixmap([
      '...........................d....................', '..........................ddd...................',
      '.........................dwwwd..................', '.........................dwcwd..................',
      '.........................dwwwd..................', '..........................ddd...................',
      '...........................d....................', 'b..............................................b',
      '.bbb........................................bbb.', '..bbbhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhbbb..',
      '...bbbddddddddddddddddddddddddddddddddddddbbb...', '....bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb....',
      '......bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb......', '.........dddddddddddddddddddddddddddddd.........',
    ], { b: '#ad7854', h: '#d6ae79', d: '#514f43', w: '#f0ca79', c: '#fff1b2' }),
  };
  return { ...art, reflections: {
    swan: reflection(art.swan), sleeping: reflection(art.sleeping),
    duck: reflection(art.duck), cygnet: reflection(art.cygnet), canoe: reflection(art.canoe),
  } };
}

function reflection(source: HTMLCanvasElement): HTMLCanvasElement {
  const image = memoryCanvas(source.width, source.height);
  image.ctx.drawImage(source, 0, 0);
  image.ctx.globalCompositeOperation = 'source-atop';
  image.ctx.fillStyle = 'rgba(25,52,65,0.4)';
  image.ctx.fillRect(0, 0, source.width, source.height);
  return image.canvas;
}

/** Bottom anchored so the same sprite can be reflected about its own waterline. */
export function sprite(ctx: CanvasRenderingContext2D, image: HTMLCanvasElement, x: number, y: number, size: number, flip = false): void {
  const w = Math.max(1, Math.round(image.width * size));
  const h = Math.max(1, Math.round(image.height * size));
  if (!flip) {
    ctx.drawImage(image, Math.round(x) - Math.round(w / 2), Math.round(y) - h, w, h);
    return;
  }
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(-1, 1);
  ctx.drawImage(image, -Math.round(w / 2), -h, w, h);
  ctx.restore();
}
