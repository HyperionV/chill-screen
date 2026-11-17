import { memoryCanvas } from '../../../render/pixel-stage';
import { pixmap } from '../pixmap';
import type { CottageSprite, SpriteBox, WindowLight } from './sprites';

export interface FishingBoatSprite extends SpriteBox {
  lampX: number;
  lampY: number;
}

export interface HarbourSprites {
  tower: SpriteBox;
  houses: CottageSprite[];
  lampPost: SpriteBox;
  rowboat: SpriteBox;
  sailboat: SpriteBox;
  fishingBoat: FishingBoatSprite;
  cratesAndNets: SpriteBox;
  mooringPost: SpriteBox;
}

function box(canvas: HTMLCanvasElement): SpriteBox {
  return { canvas, w: canvas.width, h: canvas.height };
}

function buildHarbourTower(): SpriteBox {
  const w = 26;
  const h = 64;
  const { canvas, ctx } = memoryCanvas(w, h);
  // Domed lantern cap
  ctx.fillStyle = '#323a44';
  for (let y = 0; y < 6; y++) {
    const half = Math.floor(y * 0.75);
    ctx.fillRect(13 - half, y + 1, half * 2 + 1, 1);
  }
  ctx.fillStyle = '#e8c85a';
  ctx.fillRect(13, 0, 1, 1);

  // Glass lantern room
  ctx.fillStyle = '#2d343e';
  ctx.fillRect(8, 7, 10, 7);
  ctx.fillStyle = '#a4c2d4';
  ctx.fillRect(9, 8, 8, 5);
  ctx.fillStyle = '#f2dc88';
  ctx.fillRect(11, 9, 4, 3);

  // Gallery balcony & railing
  ctx.fillStyle = '#262b32';
  ctx.fillRect(6, 14, 14, 2);
  ctx.fillStyle = '#5a626c';
  ctx.fillRect(6, 12, 1, 2);
  ctx.fillRect(19, 12, 1, 2);

  // Tapering red-and-cream brick tower
  for (let y = 16; y < h - 8; y++) {
    const half = 4 + Math.floor(((y - 16) / (h - 24)) * 5);
    const band = Math.floor((y - 16) / 10) % 2 === 0;
    ctx.fillStyle = band ? '#e8e2d4' : '#b64a3e';
    ctx.fillRect(13 - half, y, half * 2 + 1, 1);
    ctx.fillStyle = band ? '#bcb6aa' : '#88342a';
    ctx.fillRect(13 + half - 2, y, 3, 1);
  }

  // Stone harbour base & door
  ctx.fillStyle = '#7e8078';
  ctx.fillRect(3, h - 8, 20, 8);
  ctx.fillStyle = '#5c5e58';
  ctx.fillRect(19, h - 8, 4, 8);
  ctx.fillStyle = '#4a3222';
  ctx.fillRect(11, h - 7, 4, 7);
  ctx.fillStyle = '#526878';
  ctx.fillRect(12, 26, 2, 3);
  return box(canvas);
}

