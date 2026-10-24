# Motor offline — dicas 001–100

Implementação em Python 3.10+, sem dependências externas, chaves ou chamadas de rede. Lê o **JSON original da organização**, não o recorte da interface. O runner 0.4.0 integra as três entregas e as nove categorias: Economia (001–014), Pistol (015–022), Posicionamento (023–038), Trabalho em equipe (039–056), Objetivo (057–072), Clutch (073–080), Operator (081–088), Mira e treino (089–094) e Habilidades e composição (095–100). Os 100 IDs têm registro e cobertura explícita. Isso não significa 100 diagnósticos completos: há recortes parciais e requisitos não observáveis no JSON, declarados na saída.

O catálogo atual tem versão 3, 100 dicas gerais e nove categorias. Os IDs 101–110 e a categoria de táticas específicas de Ascent foram removidos do produto. O MD histórico de 110 dicas foi preservado em `docs/internal/` para rastrear as fontes, sem renumerar os itens restantes.

## Executar

Na raiz do projeto:

```powershell
python -B -m engine "Dados .Json/Univavá/Classificatória 4/UNIVAVA_C4_062_12-09-26_usp_stars_13_x_5_ceub_octopus_vulgaris_haven.json"
python -B -m engine "caminho/partida.json" --output "resultado.json" --ids "caminho/valorant-ids.json" --config "configuracao.json"
npm run verify:engine
npm run verify:engine:all
python -B -m engine.regression --write-usp
python -B -m engine.regression --write-usp --workers 4
```

Sem `--output`, escreve `src/data/analyses/<matchId>.json`. Falhas de leitura, entrada inválida ou contrato inconsistente interrompem a execução; nunca se substitui o arquivo por um mock. A regressão exige a base interna, verifica determinismo e ponteiros dos resultados e só escreve arquivos com `--write-usp` (quatro partidas da plataforma). `--workers 4` distribui partidas independentes em processos locais, mantendo a ordem e as mesmas validações; o padrão é um processo.

`engine/data/valorant-ids.json` é a cópia estrutural do dicionário compartilhado enviado pelo usuário: chaves `agentes`, `armas`, `escudos`, `mapas` e `classes`. Não é o dicionário antigo, em inglês, de `src/data/valorant-ids.json`. Preserve ambos até migrar os consumidores antigos. O motor usa a classe registrada do agente, sem presumir seu papel tático real. IDs desconhecidos/vazios continuam desconhecidos. `src/data/agents.json`, extraído do catálogo oficial, complementa apenas nomes de habilidades por agente/slot; sem ele o slot bruto é preservado.

## Arquitetura e divisão entre os três desenvolvedores

```text
engine/
  context.py             IDs, lados, eventos, snapshots e fatos compartilhados
  config.py              Limiares explícitos e validados
  report.py              Ledger de oportunidades, agregação e prioridade
  review_policy.py       Seleção explícita dos pontos para revisar (0.4.0)
  runner.py              Registro dos módulos e execução única
  validate.py            Invariantes e referências ao JSON original
  schema.py              Fonte do JSON Schema e validação estrutural
  schemas/analysis-result.schema.json
  detectors/early/       001–038: regras fornecidas pelo colega
    bridge.py           Adapta ao contexto e ao ledger únicos
    configuration.py    Configuração namespaced em early
    economy.py          001–014
    pistol.py           015–022
    positioning.py      023–038
    README.md           Definições operacionais por dica
  detectors/middle_facts.py  Estados simultâneos e fatos compartilhados 039–080
  detectors/teamwork.py  039–056
  detectors/objective.py 057–072
  detectors/clutch.py    073–080
  detectors/operator.py  081–088
  detectors/aim.py       089–094
  detectors/abilities.py 095–100
  tests/                 Casos sintéticos e regressão manual da base
```

As três entregas estão registradas em `runner.MODULES`/`CATEGORIES`, com IDs únicos em `report.DETECTORS`. Cada módulo expõe `evaluate(context, report, config)`. A integração não substitui o parser, constrói IDs paralelos nem implementa quatro motores.

