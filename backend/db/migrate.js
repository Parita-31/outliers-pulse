/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const env = require('../src/config/env');

async function main() {
  const reset = process.argv.includes('--reset');

  const client = new Client({ connectionString: env.DATABASE_URL });
  await client.connect();

  try {
    if (reset) {
      console.log('[migrate] --reset flag set: dropping and recreating public schema...');
      await client.query('DROP SCHEMA public CASCADE;');
      await client.query('CREATE SCHEMA public;');
      await client.query('GRANT ALL ON SCHEMA public TO public;');
    }

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('[migrate] Applying schema.sql ...');
    await client.query(schemaSql);
    console.log('[migrate] Schema applied successfully.');

    const { rows } = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    console.log('[migrate] Tables present:', rows.map((r) => r.table_name).join(', '));
  } catch (err) {
    console.error('[migrate] Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
