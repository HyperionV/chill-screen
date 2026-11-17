import { mirrored, pixmap } from '../../journeys/pixmap';

export interface SpriteBox {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
}

export interface DirSprite {
  right: SpriteBox;
  left: SpriteBox;
}

export function makeBox(rows: readonly string[], palette: Readonly<Record<string, string>>): SpriteBox {
  const canvas = pixmap(rows, palette);
  return { canvas, w: canvas.width, h: canvas.height };
}

export function makeDir(rows: readonly string[], palette: Readonly<Record<string, string>>): DirSprite {
  const rightCanvas = pixmap(rows, palette);
  const leftCanvas = mirrored(rightCanvas);
  return {
    right: { canvas: rightCanvas, w: rightCanvas.width, h: rightCanvas.height },
    left: { canvas: leftCanvas, w: leftCanvas.width, h: leftCanvas.height },
  };
}

const FOX_PALETTE: Readonly<Record<string, string>> = {
  o: '#d4622a',
  h: '#eb8846',
  d: '#9c3f18',
  w: '#f5efe6',
  k: '#261b18',
};

const OWL_PALETTE: Readonly<Record<string, string>> = {
  w: '#f3f7fc',
  s: '#c6d5e6',
  g: '#8ea1b8',
  e: '#efb83a',
  k: '#282630',
  y: '#525a66',
};

const DOG_PALETTE: Readonly<Record<string, string>> = {
  b: '#b57b4c',
  h: '#d19866',
  d: '#7d4f2d',
  w: '#efe2ce',
  k: '#241b17',
  r: '#c2403a',
};

const MOOSE_PALETTE: Readonly<Record<string, string>> = {
  b: '#453226',
  h: '#5e4535',
  d: '#2b1e17',
  a: '#c4b299',
  s: '#a0907a',
  w: '#e2edf7',
  k: '#1c1512',
};

const REINDEER_PALETTE: Readonly<Record<string, string>> = {
  g: '#8d847c',
  h: '#b5aca2',
  d: '#5e5650',
  w: '#e6dfd5',
  a: '#c8ba9e',
  s: '#9e9178',
  k: '#241f1c',
};

const FOX_STAND: readonly string[] = [
  '.............k..k...',
  '.............oh.o...',
  '............ooooo...',
  '.ww........oooooo.k.',
  'www.h.....oooooooowk',
  'wwwooo..ohoooooooww.',
  '.woooohoooooooooow..',
  '..dooooooooooooow...',
  '...ddddooooooood....',
  '....dd.dd..dd.dd....',
  '....d...d..d...d....',
  '....k...k..k...k....',
  '....k...k..k...k....',
];

const FOX_TROT_A: readonly string[] = [
  '.............k..k...',
  '.............oh.o...',
  '............ooooo...',
  'ww.........oooooo.k.',
  'wwwhh....ooooooooowk',
  '.wwoooohoooooooooww.',
  '..doooooooooooooow..',
  '...ddddooooooood....',
  '...dd..dd..dd..dd...',
  '..d.....d..d....d...',
  '..k.....k..k....k...',
  '....................',
  '....................',
];

const FOX_TROT_B: readonly string[] = [
  '.............k..k...',
  '.............oh.o...',
  '............ooooo...',
  '.ww........oooooo.k.',
  'www.h.....oooooooowk',
  'wwwooo..ohoooooooww.',
  '..doooooooooooooow..',
  '...ddddooooooood....',
  '.....dd.d..d.dd.....',
  '.....d..d..d..d.....',
  '.....k..k..k..k.....',
  '....................',
  '....................',
];

const FOX_SIT: readonly string[] = [
  '.........k..k...',
  '.........oh.o...',
  '........ooooo...',
  '.......oooooo.k.',
  '.......oooooowk.',
  '......ooooooww..',
  '.....ooooooww...',
  '....ooooooow....',
  '..hhoooooood....',
  '.whooooooddd....',
  'wwwoooood.d.....',
  'wwwoooddd.d.....',
  '.wwdddd.k.k.....',
  '....kkkkk.k.....',
];

const FOX_SNIFF: readonly string[] = [
  '....................',
  '....................',
  '....................',
  '.ww..........k.k....',
  'www.h......ooooo....',
  'wwwooo..ohoooooo....',
  '..doooooooooooooo...',
  '...ddddoooooooodok..',
  '....dd.dd..dd.dd.wk.',
  '....d...d..d...d....',
  '....k...k..k...k....',
  '....................',
];

const FOX_LOOK: readonly string[] = [
  '...........k..k.....',
  '...........o..o.....',
  '..........ooooo.....',
  '.ww......ookoko.....',
  'www.h....oooooow....',
  'wwwooo..ohoooooww...',
  '..doooooooooooow....',
  '...ddddooooooood....',
  '....dd.dd..dd.dd....',
  '....d...d..d...d....',
  '....k...k..k...k....',
  '....................',
];

