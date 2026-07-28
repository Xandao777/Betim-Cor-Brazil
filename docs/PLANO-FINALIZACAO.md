# Plano de finalização — Betim Cor Brazil

**Objetivo:** sair de “site funcional em desenvolvimento” para **produto profissional, confiável e vendável** — pronto para a associação usar no dia a dia e para você entregar com orgulho (e manter como negócio).

**Horizonte sugerido:** 4–6 semanas (paralelizando código + cliente + Railway).

**Documentos relacionados:** `FASE-C-GUIA.md`, `RAILWAY-CHECKLIST.md`, `QUESTIONARIO-CLIENTE-RESUMO.md`, `PLANO-MELHORIAS-COMPLETO.md`.

---

## 1. O que significa “perfeito” neste projeto

Não é reescrever tudo. É atingir cinco pilares:

| Pilar | O visitante/ cliente sente… | Você consegue… |
|-------|-----------------------------|----------------|
| **Confiança** | Site sério, dados reais, sem placeholders | Demonstrar sem vergonha |
| **Operação** | Formulários respondidos, eventos atualizados | Entregar e sair sem “bomba-relógio” |
| **Segurança** | Dados protegidos, sem vazamentos | Dormir tranquilo em produção |
| **Polimento** | Rápido no telemóvel, textos claros, visual coerente | Cobrar valor justo pelo trabalho |
| **Sustentação** | Alguém sabe manter; backup e monitorização | Oferecer suporte/mensalidade |

---

## 2. Estado atual (jul/2026)

### Já está pronto (não refazer)

- Site público completo (18 páginas)
- Painel admin com perfis admin/editor
- Área de membros (login, documentos, inscrições, voluntariado)
- Auth JWT + cookies HttpOnly, bcrypt, rate limit, CSP, Turnstile opcional
- PostgreSQL + fallback arquivo; ETag/409; sanitização HTML
- SMTP, S3/R2, checklist produção no dashboard, teste SMTP
- **61 testes Jest** + smoke Playwright + CI GitHub Actions
- Documentação extensa + questionários cliente

### Ainda falta para “negócio bom”

| Área | Gap | Estado |
|------|-----|--------|
| **Produção** | Railway sem env completo; uploads podem perder-se no redeploy | ⏳ Manual Railway |
| **Cliente** | Conteúdo demo (e-mail, telefone, eventos fictícios) | ⏳ Questionário cliente |
| **Produto** | Hero homepage e voluntariado no painel | ✅ Implementado |
| **Robustez** | Inscrições atómicas; senha mín. 8 chars | ✅ Implementado |
| **Qualidade** | E2E admin + institucional; limpeza galeria | ✅ Implementado |
| **Negócio** | Manual associação + script finalize | ✅ Implementado |

---

## 3. Roadmap em 5 fases

```text
Semana 1          Semanas 2–3         Semana 3–4          Semana 5+           Contínuo
─────────         ───────────         ──────────          ─────────           ────────
FASE 1            FASE 2              FASE 3              FASE 4            FASE 5
Go-live           Conteúdo +          Polimento           Confiança           Crescimento
seguro            operação            profissional        & negócio           (opcional)
```

---

## FASE 1 — Go-live seguro (P0) · ~3–5 dias

**Meta:** site no ar sem risco de perda de dados, vazamento ou contas demo.

### 1.1 Railway (você ou DevOps)

- [ ] `DATABASE_URL` + Postgres plugin
- [ ] `JWT_SECRET` (≥32 caracteres aleatórios)
- [ ] `NODE_ENV=production`
- [ ] `SITE_PUBLIC_URL` (URL final, sem `/` no fim)
- [ ] `ALLOW_DEMO_SEED` omitido ou `=0`
- [ ] **Uploads:** volume `/uploads` **ou** Cloudflare R2/S3 (`S3_*`)
- [ ] `npm run check:production` → exit 0

### 1.2 E-mail e anti-spam

- [ ] SMTP configurado (`SMTP_*`, `SMTP_NOTIFY_TO`)
- [ ] Teste SMTP no painel → e-mail recebido
- [ ] Turnstile ativo (`TURNSTILE_*`) nos formulários públicos
- [ ] Auto-respostas: decidir com cliente (`SMTP_AUTO_REPLY_*`)

### 1.3 Contas e segurança operacional

- [ ] Criar 1–2 admins reais no painel
- [ ] Remover ou alterar `admin` / `editor` demo
- [ ] Criar 1 editor (se a associação quiser separar funções)
- [ ] Documentar credenciais num gestor de senhas (1Password, Bitwarden…)

### 1.4 Smoke test em produção

- [ ] Homepage, contato, doar, 1 evento — no telemóvel
- [ ] Login admin + gravar alteração institucional
- [ ] Formulário contato → aparece no painel (+ e-mail se SMTP)
- [ ] `GET /api/health` → `ok: true`

**Critério de aceite Fase 1:** checklist secção 23 do `QUESTIONARIO-CLIENTE-RESUMO.md` marcado nos itens técnicos.

---

