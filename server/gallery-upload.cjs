'use strict';

/**
 * Upload de imagens e vídeos para a galeria (sessão admin: admin ou editor).
 */
var path = require('path');
var fs = require('fs');
var multer = require('multer');

var UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'gallery');

var ALLOWED_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.mp4', '.webm', '.ogv', '.mov', '.m4v'
]);

var MAX_BYTES = 100 * 1024 * 1024;

function ensureDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    ensureDir();
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    var ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXT.has(ext)) ext = '';
    var rawBase = path.basename(file.originalname || 'midia', path.extname(file.originalname || ''));
    var base = String(rawBase).replace(/[^a-z0-9._-]/gi, '_').replace(/_+/g, '_').slice(0, 80) || 'midia';
    cb(null, Date.now() + '-' + base + (ext || '.dat'));
  }
});

function fileFilter(req, file, cb) {
  var ext = path.extname(file.originalname || '').toLowerCase();
  if (ALLOWED_EXT.has(ext)) return cb(null, true);
  cb(new Error('Tipo não permitido. Use imagens (JPG, PNG, GIF, WebP) ou vídeo (MP4, WebM, OGV, MOV).'));
}

var upload = multer({
  storage: storage,
  limits: { fileSize: MAX_BYTES },
  fileFilter: fileFilter
});

module.exports = {
  uploadSingle: upload.single('file'),
  UPLOAD_DIR: UPLOAD_DIR,
  publicUrlPath: '/uploads/gallery/',
  maxBytes: MAX_BYTES
};
