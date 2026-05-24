# Plano de melhorias — Site Betim Cor Brazil

Documento de referência com tudo que **deve ser melhorado** no sistema, organizado por prioridade e área. Baseado na análise do código em maio de 2026.

**Legenda de prioridade**

| Nível | Significado |
|-------|-------------|
| **P0** | Bloqueador ou risco alto antes de produção |
| **P1** | Importante para uso real e confiança |
| **P2** | Melhoria recomendada (qualidade, escala, UX) |
| **P3** | Desejável / evolução futura |

---

## 1. Segurança e produção (P0)

### 1.1 Credenciais padrão

- [x] **Seed condicional** (`server/seed.cjs`): utilizadores demo só com `ALLOW_DEMO_SEED=1` ou ambiente de desenvolvimento (maio/2026).
- [ ] **Remover ou forçar troca** das senhas demo já existentes no Postgres de produção (ação manual no painel).
- [x] README atualizado: senhas demo só em dev; produção sem seed demo por defeito.

### 1.2 Variáveis de ambiente obrigatórias

- [x] Validar na subida: produção exige `JWT_SECRET` (mín. 16) e `DATABASE_URL` (`assertProductionConfig`).
- [ ] **`JWT_SECRET`** e **`NODE_ENV=production`** — confirmar no painel Railway (configuração manual).
- [x] `.env.example` documenta variáveis recomendadas.

### 1.3 Link “Administração” no menu público

- [x] Link removido do menu e rodapé em todas as páginas públicas.
- [x] `robots.txt` com `Disallow: /admin/`.
- [ ] Proteção extra na borda (Basic Auth / IP) — opcional.

### 1.4 Uploads em disco local

- [ ] Ficheiros em `uploads/documents/` e `uploads/gallery/` **não sobrevivem** bem a redeploys/escala horizontal no Railway.
- [ ] **Melhoria:** object storage (S3, Cloudflare R2, Supabase Storage) com URLs públicas ou assinadas.
- [ ] Validar **MIME type** no servidor (não só extensão) para reduzir upload de executáveis disfarçados.
- [ ] Servir uploads com `Content-Disposition: attachment` para PDFs sensíveis, se aplicável.

### 1.5 Proteção contra abuso em formulários públicos

- [ ] Rate limit já existe (`formPublico`, login, inscrição) — rever limites em produção conforme tráfego real.
- [ ] Adicionar **honeypot** ou **CAPTCHA** (hCaptcha, Turnstile) em contato, doação e inscrição pública para reduzir spam quando o site for divulgado.
- [ ] Opcional: confirmação por e-mail na inscrição em eventos (evita inscrições falsas).

---

## 2. Dados e regras de negócio (P0–P1)

### 2.1 Limite de vagas em eventos

- [x] API valida lotação em `POST /api/inscricao/publica` e `/api/inscricao/membro` (`server/inscricao-validacao.cjs`).

### 2.2 Inscrições duplicadas

- [x] Uma inscrição por e-mail por evento (público) e por membro por evento (área logada).

### 2.3 Validação server-side de inscrições

- [x] Valida evento existente, publicado, inscrições ativas, e-mail, vagas, data não passada.
- [x] Honeypot `website` na inscrição pública (e contato/doação no servidor).

### 2.4 Modelo de persistência (JSON por chave)

- [ ] Adequado para associação média; documentar limites (sem auditoria campo a campo, relatórios SQL pesados).
- [ ] **P2:** quando crescer, migrar `inscricoes` e `members` para tabelas SQL dedicadas; manter resto em JSON se fizer sentido.
- [ ] **P2:** exportação/backup periódico (JSON dump ou `pg_dump`) — hoje não há ferramenta no painel.

### 2.5 Concorrência ao gravar estado

- [ ] `PUT /api/state/:key` substitui o array **inteiro** — duas abas do admin a editar ao mesmo tempo podem **sobrescrever** alterações.
- [ ] **Melhoria:** versioning (ETag), merge por `id`, ou locks otimistas.

---

## 3. Pagamentos e doações (P1)

### 3.1 Fluxo atual

