'use strict';

var sanitizeHtml = require('sanitize-html');

var RICH_OPTIONS = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'em',
    'u',
    'a',
    'ul',
    'ol',
    'li',
    'h2',
    'h3',
    'blockquote'
  ],
  allowedAttributes: {
    a: ['href', 'title', 'rel', 'target']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' })
  }
};

function sanitizeRichHtml(html) {
  if (html == null || html === '') return '';
  return sanitizeHtml(String(html), RICH_OPTIONS).trim();
}

/** Sanitiza `conteudo` em cada item de notícias ou blog. */
function sanitizeContentList(list) {
  if (!Array.isArray(list)) return list;
  return list.map(function (item) {
    if (!item || typeof item !== 'object') return item;
    if (!Object.prototype.hasOwnProperty.call(item, 'conteudo')) return item;
    return Object.assign({}, item, { conteudo: sanitizeRichHtml(item.conteudo) });
  });
}

module.exports = {
  sanitizeRichHtml: sanitizeRichHtml,
  sanitizeContentList: sanitizeContentList
};
