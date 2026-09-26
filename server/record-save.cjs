'use strict';

var pgStore = require('./pg-store.cjs');
var locks = Object.create(null);

function withKeyLock(key, fn) {
  var previous = locks[key] || Promise.resolve();
  var run = previous.then(fn);
  locks[key] = run.catch(function () {});
  return run;
}

async function appendRecord(deps, key, item) {
  if (deps.pgPool) return pgStore.appendRecord(deps.pgPool, key, item);
  return withKeyLock(key, async function () {
    var state = await deps.loadState();
    var list = Array.isArray(state[key]) ? state[key].slice() : [];
    list.push(item);
    await deps.saveKey(key, list);
    return item;
  });
}

async function updateRecord(deps, key, id, patch) {
  if (deps.pgPool) return pgStore.updateRecord(deps.pgPool, key, id, patch);
  return withKeyLock(key, async function () {
    var state = await deps.loadState();
    var found = null;
    var list = (state[key] || []).map(function (item) {
      if (String(item.id) !== String(id)) return item;
      found = Object.assign({}, item, patch || {});
      return found;
    });
    if (!found) return null;
    await deps.saveKey(key, list);
    return found;
  });
}

async function deleteMemberRegistration(deps, usuario, eventoId) {
  if (deps.pgPool) {
    return pgStore.deleteMemberRegistration(deps.pgPool, usuario, eventoId);
  }
  return withKeyLock('inscricoes', async function () {
    var state = await deps.loadState();
    var before = state.inscricoes || [];
    var list = before.filter(function (item) {
      return !(
        item.membroUsuario === usuario && String(item.eventoId) === String(eventoId)
      );
    });
    await deps.saveKey('inscricoes', list);
    return before.length - list.length;
  });
}

module.exports = {
  withKeyLock: withKeyLock,
  appendRecord: appendRecord,
  updateRecord: updateRecord,
  deleteMemberRegistration: deleteMemberRegistration
};
