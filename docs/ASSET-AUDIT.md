# Auditoria de assets e recuperação textual

Execução real em 21/10/2026, Python 3.14.5. Fonte somente leitura:
`D:\nova flash em html\arquivos`. Nenhum recurso foi copiado ou convertido.
Os scripts usam somente a biblioteca padrão do Python.

## Resultados do inventário

- **87.135 arquivos**, **2.722.207.173 bytes**, **124 módulos**.
- PNG: 69.651; JPG: 3.385; SVG: 4.651; AS3: 8.260; XML: 124;
  JSON: 124; CSV: 124; TXT: 346; logs: 248; MP3: 113; WAV: 6;
  FLV: 56; TTF: 47.
- 77.687 imagens no total; 9.859 imagens selecionáveis no catálogo,
  limitado a 100 por módulo, com contagem integral preservada.
- 3.750 grupos de sprites, 60.297 frames PNG em ordem numérica natural.
- 124 referências a `timeline.json`.
- FPS original válido nos **124 módulos**, sem ausências ou valores inválidos.
  Valores observados: 12, 23, 24 e 25. O módulo `hall__c64be0490` tem FPS 24.
- Inventário JSONL: 19.917.261 bytes. Catálogo: 7.339.530 bytes.

`generated/inventory.jsonl` contém uma linha por arquivo, sem amostragem:

```json
{"path":"module__hash/recursos/sprites/DefineSprite_7_hero/2.png","type":"png","size":123,"module":"module__hash","originalIdentifier":7,"usage":"unknown","status":"available-not-migrated"}
```

O exemplo acima é apenas o formato, não uma alegação de arquivo real. `path`
é o caminho original relativo à fonte, com `/`, sem renomear identificadores.
`originalIdentifier` é um número somente quando o caminho contém um identificador
explícito FFDec `Define..._<número>`; caso contrário é `null`. Não significa que
o arquivo já está integrado à UI. `usage` permanece `unknown`, sem inferir uso.
Logs entram somente como nomes, tipos e tamanhos; seu conteúdo não é lido.
O resumo integral fica em `generated/audit.json`.

## Contrato exato de `public/migration/catalog.json`

```ts
type Catalog = {
  schemaVersion: 1;
  generatedAt: string; // ISO UTC
  baseUrl: "/exported/";
  imageLimitPerModule: number;
  modules: Array<{
    name: string; // pasta sem o sufixo __hash
    path: string; // pasta original completa, incluindo __hash
    counts: {
      files: number; bytes: number; images: number;
      sprites: number; timelines: number;
      byType: Record<string, number>; // extensão minúscula, sem ponto
    };
    images: Array<{path: string; url: string}>;
    imagesTruncated: boolean;
    sprites: Array<{id: string; path: string; frames: string[]}>;
    timelines: Array<{path: string; url: string}>;
    timelineUrl: string | null; // primeira timeline original
    fps: number | null;
    fpsStatus: "available" | "missing" | "invalid" | "header-limit" | "error";
  }>;
};
```

Os caminhos são relativos à fonte e as URLs têm prefixo `/exported/`, com
percent-encoding dos caracteres especiais e `/` preservado. O `id` de sprite
é o nome original da sua pasta; `path` o diferencia entre módulos. `frames`
contém URLs de todos os PNGs daquela pasta, inclusive grupos com um só frame.
Não se deduz equivalência entre sequências PNG e semântica de timelines Flash.

`fps` vem da propriedade numérica positiva de primeiro nível de `timeline.json`,
sem fallback. A leitura de metadados usa um cabeçalho limitado a 65.536 caracteres,
decodificando propriedades JSON, sem procurar números por regex. Se o FPS vier
depois de uma estrutura maior que o limite, será `null`/`header-limit`; arquivo
ausente, inválido ou ilegível também não recebe FPS inventado. O resumo informa
`fpsStatusCounts` e `fpsIssues`. A leitura do cabeçalho não valida o JSON inteiro.

