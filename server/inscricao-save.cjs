'use strict';

var crypto = require('crypto');
var pgStore = require('./pg-store.cjs');
var recordSave = require('./record-save.cjs');

function buildInscricaoItem(valid, body, membroUsuario) {
  var ev = valid.evento;
  var item = {
    id: crypto.randomUUID(),
    eventoId: body.eventoId,
    eventoTitulo: ev.titulo || body.eventoTitulo || '',
    eventoData: ev.data || body.eventoData || '',
    eventoHora: ev.hora || body.eventoHora || '',
    eventoLocal: ev.local || body.eventoLocal || '',
    dataInscricao: new Date().toISOString().slice(0, 10)
  };
  if (membroUsuario) {
    item.membroUsuario = membroUsuario;
  } else {
    item.nome = valid.nome;
    item.email = valid.email;
    item.telefone = valid.telefone || '';
  }
  return item;
}

/**
 * Grava inscrição com validação + lock (Postgres) ou fila (arquivo).
 * @returns {Promise<{ok:boolean, status?:number, error?:string, item?:object, state?:object}>}
 */
async function appendInscricao(deps, body, membroUsuario) {
  var pgPool = deps.pgPool;
  var loadState = deps.loadState;
  var saveKey = deps.saveKey;
  var validate = deps.validate;

  if (pgPool) {
    return pgStore.appendInscricaoAtomic(pgPool, body, membroUsuario, validate, buildInscricaoItem);
  }

  return recordSave.withKeyLock('inscricoes', async function () {
    var state = await loadState();
    var valid = membroUsuario
      ? validate.validateInscricaoMembro(state, body, membroUsuario)
      : validate.validateInscricaoPublica(state, body);
    if (!valid.ok) return valid;
    var list = (state.inscricoes || []).slice();
    var item = buildInscricaoItem(valid, body, membroUsuario);
    list.push(item);
    await saveKey('inscricoes', list);
    return { ok: true, item: item, state: state };
  });
}

module.exports = {
  appendInscricao: appendInscricao,
  buildInscricaoItem: buildInscricaoItem
};
