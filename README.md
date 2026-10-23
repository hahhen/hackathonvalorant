# Afterplant

Documentação de trabalho e handoff do motor ficam em `docs/internal/`, preservados localmente e ignorados pelo Git. Essa pasta não é necessária para executar a aplicação.

Base de interface para o hackathon SEMCOMP: Next.js App Router, TypeScript, Tailwind CSS 4, shadcn/ui e Geist. Identidade com as cores `#FF4655`, `#0C1824` e `#FFFFFF`. A partida de Ascent identificada como **Dados do JSON** usa o arquivo fornecido pela organização (15 × 17, 32 rounds). As outras partidas continuam sendo exemplos fictícios para construção da UI.

## Rodar

Requer Node.js 20.9+ e npm.

```bash
npm install
npm run dev
```

Abra http://127.0.0.1:3000. Para produção e verificação:

Se a porta 3000 já estiver ocupada, use `npm run dev -- --port 3001` e abra http://127.0.0.1:3001.

```bash
npm run typecheck
npm run verify:catalog
npm run verify:ui
npm run verify:minimaps
npm run verify:inspector
npm run verify:match
npm run verify:ids
npm run verify:scoreboard
npm run build
npm start
```

O projeto funciona localmente, sem chave de API, login, banco ou serviços externos em runtime. É compatível com o deploy padrão de Next.js na Vercel; nenhum deploy foi feito nesta tarefa.

Os estilos de layout, componentes e estados usam classes Tailwind nos arquivos TSX. `globals.css` contém somente os imports, o mapeamento do tema shadcn e a camada base. As cores são tokens semânticos (`background`, `foreground`, `card`, `primary`, `muted`, `border`, `sidebar` etc.); os valores da paleta ficam centralizados nas variáveis do tema, não nos componentes ou no diagrama SVG. O vermelho Valorant é `--primary`.

## O que já funciona

- Inicial com seleção de partidas: cards com imagem oficial do mapa, placar, resultado e agentes das duas equipes.
- Busca por mapa/equipe e filtros de vitória/derrota, considerando a equipe Horizon.
- Botão ao final da lista para adicionar uma partida de exemplo; os cards adicionados ficam no armazenamento local do navegador.
- Rotas `/`, `/partidas/[id]`, `/catalogo` e `/catalogo/[tipo]`, com navegação de volta à lista.
- Visão geral com resumo de partida e métricas ilustrativas.
- Scoreboard com filtros por equipe, busca por nome/agente e ordenação por ACS, kills, ADR e HS%.
- Perfil lateral de jogador, com estatísticas e exemplo de dica individual.
- Seletor de rounds conforme o placar de cada fixture e linha do tempo com kills, plants, defuses e detonações simuladas.
- Fotogramas de eventos com retratos dos sobreviventes, local da morte e orientação horizontal; controles para mostrar nomes e direções.
- Biblioteca completa com as 110 dicas analisáveis do Markdown, divididas em dez tipos; cards de categorias e página para cada tipo.
- Cada dica contém uma descrição fiel às transcrições e classificação mensurável/indício/mista. O botão ⓘ abre método de inferência, campos exatos do JSON, limites e referências; dicas espaciais sinalizam a dependência de geometria do mapa.
- Busca global e por tipo, incluindo as descrições, sem distinguir acentos; filtros de mensuráveis e indícios incluem os itens mistos em ambos os recortes.
- Na partida, catálogo separado por tipo com observações de exemplo e botões para os rounds relacionados. O catálogo global não mostra evidências de uma partida específica.
- Abas de revisão maiores, com somente holofote na aba ativa.
- Cartão de foco do próximo treino, com prioridade **mockada**, sem motor de recomendação implementado.
- Exportação do fixture completo para JSON.
- Layout responsivo, diálogos/sheet acessíveis por teclado e preferência de movimento reduzido.

O inspetor usa os minimapas locais de Ascent, Haven, Split, Bind, Lotus e Icebox, com retratos, nomes, direções, morte e spike. Na partida real de Ascent, projeta diretamente as coordenadas world do JSON. Os outros exemplos ainda usam porcentagens simuladas. Não há animação que invente movimento entre eventos.

## Partida real no inspetor

