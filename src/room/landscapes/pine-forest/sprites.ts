import { memoryCanvas } from '../../../render/pixel-stage';
import { hash } from '../../journeys/noise';
import { pixmap } from '../../journeys/pixmap';

const CROWN_HEIGHT = 0.83;
const BRANCH_TIERS = 9;
const TRUNK_STRIATIONS = 4;

export type Kind = 'fawn' | 'deer' | 'fox' | 'rabbit' | 'frog' | 'owl' | 'kingfisher' | 'squirrel';
export type Pose = 'rest' | 'alert' | 'walk' | 'sleep' | 'fly' | 'drink';
export type CastSprites = Record<Kind, Record<Pose, HTMLCanvasElement>>;

function animal(kind: Kind, pose: Pose): HTMLCanvasElement {
  const { canvas, ctx: c } = memoryCanvas(36, 34);
  const rect = (color: string, x: number, y: number, w: number, h: number): void => {
    c.fillStyle = color; c.fillRect(x, y, w, h);
  };
  const cream = '#e4d5af';
  const dark = '#302f2d';
  const sleeping = pose === 'sleep';
  const stepping = pose === 'walk';
  const raised = pose === 'alert' || pose === 'walk';
  if (raised && (kind === 'squirrel' || kind === 'frog' || kind === 'kingfisher')) c.translate(0, -2);
  if (kind === 'fawn' || kind === 'deer') {
    const brown = kind === 'fawn' ? '#bb8150' : '#9b7350';
    const drinking = pose === 'drink';
    const head = sleeping ? 22 : drinking ? 25 : raised ? 8 : 15;
    rect('#634735', 7, 20, 18, 6);
    rect(brown, 6, sleeping ? 24 : 18, 20, sleeping ? 7 : 8);
    rect('#d59b61', 8, sleeping ? 24 : 18, 14, 2);
    if (!sleeping) {
      rect(brown, 23, Math.min(20, head + 2), 4, drinking ? 10 : 23 - head);
      rect(brown, 23, head, 9, 6);
      rect('#764e38', 24, head - 5, 2, 6);
      rect('#cdab7c', 28, head - 4, 2, 5);
      rect(cream, 27, head + 4, 5, 2);
      rect(dark, 30, head + 1, 1, 1); rect(dark, 32, head + 3, 2, 2);
      rect('#6d4e39', 8, 25, 2, stepping ? 6 : 8);
      rect(brown, 12, 25, 2, 8); rect('#6d4e39', 21, 25, 2, 8);
      rect(brown, stepping ? 25 : 24, 24, 2, stepping ? 7 : 9);
      rect(dark, 12, 32, 3, 1); rect(dark, 24, 32, 3, 1);
    } else {
      rect(brown, 24, 22, 7, 6); rect(dark, 28, 24, 3, 1); rect(cream, 10, 30, 13, 1);
    }
    rect(cream, 4, sleeping ? 25 : 20, 3, 4);
    if (kind === 'fawn') {
      for (let i = 0; i < 7; i++) rect(cream, 9 + (i % 4) * 4, (sleeping ? 26 : 20) + Math.floor(i / 4) * 3, 2, 1);
    }
  } else if (kind === 'fox') {
    rect('#8e4b2c', 3, 23, 11, 6); rect('#e1bc88', 1, 21, 5, 5);
    rect('#bd7037', 11, 20, 16, 9); rect('#dd9548', 24, raised ? 14 : 18, 8, 8);
    rect('#603a29', 25, raised ? 11 : 15, 2, 5); rect('#603a29', 30, raised ? 12 : 16, 2, 4);
    rect(cream, 27, raised ? 19 : 23, 7, 3); rect(dark, 31, raised ? 16 : 20, 1, 1);
    rect(dark, 33, raised ? 20 : 24, 2, 1);
    rect(dark, 13, 28, 3, stepping ? 4 : 5); rect(dark, 26, 27, 3, 6);
  } else if (kind === 'rabbit') {
    rect('#8f9284', 11, 23, 14, 9); rect('#b8bb9e', 14, 20, 11, 10);
    rect('#d4cdb0', 10, 27, 4, 4); rect('#b8bb9e', 23, 20, 7, 7);
    rect('#b8bb9e', 23, raised ? 10 : 15, 2, raised ? 12 : 7);
    rect('#c8a58e', 24, raised ? 11 : 16, 1, 7); rect('#8f9284', 27, 13, 2, 9);
    rect(dark, 28, 22, 1, 1); rect(cream, 20, 31, stepping ? 10 : 7, 2);
  } else if (kind === 'frog') {
    rect('#4e7449', 10, 24, 17, 7); rect('#8ba856', 12, 22, 13, 7);
    rect('#a9bf70', 13, 20, 3, 4); rect('#a9bf70', 22, 20, 3, 4);
    rect(dark, 14, 21, 1, 1); rect(dark, 23, 21, 1, 1); rect('#c1c58a', 15, 27, 9, 2);
    rect('#4e7449', stepping ? 5 : 8, 30, 8, 3); rect('#4e7449', 24, 30, stepping ? 9 : 6, 3);
  } else if (kind === 'owl') {
    const eyes = raised ? 1 : 0;
    rect('#534e43', 11, 16, 15, 15);
    rect('#817461', 11, 16, 2, 13);
    rect('#bcb294', 14, 18, 10, 12);
    rect('#e4d3ab', 14, 19, 7, 7);
    rect('#a9987b', 15, 29, 8, 2);
    rect('#786a55', 10, 11, 17, 9);
    rect('#9c8d70', 11, 9, 2, 4); rect('#9c8d70', 24, 9, 2, 4);
    rect('#b7ac91', 13, 10, 11, 2);
    rect('#ead9b6', 11 + eyes, 12, 7, 6); rect('#ddc9a4', 20 + eyes, 12, 6, 6);
    rect('#bc8763', 12 + eyes, 13, 5, 4); rect('#bc8763', 20 + eyes, 13, 5, 4);
    if (sleeping) {
      rect(dark, 13 + eyes, 15, 3, 1); rect(dark, 21 + eyes, 15, 3, 1);
    } else {
      rect('#ffc570', 13 + eyes, 13, 4, 4); rect('#ffc570', 21 + eyes, 13, 4, 4);
      rect(dark, 14 + eyes, 14, 2, 2); rect(dark, 22 + eyes, 14, 2, 2);
      rect('#fff2c2', 14 + eyes, 14, 1, 1); rect('#fff2c2', 22 + eyes, 14, 1, 1);
    }
    rect('#8e633e', 18 + eyes, 17, 2, 3);
    rect('#e5b46a', 18 + eyes, 17, 1, 2);
    for (let i = 0; i < 6; i++) rect('#94846b', 15 + (i % 3) * 3, 23 + Math.floor(i / 3) * 3, 1, 2);
    rect('#c29a68', 14, 31, 3, 2); rect('#c29a68', 22, 31, 3, 2);
    if (pose === 'fly') {
      rect('#675d4a', 0, 12, 12, 5); rect('#a69c7b', 1, 16, 10, 2);
      rect('#675d4a', 25, 12, 11, 5); rect('#a69c7b', 26, 16, 9, 2);
    }
  } else if (kind === 'kingfisher') {
    rect('#2a6571', 12, 20, 12, 10); rect('#5da4a8', 13, 19, 10, 3);
    rect('#c38146', 20, 24, 7, 7); rect('#2c7a8c', 20, 15, 9, 9);
    rect(cream, 24, 22, 4, 2); rect(dark, 27, 17, 1, 1); rect(dark, 28, 20, 8, 2);
    rect('#244d5c', 9, 27, 7, 5); rect('#985b3b', 21, 31, 2, 2);
    if (pose === 'fly') rect('#6fabb2', 5, 14, 16, 4);
  } else {
    rect('#995d3b', 6, 16, 7, 13); rect('#b27b4d', 4, 12, 8, 9);
    rect('#d49b5e', 5, 12, 5, 2); rect('#b27b4d', 13, 24, 12, 7);
    rect('#b27b4d', 21, 19, 7, 8); rect('#8c5033', 22, 16, 2, 4);
    rect(dark, 26, 21, 1, 1); rect(cream, 22, 27, 4, 3);
    rect('#70452f', 14, 31, stepping ? 7 : 5, 2); rect('#70452f', 24, 31, 5, 2);
  }
  return canvas;
}

