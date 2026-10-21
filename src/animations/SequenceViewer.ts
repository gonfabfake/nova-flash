import { Application, Assets, Sprite, Texture } from 'pixi.js';
import { frameAt } from './frame-sequence';
export class SequenceViewer {
  private app = new Application();
  private sprite = new Sprite();
  private textures: Texture[] = [];
  private observer?: ResizeObserver;
  private generation = 0;
  private elapsed = 0;
  private fps = 24;
  private ownedUrls: string[] = [];
  private loading: Promise<void> = Promise.resolve();
  playing = true;
  onFrame: (frame: number) => void = () => {};
  async init(host: HTMLElement) {
    await this.app.init({ resizeTo: host, background: '#0b121c', antialias: true });
    host.append(this.app.canvas);
    this.app.stage.addChild(this.sprite);
    this.app.ticker.add(ticker => {
      if (!this.playing || !this.textures.length) return;
      this.elapsed += ticker.deltaMS;
      this.showFrame(frameAt(this.elapsed, this.fps, this.textures.length), false);
    });
    this.observer = new ResizeObserver(() => requestAnimationFrame(() => this.fit()));
    this.observer.observe(host);
  }
  load(urls: string[], fps: number): Promise<void> {
    const generation = ++this.generation;
    this.textures = [];
    this.sprite.texture = Texture.EMPTY;
    const job = this.loading.catch(() => {}).then(async () => {
      if (generation !== this.generation) return;
      await this.releaseTextures();
      if (!urls.length) throw new Error('Recurso sem quadros.');
      if (urls.length > 600) throw new Error('Sequência excede 600 quadros. Use um subconjunto explicitamente auditado.');
      // Serialize transitions so an obsolete load cannot unload a newer selection.
      const results = await Promise.allSettled(urls.map(url => Assets.load<Texture>(url)));
      this.ownedUrls = [...new Set(urls.filter((_, i) => results[i].status === 'fulfilled'))];
      if (generation !== this.generation) { await this.releaseTextures(); return; }
      const failed = results.find(result => result.status === 'rejected');
      if (failed?.status === 'rejected') { await this.releaseTextures(); throw failed.reason; }
      this.textures = results.map(result => (result as PromiseFulfilledResult<Texture>).value);
      this.fps = Number.isFinite(fps) && fps > 0 ? fps : 24;
      this.elapsed = 0;
      this.showFrame(0);
    });
    this.loading = job;
    return job;
  }
  private async releaseTextures() {
    const urls = this.ownedUrls; this.ownedUrls = [];
    await Promise.all(urls.map(url => Assets.unload(url)));
  }
  showFrame(index: number, seek = true) {
    if (!this.textures.length) return;
    index = Math.max(0, Math.min(this.textures.length - 1, index));
    this.sprite.texture = this.textures[index];
    if (seek) this.elapsed = index * 1000 / this.fps;
    this.fit();
    this.onFrame(index + 1);
  }
  private fit() {
    const texture = this.sprite.texture;
    const scale = Math.min(this.app.screen.width / Math.max(1, texture.width), this.app.screen.height / Math.max(1, texture.height), 1);
    this.sprite.scale.set(scale);
    this.sprite.position.set((this.app.screen.width - this.sprite.width) / 2, (this.app.screen.height - this.sprite.height) / 2);
  }
  destroy() {
    this.generation++; this.observer?.disconnect();
    this.textures = []; this.sprite.texture = Texture.EMPTY;
    this.app.destroy(true, { children: true, texture: false, textureSource: false });
    void this.loading.catch(() => {}).then(() => this.releaseTextures()).catch(error => console.error('Falha ao liberar texturas', error));
  }
}
