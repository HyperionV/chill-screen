import { mirrored, pixmap } from '../../journeys/pixmap';
import { buildBirdSprites, buildFishSprites, buildFloraSprites } from './fauna-sprites';
import type { FishSpecies } from './types';

export interface SpriteBox {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
}

export interface SpritePair {
  right: SpriteBox;
  left: SpriteBox;
}

export interface FishingSprites {
  anglerCast: SpritePair;
  anglerNap: SpriteBox;
  anglerReel: SpritePair;
  anglerCook: SpriteBox;
  anglerLantern: SpriteBox;
  secondAngler: SpriteBox;
  dogSitA: SpriteBox;
  dogSitB: SpriteBox;
  dogLookA: SpriteBox;
  dogLookB: SpriteBox;
  dogRestA: SpriteBox;
  dogRestB: SpriteBox;
  tackleBox: SpriteBox;
  thermos: SpriteBox;
  bucketEmpty: SpriteBox;
  bucketFull: SpriteBox;
  stove: SpriteBox;
  lantern: SpriteBox;
  rowboat: SpriteBox;
  boathouse: SpriteBox;
  heronStill: SpritePair;
  heronStrike: SpritePair;
  heronFlyA: SpritePair;
  heronFlyB: SpritePair;
  kingfisher: SpritePair;
  kingfisherFlyA: SpritePair;
  kingfisherFlyB: SpritePair;
  gullPerch: SpritePair;
  gullLook: SpritePair;
  gullFlyA: SpritePair;
  gullFlyB: SpritePair;
  duckMotherA: SpritePair;
  duckMotherB: SpritePair;
  duckFlyA: SpritePair;
  duckFlyB: SpritePair;
  duckling: SpritePair;
  caughtFish: Record<FishSpecies, SpriteBox>;
  tallyFish: Record<FishSpecies, SpriteBox>;
  reeds: SpriteBox[];
  lilyPads: SpriteBox[];
  farPines: SpriteBox[];
  midTrees: SpriteBox[];
}

function box(canvas: HTMLCanvasElement): SpriteBox {
  return { canvas, w: canvas.width, h: canvas.height };
}

function pair(rows: readonly string[], palette: Readonly<Record<string, string>>): SpritePair {
  const canvas = pixmap(rows, palette);
  return { right: box(canvas), left: box(mirrored(canvas)) };
}

/** Palette shared across all poses of the recurring angler (khaki hat, olive vest, red scarf). */
const ANGLER_PAL: Readonly<Record<string, string>> = {
  h: '#d8be7c', // hat lit
  H: '#9c7e44', // hat shade / band
  s: '#eec29c', // skin
  S: '#c8946e', // skin shadow
  e: '#281e18', // eye / detail
  r: '#d64438', // signature red scarf lit
  R: '#982822', // red scarf shadow
  c: '#e6dfd0', // cream shirt sleeve
  v: '#58784c', // olive fishing vest lit
  V: '#3b5434', // vest shadow
  p: '#3b4a5e', // trousers lit
  P: '#263242', // trousers shadow
  k: '#4a3222', // boots
  K: '#2e1e14', // boot sole
};

