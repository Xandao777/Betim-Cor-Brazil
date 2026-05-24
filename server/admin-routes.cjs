'use strict';

/**
 * Rotas extra do painel admin (Railway-only: usa Postgres/arquivo existente).
 */
function registerAdminRoutes(app, deps) {
  var verifyToken = deps.verifyToken;
  var loadState = deps.loadState;
  var saveKey = deps.saveKey;
  var pwd = deps.pwd;
  var clampStr = deps.clampStr;

  function requireAdmin(req, res, next) {
    var payload = verifyToken(req);
    if (!payload || payload.t !== 'admin') {
      return res.status(401).json({ error: 'Não autorizado' });
    }
    req.adminPayload = payload;
    next();
  }

  function requireAdminRole(req, res, next) {
    var payload = req.adminPayload;
    if ((payload.perfil || 'editor') !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem executar esta ação' });
    }
    next();
  }

  /** Marcar mensagem de formulário como lida (admin ou editor). */
  app.post('/api/admin/mark-read', requireAdmin, async function (req, res) {
    try {
      var b = req.body || {};
      var collection = b.collection;
      var msgId = b.id != null ? String(b.id) : '';
      var lida = b.lida !== false;
      if (
        collection !== 'mensagens_contato' &&
        collection !== 'mensagens_membros' &&
        collection !== 'pedidos_doacao'
      ) {
        return res.status(400).json({ error: 'Coleção inválida' });
      }
      if (!msgId) return res.status(400).json({ error: 'ID obrigatório' });
      var state = await loadState();
      var list = state[collection] || [];
      var found = false;
      var nextList = list.map(function (m) {
        if (String(m.id) !== msgId) return m;
        found = true;
        return Object.assign({}, m, { lida: lida });
      });
      if (!found) return res.status(404).json({ error: 'Mensagem não encontrada' });
      await saveKey(collection, nextList);
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  });

  /** Alterar senha do utilizador admin logado. */
  app.post('/api/admin/change-password', requireAdmin, async function (req, res) {
    try {
      var b = req.body || {};
      var atual = b.senhaAtual != null ? String(b.senhaAtual) : '';
      var nova = b.senhaNova != null ? String(b.senhaNova) : '';
      if (!atual || !nova) return res.status(400).json({ error: 'Preencha a senha atual e a nova senha' });
      if (nova.length < 6) return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres' });
      var payload = req.adminPayload;
      var state = await loadState();
      var users = state.admin_users || [];
      var ix = users.findIndex(function (u) {
        return u.usuario === payload.usuario;
      });
      if (ix < 0) return res.status(404).json({ error: 'Utilizador não encontrado' });
      var u = users[ix];
      if (!pwd.verifyPassword(atual, u.senha)) {
        return res.status(401).json({ error: 'Senha atual incorreta' });
      }
      var updated = users.slice();
      updated[ix] = Object.assign({}, u, { senha: pwd.hashPassword(nova) });
      await saveKey('admin_users', updated);
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  });

  /** Backup JSON completo (sem hashes de senha). Só admin. */
  app.get('/api/admin/backup', requireAdmin, requireAdminRole, async function (req, res) {
    try {
      var state = await loadState();
      var safe = pwd.stripPasswordsFromState(state);
      var nome = 'backup-betim-cor-' + new Date().toISOString().slice(0, 10) + '.json';
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="' + nome + '"');
      res.send(JSON.stringify(safe, null, 2));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  });

  /** Últimas entradas do log de auditoria (só admin). Query: limit, desde, ate, usuario, chave. */
  app.get('/api/admin/audit-log', requireAdmin, requireAdminRole, async function (req, res) {
    try {
      var auditFilter = require('./audit-filter.cjs');
      var state = await loadState();
      var list = state.admin_audit_log || [];
      var entries = auditFilter.filterAuditEntries(list, req.query);
      res.json({ entries: entries });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  });

  /** Estado de deploy (SMTP, Turnstile, uploads, checklist — sem segredos). */
  app.get('/api/admin/status', requireAdmin, async function (req, res) {
    try {
      var deployStatus = require('./deploy-status.cjs');
      var state = await loadState();
      var status = deployStatus.buildDeployStatus(state);
      res.json(status);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  });

  /** Envia e-mail de teste SMTP (só admin). Body: { to?: email } */
  app.post('/api/admin/test-smtp', requireAdmin, requireAdminRole, async function (req, res) {
    try {
      var smtpMail = require('./smtp-mail.cjs');
      var state = await loadState();
      var b = req.body || {};
      var to = (b.to && String(b.to).trim()) || '';
      if (!to) {
        var recipients = smtpMail.resolveRecipients(state.institutional);
        to = recipients[0] || '';
      }
      if (!to) {
        return res.status(400).json({
          error: 'Defina SMTP_NOTIFY_TO no Railway ou o e-mail institucional no painel.'
        });
      }
      var result = await smtpMail.sendTestEmail(to, state.institutional);
      if (!result.ok) {
        var msg =
          result.error === 'smtp_not_configured'
            ? 'SMTP não configurado (SMTP_HOST, SMTP_USER, SMTP_PASS).'
            : result.error === 'invalid_email'
              ? 'E-mail de destino inválido.'
              : 'Não foi possível enviar o e-mail de teste.';
        return res.status(400).json({ error: msg });
      }
      res.json({ ok: true, to: result.to });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: String(e.message) });
    }
  });
}

module.exports = { registerAdminRoutes: registerAdminRoutes };
