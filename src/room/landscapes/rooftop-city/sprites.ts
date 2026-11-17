import { drawText, plainText } from '../../../render/pixel-font';
import { memoryCanvas } from '../../../render/pixel-stage';
import { seededRandom } from '../../../world/math';
import { pixmap } from '../../journeys/pixmap';
import { buildBillboardAdverts } from './advert-sprites';
import type { SpriteBox } from './cast-sprites';
import { buildBarAndNeon, buildGardenStructures } from './structure-sprites';

export interface RooftopSprites {
  waterTower: SpriteBox;
  ventLarge: SpriteBox;
  ventSmall: SpriteBox;
  crate: SpriteBox;
  plants: readonly SpriteBox[];
  garments: readonly SpriteBox[];
  blimp: SpriteBox;
  blimpGlow: SpriteBox;
  heli: SpriteBox;
  barPergola: SpriteBox;
  neonBase: SpriteBox;
  neonGlow: SpriteBox;
  barTable: SpriteBox;
  barTableGlow: SpriteBox;
  billboardFrame: SpriteBox;
  adverts: readonly SpriteBox[];
  pigeonCoop: SpriteBox;
  greenhouse: SpriteBox;
  greenhouseGlow: SpriteBox;
  vegBeds: readonly SpriteBox[];
  sunflower: SpriteBox;
  sprinkler: SpriteBox;
}

function box(canvas: HTMLCanvasElement): SpriteBox {
  return { canvas, w: canvas.width, h: canvas.height };
}

