'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');
const DEFAULTS = require('./server/site-defaults.cjs');
const pgStore = require('./server/pg-store.cjs');

var DATA_FILE = path.join(__dirname, 'data', 'site-data.json');
var KEYS = ['events', 'news', 'blog', 'gallery', 'members', 'sponsors', 'documents', 'institutional', 'admin_users', 'inscricoes'];

/** Pool PostgreSQL quando DATABASE_URL está definida (ex.: Railway Postgres plugin) */
var pgPool = null;

var JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-altere-em-producao';
if (!process.env.JWT_SECRET && process.env.RAILWAY_ENVIRONMENT) {
  console.warn('AVISO: defina JWT_SECRET nas variáveis do Railway para sessões seguras.');
}

function mergeDefaults(state) {
  var out = {};
  KEYS.forEach(function (k) {
    out[k] = state[k] !== undefined && state[k] !== null ? state[k] : DEFAULTS[k];
  });
  return out;
}

async function initDatabase() {
  if (!process.env.DATABASE_URL) return;
  pgPool = pgStore.createPool(process.env.DATABASE_URL);
  await pgStore.ensureSchema(pgPool);
  console.log('Banco PostgreSQL pronto (DATABASE_URL).');
}

async function loadState() {
  if (pgPool) {
    return pgStore.loadAll(pgPool, KEYS, mergeDefaults, DEFAULTS);
  }
  try {
    if (fs.existsSync(DATA_FILE)) {
      var parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      return mergeDefaults(parsed);
    }
  } catch (e) {
    console.warn('site-data.json inválido, usando defaults.', e.message);
  }
  var d = mergeDefaults({});
  await saveStateFull(d);
  return d;
}

async function saveStateFull(state) {
  if (pgPool) {
    await pgStore.saveStateFull(pgPool, KEYS, state);
    return;
  }
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf8');
}

async function saveKey(key, payload) {
  if (KEYS.indexOf(key) === -1) throw new Error('Chave inválida');
  if (pgPool) {
    await pgStore.saveKey(pgPool, key, payload);
    return;
  }
  var state = await loadState();
  state[key] = payload;
  await saveStateFull(state);
}

function filterPublic(state) {
  return {
    events: state.events,
    news: state.news,
    blog: state.blog,
    gallery: state.gallery,
    sponsors: state.sponsors,
    institutional: state.institutional
  };
}

