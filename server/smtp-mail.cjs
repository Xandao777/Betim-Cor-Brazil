'use strict';

/**
 * Notificações por e-mail (Nodemailer).
 *
 * Variáveis de ambiente:
 *   SMTP_HOST          — servidor (ex.: smtp.gmail.com, smtp.sendgrid.net)
 *   SMTP_PORT          — porta (587 com STARTTLS, ou 465 SSL)
 *   SMTP_SECURE        — "1" ou "true" para SSL na ligação (típico na porta 465)
 *   SMTP_USER          — utilizador SMTP
 *   SMTP_PASS          — palavra-passe ou app password
 *   SMTP_FROM          — remetente (ex.: "Associação <contato@dominio.org>"); por omissão SMTP_USER
 *   SMTP_NOTIFY_TO     — destinatário(s) das notificações, separados por vírgula
 *                        (se vazio, usa o e-mail institucional do painel)
 *   SMTP_AUTO_REPLY_CONTATO — "1" envia cópia de confirmação ao visitante no formulário de contato
 *   SMTP_TLS_INSECURE  — "1" desativa verificação do certificado TLS (só para testes / servidores com cert inválido)
 */

var nodemailer = require('nodemailer');

var missingConfigLogged = false;
var missingRecipientLogged = false;
/** undefined = ainda não avaliado; null = SMTP não configurado; object = transporter Nodemailer */
var transporterCache;

function smtpOptions() {
  var host = (process.env.SMTP_HOST || '').trim();
  if (!host) return null;
  var user = (process.env.SMTP_USER || '').trim();
  var pass = process.env.SMTP_PASS || '';
  if (!user) return null;

  var port = parseInt(process.env.SMTP_PORT || '587', 10);
  if (isNaN(port) || port < 1) port = 587;

  var secureEnv = process.env.SMTP_SECURE;
  var secure;
  if (secureEnv === '1' || secureEnv === 'true') secure = true;
  else if (secureEnv === '0' || secureEnv === 'false') secure = false;
  else secure = port === 465;

  var tls =
    process.env.SMTP_TLS_INSECURE === '1'
      ? { rejectUnauthorized: false }
      : undefined;

  return {
    host: host,
    port: port,
    secure: secure,
    auth: { user: user, pass: pass },
    tls: tls
  };
}

function getTransporter() {
  if (transporterCache === null) return null;
  if (transporterCache) return transporterCache;
  var opts = smtpOptions();
  if (!opts) {
    transporterCache = null;
    return null;
  }
  transporterCache = nodemailer.createTransport(opts);
  return transporterCache;
}

function logMissingConfigOnce() {
  if (process.env.NODE_ENV === 'test') return;
  if (missingConfigLogged) return;
  missingConfigLogged = true;
  console.warn(
    '[smtp] Envio desativado: defina SMTP_HOST, SMTP_USER e SMTP_PASS (e opcionalmente SMTP_NOTIFY_TO / SMTP_FROM).'
  );
}

function parseNotifyTo(str) {
  if (!str || !String(str).trim()) return [];
  return String(str)
    .split(',')
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean);
}

function validEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function resolveRecipients(institutional) {
  var fromEnv = parseNotifyTo(process.env.SMTP_NOTIFY_TO);
  if (fromEnv.length) return fromEnv.filter(validEmail);
  var inst = institutional && institutional.email ? String(institutional.email).trim() : '';
  if (validEmail(inst)) return [inst];
  return [];
}

