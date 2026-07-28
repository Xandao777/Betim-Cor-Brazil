# Plano completo de melhorias - Betim Cor Brazil

Revisao consolidada em 28/07/2026, baseada na analise atual do sistema, nos testes automatizados e nos documentos existentes em `docs/`.

Este plano substitui a leitura isolada de `MELHORIAS.md` como referencia principal, porque alguns itens antigos ja foram implementados. A ideia aqui e organizar o que ainda precisa ser feito em ordem pratica: primeiro seguranca e producao, depois confiabilidade, experiencia, crescimento e manutencao.

## 1. Diagnostico executivo

O sistema esta funcional e bem avancado para uma associacao pequena ou media. Ele possui:

- Site publico com paginas institucionais, eventos, noticias, blog, galeria, contato, voluntariado, doacao e area de membros.
- Backend Express com API REST.
- Painel administrativo com gestao de conteudo, membros, documentos, inscricoes, formularios, patrocinadores e usuarios do painel.
- Autenticacao com JWT em cookie HttpOnly.
- Senhas com bcrypt.
- Persistencia em PostgreSQL quando `DATABASE_URL` existe, ou arquivo local em desenvolvimento.
- Upload local ou S3/R2 opcional.
- SMTP opcional.
- Cloudflare Turnstile opcional.
- Testes Jest/Supertest, lint e smoke test Playwright.

Resultado dos checks executados:

- `npm test`: passou, 61 testes.
- `npm run lint`: passou sem erros nem avisos.
- `npm run test:e2e`: passou e encerrou corretamente.
- Navegacao nas paginas principais: paginas responderam 200.
- Checklist de producao local: faltam variaveis obrigatorias e recomendadas.
- Conteudo quebrado: existe uma imagem de galeria apontando para arquivo ausente em `/uploads/gallery/1775948151070-App_de_Lista_de_Metas_Pessoais.drawio.png`.

Implementado nesta primeira leva:

- Editor deixou de receber dados restritos em `/api/full` e ficou limitado a conteudos editoriais.
- Area de membros passou a receber apenas dados publicados/visiveis e dados da propria conta.
- Documentos locais em `uploads/documents/` passaram a exigir sessao e permissao antes do download.
- Falha de banco em producao agora bloqueia a subida do servidor em vez de cair para arquivo local.
- Salvamento de usuarios do painel passou a validar dados, impedir logins duplicados e exigir ao menos um admin.
- Smoke E2E ganhou runner proprio para encerrar corretamente.

Conclusao: o sistema esta melhor protegido e mais estavel, mas ainda nao deve ir para producao real antes de configurar as variaveis obrigatorias, revisar contas demo, definir estrategia de upload persistente e corrigir o conteudo quebrado.

## 2. Prioridades

| Prioridade | Significado | Deve bloquear go-live? |
|------------|-------------|------------------------|
| P0 | Risco alto de seguranca, perda de dados ou producao quebrada | Sim |
| P1 | Importante para operacao real e confianca dos usuarios | Sim, se fizer parte do uso inicial |
| P2 | Melhoria recomendada de qualidade, UX, manutencao ou escala | Nao necessariamente |
| P3 | Evolucao futura ou recurso desejavel | Nao |

## 3. Fase 0 - Preparacao e limpeza imediata

Objetivo: deixar o projeto coerente antes de mexer nas partes criticas.

| Item | Prioridade | Acao | Criterio de aceite |
|------|------------|------|--------------------|
| Consolidar documentacao | P1 | Usar este arquivo como plano principal e manter os docs antigos apenas como historico/apoio | README ou docs apontam para este plano |
| Corrigir imagem quebrada da galeria | P1 | Remover o registro quebrado ou reenviar o arquivo pelo painel | Home e galeria sem 404 no console |
| Resolver avisos simples do lint | P3 | Renomear `catch (e)` nao usado para `_e` e remover variaveis nao usadas | `npm run lint` sem avisos |
| Investigar timeout do Playwright | P2 | Ver por que `npm run test:e2e` nao encerra mesmo com testes passando | Comando finaliza com exit code 0 |
| Revisar dados locais | P2 | Remover exemplos que nao representam a associacao | Conteudo local coerente para demonstracao |

## 4. Fase 1 - Go-live seguro

Objetivo: impedir vazamento de dados, perda de informacao e configuracao insegura em producao.

### 4.1 Configuracao de producao