function signAdmin(user) {
  return jwt.sign(
    { t: 'admin', sub: user.id, perfil: user.perfil || 'editor', usuario: user.usuario, nome: user.nome },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function signMember(member) {
  return jwt.sign(
    { t: 'member', sub: member.id, usuario: member.usuario, nome: member.nome },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(req) {
  var h = req.headers.authorization;
  if (!h || h.indexOf('Bearer ') !== 0) return null;
  try {
    return jwt.verify(h.slice(7), JWT_SECRET);
  } catch (e) {
    return null;
  }
}

var app = express();
app.use(express.json({ limit: '5mb' }));

var logoPath = path.join(__dirname, 'img', 'logo.jpg');
app.get('/favicon.ico', function (req, res) {
  if (fs.existsSync(logoPath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return fs.createReadStream(logoPath).pipe(res);
  }
  res.status(204).end();
});
app.get('/apple-touch-icon.png', function (req, res) {
  if (fs.existsSync(logoPath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    return fs.createReadStream(logoPath).pipe(res);
  }
  res.status(404).end();
});

app.get('/api/health', function (req, res) {
  res.json({ ok: true, backend: pgPool ? 'postgres' : 'file' });
});

app.get('/api/public', async function (req, res) {
  try {
    var state = await loadState();
    res.json(filterPublic(state));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get('/api/full', async function (req, res) {
  var payload = verifyToken(req);
  if (!payload || payload.t !== 'admin') {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  try {
    var state = await loadState();
    res.json(state);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get('/api/member-bootstrap', async function (req, res) {
  var payload = verifyToken(req);
  if (!payload || payload.t !== 'member') {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  try {
    var state = await loadState();
    var usuario = payload.usuario;
    var members = (state.members || []).filter(function (m) {
      return m.usuario === usuario && m.ativo !== false;
    });
    var inscricoes = (state.inscricoes || []).filter(function (i) {
      return i.membroUsuario === usuario;
    });
    res.json({
      events: state.events,
      news: state.news,
      blog: state.blog,
      gallery: state.gallery,
      sponsors: state.sponsors,
      institutional: state.institutional,
      documents: state.documents,
      members: members,
      inscricoes: inscricoes
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post('/api/auth/admin', async function (req, res) {
  var usuario = (req.body && req.body.usuario) ? String(req.body.usuario).trim() : '';
  var senha = (req.body && req.body.senha) ? String(req.body.senha) : '';
  if (!usuario || !senha) return res.status(400).json({ error: 'Usuário e senha obrigatórios' });
  try {
    var state = await loadState();
    var users = state.admin_users || [];
    var found = users.find(function (u) {
      return u.usuario && u.usuario.toLowerCase() === usuario.toLowerCase() && u.senha === senha;
    });
    if (!found) return res.status(401).json({ error: 'Usuário ou senha incorretos' });
    var token = signAdmin(found);
    res.json({
      token: token,
      nome: found.nome,
      perfil: found.perfil || 'editor',
      usuario: found.usuario
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post('/api/auth/member', async function (req, res) {
  var usuario = (req.body && req.body.usuario) ? String(req.body.usuario).trim() : '';
  var senha = (req.body && req.body.senha) ? String(req.body.senha) : '';
  if (!usuario || !senha) return res.status(400).json({ error: 'Usuário e senha obrigatórios' });
  try {
    var state = await loadState();
    var members = state.members || [];
    var found = members.find(function (m) {
      return m.usuario === usuario && m.senha === senha && m.ativo !== false;
    });
    if (!found) return res.status(401).json({ error: 'Usuário ou senha incorretos' });
    var token = signMember(found);
    res.json({
      token: token,
      nome: found.nome,
      usuario: found.usuario
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

function assertAdminEditor(payload, key) {
  var perfil = payload.perfil || 'editor';
  if (perfil === 'editor' && (key === 'members' || key === 'documents' || key === 'institutional')) {
    return 'Sem permissão para editar esta seção';
  }
  return null;
}

app.put('/api/state/:key', async function (req, res) {
  var key = req.params.key;
  if (KEYS.indexOf(key) === -1) return res.status(400).json({ error: 'Chave inválida' });
  var payload = verifyToken(req);
  if (!payload || payload.t !== 'admin') return res.status(401).json({ error: 'Não autorizado' });
  var err = assertAdminEditor(payload, key);
  if (err) return res.status(403).json({ error: err });
  try {
    await saveKey(key, req.body);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post('/api/inscricao/publica', async function (req, res) {
  try {
    var b = req.body || {};
    var eventoId = b.eventoId;
    if (!eventoId) return res.status(400).json({ error: 'eventoId obrigatório' });
    var state = await loadState();
    var list = state.inscricoes || [];
    list.push({
      eventoId: eventoId,
      eventoTitulo: b.eventoTitulo || '',
      eventoData: b.eventoData || '',
      eventoHora: b.eventoHora || '',
      eventoLocal: b.eventoLocal || '',
      nome: b.nome || '',
      email: b.email || '',
      telefone: b.telefone || '',
      dataInscricao: b.dataInscricao || new Date().toISOString().slice(0, 10)
    });
    await saveKey('inscricoes', list);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post('/api/inscricao/membro', async function (req, res) {
  var payload = verifyToken(req);
  if (!payload || payload.t !== 'member') return res.status(401).json({ error: 'Não autorizado' });
  try {
    var b = req.body || {};
    var usuario = payload.usuario;
    var state = await loadState();
    var list = state.inscricoes || [];
    list.push({
      eventoId: b.eventoId,
      eventoTitulo: b.eventoTitulo || '',
      eventoData: b.eventoData || '',
      eventoHora: b.eventoHora || '',
      eventoLocal: b.eventoLocal || '',
      membroUsuario: usuario,
      dataInscricao: new Date().toISOString().slice(0, 10)
    });
    await saveKey('inscricoes', list);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.delete('/api/inscricao/membro/:eventoId', async function (req, res) {
  var payload = verifyToken(req);
  if (!payload || payload.t !== 'member') return res.status(401).json({ error: 'Não autorizado' });
  try {
    var usuario = payload.usuario;
    var eventoId = req.params.eventoId;
    var state = await loadState();
    var list = (state.inscricoes || []).filter(function (i) {
      return !(i.membroUsuario === usuario && String(i.eventoId) === String(eventoId));
    });
    await saveKey('inscricoes', list);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.patch('/api/member/perfil', async function (req, res) {
  var payload = verifyToken(req);
  if (!payload || payload.t !== 'member') return res.status(401).json({ error: 'Não autorizado' });
  try {
    var b = req.body || {};
    var state = await loadState();
    var members = (state.members || []).map(function (m) {
      if (m.id !== payload.sub) return m;
      return Object.assign({}, m, {
        nome: b.nome !== undefined ? b.nome : m.nome,
        email: b.email !== undefined ? b.email : m.email,
        telefone: b.telefone !== undefined ? b.telefone : m.telefone
      });
    });
    await saveKey('members', members);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.use(express.static(path.join(__dirname), {
  index: ['index.html'],
  extensions: ['html']
}));

app.use(function (req, res) {
  if (req.path.indexOf('/api') === 0) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.status(404).send('Not found');
});

var envPort = process.env.PORT;
var portFixo = envPort !== undefined && envPort !== '';
var inicial = parseInt(portFixo ? envPort : envPort || '3000', 10);

function iniciar(porta, tentativas) {
  var server = http.createServer(app);
  server.once('error', function (err) {
    if (err.code === 'EADDRINUSE' && !portFixo && tentativas > 1) {
      var prox = porta + 1;
      console.warn('Porta ' + porta + ' em uso, tentando ' + prox + '...');
      iniciar(prox, tentativas - 1);
      return;
    }
    console.error(err);
    process.exit(1);
  });
  server.listen(porta, '0.0.0.0', function () {
    console.log('Servidor em http://127.0.0.1:' + porta + ' | dados: ' + (pgPool ? 'PostgreSQL' : 'arquivo local data/site-data.json'));
  });
}

var maxTentativas = portFixo ? 1 : 15;

initDatabase()
  .then(function () {
    iniciar(inicial, maxTentativas);
  })
  .catch(function (err) {
    console.error('Erro ao iniciar banco:', err.message);
    if (process.env.DATABASE_URL) {
      process.exit(1);
    }
    iniciar(inicial, maxTentativas);
  });