function buildAnglerSprites() {
  const anglerCast = pair(
    [
      '.....hhhhh......',
      '....hhhhhhh.....',
      '...HHHHHHHHH....',
      '.hhhhhhhhhhhhh..',
      '.....ssssse.....',
      '.....sssssS.....',
      '....rrrrrrr.....',
      '...rRRRRrrrr....',
      '...ccvvvvvvv....',
      '..cccvvvVvvvc...',
      '..ccvvvvVvvvcc..',
      '...svvvVVvvvs...',
      '...SVVVVVVVVS...',
      '....pppppppp....',
      '....ppp..ppp....',
      '....ppP..ppP....',
      '....ppP..ppP....',
      '....ppP..ppP....',
      '....ppP..ppP....',
      '....ppP..ppP....',
      '....kkk..kkk....',
      '....kkk..kkk....',
      '...KKKK..KKKK...',
    ],
    ANGLER_PAL,
  );

  // Napping against a post: hat tilted forward, knees bent, scarf draped over chest (22 rows).
  const anglerNap = box(
    pixmap(
      [
        '.....hhhhh......',
        '....hhhhhhh.....',
        '...HHHHHHHHH....',
        '..hhhhhhhhhhhh..',
        '....ssSSssss....',
        '....rrrrrrr.....',
        '...rRRRRrrrr....',
        '..ccvvvvvvvv....',
        '..cvvvvVvvvv....',
        '..cvvvVVvvvv....',
        '..ssVVVVVVss....',
        '...pppppppppp...',
        '...pppppppppp...',
        '....pppp..pppp..',
        '....pppP..pppP..',
        '....kkk....kkk..',
        '...KKKK....KKKK.',
      ],
      ANGLER_PAL,
    ),
  );

  // Reeling in: leaning slightly back, two hands gripping rod/reel (24 rows).
  const anglerReel = pair(
    [
      '....hhhhh.......',
      '...hhhhhhh......',
      '..HHHHHHHHH.....',
      '.hhhhhhhhhhhh...',
      '....ssssse......',
      '....sssssS......',
      '...rrrrrrr......',
      '..rrRRRRrrr.....',
      '..ccvvvvvvv.....',
      '..ccvvvvVvvcc...',
      '...ccvvvVvvvs...',
      '...svvvVVVvvS...',
      '....VVVVVVVV....',
      '....pppppppp....',
      '....ppp..ppp....',
      '...pppP...ppp...',
      '...ppP....ppP...',
      '...ppP....ppP...',
      '..pppP....ppP...',
      '..kkk.....kkk...',
      '..kkk.....kkk...',
      '.KKKK....KKKK...',
    ],
    ANGLER_PAL,
  );

  // Cooking: crouched beside camp stove holding skillet handle (21 rows).
  const anglerCook = box(
    pixmap(
      [
        '....hhhhh.......',
        '...hhhhhhh......',
        '..HHHHHHHHH.....',
        '.hhhhhhhhhhhh...',
        '....ssssse......',
        '....sssssS......',
        '...rrrrrrr......',
        '..rrRRRRrr......',
        '..ccvvvvvv......',
        '..ccvvvvVvv.....',
        '...ccvvvVvvc....',
        '...svvvVVvvvs...',
        '....pppppppp....',
        '....pppppppppp..',
        '...ppppp..pppp..',
        '...pppP...ppP...',
        '...kkk....kkk...',
        '..KKKK....KKKK..',
      ],
      ANGLER_PAL,
    ),
  );

  // Night sitting with lantern: seated on jetty edge, legs dangling slightly (23 rows).
  const anglerLantern = box(
    pixmap(
      [
        '....hhhhh.......',
        '...hhhhhhh......',
        '..HHHHHHHHH.....',
        '.hhhhhhhhhhhh...',
        '....ssssse......',
        '....sssssS......',
        '...rrrrrrr......',
        '..rRRRRrrrr.....',
        '..ccvvvvvvv.....',
        '..ccvvvVvvvc....',
        '...cvvvVvvvs....',
        '...svvvVVVV.....',
        '....pppppppp....',
        '....ppppppppp...',
        '......ppppppp...',
        '.......pppppP...',
        '.......ppp.ppP..',
        '.......ppP.ppP..',
        '.......kkk.kkk..',
        '......KKKK.KKKK.',
      ],
      ANGLER_PAL,
    ),
  );

  const secondAngler = box(
    pixmap(
      [
        '.....yyyyy......',
        '....yyyyyyy.....',
        '...YYYYYYYYY....',
        '..yyyyyyyyyyyy..',
        '....esssss......',
        '....Ssssss......',
        '...bbbbbbbbb....',
        '..bbbbBbbbbbb...',
        '..bBbbBbbbbBb...',
        '..sbbbBbbbbbss..',
        '...BBBBBBBBBB...',
        '....pppppppp....',
      ],
      {
        y: '#ecc448',
        Y: '#b08824',
        s: '#ecc09a',
        S: '#c4926c',
        e: '#261e18',
        b: '#3b648c',
        B: '#264462',
        p: '#323a48',
      },
    ),
  );

  return { anglerCast, anglerNap, anglerReel, anglerCook, anglerLantern, secondAngler };
}

