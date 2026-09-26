'use strict';

var normalize = require('../server/state-url-normalize.cjs').normalizeStateUrls;

describe('normalização de URLs do estado', function () {
  test('remove protocolos executáveis de mídia e documentos', function () {
    expect(normalize('gallery', [{ id: '1', url: 'javascript:alert(1)' }])[0].url).toBe('');
    expect(normalize('documents', [{ id: '1', arquivo: 'data:text/html,x' }])[0].arquivo).toBe('');
  });

  test('mantém HTTPS e caminhos locais', function () {
    expect(normalize('sponsors', [{ logo: '/uploads/logo.png', url: 'https://exemplo.org' }]))
      .toEqual([{ logo: '/uploads/logo.png', url: 'https://exemplo.org' }]);
  });
});
