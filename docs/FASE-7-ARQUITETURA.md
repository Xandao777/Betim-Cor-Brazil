# Fase 7 — Evolução da arquitetura

Concluída em 26/09/2026 na branch `codex/correcoes-pre-producao`.

## Entregas

- Rotas públicas foram extraídas de `server.cjs` para `server/public-routes.cjs`.
- O novo módulo concentra favicon, configuração pública, health check, dados públicos, páginas SEO e sitemap.
- A geração do sitemap virou função pura e testável.
- `server.cjs` foi reduzido de 1.633 para aproximadamente 1.500 linhas sem alterar URLs ou formatos de resposta.
- As fronteiras existentes foram preservadas: administração, PostgreSQL, e-mail, uploads, validações, segurança e restauração continuam em módulos próprios.
- O log de auditoria passou a registrar resumos seguros das alterações:
  - quantidade anterior e posterior em listas;
  - identificadores adicionados e removidos;
  - nomes dos campos alterados em objetos.
- O painel mostra o resumo da alteração junto ao utilizador, data, ação e seção.
- Dados pessoais e conteúdo completo não são copiados para o histórico de auditoria.

## Decisões de arquitetura

Não foram introduzidos nesta fase:

- `/api/v1`, pois ainda não existem clientes externos;
- tabelas PostgreSQL individuais para membros e inscrições, pois o volume atual não justifica migração e duplicidade de modelos;
- Vite, esbuild ou uma SPA, pois o frontend atual continua pequeno e funcional sem etapa de compilação.

Esses itens permanecem como gatilhos de crescimento. Devem ser retomados quando houver aplicativo externo, relatórios volumosos, concorrência elevada ou aumento frequente de novas telas e rotas.

## Validação

- ESLint sem erros ou avisos.
- 16 suítes Jest aprovadas.
- 106 testes Jest aprovados.
- Testes específicos cobrem o sitemap modular e o resumo de auditoria sem dados pessoais.
- Os fluxos Playwright e o checklist remoto são executados antes da publicação final da fase.
