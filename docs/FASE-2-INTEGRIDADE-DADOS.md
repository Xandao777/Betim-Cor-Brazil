# Fase 2 — integridade e concorrencia dos dados

Data de conclusao: 26/09/2026

## Resultado

As colecoes que crescem continuamente deixaram de ser regravadas como um unico array no PostgreSQL. Cada inscricao, mensagem ou pedido passa a ser uma linha independente, com insercao atomica e migracao automatica do formato anterior.

## Tabelas relacionais

- `event_registrations` — inscricoes em eventos;
- `contact_messages` — mensagens de contato;
- `donation_requests` — intencoes de doacao;
- `membership_requests` — pedidos de filiacao;
- `member_messages` — suporte e voluntariado de membros.

O restante do conteudo editorial permanece em `app_state`, evitando uma migracao ampla sem necessidade.

## Migracao automatica

Na inicializacao com PostgreSQL, o servidor:

1. cria as tabelas e indices ausentes;
2. copia os arrays legados de `app_state`, preservando cada payload;
3. evita duplicacao por chave primaria;
4. remove as chaves antigas somente dentro da mesma transacao;
5. reverte toda a operacao se qualquer etapa falhar.

A migration equivalente para Supabase esta em `supabase/migrations/002_record_tables.sql`.

## Concorrencia

- Formularios usam `INSERT` por registro no PostgreSQL.
- O modo arquivo serializa gravacoes por colecao.
- Inscricoes continuam revalidando duplicidade e vagas dentro de lock transacional.
- Cancelamento de inscricao de membro usa exclusao atomica.
- Marcar mensagem como lida atualiza apenas a linha correspondente.
- Limpeza/substituicao administrativa e novos envios usam o mesmo advisory lock por colecao.
- Edicoes administrativas exigem `If-Match`; ausencia retorna `428` e versao divergente retorna `409`.
- No PostgreSQL, a comparacao do ETag e a gravacao ocorrem dentro da mesma transacao.
- Alteracao administrativa e registro de auditoria sao confirmados na mesma transacao.

## Compatibilidade

- A API continua devolvendo arrays, portanto o painel e a area de membros mantem o mesmo contrato.
- O backup administrativo conserva o mesmo formato JSON.
- O modo arquivo local continua disponivel para desenvolvimento.
- Nenhuma acao SQL manual e necessaria no Railway.

## Validacao adicionada

- rejeicao de escrita administrativa sem `If-Match`;
- preservacao de 20 mensagens de contato enviadas simultaneamente;
- preservacao do teste de disputa pela ultima vaga;
- testes anteriores de autenticacao, formularios, uploads e painel continuam ativos.

## Resultado automatizado

| Verificacao | Resultado |
|---|---:|
| ESLint | aprovado, sem erros ou avisos |
| Suites Jest | 9/9 aprovadas |
| Testes Jest | 83/83 aprovados |
| Statements | 58,96% |
| Branches | 50,28% |
| Funcoes | 70,98% |
| Linhas | 62,04% |
| Playwright E2E | 5/5 aprovados |

A reducao percentual de cobertura ocorre porque a camada PostgreSQL transacional cresceu e os testes locais usam intencionalmente o modo arquivo temporario. Os fluxos publicos e administrativos continuam cobertos por integracao; a validacao com PostgreSQL real deve fazer parte da homologacao antes do deploy definitivo.
