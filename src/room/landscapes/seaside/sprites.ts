import { pixmap } from '../../journeys/pixmap';
import { buildPropSprites, type PropSprites } from './sprites-props';

export interface SeasideSprites extends PropSprites {
  crabIdle: HTMLCanvasElement;
  crabWalkA: HTMLCanvasElement;
  crabWalkB: HTMLCanvasElement;
  crabWave: HTMLCanvasElement;
  shoreCrabA: HTMLCanvasElement;
  shoreCrabB: HTMLCanvasElement;
  gullStand: HTMLCanvasElement;
  gullPeck: HTMLCanvasElement;
  gullHop: HTMLCanvasElement;
  gullFlyA: HTMLCanvasElement;
  gullFlyB: HTMLCanvasElement;
  heronStand: HTMLCanvasElement;
  heronPeer: HTMLCanvasElement;
  heronStrike: HTMLCanvasElement;
  catSit: HTMLCanvasElement;
  catBlink: HTMLCanvasElement;
  catLick: HTMLCanvasElement;
  catTailWave: HTMLCanvasElement;
  fishLeap: HTMLCanvasElement;
  tinyFishA: HTMLCanvasElement;
  tinyFishB: HTMLCanvasElement;
  dolphinUp: HTMLCanvasElement;
  dolphinDive: HTMLCanvasElement;
}

const CRAB_PAL = {
  R: '#d93d32',
  H: '#ff7b5e',
  D: '#8f201c',
  O: '#f25c3b',
  E: '#1b1d24',
  W: '#fff4e6',
};

const SHORE_CRAB_PAL = {
  B: '#6e643c',
  H: '#998b54',
  D: '#3f3820',
  E: '#1a1c20',
};

const GULL_PAL = {
  W: '#f4f6f8',
  L: '#dce3ea',
  G: '#8f9ba8',
  K: '#262b34',
  B: '#ebb23c',
  E: '#161a20',
};

const HERON_PAL = {
  S: '#7892ab',
  H: '#a5bdd4',
  D: '#4c6278',
  W: '#eef2f5',
  K: '#1e2530',
  B: '#e6b244',
  L: '#5c5944',
};

const CAT_PAL = {
  O: '#d9843b',
  H: '#f0ab63',
  D: '#9c5222',
  W: '#f7ebd9',
  E: '#1f2421',
  N: '#e87d88',
};

const AQUATIC_PAL = {
  F: '#c4d4e0',
  f: '#6284a3',
  A: '#e8a258',
  a: '#9c5a28',
  Z: '#3d6385',
  z: '#6a94b8',
  U: '#c8d6e3',
  E: '#192430',
};

