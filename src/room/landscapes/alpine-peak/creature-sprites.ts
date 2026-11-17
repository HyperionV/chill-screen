import { mirrored, pixmap } from '../../journeys/pixmap';

export interface SpriteBox {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
}

export interface DirectedSprite {
  right: SpriteBox;
  left: SpriteBox;
}

export interface CreatureSprites {
  ibex: {
    stand: DirectedSprite;
    walk: DirectedSprite;
    graze: DirectedSprite;
    leap: DirectedSprite;
    rest: DirectedSprite;
  };
  climberPlant: SpriteBox;
  climberLeadA: DirectedSprite;
  climberLeadB: DirectedSprite;
  climberFollowA: DirectedSprite;
  climberFollowB: DirectedSprite;
  marmotSit: DirectedSprite;
  marmotDuck: DirectedSprite;
  marmotRunA: DirectedSprite;
  marmotRunB: DirectedSprite;
  eagleGlide: DirectedSprite;
  eagleUp: DirectedSprite;
  eagleDown: DirectedSprite;
  eagleSoar: DirectedSprite;
}

export function spriteBox(canvas: HTMLCanvasElement): SpriteBox {
  return { canvas, w: canvas.width, h: canvas.height };
}

function directed(rows: readonly string[], palette: Readonly<Record<string, string>>): DirectedSprite {
  const rightCanvas = pixmap(rows, palette);
  return {
    right: spriteBox(rightCanvas),
    left: spriteBox(mirrored(rightCanvas)),
  };
}

const IBEX_PALETTE: Record<string, string> = {
  H: '#3a322e',
  h: '#6e6056',
  D: '#584232',
  d: '#463428',
  B: '#9e7a56',
  b: '#7a5c3e',
  C: '#dcc8aa',
  e: '#181414',
  k: '#26201e',
  t: '#423228',
};

const IBEX_STAND_ROWS = [
  '......HHHH............',
  '....HHh..hH...........',
  '...Hh......H..........',
  '..Hh........H.........',
  '..H..........H........',
  '..............Hh.e....',
  '.............bbBBb....',
  '............bbBBeBb...',
  '...........b.bbbbbbb..',
  '...dDDDDDDDDBBBBBb....',
  '..tBBBBBBBBBBBBBb.....',
  '...BCCCCCCCCCCCb......',
  '...bb.bb....bb.bb.....',
  '...b...b....b..b......',
  '...b...b....b..b......',
  '...k...k....k..k......',
  '......................',
];

const IBEX_WALK_ROWS = [
  '......HHHH............',
  '....HHh..hH...........',
  '...Hh......H..........',
  '..Hh........H.........',
  '..H..........H........',
  '..............Hh.e....',
  '.............bbBBb....',
  '............bbBBeBb...',
  '...........b.bbbbbbb..',
  '...dDDDDDDDDBBBBBb....',
  '..tBBBBBBBBBBBBBb.....',
  '...BCCCCCCCCCCCb......',
  '...bb..bb..bb..bb.....',
  '..b.....b..b....b.....',
  '..b.....b..b.....b....',
  '..k.....k..k.....k....',
  '......................',
];

const IBEX_GRAZE_ROWS = [
  '........HHHH..........',
  '......HHh..hH.........',
  '.....Hh......H........',
  '....Hh........H.......',
  '...............H......',
  '................Hh....',
  '................eBBb..',
  '....dDDDDDDBBBbbbBBb..',
  '...tBBBBBBBBBBBBbeBb..',
  '....BCCCCCCCCCCbbbbb..',
  '....bb.bb....bb.b.....',
  '....b...b....b..b.....',
  '....b...b....b..b.....',
  '....k...k....k..k.....',
  '......................',
  '......................',
  '......................',
];