const FOX_LEAP: readonly string[] = [
  '.............k..k...',
  '.............oh.o...',
  '.ww.........ooooo.k.',
  'www.h......ooooooowk',
  '.wwooooohoooooooow..',
  '..doooooooooooood...',
  '...ddddooooooood....',
  '..dd..........dd....',
  '.d.............d....',
  '.k.............k....',
  '....................',
  '....................',
];

const OWL_FRONT: readonly string[] = [
  '..www...www..',
  '.wwwwwswwwww.',
  '.wgekwswkegw.',
  '.wwsskkkssww.',
  '..wswwwwwsw..',
  '.wwsgwgwgwsww',
  'wwgwwgwgwwgww',
  'wwswwgwgwwsww',
  '.wswwwwwwwsw.',
  '..sssgwgsss..',
  '...sssssss...',
  '....y...y....',
  '...yy...yy...',
];

const OWL_LEFT: readonly string[] = [
  '..www...www..',
  '.wwwwwswwwww.',
  '.ekwwswkwwww.',
  '.kkksswwwwsw.',
  '..wswwwwwsw..',
  '.wwsgwgwgwsww',
  'wwgwwgwgwwgww',
  'wwswwgwgwwsww',
  '.wswwwwwwwsw.',
  '..sssgwgsss..',
  '...sssssss...',
  '....y...y....',
  '...yy...yy...',
];

const OWL_RIGHT: readonly string[] = [
  '..www...www..',
  '.wwwwwswwwww.',
  '.wwwwkwswwke.',
  '.wswwwwsskkk.',
  '..wswwwwwsw..',
  '.wwsgwgwgwsww',
  'wwgwwgwgwwgww',
  'wwswwgwgwwsww',
  '.wswwwwwwwsw.',
  '..sssgwgsss..',
  '...sssssss...',
  '....y...y....',
  '...yy...yy...',
];

const OWL_BLINK: readonly string[] = [
  '..www...www..',
  '.wwwwwswwwww.',
  '.wsgsswsgsgw.',
  '.wwsskkkssww.',
  '..wswwwwwsw..',
  '.wwsgwgwgwsww',
  'wwgwwgwgwwgww',
  'wwswwgwgwwsww',
  '.wswwwwwwwsw.',
  '..sssgwgsss..',
  '...sssssss...',
  '....y...y....',
  '...yy...yy...',
];

const OWL_GLIDE_A: readonly string[] = [
  'gs...............sg',
  'wws.............sww',
  '.wwsg.........gsww.',
  '..wwwwswwwwwswwww..',
  '....sssgwkwgsss....',
  '......sssssss......',
  '.......g.g.g.......',
];

const OWL_GLIDE_B: readonly string[] = [
  '................... ',
  '......swwwwws......',
  '....wwsgwwwgsww....',
  'gs.wwwwswkwswsww.sg',
  'wws...sssssss...sww',
  '.......g.g.g.......',
  '................... ',
].map((r) => r.slice(0, 19));

const DOG_RUN_A: readonly string[] = [
  '...........k..k..',
  '..........bbbb...',
  '.ww......bbbbbk..',
  '.wb.....hbbbbbbk.',
  '..bb..hbbbbbrr...',
  '..bbbbbbbbbbb....',
  '...ddddbbbbd.....',
  '..dd..d...d.dd...',
  '.d............d..',
  '.k............k..',
];

const DOG_RUN_B: readonly string[] = [
  '...........k..k..',
  '..........bbbb...',
  '.ww......bbbbbk..',
  '.wb.....hbbbbbbk.',
  '..bb..hbbbbbrr...',
  '..bbbbbbbbbbb....',
  '...ddddbbbbd.....',
  '....dd.d.d.dd....',
  '.....d.....d.....',
  '.....k.....k.....',
];

const DOG_SIT: readonly string[] = [
  '........k..k..',
  '.......bbbb...',
  '......bbbbbk..',
  '......hbbbbbk.',
  '.....bbbbbbr..',
  '....hbbbbbw...',
  '..w.bbbbbbw...',
  '.wwbbbbbbbw...',
  '..dbbbbbbdd...',
  '...dddbbd.d...',
  '...kkk.kk.k...',
];

const MOOSE_STAND: readonly string[] = [
  '...............a..a..s..a.....',
  '..............aa.aa.sa.aa.....',
  '...............aaaaaaaaa......',
  '................sssssss.......',
  '..................bbbbb.......',
  '......wwwww......bbbbbbb......',
  '....wwwwwwhbbbb.bbbbbbbbb.....',
  '..wwwhhhbbbbbbbbbbbbbbkbbb....',
  '.whhbbbbbbbbbbbbbbbbbbbbbbb...',
  '.bbbbbbbbbbbbbbbbbbbbbbbbbb...',
  '..bbbbbbbbbbbbbbbbbbddddbbb...',
  '..ddbbbbbbbbbbbbbbb.dd........',
  '...ddddddddddddddd............',
  '....dd.dd.....dd.dd...........',
  '....dd..d.....dd..d...........',
  '....d...d.....d...d...........',
  '....d...d.....d...d...........',
  '....d...d.....d...d...........',
  '....d...d.....d...d...........',
  '....k...k.....k...k...........',
];

