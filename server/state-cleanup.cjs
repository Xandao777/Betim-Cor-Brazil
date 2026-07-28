'use strict';

var fs = require('fs');
var path = require('path');

/**
 * Remove entradas de galeria com ficheiro local em falta (evita 404 no browser).
 * @param {object} state
 * @param {string} projectRoot
 */
function cleanupGallery(state, projectRoot) {
  if (!state || !Array.isArray(state.gallery)) return state;
  state.gallery = state.gallery.filter(function (g) {
    var u = (g && g.url ? String(g.url) : '').trim();
    if (!u) return true;
    if (u.indexOf('/uploads/gallery/') !== 0) return true;
    var rel = u.replace(/^\//, '');
    var disk = path.join(projectRoot, rel);
    try {
      return fs.existsSync(disk);
    } catch (_e) {
      return true;
    }
  });
  return state;
}

module.exports = {
  cleanupGallery: cleanupGallery
};
