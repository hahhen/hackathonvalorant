# Afterplant

Plataforma de análise pós-partida de VALORANT, com estatísticas, replay 2D por evento e dicas coletivas e individuais. Inclui as 12 partidas da FURIA UTFPR disponíveis na base do hackathon SEMCOMP.

## Requisitos

- Node.js 20.9 ou superior e npm.
- Python 3.10 ou superior apenas para reprocessar os JSONs das partidas, sem bibliotecas externas.

## Executar localmente

Na raiz do repositório:

```bash
npm ci
npm run dev
```

Acesse [http://127.0.0.1:3000](http://127.0.0.1:3000).

Os dados processados e as análises já estão incluídos. Não é necessário configurar variáveis de ambiente, chave de API, banco de dados ou executar o motor Python para usar a aplicação.

## Idiomas

A interface oferece inglês (`/en`, padrão) e português brasileiro (`/pt-BR`). O seletor de idioma mantém a página, os parâmetros de busca e a âncora, e salva a preferência por um ano no cookie `afterplant-locale`. URLs antigas sem idioma redirecionam para a preferência salva ou para inglês. Uma URL com idioma explícito sempre prevalece; o idioma do navegador não altera o padrão.

As mensagens ficam em `src/i18n/messages/en.json` e `pt-BR.json`. Os textos originais são as chaves; mensagens com valores variáveis usam placeholders (`{count}`, `{description}`), e plurais usam os sufixos `.one` e `.other`. Componentes usam `useI18n()`; links internos usam `@/i18n/link`. Datas e números são formatados com `Intl`. Os 100 itens do catálogo incluem título, descrição, método e limites nos dois idiomas, e a busca usa o idioma selecionado.

Os relatórios livres produzidos pelo motor Python permanecem como conteúdo original em português, identificados com `lang="pt-BR"` e uma indicação no título quando exibidos em inglês. O seletor não altera os JSONs de origem, os identificadores técnicos nem os dados exportados. Novos textos sem tradução preservam o original.

Valide as traduções, os plurais, a busca, as rotas e a renderização com `npm run verify:i18n`. Com a aplicação em execução, `npm run verify:i18n -- http://127.0.0.1:3000` também verifica as páginas por HTTP.

## Executar em produção

Após instalar as dependências:

```bash
npm run build
npm start
```

## Reprocessar as partidas (opcional)

Para atualizar os dados e as análises, coloque os JSONs originais da organização na estrutura abaixo, preservando os nomes dos arquivos:

```text
Dados .Json/
  Univavá/
    Classificatória 3/
    Fase de Grupos/
```

Na raiz do repositório, execute:

```bash
npm run import:furia
npm run analyze:team
npm run verify:furia
```

As análises são gravadas em `src/data/analyses/`. Para processar uma partida individual:

```bash
python -B -m engine "caminho/partida.json" --output "resultado.json"
```

Mais detalhes do motor em [engine/README.md](engine/README.md).
