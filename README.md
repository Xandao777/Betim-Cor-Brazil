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

Alterações feitas no painel são salvas no navegador (localStorage) e refletidas na área pública. Para produção com muitos acessos, use um backend e banco de dados.

## Área de membros

Em **`area-membros.html`**, associados entram com usuário e senha cadastrados pelo admin (ou, por padrão, `membro` / `demo123`). O login usa os mesmos dados que o admin gerencia em **Membros**.

## Como usar

1. Abra o arquivo `index.html` no navegador (duplo clique ou arraste para o Chrome/Edge/Firefox).
2. Para publicar na internet: envie a pasta completa para um provedor de hospedagem (ex.: hospedagem com FTP ou serviço estático como Netlify/Vercel).

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
