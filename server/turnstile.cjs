'use strict';

/**
 * Cloudflare Turnstile (opcional). Sem TURNSTILE_SECRET_KEY, a verificação é ignorada.
 */
function isEnabled() {
  return !!(process.env.TURNSTILE_SECRET_KEY || '').trim();
}

function siteKey() {
  return (process.env.TURNSTILE_SITE_KEY || '').trim() || null;
}

async function verifyToken(token, remoteIp) {
  if (!isEnabled()) return true;
  var t = token != null ? String(token).trim() : '';
  if (!t) return false;
  var secret = process.env.TURNSTILE_SECRET_KEY.trim();
  var body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', t);
  if (remoteIp) body.set('remoteip', String(remoteIp));
  try {
    var res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });
    var data = await res.json();
    return !!data.success;
  } catch (e) {
    console.error('[turnstile]', e.message || e);
    return false;
  }
}

function failIfInvalid(res) {
  return res.status(400).json({
    error: 'Confirme o desafio de segurança (CAPTCHA) e tente novamente.'
  });
}

module.exports = {
  isEnabled: isEnabled,
  siteKey: siteKey,
  verifyToken: verifyToken,
  failIfInvalid: failIfInvalid
};
