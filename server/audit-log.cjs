'use strict';

var MAX_ENTRIES = 300;

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

module.exports = { appendAudit: appendAudit, MAX_ENTRIES: MAX_ENTRIES };
