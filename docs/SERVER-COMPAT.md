# Contratos legados e compatibilidade de servidor

## Status

**Integração com servidor não demonstrada.** Auditoria estática em 2026-10-21. AS3 significa `D:\Nova source para ddtank\DDTANK_4.1_HIBRIDA\src`; EXPORT significa `D:\nova flash em html\arquivos`. Todas as linhas AS3 abaixo são relativas a essa raiz. Essas evidências descrevem o que o cliente espera, não o que um backend disponível aceita.

O remoto `gonfabfake/ddtank-servidor` foi informado como bloqueado por autenticação em `git ls-remote`. Não houve nova tentativa, autenticação ou inspeção remota. Não há backend local confirmado, endereço de implantação, porta, credenciais ou configuração operacional validados. Nenhum endpoint novo é proposto como existente.

## 1. Bootstrap e autenticação HTTP/XML

- `ddt/DDT.as:195-199,238-244`: `startLoad` recebe dados externos de usuário/senha; monta `AccountInfo` com conta, senha e chave RSA e chama `PlayerManager.setup`. O mecanismo web que obtém essas informações não foi comprovado por esta auditoria. Valores de chaves e credenciais não são reproduzidos aqui.
- `login/LoginStateView.as:55-85`: `creatLoginLoader` escreve data UTC (ano em short e cinco bytes), seguida dos bytes UTF-8 de `Account,Password,nonce,role`. O nonce tem seis letras aleatórias; `role` é o nickname do personagem selecionado, passado como `param1` em `224-227`.
- `ddt/utils/CrytoUtils.as:51-62`: `rsaEncry4` devolve RSA em Base64; `rsaEncry5` devolve bytes RSA. Não confundir essas duas serializações.
- O loader envia variáveis `p` (bloco cifrado), `v` (build), `site`, `rid`, além das variáveis geradas por `RequestVairableCreater.creatWidthKey(false)` (`LoginStateView.as:75-80`). O conjunto adicional precisa ser levantado antes de implementar um cliente equivalente.
- A referência **literal do cliente legado** é `PathManager.solveRequestPath("Login.ashx")` (`LoginStateView.as:80`); `ddt/manager/PathManager.as:131-133` concatena `info.REQUEST_PATH`. Isso **não confirma** que `Login.ashx` exista neste projeto ou em um servidor acessível, nem autoriza inventar sua URL. `RequestLoader` tem método padrão `GET` (`com/pickgliss/loader/RequestLoader.as:9-11`); overrides do loader e comportamento de infraestrutura devem ser confirmados antes de assumir o tráfego efetivo.
- `ddt/data/analyze/LoginAnalyzer.as:21-38`: espera XML com atributo raiz `value="true"`, atributo `message` e primeiro descendente `Item`, cujos atributos são copiados para `PlayerManager.Instance.Self`. No sucesso, substitui `Account.Password` pelo nonce temporário. Logo, a senha usada na conexão TCP seguinte não é necessariamente a senha original do usuário.

Não foram demonstrados cookies, JWT, refresh token, logout web ou persistência de sessão. Não substituí-los por suposições. Também não foi levantado um schema completo e validado de todos os atributos de `Item`.

## 2. Seleção de servidor e autenticação TCP

`ddt/data/analyze/ServerListAnalyzer.as:22-45` espera XML com `value`, `agentId`, `AreaName`, `message` e elementos `Item` copiados para `ServerInfo`. `ddt/manager/ServerManager.as:118-121` conecta a `current.IP/current.Port`. São campos de contrato; nenhum host/porta foi validado.

`ddt/manager/SocketManager.as:63-71,103-111` cria `ByteSocket` e envia `GameSocketOut.sendLogin(Account)` quando recebe o evento de conexão. `road7th/comm/ByteSocket.as:86-104` usa **`flash.net.Socket` TCP**, não HTTP, WebSocket ou Socket.IO.

