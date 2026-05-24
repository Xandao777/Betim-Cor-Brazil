# Site da Associação

Site institucional da associação, com identidade visual em **vermelho, amarelo e verde**, navegação intuitiva e design responsivo.

## Estrutura do repositório

```
├── public/              # Site estático (URLs iguais: /index.html, /css/…, /admin/…)
│   ├── *.html           # Páginas públicas
│   ├── css/  js/  img/
│   └── admin/           # Painel administrativo
├── server/              # Módulos Node (auth, SMTP, uploads, Postgres…)
├── server.cjs           # Entrada Express (API + static)
├── data/                # site-data.json (modo ficheiro local)
├── uploads/             # Ficheiros enviados (galeria, documentos)
├── test/                # Testes Jest
└── docs/                # Documentação interna
```

Ver também `docs/ESTRUTURA.md`.

## Estrutura do site

| Página        | URL               | Conteúdo |
|---------------|-------------------|----------|
| Inicial       | `index.html`      | Nós (história, missão, visão, objetivos), eventos em destaque, notícias, galeria, voluntariado, patrocinadores |
| Eventos       | `eventos.html`    | Calendário de eventos, inscrição online |
| Notícias      | `noticias.html`   | Notícias, projetos e comunicados |
| Galeria       | `galeria.html`    | Galeria de fotos/vídeos e podcast |
| Contato       | `contato.html`    | Formulário de contato e redes sociais |
| Blog          | `blog.html`       | Blog/fórum para discussões e troca de ideias |
| Voluntariado  | `voluntariado.html` | Como participar e contribuir |
| Área Membros  | `area-membros.html` | Login para associados (área restrita) |
| Doar          | `doar.html`       | Doação e patrocínio |
| **Admin**     | `admin/index.html` | Área administrativa (login separado) |

## Área administrativa

O painel fica em **`/admin/index.html`** (URL direta — **não** há link no menu público). Em desenvolvimento local, com seed demo ativo (`ALLOW_DEMO_SEED=1` ou ambiente não-produção):

| Perfil       | Usuário  | Senha      |
|-------------|----------|------------|
| Administrador | `admin`  | `admin123` |
| Editor      | `editor` | `editor123` |

Em **produção** no Railway, o seed **não** cria contas demo por defeito — crie utilizadores no painel ou use `ALLOW_DEMO_SEED=1` só na primeira configuração e troque as senhas de seguida.

**Administrador** pode: eventos, notícias, blog, galeria, **membros**, **documentos**, patrocinadores e **conteúdo institucional**.  
**Editor** pode: eventos, notícias, blog, galeria e patrocinadores (sem membros, documentos nem conteúdo institucional).

**Dados globais:** o conteúdo (eventos, notícias, membros, inscrições, etc.) é guardado no **servidor** via API (`/api/...`). Com **PostgreSQL no Railway** (`DATABASE_URL`), tudo fica no banco; sem isso, em desenvolvimento o servidor pode usar `data/site-data.json`.

**Senhas:** no banco, as senhas de **admin** e **membros** são guardadas com **bcrypt** (não em texto puro). Contas antigas em texto são aceitas no login e **convertidas automaticamente** para hash na primeira entrada. O painel nunca recebe o hash (campo senha vem vazio na API).

**Sessão (JWT):** o token de sessão vai em **cookie HttpOnly** `SameSite=Lax` (não em `sessionStorage`), o que **impede JavaScript de ler o JWT** e reduz impacto de XSS ao roubar o token. Os pedidos à API usam `credentials: 'include'`. Em produção, defina `NODE_ENV=production` (ou `FORCE_SECURE_COOKIES=1`) para cookie **Secure**. Pedidos mutáveis com cookie de sessão exigem **Origin/Referer** coerentes com o site (camada extra contra CSRF entre origens). O servidor envia **Content-Security-Policy** restritiva (`script-src 'self'`, etc.); ao integrar scripts ou iframes externos, pode ser preciso ajustar a CSP.

