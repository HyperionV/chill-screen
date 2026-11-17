import { mirrored, pixmap } from '../pixmap';
import type { SpriteBox } from './sprites';

export interface SpritePair {
  right: SpriteBox;
  left: SpriteBox;
}

export interface CastSprites {
  anglerSit: SpritePair;
  anglerSitWave: SpritePair;
  anglerNap: SpritePair;
  anglerNapWave: SpritePair;
  anglerFish: SpritePair;
  anglerFishWave: SpritePair;
  bucket: SpriteBox;
  keeperIdle: SpritePair;
  keeperWave: SpritePair;
  farmerSit: SpritePair;
  farmerWave: SpritePair;
  villagers: [SpritePair, SpritePair][];
  duckMother: SpritePair;
  duckling: SpritePair;
  heronStill: SpritePair;
  heronStrike: SpritePair;
  heronFlyA: SpritePair;
  heronFlyB: SpritePair;
  kingfisher: SpritePair;
  gullPerch: SpritePair;
  gullFlyA: SpritePair;
  gullFlyB: SpritePair;
  cowStand: SpritePair;
  cowDrink: SpritePair;
  sheep: SpritePair;
  cats: [SpritePair, SpritePair][];
  frog: SpriteBox;
}

function box(canvas: HTMLCanvasElement): SpriteBox {
  return { canvas, w: canvas.width, h: canvas.height };
}

function pair(rows: readonly string[], palette: Readonly<Record<string, string>>): SpritePair {
  const canvas = pixmap(rows, palette);
  return { right: box(canvas), left: box(mirrored(canvas)) };
}

