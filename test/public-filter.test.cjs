'use strict';

var { filterPublic } = require('../server/public-filter.cjs');

describe('public-filter', function () {
  test('remove notícias exclusivoMembros e não publicadas', function () {
    var out = filterPublic({
      news: [
        { id: '1', titulo: 'Pública', publicado: true, exclusivoMembros: false },
        { id: '2', titulo: 'Só membros', publicado: true, exclusivoMembros: true },
        { id: '3', titulo: 'Rascunho', publicado: false, exclusivoMembros: false }
      ],
      events: [{ id: 'e1', titulo: 'Ev', publicado: false }, { id: 'e2', titulo: 'Ok', publicado: true }]
    });
    expect(out.news).toHaveLength(1);
    expect(out.news[0].titulo).toBe('Pública');
    expect(out.events).toHaveLength(1);
    expect(out.events[0].titulo).toBe('Ok');
  });
});