const IBEX_LEAP_ROWS = [
  '......HHHH............',
  '....HHh..hH...........',
  '...Hh......H..........',
  '..Hh........H.........',
  '..H..........H........',
  '..............Hh.e....',
  '.............bbBBb....',
  '............bbBBeBb...',
  '...dDDDDDDDDBBBBBbbb..',
  '..tBBBBBBBBBBBBBb.....',
  '...BCCCCCCCCCCCB......',
  '..bb..b......bb.bb....',
  '.b...b........b..b....',
  '.k...k........k..k....',
  '......................',
  '......................',
  '......................',
];

const IBEX_REST_ROWS = [
  '......................',
  '......................',
  '.......HHHH...........',
  '.....HHh..hH..........',
  '....Hh......H.........',
  '...Hh........H........',
  '..............Hh.e....',
  '.............bbBBb....',
  '............bbBBeBb...',
  '...........b.bbbbbbb..',
  '....dDDDDDDDDBBBBBb...',
  '...tBBBBBBBBBBBBBBb...',
  '...bBCCCCCCCCCCCCb....',
  '....bbbbbbbbbbbbbb....',
  '......................',
  '......................',
  '......................',
];

const CLIMBER_PLANT_PALETTE: Record<string, string> = {
  H: '#e6b83a',
  h: '#b88222',
  G: '#2a3648',
  F: '#e8c09c',
  S: '#66d0d8',
  R: '#e65242',
  r: '#c2362a',
  d: '#86201a',
  K: '#5a6678',
  k: '#3c4452',
  P: '#343c4c',
  p: '#222834',
  B: '#281e1a',
};

const CLIMBER_PLANT_ROWS = [
  '......HHHH......',
  '.....HhhhHH.....',
  '.....GGGGFF.....',
  '.....FFFFFF.....',
  '....SSSSSSSS....',
  '...KKRRRRRRrr...',
  '..KKKRRRRRRRRr..',
  '..KKkRRRRRRRdd..',
  '..kkKRRRRRRddd..',
  '...kkRRRRRRdd...',
  '....RRRRRRdd....',
  '....rrrrrrrr....',
  '.....PPPPpp.....',
  '.....PPPPpp.....',
  '.....PPP.ppp....',
  '.....PPP.ppp....',
  '.....PP...pp....',
  '.....PP...pp....',
  '.....PP...pp....',
  '.....PP...pp....',
  '.....BB...BB....',
  '....BBB...BBB...',
  '................',
  '................',
  '................',
];

const CLIMBER_LEAD_PALETTE: Record<string, string> = {
  H: '#f06244',
  h: '#b83c26',
  G: '#283446',
  F: '#e8c09c',
  B: '#3e8cc8',
  b: '#2a669a',
  d: '#1b446c',
  K: '#d85c38',
  k: '#9a3a22',
  P: '#2c3442',
  p: '#1c222c',
  I: '#c8d6e4',
  w: '#664830',
  M: '#1e1816',
};

const CLIMBER_LEAD_A_ROWS = [
  '.....HHHH.......',
  '....HhhhHH......',
  '....GGGGFF......',
  '....FFFFFF......',
  '...KKBBBBBb.....',
  '..KKKBBBBBBb..II',
  '..KKkBBBBBBd..w.',
  '..kkKBBBBBBd.w..',
  '...kkBBBBddd.w..',
  '....BBBBddd.w...',
  '....bbbbbbb.w...',
  '.....PPPPpp.....',
  '.....PPPPpp.....',
  '....PPPP.ppp....',
  '....PPP...ppp...',
  '...PPP.....pp...',
  '...PP......pp...',
  '...PP......pp...',
  '...MM......MM...',
  '..MMM......MMM..',
  '................',
  '................',
  '................',
  '................',
];

const CLIMBER_LEAD_B_ROWS = [
  '.....HHHH.......',
  '....HhhhHH......',
  '....GGGGFF......',
  '....FFFFFF......',
  '...KKBBBBBb.....',
  '..KKKBBBBBBb.II.',
  '..KKkBBBBBBd.w..',
  '..kkKBBBBBBd.w..',
  '...kkBBBBddd.w..',
  '....BBBBddd..w..',
  '....bbbbbbb..w..',
  '.....PPPPpp.....',
  '.....PPPPpp.....',
  '.....PPPppp.....',
  '.....PPP.pp.....',
  '.....PP..pp.....',
  '.....PP..pp.....',
  '.....PP..pp.....',
  '.....MM..MM.....',
  '....MMM..MMM....',
  '................',
  '................',
  '................',
  '................',
];

