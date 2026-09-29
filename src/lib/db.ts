// src/lib/db.ts
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL belum diatur di file .env');
}

// Inisialisasi koneksi SQL murni
export const sql = neon(process.env.DATABASE_URL);