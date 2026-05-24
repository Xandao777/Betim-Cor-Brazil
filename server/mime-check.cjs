'use strict';

var path = require('path');

/** Extensão → tipos MIME aceites (primeiro é o preferido). */
var DOC_MIMES = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.ppt': ['application/vnd.ms-powerpoint'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  '.odt': ['application/vnd.oasis.opendocument.text'],
  '.ods': ['application/vnd.oasis.opendocument.spreadsheet'],
  '.odp': ['application/vnd.oasis.opendocument.presentation'],
  '.txt': ['text/plain'],
  '.rtf': ['application/rtf', 'text/rtf'],
  '.csv': ['text/csv', 'application/csv', 'text/plain'],
  '.zip': ['application/zip', 'application/x-zip-compressed'],
  '.rar': ['application/vnd.rar', 'application/x-rar-compressed'],
  '.7z': ['application/x-7z-compressed'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.webp': ['image/webp']
};

var GALLERY_MIMES = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp'],
  '.mp4': ['video/mp4'],
  '.webm': ['video/webm'],
  '.ogv': ['video/ogg'],
  '.mov': ['video/quicktime'],
  '.m4v': ['video/mp4', 'video/x-m4v']
};

function normalizeMime(mimetype) {
  if (!mimetype) return '';
  return String(mimetype).toLowerCase().split(';')[0].trim();
}

function mimeAllowedForExt(ext, mimetype, map) {
  var allowed = map[ext];
  if (!allowed) return false;
  var mime = normalizeMime(mimetype);
  if (!mime) return true;
  return allowed.indexOf(mime) >= 0;
}

function checkUploadMime(originalname, mimetype, map) {
  var ext = path.extname(originalname || '').toLowerCase();
  if (!map[ext]) {
    return { ok: false, error: 'Extensão de ficheiro não permitida.' };
  }
  if (!mimeAllowedForExt(ext, mimetype, map)) {
    return {
      ok: false,
      error: 'O tipo do ficheiro não corresponde à extensão (' + ext + ').'
    };
  }
  return { ok: true, ext: ext };
}

module.exports = {
  DOC_MIMES: DOC_MIMES,
  GALLERY_MIMES: GALLERY_MIMES,
  checkDocMime: function (name, mime) {
    return checkUploadMime(name, mime, DOC_MIMES);
  },
  checkGalleryMime: function (name, mime) {
    return checkUploadMime(name, mime, GALLERY_MIMES);
  }
};
