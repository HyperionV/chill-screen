import { mirrored, pixmap } from '../../journeys/pixmap';
import { buildPeopleSprites } from './people-sprites';

export interface SpriteBox {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
}

export interface CatSprites {
  sit: SpriteBox;
  blink: SpriteBox;
  groomA: SpriteBox;
  groomB: SpriteBox;
  walkA: SpriteBox;
  walkB: SpriteBox;
  watch: SpriteBox;
  sleepA: SpriteBox;
  sleepB: SpriteBox;
  stretch: SpriteBox;
}

export interface PigeonSprites {
  stand: SpriteBox;
  peck: SpriteBox;
  shuffle: SpriteBox;
  flyUp: SpriteBox;
  flyDown: SpriteBox;
}

export interface PersonAnim {
  idle: SpriteBox;
  active: SpriteBox;
}

export interface NeighbourSprites {
  tendA: SpriteBox;
  tendB: SpriteBox;
  waveA: SpriteBox;
  waveB: SpriteBox;
}

export interface CastSprites {
  catRight: CatSprites;
  catLeft: CatSprites;
  pigeonRight: PigeonSprites;
  pigeonLeft: PigeonSprites;
  patrons: readonly PersonAnim[];
  bartender: PersonAnim;
  keeper: PersonAnim;
  neighbour: NeighbourSprites;
  balloons: readonly SpriteBox[];
}

function box(canvas: HTMLCanvasElement): SpriteBox {
  return { canvas, w: canvas.width, h: canvas.height };
}

function flipBox(b: SpriteBox): SpriteBox {
  return box(mirrored(b.canvas));
}

const CAT_PALETTE: Readonly<Record<string, string>> = {
  L: '#c2cad4',
  G: '#8f98a6',
  S: '#6a7280',
  D: '#454b56',
  P: '#e098a0',
  E: '#e2ec84',
  W: '#eef2f8',
};

