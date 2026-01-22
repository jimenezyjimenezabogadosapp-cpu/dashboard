import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Solo proteger rutas bajo /dashboard y el endpoint /api/sql
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/api/sql")) {
    const providedKey = searchParams.get("x-user-key");
    const expectedKey =
      process.env.DASHBOARD_USER_KEY ?? "019bdbff-d27c-7583-b76f-80edd5ae064e";

    if (providedKey !== expectedKey) {
      // Si es una ruta API, retornar error JSON en lugar de redirigir
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Para rutas de dashboard, redirigir a la página de "teapot"
      const teapotUrl = new URL("/teapot", request.url);
      return NextResponse.redirect(teapotUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/sql"],
};
