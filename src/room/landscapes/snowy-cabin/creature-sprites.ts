import { buildAnimalSprites, makeBox, makeDir, type DirSprite, type SpriteBox } from './animal-sprites';

export type { DirSprite, SpriteBox };

const SKATER_PALETTE: Readonly<Record<string, string>> = {
  c: '#a83842', // coat red
  l: '#c94c56', // coat highlight
  d: '#76242c', // coat shadow
  w: '#f2eee6', // cream trim & pom
  y: '#e2b857', // scarf gold
  s: '#ebbfa0', // skin
  k: '#262834', // hair / trousers
  b: '#3b4354', // hat & mittens navy
  m: '#cbd8e6', // steel skate blade
};

const CHILD_PALETTE: Readonly<Record<string, string>> = {
  t: '#3c7692', // parka teal
  l: '#5697b5', // parka light
  d: '#285268', // parka dark
  y: '#e6be58', // scarf & pom
  r: '#b83c38', // sled red
  n: '#6e452b', // sled wood
  m: '#c8d6e4', // runner steel
  s: '#ebbfa0', // face
  k: '#242632', // boots & eyes
  w: '#eef4fa', // snow dust
};

const SKATER_GLIDE_A: readonly string[] = [
  '......www......',
  '.....bbbbb.....',
  '....bbbbbbb....',
  '....wwssskw....',
  '.....sssss.....',
  '.....sssss.....',
  '....yyyyyy.....',
  '..yy.llllc.....',
  'yy...lccccb....',
  '.....lccccd....',
  '.....lccccd....',
  '.....lccccd....',
  '.....cccccc....',
  '.....wwwwww....',
  '.....kk..kk....',
  '....kk....kk...',
  '....kk.....kk..',
  '...kk......kk..',
  '...kk.......kk.',
  '..kk........kk.',
  '..kk........kk.',
  '..bb.........bb',
  '.mmm........mmm',
];

const SKATER_GLIDE_B: readonly string[] = [
  '......www......',
  '.....bbbbb.....',
  '....bbbbbbb....',
  '....wwssskw....',
  '.....sssss.....',
  '.....sssss.....',
  '....yyyyyy.....',
  '..yy.llllc.....',
  'yy...lccccb....',
  '.....lccccd....',
  '.....lccccd....',
  '.....lccccd....',
  '.....cccccc....',
  '.....wwwwww....',
  '.....kk..kk....',
  '.....kk..kk....',
  '.....kk..kk....',
  '.....kk..kk....',
  '.....kk..kk....',
  '.....kk..kk....',
  '.....kk..kk....',
  '.....bb..bb....',
  '....mmm..mmm...',
];

const SKATER_SPIN: readonly string[] = [
  '......www......',
  '.....bbbbb.....',
  '....bbbbbbb....',
  '....wsksksw....',
  '.....sssss.....',
  '.....sssss.....',
  '....yyyyyyy....',
  '.b..lcccccd..b.',
  'bll.lcccccd.ccb',
  '....lcccccd....',
  '....lcccccd....',
  '....lcccccd....',
  '....ccccccc....',
  '....wwwwwww....',
  '.....kk.kk.....',
  '.....kk.kk.....',
  '.....kk.kk.....',
  '.....kk.kk.....',
  '.....kk.kk.....',
  '.....kk.kk.....',
  '.....kk.kk.....',
  '....bb...bb....',
  '...mmm...mmm...',
];

const SKATER_WAVE: readonly string[] = [
  '......www....b.',
  '.....bbbbb...b.',
  '....bbbbbbb.cc.',
  '....wskskswcc..',
  '.....sssss.c...',
  '.....sssss.c...',
  '....yyyyyyc....',
  '...bllllcc.....',
  '..b.lccccd.....',
  '....lccccd.....',
  '....lccccd.....',
  '....lccccd.....',
  '....cccccc.....',
  '....wwwwww.....',
  '.....kk.kk.....',
  '.....kk.kk.....',
  '.....kk.kk.....',
  '.....kk.kk.....',
  '.....kk.kk.....',
  '.....kk.kk.....',
  '.....kk.kk.....',
  '.....bb.bb.....',
  '....mmm.mmm....',
];