O detector chama `report.record()` **para oportunidades com e sem ocorrência**. `eligible=False` representa ausência conhecida de oportunidades; `eligible=None` representa aplicabilidade desconhecida por falta de dado. `evaluated=False` significa oportunidade não avaliável; `flagged=True` exige avaliação e evidências. `partial=True` explicita quando só uma parte do método da dica é observável. A chave identifica uma oportunidade, não cada evidência.

Por padrão, oportunidades por round também geram cobertura e recomendação gerais. Para fatos agregados, usar `match_only=True, unit="match"`; não criar rounds artificiais. A composição coletiva e os acertos da equipe são calculados dos registros coletivos, não pela soma de supostos erros individuais.

Ao juntar as entregas, **registre todos os módulos no mesmo runner e gere novamente o arquivo**. Não sobrescreva resultados de outra entrega nem concatene arrays com versões/configurações diferentes sem um merge/validação explícitos. As 12 partidas ativas da FURIA UTFPR combinam 001–100; a UI consulta seus resultados reais nos quatro recortes. Resultados anteriores permanecem para regressão.

## Integração das categorias 001–038

Fonte: pacote `Downloads/Hackatons/Hackatons/`, fornecido pelo colega. As regras e fixtures foram preservadas/adaptadas em `detectors/early/` e `tests/early_helpers.py`. Não copiamos seu `normalize.py`, pipeline, schema, CLI, catálogo alternativo, dicionário ou adaptador de frontend sobre os nossos. `bridge.py` expõe a API esperada pelas regras usando eventos, PUUIDs, índices de arrays e IDs cronológicos do **mesmo Context** que atende 039–100. Posições da vítima usam `victimLocation`, sem orientação inferida. Amostras de plant/defuse têm ponteiro, mas não recebem um ID de kill inventado.

Preservamos os destinatários definidos pelo colega: economia coletiva não é replicada como culpa individual; 025 tem recortes do time e do autor da abertura. Oportunidade é um round âncora por alvo, nunca quantidade de evidências. As regras 001/003/006/007/012/014/028/031/036 são de sequência/contexto geral: usam `match_only=True, unit="round", key=<round âncora>`, com rounds relacionados nas evidências. Não criam cards nem cobertura fictícia de um único round para uma sequência da partida. Isso mantém a consistência `coverage.flagged == ocorrências` do nosso contrato.

Os limiares do pacote ficam em **`early`** na configuração, sem colisões com os parâmetros já existentes. A janela `early.followupWindowMs` é 5000 ms, enquanto `followup_window_ms` do restante do motor é 3000 ms; são recortes diferentes e ambos ficam declarados em `definition.parameters`. O hash `configVersion` considera os defaults efetivos e a geometria. Exemplo válido em `engine/config.example.json`:

```json
{
  "followup_window_ms": 3000,
  "early": {
    "tradeWindowMs": 3000,
    "followupWindowMs": 5000,
    "ecoMaxValue": 1500,
    "fullMinValue": 3900,
    "maps": {}
  }
}
```

As regras geométricas **024/027/028/029/031/032/034/036/038** estão implementadas e testadas com polígonos sintéticos. Sem geometria verificada do mapa real, retornam `not_evaluable`, sem usar minimapa raster como paredes ou cadastrar as fixtures em produção. `early.maps` aceita a chave exata de `matchInfo.mapId`, com `version`, `source`, `regions` e polígonos em coordenadas brutas. Tags e condições constam em [detectors/early/README.md](detectors/early/README.md). Essa geometria alimenta apenas as regras 001–038 que a utilizam; não desbloqueia automaticamente regras espaciais das outras entregas.

A adaptação também evita comparar vidas diferentes, rejeita pistols por número em modo desconhecido, mantém os resets econômicos de metade/overtime, exclui dano amigo do contexto de Sheriff e não trata IDs vazios/desconhecidos como prova de troca de arma. A prioridade usa o mesmo priorizador conservador do motor existente, sem importar o cálculo de prioridade separado do pacote. O formato final continua schema 1.1.0 e catálogo canônico 3.

