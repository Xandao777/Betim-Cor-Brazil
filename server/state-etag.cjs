'use strict';

var crypto = require('crypto');

function etagForPayload(payload) {
  var s = JSON.stringify(payload == null ? null : payload);
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 24);
}

function keyEtags(state, keys) {
  var out = {};
  (keys || []).forEach(function (k) {
    if (state[k] !== undefined) out[k] = etagForPayload(state[k]);
  });
  return out;
}

module.exports = {
  etagForPayload: etagForPayload,
  keyEtags: keyEtags
};
