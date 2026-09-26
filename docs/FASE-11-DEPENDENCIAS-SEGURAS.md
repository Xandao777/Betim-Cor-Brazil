# Fase 11 — Dependências e cadeia de entrega

Esta fase atualiza componentes expostos em produção e torna explícita a versão mínima do Node.

## Alterações

- Node.js 20 ou superior passa a ser obrigatório; `.nvmrc` e `package.json` ficam alinhados ao CI.
- Express, Multer, Nodemailer e sanitize-html foram atualizados para versões corrigidas.
- Dependências transitivas vulneráveis foram fixadas por `overrides` no lockfile.
- Jest foi atualizado para a geração atual.
- O parser HTML permanece numa versão CommonJS compatível e sem vulnerabilidade identificada, evitando quebra da suíte e do servidor.

## Validação

- `npm audit --omit=dev --audit-level=high`: zero vulnerabilidades de produção.
- A auditoria completa também terminou com zero vulnerabilidades após a atualização do ambiente local.
- Verificação de segredos, lint, Jest e Playwright devem permanecer obrigatórios no CI.

Atualizações futuras devem alterar `package.json` e `package-lock.json` juntos e só podem ser publicadas depois da suíte completa.
