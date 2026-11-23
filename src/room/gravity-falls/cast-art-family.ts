import {
  INK, SKIN, SKIN_SHADE, WHITE, buildPerson, composeFloating, replaceRows,
  type CastSet, type LegSet, type Palette,
} from './cast-kit';
import type { CastSprites } from './types';

export type FamilyId = 'dipper' | 'mabel' | 'stan' | 'soos' | 'wendy' | 'waddles' | 'bill';

/** Dipper: blue cap with a pine mark, brown fringe, orange shirt under a navy vest. Act: reads his red journal. */
function dipper(): CastSprites {
  const palette: Palette = {
    k: INK, c: '#3a74c4', w: WHITE, g: '#3c9a58', h: '#6a4326', s: SKIN, d: SKIN_SHADE,
    o: '#e4602e', n: '#26365c', p: '#2e3040', r: '#b8322c',
  };
  const upper = [
    '...kkkkk...',
    '..kcccccck.',
    '..kcwgwcck.',
    '..kcwwwcck.',
    '..kccccccck',
    '..khhhhhk..',
    '..hsssksk..',
    '..hsssssdk.',
    '...kssssk..',
    '..knooonk..',
    '.konnoonok.',
    '.ksnnoonsk.',
    '.kdnnoonnk.',
    '..knnnnnnk.',
    '..knnnnnk..',
  ];
  const actUpper = replaceRows(upper, {
    11: '.ksnnoorrrk',
    12: '.kdnnorwwrk',
    13: '..knnnrwwrk',
  });
  const standLegs = [
    '..kpppppk..',
    '..kpppppk..',
    '..kppkppk..',
    '...sd.sd...',
    '...ss.ss...',
    '..kwwk.kwwk',
    '..kkkk.kkkk',
  ];
  const legs: LegSet = [
    standLegs,
    replaceRows(standLegs, { 3: '..ss...ss..', 4: '.ss....ss..', 5: '.kwwk..kwwk', 6: '.kkkk..kkkk' }),
    replaceRows(standLegs, { 5: '..kwwk..kwk', 6: '..kkkk..kkk' }),
  ];
  return buildPerson({ width: 11, palette, upper, actUpper, legs });
}

/** Mabel: wavy hair with a headband, a chunky pink and purple sweater, pink skirt. Act: arms thrown up with glee. */
function mabel(): CastSprites {
  const palette: Palette = {
    k: INK, h: '#7c4a2a', b: '#ee6aa6', s: SKIN, d: SKIN_SHADE, w: WHITE, m: '#9a58c6',
    p: '#f27cb8', y: '#f7dc50', P: '#e0689c', v: '#7a46a0',
  };
  const upper = [
    '....kkkk....',
    '...kkkkkk...',
    '..khhhhhhk..',
    '.khhbbbbhhk.',
    '.khhssssshk.',
    '.khhsskssdk.',
    '.khhssswwsk.',
    '.khhhhkssk..',
    '.khhhmmmmmk.',
    '.khmmmpmymmk',
    '.kmmmpppmmmk',
    '.kmmmmpmmmsk',
    '..kmmmmmmsk.',
    '..kPPPPPPk..',
    '.kPPPPPPPPk.',
  ];
  const actUpper = replaceRows(upper, {
    0: 'y...kkkk...y',
    1: 's..kkkkkk..s',
    2: 's.khhhhhhk.s',
    3: 'mkhhbbbbhhkm',
    4: 'mkhhssssshkm',
    5: 'mkhhsskssdkm',
    6: 'mkhhssswwskm',
    7: 'mkhhhhkssk.m',
    8: '.mmhhmmmmmm.',
    9: '.kmmmpmymmk.',
    10: '.kmmmpppmmk.',
    11: '.kmmmmpmmmk.',
    12: '..kmmmmmmk..',
  });
  const standLegs = [
    '.kPPkPPkPPk.',
    '...ss..ss...',
    '...ss..ss...',
    '...ss..ss...',
    '...ss..ss...',
    '..kvvk.kvvk.',
    '..kkkk.kkkk.',
  ];
  const legs: LegSet = [
    standLegs,
    replaceRows(standLegs, {
      1: '..ss....ss..', 2: '..ss....ss..', 3: '.ss......ss.', 4: '.ss......ss.',
      5: '.kvvk...kvvk', 6: '.kkkk...kkkk',
    }),
    replaceRows(standLegs, { 5: '..kvvk..kvk.', 6: '..kkkk..kkk.' }),
  ];
  return buildPerson({ width: 12, palette, upper, actUpper, legs });
}

