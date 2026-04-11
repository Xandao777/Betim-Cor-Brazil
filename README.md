# Site da Associação

Site institucional da associação, com identidade visual em **vermelho, amarelo e verde**, navegação intuitiva e design responsivo.

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

O painel fica em **`admin/index.html`**. Acesso:

| Perfil       | Usuário  | Senha      |
|-------------|----------|------------|
| Administrador | `admin`  | `admin123` |
| Editor      | `editor` | `editor123` |

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
2. Abrir só o `index.html` pelo disco **não** carrega os dados (as chamadas `/api/public` falham).

### Testes automatizados

Após `npm install` (inclui dependências de desenvolvimento):

- **`npm test`** — executa **Jest** em modo sequencial (`--runInBand`): testes **unitários** de `server/passwords.cjs` e testes **de integração** da API Express com **Supertest**, usando ficheiro JSON temporário (`SITE_DATA_FILE` no diretório de temp) e `JWT_SECRET` fixo de teste — **não** altera `data/site-data.json`.
- **`npm run test:coverage`** — igual, com relatório de cobertura.

### Pastas no repositório

| Pasta / ficheiros | Função |
|-------------------|--------|
| `css/`, `js/`, `img/` | Assets públicos do site |
| `admin/` | Painel administrativo |
| `server/` | Módulos Node (Postgres, senhas, rate limit) |
| `data/` | `site-data.json` só em desenvolvimento local (gitignored por defeito) |
| `test/` | Testes Jest |
| `docs/` | Documentação interna (PDF, Word, notas) — **não** exposta na web pelo servidor |
| `supabase/migrations/` | SQL opcional |

O servidor **não** expõe `node_modules/`, `data/`, `server/`, `test/`, `docs/`, ficheiros de config na raiz (`server.cjs`, `package.json`, etc.) como ficheiros estáticos — só páginas e assets necessários.

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
3. **Networking** → **Generate domain**.

**Só web, sem Postgres:** o app cai no modo **arquivo** (`data/site-data.json`), pouco adequado em produção porque o disco pode ser efêmero — use Postgres no Railway para dados persistentes.

### Pasta `supabase/migrations/`

Opcional: se no futuro você usar um projeto **Supabase** separado, esse SQL cria a mesma tabela lá. O fluxo principal agora é **Postgres no Railway**.

## Personalização

- **Cores**: edite as variáveis no início do arquivo `css/style.css` (`--vermelho`, `--amarelo`, `--verde`).
- **Texto e conteúdo**: edite os arquivos `.html` e substitua os textos de exemplo pelos reais.
- **Redes sociais**: troque os `href="#"` dos links de Facebook, Instagram e YouTube pelas URLs reais (no rodapé e na página de contato).
- **Contato**: altere e-mail e telefone no rodapé do `index.html` e nas outras páginas. O formulário em `contato.html` é apenas demonstração no frontend até ligares envio a e-mail/API (ver secção **Formulários e API**).
- **Patrocinadores**: substitua "Patrocinador 1", "Patrocinador 2" por nomes ou logos (pode usar `<img>` dentro de `.patrocinador-item`).
- **Galeria**: substitua os placeholders por imagens reais (use `<img>` ou links para fotos/vídeos).

## Formulários e API

O projeto **já inclui** o servidor Node (**Express**) e a **API REST** (`/api/...`) — não falta “ligar um backend” de forma genérica: com `npm run serve:local` (ou deploy no Railway), as rotas estão ativas.

**Já ligados ao servidor (dados gravados / sessão):**

- **Login** (admin e área de membros), **painel** e conteúdo dinâmico.
- **Inscrição em eventos**: inscrição pública (`POST /api/inscricao/publica`) e inscrição de membro autenticado (`/api/inscricao/membro`), conforme as páginas de eventos e área de membros.

**Ainda só demonstração no navegador (não enviam dados ao servidor neste código):**

- **Contato** (`contato.html`) e **doação** (`doar.html`): o JavaScript usa mensagens de alerta; **não** existe hoje rota tipo `/api/contato` ou gateway de pagamento. Para produção, pode acrescentar-se endpoints no Express, integração com e-mail (SMTP, serviço transacional), **Formspree** / formulário alojado, ou redirecionamento para doação (PIX, gateway).

## SEO e acessibilidade

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