| Item | Prioridade | Acao | Criterio de aceite |
|------|------------|------|--------------------|
| `DATABASE_URL` obrigatorio | P0 | Confirmar PostgreSQL no Railway e variavel ligada ao servico web | `npm run check:production` marca `DATABASE_URL` como OK |
| `JWT_SECRET` forte | P0 | Criar segredo longo e unico no Railway | App nao usa segredo padrao |
| `NODE_ENV=production` | P0 | Definir no Railway | Cookies `Secure` e CSP ativos |
| `SITE_PUBLIC_URL` | P1 | Definir URL publica sem barra final | Links de e-mail usam dominio correto |
| Desativar seed demo | P0 | Garantir `ALLOW_DEMO_SEED=0` ou omitido em producao | Painel nao cria `admin/admin123` automaticamente |
| Contas reais | P0 | Criar usuarios reais e remover/trocar contas demo existentes | Nao existem senhas padrao em producao |

### 4.2 Falha de banco em producao

Status apos primeira leva: producao ja bloqueia `DATABASE_URL` ausente e agora tambem encerra o processo se o PostgreSQL falhar na inicializacao. O fallback para arquivo local segue permitido apenas fora de producao.

| Item | Prioridade | Acao | Criterio de aceite |
|------|------------|------|--------------------|
| Falhar rapido em producao | P0 | Em `NODE_ENV=production` ou Railway, se `initDatabase()` falhar, encerrar o processo | Producao nunca inicia em modo arquivo local por acidente |
| Teste automatizado | P1 | Adicionar teste/unit ou script que garanta esse comportamento | Teste cobre fallback permitido em dev e bloqueado em prod |

### 4.3 Permissoes do painel

Status apos primeira leva: o perfil `editor` nao recebe dados restritos em `GET /api/full` e tambem ficou impedido de salvar colecoes fora das secoes editoriais.

| Item | Prioridade | Acao | Criterio de aceite |
|------|------------|------|--------------------|
| Filtrar resposta para editor | P0 | `GET /api/full` deve devolver ao editor somente dados necessarios para suas secoes | Editor nao recebe membros, documentos internos, mensagens sensiveis, doacoes ou usuarios admin |
| Testes de permissao | P0 | Criar testes para admin vs editor em `/api/full` | Testes provam que editor nao ve dados restritos |
| UI coerente | P1 | Painel nao deve tentar renderizar secoes escondidas para editor | Sem erros no console usando conta editor |

### 4.4 Area de membros

Status apos primeira leva: `GET /api/member-bootstrap` agora envia apenas conteudo publicado/visivel, documentos permitidos e dados da propria conta do membro. Ainda vale revisar regras finas por tipo de documento antes do go-live.

| Item | Prioridade | Acao | Criterio de aceite |
|------|------------|------|--------------------|
| Filtrar noticias | P0 | Enviar ao membro apenas noticias publicadas; incluir exclusivas de membros, excluir rascunhos | Membro nao recebe noticia `publicado=false` |
| Filtrar eventos | P1 | Enviar apenas eventos publicados | Membro nao recebe evento rascunho |
| Filtrar documentos | P0/P1 | Enviar apenas documentos `visivel !== false`; decidir se relatorios sao para todos os membros | Membro nao recebe documento oculto |
| Testes de bootstrap | P0 | Cobrir rascunhos e documentos ocultos | Teste falha se dado restrito vazar |

### 4.5 Documentos internos

Status apos primeira leva: arquivos locais em `/uploads/documents` deixaram de ser servidos estaticamente e agora passam por rota com verificacao de sessao e permissao. Se S3/R2 for usado com URL publica, documentos sensiveis ainda precisam de bucket privado ou URLs assinadas.

Decisao ainda necessaria:

- Se documentos forem publicos: manter estatico, mas deixar claro no painel.
- Se documentos forem de membros/admin: proteger rota.

Plano recomendado:

| Item | Prioridade | Acao | Criterio de aceite |
|------|------------|------|--------------------|
| Classificacao de documento | P0 | Adicionar campo de acesso: `publico`, `membros`, `admin` | Painel deixa claro quem pode ver |
| Proteger download | P0 | Trocar `express.static('/uploads/documents')` por rota que valida sessao | Documento interno exige cookie valido |
| S3/R2 privado ou URLs assinadas | P1 | Se usar object storage, evitar URL publica para documentos sensiveis | Documentos internos nao ficam publicos no bucket |
| Testes de download | P0 | Sem sessao deve dar 401/403 para documento interno | Teste cobre visitante, membro e admin |

## 5. Fase 2 - Confiabilidade dos dados

Objetivo: evitar sobrescrita, corrida de vagas, registros invalidos e perda operacional.

### 5.1 Inscricoes e limite de vagas

