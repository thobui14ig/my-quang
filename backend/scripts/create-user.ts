import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';

async function createUser1() {
  const username = "thobui";
  const fullName = "thobui"
  const password = "111111"

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
  });
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query(
      `INSERT INTO users (username, full_name, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name,
         password_hash = EXCLUDED.password_hash, is_active = TRUE, updated_at = NOW()`,
      [username, fullName, passwordHash],
    );
    console.log(`Created/updated login for ${username}.`);
  } finally {
    await pool.end();
  }
}

async function createUser2() {
  const username = "nhatkha";
  const fullName = "nhatkha"
  const password = "111111"

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
  });
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query(
      `INSERT INTO users (username, full_name, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name,
         password_hash = EXCLUDED.password_hash, is_active = TRUE, updated_at = NOW()`,
      [username, fullName, passwordHash],
    );
    console.log(`Created/updated login for ${username}.`);
  } finally {
    await pool.end();
  }
}

void createUser1().catch((error: unknown) => {
  console.error('User setup failed:', error);
  process.exitCode = 1;
});
void createUser2().catch((error: unknown) => {
  console.error('User setup failed:', error);
  process.exitCode = 1;
});

