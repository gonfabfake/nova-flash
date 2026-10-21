import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ load: vi.fn(), unload: vi.fn() }));
vi.mock('pixi.js', () => ({
  Application: class { screen = { width: 800, height: 600 }; destroy = vi.fn(); },
  Assets: mocks,
  Texture: { EMPTY: { width: 1, height: 1 } },
  Sprite: class {
    texture = { width: 1, height: 1 }; width = 20; height = 20;
    scale = { set: vi.fn() }; position = { set: vi.fn() };
  },
}));
import { SequenceViewer } from '../src/animations/SequenceViewer';
describe('ciclo de vida das texturas do visualizador', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.load.mockResolvedValue({ width: 20, height: 20 }); mocks.unload.mockResolvedValue(undefined); });
  it('libera a seleção anterior em vez de acumular o cache global', async () => {
    const viewer = new SequenceViewer();
    await viewer.load(['/exported/a.png'], 24);
    await viewer.load(['/exported/b.png'], 24);
    expect(mocks.unload).toHaveBeenCalledWith('/exported/a.png');
    viewer.destroy();
    await Promise.resolve(); await Promise.resolve();
    expect(mocks.unload).toHaveBeenCalledWith('/exported/b.png');
  });
  it('não carrega uma seleção substituída antes de sua execução', async () => {
    const viewer = new SequenceViewer();
    const first = viewer.load(['/exported/obsolete.png'],24);
    const second = viewer.load(['/exported/current.png'],24);
    await Promise.all([first,second]);
    expect(mocks.load).not.toHaveBeenCalledWith('/exported/obsolete.png');
    expect(mocks.load).toHaveBeenCalledWith('/exported/current.png');
    viewer.destroy();
  });
  it('libera quadros carregados parcialmente quando um recurso falha', async () => {
    mocks.load.mockImplementation((url: string) => url.endsWith('bad.png') ? Promise.reject(new Error('imagem ausente')) : Promise.resolve({ width:20,height:20 }));
    const viewer = new SequenceViewer();
    await expect(viewer.load(['/exported/good.png','/exported/bad.png'],24)).rejects.toThrow('imagem ausente');
    expect(mocks.unload).toHaveBeenCalledWith('/exported/good.png');
    viewer.destroy();
  });
});
