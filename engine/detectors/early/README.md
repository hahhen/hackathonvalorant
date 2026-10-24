# Definições operacionais das dicas 001–038

Referência pedagógica: `docs/internal/DICAS_FRTTT_ANALISAVEIS_JSON_COMPLETO.md` na raiz do projeto. Regras fornecidas pela equipe e integradas pelo `bridge.py` ao contexto e contrato únicos do produto. Parâmetros no objeto `early` de `engine/config.example.json`. Abaixo estão os recortes implementados. “Sinaliza” inclui descrições para revisão, sem concluir erro tático. Os limiares são os de `engine/config.example.json`.

| Dica | Destinatário | Oportunidade e condição observada |
| --- | --- | --- |
| 001 | Jogador | Gasto ≥ highSpend e queda de equipamento ≥ equipmentDrop no próximo round da mesma metade. Sequência de partida. |
| 002 | Time | Distribuição dos cinco equipamentos em eco/semi/full, com resultado; descrição de todos os rounds avaliáveis. |
| 003 | Jogador | Equipamento abaixo de full, gasto ≥ highSpend e acima da mediana do time, seguido de equipamento abaixo de full. Sequência. |
| 004 | Time | Oponente perto da vitória regulamentar pelo placar reconstruído e equipamento médio inferior a full. Contexto, não prova de forçado. |
| 005 | Time | Time perdeu o pistol; plant, baixas inimigas e estado econômico/resultado no round seguinte. |
| 006 | Jogador | Em R3/R15, mesmo ID de arma, gasto baixo e nenhuma morte registrada no anterior, sem ambiguidade de vida. Continuidade compatível com bônus, sem identificar o exemplar. |
| 007 | Time | Sequência anterior→possível bônus→seguinte em R2–R4/R14–R16: gastos, equipamentos e resultados. |
| 008 | Time | Há equipamentos em faixas diferentes no mesmo round. |
| 009 | Jogador | Três/quatro jogadores full e destinatário abaixo da faixa full; abates e assistências registrados. |
| 010 | Time | Um equipamento full e quatro eco. |
| 011 | Time | Primeira eliminação única contra adversário: equipamento da vítima comparado à distribuição adversária. Não mede leitura prévia. |
| 012 | Jogador | Saldo anterior ≤ lowBalance e equipamento atual full. Pode resultar de renda normal, arma preservada, drop ou pickup; não identifica transferência. |
| 013 | Time | Derrota com equipamento total ≥ equipmentAdvantageRatio × adversário e estritamente maior. Preserva a cerimônia registrada. |
| 014 | Time | Sequência de dois rounds da mesma metade com gasto, equipamento e resultados. |
| 015 | Jogador | Configuração agente/arma/armadura/gasto e abates/resultado nos pistols regulamentares. |
| 016 | Jogador | Distância bruta em finalizações de Ghost/Frenzy no pistol; equipamento registrado fica separado. Sem corte universal de distância. |
| 017 | Jogador | Autor da primeira eliminação no pistol morre em até followupWindowMs. Não verifica acionamento/possibilidade de escape. |
| 018 | Jogador/Reyna | Primeira vítima ou autor de resposta temporal a uma morte aliada no pistol. Ausência de Reyna é não aplicável. |
| 019 | Jogador | Controlador/sentinela/iniciador no pistol tem finalização por arma diferente da registrada no equipamento; inclui total de assistências. Não confirma pickup. |
| 020 | Jogador | Finalizações de Sheriff no pistol com distância; acertos agregados do jogador em evidências separadas, sem atribuir bodyshots à Sheriff. |
| 021 | Jogador | Finalizações de Classic no pistol com modo primário/secundário e distância registrados. Não estima eficácia por tentativa. |
| 022 | Time | Pistol perdido após primeira eliminação do time; registra plant/resultado. |
| 023 | Jogador | Posição na kill e próxima amostra, distância e intervalo; informa se está abaixo de movementMinUnits e se a segunda amostra é a própria morte. |
| 024 | Jogador | Kill em região cadastrada seguida de morte em até followupWindowMs; recorrência fica na recomendação geral. Não comprova escape viável. |
| 025 | Time e autor da abertura | Derrota após primeira eliminação ou morte do opener em até followupWindowMs; preserva os resultados concretos. |
| 026 | Jogador | Posições em kills próprias sucessivas e intervalo/deslocamento; não infere ângulo de surpresa. |
| 027 | Jogador | Morte em região cadastrada com pelo menos dois adversários vivos a até nearbyUnits, em snapshot completo. Não mede exposição/visibilidade. |
| 028 | Jogador | Confronto em região rara no recorte de kills aliadas da partida, por lado/fase preplant/postplant. Relata frequência e desfecho; não chama região rara de off-angle confirmado. |
| 029 | Jogador | Autor da primeira eliminação em região anotada como avançada para o lado, seguido de morte rápida; registra agente. Não classifica disponibilidade de escape. |
| 030 | Jogador | Morte sem resposta na janela e sem aliado a até nearbyUnits, com snapshot completo. Não mede cobertura real. |
| 031 | Jogador | Eventos individuais classificados por região, estado numérico antes do evento e abate/morte. Consolidação na partida permite comparar posições por estado. |
| 032 | Jogador | Primeira aparição disponível em snapshot, por região/lado/tempo. Não é tempo de chegada nem primeiro contato. |
| 033 | Jogador | Duas posições consecutivas separadas por ≥ staleSampleMs; informa intervalo sem amostra e deslocamento, apenas como informação retrospectiva do analista. Não estima área alcançável. |
| 034 | Jogador | Morte sem resposta com inimigos próximos em ≥2 regiões e dano agregado de ≥2 adversários no round. Não afirma dano simultâneo. |
| 035 | Jogador | Primeira kill elegível em estado inferido 1vX (X≥2), comparada com próxima posição amostrada. Uma entrada por jogador/round. |
| 036 | Jogador | Primeiro confronto individual amostrado na mesma região em ≥ repeatMinRounds consecutivos do mesmo lado, com desfechos. Não demonstra adaptação inimiga. |
| 037 | Jogador | Desfecho de cada morte entre adversários: resposta temporal, intervalo e aliados/inimigos próximos. Uma oportunidade por round, ainda que haja várias mortes. |
| 038 | Jogador/atacante | Após plant, kill em região anotada como frente/borda do retake e próxima amostra viva em região anotada de recuo; distância, tempo e resultado. Não atribui todo atraso à kill. |

As regras 001/003/006/007/012/014/028/031/036 geram ocorrências de partida, com rounds relacionados. As outras geram ocorrências por round e consolidação na partida. Desfechos sem ocorrência continuam registrados em `coverage`.

Para as janelas: uma resposta observada é positiva; sem resposta, é necessário um evento posterior que alcance o limite da janela ou um fim explícito por defuse, que encerra a disputa. Sem isso, o caso é censurado. Não se usa o último abate como fim universal, nem se inventa um timestamp de explosão. Mortes de bomba/suicídio/fogo aliado não são primeiras eliminações nem duelos/trades entre adversários.

O estado de vida é uma reconstrução condicionada ao feed completo. Vítimas repetidas ou reaparição de mortos em snapshots tornam essa reconstrução ambígua. Efeitos de ressurreição não registrados ainda podem limitar a análise; o JSON não permite provar ausência de toda mecânica de retorno à vida.
