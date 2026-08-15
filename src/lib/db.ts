import "server-only";
import { Pool, PoolClient } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      max: Number(process.env.POSTGRES_POOL_SIZE ?? 10),
    });
  }
  return pool;
}

/** El schema tenant de una empresa es "tenant-" + su uuid (dependence_tbl.id) - ver services/api/src/common/database/typeorm/tenant-context.ts */
export function schemaNameForDependence(dependenceId: string): string {
  return `tenant-${dependenceId.toLowerCase()}`;
}

/**
 * Traduce placeholders estilo MySQL ("?") a estilo Postgres ("$1", "$2", ...).
 * El front sigue mandando SQL con "?" (heredado de la version MySQL); esto
 * evita tener que tocar cada query del dashboard una por una.
 */
function toPgPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function runInSchema<T = any>(
  client: PoolClient,
  schema: string,
  sql: string,
  params: any[],
): Promise<T[]> {
  // "core" y "data" siempre en el search_path: dependence_tbl, risk_data_tbl,
  // risk_action_tbl, training_tbl (core) y paises_tbl/ciudades_tbl (data)
  // no son por tenant, y varias queries del dashboard hacen JOIN entre
  // tablas de tenant y de core/data.
  await client.query(`SET search_path TO "${schema}", core, data, public`);
  const { rows } = await client.query(toPgPlaceholders(sql), params);
  return rows as T[];
}

/** Todas las dependencias (tenants) registradas en core.dependence_tbl. */
export async function getAllTenantSchemas(): Promise<
  { id: string; schema_name: string }[]
> {
  const client = await getPool().connect();
  try {
    await client.query(`SET search_path TO core, data, public`);
    const { rows } = await client.query(`SELECT id FROM dependence_tbl`);
    return rows.map((r: any) => ({
      id: r.id,
      schema_name: schemaNameForDependence(String(r.id)),
    }));
  } finally {
    client.release();
  }
}

// Tablas que viven en el schema de cada tenant (no en "core"). Si una query
// no toca ninguna de estas, se puede resolver una sola vez contra "core" sin
// iterar tenants, aunque no venga un dependence_id puntual (caso SUPER).
const TENANT_SCOPED_TABLES = /\b(client_tbl|alert_tbl|client_record_tbl)\b/i;

/**
 * Ejecuta una consulta SQL.
 * @param sql - La consulta SQL (SELECT, INSERT, UPDATE, DELETE), con "?" como placeholder
 * @param params - Parametros para la consulta (array)
 * @param dependenceId - Empresa (tenant) a la que se debe dirigir la consulta.
 *   Si se omite y la query toca tablas de tenant (client_tbl/alert_tbl), se
 *   corre en TODOS los schemas de tenant y se concatenan las filas (vista
 *   SUPER). Ojo: para queries de una sola fila con agregados (COUNT/AVG/etc)
 *   esto da un resultado POR EMPRESA, no un agregado global - hay que sumarlo
 *   del lado del componente si se necesita un total exacto entre empresas.
 */
export async function query<T = any>(
  sql: string,
  params: any[] = [],
  dependenceId?: string,
): Promise<T[]> {
  try {
    // dependenceId puede venir como un solo uuid o varios separados por
    // coma (el dashboard usa esto para agrupar dependencias con el mismo
    // nombre, ver "allIds" en ReporteriaGeneralClient).
    const depIds = dependenceId
      ? dependenceId.split(",").map((id) => id.trim()).filter(Boolean)
      : [];

    if (depIds.length === 1) {
      const client = await getPool().connect();
      try {
        return await runInSchema<T>(
          client,
          schemaNameForDependence(depIds[0]),
          sql,
          params,
        );
      } finally {
        client.release();
      }
    }

    if (depIds.length === 0 && !TENANT_SCOPED_TABLES.test(sql)) {
      const client = await getPool().connect();
      try {
        return await runInSchema<T>(client, "core", sql, params);
      } finally {
        client.release();
      }
    }

    // Sin dependenceId puntual (vista SUPER "todas") -> todos los tenants.
    // Con varios ids (dependencias agrupadas por nombre) -> solo esos.
    const tenants =
      depIds.length > 1
        ? depIds.map((id) => ({ id, schema_name: schemaNameForDependence(id) }))
        : await getAllTenantSchemas();
    const results: T[] = [];
    for (const tenant of tenants) {
      const client = await getPool().connect();
      try {
        const rows = await runInSchema<T>(
          client,
          tenant.schema_name,
          sql,
          params,
        );
        results.push(...rows);
      } catch (error) {
        // Un schema de tenant sin alguna tabla (o vacio) no debe tumbar el
        // resto de la agregacion SUPER.
        console.error(
          `DB query error (tenant ${tenant.schema_name}):`,
          error,
        );
      } finally {
        client.release();
      }
    }
    return results;
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
