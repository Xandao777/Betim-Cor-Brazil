'use strict';

/**
 * Dados expostos em GET /api/public (sem conteúdo exclusivo de membros nem rascunhos).
 */
function filterPublic(state) {
  var s = state || {};
  return {
    events: (s.events || []).filter(function (e) {
      return e.publicado !== false;
    }),
    news: (s.news || []).filter(function (n) {
      return n.publicado !== false && !n.exclusivoMembros;
    }),
    blog: (s.blog || []).filter(function (b) {
      return b.publicado !== false;
    }),
    gallery: s.gallery || [],
    sponsors: s.sponsors || [],
    institutional: s.institutional || {}
  };
}

module.exports = { filterPublic: filterPublic };