const CLIMBER_FOLLOW_PALETTE: Record<string, string> = {
  H: '#44b89a',
  h: '#2a7c68',
  G: '#283446',
  F: '#e8c09c',
  B: '#eab042',
  b: '#c48628',
  d: '#8a5818',
  K: '#485668',
  k: '#2e3844',
  P: '#2c3442',
  p: '#1c222c',
  w: '#846244',
  M: '#1e1816',
};

const CLIMBER_FOLLOW_A_ROWS = [
  '.....HHHH.......',
  '....HhhhHH......',
  '....GGGGFF......',
  '....FFFFFF......',
  '...KKBBBBBb.....',
  '..KKKBBBBBBb....',
  '..KKkBBBBBBd.w..',
  '..kkKBBBBBBd.w..',
  '...kkBBBBddd.w..',
  '....BBBBddd..w..',
  '....bbbbbbb..w..',
  '.....PPPPpp..w..',
  '.....PPPPpp..w..',
  '....PPPP.ppp.w..',
  '....PPP...pppw..',
  '...PPP.....ppw..',
  '...PP......ppw..',
  '...PP......ppw..',
  '...MM......MMw..',
  '..MMM......MMM..',
  '................',
  '................',
  '................',
  '................',
];

const CLIMBER_FOLLOW_B_ROWS = [
  '.....HHHH.......',
  '....HhhhHH......',
  '....GGGGFF......',
  '....FFFFFF......',
  '...KKBBBBBb.....',
  '..KKKBBBBBBb....',
  '..KKkBBBBBBd.w..',
  '..kkKBBBBBBd.w..',
  '...kkBBBBddd.w..',
  '....BBBBddd..w..',
  '....bbbbbbb..w..',
  '.....PPPPpp..w..',
  '.....PPPPpp..w..',
  '.....PPPppp..w..',
  '.....PPP.pp..w..',
  '.....PP..pp..w..',
  '.....PP..pp..w..',
  '.....PP..pp..w..',
  '.....MM..MM..w..',
  '....MMM..MMM....',
  '................',
  '................',
  '................',
  '................',
];

const MARMOT_PALETTE: Record<string, string> = {
  D: '#4a3626',
  B: '#9e7448',
  b: '#765432',
  C: '#d6ba8e',
  e: '#181412',
};

const MARMOT_SIT_ROWS = [
  '....DDD.....',
  '...DBBBb....',
  '...BBeBCe...',
  '...BBBBCC...',
  '...BBBBBbb..',
  '..bBBCCCbb..',
  '..bBBCCCbbb.',
  '.DBBBBBbbbb.',
  '.DbBBBBbbbb.',
  '..bbbbbbbb..',
  '..bbb..bbb..',
  '..ee....ee..',
  '............',
];

const MARMOT_DUCK_ROWS = [
  '....DDD.....',
  '...DBBBb....',
  '...BBeBCe...',
  '...bbbbbb...',
  '............',
  '............',
  '............',
];

const MARMOT_RUN_A_ROWS = [
  '..............',
  '........DDD...',
  '.......DBBBb..',
  '.DD...BBBeBCe.',
  '..bbBBBBBBCC..',
  '..bBBBBBBbb...',
  '...bb..bb.....',
  '...ee..ee.....',
];

const MARMOT_RUN_B_ROWS = [
  '..............',
  '........DDD...',
  '.......DBBBb..',
  '.DD...BBBeBCe.',
  '..bbBBBBBBCC..',
  '..bBBBBBBbb...',
  '....bb..bb....',
  '....ee..ee....',
];