export function buildCast(): CastSprites {
  const make = (kind: Kind): Record<Pose, HTMLCanvasElement> => ({
    rest: animal(kind, 'rest'), alert: animal(kind, 'alert'), walk: animal(kind, 'walk'),
    sleep: animal(kind, 'sleep'), fly: animal(kind, 'fly'), drink: animal(kind, 'drink'),
  });
  return { fawn: make('fawn'), deer: make('deer'), fox: make('fox'), rabbit: make('rabbit'),
    frog: make('frog'), owl: make('owl'), kingfisher: make('kingfisher'), squirrel: make('squirrel') };
}

type PinePalette = 'distant' | 'middle' | 'near' | 'moonlit';

const PINE_COLORS = {
  distant: { needles: ['#7e9e99', '#72948f', '#6b8e8b', '#638486'], rim: '#92ada6', bark: '#586f66', grain: '#6e877c' },
  middle: { needles: ['#5d8a78', '#4f7d70', '#426d64', '#365f58'], rim: '#739b85', bark: '#52695e', grain: '#798979' },
  near: { needles: ['#56866b', '#46745e', '#386351', '#305548'], rim: '#7b9d7a', bark: '#645441', grain: '#938067' },
  moonlit: { needles: ['#68938a', '#517f75', '#426f65', '#355e57'], rim: '#9fbeb0', bark: '#576958', grain: '#8aaba0' },
};