Problema atual: a validacao de vagas e feita antes de salvar, mas duas inscricoes simultaneas podem passar juntas.

| Item | Prioridade | Acao | Criterio de aceite |
|------|------------|------|--------------------|
| Operacao atomica de inscricao | P1 | No PostgreSQL, salvar inscricao com lock/transacao ou migrar inscricoes para tabela propria | Nao e possivel passar do limite de vagas sob concorrencia |
| Indice de duplicidade | P1 | Para tabela dedicada, criar unicidade por evento+email e evento+membro | Duplicatas bloqueadas no banco |
| Teste concorrente | P1 | Simular duas inscricoes para ultima vaga | Apenas uma passa |

### 5.2 Salvamento do painel

O sistema ja usa `If-Match` nos salvamentos do painel, inclusive no salvamento de `admin_users` apos a primeira leva.

| Item | Prioridade | Acao | Criterio de aceite |
|------|------------|------|--------------------|
| Unificar salvamento de usuarios admin | P1 | Criar `DadosSite.setAdminUsers()` usando `putKey()` com ETag, ou expor metodo seguro equivalente | `admin_users` tambem usa `If-Match` |
| Teste de conflito | P1 | Cobrir `PUT /api/state/admin_users` com `If-Match` invalido | API responde 409 |
| Mensagem amigavel | P2 | Mostrar aviso de conflito e atualizar dados | Admin entende que precisa revisar |

### 5.3 Validacao de dados no servidor

Hoje parte dos dados salvos pelo painel entra em arrays completos sem schema forte.

| Entidade | Prioridade | Validacoes recomendadas |
|----------|------------|-------------------------|
| Eventos | P1 | `id`, titulo obrigatorio, data valida, vagas numerica, booleanos coerentes |
| Noticias/blog | P1 | titulo, resumo, data, publicado, conteudo sanitizado |
| Galeria | P1 | tipo permitido, URL segura, alt text para imagem |
| Documentos | P1 | titulo, categoria permitida, acesso/visibilidade, URL/arquivo seguro |
| Membros | P1 | usuario unico, email valido quando houver, ativo booleano, senha forte em criacao |
| Admin users | P0 | perfil permitido, usuario unico, impedir remover ultimo admin |
| Institucional | P1 | email, URLs sociais, PIX, limites de tamanho |

Acao recomendada: criar um modulo de validacao centralizado, com schemas simples. Pode ser manual ou com biblioteca como Zod/Joi. Como o projeto ja e CommonJS e simples, comecar manualmente e aceitavel.

## 6. Fase 3 - Anti-abuso e seguranca web

Objetivo: reduzir spam, XSS, abuso de login e problemas de conteudo externo.

| Item | Prioridade | Acao | Criterio de aceite |
|------|------------|------|--------------------|
| Ativar Turnstile em producao | P1 | Configurar `TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY` | Formularios publicos exigem CAPTCHA |
| Rever limites de rate limit | P1 | Ajustar limites apos trafego real | Sem bloqueio indevido de usuarios legitimos |
| Senhas mais fortes | P1 | Exigir minimo melhor que 6 caracteres para novas senhas | Senhas fracas rejeitadas em criacao/troca |
| Bloqueio de login por usuario | P2 | Alem do IP, limitar tentativas por usuario | Ataques distribuidos ficam mais dificeis |
| Normalizar URLs | P1 | Permitir somente `http`, `https`, `mailto` quando aplicavel | Campos de URL nao aceitam `javascript:` |
| CSP em producao | P1 | Confirmar `NODE_ENV=production` e revisar CSP conforme integracoes reais | Sem bloqueios indevidos e sem CSP desativada |
| Headers extras | P2 | Adicionar `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` | Headers aparecem nas respostas |

## 7. Fase 4 - Operacao, backups e monitoramento

Objetivo: conseguir operar o site sem depender de sorte.

| Item | Prioridade | Acao | Criterio de aceite |
|------|------------|------|--------------------|
| Backup operacional | P1 | Definir rotina: backup JSON pelo painel + backup do Postgres Railway | Processo documentado e testado |
| Restore testado | P1 | Criar procedimento para restaurar backup em staging | Restauracao validada sem improviso |
| Monitoramento de health | P1 | UptimeRobot/Railway alert em `/api/health` | Responsaveis recebem alerta |
| Logs uteis | P2 | Padronizar logs de erro, SMTP, upload e auth sem expor segredo | Erros sao rastreaveis |
| Ambiente staging | P2 | Separar staging e producao com bases diferentes | Testes manuais nao mexem no site real |
| Checklist pos-deploy | P1 | Rodar roteiro apos cada deploy | Formularios, login, uploads e emails conferidos |

