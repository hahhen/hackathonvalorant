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
