'use strict';

const fs = require('fs');
const path = require('path');
const request = require('supertest');

describe('API (integração, ficheiro temporário)', function () {
  var app;
  var dataPath;

  beforeAll(function () {
    dataPath = process.env.SITE_DATA_FILE;
    expect(dataPath).toBeTruthy();
    try {
      fs.unlinkSync(dataPath);
    } catch (e) {}
    jest.resetModules();
    delete require.cache[require.resolve('../server.cjs')];
    app = require('../server.cjs').app;
  });

  afterAll(function () {
    try {
      fs.unlinkSync(dataPath);
    } catch (e) {}
  });

  function mutatingHeaders() {
    return {
      Host: '127.0.0.1',
      Origin: 'http://127.0.0.1'
    };
  }

  test('GET /api/health', async function () {
    var res = await request(app).get('/api/health').expect(200);
    expect(res.body.ok).toBe(true);
    expect(['file', 'postgres']).toContain(res.body.backend);
    expect(typeof res.body.smtp).toBe('boolean');
    expect(['disk', 's3']).toContain(res.body.uploads);
  });

  test('GET /index.html serve a partir de public/', async function () {
    var res = await request(app).get('/index.html').expect(200);
    expect(res.text).toMatch(/Betim Cor Brazil|Associação/i);
  });

  test('GET /api/public devolve chaves públicas', async function () {
    var res = await request(app).get('/api/public').expect(200);
    expect(Array.isArray(res.body.events)).toBe(true);
    expect(Array.isArray(res.body.news)).toBe(true);
    expect(res.body.institutional).toBeDefined();
  });

  test('GET /api/public não expõe notícias exclusivoMembros', async function () {
    var res = await request(app).get('/api/public').expect(200);
    var exclusivas = (res.body.news || []).filter(function (n) {
      return n.exclusivoMembros;
    });
    expect(exclusivas.length).toBe(0);
    var titulos = (res.body.news || []).map(function (n) {
      return n.titulo;
    });
    expect(titulos).not.toContain('Assembleia geral – convocação');
  });

  test('GET /api/full sem sessão → 401', async function () {
    await request(app).get('/api/full').expect(401);
  });

  test('POST /api/auth/admin credenciais erradas → 401', async function () {
    await request(app)
      .post('/api/auth/admin')
      .send({ usuario: 'admin', senha: 'errado' })
      .expect(401);
  });

  test('POST /api/auth/admin sucesso + cookie HttpOnly', async function () {
    var res = await request(app)
      .post('/api/auth/admin')
      .send({ usuario: 'admin', senha: 'admin123' })
      .expect(200);
    expect(res.body.usuario).toBe('admin');
    expect(res.body.token).toBeUndefined();
    var setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(setCookie.join(';')).toMatch(/site_admin_session=/);
    expect(setCookie.join(';')).toMatch(/HttpOnly/i);
  });

  test('GET /api/full com sessão admin → dados sem senhas', async function () {
    var agent = request.agent(app);
    await agent.post('/api/auth/admin').send({ usuario: 'admin', senha: 'admin123' }).expect(200);
    var res = await agent.get('/api/full').expect(200);
    expect(Array.isArray(res.body.admin_users)).toBe(true);
    res.body.admin_users.forEach(function (u) {
      expect(u.senha).toBe('');
    });
    res.body.members.forEach(function (m) {
      expect(m.senha).toBe('');
    });
  });

  test('PUT /api/state/events com admin + Origin (CSRF)', async function () {
    var agent = request.agent(app);
    await agent.post('/api/auth/admin').send({ usuario: 'admin', senha: 'admin123' }).expect(200);
    var events = [
      {
        id: 't1',
        titulo: 'Teste API',
        descricao: '',
        data: '2028-06-01',
        inscricoesAtivas: true,
        publicado: true,
        vagas: 10
      }
    ];
    await agent
      .put('/api/state/events')
      .set(mutatingHeaders())
      .send(events)
      .expect(200);
    var pub = await request(app).get('/api/public').expect(200);
    var ev = pub.body.events.find(function (e) {
      return e.id === 't1';
    });
    expect(ev).toBeDefined();
    expect(ev.titulo).toBe('Teste API');
  });

  test('editor não pode PUT members → 403', async function () {
    var agent = request.agent(app);
    await agent.post('/api/auth/admin').send({ usuario: 'editor', senha: 'editor123' }).expect(200);
    await agent
      .put('/api/state/members')
      .set(mutatingHeaders())
      .send([])
      .expect(403);
  });

  test('POST /api/upload/document sem sessão → 401', async function () {
    await request(app)
      .post('/api/upload/document')
      .set(mutatingHeaders())
      .attach('file', Buffer.from('%PDF-1.4'), 'doc.pdf')
      .expect(401);
  });

  test('editor não pode POST /api/upload/document → 403', async function () {
    var agent = request.agent(app);
    await agent.post('/api/auth/admin').send({ usuario: 'editor', senha: 'editor123' }).expect(200);
    await agent
      .post('/api/upload/document')
      .set(mutatingHeaders())
      .attach('file', Buffer.from('%PDF-1.4'), 'doc.pdf')
      .expect(403);
  });

  test('admin pode enviar PDF e ficheiro fica em /uploads/documents/', async function () {
    var agent = request.agent(app);
    await agent.post('/api/auth/admin').send({ usuario: 'admin', senha: 'admin123' }).expect(200);
    var res = await agent
      .post('/api/upload/document')
      .set(mutatingHeaders())
      .attach('file', Buffer.from('%PDF-1.4 test'), 'relatorio-teste.pdf')
      .expect(200);
    expect(res.body.url).toMatch(/^\/uploads\/documents\/.+\.pdf$/);
    var getRes = await request(app).get(res.body.url).expect(200);
    expect(Buffer.isBuffer(getRes.body) || typeof getRes.body === 'string').toBe(true);
  });

  test('POST /api/upload/gallery sem sessão → 401', async function () {
    await request(app)
      .post('/api/upload/gallery')
      .set(mutatingHeaders())
      .attach('file', Buffer.from('fake'), 'foto.png')
      .expect(401);
  });

  test('editor pode enviar imagem para galeria em /uploads/gallery/', async function () {
    var agent = request.agent(app);
    await agent.post('/api/auth/admin').send({ usuario: 'editor', senha: 'editor123' }).expect(200);
    var res = await agent
      .post('/api/upload/gallery')
      .set(mutatingHeaders())
      .attach('file', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'mini.png')
      .expect(200);
    expect(res.body.url).toMatch(/^\/uploads\/gallery\/.+\.png$/);
    await request(app).get(res.body.url).expect(200);
  });

  test('POST /api/auth/member e GET /api/member-bootstrap', async function () {
    var agent = request.agent(app);
    await agent.post('/api/auth/member').send({ usuario: 'membro', senha: 'demo123' }).expect(200);
    var res = await agent.get('/api/member-bootstrap').expect(200);
    expect(res.body.documents).toBeDefined();
    expect(Array.isArray(res.body.members)).toBe(true);
  });

  test('POST /api/inscricao/publica com eventoId', async function () {
    await request(app)
      .post('/api/inscricao/publica')
      .send({ eventoId: 't1', nome: 'Visitante', email: 'v@teste.org', consentimento: true })
      .expect(200);
  });

  test('POST /api/inscricao/publica sem eventoId → 400', async function () {
    await request(app).post('/api/inscricao/publica').send({ nome: 'x' }).expect(400);
  });

  test('POST /api/inscricao/publica duplicada (mesmo e-mail) → 409', async function () {
    var body = { eventoId: 't1', nome: 'Ana', email: 'dup@teste.org', consentimento: true };
    await request(app).post('/api/inscricao/publica').send(body).expect(200);
    var res = await request(app).post('/api/inscricao/publica').send(body);
    expect(res.status).toBe(409);
  });

  test('GET /api/auth/status sem sessão → 200 kind null', async function () {
    var res = await request(app).get('/api/auth/status').expect(200);
    expect(res.body.kind).toBeNull();
  });

  test('GET /robots.txt bloqueia admin', async function () {
    var res = await request(app).get('/robots.txt').expect(200);
    expect(res.text).toMatch(/Disallow: \/admin\//);
  });

  test('POST /api/form/contato grava mensagem', async function () {
    await request(app)
      .post('/api/form/contato')
      .send({ nome: 'Visitante', email: 'v@exemplo.org', assunto: 'duvida', mensagem: 'Olá', consentimento: true })
      .expect(200);
    var agent = request.agent(app);
    await agent.post('/api/auth/admin').send({ usuario: 'admin', senha: 'admin123' }).expect(200);
    var full = await agent.get('/api/full').expect(200);
    expect(Array.isArray(full.body.mensagens_contato)).toBe(true);
    expect(full.body.mensagens_contato.length).toBeGreaterThanOrEqual(1);
    var last = full.body.mensagens_contato[full.body.mensagens_contato.length - 1];
    expect(last.email).toBe('v@exemplo.org');
  });

  test('POST /api/form/contato sem consentimento → 400', async function () {
    await request(app)
      .post('/api/form/contato')
      .send({ nome: 'A', email: 'a@b.co', assunto: 'x', mensagem: 'ok' })
      .expect(400);
  });

  test('POST /api/form/contato sem mensagem → 400', async function () {
    await request(app)
      .post('/api/form/contato')
      .send({ nome: 'A', email: 'a@b.co', assunto: 'x', mensagem: '' })
      .expect(400);
  });

  test('POST /api/form/doacao', async function () {
    await request(app)
      .post('/api/form/doacao')
      .send({ nome: 'Doador', email: 'd@exemplo.org', valor: '50', consentimento: true })
      .expect(200);
  });

  test('POST /api/member/mensagem suporte com sessão', async function () {
    var agent = request.agent(app);
    await agent.post('/api/auth/member').send({ usuario: 'membro', senha: 'demo123' }).expect(200);
    await agent
      .post('/api/member/mensagem')
      .set(mutatingHeaders())
      .send({ tipo: 'suporte', assunto: 'duvida', mensagem: 'Preciso de informação' })
      .expect(200);
  });

  test('GET /api/auth/admin/session sem login → 401', async function () {
    await request(app).get('/api/auth/admin/session').expect(401);
  });

  test('ficheiros sensíveis não são servidos estaticamente', async function () {
    await request(app).get('/data/site-data.json').expect(404);
    await request(app).get('/server.cjs').expect(404);
    await request(app).get('/package.json').expect(404);
    await request(app).get('/docs/').expect(404);
  });

  test('GET /api/admin/backup sem admin → 403', async function () {
    var agent = request.agent(app);
    await agent.post('/api/auth/admin').send({ usuario: 'editor', senha: 'editor123' }).expect(200);
    await agent.get('/api/admin/backup').expect(403);
  });

  test('GET /api/admin/backup com admin', async function () {
    var agent = request.agent(app);
    await agent.post('/api/auth/admin').send({ usuario: 'admin', senha: 'admin123' }).expect(200);
    var res = await agent.get('/api/admin/backup').expect(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.events).toBeDefined();
    expect(res.body.admin_users[0].senha).toBe('');
  });

  test('POST /api/auth/logout-admin limpa sessão', async function () {
    var agent = request.agent(app);
    await agent.post('/api/auth/admin').send({ usuario: 'admin', senha: 'admin123' }).expect(200);
    await agent.post('/api/auth/logout-admin').set(mutatingHeaders()).expect(200);
    await agent.get('/api/full').expect(401);
  });

  test('PUT /api/state/events com If-Match inválido → 409', async function () {
    var agent = request.agent(app);
    await agent.post('/api/auth/admin').send({ usuario: 'admin', senha: 'admin123' }).expect(200);
    var full = await agent.get('/api/full').set(mutatingHeaders()).expect(200);
    var h = mutatingHeaders();
    h['If-Match'] = 'etag-invalido-000000000000';
    await agent
      .put('/api/state/events')
      .set(h)
      .send(full.body.events || [])
      .expect(409);
  });

  test('POST /api/admin/mark-read em pedidos_doacao', async function () {
    var agent = request.agent(app);
    await agent.post('/api/auth/admin').send({ usuario: 'admin', senha: 'admin123' }).expect(200);
    await agent
      .post('/api/form/doacao')
      .send({
        nome: 'Doador Teste',
        email: 'doador@teste.local',
        valor: '50',
        consentimento: true
      })
      .expect(200);
    var full = await agent.get('/api/full').set(mutatingHeaders()).expect(200);
    var list = full.body.pedidos_doacao || [];
    expect(list.length).toBeGreaterThan(0);
    var id = list[list.length - 1].id;
    await agent
      .post('/api/admin/mark-read')
      .set(mutatingHeaders())
      .send({ collection: 'pedidos_doacao', id: id, lida: true })
      .expect(200);
    var full2 = await agent.get('/api/full').set(mutatingHeaders()).expect(200);
    var item = (full2.body.pedidos_doacao || []).find(function (p) {
      return String(p.id) === String(id);
    });
    expect(item.lida).toBe(true);
  });

  test('GET /sitemap.xml dinâmico', async function () {
    var res = await request(app).get('/sitemap.xml').expect(200);
    expect(res.headers['content-type']).toMatch(/xml/);
    expect(res.text).toMatch(/eventos\.html/);
    expect(res.text).toMatch(/urlset/);
  });

  test('GET página inexistente HTML → 404 custom', async function () {
    var res = await request(app).get('/pagina-que-nao-existe-xyz.html').set('Accept', 'text/html').expect(404);
    expect(res.text).toMatch(/não encontrada/i);
  });

  test('GET /partials/site-header.html', async function () {
    var res = await request(app).get('/partials/site-header.html').expect(200);
    expect(res.text).toMatch(/Betim Cor Brazil/);
  });

  test('PUT /api/state/news sanitiza HTML perigoso', async function () {
    var agent = request.agent(app);
    await agent.post('/api/auth/admin').send({ usuario: 'admin', senha: 'admin123' }).expect(200);
    var payload = [
      {
        id: 'news-sanitize-test',
        titulo: 'Teste sanitize',
        resumo: 'Resumo',
        conteudo: '<script>alert(1)</script><p><strong>Ok</strong></p>',
        categoria: 'Geral',
        dataPublicacao: '2025-06-01',
        publicado: true
      }
    ];
    await agent.put('/api/state/news').set(mutatingHeaders()).send(payload).expect(200);
    var pub = await request(app).get('/api/public').expect(200);
    var item = (pub.body.news || []).find(function (n) {
      return n.id === 'news-sanitize-test';
    });
    expect(item).toBeDefined();
    expect(item.conteudo).not.toMatch(/<script/i);
    expect(item.conteudo).toMatch(/<strong>Ok<\/strong>/);
  });

  test('GET /api/admin/audit-log com filtros desde/chave', async function () {
    var agent = request.agent(app);
    await agent.post('/api/auth/admin').send({ usuario: 'admin', senha: 'admin123' }).expect(200);
    var full = await agent.get('/api/full').set(mutatingHeaders()).expect(200);
    await agent
      .put('/api/state/events')
      .set(mutatingHeaders())
      .send(full.body.events || [])
      .expect(200);
    var res = await agent
      .get('/api/admin/audit-log?limit=20&chave=events')
      .set(mutatingHeaders())
      .expect(200);
    expect(Array.isArray(res.body.entries)).toBe(true);
    expect(res.body.entries.some(function (e) {
      return e.chave === 'events';
    })).toBe(true);
    var vazio = await agent
      .get('/api/admin/audit-log?desde=2099-01-01&limit=5')
      .set(mutatingHeaders())
      .expect(200);
    expect(vazio.body.entries.length).toBe(0);
  });

  test('GET /api/admin/status devolve checklist de deploy', async function () {
    var agent = request.agent(app);
    await agent.post('/api/auth/admin').send({ usuario: 'admin', senha: 'admin123' }).expect(200);
    var res = await agent.get('/api/admin/status').set(mutatingHeaders()).expect(200);
    expect(res.body).toHaveProperty('smtp');
    expect(res.body).toHaveProperty('turnstile');
    expect(res.body).toHaveProperty('uploads');
    expect(res.body.institutional).toHaveProperty('items');
    expect(Array.isArray(res.body.institutional.items)).toBe(true);
  });

  test('POST /api/admin/test-smtp sem SMTP → 400', async function () {
    var agent = request.agent(app);
    await agent.post('/api/auth/admin').send({ usuario: 'admin', senha: 'admin123' }).expect(200);
    await agent
      .post('/api/admin/test-smtp')
      .set(mutatingHeaders())
      .send({ to: 'teste@exemplo.org' })
      .expect(400);
  });
});
