import { mirrored, pixmap } from '../../journeys/pixmap';
import { buildBirdSprites, buildFishSprites, buildFloraSprites } from './fauna-sprites';
import { buildPropAndStructureSprites } from './props-sprites';
import type { FishSpecies, SpriteBox, SpritePair } from './types';

export type { SpriteBox, SpritePair } from './types';

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
  catSitA: SpriteBox;
  catSitB: SpriteBox;
  catLook: SpriteBox;
  catNapA: SpriteBox;
  catNapB: SpriteBox;
  tackleBox: SpriteBox;
  thermos: SpriteBox;
  bucketEmpty: SpriteBox;
  bucketFull: SpriteBox;
  stove: SpriteBox;
  lantern: SpriteBox;
  rodRack: SpriteBox;
  netPost: SpriteBox;
  coiledRope: SpriteBox;
  crates: SpriteBox;
  mooringPost: SpriteBox;
  rowboat: SpriteBox;
  mooredSkiff: SpriteBox;
  sailingDinghy: SpritePair;
  boathouse: SpriteBox;
  boathouseGlow: SpriteBox;
  cabin: SpriteBox;
  cabinGlow: SpriteBox;
  haloLantern: SpriteBox;
  haloEmber: SpriteBox;
  haloFirefly: SpriteBox;
  leaves: SpriteBox[];
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
  cormorantStill: SpritePair;
  cormorantSpread: SpritePair;
  cormorantFlyA: SpritePair;
  cormorantFlyB: SpritePair;
  swallow: SpritePair;
  swallowFlyA: SpritePair;
  swallowFlyB: SpritePair;
  duckMotherA: SpritePair;
  duckMotherB: SpritePair;
  duckFlyA: SpritePair;
  duckFlyB: SpritePair;
  duckling: SpritePair;
  caughtFish: Record<FishSpecies, SpriteBox>;
  tallyFish: Record<FishSpecies, SpriteBox>;
  jumpingFish: SpritePair;
  dragonflyTealA: SpritePair;
  dragonflyTealB: SpritePair;
  dragonflyAmberA: SpritePair;
  dragonflyAmberB: SpritePair;
  reeds: SpriteBox[];
  lilyPads: SpriteBox[];
  farPines: SpriteBox[];
  midTrees: SpriteBox[];
  shoreBushes: SpriteBox[];
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
  h: '#d8be7c',
  H: '#9c7e44',
  s: '#eec29c',
  S: '#c8946e',
  e: '#281e18',
  r: '#d64438',
  R: '#982822',
  c: '#e6dfd0',
  v: '#58784c',
  V: '#3b5434',
  p: '#3b4a5e',
  P: '#263242',
  k: '#4a3222',
  K: '#2e1e14',
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

/** Recurring scruffy golden-brown dog with matching red scarf. */
function buildDogSprites() {
  const pal: Readonly<Record<string, string>> = {
    b: '#c98e4c',
    B: '#9c662e',
    d: '#6e421c',
    e: '#241a14',
    r: '#dc4438',
    R: '#982822',
    p: '#e8a898',
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

/** Pier ginger-and-cream cat watching the fish bucket or curled napping on crates. */
function buildCatSprites() {
  const pal: Readonly<Record<string, string>> = {
    o: '#d8823c',
    O: '#a65824',
    d: '#6e3614',
    c: '#f0e2cc',
    e: '#261c16',
    p: '#e89aa0',
  };

  const catSitA = box(
    pixmap(
      [
        '....o..o....',
        '...oooooo...',
        '...ooeeoo...',
        '....oopo....',
        '...ooccoo...',
        '..oooccooo..',
        '..oOoccoOo..',
        '.d.oOOOOo...',
        'd..oOOOOo...',
        '.d.cc..cc...',
        '............',
      ],
      pal,
    ),
  );

  const catSitB = box(
    pixmap(
      [
        '....o..o....',
        '...oooooo...',
        '...ooeeoo...',
        '....oopo....',
        '...ooccoo...',
        '..oooccooo..',
        '..oOoccoOo..',
        '...oOOOOod..',
        '...oOOOOo.d.',
        '...cc..cc.d.',
        '............',
      ],
      pal,
    ),
  );

  const catLook = box(
    pixmap(
      [
        '....o..o....',
        '...oOeeOo...',
        '...ooeeoo...',
        '....ocpo....',
        '...ooccoo...',
        '..oooccooo..',
        '.doOoccoOo..',
        'd..oOOOOo...',
        '.d.oOOOOo...',
        '...cc..cc...',
        '............',
      ],
      pal,
    ),
  );

  const catNapA = box(
    pixmap(
      [
        '......o..o...',
        '..ooooooooo..',
        '.ooOoooOoooo.',
        'ooOOooooOcco.',
        'dddddddddddd.',
      ],
      pal,
    ),
  );

  const catNapB = box(
    pixmap(
      [
        '.............',
        '......o..o...',
        '..ooooooooo..',
        '.ooOoooOoooo.',
        'dddddddddddd.',
      ],
      pal,
    ),
  );

  return { catSitA, catSitB, catLook, catNapA, catNapB };
}

/** Builds every sprite once into memory canvases. */
export function buildFishingSprites(): FishingSprites {
  return {
    ...buildAnglerSprites(),
    ...buildDogSprites(),
    ...buildCatSprites(),
    ...buildPropAndStructureSprites(),
    ...buildBirdSprites(),
    ...buildFishSprites(),
    ...buildFloraSprites(),
  };
}