/** Builds all creature and prop pixel-art sprites for the Seaside scenes once on startup. */
export function buildSprites(): SeasideSprites {
  const crabIdle = pixmap(
    [
      '..OO........OO..',
      '.O.OO..EE..OO.O.',
      '.OO.O..WW..O.OO.',
      '..O..HHHHHH..O..',
      '...HRRRRRRRRH...',
      '..RRRRRRRRRRRR..',
      '..RRRRRRRRRRRR..',
      '...DDDDDDDDDD...',
      '..D.D..DD..D.D..',
      '.D..D......D..D.',
      'D...D......D...D',
    ],
    CRAB_PAL,
  );

  const crabWalkA = pixmap(
    [
      '..OO........OO..',
      '.O.OO..EE..OO.O.',
      '.OO.O..WW..O.OO.',
      '..O..HHHHHH..O..',
      '...HRRRRRRRRH...',
      '..RRRRRRRRRRRR..',
      '..RRRRRRRRRRRR..',
      '...DDDDDDDDDD...',
      '.D..D..DD..D..D.',
      'D....D....D....D',
      '.D............D.',
    ],
    CRAB_PAL,
  );

  const crabWalkB = pixmap(
    [
      '..OO........OO..',
      '.O.OO..EE..OO.O.',
      '.OO.O..WW..O.OO.',
      '..O..HHHHHH..O..',
      '...HRRRRRRRRH...',
      '..RRRRRRRRRRRR..',
      '..RRRRRRRRRRRR..',
      '...DDDDDDDDDD...',
      '..D..D.DD.D..D..',
      '.D...D....D...D.',
      '....D......D....',
    ],
    CRAB_PAL,
  );

  const crabWave = pixmap(
    [
      '.OO.............',
      'O..O............',
      'OOOO........OO..',
      '.OO....EE..OO.O.',
      '..O....WW..O.OO.',
      '...O.HHHHHH..O..',
      '...HRRRRRRRRH...',
      '..RRRRRRRRRRRR..',
      '..RRRRRRRRRRRR..',
      '...DDDDDDDDDD...',
      '..D.D..DD..D.D..',
      '.D..D......D..D.',
    ],
    CRAB_PAL,
  );

  const shoreCrabA = pixmap(
    [
      '.B..E..E..B.',
      'BB.HHHHHH.BB',
      '.BHHHHHHHHB.',
      '.BBBBBBBBBB.',
      '..DDDDDDDD..',
      '.D.D....D.D.',
      'D..D....D..D',
    ],
    SHORE_CRAB_PAL,
  );

  const shoreCrabB = pixmap(
    [
      '.B..E..E..B.',
      'BB.HHHHHH.BB',
      '.BHHHHHHHHB.',
      '.BBBBBBBBBB.',
      '..DDDDDDDD..',
      'D..D....D..D',
      '.D..D..D..D.',
    ],
    SHORE_CRAB_PAL,
  );

  const gullStand = pixmap(
    [
      '....WWW.....',
      '...WWEWWBB..',
      '...WWWWW....',
      '..WWWWLL....',
      '.WWWLLLLGG..',
      'WWWWLLLLKKK.',
      '.GGGGGGGG...',
      '....B..B....',
      '....B..B....',
    ],
    GULL_PAL,
  );

  const gullPeck = pixmap(
    [
      '............',
      '............',
      '..WWWWWW....',
      '.WWWLLLLGG..',
      'WWWWLLLLKKK.',
      '.GGGGGGWW...',
      '....B..WWE..',
      '....B..WWBB.',
      '....B....B..',
    ],
    GULL_PAL,
  );

  const gullHop = pixmap(
    [
      '.KK.....KK..',
      'WGGW...WGGW.',
      '.WWWWWWWWW..',
      '..WWWEWWWBB.',
      '...WWLLL....',
      '...GGGGGG...',
      '....B..B....',
    ],
    GULL_PAL,
  );

  const gullFlyA = pixmap(
    [
      'KK........KK',
      'GGW......WGG',
      '.WW......WW.',
      '..WW.WW.WW..',
      '...WWEWWWBB.',
      '....LLLL....',
    ],
    GULL_PAL,
  );

  const gullFlyB = pixmap(
    [
      '............',
      '...WWWWWW...',
      '..WWEWWWBB..',
      '.WW.LLLL.WW.',
      'GG........GG',
      'KK........KK',
    ],
    GULL_PAL,
  );

  const heronStand = pixmap(
    [
      '..KKKK............',
      '.KWWWEWWBBBBBB....',
      '...WWWWW..........',
      '....WWW...........',
      '....WWW...........',
      '....WWW...........',
      '....WWW...........',
      '....WWWW..........',
      '....WWWWW.........',
      '...WWWHHHH........',
      '..WWWSSSSSSH......',
      '..WWSSSSSSSSSH....',
      '..WWSSSSSSSSDD....',
      '...WSSSSSSDDDD....',
      '....SDDDDDDDD.....',
      '.....DDDDDDD......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '.....LLL.LLL......',
    ],
    HERON_PAL,
  );

  const heronPeer = pixmap(
    [
      '..................',
      '..................',
      '..................',
      '......KKKK........',
      '.....KWWWEWWBBBB..',
      '.......WWWWW......',
      '......WWWW........',
      '.....WWWW.........',
      '....WWWWW.........',
      '...WWWHHHH........',
      '..WWWSSSSSSH......',
      '..WWSSSSSSSSSH....',
      '..WWSSSSSSSSDD....',
      '...WSSSSSSDDDD....',
      '....SDDDDDDDD.....',
      '.....DDDDDDD......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '.....LLL.LLL......',
    ],
    HERON_PAL,
  );

  const heronStrike = pixmap(
    [
      '..................',
      '..................',
      '..................',
      '..................',
      '..................',
      '..................',
      '..................',
      '......KKKK........',
      '....WWWWW.........',
      '...WWWHHHH..WW....',
      '..WWWSSSSSSWWEWW..',
      '..WWSSSSSSSSSSBBBB',
      '..WWSSSSSSSSDD..BB',
      '...WSSSSSSDDDD....',
      '....SDDDDDDDD.....',
      '.....DDDDDDD......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '......L...L.......',
      '.....LLL.LLL......',
    ],
    HERON_PAL,
  );

  const catSit = pixmap(
    [
      '..O......O......',
      '.ODO....ODO.....',
      '.OHOOOOOOHO.....',
      '.OOEOWWOEOO.....',
      '.OOOWNNWOOO.....',
      '..OOWWWWOO......',
      '..OOOOOODO......',
      '..OOHHOOODO.....',
      '..OWWOOOODO.....',
      '.OOWWOOOODDO....',
      '.OOWWOOOODDO....',
      '.OOOWOOOODDO.HH.',
      '.OOOWOOOODDOOO..',
      '..OOWWOOODDOO...',
      '..WW.WW..DDD....',
    ],
    CAT_PAL,
  );

  const catBlink = pixmap(
    [
      '..O......O......',
      '.ODO....ODO.....',
      '.OHOOOOOOHO.....',
      '.OODOWWODOO.....',
      '.OOOWNNWOOO.....',
      '..OOWWWWOO......',
      '..OOOOOODO......',
      '..OOHHOOODO.....',
      '..OWWOOOODO.....',
      '.OOWWOOOODDO....',
      '.OOWWOOOODDO....',
      '.OOOWOOOODDO.HH.',
      '.OOOWOOOODDOOO..',
      '..OOWWOOODDOO...',
      '..WW.WW..DDD....',
    ],
    CAT_PAL,
  );

  const catLick = pixmap(
    [
      '..O......O......',
      '.ODO....ODO.....',
      '.OHOOOOOOHO.....',
      '.OODOWWODOO.....',
      '..OOWNNWOO......',
      '..OOWWWWOO......',
      '..OOOWWOODO.....',
      '..OOHHWWODO.....',
      '..OWWOOOODO.....',
      '.OOWWOOOODDO....',
      '.OOWWOOOODDO....',
      '.OOOWOOOODDO.HH.',
      '.OOOWOOOODDOOO..',
      '..OOWWOOODDOO...',
      '..WW.WW..DDD....',
    ],
    CAT_PAL,
  );

  const catTailWave = pixmap(
    [
      '..O......O......',
      '.ODO....ODO.....',
      '.OHOOOOOOHO.....',
      '.OOEOWWOEOO.....',
      '.OOOWNNWOOO.....',
      '..OOWWWWOO......',
      '..OOOOOODO......',
      '..OOHHOOODO.....',
      '..OWWOOOODO...HH',
      '.OOWWOOOODDO..OO',
      '.OOWWOOOODDO.OO.',
      '.OOOWOOOODDOOO..',
      '.OOOWOOOODDOO...',
      '..OOWWOOODDO....',
      '..WW.WW..DDD....',
    ],
    CAT_PAL,
  );

  const fishLeap = pixmap(
    ['...FFFF....', '.FFFFFFFFF.', 'FFffffffFEF', '.ffFFFFFff.', 'f..ffff....'],
    AQUATIC_PAL,
  );
  const tinyFishA = pixmap(['..FFF..', 'FffFEFf', '..fff..'], AQUATIC_PAL);
  const tinyFishB = pixmap(['..AAA..', 'AaaAEAa', '..aaa..'], AQUATIC_PAL);

  const dolphinUp = pixmap(
    [
      '.......zz........',
      '......ZZZ........',
      '....zzzzZZZ......',
      '..zzZZZZZZZZz....',
      '.zZZZUUUUUUZZEzz.',
      'zZZUUUUUUUUUZZZZ.',
      '.UU.........UU...',
    ],
    AQUATIC_PAL,
  );

  const dolphinDive = pixmap(
    [
      '..zz.............',
      '..ZZZz...........',
      '...ZZZZzz..zz....',
      '....UUUUZZZZZZz..',
      '....UU..UUUUZZZEz',
      '..........UUUUZZZ',
    ],
    AQUATIC_PAL,
  );

  return {
    ...buildPropSprites(),
    crabIdle,
    crabWalkA,
    crabWalkB,
    crabWave,
    shoreCrabA,
    shoreCrabB,
    gullStand,
    gullPeck,
    gullHop,
    gullFlyA,
    gullFlyB,
    heronStand,
    heronPeer,
    heronStrike,
    catSit,
    catBlink,
    catLick,
    catTailWave,
    fishLeap,
    tinyFishA,
    tinyFishB,
    dolphinUp,
    dolphinDive,
  };
}
