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
const inscricaoVal = require('./server/inscricao-validacao.cjs');
const { getSeedDefaults, assertProductionConfig } = require('./server/seed.cjs');
const publicFilter = require('./server/public-filter.cjs');
const s3Storage = require('./server/s3-storage.cjs');
const { registerAdminRoutes } = require('./server/admin-routes.cjs');
const turnstile = require('./server/turnstile.cjs');
const auditLog = require('./server/audit-log.cjs');
const stateEtag = require('./server/state-etag.cjs');
const sanitizeContent = require('./server/sanitize-content.cjs');
const institutionalValidate = require('./server/institutional-validate.cjs');
const inscricaoSave = require('./server/inscricao-save.cjs');
const stateCleanup = require('./server/state-cleanup.cjs');
const filiacaoVal = require('./server/filiacao-validacao.cjs');
const recordSave = require('./server/record-save.cjs');
const { createLoginUserGuard } = require('./server/login-user-guard.cjs');
const stateUrlNormalize = require('./server/state-url-normalize.cjs');
const crypto = require('crypto');

/** Incrementa a cada gravação — invalida cache de GET /api/public. */
var publicDataRevision = 0;
function bumpPublicCache() {
  publicDataRevision += 1;
}

/** Site estático (HTML, CSS, JS, imagens, admin) — URLs públicas inalteradas. */
var PUBLIC_DIR = path.join(__dirname, 'public');

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
  'pedidos_filiacao',
  'mensagens_membros',
  'admin_audit_log'
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

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;
}

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
  if (req.path === '/api/form/contato' || req.path === '/api/form/doacao' || req.path === '/api/form/filiacao') return next();
  if (req.path === '/api/auth/member-forgot' || req.path === '/api/auth/member-reset') return next();
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
  var seed = getSeedDefaults(DEFAULTS);
  var out = {};
  KEYS.forEach(function (k) {
    out[k] = state[k] !== undefined && state[k] !== null ? state[k] : seed[k];
  });
  return out;
}

async function initDatabase() {
  if (!process.env.DATABASE_URL) {
    console.log('[db] DATABASE_URL não definida — modo arquivo local.');
    return;
  }
  console.log('[db] A ligar ao PostgreSQL…');
  pgPool = pgStore.createPool(process.env.DATABASE_URL);
  await pgStore.ensureSchema(pgPool);
  console.log('[db] PostgreSQL pronto (tabela app_state).');
}

async function loadState() {
  var state;
  if (pgPool) {
    state = await pgStore.loadAll(pgPool, KEYS, mergeDefaults, DEFAULTS);
  } else {
    try {
      if (fs.existsSync(DATA_FILE)) {
        var parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        state = mergeDefaults(parsed);
      } else {
        state = mergeDefaults({});
        await saveStateFull(state);
      }
    } catch (e) {
      console.warn('site-data.json inválido, usando defaults.', e.message);
      state = mergeDefaults({});
      await saveStateFull(state);
    }
  }
  state = stateCleanup.cleanupGallery(state, __dirname);
  return state;
}

async function saveStateFull(state) {
  if (pgPool) {
    await pgStore.saveStateFull(pgPool, KEYS, state);
    return;
  }
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf8');
}

async function saveKey(key, payload, options) {
  if (KEYS.indexOf(key) === -1) throw new Error('Chave inválida');
  if (pgPool) {
    if (options && options.ifMatch) {
      await pgStore.saveKeyIfMatch(
        pgPool,
        key,
        payload,
        options.ifMatch,
        options.auditEntry,
        options.currentPayload
      );
      bumpPublicCache();
      return;
    }
    await pgStore.saveKey(pgPool, key, payload);
  } else {
    var state = await loadState();
    state[key] = payload;
    await saveStateFull(state);
  }
  bumpPublicCache();
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
  return publicFilter.filterPublic(state);
}

function normalizeDocumentAccess(doc) {
  doc = doc || {};
  var raw = String(doc.acesso || doc.permissao || '').trim().toLowerCase();
  if (raw === 'publico' || raw === 'public') return 'publico';
  if (raw === 'admin') return 'admin';
  if (doc.publico === true) return 'publico';
  return 'membros';
}