const CHILD_SLED: readonly string[] = [
  '........yyy...............',
  '.......ttttt..............',
  '......ttttttt.............',
  '......ssssskt.............',
  '.......sssss..............',
  '.......sssss..............',
  '...yyyyyyyyy..............',
  '.yy..llllttt..............',
  '.....tttttttk.............',
  '.....tttttttd.............',
  '.....tttttdd..............',
  '.....tttttdd..............',
  '.....kkkkktt..............',
  '.....kkkkk.kkk............',
  '.....kkkkk..kk............',
  '....rrrrrrrrrrrrrrrrr...mm',
  '..nnnnnnnnnnnnnnnnnnnn.m..',
  '.w.mm........mm......mm...',
  'wwwwmmmmmmmmmmmmmmmmmm....',
];

const CHILD_WALK_A: readonly string[] = [
  '.....yyy.....',
  '....ttttt....',
  '...ttttttt...',
  '...ssssskt...',
  '....sssss....',
  '....sssss....',
  '..yyyyyyy....',
  '.y.lllttt....',
  '...ttttttd...',
  '...ttttttd...',
  '...tttttdd...',
  '...tttttdd...',
  '...ttttddd...',
  '....kk..kk...',
  '...kk....kk..',
  '..kk......kk.',
  '..kk......kk.',
  '..kk......kk.',
  '.kk........kk',
  '.kk........kk',
];

const CHILD_WALK_B: readonly string[] = [
  '.....yyy.....',
  '....ttttt....',
  '...ttttttt...',
  '...ssssskt...',
  '....sssss....',
  '....sssss....',
  '..yyyyyyy....',
  '.y.lllttt....',
  '...ttttttd...',
  '...ttttttd...',
  '...tttttdd...',
  '...tttttdd...',
  '...ttttddd...',
  '....kk..kk...',
  '....kk..kk...',
  '....kk..kk...',
  '....kk..kk...',
  '....kk..kk...',
  '....kk..kk...',
  '...kk....kk..',
];

const SLED_EMPTY: readonly string[] = [
  '.rrrrrrrrrrrrr..m.',
  'nnnnnnnnnnnnnnnm..',
  '.mm.......mm..m...',
  'mmmmmmmmmmmmmm....',
];

export interface CreatureSprites {
  fox: {
    stand: DirSprite;
    trotA: DirSprite;
    trotB: DirSprite;
    sit: DirSprite;
    sniff: DirSprite;
    look: DirSprite;
    leap: DirSprite;
  };
  owl: {
    front: SpriteBox;
    left: SpriteBox;
    right: SpriteBox;
    blink: SpriteBox;
    glideA: DirSprite;
    glideB: DirSprite;
  };
  skater: {
    glideA: DirSprite;
    glideB: DirSprite;
    spin: SpriteBox;
    wave: DirSprite;
  };
  child: {
    sled: DirSprite;
    walkA: DirSprite;
    walkB: DirSprite;
    emptySled: DirSprite;
  };
  dog: {
    runA: DirSprite;
    runB: DirSprite;
    sit: DirSprite;
  };
  moose: {
    stand: DirSprite;
    browse: DirSprite;
    alert: DirSprite;
  };
  reindeer: {
    watch: DirSprite;
    graze: DirSprite;
  };
}

export function buildCreatureSprites(): CreatureSprites {
  const animals = buildAnimalSprites();
  return {
    ...animals,
    skater: {
      glideA: makeDir(SKATER_GLIDE_A, SKATER_PALETTE),
      glideB: makeDir(SKATER_GLIDE_B, SKATER_PALETTE),
      spin: makeBox(SKATER_SPIN, SKATER_PALETTE),
      wave: makeDir(SKATER_WAVE, SKATER_PALETTE),
    },
    child: {
      sled: makeDir(CHILD_SLED, CHILD_PALETTE),
      walkA: makeDir(CHILD_WALK_A, CHILD_PALETTE),
      walkB: makeDir(CHILD_WALK_B, CHILD_PALETTE),
      emptySled: makeDir(SLED_EMPTY, CHILD_PALETTE),
    },
  };
}