O card **Dados do JSON** abre `/partidas/fdcc8977-35d4-4234-b985-eb1e5d2f3791`; a antiga rota `/partidas/demo-ascent-001` também abre essa partida para preservar links do protótipo. A associação interna Red → horizon e Blue → orbit preserva os IDs de estilo da UI; os nomes exibidos são Equipe Red/Blue, pois o JSON não identifica os nomes das organizações.

`scripts/import-match.mjs` transforma o arquivo local em `src/data/official-match.json`, mantendo coordenadas e ângulos sem arredondamento e substituindo PUUIDs por IDs locais consistentes. Usa apenas os catálogos de assets já presentes; nenhuma API é consultada. O arquivo original não é alterado ou enviado a um serviço. SHA-256, nome e versão da partida ficam registrados no resultado.

```bash
npm run import:match -- "caminho/partida.json"
npm run verify:match -- "caminho/partida.json"
```

São 226 mortes, 19 plants e 6 defuses em ordem cronológica. `roundNum` recebe +1 uma única vez; lados vêm de `winningTeamRole`, inclusive na prorrogação. `victimLocation` marca a morte sem inventar orientação. `playerLocations`, `plantPlayerLocations` e `defusePlayerLocations` são preservados por evento; a UI diz “jogadores neste snapshot”, não supõe que sejam uma lista completa de vivos. A spike permanece em `plantLocation`, inclusive durante o defuse.

A detonação aparece como resultado do round, sem evento artificial: o JSON não fornece seu timestamp específico. Mortes pela spike e por habilidades são identificadas separadamente de armas. O mapeamento fornecido pelo usuário em `src/data/valorant-ids.json` identifica 20 armas e 29 agentes, inclusive Bandit. Quando não há imagem no catálogo local 08.09 (Bandit/Melee), a UI usa o nome em texto, sem inventar um ícone ou fazer downloads.

Arquivos brutos de `Dados .Json/`, documentação em `docs/internal/`, scripts de pesquisa e logs estão no `.gitignore`; continuam preservados no disco. O catálogo canônico, os dados processados necessários à aplicação e os validadores permanecem versionáveis. `verify:catalog` compara com o MD de pesquisa quando ele existe; sem esse arquivo interno, mantém as verificações de integridade do catálogo JSON.

O scoreboard, placar, escalações e as três métricas do resumo dessa partida também vêm do JSON. A tabela tem Jogador, ACS, K, D, A, Δ, K/D, ADR, HS%, KAST, FK e FD, com ordenação por todas as métricas e rolagem horizontal sem ocultar colunas.

ACS é score/rounds; ADR soma danos registrados contra adversários e divide pelos rounds em que o jogador aparece; HS% é headshots/(headshots+bodyshots+legshots) nos registros contra adversários, não percentual de kills. Sem dados de dano ou acertos, mostra “—”; ADR zero com registros completos é um valor válido. Δ é K−D com sinal; K/D mostra ∞ para kills sem mortes e “—” para 0/0.

FK conta a primeira eliminação de adversário por round; FD conta quem sofreu a primeira morte, incluindo ambiente/suicídio. Empates no milissegundo contam para todos os envolvidos, sem escolher pela ordem dos arrays. KAST é calculado localmente: percentual de rounds com kill contra adversário, assistência registrada, nenhuma morte registrada ou morte respondida por um companheiro que elimina o autor em até 3 s no mesmo round. Cada round conta uma vez; não reconstitui sobrevivência após ressurreições. Essa é uma convenção analítica explicitada na UI, não um campo oficial do JSON. Mocks sem FD/KAST permanecem com “—”.

A resposta de morte exige um companheiro matar o autor da morte em até 3 s, no mesmo round; isso não prova uma troca tática planejada. Achados e dica principal fictícios não são exibidos nessa partida: o motor de recomendações ainda não foi executado.

## Organização

