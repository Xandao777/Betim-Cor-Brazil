# Fase C — Produção e conteúdo real

Guia para a equipa configurar o site no **Railway** e no **painel admin**. O código já inclui checklist no dashboard e teste de SMTP.

## 1. Variáveis no Railway (C1)

Copie de `.env.example`. Resumo:

| Prioridade | Variáveis |
|------------|-----------|
| Obrigatório | `DATABASE_URL`, `JWT_SECRET` (≥16 chars), `NODE_ENV=production` |
| Recomendado | `SITE_PUBLIC_URL` (URL pública, sem `/` final) |
| SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_NOTIFY_TO` |
| Auto-respostas | `SMTP_AUTO_REPLY_CONTATO=1`, `SMTP_AUTO_REPLY_DOACAO=1`, `SMTP_AUTO_REPLY_INSCRICAO=1` |
| CAPTCHA | `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` |
| Uploads | Volume em `/uploads` **ou** `S3_*` (R2/S3) |

**Não use** `ALLOW_DEMO_SEED=1` em produção após criar contas reais.

Ver também: [RAILWAY-CHECKLIST.md](./RAILWAY-CHECKLIST.md).

### Testar SMTP no painel

1. Login como **admin** (perfil administrador).
2. Dashboard → **Configuração de produção** → **Enviar e-mail de teste SMTP**.
3. O e-mail vai para `SMTP_NOTIFY_TO` ou para o e-mail institucional do painel.

### Uploads persistentes

- **Opção A:** Volume Railway montado em `/uploads` no serviço Node.
- **Opção B:** Cloudflare R2 ou S3 (`S3_BUCKET`, chaves, `S3_PUBLIC_URL_BASE`).

Sem isto, imagens da galeria e PDF podem desaparecer após redeploy.

## 2. Contas e conteúdo (C2)

### Senhas

1. Criar utilizadores admin reais no painel (**Utilizadores admin**).
2. Alterar senha em **Minha conta** (admin logado).
3. Remover ou alterar senhas dos utilizadores `admin` / `editor` de demo, se ainda existirem.

O dashboard avisa se utilizadores demo ainda estão presentes.

### Conteúdo institucional

No painel → **Institucional**:

- E-mail e telefone reais
- Redes sociais (Facebook, Instagram, YouTube)
- **Chave PIX**, titular e URL do QR (opcional)
- História, missão, visão (texto da associação)

O checklist no dashboard marca o que ainda falta.

### Conteúdo editorial

- Eventos, notícias, blog, galeria, patrocinadores
- Documentos (atas, estatuto) com PDF enviados pelo painel

## 3. Pagamento online (C3 — opcional)

O site **não integra** gateway (Stripe, Mercado Pago, etc.). Doações:

1. Visitante regista intenção no formulário.
2. Associação recebe notificação (SMTP) e vê o pedido no painel.
3. Pagamento real é por **PIX** (chave no painel + página **Doar**).

Se no futuro quiserem pagamento com cartão, será um projeto à parte (nova API + conformidade PCI).

## 4. Verificação local

```bash
npm run check:production
```

Lista variáveis em falta quando `NODE_ENV=production` (ou `CHECK_PRODUCTION=1`).

## 5. Após configurar

- [ ] `GET /api/health` → `ok: true`, `smtp: true` (se SMTP ativo)
- [ ] Teste SMTP no painel
- [ ] Formulário de contato em produção
- [ ] Inscrição em evento + e-mail (se `SMTP_AUTO_REPLY_INSCRICAO=1`)
- [ ] Página **Doar** mostra chave PIX
- [ ] Backup JSON no painel
- [ ] Turnstile visível nos formulários (se chaves definidas)

*Maio de 2026*
