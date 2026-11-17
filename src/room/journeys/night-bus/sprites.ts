import { mirrored, pixmap } from '../pixmap';

const PALETTE = {
  k: '#151e2b',
  d: '#484b5c',
  m: '#6d7488',
  b: '#b49688',
  h: '#dfbfa8',
  w: '#ece8da',
  g: '#5ea396',
  s: '#447870',
  n: '#3d5a80',
  u: '#283c58',
  y: '#f2be38',
  o: '#c98c1e',
  r: '#ff3b52',
  p: '#ff5498',
  q: '#ffc2da',
  c: '#7ce4f0',
  l: '#fff09c',
};

export interface Sprites {
  cat: HTMLCanvasElement[];
  person: HTMLCanvasElement[];
  taxiRight: HTMLCanvasElement;
  taxiLeft: HTMLCanvasElement;
  carRight: HTMLCanvasElement;
  carLeft: HTMLCanvasElement;
  scooterRight: HTMLCanvasElement;
  scooterLeft: HTMLCanvasElement;
  bike: HTMLCanvasElement;
  dog: HTMLCanvasElement[];
  pigeon: HTMLCanvasElement[];
  heart: HTMLCanvasElement;
}

/** Dark outlines and a bright rim keep scaled cast silhouettes crisp in the rain. */
export function buildSprites(): Sprites {
  const taxiRight = pixmap([
    '...........wwlww.................',
    '........yyyyyyyyyyyyy............',
    '.......ycccccyycccccyy...........',
    '......yccccccyyccccccyy..........',
    '.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyy..',
    'rryyyyyyyyyyyyyyyyyyyyyyyyyyyyyll',
    'rryyyyyyyoooooyyyyyyyyyyyyyyyyyll',
    'oyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyo',
    'kooooyyyyyyyyyyyyyyyyyyyyyyyooook',
    '....kkkkk.............kkkkk......',
    '...kkwwwkk...........kkwwwkk.....',
    '....kkkkk.............kkkkk......',
  ], PALETTE);

  const carRight = pixmap([
    '.......nnnnnnnnnnnnn............',
    '......ncccccnncccccnn...........',
    '.....nccccccnnccccccnn..........',
    '.nnnnnnnnnnnnnnnnnnnnnnnnnnnnn..',
    'rrnnnnnnnnnnnnnnnnnnnnnnnnnnnnll',
    'rrnnnnnnnuuuuunnnnnnnnnnnnnnnnll',
    'unnnnnnnnnnnnnnnnnnnnnnnnnnnnnnu',
    'kuuuunnnnnnnnnnnnnnnnnnnnnnuuuuk',
    '....kkkkk............kkkkk......',
    '...kkwwwkk..........kkwwwkk.....',
    '....kkkkk............kkkkk......',
  ], PALETTE);

  const scooterRight = pixmap([
    '......hhh...........',
    '......hhhh..........',
    '......hhhc..........',
    '.....rrrrr..........',
    '....rrrrrrd.........',
    '....rrrrrrdd........',
    '.....dddd.dd........',
    '......dd..dd..cc....',
    '......dd..dd..cccl..',
    'r.cccccccccccccccl..',
    '.cccccccccccccccc...',
    '..cccc......cccc....',
    '..kkkk......kkkk....',
    '.kkwwkk....kkwwkk...',
    '..kkkk......kkkk....',
  ], PALETTE);

  return {
    cat: [
      pixmap([
        '...bb.....bb...',
        '..bbbb...bbbb..',
        '..bbbbbbbbbbb..',
        '..bbblbbbllbb..',
        '...bbbbbbbbb...',
        '....bbbbbbb....',
        '....bbbbdd.....',
        '..bbbbbbbdd..b.',
        '.bbbbbbbbddd.b.',
        '.bbbbbbbbdddbb.',
        'b.bbbbbbbddddb.',
        'b.bbbbbbbddd...',
        '...wwwwwwwww...',
      ], PALETTE),
      pixmap([
        '...bb.....bb...',
        '..bbbb...bbbb..',
        '..bbbbbbbbbbb..',
        '..bbbddddddbb..',
        '...bbbbbbbbb...',
        '...hhbbbbbb....',
        '..hhhbbbd......',
        '..bbbbbbbdd..b.',
        '.bbbbbbbbddd.b.',
        '.bbbbbbbbdddbb.',
        'b.bbbbbbbddddb.',
        'b.bbbbbbbddd...',
        '...wwwwwwwww...',
      ], PALETTE),
      pixmap([
        '..........bb..bb..',
        '..........bbbbbb..',
        '..........bbbblb..',
        '....bbbbbbbbbbbb..',
        '..bbbbbbbbbbbbbb..',
        '.bbbbbbbbbbbddd...',
        'bb..bbbdddddd.....',
        'b...www.....www...',
        '....www......www..',
        '.....w........w...',
      ], PALETTE),
      pixmap([
        '................',
        '...bbbbbbbbbb...',
        '..bbbbdddbbbbb..',
        '.bbdbbbbbbdddbd.',
        '.bbbbbbbbbbbbbd.',
        '..bbbbbbwwwwww..',
        '...wwwwwwwwww...',
      ], PALETTE),
      pixmap([
        '...bb.....bb...',
        '..bbbb...bbbb..',
        '..bbbbbbbbbbb..',
        '..bbbwbbbwwbb..',
        '...hhbbbbbhh...',
        '....bbbbbbb....',
        '....bbbbdd...b.',
        '..bbbbbbbdd..b.',
        '.bbbbbbbbddd.b.',
        '.bbbbbbbbdddbb.',
        'b.bbbbbbbddddb.',
        'b.bbbbbbbddd...',
        '...wwwwwwwww...',
      ], PALETTE),
    ],
    person: [
      pixmap([
        '...hhh...',
        '...hhh...',
        '...hbh...',
        '..ggggg..',
        '.ggggggs.',
        '.ggggggs.',
        '.ggggggs.',
        '..ggggs..',
        '..dd.dd..',
        '..dd.dd..',
        '..dd.dd..',
        '..d...d..',
        '.kk...kk.',
        '.kk...kk.',
      ], PALETTE),
      pixmap([
        '...hhh...',
        '...hhh...',
        '...hbh...',
        '..ggggg..',
        '.ggggggs.',
        '.ggggggs.',
        '.ggggggs.',
        '..ggggs..',
        '..dd.dd..',
        '.dd...dd.',
        '.dd...dd.',
        'd.......d',
        'kk.....kk',
        'kk.....kk',
      ], PALETTE),
    ],
    taxiRight,
    taxiLeft: mirrored(taxiRight),
    carRight,
    carLeft: mirrored(carRight),
    scooterRight,
    scooterLeft: mirrored(scooterRight),
    bike: pixmap([
      '.......hhh...........',
      '.......hhhh..........',
      '......ddddd..........',
      '.....ddddddd.........',
      '......dd..dd.........',
      '.......d...d..yy.....',
      '......dd...yyyy.l....',
      '....yyyyyyyyy..y.....',
      '..kkkk..y..y..kkkk...',
      '.kk..kk.yyyy.kk..kk..',
      'kk.ww.kk.yy.kk.ww.kk.',
      '.kk..kk......kk..kk..',
      '..kkkk........kkkk...',
    ], PALETTE),
    dog: [
      pixmap([
        '............ddd....',
        '...........bhhhb...',
        '..bbbbbbbbbbhhhbk..',
        '.bbbbbbbbbbbbbbbb..',
        'bb.bbbbbbbbbbbbb...',
        'b..ddddddddddd.....',
        '...ww..ww..ww..ww..',
        '...ww..ww..ww..ww..',
      ], PALETTE),
      pixmap([
        '...................',
        '...................',
        '..bbbbbbbbb..ddd...',
        '.bbbbbbbbbbbbhhhb..',
        'bb.bbbbbbbbbbhhhbk.',
        '...ddddddddddd.....',
        '...ww..ww..ww..ww..',
        '...ww..ww..ww..ww..',
      ], PALETTE),
    ],
    pigeon: [
      pixmap([
        '......ddd.',
        '.....dccll',
        '....ddddd.',
        '..ddddddd.',
        'wwwdddddd.',
        '...kk.kk..',
        '...kk.kk..',
      ], PALETTE),
      pixmap([
        '..........',
        '..........',
        '....ddddd.',
        '..ddddddd.',
        'wwwdddddcl',
        '...kk.kk..',
        '...kk.kk..',
      ], PALETTE),
    ],
    heart: pixmap([
      '.kkk...kkk.',
      'kpppk.kpppk',
      'kpqppkppprk',
      'kpppprprrrk',
      '.kprrrrrrk.',
      '..krrrrrk..',
      '...krrrk...',
      '....krk....',
      '.....k.....',
    ], PALETTE),
  };
}

export function sprite(ctx: CanvasRenderingContext2D, image: HTMLCanvasElement, x: number, bottom: number): void {
  ctx.drawImage(image, Math.round(x - image.width / 2), Math.round(bottom - image.height));
}