## FASE 2 — Conteúdo e operação (P0/P1) · ~1–2 semanas

**Meta:** site com cara da associação real; equipa sabe o que fazer no dia a dia.

### 2.1 Cliente preenche questionário resumido

Enviar: `docs/QUESTIONARIO-CLIENTE-RESUMO.md`

**Mínimo obrigatório:**

1. Nome, história, missão, visão, 3 objetivos  
2. E-mail, telefone, WhatsApp, redes  
3. Banner homepage (título + subtítulo)  
4. Chave PIX + titular  
5. 2 eventos ou 2 notícias com texto e datas  
6. Quem recebe formulários e quem mantém o site  

### 2.2 Você (ou editor) carrega no painel

| Secção painel | Origem |
|---------------|--------|
| Institucional | Questionário sec. 2–4 |
| Eventos / Notícias | Questionário sec. 5 |
| Patrocinadores | Se houver logos |
| Galeria | Pasta de fotos (remover imagem quebrada) |
| Documentos | PDFs (estatuto, atas) — classificar público/membros |
| Membros | Lista inicial (se área de membros no lançamento) |

### 2.3 Ajustes em código (conteúdo fixo hoje)

| Item | Onde | Esforço |
|------|------|---------|
| Banner homepage | `index.html` ou **tornar editável** (Fase 3) | 2–4 h |
| Textos voluntariado | `voluntariado.html` ou painel | 2–4 h |
| Nome no header | `partials/site-header.html` | 15 min |
| Favicon / meta SEO | `index.html`, `seo-meta.js` | 1 h |

### 2.4 Processos operacionais (documento para o cliente)

Criar **1 página “Manual da associação”** (pode ser PDF ou secção no painel):

1. Quem responde contato em até X horas  
2. Fluxo de doação: pedido → confirma PIX → marca lido → agradece  
3. Quem publica evento/notícia  
4. Backup mensal: export JSON no painel  
5. Quem chama suporte técnico  

**Critério de aceite Fase 2:** visitante anônimo vê zero dados fictícios; diretoria sabe o fluxo sem ligar para você.

---

## FASE 3 — Polimento profissional (P1/P2) · ~1–2 semanas código

**Meta:** produto que parece “feito por agência”, não “projeto de familiar”.

### 3.1 Editável no painel (alto impacto)

| # | Feature | Porquê |
|---|---------|--------|
| P3.1 | **Homepage hero** (título, subtítulo, botões, imagem) em `institutional` ou chave `homepage` | Cliente não depende de você para mudar frase de campanha |
| P3.2 | **Voluntariado** (intro + 3 cartões + lista) no painel | Mesmo motivo |
| P3.3 | **Assuntos do formulário contato** configuráveis | Flexível sem deploy |

**Esforço estimado:** 1–2 dias cada; ~1 semana total com testes.

### 3.2 Robustez de dados

| # | Item | Esforço |
|---|------|---------|
| P3.4 | Inscrição atómica (lock/transação no Postgres) | 1 dia |
| P3.5 | Senha mín. 8 chars + validação servidor (admin/membro) | 4 h |
| P3.6 | Validação centralizada em `PUT /api/state/:key` (eventos, membros…) | 2–3 dias |
| P3.7 | Impedir último admin (se ainda não 100%) + testes permissão editor | 4 h |

### 3.3 UX e confiança

| # | Item |
|---|------|
| P3.8 | Estados vazios bonitos (“Ainda não há eventos — volte em breve”) |
| P3.9 | Confirmações antes de “limpar lista” / excluir no painel |
| P3.10 | Mensagens pós-inscrição e pós-doação mais claras |
| P3.11 | Corrigir imagem quebrada galeria + auditar links 404 |

### 3.4 SEO e performance (quick wins)

| # | Item |
|---|------|
| P3.12 | `SITE_PUBLIC_URL` no sitemap (já dinâmico — validar URLs) |
| P3.13 | Meta OG em evento/notícia (já parcial — revisar) |
| P3.14 | Lazy loading imagens galeria + compressão no upload |
| P3.15 | Lighthouse mobile ≥ 80 performance / ≥ 90 acessibilidade |

### 3.5 Testes

| # | Item |
|---|------|
| P3.16 | E2E: login admin + criar evento + ver no site |
| P3.17 | E2E: login membro + ver documento permitido |
| P3.18 | Testes: editor não vê `/api/full` restrito; bootstrap membro |

**Critério de aceite Fase 3:** cliente altera banner e voluntariado sozinho; inscrição na última vaga nunca duplica; Lighthouse sem alertas graves.

---

## FASE 4 — Confiança e negócio (P1) · ~3–5 dias

**Meta:** entrega profissional + receita recorrente possível.

### 4.1 Pacote de entrega ao cliente

Entregar pasta/ZIP ou e-mail com:

1. URL do site + URL admin  
2. Credenciais (gestor de senhas)  
3. `QUESTIONARIO-CLIENTE-RESUMO.md` preenchido (arquivo)  
4. Manual operacional (sec. 2.4)  
5. `FASE-C-GUIA.md` resumido em 1 página  
6. Contacto seu para suporte (e-mail/WhatsApp)  