**Rate limiting (produção):** a API usa **`express-rate-limit`** por endereço IP (com `trust proxy` no Railway). Há um teto global por minuto em `/api/*`, limites mais apertados em **`GET /api/public`** e **`/api/health`**, em **`POST` de login** (admin e membro; contagem só em falhas, `skipSuccessfulRequests`) e em **`POST /api/inscricao/publica`**. Ajuste opcional via variáveis: `RATE_LIMIT_API_MAX`, `RATE_LIMIT_PUBLIC_GET_MAX`, `RATE_LIMIT_LOGIN_MAX`, `RATE_LIMIT_LOGIN_WINDOW_MS`, `RATE_LIMIT_INSCRICAO_PUBLICA_MAX`. Para outra camada (CDN, gateway), pode configurar limites adicionais no provedor.

## Área de membros

Em **`area-membros.html`**, associados entram com usuário e senha cadastrados pelo admin (ou, por padrão, `membro` / `demo123`). O login usa os mesmos dados que o admin gerencia em **Membros**.

## Como usar

1. **Sempre use o servidor Node** para o site funcionar (há API REST). Na pasta do projeto: `npm install` e `npm run serve:local` — abra `http://localhost:3000` (ou a porta indicada no terminal).
2. Abrir só o `public/index.html` pelo disco **não** carrega os dados (as chamadas `/api/public` falham).

### Testes automatizados

Após `npm install` (inclui dependências de desenvolvimento):

- **`npm test`** — executa **Jest** em modo sequencial (`--runInBand`): testes **unitários** de `server/passwords.cjs` e testes **de integração** da API Express com **Supertest**, usando ficheiro JSON temporário (`SITE_DATA_FILE` no diretório de temp) e `JWT_SECRET` fixo de teste — **não** altera `data/site-data.json`.
- **`npm run test:coverage`** — igual, com relatório de cobertura.

### Pastas no repositório

Resumo completo em **`docs/ESTRUTURA.md`**. O Express serve apenas **`public/`**; `data/`, `server/`, `test/`, `docs/` e ficheiros na raiz (`server.cjs`, `package.json`, etc.) **não** são acessíveis pelo browser.

## Banco de dados no Railway (recomendado)

1. No mesmo projeto Railway do site, clique em **+ New** → **Database** → **PostgreSQL** (ou adicione o plugin **Postgres**).
2. O Railway cria o serviço e injeta a variável **`DATABASE_URL`** no seu app web (verifique em **Variables** se o serviço do Node está **referenciando** o Postgres — use “Connect” / variável compartilhada se necessário).
3. Adicione também **`JWT_SECRET`** (string longa aleatória) nas variáveis do serviço web.

Na **primeira subida**, o Node **cria a tabela `app_state`** sozinho e preenche com os dados padrão se o banco estiver vazio. **Não é obrigatório** rodar SQL manual.

### Modelo `app_state` (JSON por chave)

Os conteúdos (eventos, notícias, membros, inscrições, etc.) estão guardados como **JSONB** — **uma linha por chave lógica** (`events`, `news`, `members`, …), não como milhões de linhas normalizadas. Isto é **simples de manter** e adequado para **muitas associações de dimensão média**: poucos mil registos agregados, relatórios feitos na aplicação ou exportações pontuais, e sem requisitos extremos de auditoria campo a campo.

**Limitações naturais deste desenho:** não escala de forma elegante para **volume massivo** (milhões de linhas por entidade), **relatórios analíticos pesados em SQL** sobre histórico fino, ou **trilho de auditoria** (quem alterou o quê e quando, por campo). Para isso seria preciso **tabelas relacionais**, **event sourcing**, logs de auditoria ou **armazém** à parte — fora do âmbito deste projeto. Se a associação crescer para esse patamar, o passo seguinte é **migrar entidades concretas** (ex.: inscrições, membros) para esquemas próprios, mantendo o resto em JSON se fizer sentido.

## Deploy no Railway

O `server.cjs` usa **Express**: arquivos estáticos + rotas `/api/*` na porta `PORT`.

