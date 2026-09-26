# Fase 4 — operação, backups e monitoramento

Data de conclusão: 26/09/2026

## Resultado

O projeto agora possui backup JSON versionado, restauração validada pelo painel,
health check que consulta o PostgreSQL, logs operacionais estruturados, ambiente
de homologação separado e um checklist pós-deploy automatizado.

## Rotina de backup

1. Antes de alterações relevantes, entrar no painel como administrador.
2. Em **Utilizadores**, selecionar **Descarregar backup (JSON)**.
3. Guardar o arquivo em local privado. O arquivo não contém hashes de senha.
4. No PostgreSQL de produção do Railway, manter snapshots diários e semanais do volume.
5. Antes de migrações grandes, criar também um snapshot manual do volume.

Backups de volume protegem contra erros de dados no mesmo projeto. Uma cópia JSON
fora do Railway continua necessária para sobreviver à remoção acidental do projeto.

## Restauração testada

1. Fazer o teste primeiro no ambiente `homologacao`.
2. Abrir **Utilizadores > Restaurar backup**.
3. Selecionar o JSON e confirmar a substituição integral do conteúdo.
4. As credenciais existentes do ambiente são preservadas, porque o backup não exporta senhas.
5. Executar o checklist pós-deploy e conferir o conteúdo no painel.

No PostgreSQL, todas as coleções são restauradas em uma única transação. Uma falha
provoca rollback integral; não fica uma restauração parcial.

## Monitoramento

Endpoint: `/api/health`

- responde HTTP 200 somente quando a aplicação e o banco estão disponíveis;
- responde HTTP 503 se a consulta ao PostgreSQL falhar;
- informa backend, estado do banco e tempo de atividade;
- o health check do deploy no Railway continua apontando para esse endpoint.

O health check do Railway protege a entrada de um deploy, mas não substitui
monitoramento contínuo. Configure um monitor externo para consultar o endpoint a
cada cinco minutos e alertar os responsáveis por e-mail.

## Checklist pós-deploy

Executar:

```powershell
node scripts/post-deploy-check.cjs https://seu-dominio
```

O roteiro valida:

- saúde da aplicação e conexão com o banco;
- configuração pública do Turnstile;
- carregamento dos dados públicos;
- página inicial;
- formulário de contato;
- login administrativo.

## Logs

Respostas HTTP com erro são registradas em JSON com identificador da requisição,
método, caminho, status e duração. Segredos, corpo do formulário, senhas e tokens
não são incluídos. O mesmo identificador é devolvido no cabeçalho `X-Request-ID`.
