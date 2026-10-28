import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { resolve } from 'node:path';

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
  });
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    const migrationDirectory = resolve(process.cwd(), 'migrations');
    const files = (await readdir(migrationDirectory))
      .filter((name) => /^\d+_.+\.sql$/.test(name))
      .sort();
    for (const file of files) {
      const { rows } = await pool.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file.replace(/\.sql$/, '')]);
      if (rows.length) continue;
      const sql = await readFile(resolve(migrationDirectory, file), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file.replace(/\.sql$/, '')]);
        await client.query('COMMIT');
        console.log(`Applied migration ${file}.`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
    console.log('Database migrations are up to date.');
  } finally {
    await pool.end();
  }
}

void migrate().catch((error: unknown) => {
  console.error('Migration failed:', error);
  process.exitCode = 1;
});
