'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const handler = require('serve-handler');

const envPort = process.env.PORT;
const portFixo = envPort !== undefined && envPort !== '';

var logoPath = path.join(__dirname, 'img', 'logo.jpg');

function servirLogo(res) {
  if (!fs.existsSync(logoPath)) {
    res.statusCode = 204;
    res.end();
    return;
  }
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  fs.createReadStream(logoPath).pipe(res);
}

function criarServidor() {
  return http.createServer(function (req, res) {
    var pathname = (req.url || '').split('?')[0];
    if (pathname === '/favicon.ico' || pathname === '/apple-touch-icon.png' || pathname === '/apple-touch-icon-precomposed.png') {
      servirLogo(res);
      return;
    }
    return handler(req, res, {
      public: '.',
      cleanUrls: false,
      directoryListing: false,
    });
  });
}

function iniciar(porta, tentativas) {
  var server = criarServidor();

  server.once('error', function (err) {
    if (err.code === 'EADDRINUSE' && !portFixo && tentativas > 1) {
      var prox = porta + 1;
      console.warn('Porta ' + porta + ' em uso, tentando ' + prox + '...');
      iniciar(prox, tentativas - 1);
      return;
    }
    console.error(err);
    process.exit(1);
  });

  server.listen(porta, '0.0.0.0', function () {
    console.log('Servidor em http://127.0.0.1:' + porta + ' (porta ' + porta + ')');
  });
}

var inicial = parseInt(portFixo ? envPort : envPort || '3000', 10);
var maxTentativas = portFixo ? 1 : 15;
iniciar(inicial, maxTentativas);
