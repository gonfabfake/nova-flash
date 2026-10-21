# Arquitetura observada e origem do salão

## Escopo e limites

Auditoria estática, em 2026-10-21, das fontes locais, sem executá-las ou alterá-las:

- **AS3** = `D:\Nova source para ddtank\DDTANK_4.1_HIBRIDA\src`.
- **EXPORT** = `D:\nova flash em html\arquivos\hall__c64be0490`.
- **HTML** = `D:\novo ddtank em html\nova flash html5`.

As referências abaixo são relativas a essas raízes. Não há backend local confirmado nesta auditoria. O remoto `gonfabfake/ddtank-servidor` foi informado como inacessível por autenticação; não foi consultado nem houve tentativa de autenticar. Compatibilidade visual não comprova compatibilidade de versão ou de servidor.

## O que o HTML efetivamente faz

No cliente observado, `index.html:17-31` monta o palco, o diálogo e carrega `js/config.js` e `js/hall.js`. `js/config.js` é uma lista de instâncias visuais, não uma configuração de rede.

`js/hall.js:3,29-33,66-104` cria elementos DOM/imagens em uma área lógica de 1000 × 600 e aplica posição, escala e empilhamento. `js/hall.js:36-46` abre um diálogo e publica o evento DOM `hall:location`, com `detail: { id: name, title }`. Esse evento é uma extensão local, **não** um pacote, rota HTTP, autenticação ou confirmação do servidor. Os nomes `_mc` são identificadores de instância; os números `symbol` são IDs de personagens SWF, não IDs de jogador, de sala ou opcodes.

Há carregamento de imagens locais, seleção dos locais, foco e ajuste à tela. Não há nessa implementação observada consumidor de rede para `hall:location`, login, sessão autenticada, lista real de salas, inventário ou sincronização do estado do personagem. O próprio `index.html:27` informa o limite visual. Arquivos que venham a ser acrescentados por outro trabalho devem ser avaliados separadamente: esta descrição não certifica uma integração futura.

## Correspondência com o export real

A classe visual `asset.hall.hallMainViewAsset` corresponde ao **sprite 307 de 13 frames**, não à timeline principal do SWF. Evidências: EXPORT `estrutura_xml/estrutura_completa.xml:21461` e tabela `SymbolClass` em `26290-26332`; `timeline.json`, `symbols["307"]` e `timelines.sprite_307`. O palco declarado do arquivo é 550 × 400 (`timeline.json:5-14`); isso não determina sozinho as dimensões do salão embutido. Portanto 1000 × 600 no HTML é uma escolha do visualizador, não uma reprodução comprovada do palco raiz.

Foi feita comparação estruturada do XML com `js/config.js`: os **25 símbolos nomeados** (13 locais e 12 rótulos) têm o mesmo `characterId`; as posições dos **26 elementos nomeados**, incluindo `svrname_txt`, coincidem após converter twips para pixels (`translateX/Y ÷ 20`). As 44 referências `img` da configuração existem no disco; isso não valida equivalência dos pixels, limites ou recortes.

| Instância interativa | ID no config e no export | Linha XML do export |
| --- | ---: | ---: |
| `shop_mc` | 259 | 21614 |
| `roomList_mc` | 257 | 21611 |
| `store_mc` | 250 | 21608 |
| `consortia_mc` | 255 | 21605 |
| `hotWell_mc` | 253 | 21602 |
| `tofflist_mc` | 252 | 21599 |
| `campaignLab_mc` | 251 | 21596 |
| `civil_mc` | 250 | 21593 |
| `active_mc` | 248 | 21590 |
| `auction_mc` | 246 | 21587 |
| `dungeon_mc` | 244 | 21584 |
| `church_mc` | 243 | 21581 |
| `lottery_mc` | 237 | 21572 |