function filterAdminFullStateForPayload(state, payload) {
  if ((payload.perfil || 'editor') === 'admin') {
    return pwd.stripPasswordsFromState(state);
  }
  var allowed = ['events', 'news', 'blog', 'gallery', 'sponsors'];
  var out = {};
  allowed.forEach(function (key) {
    out[key] = state[key] !== undefined ? state[key] : [];
  });
  out._keyEtags = stateEtag.keyEtags(state, allowed);
  return out;
}

function filterMemberBootstrapState(state, usuario) {
  var members = (state.members || []).filter(function (m) {
    return m.usuario === usuario && m.ativo !== false;
  });
  var inscricoes = (state.inscricoes || []).filter(function (i) {
    return i.membroUsuario === usuario;
  });
  var documents = (state.documents || []).filter(function (d) {
    return d.visivel !== false && normalizeDocumentAccess(d) !== 'admin';
  });
  return {
    events: (state.events || []).filter(function (e) {
      return e.publicado !== false;
    }),
    news: (state.news || []).filter(function (n) {
      return n.publicado !== false;
    }),
    blog: (state.blog || []).filter(function (b) {
      return b.publicado !== false;
    }),
    gallery: state.gallery || [],
    sponsors: state.sponsors || [],
    institutional: state.institutional || {},
    documents: documents,
    members: members.map(function (m) {
      var o = Object.assign({}, m);
      o.senha = '';
      delete o.resetTokenHash;
      delete o.resetExpires;
      return o;
    }),
    inscricoes: inscricoes
  };
}

function safeUploadFilename(reqPath) {
  var raw = decodeURIComponent(String(reqPath || '').replace(/^\/+/, ''));
  if (!raw || raw.indexOf('/') !== -1 || raw.indexOf('\\') !== -1 || raw.indexOf('..') !== -1) {
    return null;
  }
  return raw;
}

function documentRecordForUrl(state, publicUrl) {
  return (state.documents || []).find(function (d) {
    return String(d.arquivo || '') === publicUrl;
  });
}

function canAccessDocumentUpload(payload, doc) {
  if (payload && payload.t === 'admin') return true;
  if (!doc || doc.visivel === false) return false;
  var access = normalizeDocumentAccess(doc);
  if (access === 'publico') return true;
  if (payload && payload.t === 'member' && access === 'membros') return true;
  return false;
}

function signAdmin(user) {
  return jwt.sign(
    {
      t: 'admin',
      sub: user.id,
      perfil: user.perfil || 'editor',
      usuario: user.usuario,
      nome: user.nome,
      sv: pwd.sessionVersion(user)
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function signMember(member) {
  return jwt.sign(
    {
      t: 'member',
      sub: member.id,
      usuario: member.usuario,
      nome: member.nome,
      sv: pwd.sessionVersion(member)
    },
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
  } catch (_e) {
    return null;
  }
}

function currentPrincipalFromState(req, expectedType, state) {
  var tokenPayload = verifyToken(req);
  if (!tokenPayload || tokenPayload.t !== expectedType) return null;
  var collection = expectedType === 'admin' ? state.admin_users : state.members;
  var user = (collection || []).find(function (item) {
    return String(item.id) === String(tokenPayload.sub);
  });
  if (!user || user.ativo === false) return null;
  if (Number(tokenPayload.sv) !== pwd.sessionVersion(user)) return null;
  var payload = Object.assign({}, tokenPayload, {
    usuario: user.usuario,
    nome: user.nome,
    sv: pwd.sessionVersion(user)
  });
  if (expectedType === 'admin') payload.perfil = user.perfil || 'editor';
  return { payload: payload, user: user, state: state };
}

async function authenticateCurrent(req, expectedType, existingState) {
  var state = existingState || (await loadState());
  return currentPrincipalFromState(req, expectedType, state);
}

function clearInvalidSession(res, expectedType) {
  clearSessionCookie(res, expectedType === 'admin' ? COOKIE_ADMIN : COOKIE_MEMBER);
}

function requireCurrentPrincipal(expectedType) {
  return async function (req, res, next) {
    try {
      var auth = await authenticateCurrent(req, expectedType);
      if (!auth) {
        clearInvalidSession(res, expectedType);
        return res.status(401).json({ error: 'Não autorizado' });
      }
      res.setHeader('Cache-Control', 'no-store');
      req.currentAuth = auth;
      next();
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  };
}

var requireCurrentAdmin = requireCurrentPrincipal('admin');
var requireCurrentMember = requireCurrentPrincipal('member');

var rateLimits = createLimiters();
var loginUserGuard = createLoginUserGuard();

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
    var csp = [
      "default-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: http: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "media-src 'self' blob:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'"
    ];
    if (turnstile.isEnabled()) {
      csp.push("script-src 'self' https://challenges.cloudflare.com");
      csp.push("frame-src https://challenges.cloudflare.com");
    } else {
      csp.push("script-src 'self'");
    }
    res.setHeader('Content-Security-Policy', csp.join('; '));
    next();
  });
}

app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(function (req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use('/api', rateLimits.apiGlobal);
app.use(csrfOriginGuard);

var logoPath = path.join(PUBLIC_DIR, 'img', 'logo.jpg');
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
  var deployStatus = require('./server/deploy-status.cjs');
  var brief = deployStatus.buildDeployStatus();
  res.json({
    ok: true,
    backend: pgPool ? 'postgres' : 'file',
    smtp: brief.smtp,
    turnstile: brief.turnstile,
    uploads: brief.uploads
  });
});

app.get('/api/config', rateLimits.publicGet, function (req, res) {
  res.json({
    turnstileSiteKey: turnstile.siteKey()
  });
});

app.get('/api/public', rateLimits.publicGet, async function (req, res) {
  try {
    var state = await loadState();
    var etag = 'W/"pub-' + publicDataRevision + '"';
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
    if (req.get('If-None-Match') === etag) {
      return res.status(304).end();
    }
    res.json(filterPublic(state));
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: String(e.message) });
  }
});

