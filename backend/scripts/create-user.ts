import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';

async function createUser() {
  const username = process.env.NEW_USERNAME?.trim();
  const fullName = process.env.NEW_FULL_NAME?.trim();
  const password = process.env.NEW_PASSWORD;
  if (!username || !fullName || !password || password.length < 12) {
    throw new Error('Cần NEW_USERNAME, NEW_FULL_NAME và NEW_PASSWORD (tối thiểu 12 ký tự) trong môi trường.');
  }
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

void createUser().catch((error: unknown) => {
  console.error('User setup failed:', error);
  process.exitCode = 1;
});

