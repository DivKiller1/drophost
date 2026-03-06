const { Pool } = require('pg');
const { getEnv } = require('../config/env');

const { db } = getEnv();

const pool = new Pool({
  host: db.host,
  port: db.port,
  database: db.database,
  user: db.user,
  password: db.password
});

async function query(text, params) {
  return pool.query(text, params);
}

async function healthCheck() {
  await query('SELECT 1');
}

module.exports = {
  query,
  healthCheck
};

