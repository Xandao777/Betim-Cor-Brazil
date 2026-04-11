'use strict';

/**
 * Upload de ficheiros para a área de documentos (apenas admin no servidor).
 */
var path = require('path');
var fs = require('fs');
var multer = require('multer');

var UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'documents');

var ALLOWED_EXT = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.odt', '.ods', '.odp', '.txt', '.rtf', '.csv',
  '.zip', '.rar', '.7z',
  '.png', '.jpg', '.jpeg', '.webp'
]);

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
    var rawBase = path.basename(file.originalname || 'documento', path.extname(file.originalname || ''));
    var base = String(rawBase).replace(/[^a-z0-9._-]/gi, '_').replace(/_+/g, '_').slice(0, 80) || 'documento';
    cb(null, Date.now() + '-' + base + (ext || '.dat'));
  }
});

function fileFilter(req, file, cb) {
  var ext = path.extname(file.originalname || '').toLowerCase();
  if (ALLOWED_EXT.has(ext)) return cb(null, true);
  cb(new Error('Tipo de arquivo não permitido. Use PDF, Office, imagens ou arquivo compactado.'));
}

var upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: fileFilter
});

module.exports = {
  uploadSingle: upload.single('file'),
  UPLOAD_DIR: UPLOAD_DIR,
  publicUrlPath: '/uploads/documents/'
};
