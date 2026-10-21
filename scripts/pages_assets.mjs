import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const out = resolve('dist/assets');
mkdirSync(out, { recursive: true });
for (const resource of ['bg.png', 'symbols']) {
  const source = resolve('assets', resource);
  if (!existsSync(source)) throw new Error('Recurso obrigatório ausente: ' + source);
  cpSync(source, resolve(out, resource), { recursive: true, force: true });
}
console.log('Imagens originais do salão copiadas para dist/assets.');
