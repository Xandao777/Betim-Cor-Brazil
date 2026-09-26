'use strict';

const seo = require('../server/seo-render.cjs');

describe('seo-render', function () {
  test('gera metadados sociais, canonical e JSON-LD seguros', function () {
    var template = '<html><head><title>Antigo</title><meta name="description" content="x"><meta property="og:title" content="x"><meta property="og:description" content="x"><meta property="og:type" content="website"></head><body><article id="conteudo"></article></body></html>';
    var html = seo.render(template, {
      title: 'Evento & Especial',
      description: '<p>Uma descrição pública</p>',
      image: '/img/capa.jpg',
      path: '/evento.html?id=1',
      base: 'https://exemplo.org',
      schemaType: 'Event',
      targetId: 'conteudo'
    });
    expect(html).toContain('<title>Evento &amp; Especial</title>');
    expect(html).toContain('https://exemplo.org/evento.html?id=1');
    expect(html).toContain('https://exemplo.org/img/capa.jpg');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('<article id="conteudo"><h1>Evento &amp; Especial</h1>');
    expect(html).not.toContain('<title>Evento & Especial>');
  });

  test('converte conteúdo HTML em descrição simples', function () {
    expect(seo.plainText('<p>Olá <strong>mundo</strong></p>')).toBe('Olá mundo');
  });
});
