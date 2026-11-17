import { pixmap } from '../pixmap';

export interface ParrotSet {
  perch: HTMLCanvasElement;
  preen: HTMLCanvasElement;
  flash: HTMLCanvasElement;
  call: HTMLCanvasElement;
  fly1: HTMLCanvasElement;
  fly2: HTMLCanvasElement;
}

export interface CreatureSprites {
  friend: {
    sit: HTMLCanvasElement;
    tilt: HTMLCanvasElement;
    swing: HTMLCanvasElement;
    shelter: HTMLCanvasElement;
    statue: HTMLCanvasElement;
    sleep: HTMLCanvasElement;
  };
  troop: {
    sit: HTMLCanvasElement;
    walk1: HTMLCanvasElement;
    walk2: HTMLCanvasElement;
    swing: HTMLCanvasElement;
  };
  parrots: ParrotSet[];
  toucan: { perch: HTMLCanvasElement; tilt: HTMLCanvasElement };
  egret: { stand: HTMLCanvasElement; walk: HTMLCanvasElement; strike: HTMLCanvasElement };
  kingfisher: { perch: HTMLCanvasElement; dive: HTMLCanvasElement };
  croc: { open: HTMLCanvasElement; blink: HTMLCanvasElement };
  frog: { sit: HTMLCanvasElement; puff: HTMLCanvasElement; leap: HTMLCanvasElement };
  bat: { up: HTMLCanvasElement; down: HTMLCanvasElement };
}

/** Palette shared by the recurring small monkey: warm fur, light-brown face, white mouth. */
const FRIEND_PALETTE = {
  b: '#7b4f32',
  d: '#52321e',
  f: '#d4a87c',
  w: '#f4eee0',
  k: '#1a1412',
};

const TROOP_PALETTE = {
  b: '#5c4230',
  d: '#38261a',
  f: '#b89474',
  k: '#1a1412',
};

const PARROT_PALETTES = [
  { p: '#d9382e', s: '#f0b830', a: '#3b74cc', k: '#1e1a18', b: '#e8d8b0', o: '#e8882c', w: '#f6f2e8', d: '#2c2624' },
  { p: '#3ca84a', s: '#2a6898', a: '#e6be38', k: '#1e1a18', b: '#e8d8b0', o: '#e8882c', w: '#f6f2e8', d: '#2c2624' },
  { p: '#2e7ac8', s: '#f2b82a', a: '#46a878', k: '#1e1a18', b: '#302c2a', o: '#524c48', w: '#f6f2e8', d: '#2c2624' },
] as const;

const TOUCAN_PALETTE = {
  d: '#1c2026',
  y: '#f2c438',
  o: '#ee7424',
  k: '#181414',
  w: '#d8e4f0',
};

const EGRET_PALETTE = {
  w: '#eef2ee',
  s: '#c8d2cc',
  y: '#e8b63a',
  k: '#2a302e',
};

const KINGFISHER_PALETTE = {
  b: '#2284d4',
  l: '#5ec8f4',
  o: '#d87634',
  w: '#f4eee2',
  k: '#1c2024',
};

const CROC_PALETTE = {
  g: '#2a4a32',
  d: '#16281c',
  e: '#e8b632',
  k: '#121814',
};

const FROG_PALETTE = {
  g: '#58b448',
  d: '#367432',
  s: '#f2eab8',
  k: '#182418',
};

const BAT_PALETTE = {
  d: '#282230',
  m: '#443a50',
};

function buildParrot(palette: Record<string, string>): ParrotSet {
  return {
    perch: pixmap(
      ['..pp.', '.pfw.', '..pbo', '.ppps', '.pppa', '.dd..', '..p..', '..p..'],
      { ...palette, f: palette.p },
    ),
    preen: pixmap(
      ['.....', '..pp.', '.pbo.', '.pfw.', '.ppps', '.dd..', '..p..', '..p..'],
      { ...palette, f: palette.p },
    ),
    flash: pixmap(
      ['ss.pp.ss', 'apafwap.', '.pppbop.', '..ppps..', '...dd...', '...p....'],
      { ...palette, f: palette.p },
    ),
    call: pixmap(
      ['.pp..', 'pfwbo', '.ppb.', '.ppps', '.pppa', '.dd..', '..p..'],
      { ...palette, f: palette.p },
    ),
    fly1: pixmap(['s.pp.s', 'aappaa', '.ppbo.', '..p...'], palette),
    fly2: pixmap(['..pp..', '.ppbo.', 'aappaa', 's....s'], palette),
  };
}

let cached: CreatureSprites | null = null;

