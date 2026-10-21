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
    if (hall.failed) {
      loading.textContent = 'Algumas imagens não carregaram. Atualize a página para tentar novamente.';
    } else loading.hidden = true;
    window.addEventListener('pagehide', event => { if (!event.persisted) hall.destroy(); });
    window.addEventListener('pageshow', event => { if (event.persisted) window.dispatchEvent(new Event('resize')); });
  } catch (error) {
    console.error('Falha ao abrir o salão.',error);
    loading.textContent = 'Não foi possível carregar o salão. Atualize a página para tentar novamente.';
  }
}
void start();
