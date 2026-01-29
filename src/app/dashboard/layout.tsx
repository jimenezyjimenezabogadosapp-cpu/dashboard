"use client";

import { ReactNode, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