### Pacote de login de saída

Evidência: `ddt/manager/GameSocketOut.as:52-80` e `ddt/data/socket/ePackageType.as:96`.

1. Restaura o estado inicial das chaves do socket.
2. Monta bloco com data UTC, oito bytes aleatórios de chave de sessão e bytes UTF-8 de `Account,Password`, sem prefixo `writeUTF` nessa string.
3. Cifra o bloco com `rsaEncry5` (bytes, não Base64).
4. Monta `PackageOut` de opcode **1**, com `Version.Build` (int32), `desktopType` (int32), seguido do bloco RSA.
5. Envia e só então configura a nova chave simétrica de oito bytes no socket.

Não assumir tamanho fixo de bloco RSA, padding compatível com WebCrypto ou aceitação de build sem verificar a implementação RSA e o servidor. O `randRange` local não é o nonce HTTP e não deve ser confundido com campo transmitido só por existir no código.

### Resposta de login

`ddt/manager/ServerManager.as:213-350` interpreta primeiro um byte: **zero indica sucesso**. Lê em seguida uma sequência posicional extensa: `ZoneID`, atributos de combate, moedas, VIP, datas, aparência, sociedade, progresso e outros campos. Por exemplo, os primeiros ints e strings estão em `226-244`; os últimos campos adicionais em `321-336`. Depois de `commitChanges`, muda para `StateType.MAIN` (`337-343`). Não há JSON ou campos nomeados no fio dessa resposta. A ordem exata e os campos condicionais precisam de fixture e validação cruzada; esta documentação não pretende ser schema completo do login recebido.

## 3. Envelope binário

Evidências: `road7th/comm/PackageOut.as:8,15-54`; `PackageIn.as:8,71-79,112-120`. Inteiros usam a ordem padrão big-endian de `flash.utils.ByteArray`, sem override de endian nessas classes.

| Offset | Tamanho | Campo |
| ---: | ---: | --- |
| 0 | 2 | magic/header: 29099 (`0x71AB`) |
| 2 | 2 | comprimento total, incluindo cabeçalho |
| 4 | 2 | checksum |
| 6 | 2 | opcode |
| 8 | 4 | clientId / segundo argumento do construtor |
| 12 | 4 | extend1 / terceiro argumento |
| 16 | 4 | extend2 / quarto argumento |
| 20 | variável | payload específico do opcode |

`pack()` preenche comprimento/checksum antes de transmitir. Checksum: `(119 + soma dos bytes de offset 6 até o fim) & 32639` (`0x7F7F`), sobre os bytes antes da cifra de transporte. Não é MAC criptográfico. O construtor não prova o significado de clientId em todos os sentidos/opcodes.

`ByteSocket.as:141-168` aplica cifra/obfuscação byte a byte com estado mutável de oito bytes, independente para envio/recepção, encadeando byte anterior e índice. Os valores iniciais não são reproduzidos. `PackageIn.loadE:34-69` executa a inversa; truncamento a byte e precedência de operadores importam. Não basta aplicar XOR isolado a cada pacote, nem resetar o estado a cada mensagem. Isso não equivale a TLS.

`ByteSocket.as:234-311` acumula fragmentos TCP, procura magic/comprimento e retém sobra para a leitura seguinte. A sondagem do cabeçalho usa cópia do estado para não consumir a chave prematuramente. `376-386` só publica pacote com checksum válido e posiciona o cursor em 20. Fronteiras de leitura TCP não são fronteiras de mensagem.

Cuidados concretos da fonte: `PackageIn.load:28-32`, caminho não cifrado, copia somente um byte antes de ler o cabeçalho — implementação aparentemente defeituosa/incompleta, não uma especificação alternativa válida. `PackageIn.readHeader` usa `readShort` para comprimento, enquanto o scanner usa `readUnsignedShort` (`ByteSocket:274-276`); pacotes grandes precisam de teste. `PackageIn.deCompress:152-161` descompacta somente payload, mas a existência dessa função não determina quais opcodes a exigem.