## 8. Fase 5 - Experiencia do usuario

Objetivo: melhorar clareza, acessibilidade e confianca de visitantes, membros e administradores.

### 8.1 Site publico

| Item | Prioridade | Acao | Criterio de aceite |
|------|------------|------|--------------------|
| Conteudo real | P0 | Trocar textos, eventos, noticias, patrocinadores e dados institucionais de exemplo | Site nao mostra dados ficticios |
| Imagens reais | P1 | Substituir placeholders por fotos/logos corretos | Primeira dobra comunica a associacao real |
| Estados vazios melhores | P2 | Mensagens mais cuidadosas quando nao ha eventos/noticias/galeria | Paginas vazias parecem intencionais |
| Fluxo de inscricao | P2 | Melhorar mensagens de sucesso/erro e comprovante | Usuario entende o que aconteceu |
| Doacao | P1 | Deixar claro que e intencao/PIX, nao pagamento automatico | Doador nao espera gateway inexistente |

### 8.2 Area de membros

| Item | Prioridade | Acao | Criterio de aceite |
|------|------------|------|--------------------|
| Perfil | P2 | Validar email/telefone no servidor | Dados salvos ficam padronizados |
| Troca de senha | P1 | Ja existe rota; revisar UX e politica de senha | Membro consegue trocar senha com seguranca |
| Recuperacao de senha | P1 | Depende de SMTP; testar fluxo real | E-mail chega e token expira |
| Documentos | P1 | Mostrar apenas o que o membro pode baixar | Sem documento oculto na resposta da API |

### 8.3 Painel administrativo

| Item | Prioridade | Acao | Criterio de aceite |
|------|------------|------|--------------------|
| Confirmacoes destrutivas | P1 | Confirmar limpar listas, excluir conteudo e usuarios | Nao ha perda acidental facil |
| Ultimo admin | P0 | Impedir excluir/desativar o ultimo admin ativo | Sempre existe pelo menos um admin |
| Checklist de producao | P1 | Manter painel mostrando pendencias criticas | Admin ve o que falta |
| Busca e filtros | P2 | Refinar pesquisa em formularios, inscricoes e membros | Operacao diaria fica mais rapida |
| Exportacoes | P2 | Padronizar CSV com cabecalhos claros e encoding UTF-8 BOM se necessario | Excel abre corretamente |

## 9. Fase 6 - SEO, desempenho e acessibilidade

| Item | Prioridade | Acao | Criterio de aceite |
|------|------------|------|--------------------|
| SEO de detalhe | P2 | Considerar rotas server-side para evento/noticia/blog com meta tags ja no HTML | Compartilhamento mostra titulo/imagem corretos sem depender de JS |
| Sitemap dinamico | P2 | Ja existe; revisar dominio com `SITE_PUBLIC_URL` | Sitemap final usa URLs absolutas corretas |
| Imagens responsivas | P2 | Criar tamanhos menores e lazy loading onde faltar | Melhor LCP e menos dados no celular |
| Cache de assets | P2 | Definir headers de cache para CSS/JS/imagens com estrategia de invalidacao | Paginas carregam mais rapido |
| Acessibilidade | P2 | Revisar contraste, foco, labels, modal e textos alternativos | Auditoria Lighthouse/axe sem problemas graves |
| HTML renderizado por JS | P3 | Se SEO virar prioridade, usar pre-render/SSR minimo | Conteudo principal indexavel sem JS |

## 10. Fase 7 - Evolucao da arquitetura

Objetivo: preparar o sistema para crescer sem reescrever tudo agora.

| Item | Prioridade | Acao | Quando fazer |
|------|------------|------|--------------|
| Separar rotas por modulos | P2 | Quebrar `server.cjs` em modulos de auth, public, member, admin, forms e uploads | Quando novas rotas ficarem frequentes |
| Persistencia por entidade | P2/P3 | Migrar `members` e `inscricoes` para tabelas dedicadas | Quando houver volume, relatorios ou concorrencia real |
| Auditoria detalhada | P3 | Registrar antes/depois ou diff por entidade | Quando houver varios admins usando diariamente |
| API versionada | P3 | Introduzir `/api/v1` se clientes externos surgirem | Quando integrar app externo |
| Frontend modular | P3 | Usar esbuild ou Vite sem transformar em SPA pesada | Quando scripts globais ficarem dificeis de manter |

## 11. Testes recomendados

### P0/P1 obrigatorios

