// Database client placeholder for Supabase PostgreSQL pooler
export function getDatabaseClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('DATABASE_URL environment variable is not set');
  }
  return { connectionString };
}