/** Builds all pixel-art creature sprites once and caches them across resizes. */
export function getCreatureSprites(): CreatureSprites {
  if (cached) return cached;

  const friend: CreatureSprites['friend'] = {
    sit: pixmap(
      ['..bbb...', '.bfffb..', '.bkfkb..', '..www...', '.bbbbb.d', 'b.bbb.d.', '..d.d...'],
      FRIEND_PALETTE,
    ),
    tilt: pixmap(
      ['...bbb..', '..bfffb.', '..bkfkb.', '...www..', '.bbbbb.d', 'b.bbb.d.', '..d.d...'],
      FRIEND_PALETTE,
    ),
    swing: pixmap(
      ['b....b..', '.b..b...', '..bbb...', '.bfffb..', '.bkfkb..', '..www...', '.bbbbb.d', '..d.d.d.'],
      FRIEND_PALETTE,
    ),
    shelter: pixmap(
      ['........', '..bbb...', '.bfffb..', '.bkfkb..', '.bwwwb..', '.bbbbd..', '..ddd...'],
      FRIEND_PALETTE,
    ),
    statue: pixmap(
      ['..bbb...', '.bfffb..', '.bkfkb..', '..www...', '.bbbbb..', '..d.d..d', '......d.'],
      FRIEND_PALETTE,
    ),
    sleep: pixmap(
      ['........', '........', '..bbbb..', '.bfffbd.', '.bwwwbd.', '.bbbbb..', '...dd...'],
      FRIEND_PALETTE,
    ),
  };

  const troop: CreatureSprites['troop'] = {
    sit: pixmap(['..bbb..', '.bfffb.', '.bkfkb.', '.bbbbb.', '.d.d..d', '......d'], TROOP_PALETTE),
    walk1: pixmap(['..bbb..', '.bfffb.', '.bbbbb.', 'd.b.b.d', '.d...d.'], TROOP_PALETTE),
    walk2: pixmap(['..bbb..', '.bfffb.', '.bbbbb.', '.d.b.d.', 'd.....d'], TROOP_PALETTE),
    swing: pixmap(['b...b..', '.b.b...', '..bbb..', '.bfffb.', '.bbbbb.', '..d.d..'], TROOP_PALETTE),
  };

  const parrots = PARROT_PALETTES.map((p) => buildParrot({ ...p }));

  const toucan = {
    perch: pixmap(['..dd..', '.dyyoo', '.dwyo.', '.dddd.', '.dddd.', '.d..k.', '..d...'], TOUCAN_PALETTE),
    tilt: pixmap(['...oo.', '..dyyo', '.dwyo.', '.dddd.', '.dddd.', '.d..k.', '..d...'], TOUCAN_PALETTE),
  };

  const egret = {
    stand: pixmap(
      ['.....ww..', '....wwyy.', '....ww...', '....ww...', '..wwww...', '.wwwwws..', '..ssss...', '...k.k...', '...k.k...', '...k.k...'],
      EGRET_PALETTE,
    ),
    walk: pixmap(
      ['.....ww..', '....wwyy.', '....ww...', '....ww...', '..wwww...', '.wwwwws..', '..ssss...', '..k...k..', '.k.....k.', '.k.....k.'],
      EGRET_PALETTE,
    ),
    strike: pixmap(
      ['.........', '.........', '.........', '..wwww...', '.wwwwws..', '..ssssww.', '...k.k.ww', '...k.k..y', '...k.k..y'],
      EGRET_PALETTE,
    ),
  };

  const kingfisher = {
    perch: pixmap(['..bb..', '.bkbll', '.bbow.', '.bbo..', '.bb...', '..k...'], KINGFISHER_PALETTE),
    dive: pixmap(['..bb...', '.bbo...', 'bbowbkl', '..bb...'], KINGFISHER_PALETTE),
  };

  const croc = {
    open: pixmap(['.ge..eg..gg.', 'dggggggggggd'], CROC_PALETTE),
    blink: pixmap(['.gg..gg..gg.', 'dggggggggggd'], CROC_PALETTE),
  };

  const frog = {
    sit: pixmap(['.g.g.', 'kgggk', 'ggggd', 'd..d.'], FROG_PALETTE),
    puff: pixmap(['.g.g.', 'ksssk', 'gssss', 'd..d.'], FROG_PALETTE),
    leap: pixmap(['..g.g.', '.gggg.', 'd...dg', 'd....d'], FROG_PALETTE),
  };

  const bat = {
    up: pixmap(['d....d', 'dm..md', '.dddd.'], BAT_PALETTE),
    down: pixmap(['..dd..', 'dmddmd', 'd....d'], BAT_PALETTE),
  };

  cached = { friend, troop, parrots, toucan, egret, kingfisher, croc, frog, bat };
  return cached;
}

export function drawFacing(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  facing: 1 | -1,
): void {
  const rx = Math.round(x);
  const ry = Math.round(y);
  if (facing === 1) {
    ctx.drawImage(sprite, rx, ry);
    return;
  }
  ctx.save();
  ctx.translate(rx + sprite.width, ry);
  ctx.scale(-1, 1);
  ctx.drawImage(sprite, 0, 0);
  ctx.restore();
}