```text
src/
  app/                       Rotas, layout, estilos, icon.svg e icon_typo.svg
  components/app-shell.tsx   Sidebar compartilhada com o logo fornecido
  components/matches/        Seleção e criação de partidas de exemplo
  components/review/         Telas e componentes do produto
  components/ui/             Componentes oficiais shadcn (editáveis)
  data/mock-library.ts       Partidas, mapas, placares e escalações
  data/mock-match.ts         Fixtures de scoreboard, eventos e achados por partida
  data/tactical-tips.json    Catálogo canônico com todas as 110 dicas
  data/tactical-catalog.ts   Tipos, consulta e filtros do catálogo
  data/assets.ts             Caminhos locais das imagens
  lib/utils.ts              Utilitário de classes
  lib/minimap.ts            Catálogo e projeção de coordenadas oficiais
  types/match.ts             Contratos de dados para integração
public/assets/
  agents/                   24 retratos do catálogo 08.09
  weapons/                  19 armas + versões de killfeed
  maps/                     Fotos oficiais de seis mapas
  minimaps/                 18 minimapas originais e catálogo de calibração
  manifest.json             URL de origem, IDs e caminho no ZIP
  maps-manifest.json        Origem das fotos dos mapas
docs/
  internal/                 Documentação de trabalho local, ignorada pelo Git
```

## Plugar os dados reais

1. Use os contratos de `src/types/match.ts` como referência e substitua o fixture em `src/data/mock-match.ts` por um adaptador do JSON processado em Python.
2. Normalize `roundNum` para numeração humana uma única vez.
3. Preserve as unidades de tempo em milissegundos.
4. Converta as coordenadas reais apenas com uma transformação de mapa validada; o mock usa outro sistema de coordenadas.
5. Em uma kill, `positions` contém os sobreviventes e `victimPosition` só contém posição, sem inventar `viewRadians` da vítima.
6. Preserve `src/data/tactical-tips.json` como biblioteca de recomendações. Substitua `createMockCoachTips` por achados do motor vinculados a esses IDs, com observações e rounds reais. Não duplique títulos e métodos em cada partida.

## Catálogo tático

Os dez tipos têm cores próprias em `--tip-*`, centralizadas no tema shadcn. `src/lib/tip-category-theme.ts` compartilha as classes Tailwind para rótulos, bordas e fundos sutis entre categorias, cards globais, achados e dicas por round. Os nomes das categorias continuam visíveis; a identificação não depende só da cor. O contraste dos rótulos e a cobertura das 110 dicas são validados offline.

No inspetor, a seção **Dicas do round** apresenta dois exemplos coletivos para Meu time e dois individuais para o jogador selecionado. Os exemplos variam por round e jogador, mas são determinísticos: não mudam ao navegar entre eventos do mesmo round. A seleção inclui os dez jogadores e permanece ao avançar ou voltar rounds. A seção fica abaixo do replay, fora do componente que reinicia a seleção de eventos a cada round.

`src/data/mock-round-tips.ts` contém os IDs das recomendações coletivas/individuais; títulos, descrições e método continuam vindo do catálogo canônico. Todos os itens têm `mode: "mock"`, round e, quando individuais, playerId. **Não são achados extraídos do JSON**, mesmo na partida real: o aviso “Mock · exemplos” separa essas sugestões dos eventos oficiais. O botão ⓘ abre a explicação de inferência, sem inventar evidências. O catálogo de achados da partida e o foco principal continuam sem um motor executado.

`src/data/tactical-tips.json` é a fonte única da UI. Contém `tipos`, dicionário `campos` e uma lista `dicas`, com `id`, `tipo`, `titulo`, `descricao`, `classificacao`, `inferencia` e `origem`. `inferencia` preserva o método e as limitações do Markdown, lista os códigos dos campos utilizados e indica dependência de geometria e indícios fracos. Os dez itens específicos de Ascent têm a restrição `mapas`.

São todos os **110 itens analisáveis da seção 4** do documento, não 110 erros detectados. As exclusões da seção 5 continuam fora dos detectores. As descrições são paráfrases dos trechos das transcrições, adaptadas da linguagem falada para um pequeno parágrafo; resultados mensuráveis não comprovam decisões erradas. Métodos e limiares são propostas analíticas, não regras universais.

Os achados da partida continuam fictícios e independentes dos eventos. Há onze exemplos em Ascent e dez nos outros mapas; referências a rounds inexistentes são removidas em partidas curtas. A validação `npm run verify:catalog` verifica cobertura 110/110, títulos, métodos, limites, categorias, campos, filtros e integridade dos exemplos nos seis mapas.