/** Recurring scruffy golden-brown dog with matching red scarf (15 rows tall x 20 wide). */
function buildDogSprites() {
  const pal: Readonly<Record<string, string>> = {
    b: '#c98e4c', // golden fur lit
    B: '#9c662e', // mid fur
    d: '#6e421c', // ear / shadow
    e: '#241a14', // eye / nose
    r: '#dc4438', // matching red scarf
    R: '#982822', // scarf shadow
    p: '#e8a898', // tongue / belly highlight
  };

  const sitA = box(
    pixmap(
      [
        '...........ddd......',
        '..........dbbbd.....',
        '.........dbbbbeb....',
        '.........dbbbbbe....',
        '..........bbbbbb....',
        '.........rrrrrrrr...',
        '........rRRRRrrrr...',
        '......bbbbbbbbbb....',
        '....bbbbbbbbBbbb....',
        '...dbbbbbbbbBbbb....',
        '..d.bbbbbbbbBbbb....',
        '.d..bbBbbbbbBbbb....',
        '....bbB.....bbB.....',
        '....ddB.....ddB.....',
      ],
      pal,
    ),
  );

  const sitB = box(
    pixmap(
      [
        '...........ddd......',
        '..........dbbbd.....',
        '.........dbbbbeb....',
        '.........dbbbbbe....',
        '..........bbbbbb....',
        '.........rrrrrrrr...',
        '........rRRRRrrrr...',
        '..d...bbbbbbbbbb....',
        '...d.bbbbbbbBbbb....',
        '....dbbbbbbbBbbb....',
        '....bbbbbbbbBbbb....',
        '....bbBbbbbbBbbb....',
        '....bbB.....bbB.....',
        '....ddB.....ddB.....',
      ],
      pal,
    ),
  );

  const lookA = box(
    pixmap(
      [
        '..........d..dd.....',
        '.........dbdbbbd....',
        '.........dbebbbe....',
        '..........bbbbb.....',
        '.........rrrrrrrr...',
        '........rRRRRrrrr...',
        '......bbbbbbbbbb....',
        '....bbbbbbbbBbbb....',
        '...dbbbbbbbbBbbb....',
        '..d.bbbbbbbbBbbb....',
        '....bbBbbbbbBbbb....',
        '....bbB.....bbB.....',
        '....ddB.....ddB.....',
      ],
      pal,
    ),
  );

  const lookB = box(
    pixmap(
      [
        '..........d..dd.....',
        '.........dbdbbbd....',
        '.........dbebbbe....',
        '..........bbbbb.....',
        '.........rrrrrrrr...',
        '........rRRRRrrrr...',
        '.d....bbbbbbbbbb....',
        '..d.bbbbbbbbBbbb....',
        '...dbbbbbbbbBbbb....',
        '....bbbbbbbbBbbb....',
        '....bbBbbbbbBbbb....',
        '....bbB.....bbB.....',
        '....ddB.....ddB.....',
      ],
      pal,
    ),
  );

  const restA = box(
    pixmap(
      [
        '....................',
        '............ddd.....',
        '...........dbbbd....',
        '....bbbbbbdbbbbe....',
        '..bbbbbbbbbrrrrrr...',
        '.dbbbbbbbbbRRRRRr...',
        'd.bbbbbbbbbbbbBbb...',
        '..BBBBBBBBBBBBBBB...',
      ],
      pal,
    ),
  );

  const restB = box(
    pixmap(
      [
        '............ddd.....',
        '...........dbbbd....',
        '..........dbbbbe....',
        '....bbbbbbbrrrrrr...',
        '..bbbbbbbbbRRRRRr...',
        'd.bbbbbbbbbbbbBbb...',
        '.dBBBBBBBBBBBBBBB...',
      ],
      pal,
    ),
  );

  return { dogSitA: sitA, dogSitB: sitB, dogLookA: lookA, dogLookB: lookB, dogRestA: restA, dogRestB: restB };
}

