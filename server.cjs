'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const DEFAULTS = require('./server/site-defaults.cjs');
const pgStore = require('./server/pg-store.cjs');
const pwd = require('./server/passwords.cjs');
const { createLimiters } = require('./server/rate-limit.cjs');
const docUpload = require('./server/document-upload.cjs');
const galleryUpload = require('./server/gallery-upload.cjs');
const smtpMail = require('./server/smtp-mail.cjs');

var DATA_FILE = process.env.SITE_DATA_FILE
  ? path.resolve(process.env.SITE_DATA_FILE)
  : path.join(__dirname, 'data', 'site-data.json');
var KEYS = [
  'events',
  'news',
  'blog',
  'gallery',
  'members',
  'sponsors',
  'documents',
  'institutional',
  'admin_users',
  'inscricoes',
  'mensagens_contato',
  'pedidos_doacao',
  'mensagens_membros'
];

/** Pool PostgreSQL quando DATABASE_URL está definida (ex.: Railway Postgres plugin) */
var pgPool = null;

var JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-altere-em-producao';
if (!process.env.JWT_SECRET && process.env.RAILWAY_ENVIRONMENT) {
  console.warn('AVISO: defina JWT_SECRET nas variáveis do Railway para sessões seguras.');
}

/** Cookies HttpOnly — o JWT não fica em sessionStorage (mitiga roubo via XSS). */
var COOKIE_ADMIN = 'site_admin_session';
var COOKIE_MEMBER = 'site_member_session';

