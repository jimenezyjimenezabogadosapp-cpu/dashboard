"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import KpiCard from "./dashboard/KpiCard";
import ChartCard from "./dashboard/ChartCard";
import BarChartGeneric from "./dashboard/charts/BarChartGeneric";
import LineChartGeneric from "./dashboard/charts/LineChartGeneric";
import PieChartGeneric from "./dashboard/charts/PieChartGeneric";
import TableGeneric from "./dashboard/TableGeneric";
import RiskMatrixScatter from "./dashboard/RiskMatrixScatter";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

interface KpiData {
    label: string;
    value: string | number;
    suffix?: string;
    delta?: number;
}

interface ChartData {
    [key: string]: any;
}

interface RiskPoint {
    id: string;
    name: string;
    x: number;
    y: number;
}

interface ReporteriaData {
    kpis: KpiData[];
    barChart1: {
        title: string;
        data: ChartData[];
        xKey: string;
        series: Array<{ key: string; label: string; color?: string }>;
    };
    barChart2: {
        title: string;
        data: ChartData[];
        xKey: string;
        series: Array<{ key: string; label: string; color?: string }>;
    };
    lineChart: {
        title: string;
        data: ChartData[];
        xKey: string;
        lines: Array<{ key: string; label: string; color?: string }>;
    };
    pieChart: {
        title: string;
        data: ChartData[];
        nameKey: string;
        valueKey: string;
    };
    riskMatrix: {
        title: string;
        points: RiskPoint[];
    };
    table: {
        title: string;
        columns: Array<{ key: string; header: string; className?: string }>;
        rows: ChartData[];
    };
}

