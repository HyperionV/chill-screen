import { pixmap } from '../../journeys/pixmap';

export interface PropSprites {
  umbrella: HTMLCanvasElement;
  towel: HTMLCanvasElement;
  sandcastle: HTMLCanvasElement;
  pennant: HTMLCanvasElement;
  driftwood: HTMLCanvasElement;
  shells: HTMLCanvasElement[];
  bottleClosed: HTMLCanvasElement;
  bottleOpen: HTMLCanvasElement;
  cork: HTMLCanvasElement;
  boats: HTMLCanvasElement[];
  boatLights: HTMLCanvasElement[];
  crate: HTMLCanvasElement;
  crateStack: HTMLCanvasElement;
  lampPost: HTMLCanvasElement;
  bollard: HTMLCanvasElement;
  starfishCoral: HTMLCanvasElement;
  starfishGold: HTMLCanvasElement;
  anemonePinkA: HTMLCanvasElement;
  anemonePinkB: HTMLCanvasElement;
  anemoneTealA: HTMLCanvasElement;
  anemoneTealB: HTMLCanvasElement;
  seaweed: HTMLCanvasElement;
  sailCloth: HTMLCanvasElement;
  sailboat: HTMLCanvasElement;
  sailboatLight: HTMLCanvasElement;
}

const BEACH_PAL = {
  R: '#d9483b',
  A: '#f56c57',
  W: '#f7efe0',
  S: '#d4c6b0',
  P: '#7a5234',
  K: '#4d321f',
  T: '#398a96',
  G: '#e8b948',
  N: '#e0c699',
  M: '#c2a476',
  V: '#8f724a',
  D: '#4a3826',
  B: '#9e8d76',
  L: '#cbbba4',
  U: '#665644',
  C: '#e89b92',
  Y: '#f2e4c9',
  Z: '#4b8f64',
  Q: '#88cfa0',
  I: '#2d5c40',
  J: '#f0e2c2',
  F: '#b38656',
};

const BOAT_PAL = {
  W: '#ede8dc',
  S: '#c4bfb4',
  B: '#2d628f',
  b: '#4b87b8',
  R: '#b83f35',
  r: '#df6256',
  G: '#3d7a5a',
  g: '#5da17d',
  O: '#d99a3e',
  T: '#855836',
  t: '#523420',
  M: '#6e492e',
  K: '#1f2630',
  N: '#4f5d6b',
  Y: '#ffd978',
  C: '#d6cbb8',
  c: '#fff7e8',
  Q: '#9e927f',
};

const POOL_PAL = {
  C: '#eb5e44',
  c: '#ff9678',
  G: '#e0a238',
  g: '#ffd166',
  P: '#d94c8e',
  p: '#ff8cc2',
  T: '#2fa89c',
  t: '#70e0d4',
  K: '#486b32',
  k: '#6d964b',
  D: '#2d4720',
};

function lightMask(w: number, h: number, litRow: number, pattern: string): HTMLCanvasElement {
  const blank = '.'.repeat(w);
  const rows = Array.from({ length: h }, (_, r) => (r === litRow ? pattern.padEnd(w, '.') : blank));
  return pixmap(rows, BOAT_PAL);
}