/** Stan: tall fez with a tassel, round belly in a black jacket, grey stubble. Act: arms folded, chin up. */
function stan(): CastSprites {
  const palette: Palette = {
    k: INK, f: '#c8302e', F: '#962024', t: '#e8c444', s: SKIN, d: SKIN_SHADE, g: '#8a8a92',
    j: '#2a2a34', J: '#444458', w: WHITE,
  };
  const upper = [
    '......kkk......',
    '.....kfffkt....',
    '....kfffffkt...',
    '....kffffFkt...',
    '...kFFFFFFFk...',
    '...ksssssssk...',
    '...ksssskssk...',
    '...kssssssdk...',
    '...kgggggggk...',
    '....kgggggk....',
    '...kjjwwwjjk...',
    '..kjjjwwwjjjk..',
    '.kjjjjwwwjjjjk.',
    '.ksjjjwwwjjjsk.',
    'kjjjjjjwwjjjjjk',
    'kjJjjjjwwjjjjjk',
    'kjjjjjjjjjjjjjk',
    '.kjjjjjjjjjjjk.',
    '..kjjjjjjjjjk..',
    '..kkkkkkkkkkk..',
  ];
  const actUpper = replaceRows(upper, {
    9: '....kgggggkk...',
    13: '.kjjjjwwwjjjjk.',
    14: 'kjjsssssssjjjjk',
    15: 'kjjjjjjjjjjjjjk',
  });
  const standLegs = [
    '...kjjk.kjjk...',
    '...kjjk.kjjk...',
    '...kjjk.kjjk...',
    '...kjjk.kjjk...',
    '..kkkkkk.kkkkk.',
    '...kkkk..kkkk..',
  ];
  const legs: LegSet = [
    standLegs,
    replaceRows(standLegs, {
      1: '...kjjk..kjjk..', 2: '..kjjk....kjjk.', 3: '..kjjk....kjjk.',
      4: '.kkkkkk...kkkkk', 5: '..kkkk....kkkk.',
    }),
    replaceRows(standLegs, { 3: '...kjjk..kjk...', 4: '..kkkkkk.kkkk..', 5: '...kkkk..kkk...' }),
  ];
  return buildPerson({ width: 15, palette, upper, actUpper, legs });
}

/** Soos: brown cap, round friendly face, green T-shirt with a white question mark. Act: a big thumbs up. */
function soos(): CastSprites {
  const palette: Palette = {
    k: INK, c: '#6a4a2a', s: SKIN, g: '#4ca05a', w: WHITE, p: '#7a5638', b: '#3a2a22',
  };
  const upper = [
    '.....kkkkkk.....',
    '....kccccccck...',
    '...kccccccccck..',
    '...kccccccccccck',
    '....ksssssssk...',
    '....ksskssksk...',
    '....kssssssssk..',
    '....ksskkkksk...',
    '.....kssssssk...',
    '..kggggggggggk..',
    '.kgggggwwgggggk.',
    '.kggggwggwggggk.',
    '.kggggggwgggggk.',
    '.kggggggwgggggk.',
    '.kggggggggggggk.',
    '.kggggggwgggggk.',
    '.kggggggggggggk.',
    '.kssggggggggssk.',
    '.kssggggggggssk.',
    '..kggggggggggk..',
    '..kppppppppppk..',
  ];
  const actUpper = replaceRows(upper, {
    9: '..kggggggggggk.s',
    10: '.kgggggwwgggggss',
    11: '.kggggwggwggggss',
    17: '.kssggggggggggk.',
    18: '.kssggggggggggk.',
  });
  const standLegs = [
    '...kpppppppppk..',
    '...kpppkkpppk...',
    '...kppk..kppk...',
    '...kppk..kppk...',
    '...kppk..kppk...',
    '..kbbbbk.kbbbbk.',
    '..kkkkkk.kkkkkk.',
  ];
  const legs: LegSet = [
    standLegs,
    replaceRows(standLegs, {
      2: '..kppk....kppk..', 3: '..kppk....kppk..', 4: '.kppk......kppk.',
      5: '.kbbbbk..kbbbbk.', 6: '.kkkkkk..kkkkkk.',
    }),
    replaceRows(standLegs, { 5: '...kbbbk.kbbbk..', 6: '...kkkkk.kkkkk..' }),
  ];
  return buildPerson({ width: 16, palette, upper, actUpper, legs });
}

