import { defineConfig, type Plugin } from 'vite';
import { createReadStream, existsSync, realpathSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Read-only allowlisted exports. Do not expose scripts, XML, configs or arbitrary disks.
const roots: Record<string, string> = {
  '/exported/': process.env.DDTANK_EXPORTS ?? 'D:/nova flash em html/arquivos',
  '/assets/': resolve('assets'), '/js/': resolve('js'), '/css/': resolve('css'),
};
const mime: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
};
export function localResources(): Plugin {
  const middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.url?.split('?')[0] === '/favicon.ico') { res.writeHead(302, { Location: '/favicon.svg' }).end(); return; }
    if (req.url?.split('?')[0] === '/index.html' && (req.method === 'GET' || req.method === 'HEAD')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      if (req.method === 'HEAD') res.end();
      else createReadStream(resolve('index.html')).on('error', () => res.destroy()).pipe(res);
      return;
    }
    const prefix = Object.keys(roots).find(p => req.url?.startsWith(p));
    if (!prefix) return next();
    // Hashed Vite build outputs are handled by Vite, not the legacy asset mount.
    if (prefix === '/assets/' && /\.(?:js|css)(?:\?|$)/.test(req.url!)) return next();
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    try {
      const raw = decodeURIComponent(req.url!.split('?')[0].slice(prefix.length));
      const root = realpathSync(roots[prefix]);
      const file = realpathSync(resolve(root, raw));
      if (!file.startsWith(root + sep) || !statSync(file).isFile()) { res.writeHead(403).end(); return; }
      const ext = extname(file).toLowerCase();
      const allowed = prefix === '/exported/' ? mime[ext]
        : prefix === '/js/' ? (['config.js', 'hall.js'].includes(raw) ? 'text/javascript' : undefined)
        : prefix === '/css/' ? (ext === '.css' ? 'text/css' : undefined) : mime[ext];
      if (!allowed) { res.writeHead(403).end(); return; }
      res.setHeader('Content-Type', allowed);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; style-src 'unsafe-inline'");
      res.setHeader('Content-Length', statSync(file).size);
      if (req.method === 'HEAD') { res.end(); return; }
      createReadStream(file).on('error', () => res.destroy()).pipe(res);
    } catch { res.writeHead(404).end(); }
  };
  return {
    name: 'ddtank-local-resources',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
    closeBundle() {
      if (!existsSync('public/migration/catalog.json')) console.warn('Execute a auditoria para gerar o catálogo.');
    },
  };
}
export default defineConfig({
  plugins: [localResources()],
  server: { host: '127.0.0.1', fs: { strict: true } },
  preview: { host: '127.0.0.1' },
  build: { rollupOptions: { input: { migration: resolve('migration.html'), laboratorio: resolve('laboratorio.html') } } },
});