- [ ] Doação regista apenas **intenção** (`pedidos_doacao`) — sem PIX, boleto ou gateway.
- [ ] Mensagem ao utilizador promete “instruções por e-mail” — depende de SMTP manual da equipa.

### 3.2 Melhorias recomendadas

- [ ] Exibir **QR Code PIX** e chave no `doar.html` (dados institucionais configuráveis no painel).
- [ ] Integrar gateway (Stripe, Mercado Pago, PagSeguro) se doação online for requisito.
- [ ] E-mail automático ao doador com valor e instruções (além da notificação à equipa).
- [ ] Estado do pedido no admin: `pendente` | `contactado` | `concluído`.

---

## 4. E-mail e notificações (P1)

### 4.1 SMTP opcional

- [ ] Sem `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`, formulários gravam mas **ninguém é avisado** por e-mail.
- [ ] Documentar configuração no deploy; testar envio após subida.

### 4.2 Cobertura de notificações

- [x] Nova inscrição pública dispara e-mail à equipa (tipo `inscricao` em `smtp-mail.cjs`), se SMTP configurado.
- [ ] Confirmar SMTP no Railway e testar envio real.
- [ ] Auto-resposta ao visitante (`SMTP_AUTO_REPLY_CONTATO`) — ativar e testar em produção.

### 4.3 Inscrição pública

- [ ] Enviar comprovante por e-mail ao inscrito (hoje só na tela).

---

## 5. Experiência do utilizador (P1–P2)

### 5.1 Feedback com `alert()`

- [ ] Vários fluxos usam `alert()` (`main.js`, `evento.js`, `area-membros.js`, `admin-painel.js`) — pouco acessível e antiquado.
- [ ] **Melhoria:** componentes de toast/banner inline com `aria-live` (já usado em partes do site).

### 5.2 Estados de carregamento e erro

- [x] Banner de erro se `/api/public` falhar (`dados-site.js`).

### 5.3 Conteúdo placeholder no HTML

- [ ] `index.html`, `noticias.html` e outras ainda têm **textos e cards estáticos de exemplo** que somem quando o JS carrega — flash de conteúdo incorreto.
- [ ] **Melhoria:** skeleton loaders ou remover placeholders; só mostrar secções após `D.ready`.

### 5.4 Redes sociais e contacto

- [ ] Links `href="#"` com `data-inst-href` — dependem do JS; se falhar, links mortos.
- [ ] Preencher URLs reais no painel **Conteúdo institucional** antes do go-live.

### 5.5 Impressão do comprovante de inscrição

- [ ] Comprovante só na tela — **P2:** botão “Imprimir / Guardar PDF” com CSS `@media print`.

### 5.6 Acessibilidade

- [ ] Bom: skip link, `aria-*`, foco em vários elementos.
- [ ] **P2:** revisar contraste WCAG nas cores cultural (vermelho/amarelo/verde).
- [ ] **P2:** modal de inscrição em `evento.html` — foco preso, `Escape` para fechar, `role="dialog"`.
- [ ] **P2:** substituir `alert()` por regiões `aria-live` (ver 5.1).

---

## 6. Segurança no frontend (P1–P2)

### 6.1 XSS em conteúdo dinâmico

- [x] `DadosSite.escapeHtml` partilhado; `evento.js` usa escape no detalhe e comprovante.
- [ ] `area-membros.js` e outros módulos — pendente.

### 6.2 Sessão de membro em `sessionStorage`

- [ ] Flags `membroLogado` em `sessionStorage` podem **desincronizar** do cookie (ex.: cookie expirado, flag ainda `true`).
- [ ] **Melhoria:** confiar só em `GET /api/auth/member/session` (como o admin já faz com `/api/auth/admin/session`).

### 6.3 Link admin visível

- [ ] Ver secção 1.3.

---

## 7. SEO e desempenho (P2)

### 7.1 Conteúdo renderizado no cliente

- [ ] Listagens e detalhes dependem de JS + `/api/public` — crawlers podem indexar menos bem que HTML estático.
- [ ] **Melhorias possíveis:** pré-renderização (prerender.io), SSR mínimo nas páginas críticas, ou gerar HTML no build para eventos/notícias em destaque.

### 7.2 Meta tags e Open Graph

