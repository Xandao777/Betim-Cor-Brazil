# Estrutura de ficheiros — Betim Cor Brazil

Organização pensada para **deploy no Railway** sem alterar URLs públicas.

## `public/` — site no browser

Tudo o que o visitante e o admin carregam diretamente no browser:

| Pasta / ficheiro | Conteúdo |
|------------------|----------|
| `*.html` | Páginas (inicial, eventos, notícias, contato, etc.) |
| `css/style.css` | Estilos do site público |
| `js/` | Scripts do front (dados, listagens, formulários, toasts) |
| `img/` | Logótipo e gráficos do cabeçalho |
| `admin/` | Login e painel (`/admin/index.html`) |
| `robots.txt`, `sitemap.xml` | SEO |

O Express serve esta pasta na raiz do domínio (`express.static('public')`), por isso `/eventos.html` e `/js/main.js` **não mudam**.

## Raiz do projeto — servidor e dados

| Item | Função |
|------|--------|
| `server.cjs` | App Express: API `/api/*`, cookies, CSP, static |
| `server/*.cjs` | Lógica modular (passwords, SMTP, uploads, Postgres) |
| `data/site-data.json` | Estado local quando não há `DATABASE_URL` |
| `uploads/gallery`, `uploads/documents` | Ficheiros enviados pelo painel |
| `test/` | Testes de integração e unitários |
| `docs/` | Planos e notas (este ficheiro, `MELHORIAS.md`, etc.) |

## O que não mover para `public/`

- **`uploads/`** — o multer grava na raiz; URLs públicas são `/uploads/gallery/…` e `/uploads/documents/…` (rotas dedicadas no `server.cjs`).
- **`data/`**, **`server/`**, **`node_modules/`** — nunca expostos pelo static (não estão em `public/`).

## Alterar caminhos no futuro

Se renomear pastas dentro de `public/`, atualize:

1. `href` / `src` em todos os HTML afetados  
2. `server.cjs` apenas se mudar favicon ou pasta static  
3. `npm test` antes de fazer deploy  

*Atualizado: maio de 2026*
