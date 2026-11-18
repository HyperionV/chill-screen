import { memoryCanvas } from '../../../render/pixel-stage';
import { mirrored, pixmap } from '../../journeys/pixmap';
import type { SpriteBox, SpritePair } from './types';

const BAYER_4X4: readonly number[] = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function box(canvas: HTMLCanvasElement): SpriteBox {
  return { canvas, w: canvas.width, h: canvas.height };
}

function pair(rows: readonly string[], palette: Readonly<Record<string, string>>): SpritePair {
  const canvas = pixmap(rows, palette);
  return { right: box(canvas), left: box(mirrored(canvas)) };
}

/** Builds a layered, 4x4 ordered-dither light halo sprite with core, mid ring, and wide faint outer ring. */
function buildDitheredHalo(
  radius: number,
  coreCss: string,
  midCss: string,
  outerCss: string,
  coreEdge: number,
  midEdge: number,
): SpriteBox {
  const size = radius * 2 + 1;
  const { canvas, ctx } = memoryCanvas(size, size);
  const cx = radius;
  const cy = radius;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cy) / radius;
      if (d > 1) continue;
      const bayer = (BAYER_4X4[((y & 3) << 2) | (x & 3)] ?? 0) + 0.5;
      const threshold = bayer / 16;

      if (d <= coreEdge) {
        ctx.fillStyle = coreCss;
        ctx.fillRect(x, y, 1, 1);
      } else if (d <= midEdge) {
        const blend = (d - coreEdge) / Math.max(0.01, midEdge - coreEdge);
        ctx.fillStyle = blend < threshold ? coreCss : midCss;
        ctx.fillRect(x, y, 1, 1);
      } else {
        const falloff = 1 - (d - midEdge) / Math.max(0.01, 1 - midEdge);
        if (falloff > threshold * 0.92) {
          ctx.fillStyle = falloff > 0.58 ? midCss : outerCss;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }
  return box(canvas);
}

