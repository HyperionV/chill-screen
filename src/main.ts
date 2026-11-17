import '@fontsource-variable/outfit';
import './styles.css';
import { SceneSwitch } from './scene/scene-switch';
import { TankScene } from './scene/tank-scene';
import { mountUi } from './ui/app';
import { mountFishLabel } from './ui/fish-label';

const tankCanvas = document.querySelector<HTMLCanvasElement>('#tank');
const sceneryCanvas = document.querySelector<HTMLCanvasElement>('#scenery');
const uiRoot = document.querySelector<HTMLDivElement>('#ui');
if (!tankCanvas || !sceneryCanvas || !uiRoot) throw new Error('index.html is missing #tank, #scenery or #ui');

const showFishLabel = mountFishLabel(uiRoot);
const tank: TankScene = new TankScene(tankCanvas, {
  onHover: (fish, x, y) => showFishLabel(fish ? tank.describe(fish) : null, x, y),
});
const scenery = new SceneSwitch(tank, sceneryCanvas);
mountUi(uiRoot, scenery);
void scenery.init();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((err: unknown) => console.warn('[app] offline support unavailable', err));
}

Object.assign(window, { chillscreen: { frameCost: () => scenery.frameCost, scenery } });