const EAGLE_PALETTE: Record<string, string> = {
  G: '#d8aa54',
  B: '#5c422e',
  b: '#3c2a1e',
  L: '#8e6a46',
  T: '#c8bea8',
  Y: '#e8b642',
};

const EAGLE_GLIDE_ROWS = [
  '.....................',
  '.....................',
  '...bbbb.......bbbb...',
  '..bBBBBBb...bBBBBBb..',
  '.bBLLLLLLbGbBLLLLLLb.',
  '.bBBBBBBBBGBBBBBBBBY.',
  '..bb..bBBBBBBb..bb...',
  '......TTbbbbTT.......',
  '.......TTTTTT........',
  '.....................',
  '.....................',
];

const EAGLE_UP_ROWS = [
  '.bb...............bb.',
  '.bBBb...........bBBb.',
  '..bBLBb.......bBLBb..',
  '...bBBBb..G..bBBBb...',
  '....bBBBBbGBBBBBY....',
  '.....bbBBBBBBbbb.....',
  '......TTbbbbTT.......',
  '.......TTTTTT........',
  '.....................',
  '.....................',
  '.....................',
];

const EAGLE_DOWN_ROWS = [
  '.....................',
  '.....................',
  '......bGGb...........',
  '.....bBBBBBbY........',
  '....bBLLLLLLb........',
  '...bBBBBBBBBBb.......',
  '..bBBbb.TTbbbbTT.....',
  '.bb.....TTTTTT.......',
  '.....................',
  '.....................',
  '.....................',
];

const EAGLE_SOAR_ROWS = [
  '..bb.............bb..',
  '..bBBb.........bBBb..',
  '...bBLBb..G..bBLBb...',
  '....bBBBBbGBBBBBY....',
  '.....bBBBBBBBBbb.....',
  '......TTbbbbTT.......',
  '.......TTTTTT........',
  '.....................',
  '.....................',
  '.....................',
  '.....................',
];

/** Builds pixel-art creature and climber sprites once on resize. */
export function buildCreatureSprites(): CreatureSprites {
  return {
    ibex: {
      stand: directed(IBEX_STAND_ROWS, IBEX_PALETTE),
      walk: directed(IBEX_WALK_ROWS, IBEX_PALETTE),
      graze: directed(IBEX_GRAZE_ROWS, IBEX_PALETTE),
      leap: directed(IBEX_LEAP_ROWS, IBEX_PALETTE),
      rest: directed(IBEX_REST_ROWS, IBEX_PALETTE),
    },
    climberPlant: spriteBox(pixmap(CLIMBER_PLANT_ROWS, CLIMBER_PLANT_PALETTE)),
    climberLeadA: directed(CLIMBER_LEAD_A_ROWS, CLIMBER_LEAD_PALETTE),
    climberLeadB: directed(CLIMBER_LEAD_B_ROWS, CLIMBER_LEAD_PALETTE),
    climberFollowA: directed(CLIMBER_FOLLOW_A_ROWS, CLIMBER_FOLLOW_PALETTE),
    climberFollowB: directed(CLIMBER_FOLLOW_B_ROWS, CLIMBER_FOLLOW_PALETTE),
    marmotSit: directed(MARMOT_SIT_ROWS, MARMOT_PALETTE),
    marmotDuck: directed(MARMOT_DUCK_ROWS, MARMOT_PALETTE),
    marmotRunA: directed(MARMOT_RUN_A_ROWS, MARMOT_PALETTE),
    marmotRunB: directed(MARMOT_RUN_B_ROWS, MARMOT_PALETTE),
    eagleGlide: directed(EAGLE_GLIDE_ROWS, EAGLE_PALETTE),
    eagleUp: directed(EAGLE_UP_ROWS, EAGLE_PALETTE),
    eagleDown: directed(EAGLE_DOWN_ROWS, EAGLE_PALETTE),
    eagleSoar: directed(EAGLE_SOAR_ROWS, EAGLE_PALETTE),
  };
}
