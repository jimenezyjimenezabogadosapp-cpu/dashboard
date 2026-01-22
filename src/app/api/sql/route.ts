import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Endpoint para ejecutar SQL con autenticación por query param x-user-key
 * GET /api/sql?x-user-key=...&query=...
 * POST /api/sql?x-user-key=...
 * Body: { sql: string, params?: any[] }
 */
export async function GET(request: NextRequest) {
  // Validar autenticación por query param
  const { searchParams } = new URL(request.url);
  const providedKey = searchParams.get("x-user-key");
  const expectedKey =
    process.env.DASHBOARD_USER_KEY ?? "019bdbff-d27c-7583-b76f-80edd5ae064e";

  if (providedKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sqlQuery = searchParams.get("query");

    if (typeof sqlQuery !== "string" || !sqlQuery.trim()) {
      return NextResponse.json(
        { error: "SQL query is required and must be a non-empty string" },
        { status: 400 },
      );
    }

    // Opcional: puedes agregar más validaciones aquí
    // Por ejemplo, solo permitir SELECT:
    // if (!sqlQuery.trim().toUpperCase().startsWith("SELECT")) {
    //   return NextResponse.json(
    //     { error: "Only SELECT queries are allowed" },
    //     { status: 403 }
    //   );
    // }

    const results = await query(sqlQuery, []);

    return NextResponse.json(results);
  } catch (error) {
    console.error("SQL API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Database error", details: message },
      { status: 500 },
    );
  }
}
export async function POST(request: NextRequest) {
  // Validar autenticación por query param
  const { searchParams } = new URL(request.url);
  const providedKey = searchParams.get("x-user-key");
  const expectedKey =
    process.env.DASHBOARD_USER_KEY ?? "019bdbff-d27c-7583-b76f-80edd5ae064e";

  if (providedKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { sql, params = [] } = body;

    if (typeof sql !== "string" || !sql.trim()) {
      return NextResponse.json(
        { error: "SQL query is required and must be a non-empty string" },
        { status: 400 },
      );
    }

    // Opcional: puedes agregar más validaciones aquí
    // Por ejemplo, solo permitir SELECT:
    // if (!sql.trim().toUpperCase().startsWith("SELECT")) {
    //   return NextResponse.json(
    //     { error: "Only SELECT queries are allowed" },
    //     { status: 403 }
    //   );
    // }

    const results = await query(sql, Array.isArray(params) ? params : []);

    return NextResponse.json({
      success: true,
      data: results,
      rowCount: Array.isArray(results) ? results.length : 0,
    });
  } catch (error) {
    console.error("SQL API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Database error", details: message },
      { status: 500 },
    );
  }
}