export function buildCastSprites(): CastSprites {
  const anglerPal = {
    h: '#edd068',
    b: '#a67628',
    s: '#f2c49e',
    e: '#2c221b',
    w: '#ede8da',
    v: '#4b7246',
    d: '#355432',
    p: '#3b4a5c',
    k: '#4a3222',
    f: '#b8dce8',
    g: '#769cb4',
  };
  const keeperPal = {
    c: '#263b5c',
    y: '#e2bd4a',
    s: '#f2c49e',
    e: '#241c18',
    j: '#2d4b70',
    d: '#1e324c',
    p: '#26303d',
    k: '#1c1e24',
  };
  const farmerPal = {
    h: '#865e3a',
    b: '#5c3e24',
    s: '#ebbf98',
    e: '#281e18',
    f: '#b84c3e',
    d: '#863228',
    p: '#445e7e',
    k: '#33241a',
  };

  return {
    anglerSit: pair([
      '....hhhh....',
      '..hhhhhhhh..',
      '.bbbbbbbbbb.',
      '...sssse....',
      '...sssss....',
      '..wwvvvvv...',
      '..wsvvvvvs..',
      '..wwddddv...',
      '...pppppp...',
      '...ppp..pp..',
      '...pp....p..',
      '...kk....k..',
      '..kkk....kk.',
    ], anglerPal),
    anglerSitWave: pair([
      '....hhhh....',
      '..hhhhhhhh..',
      '.bbbbbbbbbb.',
      's..sssse....',
      's..sssss....',
      '.s.wvvvvv...',
      '..wwvvvvvs..',
      '...wddddv...',
      '...pppppp...',
      '...ppp..pp..',
      '...pp....p..',
      '...kk....k..',
      '..kkk....kk.',
    ], anglerPal),
    anglerNap: pair([
      '............',
      '....hhhh....',
      '..hhhhhhhh..',
      '.bbbbbbbbbb.',
      '...sssse....',
      '..wwvvvvv...',
      '.wwvvvvvvs..',
      '.wwdddddd...',
      '..pppppppp..',
      '..ppp...pp..',
      '..kk....kk..',
    ], anglerPal),
    anglerNapWave: pair([
      '....hhhh....',
      '..hhhhhhhh..',
      '.bbbbbbbbbb.',
      '...sssse..s.',
      '...sssss.ss.',
      '..wwvvvvvs..',
      '..wwvvvvv...',
      '..wwdddd....',
      '...pppppp...',
      '...pp..pp...',
      '..kkk..kk...',
    ], anglerPal),
    anglerFish: pair([
      '....hhhh....',
      '..hhhhhhhh..',
      '.bbbbbbbbbb.',
      '...sssse....',
      '...sssss....',
      'ff.wvvvvv...',
      'gfwsvvvvvs..',
      'fg.wddddv...',
      'f..pppppp...',
      '...pp..pp...',
      '...pp..pp...',
      '...pp..pp...',
      '..kkk..kkk..',
    ], anglerPal),
    anglerFishWave: pair([
      '....hhhh....',
      '..hhhhhhhh..',
      '.bbbbbbbbbb.',
      '...sssse..s.',
      '...sssss.ss.',
      'ff.wvvvvvs..',
      'gfwsvvvvv...',
      'fg.wdddd....',
      'f..pppppp...',
      '...pp..pp...',
      '...pp..pp...',
      '...pp..pp...',
      '..kkk..kkk..',
    ], anglerPal),
    bucket: box(pixmap([
      '..kkk..',
      '.k...k.',
      'rrrrrrr',
      'rdddddr',
      'rdddddr',
      'rrrrrrr',
      '.rrrrr.',
    ], { k: '#7e8690', r: '#bd4a3c', d: '#8a3228' })),
    keeperIdle: pair([
      '...cccccc...',
      '..cccccccc..',
      '..ccyyyycc..',
      '...sssse....',
      '...sssss....',
      '..jjjjjjjj..',
      '..jjyjjyjj..',
      '.sjjyjjyjjs.',
      '..dddddddd..',
      '...pppppp...',
      '...pp..pp...',
      '...pp..pp...',
      '...pp..pp...',
      '..kkk..kkk..',
    ], keeperPal),
    keeperWave: pair([
      '...cccccc...',
      '..cccccccc..',
      '..ccyyyycc.s',
      '...sssse..ss',
      '...sssss.ss.',
      '..jjjjjjjs..',
      '..jjyjjyj...',
      '.sjjyjjyj...',
      '..ddddddd...',
      '...pppppp...',
      '...pp..pp...',
      '...pp..pp...',
      '...pp..pp...',
      '..kkk..kkk..',
    ], keeperPal),
    farmerSit: pair([
      '...hhhhhh...',
      '.bbbbbbbbbb.',
      '...sssse....',
      '...sssss....',
      '..ffffffff..',
      '.sffddddffs.',
      '.sffffffffs.',
      '..pppppppp..',
      '..pppppppp..',
      '..pp....pp..',
      '.kkk....kkk.',
    ], farmerPal),
    farmerWave: pair([
      '...hhhhhh...',
      '.bbbbbbbbbb.',
      's..sssse....',
      's..sssss....',
      '.s.fffffff..',
      '..ffddddffs.',
      '...fffffff..',
      '..pppppppp..',
      '..pppppppp..',
      '..pp....pp..',
      '.kkk....kkk.',
    ], farmerPal),
    villagers: [
      [
        pair([
          '..kkkk..',
          '.kkkkkk.',
          '..ssse..',
          '..ssss..',
          '.rrrrrr.',
          '.srrrrs.',
          '.rddddr.',
          '..pppp..',
          '..p..p..',
          '..p..p..',
          '.kk..kk.',
        ], { k: '#543828', s: '#f2c49e', e: '#281e18', r: '#c95242', d: '#98382c', p: '#3c4e66' }),
        pair([
          '..kkkk..',
          '.kkkkkk.',
          '..ssse.s',
          '..ssssss',
          '.rrrrrs.',
          '.srrrr..',
          '.rdddr..',
          '..pppp..',
          '..p..p..',
          '..p..p..',
          '.kk..kk.',
        ], { k: '#543828', s: '#f2c49e', e: '#281e18', r: '#c95242', d: '#98382c', p: '#3c4e66' }),
      ],
      [
        pair([
          '..bbbb..',
          '.bbbbbb.',
          '..ssse..',
          '..ssss..',
          '.gggggg.',
          '.sggggs.',
          '.gggggg.',
          '.dddddd.',
          '..d..d..',
          '..k..k..',
        ], { b: '#d4b05a', s: '#ebbf98', e: '#281e18', g: '#4c865e', d: '#44382e', k: '#241c18' }),
        pair([
          '..bbbb..',
          '.bbbbbb.',
          's.ssse..',
          'ssssss..',
          '.sggggg.',
          '..ggggs.',
          '.gggggg.',
          '.dddddd.',
          '..d..d..',
          '..k..k..',
        ], { b: '#d4b05a', s: '#ebbf98', e: '#281e18', g: '#4c865e', d: '#44382e', k: '#241c18' }),
      ],
      [
        pair([
          '..mmmm..',
          '.mmmmmm.',
          '..ssse..',
          '..ssss..',
          '.yyyyyy.',
          '.syyyys.',
          '.yooooy.',
          '..pppp..',
          '..p..p..',
          '..p..p..',
          '.kk..kk.',
        ], { m: '#3c4a62', s: '#f2c49e', e: '#281e18', y: '#d8a642', o: '#a87c2a', p: '#363a44', k: '#241c18' }),
        pair([
          '..mmmm..',
          '.mmmmmm.',
          '..ssse.s',
          '..ssssss',
          '.yyyyys.',
          '.syyyy..',
          '.yoooy..',
          '..pppp..',
          '..p..p..',
          '..p..p..',
          '.kk..kk.',
        ], { m: '#3c4a62', s: '#f2c49e', e: '#281e18', y: '#d8a642', o: '#a87c2a', p: '#363a44', k: '#241c18' }),
      ],
    ],
    duckMother: pair([
      '.........ggg...',
      '........ggegyy.',
      '........gggg...',
      '....bbbbwww....',
      '..bbbbbbbbbb...',
      'wwbbbbbbddbbb..',
      '.wbbbbbddddbb..',
      '..bbbbbbbbbb...',
    ], { g: '#2d7848', e: '#18241c', y: '#e4b234', w: '#f2eee2', b: '#8e785c', d: '#64523c' }),
    duckling: pair([
      '....yyy..',
      '...yyeyo.',
      '.yyyyyy..',
      'yyyydddy.',
      '.dddddd..',
    ], { y: '#f0d44e', e: '#282018', o: '#d87e2c', d: '#c29e30' }),
    heronStill: pair([
      '.......www....',
      '......wwweyyyy',
      '......wwww....',
      '......wwg.....',
      '.....gggw.....',
      '....ggggg.....',
      '...gggggd.....',
      '..ggggddd.....',
      '..ggdddd......',
      '...dddd.......',
      '....d.d.......',
      '....d.d.......',
      '....d.d.......',
      '....d.d.......',
      '....dd.d......',
    ], { w: '#eef2f5', e: '#1c242c', g: '#8a9aa8', d: '#52606e', y: '#e6b446' }),
    heronStrike: pair([
      '................',
      '................',
      '......www.......',
      '....ggggwwweyyyy',
      '..ggggggdddd....',
      '.ggggggddd......',
      '...dd..d........',
      '...d...d........',
      '...d...d........',
      '...d...d........',
      '...dd..dd.......',
    ], { w: '#eef2f5', e: '#1c242c', g: '#8a9aa8', d: '#52606e', y: '#e6b446' }),
    heronFlyA: pair([
      '....ddddd........',
      '...ddddddd.......',
      '..ggggggggww.....',
      'ggggggggggwwweyyy',
      '..ggggdddd.......',
      '.....ddd.........',
    ], { w: '#eef2f5', e: '#1c242c', g: '#8a9aa8', d: '#52606e', y: '#e6b446' }),
    heronFlyB: pair([
      '.................',
      'ggggggggggwwweyyy',
      '..ggggggggww.....',
      '...ddddddd.......',
      '....ddddd........',
    ], { w: '#eef2f5', e: '#1c242c', g: '#8a9aa8', d: '#52606e', y: '#e6b446' }),
    kingfisher: pair([
      '....bbb...',
      '...bbebkk.',
      '...bbbb...',
      '..bbbooo..',
      '.bbbbooo..',
      'bb..oooo..',
      '.....kk...',
    ], { b: '#22a4ca', e: '#142028', o: '#e67e32', k: '#322822' }),
    gullPerch: pair([
      '.....www..',
      '....wwewyy',
      '....wwww..',
      '..ggwwww..',
      '.ggggwww..',
      'kggggwww..',
      '..wwwwww..',
      '...y..y...',
      '..yy..yy..',
    ], { w: '#f2f4f6', e: '#1e242c', g: '#8e9aa6', k: '#2d323a', y: '#e4b640' }),
    gullFlyA: pair([
      'ww......ww',
      '.wgw..wgw.',
      '..wwggww..',
      '...wwyy...',
    ], { w: '#f2f4f6', g: '#8e9aa6', y: '#e4b640' }),
    gullFlyB: pair([
      '..........',
      'kwwgwwgwwk',
      '..wwwwww..',
      '...wwyy...',
    ], { w: '#f2f4f6', g: '#8e9aa6', k: '#2d323a', y: '#e4b640' }),
    cowStand: pair([
      '................cc....',
      '...............wwww...',
      '..kkkwwwwkkwwwwewwpp..',
      '.kwwwwkkkkwwwwwwwwpp..',
      'kwwwwwkkkkwwwwwwwww...',
      'kwwwwwwwwwwkkkwwww....',
      '.wwwww..wwkkkkwwww....',
      '..kk......kkkk..kk....',
      '..kk......kk....kk....',
      '..kk......kk....kk....',
      '..dd......dd....dd....',
    ], { w: '#f0ede4', k: '#282424', d: '#161414', c: '#d8ccb2', p: '#e4b2a8', e: '#1c1818' }),
    cowDrink: pair([
      '......................',
      '..kkkwwwwkkwww........',
      '.kwwwwkkkkwwwww.......',
      'kwwwwwkkkkwwwwwwwcc...',
      'kwwwwwwwwwwkkkwwweww..',
      '.wwwww..wwkkkkwwwwpp..',
      '..kk......kkkk..kkpp..',
      '..kk......kk....kk....',
      '..kk......kk....kk....',
      '..dd......dd....dd....',
    ], { w: '#f0ede4', k: '#282424', d: '#161414', c: '#d8ccb2', p: '#e4b2a8', e: '#1c1818' }),
    sheep: pair([
      '.........kk..',
      '..wwwwwwkkek.',
      '.wwwwwwwwkkk.',
      'wwwwwwwwww...',
      'wwwwdddddd...',
      '..dd....dd...',
      '..kk....kk...',
    ], { w: '#f2eee2', d: '#cbc4b4', k: '#342e28', e: '#ece8dc' }),
    cats: [
      [
        pair([
          '.o..o....',
          '.oooo....',
          '.oeoo....',
          '..ooo..o.',
          '.ooooo.o.',
          '.oooooo..',
          '.oooooo..',
          '..oo.oo..',
          '..ww.ww..',
        ], { o: '#dc823c', e: '#281c14', w: '#f0e8d8' }),
        pair([
          '..o..o........',
          '..oooo........',
          '..oeoo......o.',
          '...ooooooo..o.',
          '..oooooooooo..',
          '...oo....oo...',
          '...ww....ww...',
        ], { o: '#dc823c', e: '#281c14', w: '#f0e8d8' }),
      ],
      [
        pair([
          '.k..k....',
          '.kkkk....',
          '.keww....',
          '..www..k.',
          '.kwwkk.k.',
          '.kkkkkk..',
          '.kkkkkk..',
          '..kk.kk..',
          '..ww.ww..',
        ], { k: '#2b2d34', e: '#7cc464', w: '#f0eee8' }),
        pair([
          '..k..k........',
          '..kkkk........',
          '..keww......k.',
          '...kkkkkkk..k.',
          '..kkkwwwkkkk..',
          '...kk....kk...',
          '...ww....ww...',
        ], { k: '#2b2d34', e: '#7cc464', w: '#f0eee8' }),
      ],
    ],
    frog: box(pixmap([
      '.g..g.',
      'geggeg',
      'gggggg',
      'dggggd',
      '.d..d.',
    ], { g: '#5eb246', d: '#38762c', e: '#f0e674' })),
  };
}
