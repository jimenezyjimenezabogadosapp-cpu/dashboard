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

export default function ReporteriaGeneralClient() {
    const searchParams = useSearchParams();
    const [data, setData] = useState<ReporteriaData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [points, setPoints] = useState<RiskPoint[]>([]);
    const [selectedPoints, setSelectedPoints] = useState<string[]>([]);
    const [impactFilter, setImpactFilter] = useState<number[]>([1, 2, 3, 4, 5]);
    const [probFilter, setProbFilter] = useState<number[]>([1, 2, 3, 4, 5]);
    const [riskDetailsRows, setRiskDetailsRows] = useState<any[]>([]);

    // 1. Detección de Roles y Dependencia (Memoized para evitar fugas de seguridad)
    const auth = useMemo(() => {
        const rawRole = (searchParams.get("role_id") || "USER").toString().toUpperCase();
        const depId = searchParams.get("dependence_id") || "";
        const uId = searchParams.get("user_id") || "";
        
        return {
            isSuper: rawRole === "1" || rawRole === "SUPER",
            isAdmin: rawRole === "2" || rawRole === "ADMIN",
            isUser: rawRole === "3" || rawRole === "USER",
            dependenceId: depId,
            userId: uId
        };
    }, [searchParams]);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);

                const userKey = "019bdbff-d27c-7583-b76f-80edd5ae064e";
                
                // Generador de cláusulas WHERE ultra-seguro
                const getWhereClause = (tableAlias: string = "") => {
                    const prefix = tableAlias ? `${tableAlias}.` : "";
                    if (auth.isSuper) return "1=1";
                    // ADMIN y USER solo ven su dependencia asignada. Si no hay ID, bloqueamos (1=0)
                    return auth.dependenceId ? `${prefix}dependence_id = '${auth.dependenceId}'` : "1=0";
                };

                const whereClause = getWhereClause();
                const whereClauseCt = getWhereClause("ct");
                const matrixFilter = auth.isSuper ? '1=1' : `dt.id = '${auth.dependenceId}'`;

                // Fetching con filtros forzados
                const kpiResponse = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
          SELECT 
            (SELECT COUNT(*) FROM client_tbl WHERE ${whereClause}) as busquedas_realizadas,
            (SELECT COUNT(*) FROM alert_tbl a INNER JOIN client_tbl c ON a.client_id = c.id WHERE ${getWhereClause("c")}) as total_alertas,
            (SELECT COUNT(DISTINCT client_id) FROM alert_tbl a INNER JOIN client_tbl c ON a.client_id = c.id WHERE ${getWhereClause("c")}) as clientes_con_alertas,
            (SELECT AVG(execute_time) FROM stadistics_usage_tbl WHERE 1=1) as tiempo_promedio_caso
        `));

                const bar1Response = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
          SELECT 
            (SELECT COUNT(*) FROM client_tbl WHERE ${whereClause}) as "Total clientes",
            (SELECT COUNT(DISTINCT client_id) FROM alert_tbl a INNER JOIN client_tbl c ON a.client_id = c.id WHERE ${getWhereClause("c")}) as "Total clientes con alertas"
        `));

                const bar2Response = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
          SELECT 
            dt.name as "Dependencia",
            COUNT(*) as "Total casos"
          FROM client_tbl ct
          INNER JOIN dependence_tbl dt ON dt.id = ct.dependence_id 
          WHERE ${whereClauseCt}
          GROUP BY ct.dependence_id
          ORDER BY COUNT(*) DESC
        `));

                const lineResponse = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
          SELECT 
            DATE_FORMAT(created, '%Y-%m-%d') AS "Fecha",
            COUNT(*) AS "Total de registros"
          FROM client_tbl ct
          WHERE ${whereClauseCt} AND created >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
          GROUP BY DATE_FORMAT(created, '%Y-%m-%d')
          ORDER BY "Fecha" ASC
          LIMIT 100
        `));

                const pieResponse = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
          SELECT 
            t.type AS "Alerta registrada",
            COUNT(*) AS "Cantidad"
          FROM alert_tbl t
          INNER JOIN client_tbl ct ON ct.id = t.client_id 
          INNER JOIN dependence_tbl dt ON dt.id = ct.dependence_id 
          WHERE ${whereClauseCt}
          GROUP BY t.type
          ORDER BY "Cantidad" DESC
          LIMIT 10
        `));

                const riskMatrixResponse = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
          SELECT 
            dt.id,
            dt.name,
            COALESCE(AVG(rdt.impact), 1) as x_impact,
            COALESCE(
              (SELECT COUNT(a.id) FROM alert_tbl a INNER JOIN client_tbl c ON a.client_id = c.id WHERE c.dependence_id = dt.id) * 5.0 / 
              NULLIF((SELECT COUNT(c.id) FROM client_tbl c WHERE c.dependence_id = dt.id), 0),
              1
            ) as y_prob
          FROM dependence_tbl dt
          LEFT JOIN riesgos_judiciales_db.risk_action_tbl rat ON rat.dependence_id = dt.id
          LEFT JOIN riesgos_judiciales_db.risk_data_tbl rdt ON rdt.id = rat.risk_id
          WHERE ${matrixFilter}
          GROUP BY dt.id, dt.name
        `));

                const riskDetailsResponse = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
          SELECT 
            rdt.name as "Riesgo", 
            rdt.description as "Descripcion", 
            rdt.status as "Estado",
            rat.description as "Accion"
          FROM riesgos_judiciales_db.risk_data_tbl rdt
          inner join riesgos_judiciales_db.risk_action_tbl rat on rat.risk_id = rdt.id
          WHERE ${auth.isSuper ? '1=1' : `rat.dependence_id = '${auth.dependenceId}'`}
        `));

                const tableResponse = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
          SELECT 
            dt.name as dependence_name,
            MAX(a.\`level\`) as alert_level,
            CASE MAX(a.\`level\`)
              WHEN 1 THEN 'Crítico'
              WHEN 2 THEN 'Alto' 
              WHEN 3 THEN 'Medio'
              WHEN 4 THEN 'Sin Riesgo'
              ELSE 'No definido'
            END as alert_description,
            CEILING(AVG(rdt.impact)) as avg_impact,
            CEILING(AVG(rdt.probability)) as avg_probability,
            COUNT(DISTINCT rdt.id) as risk_count,
            AVG(rdt.impact * rdt.probability) as risk_score
          FROM riesgos_judiciales_db.risk_action_tbl rat
          INNER JOIN riesgos_judiciales_db.risk_data_tbl rdt ON rat.risk_id = rdt.id
          LEFT JOIN client_tbl ct ON ct.dependence_id = rat.dependence_id
          LEFT JOIN alert_tbl a ON a.client_id = ct.id
          LEFT JOIN dependence_tbl dt ON dt.id = rat.dependence_id
          WHERE rat.dependence_id IS NOT NULL AND ${auth.isSuper ? '1=1' : `rat.dependence_id = '${auth.dependenceId}'`}
          GROUP BY dt.name, rat.dependence_id
          ORDER BY risk_score DESC
        `));

                const [kpiData, bar1Data, bar2Data, lineData, pieData, riskMatrixData, tableData, riskDetailsData] = await Promise.all([
                    kpiResponse.json(),
                    bar1Response.json(),
                    bar2Response.json(),
                    lineResponse.json(),
                    pieResponse.json(),
                    riskMatrixResponse.json(),
                    tableResponse.json(),
                    riskDetailsResponse.json()
                ]);

                const kpis: KpiData[] = [
                    { label: "Búsquedas realizadas", value: kpiData[0]?.busquedas_realizadas || 0 },
                    { label: "Total alertas", value: kpiData[0]?.total_alertas || 0 },
                    { label: "Clientes con alertas", value: kpiData[0]?.clientes_con_alertas || 0 },
                    {
                        label: "Tiempo promedio por caso (min)",
                        value: parseFloat(kpiData[0]?.tiempo_promedio_caso || 0).toFixed(1),
                        suffix: " min"
                    }
                ];

                let riskPoints: RiskPoint[] = Array.isArray(riskMatrixData)
                    ? riskMatrixData.map((row: any) => ({
                        id: row.id,
                        name: row.name,
                        x: Math.min(5, Math.max(1, parseFloat(row.x_impact || 1))),
                        y: Math.min(5, Math.max(1, parseFloat(row.y_prob || 1)))
                    }))
                    : [];

                setPoints(riskPoints);
                setSelectedPoints(riskPoints.map(p => p.id));
                setRiskDetailsRows(Array.isArray(riskDetailsData) ? riskDetailsData : []);

                const reporteriaData: ReporteriaData = {
                    kpis,
                    barChart1: {
                        title: "Total Búsquedas vs Clientes con Alertas",
                        data: [
                            { metric: "Total clientes", value: bar1Data[0]?.["Total clientes"] || 0 },
                            { metric: "Clientes con alertas", value: bar1Data[0]?.["Total clientes con alertas"] || 0 }
                        ],
                        xKey: "metric",
                        series: [{ key: "value", label: "Cantidad", color: "#8884d8" }]
                    },
                    barChart2: {
                        title: "Uso del Aplicativo por Dependencia",
                        data: Array.isArray(bar2Data) ? bar2Data : [],
                        xKey: "Dependencia",
                        series: [{ key: "Total casos", label: "Total Casos", color: "#82ca9d" }]
                    },
                    lineChart: {
                        title: "Evolución de Casos (Últimos 3 meses)",
                        data: Array.isArray(lineData) ? lineData : [],
                        xKey: "Fecha",
                        lines: [{ key: "Total de registros", label: "Total de Registros", color: "#8884d8" }]
                    },
                    pieChart: {
                        title: "Distribución de Alertas por Tipo (TOP 10)",
                        data: Array.isArray(pieData) ? pieData : [],
                        nameKey: "Alerta registrada",
                        valueKey: "Cantidad"
                    },
                    riskMatrix: {
                        title: "Matriz de Riesgos por Dependencia",
                        points: riskPoints
                    },
                    table: {
                        title: "Análisis de Riesgos por Dependencia",
                        columns: [
                            { key: "dependence_name", header: "Dependencia" },
                            { key: "alert_description", header: "Nivel de Alerta" },
                            { key: "risk_count", header: "Total Riesgos" },
                            { key: "avg_impact", header: "Impacto Promedio" },
                            { key: "avg_probability", header: "Probabilidad Promedio" },
                            { key: "risk_score", header: "Score de Riesgo" }
                        ],
                        rows: Array.isArray(tableData) ? tableData.map((row: any) => ({ ...row, risk_score: parseFloat(row.risk_score || 0).toFixed(2) })) : []
                    }
                };

                setData(reporteriaData);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error al cargar los datos");
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [auth]); // Escucha cambios en auth (role, dependenceId)

    if (loading) return <div className="p-8 text-center text-gray-400">Analizando estructura de riesgos...</div>;
    if (error) return <div className="p-8 text-red-500 bg-red-50 rounded-3xl border border-red-100">Error: {error}</div>;
    if (!data) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            <div className="max-w-full mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Reportería General</h2>
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

                {/* 1. KPIs (TOP) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {data.kpis.map((kpi, idx) => <KpiCard key={idx} {...kpi} />)}
                </div>

                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-[32px] p-8 shadow-xl border border-gray-100 dark:border-gray-700 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="w-2 h-6 bg-blue-500 rounded-full animate-pulse" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-gray-100">
                            Consola de Filtrado de Riesgos
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* NIVEL DE IMPACTO */}
                        <div className="lg:col-span-3 space-y-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nivel de Impacto</p>
                            <div className="flex flex-wrap gap-2">
                                {["Muy Bajo", "Bajo", "Medio", "Alto", "Muy Alto"].map((label, i) => {
                                    const val = i + 1;
                                    const isActive = impactFilter.includes(val);
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setImpactFilter(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])}
                                            className={cn(
                                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all duration-300 border",
                                                isActive
                                                    ? "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20 scale-105"
                                                    : "bg-amber-50/50 text-amber-600 border-amber-100 hover:border-amber-300 dark:bg-amber-900/10 dark:border-amber-900/30 dark:text-amber-400"
                                            )}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* NIVEL DE PROBABILIDAD */}
                        <div className="lg:col-span-4 space-y-4 lg:border-l lg:border-gray-100 dark:lg:border-gray-700 lg:pl-8">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nivel de Probabilidad</p>
                            <div className="flex flex-wrap gap-2">
                                {["Improbable", "Poco Probable", "Posible", "Probable", "Muy Probable"].map((label, i) => {
                                    const val = i + 1;
                                    const isActive = probFilter.includes(val);
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setProbFilter(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])}
                                            className={cn(
                                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all duration-300 border",
                                                isActive
                                                    ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20 scale-105"
                                                    : "bg-blue-50/50 text-blue-600 border-blue-100 hover:border-blue-300 dark:bg-blue-900/10 dark:border-blue-900/30 dark:text-blue-400"
                                            )}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* DEPENDENCIAS */}
                        <div className="lg:col-span-5 space-y-4 lg:border-l lg:border-gray-100 dark:lg:border-gray-700 lg:pl-8">
                            <div className="flex justify-between items-center">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Dependencias</p>
                                <div className="flex gap-3">
                                    {auth.isSuper && (
                                        <button 
                                            onClick={() => setSelectedPoints(points.map(p => p.id))}
                                            className="text-[10px] font-black text-blue-500 hover:text-blue-600 uppercase tracking-tighter transition-colors"
                                        >
                                            Todas
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => setSelectedPoints([])}
                                        className="text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-tighter transition-colors"
                                    >
                                        Ninguna
                                    </button>
                                </div>
                            </div>
                            <div className="h-32 overflow-y-auto pr-2 custom-scrollbar">
                                <div className="flex flex-wrap gap-2">
                                    {points.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => auth.isSuper && setSelectedPoints(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all duration-200 border uppercase tracking-tight",
                                                selectedPoints.includes(p.id)
                                                    ? "bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:border-gray-100 dark:text-gray-900"
                                                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
                                                !auth.isSuper && "cursor-default"
                                            )}
                                        >
                                            {p.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Matriz de Riesgo - FULL WIDTH */}
                <div className="mb-10 w-full">
                    <RiskMatrixScatter
                        key={points.map(p => p.id).join('-')} // Forzar re-render si cambian los puntos (limpieza de tooltips)
                        title={data.riskMatrix.title}
                        points={points.filter(p => 
                            selectedPoints.includes(p.id) && 
                            impactFilter.includes(Math.round(p.x)) && 
                            probFilter.includes(Math.round(p.y))
                        )}
                    />
                </div>

                {/* 4. Gráficas Principales */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                    <ChartCard title={data.barChart1.title}>
                        <BarChartGeneric data={data.barChart1.data} xKey={data.barChart1.xKey} series={data.barChart1.series} />
                    </ChartCard>
                    <ChartCard title={data.barChart2.title}>
                        <BarChartGeneric data={data.barChart2.data} xKey={data.barChart2.xKey} series={data.barChart2.series} />
                    </ChartCard>
                    <ChartCard title={data.lineChart.title}>
                        <LineChartGeneric data={data.lineChart.data} xKey={data.lineChart.xKey} lines={data.lineChart.lines} />
                    </ChartCard>
                    <ChartCard title={data.pieChart.title}>
                        <PieChartGeneric data={data.pieChart.data} nameKey={data.pieChart.nameKey} valueKey={data.pieChart.valueKey} />
                    </ChartCard>
                </div>

                {/* 5. Tablas de Análisis */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{data.table.title}</h3>
                        <TableGeneric columns={data.table.columns} rows={data.table.rows} />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Detalles de Riesgos</h3>
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
        </div>
    );
}
