/** The small name tag that follows the pointer when it rests on a fish. */
export function mountFishLabel(root: HTMLElement): (text: string | null, clientX: number, clientY: number) => void {
  const label = document.createElement('div');
  label.className = 'fish-label';
  root.append(label);
  return (text, x, y) => {
    label.classList.toggle('on', text !== null);
    if (text === null) return;
    label.textContent = text;
    label.style.left = `${x}px`;
    label.style.top = `${y}px`;
  };
}
