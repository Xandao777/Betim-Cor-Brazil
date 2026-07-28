'use strict';

var stateCleanup = require('../server/state-cleanup.cjs');
var fs = require('fs');
var path = require('path');
var os = require('os');

describe('state-cleanup', function () {
  test('remove galeria com ficheiro local em falta', function () {
    var root = path.join(os.tmpdir(), 'bcb-cleanup-' + Date.now());
    var galleryDir = path.join(root, 'uploads', 'gallery');
    fs.mkdirSync(galleryDir, { recursive: true });
    var state = {
      gallery: [
        { id: '1', url: '/uploads/gallery/existe.png', titulo: 'OK' },
        { id: '2', url: '/uploads/gallery/falta.png', titulo: 'Quebrado' }
      ]
    };
    fs.writeFileSync(path.join(galleryDir, 'existe.png'), 'x');
    var out = stateCleanup.cleanupGallery(state, root);
    expect(out.gallery.length).toBe(1);
    expect(out.gallery[0].url).toContain('existe.png');
    fs.rmSync(root, { recursive: true, force: true });
  });
});