- [ ] `og:title` e `description` genéricos em páginas internas (`evento.html`, `noticia.html`).
- [ ] **Melhoria:** atualizar meta/OG por evento/notícia após carregar dados (ou rotas server-side que injetem tags).

### 7.3 Sitemap e robots

- [ ] **P2:** `sitemap.xml` e `robots.txt` (bloquear `/admin/`).
- [ ] **P2:** `canonical` URLs nas páginas de detalhe.

### 7.4 Assets

- [ ] **P2:** imagens responsivas (`srcset`), lazy loading na galeria.
- [ ] **P2:** minificar CSS/JS em build (hoje ficheiros únicos sem pipeline).

### 7.5 Cache da API pública

- [ ] **P2:** `Cache-Control` curto em `GET /api/public` para reduzir carga (invalidar ao gravar no admin).

---

## 8. Painel administrativo (P1–P2)

### 8.1 Gestão de utilizadores admin

- [ ] Não há UI para criar/remover **utilizadores admin** (`admin_users`) — só via API/JSON.
- [ ] **Melhoria:** secção “Utilizadores do painel” (só perfil `admin`).

### 8.2 Formulários recebidos

- [ ] Mensagens de contato/doação/membros listadas — falta **marcar como lida**, filtros por data, pesquisa.
- [ ] Botão “Limpar todos” em doações — risco de apagar histórico sem export prévio.

### 8.3 Inscrições

- [ ] Exportar CSV das inscrições por evento (para check-in no dia).
- [ ] Enviar e-mail em massa aos inscritos (lista de distribuição) — **P3**, cuidado com LGPD.

### 8.4 Blog

- [ ] Sem comentários (pode ser intencional) — se quiser fórum real, precisa moderação e anti-spam.

### 8.5 Galeria e documentos

- [ ] Sem ordenação drag-and-drop — ordem = ordem do array.
- [ ] Sem legendas/alt text obrigatório para acessibilidade.

### 8.6 Auditoria

- [ ] Sem log de “quem alterou o quê e quando” — **P3** para transparência institucional.

---

## 9. Área de membros (P1–P2)

### 9.1 Recuperação de senha

- [ ] **Não existe** “Esqueci a senha” — depende do admin redefinir manualmente.

### 9.2 Alteração de senha pelo membro

- [ ] `PATCH /api/member/perfil` altera nome/e-mail/telefone — **não senha**.
- [ ] **Melhoria:** fluxo “alterar senha” com senha atual + bcrypt no servidor.

### 9.3 Notícias exclusivas

- [ ] Campo `exclusivoMembros` nas notícias — garantir que **nunca** apareçam em `/api/public` (hoje filtradas no cliente; validar também no servidor).

### 9.4 Relatórios

- [ ] Secção “Relatórios” na área de membros — confirmar se lista documentos reais ou placeholder; alinhar com categorias do admin.

---

## 10. Arquitetura e código (P2)

### 10.1 Duplicação de layout HTML

- [ ] Header e footer **copiados** em ~15 ficheiros HTML — qualquer alteração de menu exige editar todos.
- [ ] **Melhoria:** partials (SSI no servidor), build com Eleventy/11ty, ou componente injetado por pequeno script de include.

### 10.2 JavaScript sem módulos

- [ ] Scripts globais IIFE — difícil testar no browser e partilhar utilitários (`escapeHtml`).
- [ ] **P3:** bundler (esbuild) com módulos ES, sem obrigar framework SPA.

### 10.3 README desatualizado

- [ ] Secção **“Formulários e API”** diz que contato e doação são “só demonstração” — **já estão ligados** a `/api/form/contato` e `/api/form/doacao`.
- [ ] Atualizar README e este documento quando itens forem concluídos.

### 10.4 Tipagem e validação de API

- [ ] Sem schema (Zod/Joi) nos bodies — validação manual e incompleta em algumas rotas.
- [ ] **Melhoria:** validação centralizada por rota.

### 10.5 Internacionalização

- [ ] Site só em pt-BR — OK para o público atual; **P3** se houver parcerias internacionais.

---

## 11. Testes e qualidade (P2)

### 11.1 Cobertura atual

