# Railway — configuração rápida (copiar e colar)

Passos para fechar a **Fase 1** do plano de finalização. Execute na ordem.

## 1. Gerar JWT_SECRET

No seu computador, na pasta do projeto:

```bash
npm run generate:jwt-secret
```

Copie o valor gerado.

## 2. Variáveis no Railway (serviço Node)

No painel Railway → serviço web → **Variables**:

| Variável | Valor |
|----------|--------|
| `DATABASE_URL` | Referência ao Postgres do projeto (`${{Postgres.DATABASE_URL}}`) |
| `JWT_SECRET` | Valor gerado no passo 1 |
| `NODE_ENV` | `production` |
| `SITE_PUBLIC_URL` | `https://betim-cor-brazil-production.up.railway.app` (ou domínio final) |
| `UPLOADS_USE_VOLUME` | `1` (se montou volume em `/uploads`) |

**Opcional mas recomendado:**

| Variável | Função |
|----------|--------|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_NOTIFY_TO` | E-mails dos formulários |
| `SMTP_AUTO_REPLY_CONTATO`, `SMTP_AUTO_REPLY_DOACAO`, `SMTP_AUTO_REPLY_INSCRICAO` | `1` para auto-respostas |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | CAPTCHA Cloudflare |
| `S3_BUCKET`, `S3_*` | Uploads persistentes (alternativa ao volume) |

**Não definir** `ALLOW_DEMO_SEED=1` em produção após criar contas reais.

## 3. Volume de uploads

Railway → serviço Node → **Volumes** → montar em `/uploads`.

Sem volume ou S3, imagens e PDFs perdem-se no redeploy.

## 4. Verificar deploy

Após deploy:

```bash
curl https://SEU-DOMINIO/api/health
```

Deve retornar `"ok": true`.

Localmente (simular produção):

```bash
CHECK_PRODUCTION=1 DATABASE_URL=... JWT_SECRET=... NODE_ENV=production npm run check:production
```

## 5. Primeiro acesso admin

1. Se base vazia: login temporário com seed **só na primeira vez** (`ALLOW_DEMO_SEED=1` uma vez) ou criar admin via API.
2. Painel → **Utilizadores admin** → criar conta real.
3. **Minha conta** → alterar senha (mín. 8 caracteres).
4. Remover utilizadores `admin` / `editor` demo.
5. Desativar `ALLOW_DEMO_SEED`.

## 6. Conteúdo

1. Enviar `docs/QUESTIONARIO-CLIENTE-RESUMO.md` ao cliente.
2. Preencher **Conteúdo institucional** no painel (banner, PIX, contacto).
3. Publicar 2 eventos ou 2 notícias.
4. Teste SMTP no dashboard.

## 7. Entrega

Enviar ao cliente:

- URLs + credenciais (gestor de senhas)
- `docs/MANUAL-ASSOCIACAO.md`
- Questionário preenchido (arquivo)

---

Ver também: [FASE-C-GUIA.md](./FASE-C-GUIA.md), [RAILWAY-CHECKLIST.md](./RAILWAY-CHECKLIST.md).
