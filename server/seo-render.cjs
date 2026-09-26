'use strict';

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function plainText(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function absoluteUrl(base, value) {
  var raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (!base) return raw;
  return base.replace(/\/$/, '') + '/' + raw.replace(/^\//, '');
}

function replaceMeta(html, name, value, property) {
  var attr = property ? 'property' : 'name';
  var re = new RegExp('<meta\\s+' + attr + '="' + name + '"[^>]*>', 'i');
  var tag = '<meta ' + attr + '="' + name + '" content="' + esc(value) + '">';
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', '  ' + tag + '\n</head>');
}

function render(template, options) {
  var title = plainText(options.title || 'Associação');
  var description = plainText(options.description || '').slice(0, 200);
  var canonical = absoluteUrl(options.base, options.path);
  var image = absoluteUrl(options.base, options.image);
  var html = template.replace(/<title>[^<]*<\/title>/i, '<title>' + esc(title) + '</title>');
  html = replaceMeta(html, 'description', description, false);
  html = replaceMeta(html, 'og:title', title, true);
  html = replaceMeta(html, 'og:description', description, true);
  html = replaceMeta(html, 'og:type', options.type || 'article', true);
  if (canonical) {
    html = html.replace('</head>', '  <link rel="canonical" href="' + esc(canonical) + '">\n  <meta property="og:url" content="' + esc(canonical) + '">\n</head>');
  }
  if (image) html = html.replace('</head>', '  <meta property="og:image" content="' + esc(image) + '">\n</head>');
  var schema = {
    '@context': 'https://schema.org',
    '@type': options.schemaType || 'Article',
    headline: title,
    description: description,
    url: canonical || undefined,
    image: image || undefined,
    datePublished: options.date || undefined,
    location: options.location || undefined
  };
  Object.keys(schema).forEach(function (key) { if (schema[key] === undefined) delete schema[key]; });
  html = html.replace('</head>', '  <script type="application/ld+json">' + JSON.stringify(schema).replace(/</g, '\\u003c') + '</script>\n</head>');
  if (options.targetId) {
    var initial = '<h1>' + esc(title.replace(/\s+\|\s+Associação Betim Cor Brazil$/, '')) + '</h1>' +
      (description ? '<p>' + esc(description) + '</p>' : '');
    var targetPattern = new RegExp('(<(?:section|article)[^>]*id="' + options.targetId + '"[^>]*>)[\\s\\S]*?(</(?:section|article)>)', 'i');
    html = html.replace(targetPattern, '$1' + initial + '$2');
  }
  return html;
}

module.exports = { render: render, plainText: plainText, absoluteUrl: absoluteUrl };
