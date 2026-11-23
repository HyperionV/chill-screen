import {
  INK, SKIN, SKIN_SHADE, WHITE, buildPerson, replaceRows,
  type CastSet, type LegSet, type Palette,
} from './cast-kit';
import type { CastSprites } from './types';

export type TownId = 'mcgucket' | 'blubs' | 'durland' | 'susan' | 'pacifica' | 'gideon';

/** McGucket: scraggly grey beard, patched brown hat, overalls over a stained tee, bare feet. Act: holds up a jug. */
function mcgucket(): CastSprites {
  const palette: Palette = {
    k: INK, h: '#6a4a28', P: '#8a6a3a', s: SKIN, w: WHITE, g: '#aaa8a0', G: '#7e7c78',
    t: '#cdb98a', o: '#4a5c80', j: '#8a5a2a',
  };
  const upper = [
    '....kkkk....',
    '...khhhhk...',
    '..khhhPhhk..',
    '.khhhhhhhhk.',
    '.kkkkkkkkkk.',
    '..ksswkssk..',
    '..kssssssk..',
    '.kgggggggk..',
    '.kgGgggGggk.',
    '..kgggggGgk.',
    '...kgGgGgk..',
    '.kttoooottk.',
    '.kstooooosk.',
    '.ksoooooosk.',
    '..kooooook..',
    '..kooooook..',
    '..kooooook..',
  ];
  const actUpper = replaceRows(upper, {
    10: '...kgGgGgk.j',
    11: '.kttooootkjj',
    12: '.kstooooskjj',
    13: '.kooooooook.',
  });
  const standLegs = [
    '..kooookooo.',
    '..kooo.kooo.',
    '..kooo.kooo.',
    '..kssk.kssk.',
    '..kssk.kssk.',
    '..ksssk.kssk',
    '..kkkkk.kkkk',
  ];
  const legs: LegSet = [
    standLegs,
    replaceRows(standLegs, {
      1: '.kooo...kooo', 2: '.kooo...kooo', 3: '.kssk...kssk', 4: '.kssk...kssk',
      5: '.ksssk..kssk', 6: '.kkkkk..kkkk',
    }),
    replaceRows(standLegs, { 5: '..ksssk.ksk.', 6: '..kkkkk.kkk.' }),
  ];
  return buildPerson({ width: 12, palette, upper, actUpper, legs });
}

/** Blubs: a round officer in a tan uniform, badge on the hat and chest, thick moustache. Act: a salute. */
function blubs(): CastSprites {
  const palette: Palette = {
    k: INK, h: '#9a7a4a', b: '#f0d040', s: SKIN, m: '#4a3a2a', U: '#c8a46a', B: '#2c2c34',
    T: '#7a6240', S: '#2a2a30',
  };
  const upper = [
    '....kkkkkk....',
    '...khhhhhhk...',
    '...khhbhhhk...',
    '..kkkkkkkkkkk.',
    '...ksssssssk..',
    '...ksskssksk..',
    '...ksmmmmmsk..',
    '....ksssssk...',
    '..kUUUUUUUUk..',
    '.kUUUUbUUUUUk.',
    '.kUUUUUUUUUUk.',
    'kUUUUUUUUUUUUk',
    'kUUUUUUUUUUUUk',
    'ksUUUUUUUUUUsk',
    'kUUUUUUUUUUUUk',
    'kUUUUUUUUUUUUk',
    'kBBBBBbbBBBBBk',
    '.kUUUUUUUUUUk.',
    '..kUUUUUUUUk..',
  ];
  const actUpper = replaceRows(upper, {
    3: '..kkkkkkkkkkks',
    4: '...ksssssssk.s',
    5: '...ksskssksk.U',
    6: '...ksmmmmmsk.U',
    7: '....ksssssk..U',
    8: '..kUUUUUUUUkUU',
    13: 'ksUUUUUUUUUUUk',
  });
  const standLegs = [
    '..kTTTTTTTTk..',
    '..kTTTkkTTTk..',
    '..kTTk..kTTk..',
    '..kTTk..kTTk..',
    '..kTTk..kTTk..',
    '..kSSSk.kSSSk.',
    '..kkkkk.kkkkk.',
  ];
  const legs: LegSet = [
    standLegs,
    replaceRows(standLegs, {
      2: '.kTTk...kTTk..', 3: '.kTTk...kTTk..', 4: 'kTTk.....kTTk.',
      5: 'kSSSk....kSSSk', 6: 'kkkkk....kkkkk',
    }),
    replaceRows(standLegs, { 5: '..kSSSk.kSSk..', 6: '..kkkkk.kkk...' }),
  ];
  return buildPerson({ width: 14, palette, upper, actUpper, legs });
}

