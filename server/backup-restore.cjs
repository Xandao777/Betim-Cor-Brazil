'use strict';

function validationError(message) {
  var error = new Error(message);
  error.status = 400;
  return error;
}

function backupData(input) {
  var data = input && input.data && typeof input.data === 'object' ? input.data : input;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw validationError('Backup inválido.');
  }
  if (!Array.isArray(data.events) || !Array.isArray(data.admin_users)) {
    throw validationError('Backup incompleto: eventos e utilizadores administrativos são obrigatórios.');
  }
  if (!data.institutional || typeof data.institutional !== 'object') {
    throw validationError('Backup incompleto: dados institucionais ausentes.');
  }
  return data;
}

function restorePasswords(current, incoming, kind) {
  var previous = Array.isArray(current) ? current : [];
  var skipped = 0;
  var restored = (Array.isArray(incoming) ? incoming : []).map(function (item) {
    var out = Object.assign({}, item || {});
    var existing = previous.find(function (candidate) {
      return (
        (out.id != null && String(candidate.id) === String(out.id)) ||
        (out.usuario && String(candidate.usuario).toLowerCase() === String(out.usuario).toLowerCase())
      );
    });
    if (!out.senha && existing && existing.senha) {
      out.senha = existing.senha;
      out.sessionVersion = existing.sessionVersion;
    }
    if (!out.senha) {
      skipped += 1;
      return null;
    }
    return out;
  }).filter(Boolean);

  if (kind === 'admin_users' && !restored.some(function (u) { return u.perfil === 'admin'; })) {
    throw validationError('A restauração precisa manter pelo menos um administrador com credenciais válidas.');
  }
  return { list: restored, skipped: skipped };
}

function prepareRestore(input, current, keys, mergeDefaults) {
  var data = backupData(input);
  var selected = {};
  keys.forEach(function (key) {
    if (data[key] !== undefined) selected[key] = data[key];
  });
  var state = mergeDefaults(selected);
  var admins = restorePasswords(current.admin_users, state.admin_users, 'admin_users');
  var members = restorePasswords(current.members, state.members, 'members');
  state.admin_users = admins.list;
  state.members = members.list;
  return {
    state: state,
    warnings: {
      adminUsersWithoutCredentials: admins.skipped,
      membersWithoutCredentials: members.skipped
    }
  };
}

function createBackup(state, stripPasswords) {
  return {
    format: 'betim-cor-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    credentialsIncluded: false,
    data: stripPasswords(state)
  };
}

module.exports = {
  createBackup: createBackup,
  prepareRestore: prepareRestore
};
