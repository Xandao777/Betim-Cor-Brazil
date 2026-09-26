# Fase 8 — Prontidão para lançamento

Concluída em 26/09/2026 na branch `codex/correcoes-pre-producao`.

Esta fase fecha o que pode ser garantido automaticamente pelo código e separa os bloqueios que exigem configuração, conteúdo real ou decisão do responsável.

## Entregas automáticas

- A integração contínua agora executa também nas branches `codex/**`.
- Execuções repetidas da mesma branch cancelam a anterior para evitar consumo desnecessário.
- O CI verifica segredos versionados antes dos testes.
- O CI executa auditoria de dependências de produção com severidade alta.
- `npm run finalize` inclui verificação de segredos, lint, Jest e Playwright.
- A checagem de produção passou a exigir Turnstile entre os itens recomendados.
- O checklist pós-deploy agora valida:
  - saúde do banco;
  - configuração pública;
  - API pública;
  - páginas principais e login;
  - CSP e headers de segurança;
  - cache de assets;
  - sitemap com URLs absolutas;
  - SEO de detalhe renderizado no servidor.
- O status operacional reconhece corretamente volume Railway e S3 como armazenamento persistente.
- Foi corrigida a leitura dinâmica do pool PostgreSQL pelo health check após a inicialização do servidor.

## Estado verificado da homologação

- PostgreSQL: conectado; os logs confirmam inicialização e tabela `app_state` pronta.
- SMTP: ativo.
- Turnstile: ativo.
- Conteúdo público: existem eventos, notícia, post, galeria e patrocinadores.
- SITE_PUBLIC_URL: configurado.
- Uploads: ainda utilizam o disco efêmero do contentor.
- Telefone institucional: ainda está com valor de exemplo.
- Chave PIX: ainda não configurada.

## Bloqueios externos para lançamento definitivo

1. Configurar um volume no serviço da aplicação ou armazenamento S3/R2 para `/uploads`.
2. Substituir telefone e demais dados institucionais de exemplo.
3. Informar chave e titular PIX, se doações forem disponibilizadas.
4. Trocar/remover contas e senhas demonstrativas pelo painel.
5. Definir domínio próprio, caso o endereço Railway não seja o endereço final.
6. Treinar o responsável e obter aprovação formal do conteúdo.
7. Observar a produção por sete dias sem incidentes antes de considerar o lançamento estabilizado.

Criar volume, contratar armazenamento, registrar domínio e assinar monitoramento podem gerar cobrança e não devem ser ativados automaticamente sem aprovação do responsável.

## Validação local

- Verificação de segredos aprovada.
- ESLint aprovado.
- 16 suítes Jest e 107 testes aprovados antes do commit.
- 7 testes Playwright aprovados.