/** Durland: a lanky officer, too-small hat, wide grin. Act: proud, thumbs on the belt, elbows out. */
function durland(): CastSprites {
  const palette: Palette = {
    k: INK, h: '#9a7a4a', b: '#f0d040', s: SKIN, d: SKIN_SHADE, w: WHITE, U: '#c8a46a',
    B: '#2c2c34', T: '#7a6240', S: '#2a2a30',
  };
  const upper = [
    '....kkkkk....',
    '....khhbk....',
    '...kkkkkkk...',
    '...ksssssk...',
    '...kskssksk..',
    '...kswwwwsk..',
    '...ksssssk...',
    '....ksssk....',
    '..kUUUUUUUk..',
    '..kUUbUUUUk..',
    '.ksUUUUUUUsk.',
    '.ksUUUUUUUsk.',
    '.ksUUUUUUUsk.',
    '.kdUUUUUUUdk.',
    '..kUUUUUUUk..',
    '..kUUUUUUUk..',
    '..kBBBbBBBk..',
    '..kUUUUUUUk..',
    '..kUUUUUUUk..',
    '..kTTTTTTTk..',
    '..kTTTTTTTk..',
  ];
  const actUpper = replaceRows(upper, {
    12: 'kUsUUUUUUUsUk',
    13: 'kUUsUUUUUsUUk',
    14: '.kUUsUUUsUUk.',
    16: '.ksBBBbBBBsk.',
  });
  const standLegs = [
    '..kTTTkTTTk..',
    '..kTTTkTTTk..',
    '..kTTk.kTTk..',
    '..kTTk.kTTk..',
    '..kTTk.kTTk..',
    '..kSSSk.kSSSk',
    '..kkkkk.kkkkk',
  ];
  const legs: LegSet = [
    standLegs,
    replaceRows(standLegs, {
      2: '.kTTk...kTTk.', 3: '.kTTk...kTTk.', 4: 'kTTk.....kTTk',
      5: 'kSSSk...kSSSk', 6: 'kkkkk...kkkkk',
    }),
    replaceRows(standLegs, { 5: '..kSSSk.kSSk.', 6: '..kkkkk.kkk..' }),
  ];
  return buildPerson({ width: 13, palette, upper, actUpper, legs });
}

/** Susan: a waitress with a bun and a paper hat, pink uniform, white apron. Act: carries a tray with a plate. */
function susan(): CastSprites {
  const palette: Palette = {
    k: INK, h: '#8a5a3a', H: WHITE, s: SKIN, d: SKIN_SHADE, P: '#cf6a88', p: '#f08aa8',
    a: '#f6f2ea', T: '#b8b8c0', f: '#e8b060', S: '#3a2a30',
  };
  const upper = [
    '.kkk..kkkk..',
    'khhhk.kHHk..',
    'khhhkkHHHHk.',
    '.kkhhhhhhhk.',
    '..khhsssshk.',
    '..khsskssdk.',
    '..khsssssdk.',
    '..kkssssskk.',
    '..kPppppppk.',
    '.kppaaaappk.',
    '.kspaaaapsk.',
    '.kspaaaapsk.',
    '.kdpaaaapdk.',
    '.kppaaaappk.',
    '.kppaaaappk.',
    '.kpppaaapppk',
    '.kPPPPPPPPk.',
  ];
  const actUpper = replaceRows(upper, {
    10: '.kspaaaaaffk',
    11: '.kspaaaaTTTT',
  });
  const standLegs = [
    '...ss..ss...',
    '...ss..ss...',
    '...ss..ss...',
    '...ss..ss...',
    '...ss..ss...',
    '..kSSk.kSSk.',
    '..kkkk.kkkk.',
  ];
  const legs: LegSet = [
    standLegs,
    replaceRows(standLegs, {
      2: '..ss....ss..', 3: '.ss......ss.', 4: '.ss......ss.', 5: '.kSSk...kSSk', 6: '.kkkk...kkkk',
    }),
    replaceRows(standLegs, { 5: '..kSSk..kSk.', 6: '..kkkk..kkk.' }),
  ];
  return buildPerson({ width: 12, palette, upper, actUpper, legs });
}

