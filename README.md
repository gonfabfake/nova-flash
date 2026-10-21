# DDTank HTML5 — primeira etapa executável

Cliente incremental em TypeScript/PixiJS/Vite. **Não é ainda o jogo completo nem um cliente conectado.** O salão anterior (`index.html`, `js/`, `css/`, `assets/`) está preservado.

## Abrir

No PowerShell, nesta pasta:

```powershell
npm install
python scripts/audit_assets.py "D:\nova flash em html\arquivos"
npm run dev
```

Abra **http://127.0.0.1:5173/migration.html**: apenas a tela do jogo, sem relatórios ou contadores. O painel técnico e explorador estão separados em `/laboratorio.html`. O salão anterior continua em `/index.html` e também abre diretamente como antes.

Alternativa: dê dois cliques em `INICIAR-HTML5.cmd`. Ele instala apenas as dependências locais ausentes, gera o catálogo se necessário e abre a nova interface.

Índice textual (opcional para abrir a interface, necessário antes de converter lógica):

```powershell
python scripts/rag_index.py index "D:\nova flash em html\arquivos"
python scripts/rag_index.py search "Socket"
```

A fonte dos recursos é `D:\nova flash em html\arquivos`, somente leitura. Para mudar sua localização, defina `$env:DDTANK_EXPORTS` antes de iniciar o Vite e regenere o catálogo para a mesma fonte. Recursos não são renomeados nem executados como SWF. O catálogo é gerado localmente e não entra no Git; o inventário completo e o SQLite ficam em `generated/`.

## Testar

```powershell
npm test
npm run test:python
npm run build
npm audit
# Com npm run dev aberto em outro terminal:
node scripts/browser_smoke.mjs
node scripts/game_smoke.mjs
node scripts/verify_legacy.mjs
```

O teste de navegador utiliza o Chrome instalado em `C:\Program Files\Google\Chrome\Application\chrome.exe`; configure `CHROME_PATH` caso esteja em outro local. Não instala navegadores nem dependências globais.

Para testar o build: `npm run preview -- --port 4173`, abra `/migration.html`. O preview ainda precisa das pastas originais locais: **dist não é uma distribuição autossuficiente dos recursos**. Antes de hospedar, planeje a importação licenciada dos assets, headers, autenticação e transporte com o backend correto. Dev/preview escutam somente localhost por padrão.

## Implementado / pendente

- Salão PixiJS com as coordenadas e imagens da referência HTML5, escala responsiva, seleção por mouse/toque e botões de teclado.
- Visualizador das sequências PNG exportadas, seleção de quadros e reprodução. Não é interpretador integral de timelines, máscaras, filtros ou AS3.
- Auditoria completa de arquivos e índice lexical SQLite FTS5; não usa embeddings.
- Relatórios com evidências do protocolo legado em `docs/`.
- **Não implementado:** login real, inventário conectado, salas, batalhas, animações compostas completas e gateway. Zero funcionalidades de servidor integradas.

O acesso ao repositório GitHub informado falhou por autenticação. Esta pasta não era um repositório: foi iniciado um Git local na branch `feature/ddtank-html5`, sem fingir possuir o histórico remoto. Não houve push, PR, alteração de banco nem alteração de servidor.

Backup inicial da interface: pasta irmã `..\backups\nova-flash-html5-20261021-194140`. Os assets originais permaneceram intactos.