/** Builds jetty props, moored boats, far-shore buildings, leaves, and dithered halo sprites. */
export function buildPropAndStructureSprites() {
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

  // Wooden A-frame rod rack holding two leaning cane rods with cork grips and brass ferrules.
  const rodRack = box(
    pixmap(
      [
        '......c......c..',
        '.....c......c...',
        '....c......c....',
        '...c......c.....',
        '..bmmmmmmb......',
        '..bwWWWWwb......',
        '...c....c.......',
        '..wcc..wcc......',
        '..W.g..W.g......',
        '.w..g.w..g......',
        '.W..k.W..k......',
        '.w..k.w..k......',
        '.W....W.........',
        '.wWWWWw.........',
        '.W....W.........',
        'ww....ww........',
      ],
      { w: '#a87c4e', W: '#68482c', b: '#c89b66', c: '#d8b46e', m: '#aeb8c2', g: '#c89a3c', k: '#4a3220' },
    ),
  );

  // Weathered timber post with hanging landing net (hoop + diamond mesh + handle).
  const netPost = box(
    pixmap(
      [
        '....lll.........',
        '....lWW.........',
        '....wWW.........',
        '....wWWgggg.....',
        '....wWWg..g.....',
        '....wWWgmmmg....',
        '....wWW.gmmg....',
        '....wWW..gmg....',
        '....wWW..gg.....',
        '....wWW...h.....',
        '....wWW...h.....',
        '....wWW...h.....',
        '....wWW...h.....',
        '....wWW.........',
        '....wWW.........',
        '...wwWWw........',
      ],
      { l: '#c89e6e', w: '#88603c', W: '#503622', g: '#a68250', m: '#c4ccb8', h: '#6a482c' },
    ),
  );

  // Coiled hemp rope lying neatly on jetty planks.
  const coiledRope = box(
    pixmap(
      [
        '...cccccc...',
        '.ccRRRRRRcc.',
        'cRRccccccRRc',
        'cRccRRRRccRc',
        '.dddddddddd.',
      ],
      { c: '#d4b47c', R: '#9a7a48', d: '#5c4428' },
    ),
  );

  // Stacked wooden bait & gear crates with corner braces and slat gaps.
  const crates = box(
    pixmap(
      [
        '.........lllllllll..',
        '.........lwwwwwwwl..',
        '.........lwDDDDDwl..',
        '.........lwwwwwwwl..',
        '..lllllllwDDDDDwwl..',
        '.lwwwwwwwwwwwwwwwl..',
        '.lwDDDDDDwDDDDDDwl..',
        '.lwwwwwwwwwwwwwwwl..',
        '.lwDDDDDDwDDDDDDwl..',
        '.lwwwwwwwwDDDDDDwl..',
        '.ddddddddddddddddd..',
      ],
      { l: '#cca470', w: '#9c7246', D: '#543a24', d: '#3c2818' },
    ),
  );

  // Sturdy timber mooring bollard post with rope wrap.
  const mooringPost = box(
    pixmap(
      [
        '.llll..',
        '.wWWWl.',
        '.wWWWl.',
        'cccccc.',
        'RRRRRR.',
        'cccccc.',
        '.wWWWl.',
        '.wWWWl.',
        '.wWWWl.',
        '.wWWWl.',
        '.wWWWl.',
        '.wWWWl.',
      ],
      { l: '#c89e6e', w: '#865e3a', W: '#503622', c: '#d2b278', R: '#8c6e40' },
    ),
  );

  // Active rowboat (Morning Rowboat scene).
  const rowboat = box(
    pixmap(
      [
        '................b.............................b.........',
        '...............bbb...........................bbb........',
        '......wwwwwwwwwwwwwwowwwwwwwwwwwwwowwwwwwwwwwwwwwww.....',
        '...wwwwwwwwwwwwwwwbbobbbbbbsbbbbbbowwwwwwwwwwwwwwww....',
        '..wbbbbbbbbbsbbbbbbbobbbbbbsbbbbbbobbbbsbbbbbbbbbbbw....',
        '..bbbbbbbbbBBBBBBBBBoBBBBBBBBBBBBBoBBBBBBbbbbbbbbbb.....',
        '...bbbbBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBbbbbb......',
        '....BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB........',
        '.....dddddddddddddddddddddddddddddddddddddddddd.........',
      ],
      { w: '#d6bc92', b: '#8c5a34', B: '#663e22', d: '#442816', s: '#af8f61', o: '#bea076' },
    ),
  );

  // Weathered painted wooden skiff moored to a pier piling.
  const mooredSkiff = box(
    pixmap(
      [
        '.......mm................................',
        '......m..m.....wwwwwwwwwwwww...r.........',
        '....wwwwwwwwwwwwbbbwbbsbbbwwwwrrw........',
        '..wwllllllllllllbbbwbbbbbbllllllww.......',
        '.wsssslslssssssssssssssssssllssssssw.....',
        '.sSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSs.....',
        '..sSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSs......',
        '...ddddddddddddddddddddddddddddddd.......',
      ],
      { w: '#dcc69c', l: '#6e8c98', s: '#4c6c7a', S: '#344c58', b: '#8a5c36', d: '#22323c', m: '#aeb8c2', r: '#a26345' },
    ),
  );

  // Distant hazy sailing dinghy for far water (muted soft tones so clock band stays calm).
  const sailingDinghy = pair(
    [
      '.......c........',
      '.......cc.......',
      '......cwc.......',
      '......cwwc......',
      '.....ccwwwc.....',
      '.....ccwwwcc....',
      '....cccwwwwc....',
      '....cccwwwwcc...',
      '...ccccwwwwwc...',
      '...ccccwwwwwcc..',
      '..cccccwwwwwwc..',
      '.......t........',
      '.bbbbbbbbbbbbbb.',
      '..dddddddddddd..',
    ],
    { w: '#dedad0', c: '#b8bec2', t: '#7a7268', b: '#68747c', d: '#465058' },
  );

  // Detailed far-shore boathouse in soft atmospheric tones + separate warm window glow.
  const boathouseRows = [
    '..................rrrrrrrrrr..................',
    '..............rrrrrrrrrrrrrrrrrr..............',
    '..........RrrrRrrrrrrrrrrrrrrrrrrrrr..........',
    '......RrrrRrrrrrrrrrrrrrrrrrrrrrrrrrrrrr......',
    '..RrrrRrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr..',
    '..DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD..',
    '.....wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.....',
    '.....wWWWWwwwwwwwwwwwwwwwwwwwwwwwwwwWWWWw.....',
    '.....wWWWWwwwggggwwwwddddddddwwwwgggWWWWw.....',
    '.....wWWWWwwwGGGGwwwwddddddddwwwwGGGWWWWw.....',
    '.....wWWWWwwwwwwwwwwwddddddddwwwwwwwwWWWw.....',
    '.....wWWWWwwwwwwwwwwwddddddddwwwwwwwwWWWw.....',
    '.....bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.....',
    '.....bb..bb.......bb..........bb.......bb.....',
  ];
  const boathouse = box(pixmap(boathouseRows, { r: '#744c40', R: '#8d6759', D: '#4a322a', w: '#928472', W: '#766858', d: '#3c342e', g: '#5a6e7c', G: '#53616a', b: '#4e3c30' }));
  const boathouseGlow = box(pixmap(boathouseRows, { g: '#ffe1a2', G: '#d39558' }));

  // Small hazy far-shore lakeside cabin with chimney & porch + warm dusk/night window overlay.
  const cabinRows = [
    '......kk..........................',
    '......kk..........................',
    '............RrrrRrrrrr............',
    '........RrrrRrrrrrrrrrrrrr........',
    '....RrrrRrrrrrrrrrrrrrrrrrrrrr....',
    '..DDDDDDDDDDDDDDDDDDDDDDDDDDDDDD..',
    '....wwwwwwwwwwwwwwwwwwwwwwwwww....',
    '....wWWWWwwwwwwwwwwwwwwwwWWWWw....',
    '....wWWWWwwgggwwwwwwwwgggWWWWw....',
    '....wWWWWwwGgGwwwddwwwGgGWWWWw....',
    '....wWWWWwwwwwwwwddwwwwwwWWWWw....',
    '....bbbbbbbbbbbbbddbbbbbbbbbbb....',
    '....bb.........bbbb.........bb....',
  ];
  const cabin = box(pixmap(cabinRows, { k: '#5e5a56', r: '#625244', R: '#8a715b', D: '#3e342c', w: '#8a7c68', W: '#6e6050', g: '#586c78', G: '#52616b', d: '#463428', b: '#4e3e30' }));
  const cabinGlow = box(pixmap(cabinRows, { g: '#ffe1a2', G: '#d39558' }));

  // Pre-baked layered, ordered-dither light halos (zero radial gradients at runtime).
  const haloLantern = buildDitheredHalo(
    26,
    'rgba(255,232,148,0.54)',
    'rgba(255,182,76,0.24)',
    'rgba(240,136,48,0.11)',
    0.18,
    0.46,
  );
  const haloEmber = buildDitheredHalo(
    14,
    'rgba(255,222,128,0.50)',
    'rgba(255,164,68,0.22)',
    'rgba(232,118,44,0.10)',
    0.2,
    0.48,
  );
  const haloFirefly = buildDitheredHalo(
    5,
    'rgba(246,255,176,0.85)',
    'rgba(218,248,128,0.34)',
    'rgba(180,232,102,0.14)',
    0.22,
    0.55,
  );

  // Tiny drifting/floating fallen leaves in warm autumn and shoreline greens.
  const leaves: SpriteBox[] = [
    box(pixmap(['.rr.', 'rrRr'], { r: '#c8663a', R: '#8c3e22' })),
    box(pixmap(['.yy', 'yyo'], { y: '#d8a644', o: '#9c6c28' })),
    box(pixmap(['.gg.', 'ggdd'], { g: '#7a984c', d: '#4e6830' })),
    box(pixmap(['oo', 'o.'], { o: '#b85c34' })),
  ];

  return {
    tackleBox,
    thermos,
    bucketEmpty,
    bucketFull,
    stove,
    lantern,
    rodRack,
    netPost,
    coiledRope,
    crates,
    mooringPost,
    rowboat,
    mooredSkiff,
    sailingDinghy,
    boathouse,
    boathouseGlow,
    cabin,
    cabinGlow,
    haloLantern,
    haloEmber,
    haloFirefly,
    leaves,
  };
}