Fixtures de scoreboard, estatísticas e achados são independentes dos eventos demonstrativos; não são estatísticas derivadas deles. Ao conectar o backend, todas as visões deverão vir da mesma fonte processada. Os relatórios foram movidos para `docs/internal/` e os scripts de pesquisa para `docs/internal/scripts/`, todos preservados e ignorados pelo Git. Os scripts operacionais da aplicação continuam em `scripts/`.

## Assets e procedência

Os PNGs de agentes, armas e fotos de mapas foram extraídos diretamente do **Public Content Catalog da Riot Games, versão 08.09**, referenciado na documentação oficial:

- https://developer.riotgames.com/docs/valorant#assets
- https://valorant.dyn.riotcdn.net/x/content-catalog/PublicContentCatalog-release-08.09.zip

Esses arquivos vieram do catálogo oficial, não de uma API comunitária. O catálogo 08.09 não representa necessariamente todos os agentes e armas atuais. A origem de cada arquivo foi registrada em `public/assets/manifest.json` e `public/assets/maps-manifest.json`. Os minimapas têm outra procedência, descrita abaixo. O conteúdo está sujeito aos direitos e às políticas da Riot Games; este projeto não é afiliado, patrocinado ou endossado pela Riot Games.

Para baixar novamente os assets (Python padrão; acesso à internet necessário):

```bash
python scripts/fetch-riot-assets.py --download-ui-assets
python scripts/fetch-riot-assets.py --download-maps
```

O script usa requisições HTTP Range para extrair apenas os arquivos necessários do ZIP, sem baixar os aproximadamente 510 MB do catálogo inteiro. Não consulta dados de partidas ou jogadores. O shadcn foi adicionado pelo CLI oficial; para novos componentes, use `npx shadcn@latest add nome-do-componente`.

### Minimapas e conversão de coordenadas

`public/assets/minimaps/` contém 18 PNGs de 1024 × 1024, sem recorte, rotação ou redimensionamento. Eles foram baixados de `media.valorant-api.com`, com metadados de `https://valorant-api.com/v1/maps?language=en-US`, um serviço **comunitário**, distinto da API oficial da Riot. Não foram consultados dados externos de partidas ou jogadores.

Há fatores de conversão preenchidos para Ascent, Bind, Breeze, Fracture, Haven, Icebox, Split, Lotus, Pearl, Sunset, Abyss, Corrode e Summit. District, Drift, Glitch, Kasbah e Piazza têm imagem disponível, mas fatores zerados: a projeção é bloqueada nesses cinco mapas. Outros nove registros do provedor não fornecem imagem e estão listados como indisponíveis no manifesto.

O catálogo canônico é `public/assets/minimaps/manifest.json`: identifica cada mapa por `mapUrl` (compatível com `matchInfo.mapId`), UUID e nome; registra quatro fatores, dimensões, URLs de origem, SHA-256 e callouts. O provedor não informa a versão exata do patch de cada par imagem/calibração; a presença dos fatores não é garantia de precisão geométrica em qualquer patch.

`src/lib/minimap.ts` fornece `findMinimap`, `worldToMinimap`, `worldToMinimapPixels` e `minimapToWorld`. Recebe coordenadas `{ x, y }` do JSON oficial, cruza os eixos antes da escala e retorna o indicador `inBounds` sem ocultar pontos fora da imagem. Uso:

```ts
const map = findMinimap(match.matchInfo.mapId);
if (map?.projectionSupported) {
  const point = worldToMinimapPixels(kill.victimLocation, map);
}
```

Atualização dos arquivos e validação offline:

```bash
npm run fetch:minimaps
npm run verify:minimaps
```

Para conferir também um arquivo oficial local, passe seu caminho: `npm run verify:minimaps -- "caminho/partida.json"`. O exemplo histórico de Fracture fornecido pelo usuário passa com diferença menor que um pixel. A partida original de Ascent foi testada com 1.688 posições e nenhum ponto fora dos limites da imagem. Detalhes em `docs/internal/MINIMAPAS.md`.

O inspetor seleciona o minimapa pelo `mapId` da partida real. `MatchEvent.coordinateSpace: "world"` usa a projeção; sem esse campo, preserva as porcentagens dos mocks. Pontos inválidos/externos recebem aviso, sem clamp; mapas indisponíveis têm fallback. Detalhes e ressalvas do regulamento em `docs/internal/MINIMAPAS.md`.