function sessionCookieOptions() {
  var o = {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
  if (process.env.NODE_ENV === 'production' || process.env.FORCE_SECURE_COOKIES === '1') {
    o.secure = true;
  }
  return o;
}

function setSessionCookie(res, name, token) {
  res.cookie(name, token, sessionCookieOptions());
}

function clearSessionCookie(res, name) {
  res.clearCookie(name, { path: '/', httpOnly: true, sameSite: 'lax' });
}

/**
 * Com sessão por cookie, exige Origin/Referer alinhados ao host (mitiga CSRF entre sites).
 * Login público e inscrição sem cookie de sessão continuam permitidos.
 */
function csrfOriginGuard(req, res, next) {
  if (req.path.indexOf('/api/') !== 0) return next();
  var method = req.method;
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();
  if (req.path === '/api/auth/admin' || req.path === '/api/auth/member') return next();
  if (req.path === '/api/auth/logout-admin' || req.path === '/api/auth/logout-member') return next();
  if (req.path === '/api/inscricao/publica') return next();
  if (req.path === '/api/form/contato' || req.path === '/api/form/doacao') return next();
  var hasAuthCookie = req.cookies && (req.cookies[COOKIE_ADMIN] || req.cookies[COOKIE_MEMBER]);
  if (!hasAuthCookie) return next();
  var host = req.get('Host');
  var proto = (req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim();
  var expected = proto + '://' + host;
  var origin = req.get('Origin');
  if (origin) {
    if (origin !== expected) return res.status(403).json({ error: 'Origem inválida' });
    return next();
  }
  var ref = req.get('Referer') || '';
  if (ref.indexOf(expected + '/') === 0 || ref === expected) return next();
  var auth = req.get('Authorization') || '';
  if (auth.indexOf('Bearer ') === 0) return next();
  return res.status(403).json({ error: 'Origem inválida' });
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

/** Migra senha em texto antigo para bcrypt após login bem-sucedido. */
async function upgradeLegacyPassword(key, userId, plain) {
  var state = await loadState();
  var list = state[key] || [];
  var item = list.find(function (x) { return String(x.id) === String(userId); });
  if (!item || pwd.isBcryptHash(item.senha)) return;
  var newList = list.map(function (x) {
    if (String(x.id) !== String(userId)) return x;
    return Object.assign({}, x, { senha: pwd.hashPassword(plain) });
  });
  await saveKey(key, newList);
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

function getTokenString(req) {
  var h = req.headers.authorization;
  if (h && h.indexOf('Bearer ') === 0) return h.slice(7);
  if (req.cookies) {
    if (req.cookies[COOKIE_ADMIN]) return req.cookies[COOKIE_ADMIN];
    if (req.cookies[COOKIE_MEMBER]) return req.cookies[COOKIE_MEMBER];
  }
  return null;
}

function verifyToken(req) {
  var raw = getTokenString(req);
  if (!raw) return null;
  try {
    return jwt.verify(raw, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

var rateLimits = createLimiters();

var app = express();
if (process.env.RAILWAY_ENVIRONMENT || process.env.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

/**
 * CSP só em produção (ou FORCE_CSP=1), para desenvolvimento local não bloquear
 * extensões (ex.: antivírus), fontes ou uploads. Desligar: DISABLE_CSP=1.
 */
var cspAtiva =
  process.env.DISABLE_CSP !== '1' &&
  (process.env.NODE_ENV === 'production' || process.env.FORCE_CSP === '1');
if (cspAtiva) {
  app.use(function (req, res, next) {
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: http: https:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "media-src 'self' blob:",
        "frame-ancestors 'self'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; ')
    );
    next();
  });
}

app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use('/api', rateLimits.apiGlobal);
app.use(csrfOriginGuard);

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

app.get('/api/health', rateLimits.publicGet, function (req, res) {
  res.json({ ok: true, backend: pgPool ? 'postgres' : 'file' });
});

app.get('/api/public', rateLimits.publicGet, async function (req, res) {
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
    res.json(pwd.stripPasswordsFromState(state));
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
      members: members.map(function (m) {
        var o = Object.assign({}, m);
        o.senha = '';
        return o;
      }),
      inscricoes: inscricoes
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post('/api/auth/admin', rateLimits.login, async function (req, res) {
  var usuario = (req.body && req.body.usuario) ? String(req.body.usuario).trim() : '';
  var senha = (req.body && req.body.senha) ? String(req.body.senha) : '';
  if (!usuario || !senha) return res.status(400).json({ error: 'Usuário e senha obrigatórios' });
  try {
    var state = await loadState();
    var users = state.admin_users || [];
    var found = users.find(function (u) {
      return u.usuario && u.usuario.toLowerCase() === usuario.toLowerCase();
    });
    if (!found || !pwd.verifyPassword(senha, found.senha)) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos' });
    }
    await upgradeLegacyPassword('admin_users', found.id, senha);
    var token = signAdmin(found);
    clearSessionCookie(res, COOKIE_MEMBER);
    setSessionCookie(res, COOKIE_ADMIN, token);
    res.json({
      nome: found.nome,
      perfil: found.perfil || 'editor',
      usuario: found.usuario
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post('/api/auth/member', rateLimits.login, async function (req, res) {
  var usuario = (req.body && req.body.usuario) ? String(req.body.usuario).trim() : '';
  var senha = (req.body && req.body.senha) ? String(req.body.senha) : '';
  if (!usuario || !senha) return res.status(400).json({ error: 'Usuário e senha obrigatórios' });
  try {
    var state = await loadState();
    var members = state.members || [];
    var found = members.find(function (m) {
      return m.usuario === usuario && m.ativo !== false;
    });
    if (!found || !pwd.verifyPassword(senha, found.senha)) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos' });
    }
    await upgradeLegacyPassword('members', found.id, senha);
    var token = signMember(found);
    clearSessionCookie(res, COOKIE_ADMIN);
    setSessionCookie(res, COOKIE_MEMBER, token);
    res.json({
      nome: found.nome,
      usuario: found.usuario
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get('/api/auth/admin/session', function (req, res) {
  var payload = verifyToken(req);
  if (!payload || payload.t !== 'admin') {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  res.json({
    usuario: payload.usuario,
    nome: payload.nome,
    perfil: payload.perfil || 'editor'
  });
});

app.get('/api/auth/member/session', function (req, res) {
  var payload = verifyToken(req);
  if (!payload || payload.t !== 'member') {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  res.json({
    usuario: payload.usuario,
    nome: payload.nome
  });
});

app.post('/api/auth/logout-admin', function (req, res) {
  clearSessionCookie(res, COOKIE_ADMIN);
  res.json({ ok: true });
});

app.post('/api/auth/logout-member', function (req, res) {
  clearSessionCookie(res, COOKIE_MEMBER);
  res.json({ ok: true });
});

function assertAdminEditor(payload, key) {
  var perfil = payload.perfil || 'editor';
  if (
    perfil === 'editor' &&
    (key === 'members' ||
      key === 'documents' ||
      key === 'institutional' ||
      key === 'mensagens_contato' ||
      key === 'pedidos_doacao' ||
      key === 'mensagens_membros')
  ) {
    return 'Sem permissão para editar esta seção';
  }
  return null;
}

function clampStr(v, max) {
  if (v === undefined || v === null) return '';
  var s = String(v).trim();
  if (s.length > max) s = s.slice(0, max);
  return s;
}

function newFormId() {
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

app.put('/api/state/:key', async function (req, res) {
  var key = req.params.key;
  if (KEYS.indexOf(key) === -1) return res.status(400).json({ error: 'Chave inválida' });
  var payload = verifyToken(req);
  if (!payload || payload.t !== 'admin') return res.status(401).json({ error: 'Não autorizado' });
  var err = assertAdminEditor(payload, key);
  if (err) return res.status(403).json({ error: err });
  try {
    var body = req.body;
    if (key === 'members') {
      body = pwd.mergeMembersSave(await loadState(), body);
    } else if (key === 'admin_users') {
      body = pwd.mergeAdminUsersSave(await loadState(), body);
    }
    await saveKey(key, body);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

/** Upload de ficheiro para documentos (somente perfil admin — igual a PUT documents). */
function handleDocumentUploadPost(req, res) {
  var payload = verifyToken(req);
  if (!payload || payload.t !== 'admin') {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  if ((payload.perfil || 'editor') !== 'admin') {
    return res.status(403).json({ error: 'Sem permissão para enviar documentos' });
  }
  docUpload.uploadSingle(req, res, function (err) {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Arquivo muito grande (máx. 25 MB)' });
      }
      return res.status(400).json({ error: err.message || 'Upload inválido' });
    }
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    res.json({ url: docUpload.publicUrlPath + req.file.filename });
  });
}
app.get('/api/upload/document', function (req, res) {
  res.status(405).set('Allow', 'POST').json({ error: 'Use POST com multipart field "file"' });
});
app.post('/api/upload/document', handleDocumentUploadPost);
app.post('/api/upload/document/', handleDocumentUploadPost);

/** Upload de ficheiro para galeria (admin ou editor — igual a PUT gallery). */
function handleGalleryUploadPost(req, res) {
  var payload = verifyToken(req);
  if (!payload || payload.t !== 'admin') {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  galleryUpload.uploadSingle(req, res, function (err) {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Arquivo muito grande (máx. 100 MB)' });
      }
      return res.status(400).json({ error: err.message || 'Upload inválido' });
    }
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    res.json({ url: galleryUpload.publicUrlPath + req.file.filename });
  });
}
app.get('/api/upload/gallery', function (req, res) {
  res.status(405).set('Allow', 'POST').json({ error: 'Use POST com multipart field "file"' });
});
app.post('/api/upload/gallery', handleGalleryUploadPost);
app.post('/api/upload/gallery/', handleGalleryUploadPost);

app.post('/api/inscricao/publica', rateLimits.inscricaoPublica, async function (req, res) {
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

app.post('/api/form/contato', rateLimits.formPublico, async function (req, res) {
  try {
    var b = req.body || {};
    var nome = clampStr(b.nome, 200);
    var email = clampStr(b.email, 200);
    var assunto = clampStr(b.assunto, 80);
    var mensagem = clampStr(b.mensagem, 8000);
    if (!nome || !email || !assunto || !mensagem) {
      return res.status(400).json({ error: 'Preencha nome, e-mail, assunto e mensagem.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'E-mail inválido.' });
    }
    var state = await loadState();
    var list = state.mensagens_contato || [];
    list.push({
      id: newFormId(),
      nome: nome,
      email: email,
      assunto: assunto,
      mensagem: mensagem,
      criadoEm: new Date().toISOString()
    });
    await saveKey('mensagens_contato', list);
    smtpMail
      .notifyAfterFormSubmit({
        type: 'contato',
        institutional: state.institutional || {},
        data: { nome: nome, email: email, assunto: assunto, mensagem: mensagem }
      })
      .catch(function (err) {
        console.error('[smtp]', err.message || err);
      });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post('/api/form/doacao', rateLimits.formPublico, async function (req, res) {
  try {
    var b = req.body || {};
    var email = clampStr(b.email, 200);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Informe um e-mail válido.' });
    }
    var nome = clampStr(b.nome, 200);
    var valorRaw = b.valor;
    var valorOutro = b.valor_outro;
    var reais = null;
    if (valorRaw === 'outro' || valorRaw === 'Outro') {
      var n = parseFloat(String(valorOutro), 10);
      if (!isFinite(n) || n < 1) {
        return res.status(400).json({ error: 'Informe o valor da doação (mínimo R$ 1).' });
      }
      reais = Math.round(n * 100) / 100;
    } else {
      var v = parseFloat(String(valorRaw), 10);
      if (!isFinite(v) || v < 1) {
        return res.status(400).json({ error: 'Selecione um valor ou "Outro" com quantia válida.' });
      }
      reais = Math.round(v * 100) / 100;
    }
    var state = await loadState();
    var list = state.pedidos_doacao || [];
    list.push({
      id: newFormId(),
      nome: nome,
      email: email,
      valorReais: reais,
      criadoEm: new Date().toISOString(),
      nota: 'Intenção registada no site — conclua o pagamento (PIX/gateway) por contacto direto com a associação.'
    });
    await saveKey('pedidos_doacao', list);
    smtpMail
      .notifyAfterFormSubmit({
        type: 'doacao',
        institutional: state.institutional || {},
        data: { nome: nome, email: email, valorReais: reais }
      })
      .catch(function (err) {
        console.error('[smtp]', err.message || err);
      });
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

app.post('/api/member/mensagem', async function (req, res) {
  var payload = verifyToken(req);
  if (!payload || payload.t !== 'member') return res.status(401).json({ error: 'Não autorizado' });
  try {
    var b = req.body || {};
    var tipo = clampStr(b.tipo, 40);
    if (tipo !== 'voluntariado' && tipo !== 'suporte') {
      return res.status(400).json({ error: 'Tipo inválido.' });
    }
    var state = await loadState();
    var membro = (state.members || []).find(function (m) {
      return String(m.id) === String(payload.sub);
    });
    var membroNome = membro ? membro.nome || '' : payload.nome || '';
    var membroUsuario = payload.usuario || '';

    if (tipo === 'voluntariado') {
      var area = clampStr(b.area, 80);
      var msgVol = clampStr(b.mensagem, 8000);
      if (!area && !msgVol) {
        return res.status(400).json({ error: 'Escolha uma área ou escreva uma mensagem.' });
      }
      var listV = state.mensagens_membros || [];
      listV.push({
        id: newFormId(),
        tipo: 'voluntariado',
        membroUsuario: membroUsuario,
        membroNome: clampStr(membroNome, 200),
        area: area,
        mensagem: msgVol,
        criadoEm: new Date().toISOString()
      });
      await saveKey('mensagens_membros', listV);
      var emailVol = membro && membro.email ? String(membro.email).trim() : '';
      smtpMail
        .notifyAfterFormSubmit({
          type: 'membro_voluntariado',
          institutional: state.institutional || {},
          data: {
            membroNome: clampStr(membroNome, 200),
            membroUsuario: membroUsuario,
            membroEmail: emailVol,
            area: area,
            mensagem: msgVol
          }
        })
        .catch(function (err) {
          console.error('[smtp]', err.message || err);
        });
      return res.json({ ok: true });
    }

    var assunto = clampStr(b.assunto, 80);
    var msgSup = clampStr(b.mensagem, 8000);
    if (!assunto || !msgSup) {
      return res.status(400).json({ error: 'Preencha assunto e mensagem.' });
    }
    var listS = state.mensagens_membros || [];
    listS.push({
      id: newFormId(),
      tipo: 'suporte',
      membroUsuario: membroUsuario,
      membroNome: clampStr(membroNome, 200),
      assunto: assunto,
      mensagem: msgSup,
      criadoEm: new Date().toISOString()
    });
    await saveKey('mensagens_membros', listS);
    var emailSup = membro && membro.email ? String(membro.email).trim() : '';
    smtpMail
      .notifyAfterFormSubmit({
        type: 'membro_suporte',
        institutional: state.institutional || {},
        data: {
          membroNome: clampStr(membroNome, 200),
          membroUsuario: membroUsuario,
          membroEmail: emailSup,
          assunto: assunto,
          mensagem: msgSup
        }
      })
      .catch(function (err) {
        console.error('[smtp]', err.message || err);
      });
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

/**
 * Não servir o diretório inteiro: evita expor node_modules/, data/, server/, testes, etc.
 * (express.static na raiz expõe qualquer ficheiro existente, p.ex. site-data.json.)
 */
var STATIC_BLOCK_PREFIXES = [
  '/node_modules',
  '/server',
  '/test',
  '/data',
  '/docs',
  '/coverage',
  '/supabase',
  '/.git'
];
var STATIC_BLOCK_EXACT = {
  '/server.cjs': true,
  '/package.json': true,
  '/package-lock.json': true,
  '/jest.config.cjs': true,
  '/README.md': true,
  '/.gitignore': true,
  '/.nvmrc': true,
  '/.env': true,
  '/.env.local': true,
  '/.env.production': true
};
app.use(function (req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  var p = req.path || '';
  if (p.indexOf('..') !== -1) return res.status(400).end();
  if (STATIC_BLOCK_EXACT[p]) return res.status(404).end();
  for (var i = 0; i < STATIC_BLOCK_PREFIXES.length; i++) {
    var pref = STATIC_BLOCK_PREFIXES[i];
    if (p === pref || p.indexOf(pref + '/') === 0) return res.status(404).end();
  }
  next();
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
    var dados = pgPool ? 'PostgreSQL' : 'arquivo local data/site-data.json';
    var cspMsg = cspAtiva ? 'CSP ativa' : 'CSP off (dev — use NODE_ENV=production na hospedagem para ativar)';
    console.log('Servidor em http://127.0.0.1:' + porta + ' | ' + dados + ' | ' + cspMsg);
  });
}

var maxTentativas = portFixo ? 1 : 15;

function startHttpServer() {
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
}

module.exports = { app: app, DATA_FILE: DATA_FILE };

if (require.main === module) {
  startHttpServer();
}
