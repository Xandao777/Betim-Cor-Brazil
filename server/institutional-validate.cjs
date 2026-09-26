'use strict';

function clampStr(v, max) {
  if (v === undefined || v === null) return '';
  var s = String(v).trim();
  if (s.length > max) s = s.slice(0, max);
  return s;
}

function safeUrlOrRelative(url) {
  var s = String(url || '').trim();
  if (!s) return '';
  if (/^javascript:/i.test(s) || /^data:/i.test(s) || /^vbscript:/i.test(s)) return '';
  if (/^https?:\/\//i.test(s)) return s.slice(0, 500);
  if (s.startsWith('/') && !s.startsWith('//')) return s.slice(0, 500);
  if (/^[a-z0-9][a-z0-9._#?=&/-]*$/i.test(s)) return s.slice(0, 300);
  return '';
}

function safeHttpUrl(url) {
  var s = String(url || '').trim();
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s.slice(0, 500) : '';
}

function normalizeAssuntos(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map(function (a) {
      if (!a || typeof a !== 'object') return null;
      var value = clampStr(a.value, 80);
      var label = clampStr(a.label || a.value, 120);
      if (!value) return null;
      return { value: value, label: label || value };
    })
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeCartoes(list) {
  if (!Array.isArray(list)) return [];
  return list
    .slice(0, 3)
    .map(function (c) {
      c = c || {};
      return {
        titulo: clampStr(c.titulo, 120),
        texto: clampStr(c.texto, 2000),
        linkUrl: safeUrlOrRelative(c.linkUrl),
        linkLabel: clampStr(c.linkLabel, 80)
      };
    });
}

/**
 * Normaliza e limita o objeto institutional antes de gravar.
 */
function normalizeInstitutional(inst) {
  inst = inst && typeof inst === 'object' ? inst : {};
  var out = Object.assign({}, inst);
  out.historia = clampStr(out.historia, 12000);
  out.missao = clampStr(out.missao, 8000);
  out.visao = clampStr(out.visao, 8000);
  out.email = clampStr(out.email, 200);
  if (out.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) out.email = '';
  out.telefone = clampStr(out.telefone, 80);
  out.facebook = safeHttpUrl(out.facebook);
  out.instagram = safeHttpUrl(out.instagram);
  out.youtube = safeHttpUrl(out.youtube);
  out.pixChave = clampStr(out.pixChave, 120);
  out.pixTitular = clampStr(out.pixTitular, 200);
  out.pixQrUrl = safeUrlOrRelative(out.pixQrUrl);
  if (Array.isArray(out.objetivos)) {
    out.objetivos = out.objetivos.map(function (o) { return clampStr(o, 500); }).filter(Boolean).slice(0, 12);
  }
  var hp = out.homepage && typeof out.homepage === 'object' ? out.homepage : {};
  out.homepage = {
    titulo: clampStr(hp.titulo, 200),
    subtitulo: clampStr(hp.subtitulo, 300),
    btn1Texto: clampStr(hp.btn1Texto, 80),
    btn1Url: safeUrlOrRelative(hp.btn1Url),
    btn2Texto: clampStr(hp.btn2Texto, 80),
    btn2Url: safeUrlOrRelative(hp.btn2Url),
    imagemFundo: safeUrlOrRelative(hp.imagemFundo)
  };
  var vol = out.voluntariado && typeof out.voluntariado === 'object' ? out.voluntariado : {};
  out.voluntariado = {
    intro: clampStr(vol.intro, 2000),
    cartoes: normalizeCartoes(vol.cartoes),
    contribuir: Array.isArray(vol.contribuir)
      ? vol.contribuir.map(function (x) { return clampStr(x, 500); }).filter(Boolean).slice(0, 20)
      : [],
    ctaTexto: clampStr(vol.ctaTexto, 80),
    ctaUrl: safeUrlOrRelative(vol.ctaUrl)
  };
  var cont = out.contato && typeof out.contato === 'object' ? out.contato : {};
  out.contato = {
    intro: clampStr(cont.intro, 2000),
    assuntos: normalizeAssuntos(cont.assuntos)
  };
  return out;
}

function isAssuntoPermitido(institutional, assunto) {
  var list = (institutional && institutional.contato && institutional.contato.assuntos) || [];
  if (!list.length) return true;
  var a = String(assunto || '').trim();
  return list.some(function (x) {
    return String(x.value) === a;
  });
}

module.exports = {
  normalizeInstitutional: normalizeInstitutional,
  isAssuntoPermitido: isAssuntoPermitido,
  safeUrlOrRelative: safeUrlOrRelative,
  safeHttpUrl: safeHttpUrl
};
