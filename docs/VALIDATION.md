# Validação executada — 2026-10-21

Ambiente: Windows, Node 24.16.0, Python 3.14.5, Chrome instalado localmente. Execução sem Flash/Ruffle.

- `npm run build`: TypeScript strict e build Vite concluídos.
- `npm test`: 13 testes passando (ajuste/camadas/paths/seleção do salão, sequência/FPS e descarte de texturas em troca/falha).
- `npm run test:python`: 5 testes passando (auditoria, FPS original e índice lexical).
- `node scripts/browser_smoke.mjs`: passou com servidor dev em localhost:5173.
- `$env:TEST_BASE_URL='http://127.0.0.1:4173'; node scripts/browser_smoke.mjs`: passou com build/preview.
- `npm audit`: zero vulnerabilidades após atualizar Vitest para 5.0.5. A primeira instalação detectou dependências de teste vulneráveis e elas foram corrigidas antes da entrega.

## Navegador, dev e preview

1. Salão PixiJS inicializado: 45 instâncias de imagem, zero falhas.
2. Seleção da loja por botão acessível informa explicitamente que não existe módulo conectado.
3. Catálogo real carregado, imagem renderizada, sequência original com múltiplos quadros reproduzida; pausa e seleção manual do quadro 2 verificadas.
4. Viewport de 390×844 sem overflow horizontal.
5. Salão anterior carregado com 13 hotspots.
6. Rota de exportação bloqueia acesso a JSON e tentativa de traversal.
7. Zero exceções JavaScript e zero respostas HTTP de erro nas navegações/recursos exercitados. Probes de segurança esperam 403/404 separadamente.
8. Navegação de volta ao cliente mantém canvas e seleção funcionais. O descarte ignora entrada no BFCache; texturas exclusivas do viewer são liberadas ao trocar a seleção.

Relatório e screenshots locais em `test-results/` (ignorados no Git). Screenshot desktop inspecionado; recursos e legendas originais não foram traduzidos ou redesenhados.

## Ajuste visual solicitado

`migration.html` e `src/game.ts`/`src/game.css`: tela do salão sem dashboard, cabeçalho, contadores ou avisos técnicos. Mantém proporção original e ajuste à janela. Painel técnico preservado em `laboratorio.html`; renderer e assets compartilhados sem duplicar a implementação do salão. Um módulo indisponível só apresenta mensagem quando selecionado, sem simular integração.

`node scripts/game_smoke.mjs`: interface limpa, clique real no canvas da loja, fechamento por Escape, ajuste móvel e zero erros de console passaram. Screenshots `game-desktop.png` e `game-mobile.png`. `node scripts/verify_legacy.mjs`: 42 arquivos legados preservados, incluindo SHA-256 dos PNGs contra o commit inicial.

## Não testado / não implementado

Não houve login HTTP/TCP, conexão de jogador, persistência, inventário, salas ou batalha. Não houve teste exaustivo de cada um dos 87.135 arquivos, equivalência integral de animações, máscaras, filtros, AS3, outros navegadores/dispositivos ou benchmark de memória em sessões longas. Os testes de sequência e salão não comprovam esses itens.

A exportação tem 124 módulos e 2.722.207.173 bytes, inventariados sem copiar os originais. A interface lista uma amostra limitada de imagens por módulo, indicada no catálogo; o inventário JSONL é completo.