function getFromAddress() {
  var f = (process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();
  return f || null;
}

/**
 * @param {object} opts
 * @param {string} opts.subject
 * @param {string} opts.text
 * @param {string} [opts.html]
 * @param {string} [opts.replyTo]
 * @param {object} [opts.institutional] — state.institutional
 * @returns {Promise<{ ok?: boolean, skipped?: boolean, reason?: string }>}
 */
async function sendAdminNotification(opts) {
  var transport = getTransporter();
  if (!transport) {
    logMissingConfigOnce();
    return { skipped: true, reason: 'smtp_not_configured' };
  }

  var from = getFromAddress();
  if (!from) {
    logMissingConfigOnce();
    return { skipped: true, reason: 'no_from' };
  }

  var to = resolveRecipients(opts.institutional);
  if (!to.length) {
    if (!missingRecipientLogged && process.env.NODE_ENV !== 'test') {
      missingRecipientLogged = true;
      console.warn(
        '[smtp] Nenhum destinatário: defina SMTP_NOTIFY_TO ou o e-mail institucional no painel.'
      );
    }
    return { skipped: true, reason: 'no_recipient' };
  }

  await transport.sendMail({
    from: from,
    to: to.join(', '),
    replyTo: opts.replyTo && validEmail(opts.replyTo) ? opts.replyTo.trim() : undefined,
    subject: opts.subject,
    text: opts.text,
    html: opts.html || undefined
  });
  return { ok: true };
}

async function sendVisitorAutoReply(toEmail, nome) {
  if (process.env.SMTP_AUTO_REPLY_CONTATO !== '1') return { skipped: true };
  if (!validEmail(toEmail)) return { skipped: true };
  var transport = getTransporter();
  if (!transport) return { skipped: true };
  var from = getFromAddress();
  if (!from) return { skipped: true };

  var nomeLinha = nome ? 'Olá, ' + nome + '.\n\n' : 'Olá.\n\n';
  var text =
    nomeLinha +
    'Recebemos a sua mensagem pelo site da associação. A equipa irá analisar e responder quando possível.\n\n' +
    'Obrigado pelo contacto.';

  await transport.sendMail({
    from: from,
    to: toEmail.trim(),
    subject: 'Recebemos a sua mensagem',
    text: text
  });
  return { ok: true };
}

/**
 * Dispara e-mails após gravar formulários (falhas só em log).
 * @param {object} params
 * @param {'contato'|'doacao'|'membro_voluntariado'|'membro_suporte'} params.type
 * @param {object} params.institutional
 * @param {object} params.data
 */
async function notifyAfterFormSubmit(params) {
  var inst = params.institutional || {};
  var d = params.data || {};
  var type = params.type;

  if (type === 'contato') {
    await sendAdminNotification({
      institutional: inst,
      replyTo: d.email,
      subject: '[Site] Nova mensagem de contato — ' + (d.assunto || ''),
      text:
        'Nova mensagem pelo formulário de contato.\n\n' +
        'Nome: ' +
        (d.nome || '') +
        '\n' +
        'E-mail: ' +
        (d.email || '') +
        '\n' +
        'Assunto: ' +
        (d.assunto || '') +
        '\n\n' +
        'Mensagem:\n' +
        (d.mensagem || '')
    });
    await sendVisitorAutoReply(d.email, d.nome);
    return;
  }

  if (type === 'doacao') {
    await sendAdminNotification({
      institutional: inst,
      replyTo: d.email,
      subject: '[Site] Novo pedido de doação — R$ ' + String(d.valorReais != null ? d.valorReais : ''),
      text:
        'Novo pedido de doação registado no site.\n\n' +
        'Nome: ' +
        (d.nome || '(não informado)') +
        '\n' +
        'E-mail: ' +
        (d.email || '') +
        '\n' +
        'Valor (R$): ' +
        String(d.valorReais != null ? d.valorReais : '') +
        '\n'
    });
    return;
  }

  if (type === 'membro_voluntariado') {
    await sendAdminNotification({
      institutional: inst,
      replyTo: d.membroEmail,
      subject: '[Site] Voluntariado — ' + (d.membroNome || d.membroUsuario || ''),
      text:
        'Manifestação de interesse em voluntariado (área de membros).\n\n' +
        'Membro: ' +
        (d.membroNome || '') +
        ' (' +
        (d.membroUsuario || '') +
        ')\n' +
        'E-mail: ' +
        (d.membroEmail || '') +
        '\n' +
        'Área: ' +
        (d.area || '') +
        '\n\n' +
        'Mensagem:\n' +
        (d.mensagem || '')
    });
    return;
  }

  if (type === 'membro_suporte') {
    await sendAdminNotification({
      institutional: inst,
      replyTo: d.membroEmail,
      subject: '[Site] Suporte membro — ' + (d.assunto || ''),
      text:
        'Mensagem de suporte (área de membros).\n\n' +
        'Membro: ' +
        (d.membroNome || '') +
        ' (' +
        (d.membroUsuario || '') +
        ')\n' +
        'E-mail: ' +
        (d.membroEmail || '') +
        '\n' +
        'Assunto: ' +
        (d.assunto || '') +
        '\n\n' +
        'Mensagem:\n' +
        (d.mensagem || '')
    });
  }
}

module.exports = {
  sendAdminNotification: sendAdminNotification,
  notifyAfterFormSubmit: notifyAfterFormSubmit,
  smtpOptions: smtpOptions
};
