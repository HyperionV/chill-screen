"""Generates the ChillScreen logo options as pixel-art SVGs (16 x 16 grids) and a preview page."""
from pathlib import Path

OUT = Path(__file__).parent

PALETTE = {
    '.': '#12224a',  # navy background
    'n': '#0a1530',  # deep navy
    'b': '#1d3a73',  # mid navy
    'M': '#f0c97c',  # moon / warm light
    'm': '#c79a4b',  # moon shade
    's': '#e8f1ee',  # star
    'h': '#2b5a8c',  # far hills
    'g': '#3f7f86',  # near hills
    'l': '#7fb4ad',  # lake
    'f': '#8a6a4c',  # wood frame
    'F': '#b58b62',  # wood frame light
    'w': '#9cb5af',  # screen rim
}

def blank() -> list[list[str]]:
    return [['.'] * 16 for _ in range(16)]


def put(g: list[list[str]], x: int, y: int, ch: str) -> None:
    if 0 <= x < 16 and 0 <= y < 16:
        g[y][x] = ch


def rect(g: list[list[str]], x0: int, y0: int, x1: int, y1: int, ch: str) -> None:
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            put(g, x, y, ch)


MOON_LARGE = ['..MMM..', '.MM....', 'MM.....', 'MM.....', 'MM.....', '.MM..MM', '..MMMM.']
MOON_SMALL = ['.MMM.', 'MM...', 'MM...', 'MM..M', '.MMM.']


def moon(g: list[list[str]], x: int, y: int, shape: list[str]) -> None:
    """Stamps a crescent with its top-left corner at (x, y)."""
    for dy, row in enumerate(shape):
        for dx, ch in enumerate(row):
            if ch == 'M':
                put(g, x + dx, y + dy, 'M')


def hills(g: list[list[str]], x0: int, x1: int, base: int) -> None:
    """Two ridges and a strip of lake along the bottom of the area."""
    ridge_far = [3, 3, 2, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 2, 3, 3]
    ridge_near = [1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1]
    for x in range(x0, x1 + 1):
        for y in range(base - ridge_far[x] - 2, base):
            put(g, x, y, 'h')
        for y in range(base - ridge_near[x], base):
            put(g, x, y, 'g')


def option_a() -> list[str]:
    g = blank()
    for p in [(2, 2), (13, 1), (1, 6), (14, 7), (5, 4)]:
        put(g, *p, 's')
    moon(g, 8, 2, MOON_LARGE)
    hills(g, 0, 15, 12)
    rect(g, 0, 12, 15, 15, 'l')
    for x in (3, 4, 9, 10, 11):
        put(g, x, 14, 'g')
    return [''.join(r) for r in g]


def option_b() -> list[str]:
    g = blank()
    rect(g, 1, 1, 14, 12, 'F')          # frame
    rect(g, 3, 3, 12, 10, 'n')          # glass
    for p in [(10, 4), (4, 9)]:
        put(g, *p, 's')
    moon(g, 4, 3, MOON_SMALL)
    hills(g, 3, 12, 11)
    rect(g, 3, 7, 12, 7, 'f')           # cross bar
    rect(g, 0, 12, 15, 13, 'F')         # sill
    rect(g, 1, 14, 14, 14, 'f')
    return [''.join(r) for r in g]


def option_c() -> list[str]:
    g = blank()
    rect(g, 1, 1, 14, 11, 'w')          # screen rim
    rect(g, 2, 2, 13, 9, 'n')           # screen
    for p in [(3, 3), (5, 6), (12, 7)]:
        put(g, *p, 's')
    moon(g, 8, 2, MOON_SMALL)
    rect(g, 2, 8, 13, 9, 'h')
    for x in (4, 5, 9, 10, 11):
        put(g, x, 7, 'h')
    rect(g, 2, 9, 13, 9, 'g')
    rect(g, 7, 12, 8, 12, 'w')          # neck
    rect(g, 5, 13, 10, 13, 'w')         # foot
    return [''.join(r) for r in g]


OPTIONS = {
    'a-moon-hills': option_a(),
    'b-night-window': option_b(),
    'c-screen-moon': option_c(),
}


def svg(grid: list[str], rounded: bool = True) -> str:
    rects = []
    for y, row in enumerate(grid):
        assert len(row) == 16, (y, len(row))
        for x, ch in enumerate(row):
            if ch == '.':
                continue
            rects.append(f'<rect x="{x}" y="{y}" width="1" height="1" fill="{PALETTE[ch]}"/>')
    corner = ' rx="3"' if rounded else ''
    background = f'<rect width="16" height="16"{corner} fill="{PALETTE["."]}"/>'
    clip = '<clipPath id="r"><rect width="16" height="16" rx="3"/></clipPath>'
    body = ''.join(rects)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">{clip}'
            f'<g clip-path="url(#r)">{background}{body}</g></svg>')


def main() -> None:
    cards = []
    for name, grid in OPTIONS.items():
        text = svg(grid)
        (OUT / f'{name}.svg').write_text(text, encoding='utf-8')
        cards.append(f'''<figure><div class="big">{text}</div>
<div class="small"><span class="s64">{text}</span><span class="s32">{text}</span><span class="s16">{text}</span></div>
<figcaption>{name[0].upper()}: {name[2:].replace('-', ' ')}</figcaption></figure>''')
    page = f'''<!doctype html><meta charset="utf-8"><style>
body {{ margin: 0; padding: 36px; background: #0b1226; color: #dfe9e6; font: 20px 'Segoe UI', sans-serif; }}
.row {{ display: flex; gap: 48px; }}
figure {{ margin: 0; }}
.big svg {{ width: 288px; height: 288px; }}
.small {{ display: flex; align-items: flex-end; gap: 14px; margin-top: 16px; padding: 14px; background: #e9eeee; border-radius: 10px; }}
.small svg {{ display: block; }}
.s64 svg {{ width: 64px; height: 64px; }} .s32 svg {{ width: 32px; height: 32px; }} .s16 svg {{ width: 16px; height: 16px; }}
figcaption {{ margin-top: 12px; font-size: 22px; text-transform: capitalize; }}
</style><div class="row">{''.join(cards)}</div>'''
    (OUT / 'preview.html').write_text(page, encoding='utf-8')


main()