/** Builds all prop and boat pixel-art sprites once on startup. */
export function buildPropSprites(): PropSprites {
  const umbrella = pixmap(
    [
      '..........AAAA..........',
      '.......AAAARRRRWW.......',
      '.....AAARRRWWWWSSSS.....',
      '...AARRRRRRWWWWSSSSSS...',
      '..AARRRRRRRWWWWSSSSSSS..',
      '.RRRRWWWWWRRRRRWWWWSSSS.',
      '.RRRRWWWWWRRRRRWWWWSSSS.',
      '...........PP...........',
      '...........PK...........',
      '...........PK...........',
      '...........PK...........',
      '...........PK...........',
      '...........PK...........',
      '...........PK...........',
      '...........PK...........',
      '...........PK...........',
      '...........PK...........',
      '...........PK...........',
      '...........PK...........',
      '...........PK...........',
      '..........VPKV..........',
    ],
    BEACH_PAL,
  );

  const towel = pixmap(
    [
      '.TTTTTTTTTTTTTTTTTTTT..',
      'WTTTTTTTTTTTTTTTTTTTTW.',
      'WGGGGGGGGGGGGGGGGGGGGW.',
      'WTTTTTTTTTTTTTTTTTTTTW.',
      'WTTTTTTTTTTTTTTTTTTTTW.',
      'WGGGGGGGGGGGGGGGGGGGGW.',
      'WTTTTTTTTTTTTTTTTTTTTW.',
      '.VVVVVVVVVVVVVVVVVVVV..',
    ],
    BEACH_PAL,
  );

  const sandcastle = pixmap(
    [
      '.N.N..........N.N...',
      '.NMN..........NMN...',
      '.NMM...N.N.N..NMM...',
      '.NMMN..NMMMN..NMM...',
      '.NMMMN.NMMMN.NMMMN..',
      '.NMMMMNNMMMNNMMMMN..',
      '.NMMMMMNMMMNMMMMMV..',
      '.NMMMMMNDDDNMMMMMV..',
      '.NMMMMMNDDDNMMMMMV..',
      'NNMMMMMNDDDNMMMMMVV.',
      'NMMMMMMNDDDNMMMMMVVV',
      'VVVVVVVVVVVVVVVVVVVV',
    ],
    BEACH_PAL,
  );

  const pennant = pixmap(['.PAAAA..', '.PRRRR..', '.PRR....', '.P......', '.P......'], BEACH_PAL);

  const driftwood = pixmap(
    [
      '....LLLL................',
      '..LLBBBBLLL.......LL....',
      '.LBBBBUBBBBBLLLLLLBBL...',
      'LBBBBUUUBBBBUUUBBBBBBU..',
      '.VVVUUUUUVVVUUUUUVVVVV..',
    ],
    BEACH_PAL,
  );

  const shells = [
    pixmap(['.CCC.', 'CCCCC', '.YYY.'], BEACH_PAL),
    pixmap(['..YY.', '.YCY.', 'YYCYY'], BEACH_PAL),
    pixmap(['.YY.', 'YCCY', '.VV.'], BEACH_PAL),
  ];

  const bottleClosed = pixmap(
    ['....ZZZ....', '..ZZQQQZZ..', '.ZQQJJJQQFF', 'ZQQQJJJQQFF', '.ZIIIIIIZ..'],
    BEACH_PAL,
  );
  const bottleOpen = pixmap(
    ['....ZZZ....', '..ZZQQQZZ..', '.ZQQJJJQQ..', 'ZQQQJJJQQ..', '.ZIIIIIIZ..'],
    BEACH_PAL,
  );
  const cork = pixmap(['FF', 'FF'], BEACH_PAL);

  const boatBlue = pixmap(
    [
      '................M..........',
      '................M..........',
      '................M..........',
      '................MN.........',
      '.......WWWWWW...MN.........',
      '......WWKKWKKW..M.N........',
      '......WWWWWWWW..M.N........',
      '......SSSSSSSS..M..N.......',
      '....TTTTTTTTTTTTM..N.......',
      '.bbbbbbbbbbbbbbbbbbbbbb....',
      'bBBBBBBBBBBBBBBBBBBBBBBB...',
      '.BBBBBBBBBBBBBBBBBBBBBB....',
      '..SSSSSSSSSSSSSSSSSSSS.....',
      '...tttttttttttttttttt......',
    ],
    BOAT_PAL,
  );

  const boatRed = pixmap(
    [
      '.........M...............',
      '.........M...............',
      '.........MN..............',
      '.........M.N.....WWWW....',
      '.........M..N...WKKWKW...',
      '.........M..N...WWWWWW...',
      '.........M...N..SSSSSS...',
      '..rrrrrrrrrrrrrrrrrrrrr..',
      '.rRRRRRRRRRRRRRRRRRRRRRr.',
      '..OOOOOOOOOOOOOOOOOOOOO..',
      '...ttttttttttttttttttt...',
    ],
    BOAT_PAL,
  );

  const boatGreen = pixmap(
    [
      '..............M.............',
      '..............M.............',
      '..............M.............',
      '..............MN............',
      '.....WWWWWWW..M.N...........',
      '....WWKKWWKKW.M..N..........',
      '....WWWWWWWWW.M..N..........',
      '....SSSSSSSSS.M...N.........',
      '..TTTTTTTTTTTTTTTTTTT.......',
      '.ggggggggggggggggggggggg....',
      'gGGGGGGGGGGGGGGGGGGGGGGGG...',
      '.GGGGGGGGGGGGGGGGGGGGGGG....',
      '..WWWWWWWWWWWWWWWWWWWWW.....',
      '...ttttttttttttttttttt......',
    ],
    BOAT_PAL,
  );

  const boatBlueLight = lightMask(27, 14, 5, '........YY.YY');
  const boatRedLight = lightMask(25, 11, 4, '.................YY.Y');
  const boatGreenLight = lightMask(28, 14, 5, '......YY..YY');

  const crate = pixmap(
    ['TTTTTTTTTTT', 'TttttTttttT', 'TTTTTTTTTTT', 'TttTttTttTT', 'TTTTTTTTTTT', 'ttttttttttt'],
    BOAT_PAL,
  );

  const crateStack = pixmap(
    [
      '....TTTTTTTTT.....',
      '....TtttTtttT.....',
      '....TTTTTTTTT.....',
      '....TttTttTtT.....',
      'TTTTTTTTTTTTTTTTTT',
      'TttttTttttTTtttTtT',
      'TTTTTTTTTTTTTTTTTT',
      'TttTttTttTTTtTttTT',
      'tttttttttttttttttt',
    ],
    BOAT_PAL,
  );

  const lampPost = pixmap(
    [
      '..KKKK...',
      '.KWWWWK..',
      '.KWWWWK..',
      '..KKKK...',
      '...MM....',
      '...MM....',
      '...MM....',
      '...MM....',
      '...MM....',
      '...MM....',
      '...MM....',
      '...MM....',
      '...MM....',
      '...MM....',
      '...MM....',
      '...MM....',
      '...MM....',
      '...MM....',
      '..tMMt...',
    ],
    BOAT_PAL,
  );

  const bollard = pixmap(
    ['..TTTT..', '.TttttT.', '.TTTTTT.', '..MttM..', '..MttM..', '.NNNNNN.', 'NNNNNNNN', 'NttttttN', '.tttttt.'],
    BOAT_PAL,
  );

  const starfishCoral = pixmap(['...C...', '..CcC..', 'CCcCcCC', '.CCCCC.', '..CCC..', '.CC.CC.', 'C.....C'], POOL_PAL);
  const starfishGold = pixmap(['...G...', '..GgG..', 'GGgGgGG', '.GGGGG.', '..GGG..', '.GG.GG.', 'G.....G'], POOL_PAL);
  const anemonePinkA = pixmap(['.p.p.p.', 'pPpPpPp', '.PPPPP.', '..PPP..'], POOL_PAL);
  const anemonePinkB = pixmap(['p..p..p', '.PpPpP.', '.PPPPP.', '..PPP..'], POOL_PAL);
  const anemoneTealA = pixmap(['.t.t.t.', 'tTtTtTt', '.TTTTT.', '..TTT..'], POOL_PAL);
  const anemoneTealB = pixmap(['t..t..t', '.TtTtT.', '.TTTTT.', '..TTT..'], POOL_PAL);
  const seaweed = pixmap(['.k..k.', 'kK.kK.', '.KkK..', '.KKk..', 'kKKK..', '.DKD..', '.DDD..'], POOL_PAL);

  const sailboatRows = [
    '.............M..............',
    '.............Mc.............',
    '.............Mcc............',
    '............cMccc...........',
    '...........ccMcccC..........',
    '..........cccMccccC.........',
    '.........ccccMccccCC........',
    '........cccccMcccccCC.......',
    '.......ccccccMcccccCCC......',
    '......cccccccMccccccCC......',
    '.....ccccccccMccccccCCC.....',
    '....cccccccccMcccccccCC.....',
    '...CCCCCCCCCCMcccccccQQQ....',
    '..CCCCCCCCCCCMCCCCCCCQQQQ...',
    '.QQQQQQQQQQQQMQQQQQQQQQQQ...',
    '.............M..............',
    '.............M..............',
    '..TTTTTTTTTTTTTTTTTTTTTTTT..',
    '.rRRRRRRRRRRRRRRRRRRRRRRRRr.',
    '..WWWWWWWWWWWWWWWWWWWWWWWW..',
    '...tttttttttttttttttttttt...',
  ];
  const sailboat = pixmap(sailboatRows.map((row) => row.replace(/[cCQ]/g, '.')), BOAT_PAL);
  const sailCloth = pixmap(sailboatRows.map((row) => row.replace(/[^cCQ]/g, '.')), BOAT_PAL);
  const sailboatLight = lightMask(28, 21, 0, '.............Y');

  return {
    umbrella,
    towel,
    sandcastle,
    pennant,
    driftwood,
    shells,
    bottleClosed,
    bottleOpen,
    cork,
    boats: [boatBlue, boatRed, boatGreen],
    boatLights: [boatBlueLight, boatRedLight, boatGreenLight],
    crate,
    crateStack,
    lampPost,
    bollard,
    starfishCoral,
    starfishGold,
    anemonePinkA,
    anemonePinkB,
    anemoneTealA,
    anemoneTealB,
    seaweed,
    sailCloth,
    sailboat,
    sailboatLight,
  };
}
