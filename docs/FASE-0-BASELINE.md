# Fase 0 — baseline e preparacao

Data: 26/09/2026

Branch: `codex/correcoes-pre-producao`

Base: `7e668e3` (`main` / `origin/main`)

## Escopo concluido

- Branch de correcoes criada a partir da `main` limpa.
- Protecao de segredos, dados locais e uploads confirmada pelo `.gitignore`.
- Verificado que `.env`, `data/site-data.json` e os uploads reais nao sao versionados.
- Backup local criado fora do repositorio e validado com SHA-256.
- Ambiente de homologacao separado especificado em `.env.homolog.example`.
- Baseline de lint, testes, cobertura e E2E registrado abaixo.

## Backup

O ambiente atual nao possui `DATABASE_URL` ativa. Portanto, nao havia PostgreSQL local para exportar nesta fase. O backup inclui:

- `.env` local;
- `data/site-data.json`;
- `uploads/documents`;
- `uploads/gallery`.

O arquivo foi armazenado fora do repositorio, em `C:\Users\alexe\CodexBackups\site-do-meu-tio`, para evitar versionamento acidental de segredos ou dados pessoais.

- Arquivo: `fase-0-20260926-013643.zip`
- Itens verificados: 101
- SHA-256: `4BA96027A3003F8938FD03E512FE3C5286D5E1108D818E4F4C553AA00055F42A`

Antes de alteracoes em um banco de homologacao ou producao, deve ser feito tambem um `pg_dump` do banco correspondente.

## Baseline automatizado

Execucao local com Node `v24.19.0`; o projeto e o CI usam Node 20.

| Verificacao | Resultado |
|---|---:|
| ESLint | aprovado |
| Suites Jest | 9/9 aprovadas |
| Testes Jest | 75/75 aprovados |
| Statements | 59,41% |
| Branches | 48,46% |
| Funcoes | 71,37% |
| Linhas | 62,50% |
| E2E HTTP | 2/2 aprovados |
| E2E com navegador | 3 nao executados: Chromium local ausente |

A falha dos tres testes de navegador e ambiental: o executavel Chromium do Playwright nao esta instalado nesta maquina. O workflow de CI instala o Chromium antes de executar os E2E.

## Condicoes para homologacao

- Usar banco PostgreSQL exclusivo de homologacao.
- Usar `JWT_SECRET`, SMTP, Turnstile e bucket exclusivos de homologacao.
- Manter `ALLOW_DEMO_SEED=0`.
- Executar com configuracao equivalente a producao: cookies seguros e CSP ativa.
- Nunca reutilizar dados pessoais de producao sem anonimizacao.

## Comandos de aceite

Com Node 20 e npm disponiveis:

```powershell
npm ci
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run check:production
```

## Proximo marco

A Fase 1 pode iniciar a partir deste baseline. Qualquer regressao deve ser comparada com os resultados registrados acima.