const MOOSE_BROWSE: readonly string[] = [
  '..............................',
  '..............................',
  '..............................',
  '......wwwww..........a..a.s...',
  '....wwwwwwhbbbb.....aa.aasaa..',
  '..wwwhhhbbbbbbbb.....aaaaaa...',
  '.whhbbbbbbbbbbbbbbb...ssss....',
  '.bbbbbbbbbbbbbbbbbbbbbbbbb....',
  '..bbbbbbbbbbbbbbbbbbbbbbbbb...',
  '..ddbbbbbbbbbbbbbbbdddbkbbb...',
  '...ddddddddddddddd..dd.bbbb...',
  '....dd.dd.....dd.dd...........',
  '....dd..d.....dd..d...........',
  '....d...d.....d...d...........',
  '....d...d.....d...d...........',
  '....d...d.....d...d...........',
  '....d...d.....d...d...........',
  '....k...k.....k...k...........',
];

const MOOSE_ALERT: readonly string[] = [
  '...............a..a..s..a.....',
  '..............aa.aa.sa.aa.....',
  '...............aaaaaaaaa......',
  '................sssssss.......',
  '.................kbbbbb.......',
  '......wwwww.....bbbbbbbbb.....',
  '....wwwwwwhbbbb.bbbbbbkbbb....',
  '..wwwhhhbbbbbbbbbbbbbbbbbbb...',
  '.whhbbbbbbbbbbbbbbbbbbddbbb...',
  '.bbbbbbbbbbbbbbbbbbbbb........',
  '..bbbbbbbbbbbbbbbbbb..........',
  '..ddbbbbbbbbbbbbbbb...........',
  '...ddddddddddddddd............',
  '....dd.dd.....dd.dd...........',
  '....dd..d.....dd..d...........',
  '....d...d.....d...d...........',
  '....d...d.....d...d...........',
  '....d...d.....d...d...........',
  '....d...d.....d...d...........',
  '....k...k.....k...k...........',
];

const REINDEER_WATCH: readonly string[] = [
  '..........a...a...a.....',
  '...........a.aa..aa.....',
  '............aasaas......',
  '.............ggggg......',
  '............gggggggk....',
  '............wwgggggg....',
  '...........wwwwgggg.....',
  '...hh.....wwwwwwg.......',
  '..hggggggggwwwwg........',
  '.wggggggggggwwgg........',
  '.ggggggggggggggg........',
  '..ddgggggggggddd........',
  '...dd.dd...dd.dd........',
  '...d...d...d...d........',
  '...d...d...d...d........',
  '...d...d...d...d........',
  '...k...k...k...k........',
];

const REINDEER_GRAZE: readonly string[] = [
  '........................',
  '........................',
  '........................',
  '........................',
  '...hh...................',
  '..hggggggggww.....a.a...',
  '.wgggggggggwww...aa.aa..',
  '.gggggggggggwww...aas...',
  '..ddggggggggggwwggggg...',
  '...dd.dd...dd.ddgggggk..',
  '...d...d...d...d.gggg...',
  '...d...d...d...d........',
  '...d...d...d...d........',
  '...k...k...k...k........',
];

export function buildAnimalSprites() {
  return {
    fox: {
      stand: makeDir(FOX_STAND, FOX_PALETTE),
      trotA: makeDir(FOX_TROT_A, FOX_PALETTE),
      trotB: makeDir(FOX_TROT_B, FOX_PALETTE),
      sit: makeDir(FOX_SIT, FOX_PALETTE),
      sniff: makeDir(FOX_SNIFF, FOX_PALETTE),
      look: makeDir(FOX_LOOK, FOX_PALETTE),
      leap: makeDir(FOX_LEAP, FOX_PALETTE),
    },
    owl: {
      front: makeBox(OWL_FRONT, OWL_PALETTE),
      left: makeBox(OWL_LEFT, OWL_PALETTE),
      right: makeBox(OWL_RIGHT, OWL_PALETTE),
      blink: makeBox(OWL_BLINK, OWL_PALETTE),
      glideA: makeDir(OWL_GLIDE_A, OWL_PALETTE),
      glideB: makeDir(OWL_GLIDE_B, OWL_PALETTE),
    },
    dog: {
      runA: makeDir(DOG_RUN_A, DOG_PALETTE),
      runB: makeDir(DOG_RUN_B, DOG_PALETTE),
      sit: makeDir(DOG_SIT, DOG_PALETTE),
    },
    moose: {
      stand: makeDir(MOOSE_STAND, MOOSE_PALETTE),
      browse: makeDir(MOOSE_BROWSE, MOOSE_PALETTE),
      alert: makeDir(MOOSE_ALERT, MOOSE_PALETTE),
    },
    reindeer: {
      watch: makeDir(REINDEER_WATCH, REINDEER_PALETTE),
      graze: makeDir(REINDEER_GRAZE, REINDEER_PALETTE),
    },
  };
}
