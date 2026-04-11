'use strict';

/**
 * Persistência em PostgreSQL (Railway: variável DATABASE_URL).
 * Tabela app_state — mesma ideia do site: uma linha por chave (events, news, …).
 */

var { Pool } = require('pg');

function createPool(databaseUrl) {
  var isLocal = /localhost|127\.0\.0\.1/.test(databaseUrl);
  return new Pool({
    connectionString: databaseUrl,
    max: 10,
    ssl: isLocal ? false : { rejectUnauthorized: false }
  });
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
  var client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (var i = 0; i < KEYS.length; i++) {
      var k = KEYS[i];
      await client.query(
        `INSERT INTO app_state (key, payload, updated_at) VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
        [k, JSON.stringify(DEFAULTS[k])]
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
