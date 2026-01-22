import "server-only";
import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST ?? "localhost",
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? "root",
      password: process.env.DB_PASSWORD ?? "",
      database: process.env.DB_NAME ?? "",
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
    });
  }
  return pool;
}

/**
 * Ejecuta una consulta SQL de forma segura.
 * @param sql - La consulta SQL (SELECT, INSERT, UPDATE, DELETE)
 * @param params - Parámetros para la consulta (array)
 * @returns Promise con los resultados
 */
export async function query<T = any>(
  sql: string,
  params: any[] = [],
): Promise<T[]> {
  const pool = getPool();
  try {
    const [rows] = await pool.execute(sql, params);
    return rows as T[];
  } catch (error) {
    console.error("DB query error:", error);
    throw error;
  }
}

/**
 * Cierra el pool de conexiones (útil para tests o shutdown)
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
