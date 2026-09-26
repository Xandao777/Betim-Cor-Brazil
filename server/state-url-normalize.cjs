'use strict';

var urlRules = require('./institutional-validate.cjs');

function normalizeList(list, fields) {
  if (!Array.isArray(list)) {
    var err = new Error('Payload inválido: era esperada uma lista.');
    err.status = 400;
    throw err;
  }
  return list.map(function (item) {
    var out = Object.assign({}, item || {});
    fields.forEach(function (field) {
      out[field] = urlRules.safeUrlOrRelative(out[field]);
    });
    return out;
  });
}

function normalizeStateUrls(key, payload) {
  var fieldsByKey = {
    events: ['imagemCapa'],
    news: ['imagemCapa'],
    blog: ['imagemCapa'],
    gallery: ['url'],
    documents: ['arquivo'],
    sponsors: ['logo', 'url'],
    members: ['foto']
  };
  var fields = fieldsByKey[key];
  return fields ? normalizeList(payload, fields) : payload;
}

module.exports = { normalizeStateUrls: normalizeStateUrls };