**Segurança HTTP:** `timelineUrl` e `timelines` são referências preservadas, não
uma autorização para servir JSON. O middleware `/exported/` deve usar allowlist
de extensões de assets e bloquear JSON, AS3, XML, CSV, TXT, logs e segredos.
Este trabalho não altera middleware ou UI, nem depende de disponibilizar AS3
ou timelines pelo navegador. FPS já está disponível no catálogo público.

## Índice SQLite FTS5

Indexação real concluída em `generated/rag.sqlite3`:

- 8.939 documentos, 26.593 chunks; banco de 128.552.960 bytes.
- 39 arquivos textuais maiores que o limite foram omitidos integralmente.
- 103 documentos tiveram quantidade de chunks truncada; zero erros de leitura.
- Segunda execução: **0 indexados e 8.939 inalterados**, mesmos totais de
  documentos/chunks. Relatórios em `generated/rag-index.json` e
  `generated/rag-incremental.json`; contadores como `truncated` são por execução.

É busca **lexical local**, sem embeddings, modelo de IA ou dependências externas.
Indexa somente `.as`, `.xml`, `.json`, `.csv`, `.txt`, ignorando diretórios de logs,
segredos e nomes comuns de credenciais. Não abre `.log`, `.env` ou imagens. Isso
é filtragem conservadora por nome, não um detector universal de segredos:
fontes arbitrárias devem ser revisadas antes de serem indexadas.

Limites padrão: 2.097.152 bytes por arquivo, 2.000 caracteres por chunk,
200 de sobreposição, máximo de 128 chunks por documento. Arquivos com NUL
são omitidos como binários; UTF-8 inválido usa substituição. Conteúdo depois do
limite de chunks não é pesquisável. Arquivos maiores não são abertos. O estado
incremental usa caminho, tamanho e `mtime_ns`, não hash de conteúdo; mudanças
que preservem ambos podem não ser detectadas. Mudança de fonte ou configuração
reindexa documentos. Arquivos removidos são removidos do índice.

A consulta é uma frase literal FTS5, não SQL nem sintaxe FTS arbitrária;
pontuação, limites de tokens e nomes concatenados/camelCase influenciam a busca.
Não há busca semântica ou substring automática. Resultado inclui caminho
original, número do chunk (zero-based), trecho e score BM25.

### Comandos executados e verificados

```powershell
python scripts/audit_assets.py
python scripts/rag_index.py index "D:\nova flash em html\arquivos"
python scripts/rag_index.py search hall --limit 5
python scripts/rag_index.py search Socket --limit 5
python scripts/rag_index.py index "D:\nova flash em html\arquivos" --report generated/rag-incremental.json
python -m unittest discover -s tests -p test_asset_tools.py -v
```

`hall` retornou cinco resultados no limite solicitado, incluindo:

- `hall__c64be0490/recursos/scripts/asset/hall/battleLABS.as`
- `hall__c64be0490/recursos/scripts/asset/hall/farmIcon.as`
- `invite__7e8bd4e0c/recursos/scripts/invite/hall_selected.as`
- `invite__7e8bd4e0c/recursos/scripts/invite/hall_unselected.as`
- `hall__c64be0490/recursos/symbolClass/symbols.csv`

`Socket` retornou `[]` (zero correspondências lexicais no conteúdo indexado).
Isso não prova ausência na exportação completa: há arquivos/chunks fora dos
limites e FTS5 não trata `SocketManager`, por exemplo, como token `Socket`.

Para outro banco, a opção global fica **antes** do subcomando:

```powershell
python scripts/rag_index.py --database generated/outro.sqlite3 index "D:\nova flash em html\arquivos" --max-file-bytes 4194304 --max-chunks 256
python scripts/rag_index.py --database generated/outro.sqlite3 search hall --limit 10
```

Os cinco testes `unittest` passaram: inventário completo, contrato do catálogo,
ordem dos frames, FPS original/ausente/inválido, limites, busca incremental,
atualização/remoção e proteção contra escrita dos outputs dentro da fonte.