async function assertTurnstile(req, res) {
  if (!turnstile.isEnabled()) return true;
  var ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip;
  var ok = await turnstile.verifyToken(req.body && req.body.turnstileToken, ip);
  if (!ok) {
    turnstile.failIfInvalid(res);
    return false;
  }
  return true;
}

function hashMemberResetToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

app.get('/api/full', async function (req, res) {
  try {
    var auth = await authenticateCurrent(req, 'admin');
    if (!auth) {
      clearInvalidSession(res, 'admin');
      return res.status(401).json({ error: 'Não autorizado' });
    }
    var payload = auth.payload;
    var state = auth.state;
    res.setHeader('Cache-Control', 'no-store');
    var safe = filterAdminFullStateForPayload(state, payload);
    if ((payload.perfil || 'editor') === 'admin') {
      safe._keyEtags = stateEtag.keyEtags(state, KEYS);
    }
    res.json(safe);
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: String(e.message) });
  }
});

app.get('/api/member-bootstrap', async function (req, res) {
  try {
    var auth = await authenticateCurrent(req, 'member');
    if (!auth) {
      clearInvalidSession(res, 'member');
      return res.status(401).json({ error: 'Não autorizado' });
    }
    var payload = auth.payload;
    var state = auth.state;
    res.setHeader('Cache-Control', 'no-store');
    var usuario = payload.usuario;
    res.json(filterMemberBootstrapState(state, usuario));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post('/api/auth/admin', rateLimits.login, loginUserGuard, async function (req, res) {
  var usuario = (req.body && req.body.usuario) ? String(req.body.usuario).trim() : '';
  var senha = (req.body && req.body.senha) ? String(req.body.senha) : '';
  if (!usuario || !senha) return res.status(400).json({ error: 'Usuário e senha obrigatórios' });
  try {
    var state = await loadState();
    var users = state.admin_users || [];
    var found = users.find(function (u) {
      return u.usuario && u.usuario.toLowerCase() === usuario.toLowerCase() && u.ativo !== false;
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

app.post('/api/auth/member', rateLimits.login, loginUserGuard, async function (req, res) {
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

/** Sempre 200 — evita 401 no console em visitantes anónimos ao detetar sessão. */
app.get('/api/auth/status', rateLimits.publicGet, async function (req, res) {
  try {
    var state = await loadState();
    if (currentPrincipalFromState(req, 'admin', state)) return res.json({ kind: 'admin' });
    if (currentPrincipalFromState(req, 'member', state)) return res.json({ kind: 'member' });
    res.json({ kind: null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get('/api/auth/admin/session', async function (req, res) {
  try {
    var auth = await authenticateCurrent(req, 'admin');
    if (!auth) {
      clearInvalidSession(res, 'admin');
      return res.status(401).json({ error: 'Não autorizado' });
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      usuario: auth.payload.usuario,
      nome: auth.payload.nome,
      perfil: auth.payload.perfil || 'editor'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.get('/api/auth/member/session', async function (req, res) {
  try {
    var auth = await authenticateCurrent(req, 'member');
    if (!auth) {
      clearInvalidSession(res, 'member');
      return res.status(401).json({ error: 'Não autorizado' });
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      usuario: auth.payload.usuario,
      nome: auth.payload.nome
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
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
  var editorAllowed = ['events', 'news', 'blog', 'gallery', 'sponsors'];
  if (perfil === 'editor' && editorAllowed.indexOf(key) === -1) return 'Sem permissÃ£o para editar esta seÃ§Ã£o';
  if (
    perfil === 'editor' &&
    (key === 'members' ||
      key === 'documents' ||
      key === 'institutional' ||
      key === 'mensagens_contato' ||
      key === 'pedidos_doacao' ||
      key === 'pedidos_filiacao' ||
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

function appendRecord(key, item) {
  return recordSave.appendRecord(
    { pgPool: pgPool, loadState: loadState, saveKey: saveKey },
    key,
    item
  );
}

function updateRecord(key, id, patch) {
  return recordSave.updateRecord(
    { pgPool: pgPool, loadState: loadState, saveKey: saveKey },
    key,
    id,
    patch
  );
}

function deleteMemberRegistration(usuario, eventoId) {
  return recordSave.deleteMemberRegistration(
    { pgPool: pgPool, loadState: loadState, saveKey: saveKey },
    usuario,
    eventoId
  );
}

function hasPrivacyConsent(b) {
  var c = b && b.consentimento;
  return c === true || c === 'true' || c === '1' || c === 'on';
}

app.put('/api/state/:key', requireCurrentAdmin, async function (req, res) {
  var key = req.params.key;
  if (KEYS.indexOf(key) === -1) return res.status(400).json({ error: 'Chave inválida' });
  var payload = req.currentAuth.payload;
  var err = assertAdminEditor(payload, key);
  if (err) return res.status(403).json({ error: err });
  try {
    var stateBefore = await loadState();
    var currentEtag = stateEtag.etagForPayload(stateBefore[key]);
    var ifMatch = (req.get('If-Match') || '').replace(/^"|"$/g, '');
    if (!ifMatch) {
      return res.status(428).json({
        error: 'Atualize a página antes de gravar: a versão dos dados é obrigatória.',
        etag: currentEtag
      });
    }
    if (ifMatch !== currentEtag) {
      return res.status(409).json({
        error: 'Conflito: outra pessoa ou outro separador alterou estes dados. Atualize a página e grave de novo.',
        etag: currentEtag
      });
    }
    var body = req.body;
    body = stateUrlNormalize.normalizeStateUrls(key, body);
    if (key === 'members') {
      body = pwd.mergeMembersSave(stateBefore, body);
    } else if (key === 'admin_users') {
      body = pwd.mergeAdminUsersSave(stateBefore, body);
    } else if (key === 'news' || key === 'blog') {
      body = sanitizeContent.sanitizeContentList(body);
    } else if (key === 'institutional') {
      body = institutionalValidate.normalizeInstitutional(body);
    }
    var auditEntry =
      key === 'admin_audit_log'
        ? null
        : {
            usuario: payload.usuario,
            perfil: payload.perfil || 'editor',
            acao: 'atualizar',
            chave: key
          };
    if (pgPool) {
      await saveKey(key, body, {
        ifMatch: ifMatch,
        auditEntry: auditEntry,
        currentPayload: stateBefore[key]
      });
    } else {
      await recordSave.withKeyLock(key, async function () {
        var lockedState = await loadState();
        var lockedEtag = stateEtag.etagForPayload(lockedState[key]);
        if (lockedEtag !== ifMatch) {
          var conflict = new Error(
            'Conflito: outra pessoa ou outro separador alterou estes dados. Atualize a página e grave de novo.'
          );
          conflict.status = 409;
          conflict.etag = lockedEtag;
          throw conflict;
        }
        lockedState[key] = body;
        if (auditEntry) {
          lockedState.admin_audit_log = auditLog.appendAudit(lockedState, auditEntry);
        }
        await saveStateFull(lockedState);
      });
      bumpPublicCache();
    }
    var newEtag = stateEtag.etagForPayload(body);
    res.json({ ok: true, etag: newEtag });
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: String(e.message), etag: e.etag });
  }
});

async function finishUpload(req, res, file, localUrl, s3Folder) {
  try {
    if (s3Storage.isConfigured()) {
      var url = await s3Storage.uploadMulterFile(file, s3Folder);
      return res.json({ url: url, storage: 's3' });
    }
    res.json({ url: localUrl, storage: 'disk' });
  } catch (e) {
    console.error('[upload]', e.message || e);
    res.status(500).json({ error: 'Falha ao guardar o ficheiro.' });
  }
}

/** Upload de ficheiro para documentos (somente perfil admin — igual a PUT documents). */
function handleDocumentUploadPost(req, res) {
  var payload = req.currentAuth.payload;
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
    finishUpload(req, res, req.file, docUpload.publicUrlPath + req.file.filename, 'documents');
  });
}
app.get('/api/upload/document', function (req, res) {
  res.status(405).set('Allow', 'POST').json({ error: 'Use POST com multipart field "file"' });
});
app.post('/api/upload/document', requireCurrentAdmin, handleDocumentUploadPost);
app.post('/api/upload/document/', requireCurrentAdmin, handleDocumentUploadPost);

/** Upload de ficheiro para galeria (admin ou editor — igual a PUT gallery). */
function handleGalleryUploadPost(req, res) {
  galleryUpload.uploadSingle(req, res, function (err) {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Arquivo muito grande (máx. 100 MB)' });
      }
      return res.status(400).json({ error: err.message || 'Upload inválido' });
    }
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    finishUpload(req, res, req.file, galleryUpload.publicUrlPath + req.file.filename, 'gallery');
  });
}
app.get('/api/upload/gallery', function (req, res) {
  res.status(405).set('Allow', 'POST').json({ error: 'Use POST com multipart field "file"' });
});
app.post('/api/upload/gallery', requireCurrentAdmin, handleGalleryUploadPost);
app.post('/api/upload/gallery/', requireCurrentAdmin, handleGalleryUploadPost);

app.post('/api/inscricao/publica', rateLimits.inscricaoPublica, async function (req, res) {
  try {
    if (!(await assertTurnstile(req, res))) return;
    var b = req.body || {};
    var result = await inscricaoSave.appendInscricao(
      { pgPool: pgPool, loadState: loadState, saveKey: saveKey, validate: inscricaoVal },
      b,
      null
    );
    if (!result.ok) {
      return res.status(result.status || 400).json({ error: result.error });
    }
    var state = result.state || (await loadState());
    smtpMail
      .notifyAfterFormSubmit({
        type: 'inscricao',
        institutional: state.institutional || {},
        data: Object.assign({}, result.item, { eventoId: b.eventoId })
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

app.post('/api/form/contato', rateLimits.formPublico, async function (req, res) {
  try {
    if (!(await assertTurnstile(req, res))) return;
    var b = req.body || {};
    if (b.website) return res.json({ ok: true });
    if (!hasPrivacyConsent(b)) {
      return res.status(400).json({ error: 'Aceite a política de privacidade para enviar.' });
    }
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
    if (!institutionalValidate.isAssuntoPermitido(state.institutional, assunto)) {
      return res.status(400).json({ error: 'Assunto inválido.' });
    }
    var contatoItem = {
      id: newFormId(),
      nome: nome,
      email: email,
      assunto: assunto,
      mensagem: mensagem,
      criadoEm: new Date().toISOString(),
      lida: false
    };
    await appendRecord('mensagens_contato', contatoItem);
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

app.post('/api/form/filiacao', rateLimits.formPublico, async function (req, res) {
  try {
    if (!(await assertTurnstile(req, res))) return;
    var b = req.body || {};
    if (b.website) return res.json({ ok: true });
    if (!hasPrivacyConsent(b)) {
      return res.status(400).json({ error: 'Aceite a política de privacidade para enviar.' });
    }
    var parsed = filiacaoVal.parseFiliacaoBody(b, clampStr);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });
    var item = parsed.item;
    var state = await loadState();
    var filiacaoItem = Object.assign({}, item, {
      id: newFormId(),
      criadoEm: new Date().toISOString(),
      lida: false,
      estado: 'pendente'
    });
    await appendRecord('pedidos_filiacao', filiacaoItem);
    smtpMail
      .notifyAfterFormSubmit({
        type: 'filiacao',
        institutional: state.institutional || {},
        data: item
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
    if (!(await assertTurnstile(req, res))) return;
    var b = req.body || {};
    if (b.website) return res.json({ ok: true });
    if (!hasPrivacyConsent(b)) {
      return res.status(400).json({ error: 'Aceite a política de privacidade para enviar.' });
    }
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
    var doacaoItem = {
      id: newFormId(),
      nome: nome,
      email: email,
      valorReais: reais,
      estado: 'pendente',
      lida: false,
      criadoEm: new Date().toISOString(),
      nota: 'Intenção registada no site — conclua o pagamento (PIX/gateway) por contacto direto com a associação.'
    };
    await appendRecord('pedidos_doacao', doacaoItem);
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

app.post('/api/inscricao/membro', requireCurrentMember, async function (req, res) {
  var payload = req.currentAuth.payload;
  try {
    var b = req.body || {};
    var usuario = payload.usuario;
    var result = await inscricaoSave.appendInscricao(
      { pgPool: pgPool, loadState: loadState, saveKey: saveKey, validate: inscricaoVal },
      b,
      usuario
    );
    if (!result.ok) {
      return res.status(result.status || 400).json({ error: result.error });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.delete('/api/inscricao/membro/:eventoId', requireCurrentMember, async function (req, res) {
  var payload = req.currentAuth.payload;
  try {
    var usuario = payload.usuario;
    var eventoId = req.params.eventoId;
    await deleteMemberRegistration(usuario, eventoId);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post('/api/member/mensagem', requireCurrentMember, async function (req, res) {
  var payload = req.currentAuth.payload;
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
      var voluntariadoItem = {
        id: newFormId(),
        tipo: 'voluntariado',
        membroUsuario: membroUsuario,
        membroNome: clampStr(membroNome, 200),
        area: area,
        mensagem: msgVol,
        criadoEm: new Date().toISOString(),
        lida: false
      };
      await appendRecord('mensagens_membros', voluntariadoItem);
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
    var suporteItem = {
      id: newFormId(),
      tipo: 'suporte',
      membroUsuario: membroUsuario,
      membroNome: clampStr(membroNome, 200),
      assunto: assunto,
      mensagem: msgSup,
      criadoEm: new Date().toISOString(),
      lida: false
    };
    await appendRecord('mensagens_membros', suporteItem);
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

app.post('/api/member/change-password', requireCurrentMember, async function (req, res) {
  var payload = req.currentAuth.payload;
  try {
    var b = req.body || {};
    var atual = b.senhaAtual != null ? String(b.senhaAtual) : '';
    var nova = b.senhaNova != null ? String(b.senhaNova) : '';
    if (!atual || !nova) return res.status(400).json({ error: 'Preencha a senha atual e a nova senha' });
    try {
      pwd.assertPasswordPolicy(nova);
    } catch (pe) {
      return res.status(pe.status || 400).json({ error: pe.message });
    }
    var state = await loadState();
    var members = state.members || [];
    var ix = members.findIndex(function (m) {
      return m.id === payload.sub;
    });
    if (ix < 0) return res.status(404).json({ error: 'Membro não encontrado' });
    var m = members[ix];
    if (!pwd.verifyPassword(atual, m.senha)) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }
    var updated = members.slice();
    updated[ix] = Object.assign({}, m, {
      senha: pwd.hashPassword(nova),
      sessionVersion: pwd.nextSessionVersion(m),
      resetTokenHash: undefined,
      resetExpires: undefined
    });
    await saveKey('members', updated);
    setSessionCookie(res, COOKIE_MEMBER, signMember(updated[ix]));
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

/** Pedido de recuperação de senha (membro). Resposta genérica por segurança. */
app.post('/api/auth/member-forgot', rateLimits.formPublico, async function (req, res) {
  try {
    var b = req.body || {};
    var usuario = clampStr(b.usuario, 120);
    var email = clampStr(b.email, 200).toLowerCase();
    if (!usuario && !email) {
      return res.status(400).json({ error: 'Informe o usuário ou o e-mail cadastrado.' });
    }
    var state = await loadState();
    var members = state.members || [];
    var found = members.find(function (m) {
      if (m.ativo === false) return false;
      if (usuario && m.usuario === usuario) return true;
      if (email && String(m.email || '').toLowerCase() === email) return true;
      return false;
    });
    if (found && smtpMail.sendPasswordResetEmail) {
      var token = crypto.randomBytes(32).toString('hex');
      var expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      var ix = members.findIndex(function (m) {
        return m.id === found.id;
      });
      if (ix >= 0) {
        var next = members.slice();
        next[ix] = Object.assign({}, found, {
          resetTokenHash: hashMemberResetToken(token),
          resetExpires: expires
        });
        await saveKey('members', next);
        var base = (process.env.SITE_PUBLIC_URL || '').trim().replace(/\/$/, '');
        var link = (base || '') + '/area-membros.html?reset=' + encodeURIComponent(token);
        smtpMail
          .sendPasswordResetEmail(found.email || email, found.nome || found.usuario, link)
          .catch(function (err) {
            console.error('[smtp]', err.message || err);
          });
      }
    }
    res.json({
      ok: true,
      message:
        'Se o utilizador existir e o e-mail estiver configurado, receberá instruções em breve.'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.post('/api/auth/member-reset', rateLimits.formPublico, async function (req, res) {
  try {
    var b = req.body || {};
    var token = b.token != null ? String(b.token).trim() : '';
    var nova = b.senhaNova != null ? String(b.senhaNova) : '';
    if (!token || !nova) return res.status(400).json({ error: 'Token e nova senha obrigatórios' });
    try {
      pwd.assertPasswordPolicy(nova);
    } catch (pe) {
      return res.status(pe.status || 400).json({ error: pe.message });
    }
    var hash = hashMemberResetToken(token);
    var state = await loadState();
    var members = state.members || [];
    var now = new Date().toISOString();
    var ix = members.findIndex(function (m) {
      return m.resetTokenHash === hash && m.resetExpires && String(m.resetExpires) > now;
    });
    if (ix < 0) return res.status(400).json({ error: 'Link inválido ou expirado. Solicite um novo.' });
    var m = members[ix];
    var updated = members.slice();
    updated[ix] = Object.assign({}, m, {
      senha: pwd.hashPassword(nova),
      sessionVersion: pwd.nextSessionVersion(m),
      resetTokenHash: undefined,
      resetExpires: undefined
    });
    await saveKey('members', updated);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message) });
  }
});

app.patch('/api/member/perfil', requireCurrentMember, async function (req, res) {
  var payload = req.currentAuth.payload;
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
 * Ficheiros estáticos só em public/ — backend, dados e testes ficam fora do static.
 * Bloqueios extra caso algum caminho sensível seja pedido explicitamente.
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
/** Sitemap com páginas estáticas + eventos/notícias/blog publicados. */
app.get('/sitemap.xml', rateLimits.publicGet, async function (req, res) {
  try {
    var state = await loadState();
    var pub = filterPublic(state);
    var base = (process.env.SITE_PUBLIC_URL || '').trim().replace(/\/$/, '');
    var paths = [
      '/index.html',
      '/eventos.html',
      '/noticias.html',
      '/blog.html',
      '/galeria.html',
      '/contato.html',
      '/voluntariado.html',
      '/filiacao.html',
      '/doar.html',
      '/privacidade.html'
    ];
    (pub.events || []).forEach(function (e) {
      if (e.id) paths.push('/evento.html?id=' + encodeURIComponent(String(e.id)));
    });
    (pub.news || []).forEach(function (n) {
      if (n.id) paths.push('/noticia.html?id=' + encodeURIComponent(String(n.id)));
    });
    (pub.blog || []).forEach(function (b) {
      if (b.id) paths.push('/blog-post.html?id=' + encodeURIComponent(String(b.id)));
    });
    var body = paths
      .map(function (p) {
        var loc = base ? base + p : p;
        return '<url><loc>' + loc.replace(/&/g, '&amp;') + '</loc><changefreq>weekly</changefreq></url>';
      })
      .join('');
    var xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      body +
      '</urlset>';
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
});

registerAdminRoutes(app, {
  authenticateCurrent: authenticateCurrent,
  clearInvalidSession: clearInvalidSession,
  signAdmin: signAdmin,
  setAdminSessionCookie: function (res, token) { setSessionCookie(res, COOKIE_ADMIN, token); },
  loadState: loadState,
  saveKey: saveKey,
  updateRecord: updateRecord,
  pwd: pwd,
  clampStr: clampStr
});

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

/** Documentos internos: exige permissao antes de servir ficheiro do disco. */
app.use('/uploads/documents', async function (req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  try {
    var filename = safeUploadFilename(req.path);
    if (!filename) return res.status(400).end();
    var root = path.resolve(__dirname, 'uploads', 'documents');
    var filePath = path.resolve(root, filename);
    if (filePath.indexOf(root + path.sep) !== 0) return res.status(400).end();
    if (!fs.existsSync(filePath)) return res.status(404).end();

    var state = await loadState();
    var publicUrl = '/uploads/documents/' + filename;
    var doc = documentRecordForUrl(state, publicUrl);
    var tokenPayload = verifyToken(req);
    var auth = null;
    if (tokenPayload && (tokenPayload.t === 'admin' || tokenPayload.t === 'member')) {
      auth = currentPrincipalFromState(req, tokenPayload.t, state);
    }
    var payload = auth && auth.payload;
    if (!canAccessDocumentUpload(payload, doc)) {
      return res.status(payload ? 403 : 401).json({ error: 'NÃ£o autorizado' });
    }
    if (filename.toLowerCase().endsWith('.pdf')) {
      res.setHeader('Content-Disposition', 'attachment');
    }
    return res.sendFile(filePath);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message) });
  }
});
app.use('/uploads/gallery', express.static(path.join(__dirname, 'uploads', 'gallery')));

app.use(
  express.static(PUBLIC_DIR, {
    index: ['index.html'],
    extensions: ['html']
  })
);

app.use(function (req, res) {
  if (req.path.indexOf('/api') === 0) {
    return res.status(404).json({ error: 'Not found' });
  }
  var p404 = path.join(PUBLIC_DIR, '404.html');
  if (fs.existsSync(p404) && req.accepts('html')) {
    return res.status(404).sendFile(p404);
  }
  res.status(404).send('Not found');
});

var envPort = process.env.PORT;
var portFixo = envPort !== undefined && envPort !== '';
var inicial = parseInt(portFixo ? envPort : envPort || '3000', 10);
var activeServer = null;

function iniciar(porta, tentativas) {
  var server = http.createServer(app);
  activeServer = server;
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

function shutdownHttpServer(signal) {
  console.log('[shutdown] Recebido ' + signal + ', encerrando servidor...');
  if (!activeServer) process.exit(0);
  var timeout = setTimeout(function () {
    process.exit(0);
  }, 2000);
  if (timeout.unref) timeout.unref();
  activeServer.close(function () {
    process.exit(0);
  });
}

var maxTentativas = portFixo ? 1 : 15;

function startHttpServer() {
  assertProductionConfig();
  console.log(
    '[startup] Node ' +
      process.version +
      ' | PORT=' +
      (process.env.PORT || '(auto)') +
      ' | DATABASE_URL=' +
      (process.env.DATABASE_URL ? 'sim' : 'não') +
      (process.env.RAILWAY_ENVIRONMENT ? ' | Railway' : '')
  );
  initDatabase()
    .then(function () {
      iniciar(inicial, maxTentativas);
    })
    .catch(function (err) {
      console.error('[db] Falha ao iniciar:', err && err.message ? err.message : err);
      if (err && err.stack) console.error(err.stack);
      if (isProductionRuntime()) {
        console.error('[db] ProduÃ§Ã£o: a aplicaÃ§Ã£o nÃ£o vai iniciar sem PostgreSQL.');
        process.exit(1);
      }
      pgPool = null;
      console.warn(
        '[db] A continuar sem PostgreSQL (dados em ficheiro local). Corrija DATABASE_URL no Railway.'
      );
      iniciar(inicial, maxTentativas);
    });
}

module.exports = { app: app, DATA_FILE: DATA_FILE };

if (require.main === module) {
  process.on('uncaughtException', function (err) {
    console.error('[fatal] uncaughtException:', err && err.stack ? err.stack : err);
    process.exit(1);
  });
  process.on('unhandledRejection', function (reason) {
    console.error('[fatal] unhandledRejection:', reason);
    process.exit(1);
  });
  process.on('SIGTERM', function () {
    shutdownHttpServer('SIGTERM');
  });
  process.on('SIGINT', function () {
    shutdownHttpServer('SIGINT');
  });
  startHttpServer();
}