/** Wooden cedar water tower on cross-braced steel stilts (64x96). */
function buildWaterTower(): SpriteBox {
  const w = 64;
  const h = 96;
  const { canvas, ctx } = memoryCanvas(w, h);
  const cx = 32;

  ctx.fillStyle = '#3c424e';
  ctx.fillRect(14, 58, 3, 38);
  ctx.fillRect(47, 58, 3, 38);
  ctx.fillRect(24, 60, 2, 36);
  ctx.fillRect(38, 60, 2, 36);
  ctx.fillStyle = '#626b7a';
  ctx.fillRect(14, 58, 1, 38);
  ctx.fillRect(47, 58, 1, 38);

  ctx.fillStyle = '#4e5462';
  ctx.fillRect(10, 56, 44, 4);
  ctx.fillStyle = '#737c8c';
  ctx.fillRect(10, 56, 44, 1);

  ctx.fillStyle = '#4a5260';
  for (let i = 0; i <= 30; i++) {
    const lx = 17 + i;
    const ly = 62 + Math.round((i / 30) * 28);
    ctx.fillRect(lx, ly, 1, 1);
    ctx.fillRect(46 - i, ly, 1, 1);
  }

  for (let y = 20; y < 56; y++) {
    for (let x = 14; x < 50; x++) {
      const plank = (x - 14) % 4;
      const side = (x - cx) / 18;
      let color = '#8d5d3b';
      if (side < -0.45) color = '#a8744c';
      else if (side > 0.35) color = '#664028';
      if (plank === 0) color = side > 0.2 ? '#4d2f1e' : '#6c452b';
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  for (const hy of [25, 34, 44, 52]) {
    ctx.fillStyle = '#323640';
    ctx.fillRect(14, hy, 36, 2);
    ctx.fillStyle = '#5c6270';
    ctx.fillRect(14, hy, 14, 1);
  }

  for (let y = 4; y < 21; y++) {
    const t = (y - 4) / 16;
    const half = Math.round(2 + t * 20);
    for (let x = cx - half; x <= cx + half; x++) {
      const side = (x - cx) / Math.max(1, half);
      ctx.fillStyle = side < -0.25 ? '#6e7686' : side < 0.35 ? '#525866' : '#3a3f4a';
      if ((y + x) % 5 === 0 && side < 0.3) ctx.fillStyle = '#7e8696';
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.fillStyle = '#8b94a4';
  ctx.fillRect(cx - 1, 1, 2, 3);
  ctx.fillStyle = '#2b2f38';
  ctx.fillRect(10, 20, 44, 2);

  ctx.fillStyle = '#747c8a';
  ctx.fillRect(49, 20, 1, 44);
  ctx.fillRect(53, 20, 1, 44);
  for (let ry = 23; ry < 63; ry += 4) ctx.fillRect(50, ry, 3, 1);

  return box(canvas);
}

function buildVentsAndCrates(): { ventLarge: SpriteBox; ventSmall: SpriteBox; crate: SpriteBox } {
  const vl = memoryCanvas(28, 16);
  {
    const c = vl.ctx;
    c.fillStyle = '#7d8694';
    c.fillRect(1, 2, 26, 14);
    c.fillStyle = '#a4aebc';
    c.fillRect(0, 0, 28, 3);
    c.fillStyle = '#c4cdd9';
    c.fillRect(0, 0, 28, 1);
    c.fillStyle = '#535a66';
    c.fillRect(22, 3, 5, 13);
    for (let y = 5; y < 14; y += 2) {
      c.fillStyle = '#404652';
      c.fillRect(4, y, 15, 1);
      c.fillStyle = '#9aa3b0';
      c.fillRect(4, y + 1, 15, 1);
    }
    c.fillStyle = '#383d46';
    c.fillRect(1, 15, 26, 1);
  }

  const vs = memoryCanvas(18, 12);
  {
    const c = vs.ctx;
    c.fillStyle = '#727b88';
    c.fillRect(2, 3, 14, 9);
    c.fillStyle = '#9aa4b2';
    c.fillRect(0, 1, 18, 2);
    c.fillStyle = '#484e58';
    c.fillRect(12, 3, 4, 9);
    for (let y = 5; y < 11; y += 2) c.fillRect(4, y, 6, 1);
  }

  const cr = memoryCanvas(18, 12);
  {
    const c = cr.ctx;
    c.fillStyle = '#8b5e3c';
    c.fillRect(0, 0, 18, 12);
    c.fillStyle = '#ae7a52';
    c.fillRect(0, 0, 18, 2);
    c.fillRect(0, 5, 18, 2);
    c.fillRect(0, 10, 18, 2);
    c.fillStyle = '#5c3c24';
    c.fillRect(0, 2, 18, 1);
    c.fillRect(0, 7, 18, 1);
    c.fillRect(15, 0, 3, 12);
  }

  return { ventLarge: box(vl.canvas), ventSmall: box(vs.canvas), crate: box(cr.canvas) };
}

function buildPlants(): readonly SpriteBox[] {
  const pottedFern = box(
    pixmap(
      [
        '....GG..GG....',
        '..GGLG..GLGG..',
        '.GLLG.GG.GLLG.',
        '.GG.GLGGLG.GG.',
        '..GGGGGGGGGG..',
        '...GDGGGGDG...',
        '....DDDDDD....',
        '..TTTTTTTTTT..',
        '..TTTTTTTTTS..',
        '...TTTTTTTT...',
        '...TTTTTTTS...',
        '...TTTTTTTT...',
        '....SSSSSS....',
      ],
      { L: '#84c65c', G: '#529442', D: '#30602e', T: '#b86442', S: '#84422a' },
    ),
  );

  const monstera = box(
    pixmap(
      [
        '...LL....LL...',
        '..LGG....GGL..',
        '..GGG.LL.GGG..',
        '.DGGGLGGG.GGD.',
        '..DGGGGGGGGD..',
        '...DDGGGGDD...',
        '.....DDDD.....',
        '...TTTTTTTT...',
        '...TTTTTTTS...',
        '....TTTTTT....',
        '....TTTTTS....',
        '....SSSSSS....',
      ],
      { L: '#76bc56', G: '#46843c', D: '#295628', T: '#c26e4a', S: '#88482e' },
    ),
  );

  const tomatoPot = box(
    pixmap(
      [
        '.....G..R.....',
        '....LGG.G.....',
        '..R.GGGGGL....',
        '..GGGDGGGG.R..',
        '...GGGGGGLGG..',
        '..LGGGGGDGG...',
        '...DDDDDDDD...',
        '..BBBBBBBBBB..',
        '..BBBBBBBBBS..',
        '...BBBBBBBB...',
        '...BBBBBBBS...',
        '....SSSSSS....',
      ],
      { L: '#7ec258', G: '#4a883c', D: '#2e5828', R: '#e24c3e', B: '#8c5e3a', S: '#5e3c22' },
    ),
  );

  const flowerBox = box(
    pixmap(
      [
        '..YY..PP..YY..',
        '.YOY..PP..YOY.',
        '..G.GG..GG.G..',
        '.GGGGGGGGGGGG.',
        '.DGGGGGGGGGGD.',
        'BBBBBBBBBBBBBB',
        'BBBBBBBBBBBBBS',
        'BBSSSSSSSSSSBS',
        'BBBBBBBBBBBBBS',
        'SSSSSSSSSSSSSS',
      ],
      { Y: '#f6d458', O: '#e28c38', P: '#ee7ca4', G: '#569844', D: '#34642c', B: '#94623e', S: '#623e24' },
    ),
  );

  return [pottedFern, monstera, tomatoPot, flowerBox];
}

function buildGarments(): readonly SpriteBox[] {
  const shirt = box(
    pixmap(
      [
        '..TTTTTTTTTT..',
        '.TTTTDDDDTTTT.',
        'TTTDDDDDDDDTTT',
        'TTTDDDDDDDDTTT',
        '.TTDDDDDDDDTT.',
        '...TTTTTTTT...',
        '...TTTTTTTT...',
        '...DDDDDDDD...',
        '...TTTTTTTT...',
        '...TTTTTTTT...',
        '...DDDDDDDD...',
        '...SSSSSSSS...',
      ],
      { T: '#e8eff4', D: '#5682a8', S: '#9aa8b6' },
    ),
  );

  const towelCoral = box(
    pixmap(
      [
        '.HHHHHHHH.',
        '.CCCCCCCC.',
        '.CCCCCCCC.',
        '.CCCCCCCC.',
        '.CCCCCCCC.',
        '.CCCCCCCC.',
        '.CCCCCCCC.',
        '.HHHHHHHH.',
        '.CCCCCCCC.',
        '.CCCCCCCC.',
        '.CCCCCCCC.',
        '.DDDDDDDD.',
        '.SSSSSSSS.',
      ],
      { C: '#df6c62', H: '#f49a8e', D: '#b04842', S: '#8a3430' },
    ),
  );

  const overalls = box(
    pixmap(
      [
        '..BB....BB..',
        '..BB....BB..',
        '..BBBBBBBB..',
        '..BBHHHBBB..',
        '..BBBBBBBB..',
        '..BBBBBBBS..',
        '..BBBBBBBS..',
        '..BBB..BBS..',
        '..BBB..BBS..',
        '..BBB..BBS..',
        '..BBB..BBS..',
        '..DDD..DDS..',
      ],
      { B: '#486890', H: '#6a8cb8', S: '#324868', D: '#24344c' },
    ),
  );

  const towelMint = box(
    pixmap(
      [
        '.HHHHHHHH.',
        '.MMMMMMMM.',
        '.MMMMMMMM.',
        '.MMMMMMMM.',
        '.WWWWWWWW.',
        '.MMMMMMMM.',
        '.MMMMMMMM.',
        '.MMMMMMMM.',
        '.MMMMMMMM.',
        '.MMMMMMMM.',
        '.DDDDDDDD.',
      ],
      { M: '#6ab8a2', H: '#96dcc6', W: '#e4f4ee', D: '#448874' },
    ),
  );

  const socks = box(
    pixmap(
      ['.WW..YY.', '.WW..YY.', '.WW..YY.', '.WWW.YYY', '..WW..YY'],
      { W: '#f2e8d4', Y: '#e8be56' },
    ),
  );

  return [shirt, towelCoral, overalls, towelMint, socks];
}

function buildBlimp(): { blimp: SpriteBox; blimpGlow: SpriteBox } {
  const w = 78;
  const h = 28;
  const base = memoryCanvas(w, h);
  const glow = memoryCanvas(w, h);
  const c = base.ctx;
  const g = glow.ctx;

  c.fillStyle = '#9c4240';
  c.fillRect(6, 2, 10, 5);
  c.fillRect(6, 17, 10, 5);
  c.fillStyle = '#c85a54';
  c.fillRect(8, 3, 6, 2);

  const cx = 42;
  const cy = 12;
  for (let y = 2; y <= 22; y++) {
    const ny = (y - cy) / 10;
    const rx = Math.round(33 * Math.sqrt(Math.max(0, 1 - ny * ny)));
    for (let x = cx - rx; x <= cx + rx; x++) {
      let col = '#b8c2ce';
      if (ny < -0.45) col = '#dde4ec';
      else if (ny > 0.45) col = '#727c8c';
      if (y === 12 || y === 13) col = '#c85850';
      c.fillStyle = col;
      c.fillRect(x, y, 1, 1);
    }
  }

  c.fillStyle = '#242e48';
  c.fillRect(24, 9, 36, 7);
  drawText(c, plainText('SKYWAYS'), 28, 10, '#f8d878', 1);
  drawText(g, plainText('SKYWAYS'), 28, 10, 'rgba(255, 226, 138, 0.9)', 1);

  c.fillStyle = '#404856';
  c.fillRect(34, 22, 18, 5);
  c.fillStyle = '#687488';
  c.fillRect(35, 22, 16, 1);
  c.fillStyle = '#f8da7c';
  for (const wx of [37, 41, 45, 49]) {
    c.fillRect(wx, 23, 2, 2);
    g.fillStyle = 'rgba(255, 224, 132, 0.95)';
    g.fillRect(wx, 23, 2, 2);
  }

  return { blimp: box(base.canvas), blimpGlow: box(glow.canvas) };
}

function buildHeli(): SpriteBox {
  return box(
    pixmap(
      [
        '...............D............',
        '...........DDDDDD...........',
        'DDDD......DCCCCCCDD.........',
        '.DD......DCCCCCCCCDDD.......',
        '..DDDDDDDCCCCGGGGGCCCCD.....',
        '....DDDDDCCCCGGGGGCCCCCDD...',
        '........DDDDCCCCCCCCCCDD....',
        '...........DDDDDDDDDD.......',
        '............D......D........',
        '.........DDDDDDDDDDDDDD.....',
      ],
      { D: '#2c3442', C: '#526884', G: '#a6d4e6' },
    ),
  );
}

function buildBillboardFrame(): SpriteBox {
  const w = 124;
  const h = 76;
  const { canvas, ctx } = memoryCanvas(w, h);

  ctx.fillStyle = '#3a404c';
  ctx.fillRect(18, 56, 4, 20);
  ctx.fillRect(102, 56, 4, 20);
  ctx.fillRect(58, 56, 4, 20);
  ctx.fillStyle = '#5a6272';
  ctx.fillRect(18, 56, 1, 20);
  ctx.fillRect(102, 56, 1, 20);

  ctx.fillStyle = '#484f5e';
  ctx.fillRect(2, 57, w - 4, 3);
  ctx.fillStyle = '#6c768a';
  ctx.fillRect(2, 53, w - 4, 1);
  for (let x = 6; x < w - 4; x += 10) ctx.fillRect(x, 53, 1, 5);

  ctx.fillStyle = '#2d323e';
  ctx.fillRect(3, 4, 118, 54);
  ctx.fillStyle = '#565e70';
  ctx.fillRect(3, 4, 118, 2);
  ctx.fillRect(3, 4, 2, 54);
  ctx.fillStyle = '#1d2028';
  ctx.fillRect(5, 6, 114, 50);

  for (const lx of [24, 60, 96]) {
    ctx.fillStyle = '#4a5262';
    ctx.fillRect(lx, 0, 2, 4);
    ctx.fillStyle = '#2a2e38';
    ctx.fillRect(lx - 2, 1, 6, 2);
  }

  return box(canvas);
}

function buildPigeonCoop(): SpriteBox {
  const w = 52;
  const h = 42;
  const { canvas, ctx } = memoryCanvas(w, h);
  const rnd = seededRandom(991);

  ctx.fillStyle = '#4e3422';
  ctx.fillRect(6, 34, 3, 8);
  ctx.fillRect(43, 34, 3, 8);

  ctx.fillStyle = '#8b5e3e';
  ctx.fillRect(4, 10, 44, 25);
  ctx.fillStyle = '#a4724e';
  for (let y = 11; y < 34; y += 3) {
    if (rnd() < 0.8) ctx.fillRect(5, y, 42, 1);
  }
  ctx.fillStyle = '#5e3c26';
  ctx.fillRect(42, 10, 6, 25);

  ctx.fillStyle = '#383d48';
  ctx.fillRect(2, 7, 48, 4);
  ctx.fillStyle = '#525866';
  ctx.fillRect(2, 6, 48, 2);

  ctx.fillStyle = '#282c34';
  ctx.fillRect(8, 14, 20, 12);
  ctx.fillStyle = '#788290';
  for (let x = 10; x < 28; x += 3) ctx.fillRect(x, 14, 1, 12);
  for (let y = 16; y < 26; y += 3) ctx.fillRect(8, y, 20, 1);

  ctx.fillStyle = '#241b16';
  ctx.fillRect(32, 18, 4, 6);
  ctx.fillRect(38, 18, 4, 6);

  ctx.fillStyle = '#b48056';
  ctx.fillRect(7, 26, 36, 2);
  ctx.fillStyle = '#623e26';
  ctx.fillRect(7, 28, 36, 1);

  return box(canvas);
}

/** Builds all architectural and rooftop prop sprites once. */
export function createRooftopSprites(): RooftopSprites {
  const vents = buildVentsAndCrates();
  const blimp = buildBlimp();
  const bar = buildBarAndNeon();
  const garden = buildGardenStructures();
  return {
    waterTower: buildWaterTower(),
    ventLarge: vents.ventLarge,
    ventSmall: vents.ventSmall,
    crate: vents.crate,
    plants: buildPlants(),
    garments: buildGarments(),
    blimp: blimp.blimp,
    blimpGlow: blimp.blimpGlow,
    heli: buildHeli(),
    barPergola: bar.barPergola,
    neonBase: bar.neonBase,
    neonGlow: bar.neonGlow,
    barTable: bar.barTable,
    barTableGlow: bar.barTableGlow,
    billboardFrame: buildBillboardFrame(),
    adverts: buildBillboardAdverts(),
    pigeonCoop: buildPigeonCoop(),
    greenhouse: garden.greenhouse,
    greenhouseGlow: garden.greenhouseGlow,
    vegBeds: garden.vegBeds,
    sunflower: garden.sunflower,
    sprinkler: garden.sprinkler,
  };
}
