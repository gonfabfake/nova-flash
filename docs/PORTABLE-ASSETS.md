# Publicação dos recursos HTML5

A versão atual do salão já roda com PixiJS, mas **não contém ainda o motor completo do DDTank**. Para abrir o laboratório com exportações FFDec em outra máquina ou numa hospedagem, os recursos de navegador precisam ser publicados junto ao Vite.

## Passo 1 — prévia, sem modificar nada

```powershell
python scripts/prepare_html5_assets.py "D:\\nova flash em html\\arquivos"
```

O comando informa quantos arquivos poderá copiar e quantos foram excluídos.

## Passo 2 — importar imagens e sons

```powershell
python scripts/prepare_html5_assets.py "D:\\nova flash em html\\arquivos" --apply
python scripts/audit_assets.py "D:\\nova flash em html\\arquivos"
npm run build
```

Recursos permitidos: PNG, JPG, WebP, GIF, MP3, WAV, OGG, WOFF, WOFF2 e TTF. Os arquivos vão para `public/exported/`, mantendo as pastas e nomes originais. O manifesto sem caminhos locais fica em `public/migration/portable-assets.json`. O catálogo gerado pela auditoria ainda aponta para `/exported/`, que agora será incluído no `dist` do Vite.

Atenção: scripts ActionScript, SWF, XML e metadados privados **não são publicados**. Esta etapa prepara somente os recursos estáticos; não converte automaticamente as timelines, eventos ou protocolo de rede. Verifique direitos de uso dos assets antes de publicar.

`public/exported/` pode ficar muito grande. Confirme tamanho e licenças antes de fazer commit; nunca publique senhas, tokens ou configs. Se os arquivos permanecerem somente na máquina, o desenvolvimento local continua usando o mapeamento de leitura de `/exported/` do Vite.