/** Wendy: green trapper hat, long red-orange hair, plaid flannel over a tee, jeans. Act: leaning back, arms crossed, one boot up. */
function wendy(): CastSprites {
  const palette: Palette = {
    k: INK, G: '#3a7a46', g: '#2a5a34', r: '#d8602a', s: SKIN, d: SKIN_SHADE, p: '#c63a34',
    b: '#26262c', w: WHITE, j: '#4a6a9c', o: '#5a3a28',
  };
  const upper = [
    '....kkkk....',
    '...kGGGGk...',
    '..kGGGGGGk..',
    '.kgGGGGGGGk.',
    '.kgrrssssrk.',
    '.krrsskssdk.',
    '.krrrssssdk.',
    '.krrrrkssk..',
    '.krrrrrkkk..',
    '..kppbpbpk..',
    '.kppbpbpbpk.',
    '.kpbpwwpbpk.',
    '.kppbwwbppk.',
    '.kpbpwwpbpk.',
    '.kspbwwbpsk.',
    '.kspbwwbpsk.',
    '..kpbpbpbk..',
    '..kjjjjjjk..',
  ];
  const actUpper = replaceRows(upper, {
    13: '.kpsssssspk.',
    14: '.kpbpbpbpk..',
    15: '.kppbwwbppk.',
  });
  const standLegs = [
    '..kjjjjjjk..',
    '..kjjjjjjk..',
    '..kjjkkjjk..',
    '..kjjkkjjk..',
    '..kjjkkjjk..',
    '..kjjkkjjk..',
    '..kjjk.kjjk.',
    '..kjjk.kjjk.',
    '..kooo.kooo.',
    '..kkkk.kkkk.',
  ];
  const legs: LegSet = [
    standLegs,
    replaceRows(standLegs, {
      3: '..kjjk.kjjk.', 4: '.kjjk..kjjk.', 5: '.kjjk...kjjk', 6: '.kjjk...kjjk',
      7: '.kjjk...kjjk', 8: '.kooo...kooo', 9: '.kkkk...kkkk',
    }),
    replaceRows(standLegs, { 8: '..kooo.kook.', 9: '..kkkk.kkk..' }),
  ];
  const actLegs = replaceRows(standLegs, {
    2: '..kjjk.kjjk.', 3: '..kjjk.kjjk.', 4: '..kjjk.kjjk.', 5: '..kjjk.kjjk.',
    7: '..kjjk.kook.', 8: '..kooo.kkkk.', 9: '..kkkk......',
  });
  return buildPerson({ width: 12, palette, upper, actUpper, legs, actLegs });
}

/** Waddles: a small round pink pig with a bow on one ear. Act: sits up with ears perked. */
function waddles(): CastSprites {
  const palette: Palette = {
    k: INK, p: '#f0a0b0', d: '#cf7a90', h: '#fbc8d2', n: '#e28a9c', b: '#6aa8e8',
  };
  const upper = [
    '.......kkbb...',
    'k.kkkkkkddkk..',
    'kkhhpppppppppk',
    '.kppppppppkpnk',
    '.kddppppppppnk',
    '..kkdddddddkk.',
  ];
  const actUpper = replaceRows(upper, {
    0: '......kkkk.bb.',
    1: '..kkkkkdddkk..',
  });
  const standLegs = [
    '...kpk...kpk..',
    '...kpk...kpk..',
    '...kdk...kdk..',
    '...kkk...kkk..',
  ];
  const legs: LegSet = [
    standLegs,
    ['..kpk.....kpk.', '..kpk.....kpk.', '.kpk.......kpk', '.kkk.......kkk'],
    ['....kpk.kpk...', '....kpk.kpk...', '....kdk.kdk...', '....kkk.kkk...'],
  ];
  const actLegs = ['...kpkkkkkpk..', '....kkppkk....', '....kppppk....', '....kkkkkk....'];
  return buildPerson({ width: 14, palette, upper, actUpper, legs, actLegs });
}

const BILL_WIDTH = 16;
/** The canvas is two rows taller than the drawing so the same triangle can bob a pixel up and down. */
const BILL_HEIGHT = 18;
const BILL_OFFSET_UP = 0;
const BILL_OFFSET_REST = 1;
const BILL_OFFSET_DOWN = 2;

/** Bill: a floating yellow triangle with one big eye, a tiny top hat and a blue bow tie. Act: arms wide, eye big, a faint glow. */
function bill(): CastSprites {
  const palette: Palette = {
    k: INK, y: '#f4d230', Y: '#fff08a', d: '#d8a418', w: WHITE, b: '#3a6ad8', o: '#f08a2a',
  };
  const rows = [
    '.....kkkkkk.....',
    '.....kkkkkk.....',
    '...kkkkkkkkkk...',
    '.......kk.......',
    '......kYyk......',
    '.....kYyyyk.....',
    '.....kywwyk.....',
    '....kywwwwyk....',
    '....kywkkwyk....',
    '...kywwkkwwyk...',
    '...kywwkkwwyk...',
    '..kywwwkkwwwyk..',
    'kkdyyyyyyyyyydkk',
    '.kkkkkbbbbkkkkk.',
    '.....k....k.....',
    '....kk....kk....',
  ];
  const actRows = replaceRows(rows, {
    4: '...o..kYyk..o...',
    6: '..o..kywwyk..o..',
    7: 'k...kwwwwwwk...k',
    8: '.k..kwwkkwwk..k.',
    9: '..kkwwwkkwwwkk..',
    10: '.kkkwwwkkwwwkkk.',
    11: 'kkkwwwwkkwwwwkkk',
  });
  const draw = (source: readonly string[], offsetY: number): HTMLCanvasElement =>
    composeFloating(source, palette, BILL_WIDTH, BILL_HEIGHT, offsetY);
  return {
    stand: draw(rows, BILL_OFFSET_REST),
    step: [draw(rows, BILL_OFFSET_UP), draw(rows, BILL_OFFSET_DOWN)],
    act: draw(actRows, BILL_OFFSET_REST),
  };
}

export function buildFamilyArt(): CastSet<FamilyId> {
  return {
    dipper: dipper(),
    mabel: mabel(),
    stan: stan(),
    soos: soos(),
    wendy: wendy(),
    waddles: waddles(),
    bill: bill(),
  };
}
