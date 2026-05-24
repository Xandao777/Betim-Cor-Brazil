# Melhorias do painel administrativo — Betim Cor Brazil

Plano de evolução do admin para nível profissional, **100% compatível com Railway** (Node + Postgres + SMTP + disco local; sem S3 obrigatório).

**Legenda:** `[x]` implementado · `[ ]` pendente / fase seguinte

---

## 1. Dashboard e navegação

| Item | Estado |
|------|--------|
| [x] Dashboard com cartões clicáveis, atalhos e resumo visual | |
| [x] Contadores de **não lidas** (contato + mensagens membros) | |
| [x] Badges no menu lateral | |
| [x] Lista de **próximos eventos** e **doações pendentes** | |
| [x] Link **Ver site público** e estado da API (`/api/health`) | |
| [x] **Pesquisa global** (eventos, notícias, membros, inscrições) | |
| [x] Gráfico de inscrições por mês (últimos 6 meses) | |

---

## 2. Formulários recebidos

| Item | Estado |
|------|--------|
| [x] Marcar mensagem como **lida / não lida** (contato e área de membros) | |
| [x] Filtro: todas / só não lidas | |
| [x] Destaque visual de linhas não lidas | |
| [x] Exportar **CSV** (contato e doação) | |
| [x] Confirmação antes de **limpar tudo** (com aviso de backup) | |
| [x] Estado da doação (já existia) | |
| [x] **Responder por e-mail** (mailto:) no contato | |

---

## 3. Eventos

| Item | Estado |
|------|--------|
| [x] **Imagem de capa** (upload ou URL) | |
| [x] Coluna **inscritos** na tabela | |
| [x] Botão **Duplicar** evento | |
| [x] Link **Ver no site** | |
| [ ] Reordenar eventos (drag) | |
| [ ] Duplicar inscrições para outro evento | |

---

## 4. Notícias e blog

| Item | Estado |
|------|--------|
| [x] **Capa da notícia** (upload ou URL) | |
| [x] Campo **data de publicação** editável | |
| [x] Duplicar notícia / postagem | |
| [x] Link ver no site | |
| [x] Capa nas listagens e página `noticia.html` | |
| [ ] Editor rich text (fase 2) | |

---

## 5. Galeria, documentos, patrocinadores

| Item | Estado |
|------|--------|
| [x] Upload de **logo** do patrocinador (ficheiro) | |
| [x] Pré-visualização de mídia na tabela da galeria | |
| [x] Ordenar galeria (subir / descer) | |
| [x] **Alt text** obrigatório (acessibilidade) | |

---

## 6. Inscrições

| Item | Estado |
|------|--------|
| [x] Export CSV (já existia) | |
| [x] Pesquisa por nome, e-mail ou evento | |
| [x] Contagem por evento no dashboard | |
| [ ] E-mail em massa aos inscritos (LGPD) | |

---

## 7. Membros e utilizadores do painel

| Item | Estado |
|------|--------|
| [x] Secção **Utilizadores do painel** (só perfil admin) | |
| [x] Criar / editar / desativar admin e editor | |
| [x] **Alterar minha senha** (admin e editor) | |
| [x] Recuperação de senha por e-mail (membros, via SMTP) | |

---

## 8. Sistema e Railway

| Item | Estado |
|------|--------|
| [x] **Backup JSON** (download, sem passwords) | |
| [x] API `POST /api/admin/mark-read` | |
| [x] API `POST /api/admin/change-password` | |
| [x] Toasts e modal de confirmação (sem `alert`) | |
| [x] Indicador SMTP configurado no dashboard | |
| [ ] Volume Railway para `uploads/` (config manual — ver README) | |
| [x] Log de auditoria “quem alterou o quê” | |

---

## 9. UX geral do painel

| Item | Estado |
|------|--------|
| [x] Topbar com utilizador, pesquisa e atalhos | |
| [x] Modal de confirmação acessível | |
| [x] Overlay “A guardar…” em gravações | |
| [x] Menu mobile colapsável (botão Menu + overlay) | |
| [ ] Tema escuro | |

---

## CAPTCHA (site público)

| Item | Estado |
|------|--------|
| [x] Cloudflare Turnstile opcional em contato, doação e inscrição | |
| [ ] Ativar no Railway: `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | |

---

*Atualizado: maio de 2026*
