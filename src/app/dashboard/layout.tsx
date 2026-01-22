"use client";

import { ReactNode, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DashboardNav from "@/components/DashboardNav";
import ReporteriaSegmentadaClient from "@/components/ReporteriaSegmentadaClient";

function DashboardLayoutContent({
    children,
}: {
    children: ReactNode;
}) {
    const searchParams = useSearchParams();
    const roleId = searchParams.get('role_id');

    // Si el rol es SUPER, mostrar ambas pestañas
    if (roleId === 'SUPER') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                {/* Navegación principal */}
                <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                    <div className="max-w-full px-4">
                        <div className="flex items-center justify-between h-16">
                            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                Dashboard
                            </h1>
                            <DashboardNav />
                        </div>
                    </div>
                </header>

                {/* Navegación de pestañas */}
                <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                    <div className="max-w-full px-4">
                        <div className="flex space-x-8">
                            <Link
                                href="/dashboard/reporteria-general?x-user-key=019bdbff-d27c-7583-b76f-80edd5ae064e&role_id=SUPER"
                                className="py-4 px-1 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-medium text-sm"
                            >
                                Reportería General
                            </Link>
                            <Link
                                href="/dashboard/reporteria-segmentada?x-user-key=019bdbff-d27c-7583-b76f-80edd5ae064e&role_id=SUPER"
                                className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 font-medium text-sm"
                            >
                                Reportería Segmentada
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Contenido */}
                <main className="max-w-full px-4 py-8">
                    {children}
                </main>
            </div>
        );
    }

    // Para otros roles o sin rol, mostrar solo la reportería segmentada con filtro
    return <ReporteriaSegmentadaClient />;
}

export default function DashboardLayout({
    children,
}: Readonly<{
    children: ReactNode;
}>) {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-gray-500 dark:text-gray-400 animate-pulse">Cargando dashboard...</div>
            </div>
        }>
            <DashboardLayoutContent>
                {children}
            </DashboardLayoutContent>
        </Suspense>
    );
}