/** Builds a tall narrow harbour house with one of four roof styles (stepped, bell, pitched, mansard). */
function buildHarbourHouse(
  roofStyle: 'stepped' | 'bell' | 'pitched' | 'mansard',
  wall: string,
  wallDark: string,
  roof: string,
  roofTrim: string,
): CottageSprite {
  const w = 25;
  const h = roofStyle === 'bell' || roofStyle === 'pitched' ? 44 : 40;
  const { canvas, ctx } = memoryCanvas(w, h);
  const wallTop = 14;

  // Chimney
  ctx.fillStyle = '#7c4c40';
  ctx.fillRect(18, 2, 3, 10);

  // Roof & gable silhouette
  if (roofStyle === 'stepped') {
    const steps = [
      [10, 5],
      [8, 9],
      [6, 13],
      [4, 17],
      [2, 21],
    ];
    for (let i = 0; i < steps.length; i++) {
      const [sx, sw] = steps[i];
      ctx.fillStyle = wall;
      ctx.fillRect(sx, 2 + i * 2, sw, 4);
      ctx.fillStyle = roofTrim;
      ctx.fillRect(sx - 1, 2 + i * 2, 1, 2);
      ctx.fillRect(sx + sw, 2 + i * 2, 1, 2);
    }
  } else if (roofStyle === 'bell') {
    for (let y = 2; y < wallTop; y++) {
      const k = (y - 2) / (wallTop - 2);
      const half = Math.round(2 + Math.pow(k, 1.4) * 8.5);
      ctx.fillStyle = wall;
      ctx.fillRect(12 - half, y, half * 2 + 1, 1);
      ctx.fillStyle = roofTrim;
      ctx.fillRect(12 - half - 1, y, 1, 1);
      ctx.fillRect(12 + half + 1, y, 1, 1);
    }
  } else if (roofStyle === 'pitched') {
    for (let y = 2; y < wallTop; y++) {
      const half = Math.round(((y - 2) / (wallTop - 2)) * 10);
      ctx.fillStyle = roof;
      ctx.fillRect(12 - half, y, half * 2 + 1, 1);
      ctx.fillStyle = wall;
      ctx.fillRect(12 - Math.max(0, half - 2), y + 2, Math.max(1, (half - 2) * 2 + 1), 1);
    }
    // Hoist beam under attic peak
    ctx.fillStyle = '#4e3422';
    ctx.fillRect(11, 4, 3, 2);
  } else {
    ctx.fillStyle = roof;
    ctx.fillRect(3, 5, 19, 9);
    ctx.fillStyle = roofTrim;
    ctx.fillRect(2, 13, 21, 1);
    ctx.fillStyle = wall;
    ctx.fillRect(9, 7, 7, 6);
  }

  // Main brick/plaster facade
  ctx.fillStyle = wall;
  ctx.fillRect(2, wallTop, 21, h - wallTop);
  ctx.fillStyle = wallDark;
  ctx.fillRect(20, wallTop, 3, h - wallTop);
  ctx.fillStyle = '#5a5852';
  ctx.fillRect(2, h - 2, 21, 2);

  // Door
  ctx.fillStyle = '#4c3424';
  ctx.fillRect(5, h - 10, 5, 10);
  ctx.fillStyle = '#c8a64e';
  ctx.fillRect(9, h - 5, 1, 1);

  // Tall shuttered canal windows
  const windows: WindowLight[] = [
    { x: 10, y: 8, w: 5, h: 4 },
    { x: 6, y: 17, w: 5, h: 6 },
    { x: 14, y: 17, w: 5, h: 6 },
    { x: 13, y: h - 11, w: 5, h: 6 },
  ];
  for (const win of windows) {
    ctx.fillStyle = '#332924';
    ctx.fillRect(win.x - 1, win.y - 1, win.w + 2, win.h + 2);
    ctx.fillStyle = '#5c7e96';
    ctx.fillRect(win.x, win.y, win.w, win.h);
    ctx.fillStyle = '#dfd8c6';
    ctx.fillRect(win.x + 2, win.y, 1, win.h);
    ctx.fillRect(win.x, win.y + 2, win.w, 1);
  }

  return { canvas, w, h, chimneyX: 19, chimneyY: 2, windows };
}

function buildLampPost(): SpriteBox {
  const rows = [
    '..kkkkk..',
    '.kkyyykk.',
    '.kkyyykk.',
    '.kkyyykk.',
    '..kkkkk..',
    '....k....',
    '....k....',
    '....k....',
    '....k....',
    '....k....',
    '....k....',
    '....k....',
    '....k....',
    '....k....',
    '....k....',
    '....k....',
    '....k....',
    '....k....',
    '....k....',
    '....k....',
    '...kkk...',
    '...kkk...',
    '..kkkkk..',
    '..kkkkk..',
  ];
  return box(pixmap(rows, { k: '#2b3038', y: '#a2c2ce' }));
}

function buildRowboat(): SpriteBox {
  const w = 38;
  const h = 16;
  const { canvas, ctx } = memoryCanvas(w, h);
  // Resting wooden oars
  ctx.fillStyle = '#c49c64';
  ctx.fillRect(6, 5, 16, 1);
  ctx.fillRect(14, 6, 16, 1);
  ctx.fillStyle = '#e0c692';
  ctx.fillRect(4, 4, 3, 2);
  ctx.fillRect(29, 6, 3, 2);

  // Wooden clinker hull & thwarts
  ctx.fillStyle = '#8e5c36';
  ctx.fillRect(3, 7, 32, 4);
  ctx.fillStyle = '#c2925c';
  ctx.fillRect(9, 7, 4, 2);
  ctx.fillRect(22, 7, 4, 2);
  ctx.fillStyle = '#623d22';
  ctx.fillRect(2, 8, 34, 4);
  ctx.fillStyle = '#d8cfb8';
  ctx.fillRect(3, 8, 32, 1);
  ctx.fillStyle = '#3b2414';
  ctx.fillRect(5, 12, 28, 2);
  return box(canvas);
}

function buildSailboat(): SpriteBox {
  const w = 52;
  const h = 46;
  const { canvas, ctx } = memoryCanvas(w, h);
  const hullY = h - 10;

  // Mast & rigging stays
  ctx.fillStyle = '#6e4a2c';
  ctx.fillRect(24, 3, 2, hullY - 3);
  ctx.fillStyle = '#a89f90';
  for (let y = 5; y < hullY; y += 2) {
    const k = (y - 5) / (hullY - 5);
    ctx.fillRect(Math.round(24 - k * 19), y, 1, 1);
    ctx.fillRect(Math.round(26 + k * 19), y, 1, 1);
  }
  // Masthead pennant
  ctx.fillStyle = '#c44a3c';
  ctx.fillRect(26, 4, 6, 2);
  ctx.fillRect(32, 5, 2, 1);

  // Boom & neatly furled cream sail
  ctx.fillStyle = '#5c3c22';
  ctx.fillRect(25, hullY - 5, 19, 2);
  ctx.fillStyle = '#ece4ce';
  ctx.fillRect(26, hullY - 8, 17, 3);
  ctx.fillStyle = '#c4b89c';
  ctx.fillRect(28, hullY - 6, 14, 1);

  // White & navy sailboat hull
  ctx.fillStyle = '#ece8dc';
  ctx.fillRect(3, hullY, 46, 4);
  ctx.fillStyle = '#2d4b68';
  ctx.fillRect(5, hullY + 4, 42, 4);
  ctx.fillStyle = '#9c4236';
  ctx.fillRect(7, hullY + 8, 38, 2);
  return box(canvas);
}

