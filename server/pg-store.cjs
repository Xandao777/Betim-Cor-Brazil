'use strict';

/**
 * Persistência em PostgreSQL (Railway: variável DATABASE_URL).
 * Tabela app_state — uma linha por chave (events, news, …), payload JSONB.
 * Simples e suficiente para muitas associações; para milhões de linhas, auditoria
 * fina ou BI pesado em SQL, o modelo normalmente evoluiria para tabelas dedicadas.
 */

var { Pool } = require('pg');
var pwd = require('./passwords.cjs');
var { getSeedDefaults } = require('./seed.cjs');

function createPool(databaseUrl) {
  var isLocal = /localhost|127\.0\.0\.1/.test(databaseUrl);
  /** Rede interna Railway — Postgres não usa TLS; forçar SSL aqui falha ou bloqueia a ligação. */
  var isRailwayInternal = /\.railway\.internal/i.test(databaseUrl);
  var useSsl = !isLocal && !isRailwayInternal;
  return new Pool({
    connectionString: databaseUrl,
    max: 10,
    connectionTimeoutMillis: intEnv('PG_CONNECT_TIMEOUT_MS', 15000),
    ssl: useSsl ? { rejectUnauthorized: false } : false
  });
}

function intEnv(name, def) {
  var v = process.env[name];
  if (v === undefined || v === '') return def;
  var n = parseInt(v, 10);
  return isNaN(n) || n < 1000 ? def : n;
}

async function ensureSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      payload JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

async function loadAll(pool, KEYS, mergeDefaults, DEFAULTS) {
  var r = await pool.query('SELECT key, payload FROM app_state');
  if (r.rows.length === 0) {
    await seed(pool, KEYS, DEFAULTS);
    return mergeDefaults({});
  }
  var raw = {};
  r.rows.forEach(function (row) {
    raw[row.key] = row.payload;
  });
  return mergeDefaults(raw);
}

async function seed(pool, KEYS, DEFAULTS) {
  var seedData = getSeedDefaults(DEFAULTS);
  var client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (var i = 0; i < KEYS.length; i++) {
      var k = KEYS[i];
      var payload = seedData[k];
      if (k === 'members' || k === 'admin_users') {
        payload = pwd.hashPasswordsInArray(JSON.parse(JSON.stringify(seedData[k])));
      }
      await client.query(
        `INSERT INTO app_state (key, payload, updated_at) VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
        [k, JSON.stringify(payload)]
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function saveKey(pool, key, payload) {
  await pool.query(
    `INSERT INTO app_state (key, payload, updated_at) VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
    [key, JSON.stringify(payload)]
  );
}

async function saveStateFull(pool, KEYS, state) {
  var client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (var i = 0; i < KEYS.length; i++) {
      var k = KEYS[i];
      await client.query(
        `INSERT INTO app_state (key, payload, updated_at) VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
        [k, JSON.stringify(state[k])]
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = {
  createPool: createPool,
  ensureSchema: ensureSchema,
  loadAll: loadAll,
  seed: seed,
  saveKey: saveKey,
  saveStateFull: saveStateFull
};