- Editor nao recebe dados restritos em `/api/full`.
- Membro nao recebe rascunhos/documentos ocultos em `/api/member-bootstrap`.
- Visitante nao baixa documento interno.
- Membro baixa apenas documento permitido.
- Producao nao inicia sem banco.
- Admin nao consegue remover/desativar ultimo admin ativo.
- Inscricoes concorrentes nao ultrapassam vagas.
- Upload rejeita extensao/MIME invalido.
- Conteudo HTML perigoso em noticia/blog continua sanitizado.
- CSRF com Origin errado continua bloqueado.

### P2 recomendados

- Fluxo completo de login admin no Playwright.
- Fluxo completo de login membro no Playwright.
- Criar evento pelo painel e conferir no site publico.
- Criar noticia rascunho e garantir que nao aparece publicamente.
- Formulario de contato com Turnstile ativado e desativado.
- Sitemap inclui evento/noticia/blog publicados.

## 12. Plano de execucao sugerido

### Sprint 1 - Fechar go-live seguro

1. Corrigir imagem quebrada da galeria.
2. Filtrar `/api/full` por perfil.
3. Filtrar `/api/member-bootstrap`.
4. Proteger documentos internos ou decidir formalmente que sao publicos.
5. Fazer producao falhar se o banco nao conectar.
6. Adicionar testes dos pontos acima.

Resultado esperado: sem vazamento obvio de dados e sem risco de rodar producao em arquivo local.

### Sprint 2 - Producao e operacao

1. Configurar Railway: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`, `SITE_PUBLIC_URL`.
2. Configurar SMTP e testar e-mails reais.
3. Configurar Turnstile.
4. Configurar volume Railway ou S3/R2.
5. Criar contas reais e remover senhas demo.
6. Testar backup e restore em ambiente separado.

Resultado esperado: site pronto para uso real com persistencia, emails e upload seguro.

### Sprint 3 - Integridade de dados

1. Resolver concorrencia de inscricoes.
2. Validar schemas no servidor.
3. Corrigir salvamento de `admin_users` com ETag.
4. Impedir ultimo admin de ser removido/desativado.
5. Melhorar politicas de senha.

Resultado esperado: dados mais confiaveis e operacao do painel mais segura.

### Sprint 4 - UX, SEO e acessibilidade

1. Revisar conteudo real e textos de estado vazio.
2. Melhorar fluxo de inscricao/doacao.
3. Revisar contraste, foco e modal.
4. Melhorar imagens responsivas.
5. Avaliar pre-render/SSR minimo para paginas de detalhe.

Resultado esperado: experiencia mais profissional para visitantes e equipe.

### Sprint 5 - Escala e manutencao

1. Separar `server.cjs` em modulos menores.
2. Planejar tabelas dedicadas para membros/inscricoes.
3. Evoluir auditoria.
4. Padronizar logs.
5. Melhorar CI com lint, testes E2E e checagem de segredos.

Resultado esperado: codigo mais facil de manter e preparado para crescimento.

## 13. Checklist minimo antes de colocar no ar

- [ ] `DATABASE_URL` configurado.
- [ ] `JWT_SECRET` forte configurado.
- [ ] `NODE_ENV=production` configurado.
- [ ] `SITE_PUBLIC_URL` configurado.
- [ ] Seed demo desativado.
- [ ] Contas demo removidas ou senhas trocadas.
- [ ] SMTP configurado e testado.
- [ ] Turnstile configurado, se o site estiver publico.
- [ ] Upload persistente configurado.
- [x] Documentos internos locais protegidos ou classificados como publicos.
- [x] Editor nao recebe dados restritos.
- [x] Membro nao recebe rascunhos/documentos ocultos.
- [ ] Conteudo real revisado.
- [ ] Imagem quebrada da galeria corrigida.
- [x] `npm test` passando.
- [x] `npm run lint` sem erros.
- [x] `npm run test:e2e` encerrando corretamente.
- [ ] Backup testado.

## 14. Ordem de impacto

Se houver pouco tempo, fazer nesta ordem:

1. Permissoes e vazamento de dados.
2. Banco obrigatorio em producao.
3. Documentos internos.
4. Configuracao Railway, SMTP, uploads e contas reais.
5. Concorrencia de inscricoes.
6. Validacao server-side.
7. UX e conteudo.
8. SEO, performance e refatoracao.

## 15. Observacao final

O sistema nao precisa ser refeito. Ele precisa de uma rodada de hardening e organizacao para sair de "funcional em desenvolvimento" para "confiavel em producao". O melhor caminho e preservar a arquitetura simples atual, fechar os riscos reais primeiro e evoluir o modelo de dados apenas onde houver necessidade concreta, principalmente membros, inscricoes e documentos.