- [ ] Jest + Supertest: auth, state, formulários, inscrições — **bom começo**.
- [ ] Sem testes E2E no browser (Playwright).
- [ ] Sem testes dos scripts frontend.

### 11.2 Casos a acrescentar

- [ ] Inscrição com evento inexistente / inscrições fechadas / lotação cheia (quando implementado).
- [ ] Editor tentando `PUT` em `members` → 403.
- [ ] CSRF: POST com cookie mas Origin errado → 403.
- [ ] Upload com extensão inválida.
- [ ] Rate limit 429 nas rotas públicas.

### 11.3 CI/CD

- [ ] **P2:** GitHub Action que corre `npm test` em cada push/PR.
- [ ] **P2:** lint (ESLint) e verificação de segredos no repositório.

---

## 12. DevOps e operação (P1–P2)

### 12.1 Monitorização

- [ ] Só `GET /api/health` — **P2:** alertas se health falhar (UptimeRobot, Railway metrics).
- [ ] Logs estruturados para erros 500 e falhas SMTP.

### 12.2 Backups

- [ ] Railway Postgres: confirmar política de backup do plano.
- [ ] Script documentado para export manual do `app_state`.

### 12.3 Ambientes

- [ ] Separar **staging** e **produção** (dois serviços Railway, bases distintas).
- [ ] Nunca usar `ALLOW_DEMO_SEED` em produção.

### 12.4 HTTPS e domínio

- [ ] Domínio customizado com TLS no Railway.
- [ ] Redirecionar HTTP → HTTPS.

---

## 13. LGPD e privacidade (P1–P2)

- [ ] **Política de privacidade** e base legal para tratamento de dados (inscrições, contacto, membros).
- [ ] Consentimento explícito nos formulários (checkbox + link para política).
- [ ] Retenção de dados: prazo para apagar mensagens antigas e inscrições.
- [ ] Direito de acesso/eliminação — processo manual hoje; **P2:** endpoint ou fluxo no admin para exportar/apagar dados de um titular.
- [ ] Não expor e-mails de inscritos publicamente no admin a perfis que não precisem (editor já não vê membros — OK).

---

## 14. Conteúdo e configuração antes do go-live (P0)

Checklist operacional (não é código, mas é obrigatório):

- [ ] Substituir textos de exemplo (missão, história, patrocinadores fictícios).
- [ ] Logo e imagens reais em `img/` e galeria.
- [ ] E-mail e telefone institucionais corretos no painel.
- [ ] URLs de Facebook, Instagram e YouTube no painel.
- [ ] Remover ou ocultar eventos/notícias de demonstração.
- [ ] Definir utilizadores admin reais com senhas fortes.
- [ ] Configurar SMTP e testar um envio de contato.
- [ ] Confirmar `DATABASE_URL` em produção (não depender de `data/site-data.json`).

---

## 15. Roadmap sugerido (ordem de execução)

| Fase | Foco | Itens principais |
|------|------|------------------|
| **1 — Go-live seguro** | P0 | Senhas, JWT, Postgres, SMTP, remover link admin público, conteúdo real |
| **2 — Negócio** | P1 | Vagas/duplicatas inscrição, PIX/doação, notificações inscrição, LGPD básico |
| **3 — Qualidade** | P2 | XSS escape, UX sem alert, README, loading/error, export CSV, CI |
| **4 — Escala** | P3 | Object storage, SQL parcial, auditoria, SSR/SEO avançado |

---

## 16. Resumo executivo

O sistema está **funcional e bem estruturado** para uma associação (API, auth com cookies, bcrypt, rate limit, painel completo). As melhorias mais urgentes não são “falta de backend”, e sim:

1. **Hardening de produção** (segredos, senhas demo, persistência, uploads).
2. **Regras de negócio** em eventos (vagas, duplicatas, validação).
3. **Doação e comunicação** (PIX/gateway, e-mails completos).
4. **UX e segurança frontend** (escape HTML, sessão membro, feedback sem `alert`).
5. **Manutenção** (README, backups, testes CI, menos duplicação HTML).

Este ficheiro deve ser atualizado à medida que cada item for implementado (marcar `[x]` e data opcional no commit).

---

*Última revisão: maio de 2026*