### 4.2 Monitorização

- [ ] UptimeRobot (ou similar) em `/api/health` — alerta e-mail/SMS  
- [ ] Calendário: backup mensal Postgres (Railway) + export JSON  
- [ ] Revisão trimestral: dependências `npm audit`, Node LTS  

### 4.3 Domínio próprio (se aplicável)

- [ ] Domínio registado (`.org.br` recomendado para associação)  
- [ ] DNS → Railway (CNAME)  
- [ ] `SITE_PUBLIC_URL` atualizado  
- [ ] HTTPS automático Railway  

### 4.4 Modelo comercial sugerido

| Serviço | O que inclui | Faixa indicativa* |
|---------|--------------|-------------------|
| **Entrega** | Fases 1–3 + conteúdo inicial | Projeto fechado |
| **Suporte mensal** | Atualizações menores, monitorização, 1h consultoria | Recorrente |
| **Evolução** | Analytics, pagamento online, app | Projeto à parte |

\*Valores dependem do mercado local — o importante é **não entregar sem suporte opcional**.

**Critério de aceite Fase 4:** cliente assina “site entregue”; você tem monitorização e processo de backup documentado.

---

## FASE 5 — Crescimento (P2/P3) · quando houver demanda

Só depois do lançamento estável:

| Feature | Valor para a associação | Esforço |
|---------|-------------------------|---------|
| Google Analytics / Plausible | Saber visitas | 4 h |
| Mercado Pago / PIX automático | Doações sem trabalho manual | 1–2 semanas |
| Prerender / SSR páginas detalhe | SEO Google forte | 1 semana |
| Tabelas SQL para inscrições/membros | Escala + relatórios | 2–3 semanas |
| Newsletter (Mailchimp/Brevo) | Comunicação | Integração média |
| PWA / “adicionar ao ecrã” | Mobile | 2–3 dias |

---

## 4. Priorização — se tiver pouco tempo

Faça **nesta ordem** (não pule):

```
1. Railway + JWT + Postgres + uploads persistentes
2. SMTP + Turnstile
3. Contas reais (sem demo)
4. Conteúdo real (questionário resumido)
5. Hero + voluntariado editáveis no painel
6. Inscrição atómica + senhas mais fortes
7. E2E admin + manual para cliente
8. Domínio + monitorização
9. SEO / performance
10. Pagamento online (só se cliente pedir)
```

---

## 5. Definition of Done

### Lançamento (MVP profissional) ✅

- [ ] Produção Railway estável 7 dias sem incidente  
- [ ] Zero placeholders visíveis  
- [ ] SMTP + Turnstile ativos  
- [ ] Uploads sobrevivem redeploy  
- [ ] 2+ conteúdos publicados (evento/notícia)  
- [ ] Cliente treinado 1h no painel  
- [ ] Manual operacional entregue  
- [ ] `npm test` + CI verde  

### Produto “premium” ⭐

- [ ] Hero e voluntariado no painel  
- [ ] Inscrições concorrentes seguras  
- [ ] E2E fluxos críticos  
- [ ] Lighthouse mobile aceitável  
- [ ] Domínio próprio  
- [ ] Monitorização + backup testado  
- [ ] Contrato de suporte oferecido  

---

## 6. Riscos e mitigação

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Cliente não envia conteúdo | Atraso | Questionário resumido + prazo + conteúdo mínimo contratual |
| Uploads perdidos no redeploy | Alto | S3/R2 ou volume **antes** de go-live |
| Sem SMTP | Médio | Treinar painel; SMTP na semana 1 |
| Associado não usa área membros | Baixo | Lançar só público; membros fase 2 |
| Scope creep (pagamentos, app…) | Médio | Fase 5 separada; orçamento à parte |

---

## 7. Calendário exemplo (4 semanas)

| Semana | Você | Cliente |
|--------|------|---------|
| **1** | Fase 1 Railway + SMTP + S3; corrigir imagem quebrada | Preenche questionário resumido |
| **2** | Fase 3.1 hero/voluntariado no painel; P3.4–P3.7 | Envia logos, fotos, PDFs |
| **3** | Carrega conteúdo; Fase 3 UX/SEO; E2E | Revisa site staging; treino 1h |
| **4** | Domínio; monitorização; pacote entrega Fase 4 | Aprova go-live; assina suporte (opcional) |

---

## 8. Próximo passo imediato (hoje)

1. Correr `npm run check:production` com variáveis Railway de staging.  
2. Enviar ao cliente `QUESTIONARIO-CLIENTE-RESUMO.md` com prazo de 7 dias.  
3. Abrir issue/tarefa **P3.1** (hero editável no painel) — maior ROI pós-lançamento.  
4. Configurar R2 ou volume Railway **antes** de pedir fotos ao cliente.  

---

*Plano mestre — julho 2026 · Betim Cor Brazil*  
*Atualizar este ficheiro quando Fase 1–4 estiverem concluídas.*
