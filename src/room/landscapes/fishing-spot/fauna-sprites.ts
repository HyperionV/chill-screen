import { memoryCanvas } from '../../../render/pixel-stage';
import { seededRandom } from '../../../world/math';
import { mirrored, pixmap } from '../../journeys/pixmap';
import type { FishSpecies, SpriteBox, SpritePair } from './types';

function box(canvas: HTMLCanvasElement): SpriteBox {
  return { canvas, w: canvas.width, h: canvas.height };
}

function pair(rows: readonly string[], palette: Readonly<Record<string, string>>): SpritePair {
  const canvas = pixmap(rows, palette);
  return { right: box(canvas), left: box(mirrored(canvas)) };
}

/** Builds all bird, dragonfly, fish, and lakeside flora sprites once at startup. */
export function buildBirdSprites() {
  const heronPal: Readonly<Record<string, string>> = {
    w: '#dce4ec',
    g: '#869ab0',
    G: '#586c82',
    k: '#2a323e',
    y: '#df9c38',
  };
  const heronStill = pair(
    [
      '.......kk.......',
      '......wwwyyyy...',
      '......wkw.......',
      '......ww........',
      '......wg........',
      '.....wwg........',
      '.....ggG........',
      '...ggggGG.......',
      '..gggggGGG......',
      '.ggggggGGGG.....',
      '..GGGGGgGG......',
      '....GGGG........',
      '.....k..k.......',
      '.....k..k.......',
      '.....k..k.......',
      '.....k..k.......',
      '.....k..k.......',
      '.....k..k.......',
      '....kk..kk......',
    ],
    heronPal,
  );
  const heronStrike = pair(
    [
      '................',
      '................',
      '.......ggggg....',
      '.....gggggGGG...',
      '....ggggggggGG..',
      '.....GGGGGGwwkk.',
      '......GGGG..wwyy',
      '......k..k......',
      '......k..k......',
      '......k..k......',
      '......k..k......',
      '.....kk..kk.....',
    ],
    heronPal,
  );
  const heronFlyA = pair(
    [
      '....ggg.........',
      '...ggggg........',
      '..gggggGG.......',
      '.wwggggggggyyyy.',
      '..kkGGGggggww...',
      '....k..k........',
    ],
    heronPal,
  );
  const heronFlyB = pair(
    [
      '................',
      '.wwggggggggyyyy.',
      '..kkGGGGGGGww...',
      '...gggggGG......',
      '....ggg.........',
    ],
    heronPal,
  );

  const kfPal: Readonly<Record<string, string>> = {
    t: '#2c8eb0',
    T: '#1a5a78',
    o: '#e27c34',
    w: '#f0ece0',
    k: '#222830',
  };
  const kingfisher = pair(
    [
      '....ttt......',
      '...tttktkkkk.',
      '...tttw......',
      '..tttooo.....',
      '..Ttoooo.....',
      '.TTtooo......',
      '.TT.oo.......',
      '.T..o........',
      '....k........',
      '...kk........',
    ],
    kfPal,
  );
  const kingfisherFlyA = pair(['..ttt.......', '.ttttt......', 'ttttoootkkkk', '.TT.oo......'], kfPal);
  const kingfisherFlyB = pair(['............', 'ttttoootkkkk', '.TTTT.......', '..TT........'], kfPal);

  const gullPal: Readonly<Record<string, string>> = {
    w: '#f0f2f4',
    g: '#9aa8b4',
    G: '#687684',
    y: '#e6b23c',
    k: '#283038',
  };
  const gullPerch = pair(
    [
      '....www.....',
      '...wwkwwyy..',
      '...wwwwww...',
      '..wwggggg...',
      '.wwwggggGG..',
      '.wwwwgggGG..',
      '..wwwwGGGG..',
      '...wwwww....',
      '....y..y....',
      '....y..y....',
      '...yy..yy...',
    ],
    gullPal,
  );
  const gullLook = pair(
    [
      '....www.....',
      '.yywwkww....',
      '...wwwwww...',
      '..wwggggg...',
      '.wwwggggGG..',
      '.wwwwgggGG..',
      '..wwwwGGGG..',
      '...wwwww....',
      '....y..y....',
      '....y..y....',
      '...yy..yy...',
    ],
    gullPal,
  );
  const gullFlyA = pair(['..ggg.......', '.ggggw......', '..wwwwwwwyy.', '...wwkww....'], gullPal);
  const gullFlyB = pair(['............', '..wwwwwwwyy.', '...gggww....', '..ggg.......'], gullPal);

  // Dark lakeside cormorant (perches on far pilings/snags and occasionally spreads wings to dry).
  const cormPal: Readonly<Record<string, string>> = {
    d: '#28323c',
    b: '#3f4f5c',
    l: '#586d7a',
    w: '#d8d4c4',
    y: '#d69838',
    k: '#181e24',
  };
  const cormorantStill = pair(
    [
      '......dd.....',
      '.....ddkdyy..',
      '.....ddww....',
      '.....ddd.....',
      '....dbbd.....',
      '...dbbbbd....',
      '..dbblbbbd...',
      '..dbbbbbbdd..',
      '...ddddddk...',
      '....dddd.....',
      '.....k.k.....',
      '.....k.k.....',
      '....kk.kk....',
    ],
    cormPal,
  );
  const cormorantSpread = pair(
    [
      '......dd......',
      '.....ddkdyy...',
      '.....ddww.....',
      '.dd..ddd..dd..',
      'dbbd.dbbd.dbbd',
      'dbbbdbbbdbbbbd',
      '.dbbbbbbbbbbd.',
      '..dddddddddd..',
      '....dddddd....',
      '.....k..k.....',
      '.....k..k.....',
      '....kk..kk....',
    ],
    cormPal,
  );
  const cormorantFlyA = pair(['..ddd.......', '.dbbbbd.....', 'dbbbbbdddyy.', '..kkddd.....'], cormPal);
  const cormorantFlyB = pair(['............', 'dbbbbbdddyy.', '..dbbbbd....', '...ddd......'], cormPal);

  // Small lakeside swallow / pied wagtail perched on posts.
  const swalPal: Readonly<Record<string, string>> = {
    n: '#26344c',
    b: '#405678',
    w: '#eeeae0',
    r: '#c85e42',
    k: '#1c2028',
  };
  const swallow = pair(
    [
      '...nnn....',
      '..nnknkk..',
      '..nnrww...',
      '.nbnnww...',
      '.nbbnww...',
      'nn.nnw....',
      '....k.....',
    ],
    swalPal,
  );
  const swallowFlyA = pair(['.nnn....', 'nbbnnwkk', '.nn.....'], swalPal);
  const swallowFlyB = pair(['........', 'nbbnnwkk', '..nn....'], swalPal);

  const duckPal: Readonly<Record<string, string>> = {
    g: '#326a48',
    G: '#204832',
    w: '#e8e4da',
    b: '#7a563c',
    B: '#543826',
    y: '#e8a838',
    k: '#1c2420',
  };
  const duckMotherA = pair(
    [
      '........ggg....',
      '.......ggkggyy.',
      '.......ggggg...',
      '.......ww......',
      '..bbbbbbbbb....',
      '.bBBBBbbbbbb...',
      '.BBBBBBBBBB....',
    ],
    duckPal,
  );
  const duckMotherB = pair(
    [
      '........ggg....',
      '.......ggkggyy.',
      '.......ggggg...',
      '.......ww......',
      '.bbbbbbbbbb....',
      'bBBBBbbbbbb....',
      '.BBBBBBBBBB....',
    ],
    duckPal,
  );
  const duckFlyA = pair(['...bb..........', '..bbbb..ggg....', '.bbbbbbbbkggyy.', '..BBBBBB.......'], duckPal);
  const duckFlyB = pair(['........ggg....', '.bbbbbbbbkggyy.', '..bbBBBBB......', '...BB..........'], duckPal);
  const duckling = pair(['....yy..', '...yykyy', '.yyyyyy.', 'yyyyy...'], { y: '#e6c656', k: '#2c2416' });

  return {
    heronStill,
    heronStrike,
    heronFlyA,
    heronFlyB,
    kingfisher,
    kingfisherFlyA,
    kingfisherFlyB,
    gullPerch,
    gullLook,
    gullFlyA,
    gullFlyB,
    cormorantStill,
    cormorantSpread,
    cormorantFlyA,
    cormorantFlyB,
    swallow,
    swallowFlyA,
    swallowFlyB,
    duckMotherA,
    duckMotherB,
    duckFlyA,
    duckFlyB,
    duckling,
  };
}

