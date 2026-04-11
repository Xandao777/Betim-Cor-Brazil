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

## Área de membros

Em **`area-membros.html`**, associados entram com usuário e senha cadastrados pelo admin (ou, por padrão, `membro` / `demo123`). O login usa os mesmos dados que o admin gerencia em **Membros**.

## Como usar

1. **Sempre use o servidor Node** para o site funcionar (há API REST). Na pasta do projeto: `npm install` e `npm run serve:local` — abra `http://localhost:3000` (ou a porta indicada no terminal).
2. Abrir só o `index.html` pelo disco **não** carrega os dados (as chamadas `/api/public` falham).

## Banco de dados no Railway (recomendado)

1. No mesmo projeto Railway do site, clique em **+ New** → **Database** → **PostgreSQL** (ou adicione o plugin **Postgres**).
2. O Railway cria o serviço e injeta a variável **`DATABASE_URL`** no seu app web (verifique em **Variables** se o serviço do Node está **referenciando** o Postgres — use “Connect” / variável compartilhada se necessário).
3. Adicione também **`JWT_SECRET`** (string longa aleatória) nas variáveis do serviço web.

Na **primeira subida**, o Node **cria a tabela `app_state`** sozinho e preenche com os dados padrão se o banco estiver vazio. **Não é obrigatório** rodar SQL manual.

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
- **Contato**: altere e-mail e telefone no rodapé do `index.html` e nas outras páginas.
- **Patrocinadores**: substitua "Patrocinador 1", "Patrocinador 2" por nomes ou logos (pode usar `<img>` dentro de `.patrocinador-item`).
- **Galeria**: substitua os placeholders por imagens reais (use `<img>` ou links para fotos/vídeos).

## Formulários

Os formulários (contato, inscrição em eventos, login, doação) estão preparados no HTML e com feedback em JavaScript (mensagens de sucesso). Para que os dados sejam realmente enviados e guardados, é necessário conectar a um **backend** (servidor) ou serviço de formulários (ex.: Formspree, Netlify Forms).

## SEO e acessibilidade

- Meta description e palavras-chave nas páginas.
- Uso de títulos em ordem (h1, h2, h3).
- Link “Ir para o conteúdo principal” para leitores de tela.
- Atributos `aria-label` em botões e navegação.
- Foco visível em links e botões para teclado.

## Navegadores

Recomendado usar navegadores atualizados (Chrome, Edge, Firefox, Safari). O layout é responsivo para celulares e tablets.