1. [Railway](https://railway.app) → **New project** → **Deploy from GitHub repo** → este repositório.
2. Adicione **PostgreSQL** e garanta **`DATABASE_URL`** + **`JWT_SECRET`** no serviço da aplicação.
3. Defina **`NODE_ENV=production`** no serviço web.
4. **Networking** → **Generate domain**.

Variáveis recomendadas no Railway: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `SITE_PUBLIC_URL` (URL pública do site, para links em e-mails). Não use `ALLOW_DEMO_SEED=1` em produção após criar contas reais.

**SMTP (opcional):** `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_NOTIFY_TO`. Respostas automáticas: `SMTP_AUTO_REPLY_CONTATO=1`, `SMTP_AUTO_REPLY_DOACAO=1`, `SMTP_AUTO_REPLY_INSCRICAO=1`. Recuperação de senha de membros usa o mesmo SMTP. Ver `.env.example`.

**CAPTCHA Turnstile (opcional):** `TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY` (painel Cloudflare, gratuito). Ativa verificação em contato, doação e inscrição em eventos. Sem estas variáveis, os formulários funcionam como antes.

**Uploads persistentes (opcional):** por defeito os ficheiros ficam em `uploads/` no disco do contentor (podem perder-se no redeploy). Para produção com muitas imagens/PDF, configure **S3 ou Cloudflare R2** (`S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL_BASE`, etc. — ver `.env.example`).

**Só web, sem Postgres:** o app cai no modo **arquivo** (`data/site-data.json`), pouco adequado em produção porque o disco pode ser efêmero — use Postgres no Railway para dados persistentes.

### Pasta `supabase/migrations/`

Opcional: se no futuro você usar um projeto **Supabase** separado, esse SQL cria a mesma tabela lá. O fluxo principal agora é **Postgres no Railway**.

## Personalização

- **Cores**: edite as variáveis no início de `public/css/style.css` (`--vermelho`, `--amarelo`, `--verde`).
- **Texto e conteúdo**: use o **painel admin** (`/admin/`) para eventos, notícias, galeria, patrocinadores e conteúdo institucional (e-mail, telefone, redes, PIX). Listagens públicas são preenchidas pela API (`public/js/publico-dados.js`).
- **Redes sociais e contacto**: preencha no painel **Conteúdo institucional** (os links do rodapé usam `data-inst-href`).

## Formulários e API

O projeto **já inclui** o servidor Node (**Express**) e a **API REST** (`/api/...`) — não falta “ligar um backend” de forma genérica: com `npm run serve:local` (ou deploy no Railway), as rotas estão ativas.

**Ligados ao servidor (gravam dados e, com SMTP, enviam e-mail):**

- **Contato** — `POST /api/form/contato` (notificação à equipa; auto-resposta ao visitante com `SMTP_AUTO_REPLY_CONTATO=1`).
- **Doação** — `POST /api/form/doacao` (PIX no site; auto-resposta com `SMTP_AUTO_REPLY_DOACAO=1`).
- **Inscrição pública** — `POST /api/inscricao/publica` (validação de vagas/duplicatas; e-mail à equipa e comprovante ao inscrito com `SMTP_AUTO_REPLY_INSCRICAO=1`).
- **Área de membros** — login por cookie HttpOnly, inscrições de associado, voluntariado e suporte.
- **Painel admin** — gestão de conteúdo, export CSV de inscrições, uploads (disco local ou S3/R2 se configurado).

**Doação:** regista intenção (sem gateway de cartão). Gateway online: ver `docs/MELHORIAS.md`.

## SEO e acessibilidade

Páginas `evento.html`, `noticia.html` e `blog-post.html` atualizam título, Open Graph e URL canónica após carregar os dados (`js/seo-meta.js`).

- Meta description e palavras-chave nas páginas.
- Uso de títulos em ordem (h1, h2, h3).
- Link “Ir para o conteúdo principal” para leitores de tela.
- Atributos `aria-label` em botões e navegação.
- Foco visível em links e botões para teclado.

### Conteúdo em JavaScript e motores de busca

Parte do texto (institucional, listagens de eventos/notícias/galeria, etc.) é **preenchida no cliente** a partir da API (`/api/public`). Isso pode ser **menos ideal** para alguns crawlers ou para indexação imediata do que HTML já completo no primeiro pedido — embora o **Google** execute JavaScript na maior parte dos casos. Para um **site institucional** de associação, este equilíbrio **costuma ser aceitável**: há sempre estrutura estática (títulos, navegação, `meta`, parágrafos-base no HTML).

Se no futuro algum conteúdo for **crítico para SEO** (página de campanha, landing principal, artigo muito partilhado), pode valer a pena **páginas mais estáticas** (texto e headings no próprio `.html`, ou pré-renderização/SSR) para esse caso concreto, sem obrigar a migrar o site inteiro.

## Navegadores

Recomendado usar navegadores atualizados (Chrome, Edge, Firefox, Safari). O layout é responsivo para celulares e tablets.