export function buildFishSprites() {
  const caughtFish: Record<FishSpecies, SpriteBox> = {
    perch: box(
      pixmap(
        [
          '.......dddddd.........',
          '....ddggggggggdd....dd',
          '..dgkggkggkggkgggd.ddd',
          '.dgwwkggkggkggkggdddd.',
          'dggwwggggggggggggddd..',
          '.dwwyyyyyyyyyyyyydd...',
          '..ddddddddddddddd.....',
        ],
        { d: '#28462c', g: '#5c944c', k: '#2e4e2a', w: '#eef4dc', y: '#d2ce84' },
      ),
    ),
    trout: box(
      pixmap(
        [
          '.......dddddd.........',
          '....ddbbrbbbbbbdd...dd',
          '..dbbbbrbbrbbbrbbd.ddd',
          '.dbwwbbbbbbrbbbbbbddd.',
          'dbbwwbbrbbbbbrbbbddd..',
          '.dwwsssssssssssssdd...',
          '..ddddddddddddddd.....',
        ],
        { d: '#443222', b: '#946e48', r: '#d85a42', w: '#f6eee4', s: '#d6ccb8' },
      ),
    ),
    carp: box(
      pixmap(
        [
          '.......ooooooo........',
          '....ooyyyyyyyyyoo...oo',
          '..oyyyyyyyyyyyyyyo.ooo',
          '.oywwyyyyyoyyyyyyoooo.',
          'oyywwyyyyyyyyyyyyooo..',
          '.owwgggggggggggggoo...',
          '..oooooooooooooooo....',
        ],
        { o: '#8c4c1c', y: '#eaa43a', w: '#fce6a2', g: '#c8802c' },
      ),
    ),
  };

  const tallyFish: Record<FishSpecies, SpriteBox> = {
    perch: box(pixmap(['.gggg.g', 'ggggggg', '.dddd..'], { g: '#6cb056', d: '#366034' })),
    trout: box(pixmap(['.bbrb.b', 'bbbbbbb', '.dddd..'], { b: '#b88656', r: '#e0644a', d: '#5c422a' })),
    carp: box(pixmap(['.yyyy.y', 'yyyyyyy', '.oooo..'], { y: '#f2b644', o: '#9e5c20' })),
  };

  // Curved silver-blue leaping fish for surface jumps.
  const jumpingFish = pair(
    [
      '...bbbb....',
      '.bbssssbb..',
      'bbwwksssbb.',
      'b.ssss..dd.',
      '.........d.',
    ],
    { b: '#527c98', s: '#c4dce8', w: '#f4f8fc', k: '#202c36', d: '#3a566a' },
  );

  // Two dragonfly colorways (teal and amber) with wings-up and wings-flat frames.
  const dragonflyTealA = pair(['..ww...', '.w..w..', 'ttttttt', '..TT...'], {
    w: '#d8eef4',
    t: '#3cb4c4',
    T: '#206878',
  });
  const dragonflyTealB = pair(['.......', '.ww.ww.', 'ttttttt', '.......'], {
    w: '#d8eef4',
    t: '#3cb4c4',
  });
  const dragonflyAmberA = pair(['..ww...', '.w..w..', 'ooooooo', '..dd...'], {
    w: '#f4ecd4',
    o: '#de8c36',
    d: '#8c4c1c',
  });
  const dragonflyAmberB = pair(['.......', '.ww.ww.', 'ooooooo', '.......'], {
    w: '#f4ecd4',
    o: '#de8c36',
  });

  return {
    caughtFish,
    tallyFish,
    jumpingFish,
    dragonflyTealA,
    dragonflyTealB,
    dragonflyAmberA,
    dragonflyAmberB,
  };
}

