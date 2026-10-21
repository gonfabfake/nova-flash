import './game.css';
import '../js/config.js';
import { mountHall } from './scenes/HallScene';
import { HALL_LOCATIONS } from './scenes/hall-model';

const host = document.getElementById('game')!;
const loading = document.getElementById('loading')!;
const dialog = document.getElementById('locationDialog') as HTMLDialogElement;
const fullscreen = document.getElementById('fullscreen') as HTMLButtonElement;
document.getElementById('closeLocation')!.onclick = () => dialog.close();
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
fullscreen.onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch (error) { console.warn('Tela cheia não permitida pelo navegador.', error); }
};
async function start() {
  try {
    const hall = await mountHall(host, id => {
      document.getElementById('locationTitle')!.textContent = HALL_LOCATIONS[id] ?? id;
      if (!dialog.open) dialog.showModal();
    });
    // Never leave a full-screen loading overlay blocking a partly rendered hall.
    loading.hidden = true;
    if (hall.failed) {
      console.warn(`Salão carregado com ${hall.failed} recurso(s) ausente(s).`);
      const warning = document.createElement('p');
      warning.id = 'hallAssetWarning';
      warning.setAttribute('role', 'status');
      warning.textContent = `${hall.failed} imagem(ns) não carregaram. Verifique os arquivos em assets/ e atualize a página.`;
      host.after(warning);
    }
    window.addEventListener('pagehide', event => { if (!event.persisted) hall.destroy(); });
    window.addEventListener('pageshow', event => { if (event.persisted) window.dispatchEvent(new Event('resize')); });
  } catch (error) {
    console.error('Falha ao abrir o salão.',error);
    loading.textContent = 'Não foi possível carregar o salão. Atualize a página para tentar novamente.';
  }
}
void start();