## Integração do arquivo 39a80.py

Os indicadores do código fornecido pelo colega foram adaptados nos três módulos acima. Não importamos o script monolítico: seu parser, resumo e envelope próprios foram substituídos pelo contexto, ledger, IDs e validadores compartilhados. Os indicadores úteis ficam em `occurrences[].evidence[].values`, ligados às dicas pelas recomendações; não há novos campos `teamplayAnalysis`/`catalogAnalysis` fora do contrato. As cópias de 008/025 presentes naquele script não foram duplicadas; agora esses IDs são atendidos pela entrega própria 001–038.

Correções na adaptação: ponteiros usam índice real do array, nunca `roundNum`; trocas exigem tempo estritamente posterior e contam uma oportunidade por morte, não uma por janela; eventos simultâneos não criam estados intermediários fictícios; mortes ambientais afetam contagem de vivos, mas não viram abates adversários; feed incompleto, morte repetida ou retorno detectável bloqueiam reconstrução de vivos. Janela sem observação suficiente não é fracasso confirmado. Mortes no/após defuse concluído conhecido não entram nos confrontos do objetivo. Ressurreições sem evento próprio continuam uma limitação declarada.

| IDs          | Indicador integrado                                                                                            | Limite                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 039–042      | Intervalos de mortes aliadas, trocas temporais, distância amostrada ao aliado e pares com assistência          | Não confirma entrada em fila, companhia solicitada, bait ou crossfire         |
| 043–044, 046 | Mudanças amostradas após plant e sequência/intervalo pick → plant                                              | Não mede controle, fake ou aceleração da call                                 |
| 045, 048     | Cobertura explícita sem ocorrência                                                                             | Bloqueados: faltam regiões avançadas e classificação dos confrontos           |
| 047          | Repetição de sites de plants concluídos do mesmo lado                                                          | Não inclui todas as tentativas/rotas nem concentração da defesa               |
| 049–054      | Distribuição/dispersão e separação amostrada; contato seguido de pick/plant; mudanças na defesa                | Não classifica lurker, flanco, rotas ou espaço vazio                          |
| 055–056      | Agentes sobreviventes inferidos e tempo até próximo evento após morte                                          | Não deduz função, rotação, liderança ou adaptação consciente                  |
| 057–059      | Tempo/local de plant concluído, distância a inimigos amostrados, vivos e resultado                             | Não identifica janela segura ou limpeza do site                               |
| 060          | Cobertura explícita sem ocorrência                                                                             | Bloqueada: faltam regiões de plant protegido/exposto                          |
| 061–063      | Próxima amostra do planter na mesma vida, mortes atacantes em janela e resultado/intervalo plant–defuse        | Não observa planejamento, duelo gratuito ou tentativa/fake de defuse          |
| 064          | Detonação com defensores inferidos vivos antes dos eventos de bomba                                            | Sem evento de bomba que delimite o estado, não inventa timestamp de detonação |
| 065–067      | Sequência 1v2 pós-plant, proximidade no pick e dispersão aliada no plant                                       | Não identifica cobertura efetiva ou dificuldade real do retake                |
| 068–069      | Cobertura explícita sem ocorrência                                                                             | Bloqueadas: faltam perímetros e regiões de ligação                            |
| 070–072      | Resultado da defesa com/sem plant, agentes vivos no plant e timeout atacante identificado por rótulo conhecido | Plant não equivale a tentativa de retake; timeout não prova indecisão         |
| 073–075      | Entradas 1vX, sequência dos abates e distâncias amostradas a ameaças                                           | Sem afirmar isolamento dos duelos, som, visão ou tempo navegável              |
| 076–077      | Cobertura explícita sem ocorrência                                                                             | Bloqueadas: faltam geometria de cobertura e identificação de padrão/adaptação |
| 078–079      | Desfecho de 1vX e derrota após vantagem contra último adversário                                               | Estados inferidos; não prova duelos oferecidos ou culpa individual            |
| 080          | Inventário geral de sucessos/derrotas por lado, objetivo e equipamento                                         | Somente partida; não valida taxa universal ou superioridade de tática         |

