/**
 * Wrapper de fetch para /api/sql que agrega el dependence_id (schema de
 * tenant en Postgres) a la query. Sin esto el servidor no sabe a que
 * empresa pertenece la consulta - ver src/lib/db.ts.
 *
 * dependenceId: id (o varios separados por coma) de la empresa a la que
 * apunta ESTA consulta en particular. Omitir cuando la query debe cruzar
 * todas las empresas (vista SUPER sin filtro) o cuando solo toca tablas
 * globales (dependence_tbl, risk_data_tbl, etc.).
 */
export function fetchSql(
  userKey: string,
  sql: string,
  dependenceId?: string,
): Promise<Response> {
  const depParam = dependenceId
    ? `&dependence_id=${encodeURIComponent(dependenceId)}`
    : "";
  return fetch(
    `/api/sql?x-user-key=${userKey}&query=` +
      encodeURIComponent(sql) +
      depParam,
  );
}