export function pineSprite(height: number, width: number, palette: PinePalette): HTMLCanvasElement {
  const { canvas, ctx: c } = memoryCanvas(width, height);
  const colors = PINE_COLORS[palette];
  const mid = Math.floor(width / 2);
  const crown = height * CROWN_HEIGHT;
  c.fillStyle = colors.bark;
  c.fillRect(mid - 3, 10, 7, height - 10);
  c.fillRect(mid - 5, height - 5, 12, 4);
  c.fillStyle = colors.grain;
  for (let i = 0; i < TRUNK_STRIATIONS; i++) {
    const y = Math.round(crown - 8 + i * (height - crown) / TRUNK_STRIATIONS);
    c.fillRect(mid - 3 + i % 2, y, 1, 9);
  }
  for (let y = 0; y < crown; y++) {
    const t = y / crown;
    const branch = t * BRANCH_TIERS;
    const tier = branch % 1;
    const spread = width * 0.48 * t * (0.51 + tier * 0.49);
    const jagged = hash(y * 13 + Math.floor(branch) * 17);
    const left = Math.floor(spread * (0.91 + jagged * 0.11));
    const right = Math.floor(spread * (0.87 + hash(y * 7) * 0.12));
    for (let x = -left; x <= right; x++) {
      const grain = hash(x * 13 + y * 7);
      const depth = tier > 0.79 || grain < 0.09 ? 1 : 0;
      const shade = Math.max(0, Math.min(3, Math.floor((x / Math.max(1, spread) + 1) * 1.48) + depth));
      const needleRim = x < -left + 2 && tier < 0.79 && grain > 0.28;
      const twig = tier < 0.23 && x < 0 && grain > 0.83;
      c.fillStyle = needleRim || twig ? colors.rim : colors.needles[shade];
      c.fillRect(mid + x, y, 1, 1);
    }
  }
  return canvas;
}

export function fernSprite(moonlit = false): HTMLCanvasElement {
  return pixmap([
    '...........h...........', '....h......l......h....', '.....ll....h....ll.....',
    '..l...ll..ldl..ll...l..', '...ll..lldldldll..ll...', '....lld.ldldldl.dll....',
    '.ll...lldldldldll...ll.', '..llll..ldldldl..llll..', '.....lllldldldllll.....',
    '........ldldldl........', '.........ldldl.........', '..........ddd..........',
    '...........d...........',
  ], moonlit ? { h: '#bdd4a6', l: '#8fb18a', d: '#507e68' } : { h: '#aac381', l: '#80a35b', d: '#486c48' });
}
