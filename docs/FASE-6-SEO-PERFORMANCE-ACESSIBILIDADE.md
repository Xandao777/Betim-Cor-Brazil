# Fase 6 — SEO, desempenho e acessibilidade

Concluída em 26/09/2026 na branch `codex/correcoes-pre-producao`.

## SEO

- Eventos, notícias e posts publicados recebem metadados no HTML enviado pelo servidor.
- Título, descrição, Open Graph, URL canônica e imagem social não dependem mais da execução de JavaScript.
- As páginas de detalhe incluem JSON-LD (`Event`, `NewsArticle` ou `BlogPosting`).
- Título e resumo também aparecem no conteúdo HTML inicial para indexação e são enriquecidos pelo JavaScript no navegador.
- Conteúdo exclusivo de membros e rascunhos continuam fora das respostas públicas.
- O sitemap dinâmico continua incluindo somente detalhes publicados e usa `SITE_PUBLIC_URL` no ambiente publicado.

## Desempenho

- CSS e JavaScript usam cache de 24 horas com revalidação.
- Imagens e fontes usam cache de sete dias com revalidação.
- HTML sempre revalida para evitar páginas desatualizadas.
- Uploads públicos da galeria usam cache de sete dias.
- Imagens não críticas usam carregamento tardio e decodificação assíncrona.
- Imagens principais recebem prioridade alta; o logotipo possui dimensões explícitas para reduzir mudança de layout.

## Acessibilidade

- Foco visível ampliado para links, botões e campos no site e no painel.
- O link “Ir para o conteúdo principal” move corretamente o foco para o conteúdo.
- O modal de confirmação do painel prende o foco, fecha com Escape e devolve o foco ao controle anterior.
- O modal de inscrição já mantém foco, Escape e retorno ao elemento acionador.
- Animações e transições respeitam `prefers-reduced-motion`.
- O QR Code PIX possui texto alternativo útil.

## Validação

- ESLint aprovado.
- 14 suítes Jest e 103 testes aprovados.
- 7 testes Playwright aprovados, incluindo SEO sem JavaScript e navegação pelo link de salto.
- Checklist pós-deploy deve ser executado contra a homologação após o commit.

## Próximas otimizações condicionais

Geração automática de múltiplos tamanhos (`srcset`) para uploads exigiria um processador de imagens e uma política de armazenamento/migração. Deve ser introduzida apenas quando houver volume real de imagens, para não aumentar a operação prematuramente.
