"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { LayoutDashboard, List, AlertTriangle, Zap, Activity, GraduationCap } from "lucide-react";
import { useSearchParams } from "next/navigation";
import KpiCard from "./dashboard/KpiCard";
import ChartCard from "./dashboard/ChartCard";
import BarChartGeneric from "./dashboard/charts/BarChartGeneric";
import LineChartGeneric from "./dashboard/charts/LineChartGeneric";
import PieChartGeneric from "./dashboard/charts/PieChartGeneric";
import GaugeChartGeneric from "./dashboard/charts/GaugeChartGeneric";
import TableGeneric from "./dashboard/TableGeneric";
import RiskMatrixScatter from "./dashboard/RiskMatrixScatter";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { fetchSql } from "@/lib/fetch-sql";

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
    const [matrixMode, setMatrixMode] = useState<"deps" | "inherent" | "residual" | "training">("deps");
    const [matrixDepId, setMatrixDepId] = useState<string>("");
    const [individualRisks, setIndividualRisks] = useState<any[]>([]);
    const [allDependencies, setAllDependencies] = useState<any[]>([]);
    const [trainingData, setTrainingData] = useState<any[]>([]);

    // Seguridad por Rol
    const auth = useMemo(() => {
        const rawRole = (searchParams.get("role_id") || "USER").toString().toUpperCase();
        const role = rawRole === "1" || rawRole === "SUPER" ? "SUPER" : 
                     rawRole === "2" || rawRole === "ADMIN" ? "ADMIN" :
                     rawRole === "3" || rawRole === "TRAINER" ? "TRAINER" : "USER";
        const depId = searchParams.get("dependence_id") || "";
        const userId = searchParams.get("user_id") || "";
        
        return {
            isSuper: role === "SUPER",
            role,
            dependenceId: depId,
            userId
        };
    }, [searchParams]);

    const viewRole = auth.role;
    const canSeeAll = searchParams.get("can_see_all") === "true";

    const EFFICACY_MAP: Record<string, { eff: number, nature: "Preventivo" | "Detectivo" }> = {
        "Verificación Automática en Listas Restrictivas": { eff: 0.85, nature: "Preventivo" },
        "Monitoreo Transaccional Automatizado": { eff: 0.85, nature: "Detectivo" },
        "Debida Diligencia Intensificada (Manual)": { eff: 0.65, nature: "Preventivo" },
        "Reporte de Operaciones Sospechosas (ROS)": { eff: 0.75, nature: "Detectivo" },
        "Capacitación y Concienciación Periódica": { eff: 0.40, nature: "Preventivo" },
        "Conciliación de Saldos Mensual": { eff: 0.55, nature: "Detectivo" },
        "Auditoría Interna de Procesos": { eff: 0.70, nature: "Detectivo" },
    };

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const userKey = "019bdbff-d27c-7583-b76f-80edd5ae064e";

                // Cláusulas WHERE seguras
                // Cláusulas WHERE seguras
                const targetDepId = matrixDepId || auth.dependenceId;
                const getWhereClause = (tableAlias: string = "") => {
                    const prefix = tableAlias ? `${tableAlias}.` : "";
                    const strictFilters = `${prefix}parent_client_id IS NULL AND (${prefix}workflow_status NOT IN ('PENDING_DOCS', 'INVITED') OR ${prefix}workflow_status IS NULL)`;
                    
                    if (auth.isSuper && !matrixDepId) return `1=1 AND ${strictFilters}`;
                    
                    if (!targetDepId) return "1=0";
                    const depIds = targetDepId.split(',');
                    let depCondition = depIds.length > 1 
                        ? `${prefix}dependence_id IN (${depIds.map(id => `'${id}'`).join(',')})`
                        : `${prefix}dependence_id = '${targetDepId}'`;
                    
                    return `${depCondition} AND ${prefix}parent_client_id IS NULL AND (${prefix}workflow_status NOT IN ('PENDING_DOCS', 'INVITED') OR ${prefix}workflow_status IS NULL)`;
                };

                const whereClause = getWhereClause();
                const whereClauseCt = getWhereClause("ct");
                // Schema de Postgres a apuntar: vacio = todos los tenants (SUPER sin filtro)
                const depIdParam = (auth.isSuper && !matrixDepId) ? undefined : targetDepId;

                let matrixFilter = '1=1';
                if (!(auth.isSuper && !matrixDepId) && targetDepId) {
                    const depIds = targetDepId.split(',');
                    matrixFilter = depIds.length > 1 
                        ? `dt.id IN (${depIds.map(id => `'${id}'`).join(',')})`
                        : `dt.id = '${targetDepId}'`;
                }

                // Fetch dependencies for dropdown
                const depsRes = await fetchSql(userKey, `SELECT id, name FROM dependence_tbl ORDER BY name ASC`);
                const depsD = await depsRes.json();
                
                let processedDeps = [];
                if (Array.isArray(depsD)) {
                    const uniqueMap = new Map();
                    depsD.forEach((item: any) => {
                        const key = (item.name || '').trim().toUpperCase();
                        if (!uniqueMap.has(key)) {
                            item.allIds = [item.id];
                            uniqueMap.set(key, item);
                        } else {
                            uniqueMap.get(key).allIds.push(item.id);
                        }
                    });
                    processedDeps = Array.from(uniqueMap.values()).map((item: any) => {
                        item.id = item.allIds.join(',');
                        return item;
                    });
                }
                setAllDependencies(processedDeps);

                // Default selected dep for SUPER
                if (auth.isSuper && !matrixDepId && Array.isArray(depsD)) {
                    const adminSys = depsD.find(d => d.name.toLowerCase().includes("administración sistema") || d.name.toLowerCase().includes("administracion sistema"));
                    if (adminSys) setMatrixDepId(adminSys.id);
                    else if (depsD.length > 0) setMatrixDepId(depsD[0].id);
                } else if (!auth.isSuper && auth.dependenceId) {
                    setMatrixDepId(auth.dependenceId);
                }

                // Fetch Individual Risks for modes 2 & 3
                const indRisksRes = await fetchSql(userKey, `
                    SELECT rdt.id, rdt.name, rdt.impact, rdt.probability, rat.dependence_id, rat.type as control_type, rat.description as action_desc
                    FROM risk_data_tbl rdt
                    INNER JOIN risk_action_tbl rat ON rat.risk_id = rdt.id
                    WHERE rat.dependence_id IS NOT NULL
                `);
                const indRisksD = await indRisksRes.json();
                setIndividualRisks(Array.isArray(indRisksD) ? indRisksD : []);

                // Fetching de todo el dashboard segmentado
                const [kpiRes, bar1Res, bar2Res, lineRes, pieRes, matrixRes, tableRes, detailsRes, trainingRes] = await Promise.all([
                    fetchSql(userKey, `
                        SELECT
                            (SELECT COUNT(*) FROM client_tbl WHERE ${whereClause}) as busquedas_realizadas,
                            (SELECT COUNT(*) FROM alert_tbl a INNER JOIN client_tbl c ON a.client_id = c.id WHERE ${getWhereClause("c")}) as total_alertas,
                            (SELECT COUNT(DISTINCT client_id) FROM alert_tbl a INNER JOIN client_tbl c ON a.client_id = c.id WHERE ${getWhereClause("c")}) as clientes_con_alertas,
                            (SELECT AVG(execute_time) FROM stadistics_usage_tbl WHERE 1=1) as tiempo_promedio_caso
                    `, depIdParam),
                    fetchSql(userKey, `
                        SELECT
                            (SELECT COUNT(*) FROM client_tbl WHERE ${whereClause}) as "Total clientes",
                            (SELECT COUNT(DISTINCT client_id) FROM alert_tbl a INNER JOIN client_tbl c ON a.client_id = c.id WHERE ${getWhereClause("c")}) as "Total clientes con alertas"
                    `, depIdParam),
                    fetchSql(userKey, `
                        SELECT dt.name as "Dependencia", COUNT(*) as "Total casos"
                        FROM client_tbl ct INNER JOIN dependence_tbl dt ON dt.id = ct.dependence_id
                        WHERE ${whereClauseCt} GROUP BY ct.dependence_id ORDER BY COUNT(*) DESC
                    `, depIdParam),
                    fetchSql(userKey, `
                        SELECT TO_CHAR(created, 'YYYY-MM-DD') AS "Fecha", COUNT(*) AS "Total de registros"
                        FROM client_tbl ct WHERE ${whereClauseCt} AND created >= CURRENT_DATE - INTERVAL '3 months'
                        GROUP BY TO_CHAR(created, 'YYYY-MM-DD') ORDER BY "Fecha" ASC LIMIT 100
                    `, depIdParam),
                    fetchSql(userKey, `
                        SELECT t.type AS "Alerta registrada", COUNT(*) AS "Cantidad"
                        FROM alert_tbl t INNER JOIN client_tbl ct ON ct.id = t.client_id
                        INNER JOIN dependence_tbl dt ON dt.id = ct.dependence_id
                        WHERE ${whereClauseCt} GROUP BY t.type ORDER BY "Cantidad" DESC LIMIT 10
                    `, depIdParam),
                    fetchSql(userKey, `
                        SELECT dt.id, dt.name, COALESCE(AVG(rdt.impact), 1) as x_impact,
                        COALESCE((SELECT COUNT(a.id) FROM alert_tbl a INNER JOIN client_tbl c ON a.client_id = c.id WHERE c.dependence_id = dt.id) * 5.0 /
                        NULLIF((SELECT COUNT(c.id) FROM client_tbl c WHERE c.dependence_id = dt.id), 0), 1) as y_prob
                        FROM dependence_tbl dt LEFT JOIN risk_action_tbl rat ON rat.dependence_id = dt.id
                        LEFT JOIN risk_data_tbl rdt ON rdt.id = rat.risk_id
                        WHERE ${matrixFilter} GROUP BY dt.id, dt.name
                    `, depIdParam),
                    fetchSql(userKey, `
                        SELECT dt.name as dependence_name, COALESCE(MIN(CASE WHEN a.level IN ('1', 'CRITICAL', 'CRÍTICO') THEN 1 WHEN a.level IN ('2', 'HIGH', 'ALTO') THEN 2 WHEN a.level IN ('3', 'MEDIUM', 'MEDIO') THEN 3 ELSE 4 END), 4) as alert_level,
                        CASE COALESCE(MIN(CASE WHEN a.level IN ('1', 'CRITICAL', 'CRÍTICO') THEN 1 WHEN a.level IN ('2', 'HIGH', 'ALTO') THEN 2 WHEN a.level IN ('3', 'MEDIUM', 'MEDIO') THEN 3 ELSE 4 END), 4) WHEN 1 THEN 'Crítico' WHEN 2 THEN 'Alto' WHEN 3 THEN 'Medio' WHEN 4 THEN 'Sin Riesgo' ELSE 'No definido' END as alert_description,
                        CEILING(AVG(rdt.impact)) as avg_impact, CEILING(AVG(rdt.probability)) as avg_probability,
                        COUNT(DISTINCT rdt.id) as risk_count, AVG(rdt.impact * rdt.probability) as risk_score
                        FROM risk_action_tbl rat INNER JOIN risk_data_tbl rdt ON rat.risk_id = rdt.id
                        LEFT JOIN client_tbl ct ON ct.dependence_id = rat.dependence_id LEFT JOIN alert_tbl a ON a.client_id = ct.id LEFT JOIN dependence_tbl dt ON dt.id = rat.dependence_id
                        WHERE rat.dependence_id IS NOT NULL AND ${auth.isSuper && !matrixDepId ? '1=1' : (targetDepId ? (targetDepId.split(',').length > 1 ? `rat.dependence_id IN (${targetDepId.split(',').map(id => `'${id}'`).join(',')})` : `rat.dependence_id = '${targetDepId}'`) : '1=0')}
                        GROUP BY dt.name, rat.dependence_id ORDER BY risk_score DESC
                    `, depIdParam),
                    fetchSql(userKey, `
                        SELECT rdt.name as "Riesgo", rdt.description as "Descripcion", rdt.status as "Estado", rat.description as "Accion"
                        FROM risk_data_tbl rdt inner join risk_action_tbl rat on rat.risk_id = rdt.id
                        WHERE ${auth.isSuper ? '1=1' : (auth.dependenceId ? (auth.dependenceId.split(',').length > 1 ? `rat.dependence_id IN (${auth.dependenceId.split(',').map(id => `'${id}'`).join(',')})` : `rat.dependence_id = '${auth.dependenceId}'`) : '1=0')}
                    `),
                    fetchSql(userKey, `
                        SELECT u.email as "Correo", u.name as "Nombre", u.area as "Area",
                        (SELECT COUNT(*) FROM training_progress_tbl tp WHERE tp."userId" = u.id) as "Completados",
                        (SELECT COUNT(*) FROM training_tbl t WHERE (t.status = true OR t.status::text = '1')) as "Total",
                        COALESCE((SELECT AVG(tp.score) FROM training_progress_tbl tp WHERE tp."userId" = u.id), 0) as "Puntaje Promedio"
                        FROM users_app_tbl u
                        WHERE
                        ${(auth.role === 'SUPER' || (auth.role === 'TRAINER' && canSeeAll)) ? `u.role = 'STUDENT'` :
                          (auth.role === 'ADMIN' || auth.role === 'TRAINER') ? (auth.dependenceId ? (auth.dependenceId.split(',').length > 1 ? `u.dependence_id IN (${auth.dependenceId.split(',').map(id => `'${id}'`).join(',')}) AND u.role = 'STUDENT'` : `u.dependence_id = '${auth.dependenceId}' AND u.role = 'STUDENT'`) : '1=0') :
                          `u.id = '${auth.userId}'`}
                    `)
                ]);

                const [kpiD, bar1D, bar2D, lineD, pieD, matrixD, tableD, detailsD, trainingD] = await Promise.all([
                    kpiRes.json(), bar1Res.json(), bar2Res.json(), lineRes.json(), pieRes.json(), matrixRes.json(), tableRes.json(), detailsRes.json(), trainingRes.json()
                ]);

                console.log("Segmented Training Data:", trainingD);


                const kpis: KpiData[] = [
                    { label: "Búsquedas realizadas", value: kpiD[0]?.busquedas_realizadas || 0 },
                    { label: "Total alertas", value: kpiD[0]?.total_alertas || 0 },
                    { label: "Clientes con alertas", value: kpiD[0]?.clientes_con_alertas || 0 },
                    { label: "Tiempo promedio (min)", value: parseFloat(kpiD[0]?.tiempo_promedio_caso || 0).toFixed(1), suffix: " min" }
                ];

                const points = Array.isArray(matrixD) ? matrixD.map((row: any) => ({
                    id: row.id, name: row.name,
                    // Normalización: Impacto (0-20) -> 1-5, Probabilidad (0-4) -> 1-5
                    x: Math.min(5, Math.max(1, (parseFloat(row.x_impact || 1) / 20) * 5)),
                    y: Math.min(5, Math.max(1, (parseFloat(row.y_prob || 1) / 4) * 5))
                })) : [];

                setRiskDetailsRows(Array.isArray(detailsD) ? detailsD : []);
                setTrainingData(Array.isArray(trainingD) ? trainingD : []);


                setData({
                    kpis,
                    barChart1: { title: "Búsquedas vs Alertas", data: [{ m: "Total", v: bar1D[0]?.["Total clientes"] || 0 }, { m: "Alertas", v: bar1D[0]?.["Total clientes con alertas"] || 0 }], xKey: "m", series: [{ key: "v", label: "Cantidad", color: "#8884d8" }] },
                    barChart2: { title: "Uso por Dependencia", data: Array.isArray(bar2D) ? bar2D : [], xKey: "Dependencia", series: [{ key: "Total casos", label: "Casos", color: "#82ca9d" }] },
                    lineChart: { title: "Evolución Temporal", data: Array.isArray(lineD) ? lineD : [], xKey: "Fecha", lines: [{ key: "Total de registros", label: "Registros", color: "#8884d8" }] },
                    pieChart: { title: "Tipos de Alerta", data: Array.isArray(pieD) ? pieD : [], nameKey: "Alerta registrada", valueKey: "Cantidad" },
                    riskMatrix: { title: "POSICIONAMIENTO DE RIESGO DE LA DEPENDENCIA", points },
                    table: { title: "Análisis de Riesgos", columns: [{ key: "dependence_name", header: "Dependencia" }, { key: "alert_description", header: "Nivel" }, { key: "risk_count", header: "Riesgos" }, { key: "risk_score", header: "Score" }], rows: Array.isArray(tableD) ? tableD.map((r: any) => ({ ...r, risk_score: parseFloat(r.risk_score || 0).toFixed(2) })) : [] }
                });

                setRiskDetailsRows(Array.isArray(detailsD) ? detailsD : []);
                setTrainingData(Array.isArray(trainingD) ? trainingD : []);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error de carga");
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [auth, matrixDepId]);

    useEffect(() => {
        const depName = allDependencies.find(d => d.id === matrixDepId)?.name.toUpperCase() || "";
        const isEstudiantes = depName.includes("ESTUDIANTES") || depName.includes("SERGIO ARBOLEDA");
        if (isEstudiantes && matrixMode === "deps") {
            setMatrixMode("training");
        }
    }, [matrixDepId, allDependencies]);

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
                            href={`/dashboard/risk-config?${searchParams.toString()}`} 
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

                {/* 2. Sección Unificada: Configuración + Matriz */}
                <div className="bg-white dark:bg-gray-800 rounded-[32px] shadow-xl border border-gray-100 dark:border-gray-700 mb-8 overflow-hidden">
                    {/* Cabecera de Configuración */}
                    <div className="p-6 border-b border-gray-50 dark:border-gray-900">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-gray-100">Configuración de Matriz</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Cambie la perspectiva del análisis</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700">
                                    {[
                                        { id: "deps", label: "Dependencias", icon: List },
                                        { id: "inherent", label: "Riesgos Inherentes", icon: AlertTriangle },
                                        { id: "residual", label: "Riesgos Residuales", icon: Zap },
                                        { id: "training", label: "Capacitación", icon: GraduationCap }
                                    ].map((m) => (

                                        <button
                                            key={m.id}
                                            onClick={() => setMatrixMode(m.id as any)}
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all",
                                                matrixMode === m.id 
                                                    ? "bg-white dark:bg-gray-800 text-blue-500 shadow-sm border border-gray-100 dark:border-gray-700" 
                                                    : "text-gray-400 hover:text-gray-600"
                                            )}
                                        >
                                            <m.icon className="w-3 h-3" />
                                            {m.label}
                                        </button>
                                    ))}
                                </div>

                                {matrixMode !== "deps" && (
                                    <div className="animate-in fade-in zoom-in-95 duration-300">
                                        <select
                                            disabled={!auth.isSuper}
                                            value={matrixDepId}
                                            onChange={(e) => setMatrixDepId(e.target.value)}
                                            className="px-4 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-[10px] font-black uppercase tracking-tighter outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none pr-8 relative disabled:opacity-60"
                                        >
                                            {allDependencies.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Matriz de Riesgo */}
                    <div className="p-8 bg-gray-50/50 dark:bg-gray-900/20">
                        {matrixMode === "training" ? (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tighter">Progreso de Capacitación</h3>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-tight">Seguimiento de estudiantes</p>
                                    </div>
                                    <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                                        <p className="text-[10px] text-blue-500 font-black uppercase">Total Estudiantes</p>
                                        <p className="text-xl font-bold text-blue-600">{trainingData.length}</p>
                                    </div>
                                </div>
                                <TableGeneric
                                    columns={[
                                        { key: "Correo", header: "Correo Electrónico" },
                                        { key: "Nombre", header: "Estudiante" },
                                        { key: "Area", header: "Área" },
                                        { key: "Completados", header: "Completados" },
                                        { key: "Total", header: "Total Cursos" },
                                        { key: "Puntaje Promedio", header: "Promedio" },
                                        { 
                                            key: "Progreso", 
                                            header: "Progreso %",
                                            className: "w-48"
                                        }
                                    ]}
                                    rows={trainingData.map(row => ({
                                        ...row,
                                        "Puntaje Promedio": parseFloat(row["Puntaje Promedio"]).toFixed(1),
                                        "Progreso": (
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-blue-500 transition-all duration-500" 
                                                        style={{ width: `${(row.Completados / Math.max(1, row.Total)) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-500">
                                                    {Math.round((row.Completados / Math.max(1, row.Total)) * 100)}%
                                                </span>
                                            </div>
                                        )
                                    }))}
                                />
                            </div>
                        ) : (
                            <RiskMatrixScatter
                                key={`${matrixMode}-${matrixDepId}-${data.riskMatrix.points.map(p => p.id).join('-')}`} 
                                title={
                                    matrixMode === "deps" ? "POSICIONAMIENTO DE RIESGO DE LA DEPENDENCIA" :
                                    matrixMode === "inherent" ? `Riesgos Inherentes: ${allDependencies.find(d => d.id === matrixDepId)?.name || ""}` :
                                    `Riesgos Residuales: ${allDependencies.find(d => d.id === matrixDepId)?.name || ""}`
                                }
                                points={
                                    matrixMode === "deps" 
                                        ? data.riskMatrix.points
                                        : individualRisks
                                            .filter(r => matrixDepId ? matrixDepId.split(',').includes(r.dependence_id) : false)
                                            .reduce((acc: RiskPoint[], r) => {
                                                const existing = acc.find(a => a.id === r.id);
                                                const config = EFFICACY_MAP[r.control_type] || { eff: 0.1, nature: "Preventivo" };

                                                if (existing) {
                                                    if (matrixMode === "residual") {
                                                        if (config.nature === "Preventivo") {
                                                            (existing as any).maxProbEff = Math.max((existing as any).maxProbEff || 0, config.eff);
                                                        } else {
                                                            (existing as any).maxImpEff = Math.max((existing as any).maxImpEff || 0, config.eff);
                                                        }
                                                        const resImpact = r.impact * (1 - ((existing as any).maxImpEff || 0));
                                                        const resProb = r.probability * (1 - ((existing as any).maxProbEff || 0));
                                                        existing.x = Math.min(5, Math.max(1, (resImpact / 20) * 5));
                                                        existing.y = Math.min(5, Math.max(1, (resProb / 4) * 5));
                                                    }
                                                    return acc;
                                                }

                                                const probEff = matrixMode === "residual" && config.nature === "Preventivo" ? config.eff : 0;
                                                const impEff = matrixMode === "residual" && config.nature === "Detectivo" ? config.eff : 0;

                                                const resImpact = matrixMode === "residual" ? r.impact * (1 - impEff) : r.impact;
                                                const resProb = matrixMode === "residual" ? r.probability * (1 - probEff) : r.probability;

                                                const p: RiskPoint = {
                                                    id: r.id.toString(),
                                                    name: r.name,
                                                    x: Math.min(5, Math.max(1, (resImpact / 20) * 5)),
                                                    y: Math.min(5, Math.max(1, (resProb / 4) * 5))
                                                };
                                                (p as any).maxProbEff = probEff;
                                                (p as any).maxImpEff = impEff;
                                                acc.push(p);
                                                return acc;
                                            }, [])
                                }
                            />
                        )}
                    </div>

                </div>



                {/* 3. Gráficas Principales */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                    {(viewRole === "USER" || viewRole === "TRAINER") ? (
                        <>
                            <ChartCard title="Desempeño vs Equipo (T. Ejecución)">
                                <div className="h-64">
                                    <GaugeChartGeneric 
                                        value={Math.round((data.barChart1.data.find(d => d.label === 'Mio')?.v / data.barChart1.data.find(d => d.label === 'Equipo')?.v) * 100) || 85} 
                                        label="Eficiencia de Caso"
                                        color="#10b981"
                                    />
                                </div>
                                <p className="text-[10px] text-center text-gray-400 font-bold mt-4 uppercase">Tu velocidad de respuesta es superior al 85% del equipo</p>
                            </ChartCard>
                            <ChartCard title="Estado de Mis Capacitaciones">
                                <div className="space-y-6 p-4">
                                    {[
                                        { name: "Prevención SARLAFT", prog: 100 },
                                        { name: "Debida Diligencia", prog: 60 },
                                        { name: "Uso de la Plataforma", prog: 90 }
                                    ].map((c, i) => (
                                        <div key={i} className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                                                <span className="text-gray-900 dark:text-gray-100">{c.name}</span>
                                                <span className="text-blue-500">{c.prog}%</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${c.prog}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ChartCard>
                        </>
                    ) : (
                        <>
                            <ChartCard title={data.barChart1.title}>
                                <BarChartGeneric data={data.barChart1.data} xKey={data.barChart1.xKey} series={data.barChart1.series} />
                            </ChartCard>
                            <ChartCard title={data.barChart2.title}>
                                <BarChartGeneric data={data.barChart2.data} xKey={data.barChart2.xKey} series={data.barChart2.series} />
                            </ChartCard>
                        </>
                    )}
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
