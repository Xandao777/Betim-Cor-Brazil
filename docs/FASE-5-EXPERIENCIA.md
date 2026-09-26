# Fase 5 — Experiência do usuário

Concluída em 26/09/2026 na branch `codex/correcoes-pre-producao`.

## Entregas

- E-mail de membro validado no servidor, sem depender apenas do navegador.
- E-mails gravados em minúsculas e sem espaços excedentes.
- Telefones brasileiros validados e padronizados com DDD.
- O servidor impede excluir, rebaixar ou desativar o último administrador ativo.
- O painel permite ativar/desativar acessos administrativos e mostra o estado inativo.
- Exclusão de utilizadores do painel exige confirmação e não permite apagar a própria sessão.
- Exclusão de membros apresenta uma confirmação com o nome do cadastro.
- Campos de e-mail, telefone e senha receberam tipos, preenchimento automático e instruções adequadas.
- Exportações CSV de formulários e inscrições usam UTF-8 com BOM, separador compatível com Excel e escape de células.
- A página de doação informa claramente que o formulário registra uma intenção e que o pagamento é realizado por PIX, sem cobrança automática.
- Estados vazios permanecem explícitos nas páginas públicas, área de membros e painel.

## Validação

- ESLint sem erros.
- 13 suítes Jest aprovadas.
- 99 testes Jest aprovados.
- Testes unitários cobrem normalização de contatos e proteção do último administrador ativo.
- Fluxos críticos do painel e do site são cobertos pela suíte Playwright.

## Dependências externas

Os seguintes pontos não devem ser preenchidos com dados inventados e continuam como trabalho de lançamento com o responsável da associação:

- textos institucionais finais;
- fotografias, logotipos e patrocinadores reais;
- chave e titular PIX definitivos;
- teste real de recuperação de senha após configuração do SMTP.

Essas pendências aparecem no checklist de produção do painel quando a configuração correspondente ainda não está pronta.
