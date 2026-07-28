#!/usr/bin/env node
'use strict';

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || '3099';
const HEALTH_URL = 'http://127.0.0.1:' + PORT + '/api/health';
const DATA_FILE = process.env.SITE_DATA_FILE || path.join(ROOT, 'data', 'e2e-site-data.json');

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function checkHealth() {
  return new Promise(function (resolve) {
    var req = http.get(HEALTH_URL, function (res) {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.setTimeout(1000, function () {
      req.destroy();
      resolve(false);
    });
    req.on('error', function () {
      resolve(false);
    });
  });
}

async function waitForServer(server) {
  var started = Date.now();
  while (Date.now() - started < 60000) {
    if (server.exitCode !== null) {
      throw new Error('Servidor E2E terminou antes de responder em ' + HEALTH_URL);
    }
    if (await checkHealth()) return;
    await sleep(250);
  }
  throw new Error('Servidor E2E nao respondeu em ' + HEALTH_URL);
}

function stopServer(server) {
  if (!server || server.exitCode !== null) return;
  server.kill('SIGTERM');
  setTimeout(function () {
    if (server.exitCode === null) server.kill('SIGKILL');
  }, 3000).unref();
}

async function main() {
  var server = spawn(process.execPath, ['server.cjs'], {
    cwd: ROOT,
    env: Object.assign({}, process.env, {
      PORT: PORT,
      SITE_DATA_FILE: DATA_FILE
    }),
    stdio: ['ignore', 'pipe', 'pipe']
  });

  server.stdout.on('data', function (chunk) {
    process.stdout.write(String(chunk));
  });
  server.stderr.on('data', function (chunk) {
    process.stderr.write(String(chunk));
  });

  function shutdown(signal) {
    stopServer(server);
    if (signal) process.exit(1);
  }

  process.on('SIGINT', function () { shutdown('SIGINT'); });
  process.on('SIGTERM', function () { shutdown('SIGTERM'); });

  try {
    await waitForServer(server);
    var cli = require.resolve('@playwright/test/cli');
    var args = [cli, 'test'].concat(process.argv.slice(2));
    var pw = spawn(process.execPath, args, {
      cwd: ROOT,
      env: Object.assign({}, process.env, {
        PLAYWRIGHT_SKIP_WEBSERVER: '1',
        PORT: PORT,
        SITE_DATA_FILE: DATA_FILE
      }),
      stdio: 'inherit'
    });
    var code = await new Promise(function (resolve) {
      pw.on('exit', function (exitCode) {
        resolve(exitCode == null ? 1 : exitCode);
      });
    });
    stopServer(server);
    process.exit(code);
  } catch (err) {
    console.error(err && err.message ? err.message : err);
    stopServer(server);
    process.exit(1);
  }
}

main();
