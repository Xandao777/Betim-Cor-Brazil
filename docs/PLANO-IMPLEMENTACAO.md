# Plano de implementação — Betim Cor Brazil

Ordem de execução (código que o assistente pode fazer no repositório).

## Fase A — Concluída nesta leva

| # | Item | Estado |
|---|------|--------|
| A1 | ETag em `PUT /api/state/:key` (evitar sobrescrita entre abas) | [x] |
| A2 | Revisão de cache `GET /api/public` ao gravar no admin | [x] |
| A3 | Doações: campo `lida` + marcar lida no painel | [x] |
| A4 | Filtro por data nos formulários recebidos | [x] |
| A5 | Reordenar eventos (subir/descer) no admin | [x] |
| A6 | `GET /sitemap.xml` dinâmico | [x] |
| A7 | Página `404.html` + fallback no servidor | [x] |
| A8 | Área de membros: toasts em vez de `alert` | [x] |
| A9 | `docs/RAILWAY-CHECKLIST.md` | [x] |
| A10 | Nota em `docs/MELHORIAS.md` + `PLANO-IMPLEMENTACAO` | [x] |
| A11 | Testes: ETag 409, mark-read doação, sitemap, 404 (50 testes) | [x] |

## Fase B — Concluída

| # | Item | Estado |
|---|------|--------|
| B1 | Header/footer via `public/js/site-chrome.js` + `public/partials/` | [x] |
| B2 | Filtro por data/utilizador/chave na auditoria (API + dashboard) | [x] |
| B3 | Rich text sanitizado (`sanitize-html`) + editor admin | [x] |
| B4 | Playwright E2E mínimo (`e2e/smoke.spec.cjs`) | [x] |
| B5 | ESLint + job CI (`npm run lint`) | [x] |

## Fase C — Produção (equipa + suporte em código)

| # | Item | Estado |
|---|------|--------|
| C1 | SMTP, Turnstile, volume `uploads/` ou S3 | [ ] Railway — ver `docs/FASE-C-GUIA.md` |
| C1b | Painel: checklist produção + `POST /api/admin/test-smtp` | [x] |
| C1c | `GET /api/health` e `GET /api/admin/status` estendidos | [x] |
| C1d | Script `npm run check:production` | [x] |
| C2 | Senhas demo, conteúdo institucional real | [ ] equipa no painel |
| C2b | Avisos utilizadores demo + checklist institucional no dashboard | [x] |
| C3 | Gateway de pagamento (se necessário) | [ ] opcional — site usa PIX + registo |
| C3b | Texto claro na página Doar (sem cobrança automática) | [x] |

*Atualizado: maio de 2026*