A regra 040 registra sensibilidade em 1/3/5 segundos **na mesma oportunidade**; a seleção usa `followup_window_ms` (3000 por padrão). A regra 062 usa `afterplant_death_window_ms` (5000). A separação das regras 050–052 usa `sampled_isolation_distance_units` (2000 unidades brutas). São escolhas analíticas configuráveis, não instruções numéricas da aula. Uma vítima ausente do snapshot usa apenas seu `victimLocation`, nunca uma orientação inventada. Casos individuais/contextuais não atribuem ao jogador a responsabilidade pelo resultado do time.

## O que cada regra faz

| ID  | Recorte implementado                                                                               | Limites/estado                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 081 | Posição no primeiro pick de Operator e primeira amostra posterior do jogador, sem morte entre elas | Parcial: distância bruta não é região nem prova de imobilidade                                                     |
| 082 | Primeiras amostras de rounds com Operator, comparadas entre rounds do mesmo lado                   | Somente geral; transições entre rounds, não posições iniciais                                                      |
| 083 | Identifica contexto de multikill de Operator na defesa                                             | **Bloqueado**: recuo relativo ao site exige geometria versionada; retorna `not_evaluable` quando aplicável         |
| 084 | Aproximação amostrada ao ponto da segunda vítima e morte após o segundo pick                       | Parcial; janela de observação censurada não conta como sucesso; não verifica escape                                |
| 085 | Operator registrada no ataque, lado, contato, plant, contribuição e resultado                      | Triagem de morte sem kill/assist; não determina rush ou compra errada                                              |
| 086 | Distâncias 2D de finalizações de Operator com posição contemporânea                                | Parcial: não mede alcance eficaz, comparação completa entre armas ou tiros errados                                 |
| 087 | Finalizações próximas de Operator                                                                  | Não identifica scope/no-scope; limite em unidades brutas                                                           |
| 088 | Acertos gerais em rounds com sniper registrada                                                     | Não atribui esses acertos à sniper nem penaliza HS baixo                                                           |
| 089 | Acertos em cabeça/corpo/perna e dano contra adversários, com mínimo explícito de amostra           | Não mede altura da mira, precisão ou ajustes; equipe recalculada dos acertos brutos                                |
| 090 | Inventário de equipamento por round e de armas finalizadoras                                       | Somente geral; seleciona repertório para revisão, sem afirmar adesão ao treino                                     |
| 091 | Dano sem kill com morte nos pistols R1/R13 do modo Bomb identificado                               | Indício fraco; não mede cadência ou recoil; não chama overtime de pistol                                           |
| 092 | Finalizações longas por armas convencionais; acertos do round apresentados separadamente           | Indício fraco; não identifica tap/burst/spray nem HS por distância                                                 |
| 093 | Primeira morte adversária com dano limitado e ponto registrado                                     | Parcial: sem regiões, limpeza de pixels ou movimento; aberturas simultâneas não são escolhidas pela ordem do array |
| 094 | Candidato por orientação **anterior** da vítima, com idade e deslocamento limitados                | Nunca orientação no tiro ou taxa confirmada de mortes de costas; sem interpolação                                  |
| 095 | Casts totais por slot e média pelo número consistente de rounds                                    | Somente geral; contadores zero são válidos, ausência não é zero; não mede habilidades disponíveis ao morrer        |
| 096 | Kills de tipo `Ability`, agente/slot, instante relativo ao plant e resultado                       | Exclui pós-defuse; não prova que vítima plantava/desarmava; `Weapon` de habilidade mantém seu tipo                 |
| 097 | Assistências e pares registrados, com proximidade quando disponível                                | Não identifica habilidade causal, sincronização ou cobertura efetiva                                               |
| 098 | Agentes/classes, composição e contribuição por lado                                                | Somente coletivo geral; inventário, não validação de meta ou sinergia                                              |
| 099 | Identifica contexto de morte para futura análise espacial das ferramentas inimigas                 | **Bloqueado**: roster e snapshot não provam adequação da posição; sem achados fabricados                           |
| 100 | Assistência, trade temporal ou objetivo mesmo sem kill                                             | Não mede disciplina, comunicação ou qualidade de liderança                                                         |

