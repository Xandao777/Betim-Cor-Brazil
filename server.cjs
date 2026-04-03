'use strict';

const http = require('http');
const handler = require('serve-handler');

const port = parseInt(process.env.PORT || '3000', 10);

const server = http.createServer(function (req, res) {
  return handler(req, res, {
    public: '.',
    cleanUrls: false,
    directoryListing: false,
  });
});

server.listen(port, '0.0.0.0', function () {
  console.log('Listening on http://0.0.0.0:' + port);
});
