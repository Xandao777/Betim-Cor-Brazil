# Fase 1 — autenticacao e revogacao de sessoes

Data de conclusao: 26/09/2026

## Resultado

As rotas protegidas deixaram de confiar apenas nos dados gravados no JWT. Cada pedido autenticado agora confirma no estado atual se a conta ainda existe, esta ativa, possui a mesma versao de sessao e conserva as permissoes necessarias.

## Alteracoes realizadas

- JWT de administrador e membro inclui `sv` (`sessionVersion`).
- Contas antigas sem `sessionVersion` usam a versao inicial `1`, sem migracao manual.
- Tokens antigos sem `sv` deixam de ser aceitos e exigem novo login.
- Remover ou desativar uma conta revoga imediatamente suas sessoes.
- Alterar login, senha, estado ativo ou perfil administrativo incrementa a versao da sessao.
- Rebaixar administrador para editor tem efeito imediato, mesmo em tokens ja emitidos.
- Troca de senha gira a versao e emite um novo cookie apenas para a sessao que realizou a operacao.
- Demais sessoes abertas antes da troca de senha sao recusadas.
- Rotas protegidas enviam `Cache-Control: no-store`.
- Cookies invalidos sao limpos quando uma rota protegida retorna `401`.
- Download de documento local tambem valida a conta atual antes de autorizar acesso.

## Rotas cobertas

- estado administrativo completo e gravacao de secoes;
- sessoes de administrador e membro;
- uploads administrativos;
- inscricoes e mensagens de membros;
- perfil e troca de senha de membro;
- backup, auditoria, status, SMTP e demais rotas administrativas;
- documentos locais protegidos.

## Validacao

| Verificacao | Resultado |
|---|---:|
| ESLint | aprovado, sem erros ou avisos |
| Suites Jest | 9/9 aprovadas |
| Testes Jest | 81/81 aprovados |
| Statements | 63,22% |
| Branches | 51,77% |
| Funcoes | 74,16% |
| Linhas | 66,40% |
| Playwright E2E | 5/5 aprovados |

Foram adicionados testes especificos para rebaixamento e remocao de administrador, desativacao de membro, incremento de versao e revogacao de sessoes antigas apos troca de senha.

## Efeito no deploy

O primeiro deploy desta fase encerra as sessoes emitidas pela versao anterior, pois os tokens antigos nao possuem `sv`. Administradores e membros precisarao fazer login novamente uma vez. Nao e necessaria migration SQL: o campo fica dentro dos objetos JSON existentes e e inicializado de forma compativel.