export default function ReporteriaSegmentadaClient() {
    const searchParams = useSearchParams();
    const [data, setData] = useState<ReporteriaData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [riskDetailsRows, setRiskDetailsRows] = useState<any[]>([]);

    // Seguridad por Rol
    const auth = useMemo(() => {
        const rawRole = (searchParams.get("role_id") || "USER").toString().toUpperCase();
        const depId = searchParams.get("dependence_id") || "";
        
        return {
            isSuper: rawRole === "1" || rawRole === "SUPER",
            dependenceId: depId
        };
    }, [searchParams]);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const userKey = "019bdbff-d27c-7583-b76f-80edd5ae064e";

                // Cláusulas WHERE seguras
                const getWhereClause = (tableAlias: string = "") => {
                    const prefix = tableAlias ? `${tableAlias}.` : "";
                    if (auth.isSuper) return "1=1";
                    return auth.dependenceId ? `${prefix}dependence_id = '${auth.dependenceId}'` : "1=0";
                };

                const whereClause = getWhereClause();
                const whereClauseCt = getWhereClause("ct");
                const matrixFilter = auth.isSuper ? '1=1' : `dt.id = '${auth.dependenceId}'`;

                // Fetching de todo el dashboard segmentado
                const [kpiRes, bar1Res, bar2Res, lineRes, pieRes, matrixRes, tableRes, detailsRes] = await Promise.all([
                    fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
                        SELECT 
                            (SELECT COUNT(*) FROM client_tbl WHERE ${whereClause}) as busquedas_realizadas,
                            (SELECT COUNT(*) FROM alert_tbl a INNER JOIN client_tbl c ON a.client_id = c.id WHERE ${getWhereClause("c")}) as total_alertas,
                            (SELECT COUNT(DISTINCT client_id) FROM alert_tbl a INNER JOIN client_tbl c ON a.client_id = c.id WHERE ${getWhereClause("c")}) as clientes_con_alertas,
                            (SELECT AVG(execute_time) FROM stadistics_usage_tbl WHERE 1=1) as tiempo_promedio_caso
                    `)),
                    fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
                        SELECT 
                            (SELECT COUNT(*) FROM client_tbl WHERE ${whereClause}) as "Total clientes",
                            (SELECT COUNT(DISTINCT client_id) FROM alert_tbl a INNER JOIN client_tbl c ON a.client_id = c.id WHERE ${getWhereClause("c")}) as "Total clientes con alertas"
                    `)),
                    fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
                        SELECT dt.name as "Dependencia", COUNT(*) as "Total casos"
                        FROM client_tbl ct INNER JOIN dependence_tbl dt ON dt.id = ct.dependence_id 
                        WHERE ${whereClauseCt} GROUP BY ct.dependence_id ORDER BY COUNT(*) DESC
                    `)),
                    fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
                        SELECT DATE_FORMAT(created, '%Y-%m-%d') AS "Fecha", COUNT(*) AS "Total de registros"
                        FROM client_tbl ct WHERE ${whereClauseCt} AND created >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                        GROUP BY DATE_FORMAT(created, '%Y-%m-%d') ORDER BY "Fecha" ASC LIMIT 100
                    `)),
                    fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
                        SELECT t.type AS "Alerta registrada", COUNT(*) AS "Cantidad"
                        FROM alert_tbl t INNER JOIN client_tbl ct ON ct.id = t.client_id 
                        INNER JOIN dependence_tbl dt ON dt.id = ct.dependence_id 
                        WHERE ${whereClauseCt} GROUP BY t.type ORDER BY "Cantidad" DESC LIMIT 10
                    `)),
                    fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
                        SELECT dt.id, dt.name, COALESCE(AVG(rdt.impact), 1) as x_impact,
                        COALESCE((SELECT COUNT(a.id) FROM alert_tbl a INNER JOIN client_tbl c ON a.client_id = c.id WHERE c.dependence_id = dt.id) * 5.0 / 
                        NULLIF((SELECT COUNT(c.id) FROM client_tbl c WHERE c.dependence_id = dt.id), 0), 1) as y_prob
                        FROM dependence_tbl dt LEFT JOIN riesgos_judiciales_db.risk_action_tbl rat ON rat.dependence_id = dt.id
                        LEFT JOIN riesgos_judiciales_db.risk_data_tbl rdt ON rdt.id = rat.risk_id
                        WHERE ${matrixFilter} GROUP BY dt.id, dt.name
                    `)),
                    fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
                        SELECT dt.name as dependence_name, MAX(a.\`level\`) as alert_level,
                        CASE MAX(a.\`level\`) WHEN 1 THEN 'Crítico' WHEN 2 THEN 'Alto' WHEN 3 THEN 'Medio' WHEN 4 THEN 'Sin Riesgo' ELSE 'No definido' END as alert_description,
                        CEILING(AVG(rdt.impact)) as avg_impact, CEILING(AVG(rdt.probability)) as avg_probability,
                        COUNT(DISTINCT rdt.id) as risk_count, AVG(rdt.impact * rdt.probability) as risk_score
                        FROM riesgos_judiciales_db.risk_action_tbl rat INNER JOIN riesgos_judiciales_db.risk_data_tbl rdt ON rat.risk_id = rdt.id
                        LEFT JOIN client_tbl ct ON ct.dependence_id = rat.dependence_id LEFT JOIN alert_tbl a ON a.client_id = ct.id LEFT JOIN dependence_tbl dt ON dt.id = rat.dependence_id
                        WHERE rat.dependence_id IS NOT NULL AND ${auth.isSuper ? '1=1' : `rat.dependence_id = '${auth.dependenceId}'`}
                        GROUP BY dt.name, rat.dependence_id ORDER BY risk_score DESC
                    `)),
                    fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
                        SELECT rdt.name as "Riesgo", rdt.description as "Descripcion", rdt.status as "Estado", rat.description as "Accion"
                        FROM riesgos_judiciales_db.risk_data_tbl rdt inner join riesgos_judiciales_db.risk_action_tbl rat on rat.risk_id = rdt.id
                        WHERE ${auth.isSuper ? '1=1' : `rat.dependence_id = '${auth.dependenceId}'`}
                    `))
                ]);

                const [kpiD, bar1D, bar2D, lineD, pieD, matrixD, tableD, detailsD] = await Promise.all([
                    kpiRes.json(), bar1Res.json(), bar2Res.json(), lineRes.json(), pieRes.json(), matrixRes.json(), tableRes.json(), detailsRes.json()
                ]);

                const kpis: KpiData[] = [
                    { label: "Búsquedas realizadas", value: kpiD[0]?.busquedas_realizadas || 0 },
                    { label: "Total alertas", value: kpiD[0]?.total_alertas || 0 },
                    { label: "Clientes con alertas", value: kpiD[0]?.clientes_con_alertas || 0 },
                    { label: "Tiempo promedio (min)", value: parseFloat(kpiD[0]?.tiempo_promedio_caso || 0).toFixed(1), suffix: " min" }
                ];

                const points = Array.isArray(matrixD) ? matrixD.map((row: any) => ({
                    id: row.id, name: row.name,
                    x: Math.min(5, Math.max(1, parseFloat(row.x_impact || 1))),
                    y: Math.min(5, Math.max(1, parseFloat(row.y_prob || 1)))
                })) : [];

                setRiskDetailsRows(Array.isArray(detailsD) ? detailsD : []);

                setData({
                    kpis,
                    barChart1: { title: "Búsquedas vs Alertas", data: [{ m: "Total", v: bar1D[0]?.["Total clientes"] || 0 }, { m: "Alertas", v: bar1D[0]?.["Total clientes con alertas"] || 0 }], xKey: "m", series: [{ key: "v", label: "Cantidad", color: "#8884d8" }] },
                    barChart2: { title: "Uso por Dependencia", data: Array.isArray(bar2D) ? bar2D : [], xKey: "Dependencia", series: [{ key: "Total casos", label: "Casos", color: "#82ca9d" }] },
                    lineChart: { title: "Evolución Temporal", data: Array.isArray(lineD) ? lineD : [], xKey: "Fecha", lines: [{ key: "Total de registros", label: "Registros", color: "#8884d8" }] },
                    pieChart: { title: "Tipos de Alerta", data: Array.isArray(pieD) ? pieD : [], nameKey: "Alerta registrada", valueKey: "Cantidad" },
                    riskMatrix: { title: "POSICIONAMIENTO DE RIESGO DE LA DEPENDENCIA", points },
                    table: { title: "Análisis de Riesgos", columns: [{ key: "dependence_name", header: "Dependencia" }, { key: "alert_description", header: "Nivel" }, { key: "risk_count", header: "Riesgos" }, { key: "risk_score", header: "Score" }], rows: Array.isArray(tableD) ? tableD.map((r: any) => ({ ...r, risk_score: parseFloat(r.risk_score || 0).toFixed(2) })) : [] }
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error de carga");
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [auth]);

    if (loading) return <div className="p-8 text-center text-gray-400 font-bold">Cargando panel de dependencia...</div>;
    if (error) return <div className="p-8 text-red-500 bg-red-50 rounded-3xl">Error: {error}</div>;
    if (!data) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            <div className="max-w-full mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                            Reportería por Dependencia
                        </h2>
                        <a 
                            href="/config" 
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-black uppercase tracking-tighter hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
                        >
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            Configurar Matrices
                        </a>
                    </div>
                    <ThemeToggle />
                </div>

                {/* 1. KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {data.kpis.map((kpi, idx) => <KpiCard key={idx} {...kpi} />)}
                </div>

                {/* 2. Matriz de Riesgo - FULL WIDTH */}
                <div className="mb-10 w-full">
                    <RiskMatrixScatter
                        key={data.riskMatrix.points.map(p => p.id).join('-')}
                        title={data.riskMatrix.title}
                        points={data.riskMatrix.points}
                    />
                </div>

                {/* 3. Gráficas Principales */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                    <ChartCard title={data.barChart1.title}>
                        <BarChartGeneric data={data.barChart1.data} xKey={data.barChart1.xKey} series={data.barChart1.series} />
                    </ChartCard>
                    <ChartCard title={data.barChart2.title}>
                        <BarChartGeneric data={data.barChart2.data} xKey={data.barChart2.xKey} series={data.barChart2.series} />
                    </ChartCard>
                </div>

                {/* 4. Tablas */}
                <div className="grid grid-cols-1 gap-8 mb-8">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tighter">Detalles de Riesgos Judiciales</h3>
                    <TableGeneric
                        columns={[
                            { key: "Riesgo", header: "Riesgo" },
                            { key: "Descripcion", header: "Descripción" },
                            { key: "Estado", header: "Estado" },
                            { key: "Accion", header: "Acción" }
                        ]}
                        rows={riskDetailsRows}
                    />
                </div>
            </div>
        </div>
    );
}
