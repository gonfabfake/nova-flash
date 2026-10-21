import { Application, Assets, Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import {
  HALL_HEIGHT, HALL_LOCATIONS, HALL_WIDTH, finiteOr, fitHall,
  hallAssetPath, hallLayer, hallLocation, type HallItem,
} from './hall-model';

export interface MountedHall {
  destroy(): void;
  /** Counts image instances (including the background), not unique URLs. */
  loaded: number;
  failed: number;
}

/**
 * Render the original exported first frames. There is no invented animation,
 * game connection, or backend operation; selection is delegated to the client.
 * The caller must load /js/config.js before mounting this scene.
 */
export async function mountHall(
  host: HTMLElement,
  onSelect: (id: string) => void,
): Promise<MountedHall> {
  const config = (window as unknown as { HALL_CONFIG?: HallItem[] }).HALL_CONFIG;
  if (!Array.isArray(config)) {
    throw new Error('HALL_CONFIG ausente: carregue /js/config.js antes de mountHall().');
  }

  const app = new Application();
  await app.init({ resizeTo: host, backgroundAlpha: 0, autoStart: false, antialias: true });
  const scene = new Container({ sortableChildren: true });
  app.stage.addChild(scene);
  const clip = new Graphics().rect(0, 0, HALL_WIDTH, HALL_HEIGHT).fill(0xffffff);
  scene.addChild(clip);
  scene.mask = clip;

  const controls = document.createElement('nav');
  controls.className = 'hall-location-controls';
  controls.setAttribute('aria-label', 'Locais do salão');
  const imageStatus = document.createElement('p');
  imageStatus.setAttribute('role', 'status');
  imageStatus.textContent = 'Carregando imagens do salão…';
  controls.append(imageStatus);
  const canvas = app.canvas;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Mapa do salão DDTank; use os botões de locais para navegar.');
  canvas.style.display = 'block';
  host.append(canvas);
  // Keep keyboard controls outside the canvas and out of resizeTo's measurement.
  if (host.parentNode) host.after(controls);
  else host.append(controls);

  let loaded = 0;
  let failed = 0;
  let destroyed = false;
  const buttonListeners: Array<() => void> = [];
  const select = (id: string): void => {
    if (destroyed) return;
    const title = HALL_LOCATIONS[id] ?? id;
    // Same document event and detail shape as the existing DOM hall.
    document.dispatchEvent(new CustomEvent('hall:location', { detail: { id, title } }));
    onSelect(id);
  };
  const resize = (): void => {
    if (destroyed) return;
    const fit = fitHall(app.screen.width, app.screen.height);
    scene.position.set(fit.x, fit.y);
    scene.scale.set(fit.scale);
    app.render();
  };
  app.renderer.on('resize', resize);
  const observer = new ResizeObserver(() => {
    app.resize();
    resize();
  });
  observer.observe(host);

  const destroy = (): void => {
    if (destroyed) return;
    destroyed = true;
    observer.disconnect();
    app.renderer.off('resize', resize);
    for (const remove of buttonListeners) remove();
    controls.remove();
    // Assets' cached textures may also be used by other scenes/mounts.
    app.destroy({ removeView: true }, { children: true, texture: false, textureSource: false });
  };

  const loadSprite = async (path: string): Promise<Sprite | null> => {
    const url = hallAssetPath(path);
    try {
      const texture = await Assets.load<Texture>(url);
      loaded++;
      return new Sprite(texture);
    } catch (error) {
      failed++;
      console.error(`[HallScene] Falha ao carregar imagem: ${url}`, error);
      return null;
    }
  };

  try {
    const backgroundTask = loadSprite('/assets/bg.png').then((background) => {
      if (!background) return;
      background.width = HALL_WIDTH;
      background.height = HALL_HEIGHT;
      background.zIndex = -1;
      scene.addChild(background);
    });
    const tasks = config.map(async (item, index) => {
      if (item.type !== 'symbol' && item.type !== 'text') return;
      const id = hallLocation(item);
      if (id) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = HALL_LOCATIONS[id] ?? id;
        button.setAttribute('aria-label', `Abrir ${HALL_LOCATIONS[id] ?? id}`);
        button.dataset.location = id;
        const click = (): void => select(id);
        button.addEventListener('click', click);
        buttonListeners.push(() => button.removeEventListener('click', click));
        controls.append(button);
      }

      let node: Sprite | Text;
      if (item.type === 'symbol') {
        if (!item.img) return;
        const sprite = await loadSprite(item.img);
        if (!sprite) return;
        sprite.scale.set(finiteOr(item.scaleX, 1), finiteOr(item.scaleY, 1));
        node = sprite;
      } else {
        node = new Text({
          text: item.text ?? '',
          style: {
            fontFamily: 'Arial, sans-serif',
            fontSize: finiteOr(item.size, 14),
            fill: /^#[\da-f]{3,8}$/i.test(item.color ?? '') ? item.color : '#ffffff',
          },
        });
      }
      node.position.set(finiteOr(item.tx, 0), finiteOr(item.ty, 0));
      node.zIndex = hallLayer(item, index);
      node.label = item.name ?? `hall-layer-${index}`;
      if (id) {
        node.eventMode = 'static';
        node.cursor = 'pointer';
        node.on('pointertap', () => select(id));
      } else {
        // Includes txt_* image labels: they must not intercept location taps.
        node.eventMode = 'none';
      }
      scene.addChild(node);
    });
    await Promise.all([backgroundTask, ...tasks]);
    imageStatus.textContent = `Imagens: ${loaded}/${loaded + failed}${failed ? ` • ${failed} indisponível(is)` : ''}`;
    resize();
    return { destroy, loaded, failed };
  } catch (error) {
    destroy();
    throw error;
  }
}