function buildCatSprites(): { right: CatSprites; left: CatSprites } {
  const sit = box(
    pixmap(
      [
        '....D.....D.....',
        '...DLG...GLD....',
        '...DPGLLLGPD....',
        '...GGGGGGGGG....',
        '...GGEGGGEGG....',
        '...GGGGPGGGG....',
        '....GWWGWWG.....',
        '...DGGGGGGGD....',
        '..DGGLGGGSGGD...',
        '..DGGLGGGSGGD.DD',
        '..DGGGGGGGSGGDGD',
        '..DGGWGGGWGGDGD.',
        '...DWWGGGWWDDD..',
        '...DDDDDDDDD....',
      ],
      CAT_PALETTE,
    ),
  );

  const blink = box(
    pixmap(
      [
        '....D.....D.....',
        '...DLG...GLD....',
        '...DPGLLLGPD....',
        '...GGGGGGGGG....',
        '...GGDGGGDGG....',
        '...GGGGPGGGG....',
        '....GWWGWWG.....',
        '...DGGGGGGGD....',
        '..DGGLGGGSGGD...',
        '..DGGLGGGSGGD.DD',
        '..DGGGGGGGSGGDGD',
        '..DGGWGGGWGGDGD.',
        '...DWWGGGWWDDD..',
        '...DDDDDDDDD....',
      ],
      CAT_PALETTE,
    ),
  );

  const groomA = box(
    pixmap(
      [
        '....D.....D.....',
        '...DLG...GLD....',
        '...DPGLLLGPD....',
        '...GGGGGGGGG....',
        '...GGDGGGDGG....',
        '...GGGGPGGGG....',
        '...DWWGWGGGG....',
        '..DWGGGGGGGD....',
        '..DWWLGGGSGGD...',
        '..DGGLGGGSGGD.DD',
        '..DGGGGGGGSGGDGD',
        '..DGGWGGGWGGDGD.',
        '...DWWGGGWWDDD..',
        '...DDDDDDDDD....',
      ],
      CAT_PALETTE,
    ),
  );

  const groomB = box(
    pixmap(
      [
        '................',
        '....D.....D.....',
        '...DLG...GLD....',
        '...DPGLLLGPD....',
        '...GGGGGGGGG....',
        '...GGEGGGEGG....',
        '...GGWGPGGGG....',
        '..DWWGGGGGGD....',
        '..DGGLGGGSGGD...',
        '..DGGLGGGSGGD.DD',
        '..DGGGGGGGSGGDGD',
        '..DGGWGGGWGGDGD.',
        '...DWWGGGWWDDD..',
        '...DDDDDDDDD....',
      ],
      CAT_PALETTE,
    ),
  );

  const walkA = box(
    pixmap(
      [
        '...........D..D...',
        '..........DLGGLD..',
        '...DD.....GPGGPD..',
        '..DGGD....GGGEGG..',
        '.DG..DDDDDGGGGPGD.',
        '.D..DGGGGGGGGGGWD.',
        '....DGLGSGLGSGGGD.',
        '....DGGGGGGGGGGD..',
        '.....DGGGGGGGGD...',
        '.....DGD....DGD...',
        '....DGD......DGD..',
        '....DW........WD..',
      ],
      CAT_PALETTE,
    ),
  );

  const walkB = box(
    pixmap(
      [
        '...........D..D...',
        '..........DLGGLD..',
        '..DD......GPGGPD..',
        '.DGGD.....GGGEGG..',
        '.D...DDDDDGGGGPGD.',
        '....DGGGGGGGGGGWD.',
        '....DGLGSGLGSGGGD.',
        '....DGGGGGGGGGGD..',
        '.....DGGGGGGGGD...',
        '......DGD..DGD....',
        '......DGD..DGD....',
        '......DW....WD....',
      ],
      CAT_PALETTE,
    ),
  );

  const watch = box(
    pixmap(
      [
        '...........D..D...',
        '..........DLGGLD..',
        '..........GPGGPD..',
        '....DDDD..GGGEGG..',
        '..DDGGGSDDGGGGPGD.',
        '.DGGGGSGGGGGGGGWD.',
        'DDGLGSGGGGGGGGGD..',
        'DGGGGGGGGGGGGGD...',
        '.DDDDWWGGGWWDDD...',
      ],
      CAT_PALETTE,
    ),
  );

  const sleepA = box(
    pixmap(
      [
        '....D....D......',
        '...DLG..GLD.....',
        '...GGGLLGGG.....',
        '..DGGDGGDGGDD...',
        '.DGGGGPGGGGGSD..',
        'DGGLGGGGSGGGGSD.',
        'DGGGGGGGGGGSSGD.',
        'DGWWGGGGGGGSSGD.',
        '.DDDDDDDDDDDDD..',
      ],
      CAT_PALETTE,
    ),
  );

  const sleepB = box(
    pixmap(
      [
        '................',
        '....D....D......',
        '...DLG..GLD.....',
        '...GGGLLGGG.....',
        '..DGGDGGDGGDD...',
        '.DGGGGPGGGGGSD..',
        'DGGLGGGGSGGGGSD.',
        'DGWWGGGGGGSSSGD.',
        '.DDDDDDDDDDDDD..',
      ],
      CAT_PALETTE,
    ),
  );

  const stretch = box(
    pixmap(
      [
        '..D.............',
        '.DGD............',
        '.D.D..DDDD......',
        '..D..DGGSG......',
        '..DDGGGGSGD..D..',
        '...DGGSGGGGDLGD.',
        '...DGGGGGGGGPPD.',
        '....DGGGGGGGGEGD',
        '.....DGGGGGGGGPD',
        '.....DGD...DGGWD',
        '.....DGD....DGGD',
        '.....DGD.....DDD',
        '.....DW....DWW..',
      ],
      CAT_PALETTE,
    ),
  );

  const right: CatSprites = { sit, blink, groomA, groomB, walkA, walkB, watch, sleepA, sleepB, stretch };
  const left: CatSprites = {
    sit: flipBox(sit),
    blink: flipBox(blink),
    groomA: flipBox(groomA),
    groomB: flipBox(groomB),
    walkA: flipBox(walkA),
    walkB: flipBox(walkB),
    watch: flipBox(watch),
    sleepA: flipBox(sleepA),
    sleepB: flipBox(sleepB),
    stretch: flipBox(stretch),
  };

  return { right, left };
}

const PIGEON_PALETTE: Readonly<Record<string, string>> = {
  D: '#3b4250',
  B: '#7a879a',
  L: '#a4b2c4',
  N: '#588c7a',
  W: '#dce4ec',
  O: '#d88848',
};