export function buildFloraSprites() {
  const stems = ['#3d5a3f', '#627f4b', '#839958'];
  const reeds: SpriteBox[] = [0, 1, 2, 3].map((variant) => {
    const w = 18;
    const h = 24 + variant * 3;
    const { canvas, ctx } = memoryCanvas(w, h);
    const rnd = seededRandom(501 + variant * 37);
    const stalks = 7 + (variant % 2);
    for (let i = 0; i < stalks; i++) {
      const root = 4 + i * 1.3;
      const top = 2 + Math.floor(rnd() * (h * 0.54));
      const lean = (i / (stalks - 1) - 0.5) * (6 + rnd() * 5);
      const tip = Math.round(root + lean);
      ctx.fillStyle = stems[i % stems.length];
      for (let y = top; y < h; y++) {
        const level = (h - y) / (h - top);
        ctx.fillRect(Math.round(root + lean * level * level), y, 1, 1);
      }

      if (i % 2 === 1 && top < h / 3) {
        ctx.fillStyle = '#6c4c35';
        ctx.fillRect(tip, top - 1, 2, 4);
        ctx.fillStyle = '#ad8456';
        ctx.fillRect(tip, top - 1, 1, 2);
      }

      // Each leaf splays from the lower stalk so the clump has gaps at the top.
      const side = i % 2 === 0 ? -1 : 1;
      const leafY = h - 3 - Math.floor(rnd() * 5);
      ctx.fillStyle = stems[(i + 1) % stems.length];
      for (let k = 0; k < 6; k++) {
        ctx.fillRect(Math.round(root + side * k * 0.78), leafY - k, k < 2 ? 2 : 1, 1);
      }
    }
    ctx.fillStyle = '#425a43';
    ctx.fillRect(4, h - 1, 10, 1);
    return box(canvas);
  });

  const lilyPads: SpriteBox[] = [
    // 0: Large notched pad
    box(
      pixmap(
        ['...hhhggggggg...', '.gghggggg.ggggg.', 'ggggggggg.gggggg', '.dddddddddddddd.'],
        { h: '#8da767', g: '#5a8b52', d: '#3c6944' },
      ),
    ),
    // 1: Large pad with blooming pink/white flower
    box(
      pixmap(
        [
          '......pppp......',
          '.....pwwwwp.....',
          '....ppwywwpp....',
          '..hhggggghgggg..',
          '.ggggggg.gggggg.',
          'gggggggg.ggggggg',
          '.ddddddddddddd..',
        ],
        { h: '#8da767', g: '#5a8b52', d: '#3c6944', p: '#d694a5', w: '#eee4d7', y: '#eac47e' },
      ),
    ),
    // 2: Small notched pad
    box(
      pixmap(
        ['..gggggg..', 'gggg.ggggg', '.dddddddd.'],
        { g: '#68a252', d: '#3e7032' },
      ),
    ),
    // 3: Pad with closed lotus bud
    box(
      pixmap(
        [
          '.....pp.....',
          '....pwwp....',
          '.ggggggggg..',
          'ggggg.gggggg',
          '.dddddddddd.',
        ],
        { g: '#568e44', d: '#36642c', p: '#e492aa', w: '#f6e4ea' },
      ),
    ),
  ];

  const farPines: SpriteBox[] = [0, 1, 2].map((variant) => {
    const w = 13 + variant * 2;
    const h = 24 + variant * 5;
    const { canvas, ctx } = memoryCanvas(w, h);
    const cx = Math.floor(w / 2);
    ctx.fillStyle = '#5c787c';
    ctx.fillRect(cx, h - 4, 1, 4);
    for (let y = 0; y < h - 3; y++) {
      const t = y / (h - 3);
      const tier = (t * 4) % 1;
      const half = Math.max(0, Math.round(cx * (0.15 + 0.85 * t) * (0.55 + 0.45 * tier)));
      ctx.fillStyle = tier > 0.78 ? '#4c6a72' : '#648286';
      ctx.fillRect(cx - half, y, half * 2 + 1, 1);
    }
    return box(canvas);
  });

  const midTrees: SpriteBox[] = [0, 1, 2, 3].map((variant) => {
    const isWillow = variant === 3;
    const w = isWillow ? 34 : 26 + variant * 4;
    const h = isWillow ? 34 : 30 + variant * 4;
    const { canvas, ctx } = memoryCanvas(w, h);
    const rnd = seededRandom(809 + variant * 41);
    const cx = Math.floor(w / 2);
    ctx.fillStyle = '#4a382c';
    ctx.fillRect(cx - 1, h - 11, 2, 11);
    const tones = ['#6c9258', '#537646', '#3c5a37'];
    for (let y = 2; y < h - 7; y++) {
      const ny = (y - h * 0.36) / (h * 0.36);
      const half = Math.round(w * 0.42 * Math.sqrt(Math.max(0, 1 - ny * ny)));
      for (let x = cx - half; x <= cx + half; x++) {
        const shade = (x - cx) / Math.max(1, half) + (rnd() - 0.5) * 0.4;
        ctx.fillStyle = tones[shade < -0.2 ? 0 : shade < 0.3 ? 1 : 2];
        ctx.fillRect(x, y, 1, 1);
      }
    }
    if (isWillow) {
      for (let x = 4; x < w - 4; x += 2) {
        if (rnd() < 0.25) continue;
        const bot = Math.round(h - 2 - rnd() * 6);
        ctx.fillStyle = rnd() < 0.5 ? '#6e9458' : '#4a6b3e';
        ctx.fillRect(x, Math.round(h * 0.36), 1, bot - Math.round(h * 0.36));
      }
    }
    return box(canvas);
  });

  const shoreBushes: SpriteBox[] = [0, 1].map((variant) => {
    const w = 18 + variant * 4;
    const h = 10 + variant * 2;
    const { canvas, ctx } = memoryCanvas(w, h);
    const rnd = seededRandom(977 + variant * 53);
    const cx = Math.floor(w / 2);
    const tones = ['#6e9254', '#507240', '#385430'];
    for (let y = 1; y < h; y++) {
      const ny = (y - h * 0.65) / (h * 0.58);
      const half = Math.round((w * 0.46) * Math.sqrt(Math.max(0, 1 - ny * ny)));
      for (let x = cx - half; x <= cx + half; x++) {
        const idx = y < 4 && x < cx + 2 ? 0 : y > h - 3 || rnd() < 0.25 ? 2 : 1;
        ctx.fillStyle = tones[idx];
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return box(canvas);
  });

  return { reeds, lilyPads, farPines, midTrees, shoreBushes };
}
