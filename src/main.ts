import './style.css';
import './hall-controls.css';
import '../js/config.js';
import { mountHall } from './scenes/HallScene';
import { SequenceViewer } from './animations/SequenceViewer';
type Resource = { label: string; urls: string[] };
type Module = {
  name: string; path: string; fps?: number | null; counts: Record<string, number> & { byType?: Record<string, number> };
  imagesTruncated?: boolean;
  images: { path: string; url: string }[];
  sprites: { id: string; path: string; frames: string[] }[];
};
type Catalog = { modules: Module[]; totals?: Record<string, number> };
const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = el('status');
const moduleSelect = el<HTMLSelectElement>('module');
const resourceSelect = el<HTMLSelectElement>('resource');
const coverage = document.createElement('p');
coverage.id = 'resourceCoverage'; coverage.className = 'note'; resourceSelect.after(coverage);
const slider = el<HTMLInputElement>('frame');
const viewer = new SequenceViewer();
let viewerInitialized = false;
let viewerMode = false;
let catalog: Catalog;
let resources: Resource[] = [];
let selection = 0;
let previewReady: Promise<void> | undefined;
let hallSummary = 'Preparando salão PixiJS…';
function report(error: unknown) {
  console.error('[DDTank HTML5]', error);
  status.textContent = error instanceof Error ? error.message : String(error);
}
function metric(label: string, value: number | string) {
  const item = document.createElement('div'); item.className = 'metric';
  const count = document.createElement('strong'); count.textContent = value.toLocaleString('pt-BR');
  const title = document.createElement('span'); title.textContent = label;
  item.append(count,title); el('metrics').append(item);
}
async function loadSelected() {
  const resource = resources[Number(resourceSelect.value)];
  if (!resource) return;
  const current = ++selection;
  try {
    if (!previewReady) previewReady = viewer.init(el('preview')).then(() => { viewerInitialized = true; });
    await previewReady;
    if (current !== selection) return;
    slider.max = String(resource.urls.length); slider.value = '1';
    const sourceFps = catalog.modules[Number(moduleSelect.value)].fps;
    const knownFps = typeof sourceFps === 'number' && Number.isFinite(sourceFps) && sourceFps > 0;
    const play = el<HTMLButtonElement>('play');
    play.disabled = resource.urls.length <= 1 || !knownFps;
    viewer.playing = viewerMode && knownFps && play.textContent === 'Pausar';
    el('resourceInfo').textContent = `${resource.label} · ${resource.urls.length} quadro(s) · ${knownFps ? `${sourceFps} FPS (origem)` : 'FPS original ausente; reprodução automática bloqueada'}`;
    status.textContent = 'Carregando recurso original…';
    // A placeholder clock is used only for manual seeking when original FPS is unknown.
    await viewer.load(resource.urls, knownFps ? sourceFps : 1);
    if (current === selection) status.textContent = 'Recurso visual carregado. Sem lógica AS3 executada.';
  } catch (error) { if (current === selection) report(error); }
}
function selectModule() {
  const mod = catalog.modules[Number(moduleSelect.value)];
  resources = [
    ...mod.sprites.map(sprite => ({ label: sprite.id || sprite.path, urls: sprite.frames })),
    ...mod.images.map(image => ({ label: image.path, urls: [image.url] })),
  ];
  resourceSelect.replaceChildren(...resources.map((resource,index) => new Option(resource.label,String(index))));
  el('resourceCoverage').textContent = `${mod.images.length} de ${mod.counts.images ?? mod.images.length} imagens listadas; ${mod.sprites.length} sequências disponíveis. ${mod.imagesTruncated ? 'Lista de imagens limitada; consulte o inventário completo.' : ''}`;
  if (viewerMode) void loadSelected();
}
async function selectTab(showViewer: boolean) {
  if (!showViewer) selection++; // Late asset loads must not overwrite the hall status.
  viewerMode = showViewer;
  el('hallPanel').hidden = showViewer; el('viewerPanel').hidden = !showViewer;
  el('hallTab').setAttribute('aria-pressed', String(!showViewer));
  el('viewerTab').setAttribute('aria-pressed', String(showViewer));
  viewer.playing = showViewer && el('play').textContent === 'Pausar';
  if (showViewer && catalog) await loadSelected();
  else { status.textContent = hallSummary; window.dispatchEvent(new Event('resize')); }
}
el('hallTab').onclick = () => void selectTab(false);
el('viewerTab').onclick = () => void selectTab(true);
moduleSelect.onchange = selectModule;
resourceSelect.onchange = () => void loadSelected();
slider.oninput = () => { viewer.playing = false; el('play').textContent = 'Reproduzir'; viewer.showFrame(Number(slider.value) - 1); };
el('play').onclick = () => { viewer.playing = !viewer.playing; el('play').textContent = viewer.playing ? 'Pausar' : 'Reproduzir'; };
viewer.onFrame = frame => { slider.value = String(frame); el('frameValue').textContent = String(frame); };
async function loadCatalog() {
  const response = await fetch('/migration/catalog.json');
  if (!response.ok) throw new Error(`Catálogo indisponível (HTTP ${response.status}). Execute python scripts/audit_assets.py --help.`);
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as Catalog).modules)) throw new Error('Catálogo de recursos inválido.');
  catalog = payload as Catalog;
  moduleSelect.replaceChildren(...catalog.modules.map((mod,index) => new Option(mod.name,String(index))));
  metric('Módulos auditados', catalog.modules.length);
  const totals = catalog.totals ?? {
    files: catalog.modules.reduce((total, mod) => total + (mod.counts.files ?? 0), 0),
    images: catalog.modules.reduce((total, mod) => total + (mod.counts.images ?? 0), 0),
  };
  metric('Arquivos encontrados', totals.files ?? totals.totalFiles ?? 'Ver auditoria');
  metric('Imagens disponíveis', totals.images ?? 'Ver auditoria');
  metric('Sequências PNG disponíveis', catalog.modules.reduce((total, mod) => total + mod.sprites.length, 0));
  metric('Scripts AS3 disponíveis', catalog.modules.reduce((total, mod) => total + (mod.counts.byType?.as ?? 0), 0));
  metric('Scripts migrados', 0);
  metric('Animações compostas migradas', 0);
  metric('Funcionalidades integradas', 0);
  selectModule();
}
async function start() {
  const catalogTask = loadCatalog().catch(report);
  try {
    const hall = await mountHall(el('hallCanvas'), id => {
      status.textContent = `${id} selecionado. Módulo visual; servidor não conectado.`;
    });
    hallSummary = `Salão PixiJS: ${hall.loaded} imagens carregadas, ${hall.failed} falhas. Servidor não conectado.`;
    status.textContent = hallSummary;
    window.addEventListener('pagehide', event => {
      // BFCache restores this same document; keep its renderer and listeners alive.
      if (event.persisted) return;
      hall.destroy(); if (viewerInitialized) viewer.destroy();
    });
    window.addEventListener('pageshow', event => { if (event.persisted) window.dispatchEvent(new Event('resize')); });
  } catch (error) { report(error); }
  await catalogTask;
}
void start();