function buildPropSprites() {
  const tackleBox = box(
    pixmap(
      [
        '....mmmmmm......',
        '...m......m.....',
        '.rrrrrrrrrrrr...',
        'rrrrrrrrrrrrrr..',
        'rRrrrrrrrrrrRr..',
        'mmmmmmmmmmmmmm..',
        'rRRRRrmmRRRRRr..',
        'rRRRRRRRRRRRRr..',
        'rRRRRRRRRRRRRr..',
        'dddddddddddddd..',
      ],
      { r: '#c84a3e', R: '#8c2c24', d: '#581c16', m: '#bcc4cc' },
    ),
  );

  const thermos = box(
    pixmap(
      [
        '.mmmm.',
        '.mmmm.',
        '.dddd.',
        'rrrrrr',
        'rRRRRr',
        'rRRRRr',
        'rRRRRr',
        'rRRRRr',
        'rRRRRr',
        'mmmmmm',
        '.dddd.',
      ],
      { r: '#b84238', R: '#882c24', m: '#c8d0d6', d: '#4c545c' },
    ),
  );

  const bucketEmpty = box(
    pixmap(
      [
        '...mmmmmm...',
        '..m......m..',
        '.m........m.',
        'rrrrrrrrrrrr',
        'rddddddddddr',
        'rrrrrrrrrrrr',
        'rRrrrrrrrrRr',
        'rRrrrrrrrrRr',
        '.rRrrrrrrRr.',
        '.rRrrrrrrRr.',
        '.dddddddddd.',
      ],
      { m: '#aeb8c2', r: '#cc4e40', R: '#943028', d: '#641e18' },
    ),
  );

  const bucketFull = box(
    pixmap(
      [
        '...s..f.....',
        '..ss.ff..s..',
        '..smmmmmmf..',
        '..m......m..',
        'rrrrrrrrrrrr',
        'rddddddddddr',
        'rrrrrrrrrrrr',
        'rRrrrrrrrrRr',
        'rRrrrrrrrrRr',
        '.rRrrrrrrRr.',
        '.rRrrrrrrRr.',
        '.dddddddddd.',
      ],
      { m: '#aeb8c2', r: '#cc4e40', R: '#943028', d: '#641e18', s: '#b6ccd4', f: '#d6a456' },
    ),
  );

  const stove = box(
    pixmap(
      [
        '...kkkkkkkkkkkkkkk',
        '..kfffffffffkkkk..',
        '..kkkkkkkkkk......',
        '...oooooooooo.....',
        '..dmmmmmmmmmmmd...',
        '..dmmmmooooommd...',
        '..dmddmmoomddmd...',
        '..dddddddddddd....',
        '..dd........dd....',
      ],
      { k: '#363c44', f: '#e6b872', o: '#f28c38', m: '#7e8892', d: '#464e56' },
    ),
  );

  const lantern = box(
    pixmap(
      [
        '...bbb...',
        '..b...b..',
        '..bbbbb..',
        '.bgggggb.',
        '.bgyyygb.',
        '.bgywygb.',
        '.bgyyygb.',
        '.bgggggb.',
        '.bbbbbbb.',
        'bbbbbbbbb',
        '.ddddddd.',
      ],
      { b: '#946e2e', d: '#543c18', g: '#f2b84c', y: '#ffe48a', w: '#fff8d4' },
    ),
  );

  const rowboat = box(
    pixmap(
      [
        '................b.............................b.........',
        '...............bbb...........................bbb........',
        '......wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.....',
        '...wwwwwwwwwwwwwwwbbbbbbbbbbbbbbbbbwwwwwwwwwwwwwwwww....',
        '..wbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbw....',
        '..bbbbbbbbbBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBbbbbbbbbbb.....',
        '...bbbbBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBbbbbb......',
        '....BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB........',
        '.....dddddddddddddddddddddddddddddddddddddddddd.........',
      ],
      { w: '#d6bc92', b: '#8c5a34', B: '#663e22', d: '#442816' },
    ),
  );

  const boathouse = box(
    pixmap(
      [
        '..............rrrrrrrrrrrr..............',
        '...........rrrrrrrrrrrrrrrrrr...........',
        '........rrrrrrrrrrrrrrrrrrrrrrrr........',
        '.....rrrrrrrrrrrrrrrrrrrrrrrrrrrrrr.....',
        '..rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr..',
        '.....wwwwwwwwwwwwwwwwwwwwwwwwwwwwww.....',
        '.....wwwwwwwwwwwwwwwwwwwwwwwwwwwwww.....',
        '.....wwwddddwwwwwgggggwwwwwddddwwww.....',
        '.....wwwddddwwwwwgggggwwwwwddddwwww.....',
        '.....wwwddddwwwwwwwwwwwwwwwddddwwww.....',
        '.....wwwwwwwwwwwwwwwwwwwwwwwwwwwwww.....',
        '.....bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.....',
        '.....bb..bb......bb..bb......bb..bb.....',
      ],
      { r: '#6c4236', w: '#8a7a68', d: '#443830', g: '#5a7080', b: '#4a3628' },
    ),
  );

  return { tackleBox, thermos, bucketEmpty, bucketFull, stove, lantern, rowboat, boathouse };
}

/** Builds every sprite once into memory canvases. */
export function buildFishingSprites(): FishingSprites {
  return {
    ...buildAnglerSprites(),
    ...buildDogSprites(),
    ...buildPropSprites(),
    ...buildBirdSprites(),
    ...buildFishSprites(),
    ...buildFloraSprites(),
  };
}