As ocorrências incluem contribuições positivas e inventários úteis; não são diagnósticos automáticos de erro. Desde 0.4.0, somente os sinais admitidos pela política abaixo se tornam recomendações. Regras parciais não implementam toda a mensagem da aula. As regras bloqueadas só terão achados quando forem implementados os requisitos faltantes; não usam o raster do minimapa como paredes/regiões.

## Política de pontos para revisar — 0.4.0

`review_policy.py` separa fatos observáveis de orientação acionável. A seleção acontece no Python, antes da agregação: `occurrences` e `coverage` preservam o ledger completo; **`recommendations` só contém pontos para revisar**. O frontend não tenta inferir intenção pelo título, resultado do round ou prioridade. O catálogo pedagógico continua com 100 dicas, não com 100 alertas por round.

A lista explícita inicial admite apenas **010, 013, 025, 030, 062, 072, 079, 084 e 093**: compra extremamente dividida (1 full/4 eco), derrota com vantagem relevante de equipamento, abertura não conservada, morte sem apoio próximo/resposta, morte logo após plant, ataque perdido por tempo sem plant, vantagem >=2v1 perdida, aproximação seguida de morte após segundo pick de Operator e primeira morte com dano limitado. São perguntas sustentadas para revisão, não erros confirmados nem culpa individual. O resultado vencedor precisa ser conhecido nos sinais que dependem dele.