**A repetição do ID 250 em `store_mc` e `civil_mc` está na origem**, com matrizes distintas; não é uma divergência introduzida pelo config (`js/config.js:25-33,80-88`). Os 12 nomes de rótulo também coincidem, inclusive `txt_master_mc` para a área `active_mc` e `txt_spa_mc` para `hotWell_mc` (AS3 `hall/HallStateView.as:189-190`).

### Diferenças que impedem chamar isso de reprodução integral

- O AS3 faz `gotoAndStop(13)` ao entrar (`hall/HallStateView.as:243-248`). O config contém instâncias/posições compatíveis com a composição inicial, mas não descreve a execução dos 13 frames. `timeline.json` registra remoções e alterações de instâncias nos frames seguintes; não se pode tratar a lista estática como estado final do frame 13.
- O XML contém o nome adicional `tip_shop` (`estrutura_completa.xml:21626`), ausente da configuração; são 27 nomes no conjunto dos sub-tags contra 26 no config. Ele aparece depois do primeiro `ShowFrame`, não é simplesmente outro prédio ausente.
- As camadas numéricas do config não são os `depth` originais. O renderer usa `1000 - layer` (`js/hall.js:67,76-77`), não uma display list SWF com `PlaceObject`, `move` e `RemoveObject`.
- `shape` é ignorado (`js/hall.js:69`); há símbolo sem imagem (`js/config.js:139-147`). A reprodução depende dos PNGs já exportados, sem reconstruir toda a árvore vetorial.
- O renderer aplica somente escala por eixo (`js/hall.js:79`), não skew/rotação, máscaras, filtros e color transforms. Exemplo concreto: símbolo 224 tem `rotateSkew0/1` no XML (`estrutura_completa.xml:21566-21567`), mas o config registra só posição/escala (`js/config.js:172-180`).
- Os PNGs apontam ao frame `1.png`, enquanto sprites como 229 têm 1000 frames e 144 têm 200 (`timeline.json`, `symbols`). Não há playback de timeline no renderer observado.
- `svrname_txt` conserva texto do export (`js/config.js:506-515`); o AS3 limpa esse campo e prepara uma lista de servidores (`hall/HallStateView.as:284-293`). O texto não comprova conexão a nenhum servidor.

## Estado e navegação reais no AS3

`hall/HallStateView.as` é um estado do cliente, não um servidor. Ao entrar ele envia `sendSceneLogin(1)`, cria o recurso visual, seleciona frame 13, monta toolbar/chat e inicializa prédios (`235-297`). Depende de `PlayerManager.Instance.Self`, configuração, progresso do tutorial, atividades e outros managers; não apenas dos assets.

`initBuild` usa nível e `setBuildState` pode liberar todos os prédios quando o tutorial está desativado ou o jogador é antigo (`685-719`). Os cliques ainda têm verificações próprias (`1051-1211`), portanto habilitar/desabilitar visualmente não substitui validação do módulo/servidor.

Exemplos confirmados: loja → `StateType.SHOP` (`1170-1177`); salas → `StateType.ROOM_LIST` (`1157-1163`); armazém → `BagStore.instance.show(BagStore.BAG_STORE)` (`1179-1189`); loteria → `StateType.LOTTERY_HALL`, exigindo nível 3 (`1204-1210`). Os textos amigáveis do HTML não implementam esses módulos ou suas regras.

## Fronteiras a preservar

1. **Assets e composição:** IDs de símbolos, nomes, matrizes e frames, sem credenciais.
2. **Interface local:** seleção `hall:location`; não deve afirmar sucesso remoto.
3. **Estado do cliente:** personagem, canal, permissões, inventário e módulos, hoje não sincronizados no HTML observado.
4. **Transporte e autenticação:** dependem de contrato comprovado do servidor; ver [SERVER-COMPAT.md](SERVER-COMPAT.md).

Não foi criado gateway, backend, endpoint ou mecanismo de autenticação. Um navegador comum não abre `flash.net.Socket`/TCP bruto; ter imagens exportadas não resolve essa fronteira.
