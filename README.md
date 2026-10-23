# Afterplant

Documentação de trabalho e handoff do motor ficam em `docs/internal/`, preservados localmente e ignorados pelo Git. Essa pasta não é necessária para executar a aplicação.

Base de interface para o hackathon SEMCOMP: Next.js App Router, TypeScript, Tailwind CSS 4, shadcn/ui e Geist. Identidade com as cores `#FF4655`, `#0C1824` e `#FFFFFF`. A plataforma exibe somente as quatro partidas da USP Stars fornecidas pela organização: 72 rounds e 594 eventos. Estatísticas e snapshots vêm desses arquivos; as dicas round a round continuam mockadas, sem motor de recomendações executado.

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
npm run verify:usp
npm run verify:assets
npm run verify:abilities
npm run build
npm start
```

O projeto funciona localmente, sem chave de API, login, banco ou serviços externos em runtime. É compatível com o deploy padrão de Next.js na Vercel; nenhum deploy foi feito nesta tarefa.

Os estilos de layout, componentes e estados usam classes Tailwind nos arquivos TSX. `globals.css` contém somente os imports, o mapeamento do tema shadcn e a camada base. As cores são tokens semânticos (`background`, `foreground`, `card`, `primary`, `muted`, `border`, `sidebar` etc.); os valores da paleta ficam centralizados nas variáveis do tema, não nos componentes ou no diagrama SVG. O vermelho Valorant é `--primary`.

## O que já funciona

- Inicial com seleção de partidas: cards com imagem oficial do mapa, placar, resultado e agentes das duas equipes.
- Busca por mapa/equipe e filtros de vitória/derrota, considerando a USP Stars como Meu time.
- Somente os quatro jogos importados aparecem na biblioteca. Exemplos antigos no armazenamento local não são apagados, mas não são exibidos.
- Rotas `/`, `/partidas/[id]`, `/catalogo` e `/catalogo/[tipo]`, com navegação de volta à lista.
- Visão geral com resumo de partida e métricas calculadas dos JSONs.
- Scoreboard com filtros por equipe, busca por nome/agente e ordenação por ACS, kills, ADR e HS%.
- Perfil lateral de jogador, com estatísticas e exemplo de dica individual.
- Seletor de rounds e linha do tempo com kills, plants e defuses registrados; resultado do round mostra eliminação, tempo, explosão ou defuse.
- Fotogramas de eventos com retratos dos sobreviventes, local da morte e orientação horizontal; controles para mostrar nomes e direções.
- Biblioteca completa com as 110 dicas analisáveis do Markdown, divididas em dez tipos; cards de categorias e página para cada tipo.
- Cada dica contém uma descrição fiel às transcrições e classificação mensurável/indício/mista. O botão ⓘ abre método de inferência, campos exatos do JSON, limites e referências; dicas espaciais sinalizam a dependência de geometria do mapa.
- Busca global e por tipo, incluindo as descrições, sem distinguir acentos; filtros de mensuráveis e indícios incluem os itens mistos em ambos os recortes.
- Na partida, catálogo separado por tipo com observações de exemplo e botões para os rounds relacionados. O catálogo global não mostra evidências de uma partida específica.
- Abas de revisão maiores, com somente holofote na aba ativa.
- Cartão de foco do próximo treino, com prioridade **mockada**, sem motor de recomendação implementado.
- Exportação do fixture completo para JSON.
- Layout responsivo, diálogos/sheet acessíveis por teclado e preferência de movimento reduzido.

O inspetor usa minimapas locais, com retratos, nomes, direções, morte e spike. Nas quatro partidas ativas, projeta diretamente as coordenadas world do JSON. Não há animação que invente movimento entre eventos. A seleção individual é um card com retrato, nome e agente no cabeçalho das dicas, sem resumo duplicado abaixo.

## Partidas da USP Stars

| Adversário            | Mapa  | Placar | ID na rota `/partidas/[id]`            |
| --------------------- | ----- | ------ | -------------------------------------- |
| Liga Vulkanica        | Lotus | 13 × 2 | `fc92e080-4f8e-4ed6-a345-a593796d8755` |
| Macklogic White       | Haven | 13 × 7 | `d8282745-93b7-4a7c-b5e7-873e4779e2d3` |
| Brutal Esports        | Lotus | 13 × 6 | `d89e1826-76a4-4fbb-91f1-a971127ba4a2` |
| CEUB Octopus Vulgaris | Haven | 13 × 5 | `ca8290e9-82e4-43f0-b0dc-6139ca6219a9` |

`src/data/official-matches.ts` reúne os dados processados de `src/data/matches/`. USP Stars é Meu time (`horizon`) nas quatro partidas: Red nas três primeiras e Blue contra a CEUB. Os nomes das organizações ficam nos metadados, não nos cards. Fixtures antigos de Ascent permanecem apenas para regressão dos validadores e não são rotas ativas da biblioteca.

```bash
npm run import:usp
npm run verify:usp
```

O importador usa os quatro arquivos em `Dados .Json/Univavá/Classificatória 4/`. O validador confere hashes, rosters, lados, estatísticas, loadouts e todos os eventos contra os originais. Todos os 29 agentes têm retrato no catálogo oficial 13.08; nenhum download é realizado em runtime.

`scripts/import-match.mjs` transforma o arquivo local em `src/data/official-match.json`, mantendo coordenadas e ângulos sem arredondamento e substituindo PUUIDs por IDs locais consistentes. Usa apenas os catálogos de assets já presentes; nenhuma API é consultada. O arquivo original não é alterado ou enviado a um serviço. SHA-256, nome e versão da partida ficam registrados no resultado.

```bash
npm run import:match -- "caminho/partida.json"
npm run verify:match -- "caminho/partida.json"
```

Os eventos ficam em ordem cronológica. `roundNum` recebe +1 uma única vez; lados vêm de `winningTeamRole`, inclusive na prorrogação. `victimLocation` marca a morte sem inventar orientação. `playerLocations`, `plantPlayerLocations` e `defusePlayerLocations` são preservados por evento, sem supor que sejam uma lista completa de vivos. A spike permanece em `plantLocation`, inclusive durante o defuse.

A detonação aparece como resultado do round, sem evento artificial: o JSON não fornece seu timestamp específico. Mortes pela spike e por habilidades são identificadas separadamente de armas. O mapeamento fornecido pelo usuário em `src/data/valorant-ids.json` identifica 20 armas e 29 agentes, inclusive Bandit. O manifesto de assets complementa esse mapeamento com os IDs e imagens do catálogo oficial 13.08, incluindo armaduras. Itens desconhecidos continuam com fallback em texto, sem inventar ícones ou fazer downloads.

### Equipamento do round

Acima do minimapa, dois quadros compactos lado a lado mostram Meu time e Time inimigo; em telas estreitas, empilham. Cada linha apresenta retrato, nome, `playerStats.score`, quantidade de kills e assistências registradas, imagem da arma, armadura e economia. O gasto fica no tooltip da célula de economia e disponível para leitores de tela. A origem é `roundResults[].playerStats[].economy`: `weapon`, `armor`, `loadoutValue`, `remaining` e `spent`. Esses valores são preservados em `Round.loadouts`; os IDs de arma e armadura também ficam disponíveis, mesmo quando desconhecidos. Ausência de dados aparece como “—”/“Não informado”, sem converter ausência em zero. Armadura vazia com economia presente significa “Sem escudo”.

Isso é um **resumo de equipamento por round**, não o inventário no instante selecionado nem uma lista de compras. O JSON não informa todas as compras, habilidades compradas, armas secundárias, munição ou origem de uma arma (compra, drop, arma salva). `spent` é o gasto agregado registrado, não o preço inferido da arma mostrada. O painel não varia ao trocar de evento dentro do mesmo round.

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
  data/agents.json           Agentes e habilidades oficiais, slots, sprites e IDs relacionados
  data/agent-abilities.ts    Consulta por agente + slot registrado no abate
  lib/utils.ts              Utilitário de classes
  lib/minimap.ts            Catálogo e projeção de coordenadas oficiais
  types/match.ts             Contratos de dados para integração
public/assets/
  agents/                   29 retratos do catálogo oficial 13.08
  abilities/                118 sprites oficiais, separados por agente e slot
  weapons/                  33 entradas + versões de killfeed
  armors/                   Três ícones oficiais de armadura
  maps/                     27 fotos oficiais de mapas
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

Todos os assets ativos de agentes, armas, armaduras, fotos de mapas e minimapas foram copiados do **Public Content Catalog oficial da Riot Games 13.08**, versão interna `13.08.00.5627607`, fornecido localmente em `C:/Users/Pichau/Downloads/PublicContentCatalog-release-13.08`. Nenhuma API externa é consultada durante a importação ou execução:

- https://developer.riotgames.com/docs/valorant#assets

Os manifestos `public/assets/manifest.json`, `public/assets/maps-manifest.json` e `public/assets/minimaps/manifest.json` registram versão, SHA-256 do catálogo, ID, nome, membro original, bytes e SHA-256 de cada PNG. São 29 agentes, 33 entradas de armas/itens (incluindo habilidades e itens de modos alternativos), três armaduras, 27 fotos de mapas e 18 minimapas. IDs canônicos fornecidos para o desafio têm preferência quando o catálogo contém nomes duplicados, como Classic e KAY/O. O conteúdo continua sujeito aos direitos e às políticas da Riot Games; origem oficial não substitui as regras/licenças do hackathon. Este projeto não é afiliado, patrocinado ou endossado pela Riot Games.

Para importar novamente, a partir da pasta extraída (offline, Node.js):

```bash
npm run import:assets -- "C:/Users/Pichau/Downloads/PublicContentCatalog-release-13.08"
npm run verify:assets -- "C:/Users/Pichau/Downloads/PublicContentCatalog-release-13.08"
```

`scripts/import-public-catalog.mjs` copia os PNGs sem edição e gera os manifestos; não utiliza scraping, endpoints comunitários, serviços de jogadores nem engenharia reversa. O pacote completo não precisa ser distribuído com a aplicação. Os antigos downloaders foram arquivados em `docs/internal/scripts/`, fora do fluxo ativo. O shadcn foi adicionado pelo CLI oficial; para novos componentes, use `npx shadcn@latest add nome-do-componente`.

### Habilidades nos abates

`src/data/agents.json` é gerado pelo importador do catálogo oficial. Cada agente é identificado pelo UUID de `characterId` e contém nome, retrato e `abilities.ability1`, `ability2`, `grenade`, `ultimate` e passivas quando existentes. Cada habilidade tem `name`, `namePtBr`, `catalogLabel`, `sprite` (caminho local, ou `null` se o PNG não existe) e `weaponIds` relacionados por correspondência exata do nome normalizado no catálogo oficial. São 118 sprites importados; habilidades sem sprite preservam nome e fallback em texto.

Para abates com `finishingDamage.damageType === "Ability"`, o importador consulta o agente do **killer** e converte o `damageItem` usando `slotAliases`: `Ability1 → ability1`, `Ability2 → ability2`, `GrenadeAbility → grenade`, `Ultimate → ultimate`. Não são teclas configuradas pelo jogador, e `GrenadeAbility` não significa necessariamente uma granada: para Raze é Bumba, enquanto Cartuchos de Tinta corresponde a `Ability2`. O resultado fica em `MatchEvent.ability`, sem alterar `damageType` e `damageItem` originais. A linha do tempo exibe nome em português e sprite oficial.

```ts
import { resolveAgentAbility } from "@/data/agent-abilities";

