# Editor visual do salão DDTank

Abra `/editor.html` no servidor Vite. O editor utiliza os recursos originais de `assets/` e as posições de `js/config.js`.

## Como utilizar
1. Execute `npm install` e `npm run dev`, depois abra `http://127.0.0.1:5173/editor.html`.
2. Clique num objeto da lista e arraste-o no palco. Ajuste X/Y, escalas, rotação e camadas pela lateral.
3. No painel "Interação", escolha **Janela**, **Abrir página interna**, **Emitir evento** ou **Nenhuma**.
4. Clique em "Testar ação". Navegação e emissão de eventos só mostram uma prévia no editor para evitar saídas acidentais.
5. Salve no navegador para retomar a edição ou exporte o projeto JSON para backup.
6. Clique em **Gerar config.js** e substitua o arquivo `js/config.js` do projeto pela versão exportada; guarde o original. As interações configuradas já são interpretadas pelo salão PixiJS em `src/game.ts`.
7. Para integração personalizada, use também o arquivo **Gerar JS das funções** como referência para o evento `ddtank:module`.

### Ações
- **Janela:** título e descrição aparecerão dentro do salão.
- **Abrir página interna:** destino começando por `/`, por exemplo `/battle.html` ou `/laboratorio.html`. O sistema adiciona a base `/nova-flash` quando publicado no GitHub Pages.
- **Emitir evento:** envia um evento `ddtank:module` para integração futura com a implementação real do módulo.
- **Nenhuma:** não executa ação ao selecionar esse local.

O editor gera configurações de posicionamento e despacha ações, mas não programa automaticamente loja, inventário, banco de dados ou salas conectadas. O código gerado não deve ser tratado como conversão completa do ActionScript.

### Publicação
O Vite agora compila `editor.html` junto com `migration.html`. Para editar diretamente no GitHub Pages, use o editor como prévia e baixe seus arquivos; o GitHub Pages é hospedagem estática e não grava modificações no repositório automaticamente.