## 4. Salão, cenas e opcodes

Valores do cliente em `ddt/data/socket/ePackageType.as`:

| Opcode | Constante | Linha |
| ---: | --- | ---: |
| 1 | `LOGIN` | 96 |
| 2 | `KIT_USER` | 106 |
| 4 | `PING` | 180 |
| 5 | `SYS_DATE` | 230 |
| 16 | `SCENE_LOGIN` | 108 |
| 18 | `SCENE_ADD_USER` | 104 |
| 19 | `SCENE_CHAT` | 62 |
| 20 | `SCENE_FACE` | 64 |
| 21 | `SCENE_REMOVE_USER` | 114 |
| 24 | `SCENE_CHANNEL_CHANGE` | 66 |
| 69 | `SCENE_USERS_LIST` | 200 |
| 94 | `GAME_ROOM` | 102 |

O salão entra com opcode **16** e payload `int32(1)` (`hall/HallStateView.as:243`, `GameSocketOut.as:103-107`). O 1 aqui identifica a cena esperada pelo cliente, **não** um ID de símbolo visual. `SocketManager.as:206-246,308-309` distribui eventos de login/presença/chat/lista; isso não demonstra que todos sejam usados pelo salão nem documenta integralmente seus payloads.

`sendGameLogin` usa opcode 94, subcomando int32 `GAME_ROOM_LOGIN=1`, boolean e dois ints; se o segundo parâmetro for -1, acrescenta outro int e uma string `writeUTF` (`GameSocketOut.as:88-100`; `ddt/data/socket/GameRoomPackageType.as:8`). Não confundir login de conta, entrada na cena e entrada numa sala de partida.

Outro nome enganoso: `sendSceneChange` envia `MARRY_SCENE_CHANGE` (233), não um comando genérico para trocar o salão (`GameSocketOut.as:1345-1349`, `ePackageType.as:58`). Não mapear nomes de função para opcodes presumidos.

## 5. Bloqueios, riscos e comprovação necessária

- **Transporte:** navegador comum não abre TCP bruto. Nenhum gateway foi criado, e não existe endpoint WebSocket confirmado. Sua eventual necessidade não é autorização para inventar um serviço.
- **Versão:** nomes de pasta/build e coincidência de símbolos não provam compatibilidade binária. Campos adicionais no fim do login e condicionais podem desalinhar todo o parser.
- **Segurança:** nonce/chaves são gerados com `Math.random` no cliente; checksum e cifra legados não fornecem as garantias de um canal moderno autenticado. Não registrar conta, senha temporária, bloco de login, chave ou URL contendo credenciais. O possível uso de GET exige cuidado com logs/cache/referrer, mesmo para `p` cifrado.
- **Parsing:** impor limites de comprimento, buffer e descompressão antes de qualquer implementação futura; validar fragmentação, coalescência, checksum, charset, bytes assinados e estado das chaves. O comportamento defeituoso do caminho não cifrado não deve ser copiado sem teste.
- **Estado:** os 13 hotspots do HTML são locais visuais e não autorização. Nível, tutorial, canal, moedas, sociedade e inventário precisam de fonte autoritativa; os diálogos atuais não os carregam.
- **Falta de evidência:** não foram executados handshake, login HTTP, login TCP, captura sanitizada, integração com conta de teste ou comparação com implementação servidora. Payloads completos de presença/chat e tratamento de reconnect/logout continuam não validados.

Antes de declarar compatibilidade: obter acesso autorizado de leitura à versão correta do servidor, confirmar bootstrap/handler e configuração sem expor segredos, levantar schema completo, produzir fixtures sanitizadas de ida/volta e testar respostas/falhas com servidor de teste autorizado. Até lá, o resultado é **interface visual local com contratos legados parcialmente documentados**, não um cliente conectado.
