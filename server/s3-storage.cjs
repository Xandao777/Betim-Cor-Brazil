'use strict';

/**
 * Upload opcional para S3 ou API compatível (Cloudflare R2, MinIO, etc.).
 *
 * S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
 * S3_ENDPOINT — opcional (R2/MinIO), ex.: https://<account>.r2.cloudflarestorage.com
 * S3_PUBLIC_URL_BASE — URL pública dos ficheiros, ex.: https://cdn.seudominio.org/uploads
 */

var path = require('path');
var fs = require('fs');

var sdk;
try {
  sdk = require('@aws-sdk/client-s3');
} catch (e) {
  sdk = null;
}

function isConfigured() {
  if (!sdk) return false;
  return !!(
    (process.env.S3_BUCKET || '').trim() &&
    (process.env.S3_ACCESS_KEY_ID || '').trim() &&
    (process.env.S3_SECRET_ACCESS_KEY || '').trim()
  );
}

function getClient() {
  if (!isConfigured()) return null;
  var endpoint = (process.env.S3_ENDPOINT || '').trim() || undefined;
  var region = (process.env.S3_REGION || 'auto').trim();
  return new sdk.S3Client({
    region: region,
    endpoint: endpoint,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID.trim(),
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY.trim()
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === '1'
  });
}

function buildKey(folder, filename) {
  var prefix = (process.env.S3_KEY_PREFIX || 'uploads').replace(/^\/+|\/+$/g, '');
  var safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  return prefix + '/' + folder + '/' + safe;
}

function publicUrlForKey(key) {
  var base = (process.env.S3_PUBLIC_URL_BASE || '').trim().replace(/\/$/, '');
  if (base) return base + '/' + key.replace(/^\/+/, '');
  return '/' + key.replace(/^\/+/, '');
}

/**
 * @param {object} file — req.file do multer (disk ou memory)
 * @param {'documents'|'gallery'} folder
 * @returns {Promise<string>} URL pública
 */
async function uploadMulterFile(file, folder) {
  var client = getClient();
  if (!client) throw new Error('S3 não configurado');

  var buffer;
  if (file.buffer) {
    buffer = file.buffer;
  } else if (file.path) {
    buffer = fs.readFileSync(file.path);
  } else {
    throw new Error('Ficheiro inválido');
  }

  var key = buildKey(folder, file.filename || path.basename(file.originalname || 'file'));
  await client.send(
    new sdk.PutObjectCommand({
      Bucket: process.env.S3_BUCKET.trim(),
      Key: key,
      Body: buffer,
      ContentType: file.mimetype || 'application/octet-stream'
    })
  );

  if (file.path) {
    try {
      fs.unlinkSync(file.path);
    } catch (e) {}
  }

  return publicUrlForKey(key);
}

module.exports = {
  isConfigured: isConfigured,
  uploadMulterFile: uploadMulterFile,
  publicUrlForKey: publicUrlForKey
};
