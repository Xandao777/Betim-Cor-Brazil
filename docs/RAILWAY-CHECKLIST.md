# Checklist Railway — Betim Cor Brazil

Use ao configurar ou rever o deploy em [Railway](https://railway.app).

## Serviço Web (Node)

| Variável | Obrigatório | Exemplo / notas |
|----------|-------------|-----------------|
| `DATABASE_URL` | Sim (produção) | Referência ao plugin Postgres do projeto |
| `JWT_SECRET` | Sim | String aleatória com **≥ 16** caracteres |
| `NODE_ENV` | Sim | `production` |
| `SITE_PUBLIC_URL` | Recomendado | `https://betim-cor-brazil-production.up.railway.app` (sem barra final) |
| `ALLOW_DEMO_SEED` | Não em produção | `0` ou omitir — não criar contas demo |

## SMTP (e-mails)

| Variável | Notas |
|----------|--------|
| `SMTP_HOST` | Ex.: `smtp.gmail.com`, SendGrid, etc. |
| `SMTP_PORT` | `587` (STARTTLS) ou `465` (SSL) |
| `SMTP_USER` / `SMTP_PASS` | Credenciais ou app password |
| `SMTP_FROM` | Remetente visível |
| `SMTP_NOTIFY_TO` | E-mails da diretoria (vírgula) |
| `SMTP_AUTO_REPLY_CONTATO` | `1` para confirmação ao visitante |
| `SMTP_AUTO_REPLY_DOACAO` | `1` para confirmação ao doador |
| `SMTP_AUTO_REPLY_INSCRICAO` | `1` para comprovante ao inscrito |

**Teste:** enviar formulário de contato em produção e verificar caixa de entrada.

## CAPTCHA (opcional)

| Variável | Notas |
|----------|--------|
| `TURNSTILE_SITE_KEY` | Painel Cloudflare Turnstile |
| `TURNSTILE_SECRET_KEY` | Par secret do site |

Sem estas variáveis, os formulários funcionam sem widget.

## Uploads persistentes

Escolher **uma** opção:

1. **Volume Railway** montado em `/uploads` no serviço web  
2. **S3 / Cloudflare R2:** `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL_BASE`, etc. (ver `.env.example`)

Sem isto, imagens e PDF podem **perder-se** após redeploy.

## Rede e domínio

- Gerar domínio Railway ou ligar domínio próprio  
- HTTPS é automático no Railway  

## Após o deploy

- [ ] Abrir `/` e `/admin/`  
- [ ] Login admin com conta real (não demo)  
- [ ] Gravar conteúdo institucional (PIX, redes, contacto)  
- [ ] Testar inscrição em evento + e-mail  
- [ ] Download backup JSON no painel (admin)  
- [ ] Confirmar `GET /api/health` → `{"ok":true}`  

## Monitorização (opcional)

- UptimeRobot ou similar em `https://SEU-DOMINIO/api/health`  
- Alertas Railway no serviço Postgres  

*Maio de 2026*
