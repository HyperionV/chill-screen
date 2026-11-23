import {
  INK, WHITE, buildPerson, composeSprite, replaceRows, shiftRow,
  type CastSet, type LegSet, type Palette,
} from './cast-kit';
import type { CastSprites } from './types';

export type CreatureId = 'gnome-a' | 'gnome-b' | 'gnome-chief' | 'lake-monster';

const GNOME_SKIN = '#f0b890';
const GNOME_SHOES = '#5a3a28';
const GNOME_RED = '#d03a38';
const GNOME_RED_SHADE = '#962a2a';
const BEARD_SHADE = '#c4c8d4';

/** Gnome A: a red pointed hat, a big white beard down to the belt, a blue tunic. Act: arms up, cheering. */
function gnomeA(): CastSprites {
  const palette: Palette = {
    k: INK, r: GNOME_RED, R: GNOME_RED_SHADE, w: WHITE, W: BEARD_SHADE, s: GNOME_SKIN,
    b: '#3a6ac8', g: '#e0b840', S: GNOME_SHOES,
  };
  const upper = [
    '....k....',
    '...krk...',
    '..krrrk..',
    '..krrrrk.',
    '.kRrrrrrk',
    '.kkssssk.',
    '.kwwsswwk',
    '.kwwwwwwk',
    '..kwWwWk.',
    '.kbbwwwbk',
    '.kggggggk',
  ];
  const actUpper = replaceRows(upper, { 5: 'skkssssks', 6: 'sbwwsswbs', 7: '.bwwwwwwb' });
  const legs: LegSet = [
    ['.kSk.kSk.', '.kkk.kkk.'],
    ['kSk...kSk', 'kkk...kkk'],
    ['..kSkSk..', '..kkkkk..'],
  ];
  return buildPerson({ width: 9, palette, upper, actUpper, legs });
}

/** Gnome B: a chubbier gnome, hat flopped over, white beard, green tunic. Act: arms up, cheering. */
function gnomeB(): CastSprites {
  const palette: Palette = {
    k: INK, r: GNOME_RED, R: GNOME_RED_SHADE, w: WHITE, W: BEARD_SHADE, s: GNOME_SKIN,
    G: '#4ca85a', D: '#2f7a3c', S: GNOME_SHOES,
  };
  const upper = [
    '.....kkk..',
    '....krrrk.',
    '..kkrrrk..',
    '.krrrrrrk.',
    '.kRRrrrrrk',
    '.kkssssskk',
    'kwwwsswwwk',
    'kwwwwwwwwk',
    '.kwWwwWwk.',
    'kGGGwwwGGk',
    'kDDDDDDDDk',
  ];
  const actUpper = replaceRows(upper, { 5: 'skksssssks', 6: 'sGwwsswwGs', 7: '.GwwwwwwGk' });
  const legs: LegSet = [
    ['..kSk.kSk.', '..kkk.kkk.'],
    ['.kSk...kSk', '.kkk...kkk'],
    ['..kSkkSk..', '..kkkkkk..'],
  ];
  return buildPerson({ width: 10, palette, upper, actUpper, legs });
}

/** Gnome chief: a tall hat with a gold band, a longer beard, a purple tunic with a gold belt. Act: arms up, cheering. */
function gnomeChief(): CastSprites {
  const palette: Palette = {
    k: INK, r: GNOME_RED, R: GNOME_RED_SHADE, y: '#f0c840', w: WHITE, W: BEARD_SHADE, s: GNOME_SKIN,
    P: '#8a4ac0', S: GNOME_SHOES,
  };
  const upper = [
    '.....k.....',
    '....krk....',
    '...krrrk...',
    '...kRrrk...',
    '..krrrrrk..',
    '..kyyyyyk..',
    '.kkssssskk.',
    '.kwwssswwk.',
    '.kwwwwwwwk.',
    '.kwwwwwwwk.',
    '..kwWwwWwk.',
    '.kPPwwwwPPk',
    '.kPPPwwwPPk',
    '.kyyyyyyyyk',
  ];
  const actUpper = replaceRows(upper, { 6: 'skkssssskks', 7: 'sPwwssswwPs' });
  const legs: LegSet = [
    ['..kSk.kSk..', '..kkk.kkk..'],
    ['.kSk...kSk.', '.kkk...kkk.'],
    ['...kSkkSk..', '...kkkkkk..'],
  ];
  return buildPerson({ width: 11, palette, upper, actUpper, legs });
}

const MONSTER_WIDTH = 34;
/** The neck and head sway; the humps and water below this row stay put. */
const MONSTER_SWAY_ROWS = 13;
const MONSTER_NECK = 'kghgGk';
/** Where each neck row starts from the left edge: row 7 at the head, down the S-curve to row 17 at the water. */
const MONSTER_NECK_STARTS = [24, 23, 21, 19, 17, 16, 15, 15, 16, 17, 17];
const MONSTER_HEAD_START = 22;

const MONSTER_HEAD = [
  '.kkkkkkk..',
  'kgghggggkk',
  'kgggegegk.',
  'kgggwkwkgk',
  '.kkggggkk.',
  '...kggk...',
];
/** Head tilted up with the mouth open. */
const MONSTER_HEAD_ACT = [
  '..kkkkkkkk',
  '.kgghggggk',
  'kggegegggk',
  'kwkwkwkgkk',
  'kgGGGGGGgk',
  '.kkgggggk.',
];

/** One row placed `start` pixels from the left edge and padded to the full width. */
function monsterRow(start: number, body: string): string {
  return `${'.'.repeat(start)}${body}`.padEnd(MONSTER_WIDTH, '.');
}

/** Two humps in the water, the base of the neck, and a line of pale ripples on the bottom row. */
const MONSTER_WATER = [
  monsterRow(15, 'kggghgGGkkgggk.kggk'),
  monsterRow(13, 'kgghgggggggGGggggGGgk'),
  monsterRow(12, 'kGGGGGGGGGGGGGGGGGGGGk'),
  '.fFFf....fFFf....fFFf....fFFf..fF.',
];

function monsterRows(head: readonly string[], sway: -1 | 0 | 1): readonly string[] {
  const rows = [
    monsterRow(0, ''),
    ...head.map((row) => monsterRow(MONSTER_HEAD_START, row)),
    ...MONSTER_NECK_STARTS.map((start) => monsterRow(start, MONSTER_NECK)),
    ...MONSTER_WATER,
  ];
  if (sway === 0) return rows;
  return rows.map((row, index) => (index < MONSTER_SWAY_ROWS ? shiftRow(row, sway) : row));
}

/** The lake monster: a long green neck in an S curve out of the water, a toothy smile, two humps. It sways instead of walking. */
function lakeMonster(): CastSprites {
  const palette: Palette = {
    k: INK, g: '#4aa060', G: '#2c7040', h: '#82d098', w: WHITE, e: '#10241a', f: '#bfe4f0', F: '#8cb8d8',
  };
  const draw = (head: readonly string[], sway: -1 | 0 | 1): HTMLCanvasElement =>
    composeSprite(monsterRows(head, sway), [], palette, MONSTER_WIDTH);
  return {
    stand: draw(MONSTER_HEAD, 0),
    step: [draw(MONSTER_HEAD, -1), draw(MONSTER_HEAD, 1)],
    act: draw(MONSTER_HEAD_ACT, 0),
  };
}

export function buildCreatureArt(): CastSet<CreatureId> {
  return {
    'gnome-a': gnomeA(),
    'gnome-b': gnomeB(),
    'gnome-chief': gnomeChief(),
    'lake-monster': lakeMonster(),
  };
}
