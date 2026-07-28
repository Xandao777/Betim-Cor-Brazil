# Manual da associação — Site Betim Cor Brazil

Guia operacional para a diretoria manter o site no dia a dia (sem depender do desenvolvedor para tarefas rotineiras).

---

## Acesso

| O quê | URL |
|-------|-----|
| Site público | `https://SEU-DOMINIO/` |
| Painel admin | `https://SEU-DOMINIO/admin/` |

**Perfis:**

- **Administrador** — tudo (membros, documentos, institucional, utilizadores)
- **Editor** — eventos, notícias, blog, galeria, patrocinadores

---

## Rotina semanal (sugestão)

1. Verificar **Formulários recebidos** no painel (contato, doações, mensagens de membros)
2. Responder em até **48 horas** (ajustem o prazo internamente)
3. Publicar ou atualizar **eventos** e **notícias** se houver novidade
4. Marcar pedidos como **lidos** após tratar

---

## Fluxos importantes

### Contato (formulário público)

1. Visitante envia em **Contato**
2. Mensagem aparece no painel → **Formulários** → Contato
3. Se SMTP estiver configurado, a diretoria recebe e-mail
4. Responder manualmente ao visitante (o site não envia resposta automática de contato, salvo se `SMTP_AUTO_REPLY_CONTATO=1`)

### Doações (PIX)

1. Visitante regista intenção em **Doar** (não é pagamento automático)
2. Pedido aparece no painel → **Doações**
3. Visitante paga PIX manualmente (chave configurada em **Institucional**)
4. Diretoria confirma no banco → marca como **lida** no painel → agradece por e-mail/WhatsApp

### Inscrições em eventos

1. Visitante ou associado inscreve-se na página do evento
2. Lista em **Inscrições** no painel
3. E-mail de confirmação ao inscrito se `SMTP_AUTO_REPLY_INSCRICAO=1`

### Voluntariado (área de membros)

1. Associado logado envia formulário em **Área de membros**
2. Mensagem em **Formulários** → Área de membros
3. Responsável contacta o voluntário

---

## Conteúdo editável no painel

| Secção | O que alterar |
|--------|----------------|
| **Conteúdo institucional** | Banner homepage, história, missão, PIX, voluntariado, assuntos do contato |
| **Eventos** | Calendário, vagas, inscrições, destaque na homepage |
| **Notícias** | Comunicados; marcar **destaque** para homepage |
| **Galeria** | Fotos e vídeos |
| **Membros** | Contas da área de associados |
| **Documentos** | PDFs (público / só membros / admin) |

Textos da homepage (banner) e da página **Voluntariado** estão em **Conteúdo institucional** — não é preciso pedir alteração ao programador.

---

## Backup

**Mensal (recomendado):**

1. Login admin → **Dashboard** → exportar backup JSON (se disponível) ou pedir export à equipa técnica
2. No Railway: backup automático do Postgres (plano do Railway)

**Antes de alterações grandes:** exportar backup no painel.

---

## Segurança

- Use senhas com **mínimo 8 caracteres**
- Não partilhe login admin por WhatsApp em grupo
- Remova utilizadores `admin` / `editor` de demonstração em produção
- Troque senhas se alguém sair da diretoria

---

## Problemas comuns

| Sintoma | O que fazer |
|---------|-------------|
| Formulário enviado mas ninguém recebe e-mail | Verificar SMTP no Railway; usar teste no painel |
| Imagem sumiu após atualização do servidor | Configurar volume `/uploads` ou S3/R2 |
| “Conflito” ao guardar no painel | Atualizar a página (F5) e gravar de novo |
| Site lento ou fora do ar | Verificar `https://SEU-DOMINIO/api/health` — contactar suporte técnico |

---

## Suporte técnico

Documentação técnica: `docs/FASE-C-GUIA.md`, `docs/RAILWAY-CHECKLIST.md`.

Checklist de lançamento: `docs/QUESTIONARIO-CLIENTE-RESUMO.md`.

---

*Betim Cor Brazil — manual operacional*
