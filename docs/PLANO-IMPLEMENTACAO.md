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

## Fase B — Seguinte (código)

| # | Item |
|---|------|
| B1 | Header/footer via `public/js/site-chrome.js` (fetch partials) |
| B2 | Filtro por data na auditoria |
| B3 | Rich text sanitizado (notícias/blog) |
| B4 | Playwright E2E mínimo |
| B5 | ESLint + job CI |

## Fase C — Só configuração / conteúdo (equipa)

| # | Item |
|---|------|
| C1 | SMTP, Turnstile, volume `uploads/` ou S3 |
| C2 | Senhas demo, conteúdo institucional real |
| C3 | Gateway de pagamento (se necessário) |

*Atualizado: maio de 2026*