function buildPigeonSprites(): { right: PigeonSprites; left: PigeonSprites } {
  const stand = box(
    pixmap(
      [
        '......DDD...',
        '.....DBBBD..',
        '.....DBNDBO.',
        '....DDBNND..',
        '..DDBBLLBD..',
        '.DBBBLLLBD..',
        'DBBDDDWBBD..',
        '.DDDDBBBD...',
        '.....O.O....',
        '....OO.OO...',
      ],
      PIGEON_PALETTE,
    ),
  );

  const peck = box(
    pixmap(
      [
        '............',
        '............',
        '...DDD......',
        '..DBLLBD....',
        '.DBBLLBBD...',
        'DBBDDDNBBD..',
        '.DDDDBNNBDO.',
        '....DBBBD...',
        '.....O.O....',
        '....OO.OO...',
      ],
      PIGEON_PALETTE,
    ),
  );

  const shuffle = box(
    pixmap(
      [
        '......DDD...',
        '.....DBBBD..',
        '.....DBNDBO.',
        '....DDBNND..',
        '.DDBBLLBD...',
        'DBBBLLLBD...',
        '.BBDDDWBBD..',
        '..DDDBBBD...',
        '....O...O...',
        '...OO..OO...',
      ],
      PIGEON_PALETTE,
    ),
  );

  const flyUp = box(
    pixmap(
      [
        '..DDD.........',
        '.DLLLD........',
        '.DBBLBD..DDD..',
        '..DBBLBDBBBD..',
        '...DBBBBNDBDO.',
        'DBBBLLLLBBBD..',
        '.DDDDDDDDD....',
        '..............',
      ],
      PIGEON_PALETTE,
    ),
  );

  const flyDown = box(
    pixmap(
      [
        '..............',
        '.........DDD..',
        '..DDD...DBBBD.',
        '.DBBBD.DBNDBDO',
        'DBBBBBBBBBBDD.',
        '..DDDLLLLBD...',
        '....DBBLBD....',
        '.....DDD......',
      ],
      PIGEON_PALETTE,
    ),
  );

  const right: PigeonSprites = { stand, peck, shuffle, flyUp, flyDown };
  const left: PigeonSprites = {
    stand: flipBox(stand),
    peck: flipBox(peck),
    shuffle: flipBox(shuffle),
    flyUp: flipBox(flyUp),
    flyDown: flipBox(flyDown),
  };
  return { right, left };
}

function buildBalloons(): readonly SpriteBox[] {
  const heartCoral = box(
    pixmap(
      ['.CC.CC.', 'CHCCRCC', 'CCCCCRC', '.CCCCR.', '..CCR..', '...C...', '...S...', '....S..', '...S...'],
      { C: '#ee6a74', H: '#ffb2b8', R: '#b83c48', S: '#d4dce6' },
    ),
  );
  const heartPink = box(
    pixmap(
      ['.CC.CC.', 'CHCCRCC', 'CCCCCRC', '.CCCCR.', '..CCR..', '...C...', '...S...', '..S....', '...S...'],
      { C: '#f28eb8', H: '#ffd0e4', R: '#be5482', S: '#d4dce6' },
    ),
  );
  const starGold = box(
    pixmap(
      ['...Y...', '..YYY..', 'YHYGYGY', '.YYYYR.', '..YYY..', '.YY.YY.', '...S...', '....S..', '...S...'],
      { Y: '#f6ce56', H: '#fff0a4', G: '#f6ce56', R: '#c89428', S: '#d4dce6' },
    ),
  );
  const starMint = box(
    pixmap(
      ['...Y...', '..YYY..', 'YHYGYGY', '.YYYYR.', '..YYY..', '.YY.YY.', '...S...', '..S....', '...S...'],
      { Y: '#7ce0c4', H: '#c8fff0', G: '#7ce0c4', R: '#449e88', S: '#d4dce6' },
    ),
  );
  return [heartCoral, heartPink, starGold, starMint];
}

/** Builds all creature, person, and balloon sprites once. */
export function createCastSprites(): CastSprites {
  const cats = buildCatSprites();
  const pigeons = buildPigeonSprites();
  const people = buildPeopleSprites();
  return {
    catRight: cats.right,
    catLeft: cats.left,
    pigeonRight: pigeons.right,
    pigeonLeft: pigeons.left,
    patrons: people.patrons,
    bartender: people.bartender,
    keeper: people.keeper,
    neighbour: people.neighbour,
    balloons: buildBalloons(),
  };
}