const ability = resolveAgentAbility("Raze", "Ability2");
// name: "Paint Shells", namePtBr: "Cartuchos de Tinta"
// sprite: "/assets/abilities/raze/ability2.png"
```

Slots vazios/desconhecidos ou agentes desconhecidos retornam `undefined`. Nunca se escolhe habilidade pela arma equipada, tempo próximo a outro abate ou por `isSecondaryFireMode`. `Weapon` continua sendo resolvido pelo UUID do item, inclusive quando é uma arma de habilidade: Overdrive da Neon, Headhunter e Tour De Force do Chamber. Os campos não são reinterpretados como `Ability`.

`npm run verify:abilities` confere a identificação e a existência dos sprites em toda a base local de 336 arquivos: 46.753 registros de mortes, incluindo 1.238 de tipo `Ability`, todos resolvidos. Também encontrou 207 registros de Overdrive, 481 de Headhunter e 42 de Tour De Force como `Weapon`. Sem a base interna, executa as verificações canônicas e de fallback. IDs vazios de armas permanecem sem identificação segura.

### Minimapas e conversão de coordenadas

`public/assets/minimaps/` contém 18 PNGs oficiais de 2048 × 2048, sem recorte, rotação ou redimensionamento do arquivo. As antigas imagens de origem comunitária foram substituídas pelos arquivos `Maps/<ID>.png` do pacote 13.08. Os quatro fatores também são oficiais, vindos de `PublicContentCatalog.json → maps[]`; não se usam mais calibrações ou callouts comunitários. Os aliases `mapUrl` foram preservados apenas para casar a identidade do mapa com `matchInfo.mapId`; o catálogo oficial identifica os mapas por UUID e não fornece esse caminho.

Há fatores de conversão preenchidos para Ascent, Bind, Breeze, Fracture, Haven, Icebox, Split, Lotus, Pearl, Sunset, Abyss, Corrode e Summit. District, Drift, Glitch, Kasbah e Piazza têm imagem disponível, mas fatores zerados: a projeção é bloqueada nesses cinco mapas. Registros sem PNG de minimapa no pacote ficam em `unavailable` no manifesto.

O catálogo canônico é `public/assets/minimaps/manifest.json`. A versão é conhecida, mas pode não coincidir com o patch em que a partida foi jogada; a presença dos fatores não é garantia de precisão histórica em mapas alterados entre patches.

Conversão (troca dos eixos antes da escala, origem no canto superior esquerdo):

```text
normalizedX = world.y * xMultiplier + xScalarToAdd
normalizedY = world.x * yMultiplier + yScalarToAdd
pixelX = normalizedX * imageWidth
pixelY = normalizedY * imageHeight
```

Não se deve girar o PNG antes da projeção. No SVG, a imagem é exibida em um espaço lógico de 1024 × 1024 e os pontos normalizados usam essa mesma escala; o PNG original de 2048 × 2048 permanece intacto. Não há interpolação, reaproveitamento de posições de outro evento nem orientação inventada para a vítima.

`src/lib/minimap.ts` fornece `findMinimap`, `worldToMinimap`, `worldToMinimapPixels` e `minimapToWorld`. Recebe coordenadas `{ x, y }` do JSON oficial, cruza os eixos antes da escala e retorna o indicador `inBounds` sem ocultar pontos fora da imagem. Uso:

```ts
const map = findMinimap(match.matchInfo.mapId);
if (map?.projectionSupported) {
  const point = worldToMinimapPixels(kill.victimLocation, map);
}
```

Atualização dos arquivos e validação offline:

```bash
npm run import:assets -- "caminho/PublicContentCatalog-release-13.08"
npm run verify:minimaps
```

Para conferir também um arquivo oficial local, passe seu caminho: `npm run verify:minimaps -- "caminho/partida.json"`. O exemplo histórico aproximado de Fracture é conferido com tolerância normalizada de 0,001 (independente da resolução). O validador também verifica inversão dos eixos, round-trip, limites, dimensões e hashes das imagens.

O inspetor seleciona o minimapa pelo `mapId` da partida real. `MatchEvent.coordinateSpace: "world"` usa a projeção; sem esse campo, preserva as porcentagens dos mocks. Pontos inválidos/externos recebem aviso, sem clamp; mapas indisponíveis têm fallback. Detalhes e ressalvas do regulamento em `docs/internal/MINIMAPAS.md`.
