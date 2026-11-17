type Child = Node | string | null | undefined | false;
type Props = Record<string, string | number | boolean | EventListener | undefined>;

/**
 * Creates an element. Props starting with "on" become event listeners, `class` sets the class,
 * booleans toggle attributes, everything else is set as an attribute.
 */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === false) continue;
    if (typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(value));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

/** Parses a trusted inline SVG string (our own icons) into an element. */
export function icon(svg: string): SVGElement {
  const tpl = document.createElement('template');
  tpl.innerHTML = svg.trim();
  const el = tpl.content.firstElementChild;
  if (!(el instanceof SVGElement)) throw new Error('icon markup is not an SVG');
  return el;
}

export const clear = (el: Element): void => el.replaceChildren();