/** Pacifica: blond hair with a bow, a pink and lilac dress, pearls, nose tilted up. Act: hand on hip, chin high. */
function pacifica(): CastSprites {
  const palette: Palette = {
    k: INK, y: '#f0d070', Y: '#c8a040', b: '#f070a8', s: SKIN, d: SKIN_SHADE, w: '#faf6ee',
    p: '#f4a0c8', l: '#b8a0e0', L: '#8a70c0', S: '#e8a0c0',
  };
  const upper = [
    '...kkkkkk...',
    '..kyyyyyyk..',
    '.kybbyyyyyk.',
    '.kyyyssssyk.',
    '.kyyssksssk.',
    '.kyysssssdk.',
    '.kyyysssssk.',
    '.kYyyykssk..',
    '..kYywwwwk..',
    '..kpplllppk.',
    '.kspplllppsk',
    '.kspplllppsk',
    '.kdppllllpdk',
    '..kppllllpk.',
    '.kpplllllppk',
    'kppllLllLlpk',
    'kkLLLLLLLLkk',
  ];
  const actUpper = replaceRows(upper, {
    10: 'kssppllllpsk',
    11: 'ks.ppllllpsk',
    12: '.ksppllllpdk',
  });
  const standLegs = [
    '...ss..ss...',
    '...ss..ss...',
    '...ss..ss...',
    '...ss..ss...',
    '...ss..ss...',
    '..kSSk.kSSk.',
    '..kkkk.kkkk.',
  ];
  const legs: LegSet = [
    standLegs,
    replaceRows(standLegs, {
      2: '..ss....ss..', 3: '.ss......ss.', 4: '.ss......ss.', 5: '.kSSk...kSSk', 6: '.kkkk...kkkk',
    }),
    replaceRows(standLegs, { 5: '..kSSk..kSk.', 6: '..kkkk..kkk.' }),
  ];
  return buildPerson({ width: 12, palette, upper, actUpper, legs });
}

/** Gideon: a tall white pompadour on a small man in a light-blue suit and bow tie. Act: a showman pose, arms spread. */
function gideon(): CastSprites {
  const palette: Palette = {
    k: INK, w: '#f4f1ea', W: '#c8c8d4', s: SKIN, t: '#d03a50', b: '#88b8e8', B: '#5a8cc8', S: '#2a3a5a',
  };
  const upper = [
    '.....kkkk...',
    '...kwwwwwk..',
    '..kwwWwwwwk.',
    '..kwwwwwwwk.',
    '..kwwsssswk.',
    '...ksskssk..',
    '...ksssssk..',
    '...kttsttk..',
    '..kbbbbbbbk.',
    '.ksbbbbbbbsk',
    '.ksbBbbbBbsk',
    '..kbbbbbbbk.',
    '..kBBBBBBBk.',
    '..kbbbbbbbk.',
  ];
  const actUpper = replaceRows(upper, {
    8: '.skbbbbbbbks',
    9: 'ssbbbbbbbbss',
    10: '.kbbBbbbBbk.',
  });
  const standLegs = [
    '..kbbkkbbk..',
    '..kbbk.kbbk.',
    '..kbbk.kbbk.',
    '..kbbk.kbbk.',
    '..kSSk.kSSk.',
    '..kkkk.kkkk.',
  ];
  const legs: LegSet = [
    standLegs,
    replaceRows(standLegs, { 2: '.kbbk...kbbk', 3: '.kbbk...kbbk', 4: '.kSSk...kSSk', 5: '.kkkk...kkkk' }),
    replaceRows(standLegs, { 4: '..kSSk..kSk.', 5: '..kkkk..kkk.' }),
  ];
  return buildPerson({ width: 12, palette, upper, actUpper, legs });
}

export function buildTownArt(): CastSet<TownId> {
  return {
    mcgucket: mcgucket(),
    blubs: blubs(),
    durland: durland(),
    susan: susan(),
    pacifica: pacifica(),
    gideon: gideon(),
  };
}
