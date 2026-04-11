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
  });

  test('GET /api/public devolve chaves públicas', async function () {
    var res = await request(app).get('/api/public').expect(200);
    expect(Array.isArray(res.body.events)).toBe(true);
    expect(Array.isArray(res.body.news)).toBe(true);
    expect(res.body.institutional).toBeDefined();
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
    var events = [{ id: 't1', titulo: 'Teste API', descricao: '', data: '2026-01-01', publicado: true }];
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
      .send({ eventoId: '1', nome: 'Visitante', email: 'v@teste.org' })
      .expect(200);
  });

  test('POST /api/inscricao/publica sem eventoId → 400', async function () {
    await request(app).post('/api/inscricao/publica').send({ nome: 'x' }).expect(400);
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

  test('POST /api/auth/logout-admin limpa sessão', async function () {
    var agent = request.agent(app);
    await agent.post('/api/auth/admin').send({ usuario: 'admin', senha: 'admin123' }).expect(200);
    await agent.post('/api/auth/logout-admin').set(mutatingHeaders()).expect(200);
    await agent.get('/api/full').expect(401);
  });
});
