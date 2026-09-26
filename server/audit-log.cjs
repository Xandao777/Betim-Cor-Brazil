'use strict';

var MAX_ENTRIES = 300;

function changeSummary(before, after) {
  if (Array.isArray(before) && Array.isArray(after)) {
    var beforeIds = {};
    var afterIds = {};
    before.forEach(function (item) { if (item && item.id != null) beforeIds[String(item.id)] = true; });
    after.forEach(function (item) { if (item && item.id != null) afterIds[String(item.id)] = true; });
    var added = Object.keys(afterIds).filter(function (id) { return !beforeIds[id]; });
    var removed = Object.keys(beforeIds).filter(function (id) { return !afterIds[id]; });
    return { tipo: 'lista', antes: before.length, depois: after.length, adicionados: added.slice(0, 10), removidos: removed.slice(0, 10) };
  }
  var a = before && typeof before === 'object' ? before : {};
  var b = after && typeof after === 'object' ? after : {};
  var keys = Array.from(new Set(Object.keys(a).concat(Object.keys(b))));
  var changed = keys.filter(function (key) {
    return JSON.stringify(a[key]) !== JSON.stringify(b[key]);
  });
  return { tipo: 'objeto', camposAlterados: changed.slice(0, 20) };
}

function appendAudit(state, entry) {
  var list = Array.isArray(state.admin_audit_log) ? state.admin_audit_log.slice() : [];
  list.unshift(
    Object.assign(
      {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        em: new Date().toISOString()
      },
      entry
    )
  );
  if (list.length > MAX_ENTRIES) list = list.slice(0, MAX_ENTRIES);
  return list;
}

module.exports = { appendAudit: appendAudit, changeSummary: changeSummary, MAX_ENTRIES: MAX_ENTRIES };
