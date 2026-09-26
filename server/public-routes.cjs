'use strict';

var fs = require('fs');
var path = require('path');
var deployStatus = require('./deploy-status.cjs');
var seoRender = require('./seo-render.cjs');

var DETAIL_PAGES = {
  '/evento.html': { key: 'events', file: 'evento.html', schemaType: 'Event', targetId: 'evento-detalhe' },
  '/noticia.html': { key: 'news', file: 'noticia.html', schemaType: 'NewsArticle', targetId: 'noticia-artigo' },
  '/blog-post.html': { key: 'blog', file: 'blog-post.html', schemaType: 'BlogPosting', targetId: 'blog-post-artigo' }
};

function sitemapXml(publicState, base) {
  var paths = [
    '/index.html', '/eventos.html', '/noticias.html', '/blog.html', '/galeria.html',
    '/contato.html', '/voluntariado.html', '/filiacao.html', '/doar.html', '/privacidade.html'
  ];
  (publicState.events || []).forEach(function (item) {
    if (item.id) paths.push('/evento.html?id=' + encodeURIComponent(String(item.id)));
  });
  (publicState.news || []).forEach(function (item) {
    if (item.id) paths.push('/noticia.html?id=' + encodeURIComponent(String(item.id)));
  });
  (publicState.blog || []).forEach(function (item) {
    if (item.id) paths.push('/blog-post.html?id=' + encodeURIComponent(String(item.id)));
  });
  var root = String(base || '').trim().replace(/\/$/, '');
  var body = paths.map(function (itemPath) {
    var loc = root ? root + itemPath : itemPath;
    return '<url><loc>' + loc.replace(/&/g, '&amp;') + '</loc><changefreq>weekly</changefreq></url>';
  }).join('');
  return '<?xml version="1.0" encoding="UTF-8"?>' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + body + '</urlset>';
}

function registerPublicRoutes(app, deps) {
  var logoPath = path.join(deps.publicDir, 'img', 'logo.jpg');
  app.get('/favicon.ico', function (_req, res) {
    if (!fs.existsSync(logoPath)) return res.status(204).end();
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(logoPath).pipe(res);
  });
  app.get('/apple-touch-icon.png', function (_req, res) {
    if (!fs.existsSync(logoPath)) return res.status(404).end();
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(logoPath).pipe(res);
  });

  app.get('/api/health', deps.rateLimits.publicGet, async function (req, res) {
    var brief = deployStatus.buildDeployStatus();
    var databaseOk = true;
    var pgPool = deps.getPgPool();
    if (pgPool) {
      try { await pgPool.query('SELECT 1'); }
      catch (error) {
        databaseOk = false;
        deps.opsLog.error('health.database_failed', error, { requestId: req.requestId });
      }
    }
    res.status(databaseOk ? 200 : 503).json({
      ok: databaseOk,
      backend: pgPool ? 'postgres' : 'file',
      database: databaseOk ? 'ok' : 'error',
      uptimeSeconds: Math.floor(process.uptime()),
      smtp: brief.smtp,
      turnstile: brief.turnstile,
      uploads: brief.uploads
    });
  });

  app.get('/api/config', deps.rateLimits.publicGet, function (_req, res) {
    res.json({ turnstileSiteKey: deps.turnstile.siteKey() });
  });

  app.get('/api/public', deps.rateLimits.publicGet, async function (req, res) {
    try {
      var state = await deps.loadState();
      var etag = 'W/"pub-' + deps.getPublicRevision() + '"';
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
      if (req.get('If-None-Match') === etag) return res.status(304).end();
      res.json(deps.filterPublic(state));
    } catch (error) {
      res.status(error.status || 500).json({ error: String(error.message) });
    }
  });

  app.get(Object.keys(DETAIL_PAGES), deps.rateLimits.publicGet, async function (req, res, next) {
    try {
      var config = DETAIL_PAGES[req.path];
      var id = String(req.query.id || '');
      if (!config || !id) return next();
      var state = deps.filterPublic(await deps.loadState());
      var item = (state[config.key] || []).find(function (entry) { return String(entry.id) === id; });
      if (!item) return next();
      var template = await fs.promises.readFile(path.join(deps.publicDir, config.file), 'utf8');
      var html = seoRender.render(template, {
        title: item.titulo + ' | Associação Betim Cor Brazil',
        description: item.resumo || item.descricao || item.conteudo || 'Conteúdo da Associação Betim Cor Brazil.',
        image: item.imagemCapa || '',
        date: item.dataPublicacao || item.data || '',
        location: item.local || undefined,
        path: req.path + '?id=' + encodeURIComponent(id),
        base: (process.env.SITE_PUBLIC_URL || '').trim(),
        schemaType: config.schemaType,
        targetId: config.targetId
      });
      res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
      res.type('html').send(html);
    } catch (error) { next(error); }
  });

  app.get('/sitemap.xml', deps.rateLimits.publicGet, async function (_req, res) {
    try {
      var state = deps.filterPublic(await deps.loadState());
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(sitemapXml(state, process.env.SITE_PUBLIC_URL));
    } catch (_error) {
      res.status(500).end();
    }
  });
}

module.exports = { registerPublicRoutes: registerPublicRoutes, sitemapXml: sitemapXml };
