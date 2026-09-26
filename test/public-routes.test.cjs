'use strict';

const publicRoutes = require('../server/public-routes.cjs');

describe('public-routes', function () {
  test('sitemap inclui detalhes publicados com URLs absolutas', function () {
    var xml = publicRoutes.sitemapXml({
      events: [{ id: 'evento 1' }],
      news: [{ id: 'noticia&1' }],
      blog: [{ id: 'post-1' }]
    }, 'https://exemplo.org/');
    expect(xml).toContain('https://exemplo.org/evento.html?id=evento%201');
    expect(xml).toContain('noticia.html?id=noticia%261');
    expect(xml).toContain('blog-post.html?id=post-1');
  });
});