function buildFishingBoat(): FishingBoatSprite {
  const w = 54;
  const h = 30;
  const { canvas, ctx } = memoryCanvas(w, h);
  const hullY = h - 10;

  // Wheelhouse cabin
  ctx.fillStyle = '#dfe2da';
  ctx.fillRect(10, hullY - 10, 14, 10);
  ctx.fillStyle = '#385848';
  ctx.fillRect(9, hullY - 11, 16, 2);
  ctx.fillStyle = '#6e90a8';
  ctx.fillRect(12, hullY - 8, 4, 3);
  ctx.fillRect(18, hullY - 8, 4, 3);
  // Smokestack
  ctx.fillStyle = '#3c4048';
  ctx.fillRect(15, hullY - 14, 3, 3);

  // Draped fishing nets & buoys on stern
  ctx.fillStyle = '#6a7c5c';
  ctx.fillRect(28, hullY - 5, 14, 5);
  ctx.fillStyle = '#4c5b42';
  ctx.fillRect(30, hullY - 4, 10, 3);
  ctx.fillStyle = '#d65a42';
  ctx.fillRect(31, hullY - 6, 2, 2);
  ctx.fillRect(38, hullY - 6, 2, 2);

  // Stern lantern pole & brass lamp
  const lampX = 44;
  const lampY = hullY - 11;
  ctx.fillStyle = '#3a2c22';
  ctx.fillRect(lampX, lampY + 2, 1, 9);
  ctx.fillStyle = '#d8b448';
  ctx.fillRect(lampX - 1, lampY, 3, 3);

  // Sturdy wooden trawler hull
  ctx.fillStyle = '#364452';
  ctx.fillRect(3, hullY, 48, 6);
  ctx.fillStyle = '#c88c42';
  ctx.fillRect(4, hullY + 1, 46, 1);
  ctx.fillStyle = '#222a32';
  ctx.fillRect(6, hullY + 6, 42, 3);

  return { canvas, w, h, lampX, lampY };
}

function buildCratesAndNets(): SpriteBox {
  const rows = [
    '.......nnnnnnnnn..........',
    '......nndnnnnndnn.........',
    '.....nnnnnnnnnnnnn........',
    '..bbbb..cccccc..cccccc....',
    '.bddddb.cddddc..cddddc....',
    '.bbbbbb.cccccc..cccccc.rrr',
    '.bddddb.cddddc..cddddcryyr',
    '..bbbb..cccccc..ccccccryyr',
    '.cccccc.cccccc..cccccc.rrr',
    '.cddddc.cddddc..cddddc....',
    '.cccccc.cccccc..cccccc....',
  ];
  return box(
    pixmap(rows, {
      c: '#ad7c48',
      d: '#76502c',
      b: '#8c5a34',
      n: '#7b9478',
      r: '#c8ac74',
      y: '#987c4a',
    }),
  );
}

function buildMooringPost(): SpriteBox {
  const rows = [
    '.hhh.',
    'wwwww',
    'wwdww',
    'wwdww',
    'rrrrr',
    'wwdww',
    'wwdww',
    'wwdww',
    'ddddd',
    'ddddd',
  ];
  return box(pixmap(rows, { h: '#b8946a', w: '#7c5838', d: '#4e3622', r: '#cbb07c' }));
}

export function createHarbourSprites(): HarbourSprites {
  return {
    tower: buildHarbourTower(),
    houses: [
      buildHarbourHouse('stepped', '#b86852', '#8e4d3c', '#585e68', '#ded6c4'),
      buildHarbourHouse('bell', '#d8cdb4', '#b4a890', '#485668', '#ece4d2'),
      buildHarbourHouse('pitched', '#c69a5c', '#9c7842', '#8e483c', '#e6dec8'),
      buildHarbourHouse('mansard', '#94a296', '#6e7c72', '#4a525e', '#d6d2c6'),
    ],
    lampPost: buildLampPost(),
    rowboat: buildRowboat(),
    sailboat: buildSailboat(),
    fishingBoat: buildFishingBoat(),
    cratesAndNets: buildCratesAndNets(),
    mooringPost: buildMooringPost(),
  };
}
