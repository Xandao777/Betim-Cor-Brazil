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
var stateEtag = require('./state-etag.cjs');
var auditLog = require('./audit-log.cjs');

var RECORD_TABLES = {
  inscricoes: 'event_registrations',
  mensagens_contato: 'contact_messages',
  pedidos_doacao: 'donation_requests',
  pedidos_filiacao: 'membership_requests',
  mensagens_membros: 'member_messages'
};

function recordTable(key) {
  return RECORD_TABLES[key] || null;
}

function isRecordKey(key) {
  return !!recordTable(key);
}

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
  var client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        payload JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    var tables = Object.values(RECORD_TABLES);
    for (var i = 0; i < tables.length; i++) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${tables[i]} (
          id TEXT PRIMARY KEY,
          payload JSONB NOT NULL,
          seq BIGSERIAL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await client.query(`ALTER TABLE ${tables[i]} ADD COLUMN IF NOT EXISTS seq BIGSERIAL`);
      await client.query(`CREATE INDEX IF NOT EXISTS ${tables[i]}_created_idx ON ${tables[i]} (created_at)`);
    }
    var keys = Object.keys(RECORD_TABLES);
    for (var j = 0; j < keys.length; j++) {
      var key = keys[j];
      var table = RECORD_TABLES[key];
      await client.query(
        `INSERT INTO ${table} (id, payload, created_at, updated_at)
         SELECT COALESCE(NULLIF(item->>'id', ''), md5(item::text || '-' || ordinality::text)),
                item, NOW(), NOW()
           FROM app_state,
                LATERAL jsonb_array_elements(
                  CASE WHEN jsonb_typeof(payload) = 'array' THEN payload ELSE '[]'::jsonb END
                ) WITH ORDINALITY AS migrated(item, ordinality)
          WHERE key = $1
         ON CONFLICT (id) DO NOTHING`,
        [key]
      );
      await client.query('DELETE FROM app_state WHERE key = $1', [key]);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function loadAll(pool, KEYS, mergeDefaults, DEFAULTS) {
  var r = await pool.query('SELECT key, payload FROM app_state');
  if (r.rows.length === 0) {
    await seed(pool, KEYS, DEFAULTS);
    r = await pool.query('SELECT key, payload FROM app_state');
  }
  var raw = {};
  r.rows.forEach(function (row) {
    raw[row.key] = row.payload;
  });
  var recordKeys = Object.keys(RECORD_TABLES);
  for (var i = 0; i < recordKeys.length; i++) {
    var key = recordKeys[i];
    var records = await pool.query(
      `SELECT payload FROM ${RECORD_TABLES[key]} ORDER BY seq ASC, created_at ASC, id ASC`
    );
    raw[key] = records.rows.map(function (row) { return row.payload; });
  }
  return mergeDefaults(raw);
}

async function seed(pool, KEYS, DEFAULTS) {
  var seedData = getSeedDefaults(DEFAULTS);
  var client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (var i = 0; i < KEYS.length; i++) {
      var k = KEYS[i];
      if (isRecordKey(k)) continue;
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
  if (isRecordKey(key)) {
    return replaceRecords(pool, key, payload);
  }
  await pool.query(
    `INSERT INTO app_state (key, payload, updated_at) VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
    [key, JSON.stringify(payload)]
  );
}

async function replaceRecords(pool, key, payload) {
  var table = recordTable(key);
  if (!table) throw new Error('Coleção relacional inválida');
  if (!Array.isArray(payload)) throw new Error('Payload inválido');
  var client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);
    await replaceRecordsWithClient(client, key, payload);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function replaceRecordsWithClient(client, key, payload) {
  var table = recordTable(key);
  await client.query(`DELETE FROM ${table}`);
  for (var i = 0; i < payload.length; i++) {
    var item = payload[i] || {};
    var id = String(item.id || key + '-' + Date.now() + '-' + i);
    await client.query(
      `INSERT INTO ${table} (id, payload, created_at, updated_at)
       VALUES ($1, $2::jsonb, NOW(), NOW())`,
      [id, JSON.stringify(item)]
    );
  }
}

async function saveKeyIfMatch(pool, key, payload, expectedEtag, auditEntry, fallbackCurrent) {
  var client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);
    var current;
    if (isRecordKey(key)) {
      var table = recordTable(key);
      var records = await client.query(
        `SELECT payload FROM ${table} ORDER BY seq ASC, created_at ASC, id ASC`
      );
      current = records.rows.map(function (row) { return row.payload; });
    } else {
      var row = await client.query('SELECT payload FROM app_state WHERE key = $1 FOR UPDATE', [key]);
      current = row.rows.length ? row.rows[0].payload : fallbackCurrent;
    }
    var currentEtag = stateEtag.etagForPayload(current);
    if (expectedEtag !== currentEtag) {
      var conflict = new Error(
        'Conflito: outra pessoa ou outro separador alterou estes dados. Atualize a página e grave de novo.'
      );
      conflict.status = 409;
      conflict.etag = currentEtag;
      throw conflict;
    }
    if (isRecordKey(key)) {
      await replaceRecordsWithClient(client, key, payload);
    } else {
      await client.query(
        `INSERT INTO app_state (key, payload, updated_at) VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
        [key, JSON.stringify(payload)]
      );
    }
    if (auditEntry && key !== 'admin_audit_log') {
      var auditRow = await client.query(
        "SELECT payload FROM app_state WHERE key = 'admin_audit_log' FOR UPDATE"
      );
      var auditState = {
        admin_audit_log: auditRow.rows.length ? auditRow.rows[0].payload : []
      };
      var audit = auditLog.appendAudit(auditState, auditEntry);
      await client.query(
        `INSERT INTO app_state (key, payload, updated_at)
         VALUES ('admin_audit_log', $1::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
        [JSON.stringify(audit)]
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

async function appendRecord(pool, key, item) {
  var table = recordTable(key);
  if (!table) throw new Error('Coleção relacional inválida');
  var id = String(item && item.id ? item.id : key + '-' + Date.now());
  var payload = Object.assign({}, item, { id: id });
  var client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);
    await client.query(
      `INSERT INTO ${table} (id, payload, created_at, updated_at)
       VALUES ($1, $2::jsonb, NOW(), NOW())`,
      [id, JSON.stringify(payload)]
    );
    await client.query('COMMIT');
    return payload;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function updateRecord(pool, key, id, patch) {
  var table = recordTable(key);
  if (!table) throw new Error('Coleção relacional inválida');
  var client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);
    var r = await client.query(
      `UPDATE ${table}
          SET payload = payload || $2::jsonb, updated_at = NOW()
        WHERE id = $1
        RETURNING payload`,
      [String(id), JSON.stringify(patch || {})]
    );
    await client.query('COMMIT');
    return r.rows.length ? r.rows[0].payload : null;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function deleteMemberRegistration(pool, usuario, eventoId) {
  var client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('inscricoes'))");
    var result = await client.query(
      `DELETE FROM event_registrations
        WHERE payload->>'membroUsuario' = $1
          AND payload->>'eventoId' = $2`,
      [String(usuario), String(eventoId)]
    );
    await client.query('COMMIT');
    return result.rowCount;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function saveStateFull(pool, KEYS, state) {
  var client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (var i = 0; i < KEYS.length; i++) {
      var k = KEYS[i];
      if (isRecordKey(k)) continue;
      await client.query(
        `INSERT INTO app_state (key, payload, updated_at) VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
        [k, JSON.stringify(state[k])]
      );
    }
    var recordKeys = Object.keys(RECORD_TABLES);
    for (var j = 0; j < recordKeys.length; j++) {
      var recordKey = recordKeys[j];
      var table = RECORD_TABLES[recordKey];
      await client.query(`DELETE FROM ${table}`);
      var list = Array.isArray(state[recordKey]) ? state[recordKey] : [];
      for (var n = 0; n < list.length; n++) {
        var item = list[n] || {};
        var id = String(item.id || recordKey + '-' + Date.now() + '-' + n);
        await client.query(
          `INSERT INTO ${table} (id, payload, created_at, updated_at)
           VALUES ($1, $2::jsonb, NOW(), NOW())`,
          [id, JSON.stringify(item)]
        );
      }
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Inscrição atómica: bloqueia events + inscricoes, revalida vagas e grava.
 */
async function appendInscricaoAtomic(pool, body, membroUsuario, validate, buildItem) {
  var client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('inscricoes'))");
    var r = await client.query("SELECT key, payload FROM app_state WHERE key = 'events' FOR UPDATE");
    var state = { events: [], inscricoes: [] };
    r.rows.forEach(function (row) {
      state[row.key] = row.payload;
    });
    var registrations = await client.query(
      'SELECT payload FROM event_registrations ORDER BY seq ASC, created_at ASC, id ASC'
    );
    state.inscricoes = registrations.rows.map(function (row) { return row.payload; });
    var valid = membroUsuario
      ? validate.validateInscricaoMembro(state, body, membroUsuario)
      : validate.validateInscricaoPublica(state, body);
    if (!valid.ok) {
      await client.query('ROLLBACK');
      return valid;
    }
    var item = buildItem(valid, body, membroUsuario);
    await client.query(
      `INSERT INTO event_registrations (id, payload, created_at, updated_at)
       VALUES ($1, $2::jsonb, NOW(), NOW())`,
      [String(item.id), JSON.stringify(item)]
    );
    await client.query('COMMIT');
    return { ok: true, item: item, state: state };
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
  saveStateFull: saveStateFull,
  appendInscricaoAtomic: appendInscricaoAtomic,
  isRecordKey: isRecordKey,
  appendRecord: appendRecord,
  updateRecord: updateRecord,
  replaceRecords: replaceRecords,
  saveKeyIfMatch: saveKeyIfMatch,
  deleteMemberRegistration: deleteMemberRegistration
};
