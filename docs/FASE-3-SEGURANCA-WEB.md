# Fase 3 — antiabuso e segurança web

Data de conclusão: 26/09/2026

## Resultado

O site passou a combinar proteção por endereço IP e por utilizador nos logins,
normalizar URLs editáveis antes de persistir conteúdo e validar a configuração
completa do Cloudflare Turnstile.

## Proteções implementadas

- limite global e limites específicos por IP continuam ativos;
- falhas de login também são contadas por utilizador, mesmo quando vêm de IPs diferentes;
- um login bem-sucedido limpa as falhas acumuladas daquele utilizador;
- URLs de eventos, notícias, blog, galeria, documentos, patrocinadores e fotos de membros aceitam somente HTTP(S) ou caminhos internos seguros;
- redes sociais aceitam somente HTTP(S);
- e-mail institucional inválido é removido antes da gravação;
- conteúdo rico de notícias e blog continua sanitizado no servidor;
- senhas novas continuam exigindo no mínimo 8 caracteres e são armazenadas com bcrypt;
- CSP é ativada em produção e contempla o domínio oficial do Turnstile quando configurado;
- `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy` são enviados em todas as respostas;
- chaves parciais do Turnstile impedem a inicialização em produção, evitando uma falsa sensação de proteção;
- o painel administrativo alerta quando o CAPTCHA ainda não está configurado.

## Variáveis operacionais

- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `RATE_LIMIT_LOGIN_MAX` — limite por IP, padrão 10;
- `RATE_LIMIT_LOGIN_USER_MAX` — limite por utilizador, padrão 8;
- `RATE_LIMIT_LOGIN_WINDOW_MS` — janela dos limites, padrão 15 minutos;
- `RATE_LIMIT_API_MAX`, `RATE_LIMIT_PUBLIC_GET_MAX`,
  `RATE_LIMIT_INSCRICAO_PUBLICA_MAX` e `RATE_LIMIT_FORM_PUBLICO_MAX`.

As duas chaves do Turnstile devem sempre ser configuradas juntas. Em homologação,
podem ser usadas as credenciais oficiais de teste da Cloudflare; em produção,
devem ser usadas chaves reais vinculadas ao domínio público.

## Critérios validados

- tentativas distribuídas contra a mesma conta recebem HTTP 429;
- login válido remove o bloqueio acumulado da conta;
- protocolos executáveis como `javascript:` e `data:` são removidos dos campos de URL;
- cabeçalhos de segurança aparecem nas respostas;
- formulários públicos validam o token no servidor quando o Turnstile está ativo;
- toda a suíte unitária, de integração e de navegador permanece aprovada.