Os outros detectores ficam fora das recomendações até terem um gatilho negativo validado para o produto. Exemplos excluídos: distribuição 5 full (#002), sequência econômica normal (#014), trade bem-sucedido (#040), repetição de site sem contexto (#047), morte/confronto genérico, distâncias/deslocamentos isolados, HS baixo sem atribuição por arma (#089), composição e casts globais (#095/#098) e contribuição positiva sem kill (#100). Nenhuma categoria precisa gerar aviso. Os limiares das regras não foram afrouxados para esconder ocorrências.

Redundância: para o mesmo alvo e round, #079 substitui #025; #030 substitui #093. #017/#022 não são admitidas separadamente porque repetem partes do tema de #025. Não se mistura escopo individual/coletivo nem se impõe teto ou quota de cards. Um round sem recomendação é válido.

`coverage.sample.flagged` continua contando ocorrências brutas; `recommendations.sample.flagged` conta apenas as referências selecionadas. `eligible/evaluated` mantêm o denominador original do detector. Uma recomendação geral agrega exatamente os casos selecionados nos rounds, não reintroduz ocorrências suprimidas. Evidências de todos os casos brutos seguem auditáveis. A observação da recomendação explicita o motivo da revisão, além do fato registrado.

O envelope permanece schema 1.1.0; a mudança semântica é versionada em `engine.version=0.4.0` e o hash de configuração inclui versão, regras e agrupamentos da política. A API web exige essa versão. Para regenerar os arquivos ativos: `npm run analyze:team`. Testes específicos em `tests/test_review_policy.py` cobrem compra completa sem alerta, sinais positivos, estado vazio, falta de resultado, deduplicação e consistência geral/round nos dois alvos.

## Contrato 1.1.0

Preserva o envelope do handoff: `source`, `engine`, `coverage`, `occurrences` e `recommendations`; PUUIDs e times originais; `mode="computed"`; hash dos bytes; IDs determinísticos; JSON Pointer baseado no **índice real do array**; timestamps em ms.

**Única extensão do contrato:** `sample.unit` aceita `match`, e `schemaVersion` é `1.1.0`. Isso permite representar honestamente composição, inventário e casts agregados: uma oportunidade de partida, sem afirmar em qual round um cast ocorreu. O validador continua aceitando o exemplo 1.0.0. Compartilhe o schema novo com os outros dois desenvolvedores antes da integração.

Para evidência de um campo global (`players[].stats.abilityCasts`, composição), o `roundNumber` exigido pelo contrato é apenas uma âncora de origem e `values.scope` explicita a abrangência de partida; não é um timestamp de cast. As ocorrências globais listam os rounds relacionados, mas não geram ocorrências por round. `082` usa unidade `round` para transições entre rounds registrados, declarada nas limitações; os dois rounds envolvidos aparecem nas evidências.

Não há `tipId` nas ocorrências porque o contrato o resolve na recomendação. `detectorId` permite localizar a definição em `report.DETECTORS`; títulos, descrições, categorias e fontes pedagógicas continuam no catálogo.

A validação confere tipos/estrutura, amostras, identidade, IDs únicos, catálogo, referências, rounds e todos os ponteiros da evidência contra o JSON original. Não permite números não finitos. O schema pode ser regenerado com `python -B -m engine.schema`. Essa validação é necessária, mas os testes das regras continuam indispensáveis.

## Limiares e priorização

Os parâmetros de `Config` são hipóteses analíticas configuráveis, não números ensinados pelo autor ou validados para todos os patches. Distâncias são sempre unidades brutas 2D, não metros, rotas ou linha de visão. O dicionário de IDs não fornece geometria. Exemplos de overrides:

```json
{
  "operator_close_distance_units": 800,
  "operator_repeat_distance_units": 1000,
  "long_distance_units": 3000,
  "min_hits": 8,
  "low_headshot_ratio": 0.15,
  "prior_snapshot_window_ms": 1000,
  "prior_snapshot_displacement_units": 100,
  "rear_candidate_angle_degrees": 135
}
```

Nos achados, os parâmetros aplicados estão em `definition.parameters`; `engine.configVersion` é o hash determinístico dos limiares, categorias e dicionários efetivamente usados. Prioridade não é probabilidade ou culpa: por padrão é baixa; só passa a média com cobertura completa, recorrência em rounds distintos e amostra mínima. Regras fracas, agregados sem localização temporal e recortes parciais continuam baixos. Não é obrigatório produzir uma dica principal; o consumidor pode filtrar por prioridade/recorte e deve aceitar estados vazios.

## Integração com Next.js e equipe ativa

A plataforma usa as 12 partidas da FURIA UTFPR na Classificatória 3 e Fase de Grupos. Executar `npm run import:furia` e `python -B -m engine.team_analysis` (ou `npm run analyze:team`). O manifesto `src/data/team-sources.json` é a lista de entradas e hashes. O exportador Python também gera `src/data/engine-detectors.json` a partir do registro canônico, para relacionar cobertura e dicas na interface.

`scripts/import-match.mjs` agora exporta explicitamente `source.localPlayerToPuuid` e `friendlyTeamId`, sem resolver identidade por apelido. A API interna `/api/analyses/[id]` aceita apenas partidas ativas e valida hash, schema e catálogo. `src/lib/analysis-query.ts` traduz a identidade original para a consulta exata por alvo/período e conserva IDs de recomendação, amostra, prioridade, cobertura e evidências. Nomes são substituídos apenas na apresentação da observação, não na identidade nem no JSON original.

Arquivos integrais do motor ficam no servidor, não no bundle do navegador. A UI carrega recortes sob demanda e distingue carregamento, erro, nenhum achado e regra não avaliável. Sem hash/identidade compatíveis, não há fallback para mock. Recortes gerais de sequência não viram dicas fictícias de round. As listas de round permitem expandir todos os itens; o modal mostra fontes e limitações do recorte efetivo.

`npm run verify:furia` confere todas as 12 partidas contra o original, 100 IDs de cobertura por arquivo, quatro recortes, troca de lado e respostas da API, inclusive entradas inválidas. Sem geometria real, nove regras de 001–038 ficam indisponíveis; as outras nove regras bloqueadas (045, 048, 060, 068, 069, 076, 077, 083, 099) também não produzem recomendações enquanto faltarem seus requisitos.
