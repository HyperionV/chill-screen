import { drawText, plainText, textWidth } from '../../../render/pixel-font';
import { memoryCanvas } from '../../../render/pixel-stage';
import { pixmap } from '../../journeys/pixmap';
import type { SpriteBox } from './cast-sprites';

function box(canvas: HTMLCanvasElement): SpriteBox {
  return { canvas, w: canvas.width, h: canvas.height };
}

/** Builds three distinct pixel-art billboard adverts (112x50, no real brands). */
export function buildBillboardAdverts(): readonly SpriteBox[] {
  const w = 112;
  const h = 50;

  // Advert 0: Dawn Brew Coffee
  const ad0 = memoryCanvas(w, h);
  {
    const c = ad0.ctx;
    c.fillStyle = '#f2e4cc';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#d8b482';
    c.fillRect(0, 36, w, 14);
    c.fillStyle = '#5c3828';
    c.fillRect(2, 2, w - 4, 2);
    c.fillRect(2, h - 4, w - 4, 2);

    const mug = pixmap(
      [
        '....S...S.....',
        '...S...S......',
        '....S...S.....',
        '..............',
        '.RRRRRRRRRR...',
        'RHHHHHHHHHHR..',
        'RRRRRRRRRRRRRR',
        'RLLLLLLRRRRR.R',
        'RLLLLLLRRRRRRR',
        'RLLLLLLRRRRR.R',
        'RRRRRRRRRRRRR.',
        '.RRRRRRRRRR...',
        '..DDDDDDDD....',
      ],
      { S: '#b89878', R: '#b84638', H: '#f8f2e4', L: '#d8765c', D: '#782a22' },
    );
    c.drawImage(mug, 12, 16);

    drawText(c, plainText('DAWN BREW'), 38, 14, '#4a281c', 2);
    drawText(c, plainText('FRESH ROAST'), 40, 29, '#8c4830', 1);
  }

  // Advert 1: Astro Pop Soda
  const ad1 = memoryCanvas(w, h);
  {
    const c = ad1.ctx;
    c.fillStyle = '#1c244c';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#2c3a74';
    for (let y = 0; y < h; y += 2) c.fillRect(0, y, w, 1);

    c.fillStyle = '#ffe484';
    for (const [sx, sy] of [
      [10, 10],
      [24, 38],
      [96, 12],
      [102, 34],
      [42, 8],
    ]) {
      c.fillRect(sx, sy, 2, 2);
    }

    const bottle = pixmap(
      [
        '....GG....',
        '....CC....',
        '...CCCC...',
        '..CCCCCC..',
        '.CCYYYYCC.',
        '.CCRRRRCC.',
        '.CCYYYYCC.',
        '.CCCCCCCC.',
        '.CCCHHCCC.',
        '.CCCHHCCC.',
        '.CCCCCCCC.',
        '..DDDDDD..',
      ],
      { G: '#ffd24c', C: '#62d4e8', Y: '#ffdf66', R: '#ee5c6c', H: '#bdf4ff', D: '#2c86a2' },
    );
    c.drawImage(bottle, 14, 15);

    drawText(c, plainText('ASTRO POP'), 36, 14, '#70e8f8', 2);
    drawText(c, plainText('COSMIC FIZZ'), 40, 29, '#ffd86b', 1);
  }

  // Advert 2: Cloud 9 Vinyl
  const ad2 = memoryCanvas(w, h);
  {
    const c = ad2.ctx;
    c.fillStyle = '#2d4454';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#e07a5f';
    c.fillRect(0, 32, w, 18);
    c.fillStyle = '#f2cc8f';
    c.fillRect(0, 29, w, 3);

    const vinyl = pixmap(
      [
        '...DDDDDD...',
        '..DDDDDDDD..',
        '.DDGGGGGGDD.',
        'DDGDDDDDDGDD',
        'DDGDCCCCDGDD',
        'DDGDCWWCDGDD',
        'DDGDCWWCDGDD',
        'DDGDCCCCDGDD',
        'DDGDDDDDDGDD',
        '.DDGGGGGGDD.',
        '..DDDDDDDD..',
        '...DDDDDD...',
      ],
      { D: '#1d222c', G: '#4a5464', C: '#e87a58', W: '#f4e8d2' },
    );
    c.drawImage(vinyl, 13, 14);

    const title = plainText('CLOUD 9');
    const tw = textWidth(title) * 2;
    drawText(c, title, Math.round(70 - tw / 2), 12, '#f8eedc', 2);
    drawText(c, plainText('LOFI NIGHTS'), 42, 36, '#232c36', 1);
  }

  return [box(ad0.canvas), box(ad1.canvas), box(ad2.canvas)];
}
