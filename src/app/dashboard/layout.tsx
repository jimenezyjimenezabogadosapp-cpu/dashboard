"use client";

import { ReactNode, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ReporteriaSegmentadaClient from "@/components/ReporteriaSegmentadaClient";

function DashboardLayoutContent({
    children,
}: {
    children: ReactNode;
}) {
    // Renderizamos los children siempre para permitir el acceso a todas las subrutas (como parametrización)
    // Las restricciones de rol se manejarán dentro de cada componente específico
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Contenido */}
            <main className="max-w-full px-4 py-8">
                {children}
            </main>
        </div>
    );
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
