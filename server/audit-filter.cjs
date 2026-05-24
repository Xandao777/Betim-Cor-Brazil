'use strict';

/** ISO início do dia UTC a partir de YYYY-MM-DD */
function parseDesde(isoDate) {
  var s = String(isoDate || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s + 'T00:00:00.000Z';
}

/** ISO fim do dia UTC a partir de YYYY-MM-DD */
function parseAte(isoDate) {
  var s = String(isoDate || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s + 'T23:59:59.999Z';
}

function filterAuditEntries(list, query) {
  if (!Array.isArray(list)) return [];
  var out = list.slice();
  var desde = parseDesde(query.desde);
  var ate = parseAte(query.ate);
  var usuario = String(query.usuario || '')
    .trim()
    .toLowerCase();
  var chave = String(query.chave || '')
    .trim()
    .toLowerCase();
  if (desde) {
    out = out.filter(function (e) {
      return e && e.em && e.em >= desde;
    });
  }
  if (ate) {
    out = out.filter(function (e) {
      return e && e.em && e.em <= ate;
    });
  }
  if (usuario) {
    out = out.filter(function (e) {
      return String((e && e.usuario) || '')
        .toLowerCase()
        .indexOf(usuario) !== -1;
    });
  }
  if (chave) {
    out = out.filter(function (e) {
      return String((e && e.chave) || '')
        .toLowerCase()
        .indexOf(chave) !== -1;
    });
  }
  var limit = Math.min(parseInt(query.limit, 10) || 80, 200);
  if (!limit || limit < 1) limit = 80;
  return out.slice(0, limit);
}

module.exports = { filterAuditEntries: filterAuditEntries, parseDesde: parseDesde, parseAte: parseAte };
