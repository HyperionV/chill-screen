import { memoryCanvas } from '../../../render/pixel-stage';
import { seededRandom } from '../../../world/math';
import { mirrored, pixmap } from '../../journeys/pixmap';
import type { SpriteBox, SpritePair } from './sprites';
import type { FishSpecies } from './types';

function box(canvas: HTMLCanvasElement): SpriteBox {
  return { canvas, w: canvas.width, h: canvas.height };
}

function pair(rows: readonly string[], palette: Readonly<Record<string, string>>): SpritePair {
  const canvas = pixmap(rows, palette);
  return { right: box(canvas), left: box(mirrored(canvas)) };
}

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

  return { caughtFish, tallyFish };
}

export function buildFloraSprites() {
  const reeds: SpriteBox[] = [0, 1, 2].map((variant) => {
    const w = 16;
    const h = 26 + variant * 3;
    const { canvas, ctx } = memoryCanvas(w, h);
    const rnd = seededRandom(501 + variant * 37);
    for (let i = 0; i < 6; i++) {
      const x = 1 + i * 2 + Math.floor(rnd() * 2);
      const top = Math.floor(rnd() * 8);
      ctx.fillStyle = i % 2 === 0 ? '#74984c' : '#4f7238';
      ctx.fillRect(x, top, 1, h - top);
      if (i % 2 === 1 && rnd() < 0.7) {
        ctx.fillStyle = '#6c3e26';
        ctx.fillRect(x, top + 1, 1, 4);
      }
    }
    return box(canvas);
  });

  const lilyPads: SpriteBox[] = [
    box(
      pixmap(
        ['...gggggggggg...', '.gggggggg.ggggg.', 'ggggggggg.gggggg', '.dddddddddddddd.'],
        { g: '#5a9446', d: '#3a6a2e' },
      ),
    ),
    box(
      pixmap(
        [
          '......pppp......',
          '.....pwwwwp.....',
          '....ppwwwwpp....',
          '..gggggggggggg..',
          '.ggggggg.gggggg.',
          'gggggggg.ggggggg',
          '.ddddddddddddd..',
        ],
        { g: '#5a9446', d: '#3a6a2e', p: '#e89ab2', w: '#faf0f4' },
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

  const midTrees: SpriteBox[] = [0, 1, 2].map((variant) => {
    const w = 26 + variant * 4;
    const h = 30 + variant * 4;
    const { canvas, ctx } = memoryCanvas(w, h);
    const rnd = seededRandom(809 + variant * 41);
    const cx = Math.floor(w / 2);
    ctx.fillStyle = '#4a382c';
    ctx.fillRect(cx - 1, h - 10, 2, 10);
    const tones = ['#688c54', '#507244', '#3b5836'];
    for (let y = 2; y < h - 7; y++) {
      const ny = (y - h * 0.36) / (h * 0.36);
      const half = Math.round(w * 0.42 * Math.sqrt(Math.max(0, 1 - ny * ny)));
      for (let x = cx - half; x <= cx + half; x++) {
        const shade = (x - cx) / Math.max(1, half) + (rnd() - 0.5) * 0.4;
        ctx.fillStyle = tones[shade < -0.2 ? 0 : shade < 0.3 ? 1 : 2];
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return box(canvas);
  });

  return { reeds, lilyPads, farPines, midTrees };
}
