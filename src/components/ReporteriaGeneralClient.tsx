"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { LayoutDashboard, List, AlertTriangle, Zap, Activity, ShieldAlert, Users, Clock, Database, Server, Terminal, Gauge } from "lucide-react";
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
    const [matrixMode, setMatrixMode] = useState<"deps" | "inherent" | "residual">("deps");
    const [matrixDepId, setMatrixDepId] = useState<string>("");
    const [individualRisks, setIndividualRisks] = useState<any[]>([]);
    const [allDependencies, setAllDependencies] = useState<any[]>([]);

    const [globalDepId, setGlobalDepId] = useState<string>("");
    const [globalUserId, setGlobalUserId] = useState<string>("");
    const [viewRole, setViewRole] = useState<string>(""); // Perspectiva para SUPER
    const [dependenceUsers, setDependenceUsers] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"operacion" | "desempeño">("operacion");
    const [adminTechData, setAdminTechData] = useState<any>(null);
    const [adminPerformanceRows, setAdminPerformanceRows] = useState<any[]>([]);

    const isFirstRender = useRef(true);

    const auth = useMemo(() => {
        const rawRole = (searchParams.get("role_id") || "USER").toString().toUpperCase();
        const depId = searchParams.get("dependence_id") || "";
        const uId = searchParams.get("user_id") || "";
        
        const isSuper = rawRole === "1" || rawRole === "SUPER";
        const isAdmin = rawRole === "2" || rawRole === "ADMIN";
        const isUser = rawRole === "3" || rawRole === "USER";

        return { isSuper, isAdmin, isUser, dependenceId: depId, userId: uId };
    }, [searchParams]);

    useEffect(() => {
        if (isFirstRender.current) {
            setGlobalDepId(auth.dependenceId);
            setGlobalUserId(auth.isUser ? auth.userId : "");
            setViewRole(auth.isSuper ? "SUPER" : (auth.isAdmin ? "ADMIN" : "USER"));
        }
    }, [auth]);

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

                const getWhereClause = (tableAlias: string = "") => {
                    const prefix = tableAlias ? `${tableAlias}.` : "";
                    let conditions = [];
                    if (auth.isSuper) {
                        if (globalDepId && globalDepId !== "ALL") conditions.push(`${prefix}dependence_id = '${globalDepId}'`);
                    } else {
                        conditions.push(`${prefix}dependence_id = '${auth.dependenceId}'`);
                    }
                    if (auth.isUser) conditions.push(`${prefix}users_id = '${auth.userId}'`);
                    else if (globalUserId && globalUserId !== "ALL") conditions.push(`${prefix}users_id = '${globalUserId}'`);
                    return conditions.length > 0 ? conditions.join(" AND ") : "1=1";
                };

                const whereClause = getWhereClause();
                const whereClauseCt = getWhereClause("ct");
                
                // La matriz en perspectiva SUPER siempre debe mostrar todas las dependencias para permitir comparación
                const matrixFilter = (viewRole === "SUPER") ? '1=1' : `dt.id = '${globalDepId || auth.dependenceId}'`;

                // Fetch dependencies for dropdown
                const depsRes = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`SELECT id, name FROM dependence_tbl ORDER BY name ASC`));
                const depsD = await depsRes.json();
                setAllDependencies(Array.isArray(depsD) ? depsD : []);

                // Fetch users for the current dependence (for ADMIN filtering)
                if (globalDepId || auth.dependenceId) {
                    const usersRes = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
                        SELECT DISTINCT c.users_id as user_id, u.email 
                        FROM client_tbl c
                        INNER JOIN users_app_tbl u ON c.users_id = u.id
                        WHERE c.dependence_id = '${globalDepId || auth.dependenceId}' AND c.users_id IS NOT NULL
                    `));
                    const usersD = await usersRes.json();
                    setDependenceUsers(Array.isArray(usersD) ? usersD : []);
                }

                // Default selected dep for SUPER
                if (auth.isSuper && isFirstRender.current && Array.isArray(depsD)) {
                    const adminSys = depsD.find(d => d.name.toLowerCase().includes("administración sistema") || d.name.toLowerCase().includes("administracion sistema"));
                    if (adminSys) {
                        setGlobalDepId(adminSys.id);
                        setMatrixDepId(adminSys.id);
                    } else if (depsD.length > 0) {
                        setGlobalDepId(depsD[0].id);
                        setMatrixDepId(depsD[0].id);
                    }
                    isFirstRender.current = false;
                } else if (!auth.isSuper && isFirstRender.current) {
                    setGlobalDepId(auth.dependenceId);
                    setMatrixDepId(auth.dependenceId);
                    isFirstRender.current = false;
                }

                // Fetch Individual Risks for modes 2 & 3
                const indRisksRes = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
                    SELECT rdt.id, rdt.name, rdt.impact, rdt.probability, rat.dependence_id, rat.type as control_type, rat.description as action_desc
                    FROM riesgos_judiciales_db.risk_data_tbl rdt
                    INNER JOIN riesgos_judiciales_db.risk_action_tbl rat ON rat.risk_id = rdt.id
                    WHERE rat.dependence_id IS NOT NULL
                `));
                const indRisksD = await indRisksRes.json();
                setIndividualRisks(Array.isArray(indRisksD) ? indRisksD : []);

                // --- QUERIES ADAPTADAS A LA PERSPECTIVA (viewRole) ---
                let kpiQuery = "";
                let bar1Query = "";
                let bar2Query = "";
                let lineQuery = "";
                let pieQuery = "";

                if (viewRole === "SUPER" && globalDepId === "SYS_ADMIN") {
                    // PERSPECTIVA SUPER - ADMINISTRADOR DE SISTEMAS (SALUD TÉCNICA)
                    kpiQuery = `
                        SELECT 
                            99.9 as uptime,
                            ROUND((SELECT AVG(execute_time) FROM stadistics_usage_tbl), 0) as avg_response,
                            ROUND((SELECT COUNT(*) FROM client_tbl WHERE created >= CURDATE()), 0) as today_requests,
                            0.5 as error_rate,
                            ROUND((SELECT COUNT(*) FROM client_tbl WHERE client_type != 'Natural' AND created >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) * 0.45, 2) as api_costs
                    `;
                    bar1Query = `SELECT 'Dilisense' as label, 45 as value UNION ALL SELECT 'Paco' as label, 30 as value UNION ALL SELECT 'Cruce Judicial' as label, 25 as value`; 
                    bar2Query = `SELECT 'Módulo Auth' as label, 120 as value UNION ALL SELECT 'Módulo PDF' as label, 450 as value UNION ALL SELECT 'Módulo Buscador' as label, 280 as value`; // Latencia
                    lineQuery = `SELECT DATE_FORMAT(created, '%H:00') as label, ROUND(COUNT(*), 0) as value FROM client_tbl WHERE created >= CURDATE() GROUP BY label ORDER BY label ASC`;
                    pieQuery = `SELECT 'Exitosas' as label, 98 as value UNION ALL SELECT 'Fallidas' as label, 2 as value`;
                } else if (viewRole === "SUPER" || viewRole === "ADMIN") {
                    // PERSPECTIVA SUPER (GENERAL) O ADMIN (DEPENDENCIA)
                    const depId = globalDepId === "ALL" || globalDepId === "SYS_ADMIN" ? "" : (globalDepId || auth.dependenceId);
                    const depFilter = depId ? `WHERE c.dependence_id = '${depId}'` : "";
                    const depFilterJoin = depId ? `AND c.dependence_id = '${depId}'` : "";

                    const targetUserId = globalUserId;

                    if (targetUserId) {
                        kpiQuery = `
                            SELECT 
                                ROUND((SELECT COUNT(*) FROM client_tbl WHERE users_id = '${targetUserId}'), 0) as casos_procesados,
                                ROUND((SELECT COUNT(*) FROM alert_tbl a INNER JOIN client_tbl c ON a.client_id = c.id WHERE c.users_id = '${targetUserId}' AND a.level = '1'), 0) as alertas_criticas_mias,
                                ROUND((SELECT COUNT(*) FROM client_tbl WHERE users_id = '${targetUserId}' AND created >= CURDATE()), 0) as productividad_hoy,
                                ROUND(COALESCE((SELECT COUNT(*) FROM training_progress_tbl WHERE userId = '${targetUserId}') * 100 / NULLIF((SELECT COUNT(*) FROM training_tbl WHERE status = 1), 0), 0), 0) as progreso_entrenamiento
                        `;
                    } else {
                        kpiQuery = `
                            SELECT 
                                ROUND((SELECT COUNT(*) FROM client_tbl c ${depFilter}), 0) as total_consultas,
                                ROUND((SELECT COUNT(*) FROM alert_tbl a INNER JOIN client_tbl c ON a.client_id = c.id WHERE a.level = '1' ${depFilterJoin}), 0) as alertas_criticas,
                                ROUND((SELECT COUNT(DISTINCT users_id) FROM client_tbl c ${depFilter}), 0) as analistas_activos,
                                ROUND((SELECT AVG(execution_time) FROM client_tbl c ${depFilter}), 1) as tiempo_promedio_caso
                        `;
                    }
                    bar1Query = `
                        SELECT COALESCE(u.email, c.users_id, 'Anonimo') as label, ROUND(COUNT(*), 0) as value 
                        FROM client_tbl c 
                        LEFT JOIN users_app_tbl u ON c.users_id = u.id 
                        ${depId ? `WHERE c.dependence_id = '${depId}'` : "WHERE 1=1"}
                        AND c.users_id IS NOT NULL
                        GROUP BY label 
                        ORDER BY value DESC 
                        LIMIT 10
                    `;
                    bar2Query = `
                        SELECT a.type as label, ROUND(COUNT(*), 0) as value 
                        FROM alert_tbl a 
                        INNER JOIN client_tbl c ON c.id = a.client_id 
                        ${depId ? `WHERE c.dependence_id = '${depId}'` : ""}
                        GROUP BY label 
                        ORDER BY value DESC 
                        LIMIT 5
                    `;
                    lineQuery = `
                        SELECT 
                            DATE_FORMAT(c.created, '%Y-%m-%d') as time_label, 
                            COALESCE(u.email, c.users_id, 'Anonimo') as email, 
                            COUNT(*) as value 
                        FROM client_tbl c 
                        LEFT JOIN users_app_tbl u ON c.users_id = u.id
                        ${depId ? `WHERE c.dependence_id = '${depId}'` : "WHERE 1=1"} 
                        AND c.created >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) 
                        GROUP BY DATE_FORMAT(c.created, '%Y-%m-%d'), COALESCE(u.email, c.users_id, 'Anonimo')
                        ORDER BY time_label ASC
                    `;
                    pieQuery = `
                        SELECT 
                            CASE 
                                WHEN a.level IN ('1', '2') THEN 'Alto'
                                WHEN a.level = '3' THEN 'Medio'
                                ELSE 'Bajo' 
                            END as label, 
                            ROUND(COUNT(*), 0) as value 
                        FROM alert_tbl a 
                        INNER JOIN client_tbl c ON c.id = a.client_id 
                        ${depId ? `WHERE c.dependence_id = '${depId}'` : ""}
                        GROUP BY label 
                        ORDER BY CASE label WHEN 'Bajo' THEN 1 WHEN 'Medio' THEN 2 WHEN 'Alto' THEN 3 END ASC
                    `;
                } else {
                    // PERSPECTIVA USER (PERSONAL)
                    const uId = globalUserId || auth.userId;
                    const dId = auth.dependenceId;
                    kpiQuery = `
                        SELECT 
                            ROUND((SELECT COUNT(*) FROM client_tbl WHERE users_id = '${uId}'), 0) as casos_procesados,
                            ROUND((SELECT COUNT(*) FROM alert_tbl a INNER JOIN client_tbl c ON a.client_id = c.id WHERE c.users_id = '${uId}' AND a.level = '1'), 0) as alertas_criticas_mias,
                            ROUND((SELECT COUNT(*) FROM client_tbl WHERE users_id = '${uId}' AND created >= CURDATE()), 0) as productividad_hoy,
                            ROUND(COALESCE((SELECT COUNT(*) FROM training_progress_tbl WHERE userId = '${uId}') * 100 / NULLIF((SELECT COUNT(*) FROM training_tbl WHERE status = 1), 0), 0), 0) as progreso_entrenamiento
                    `;
                    bar1Query = `
                        SELECT 'Yo' as label, (SELECT COUNT(*) FROM client_tbl WHERE users_id = '${uId}') as value
                        UNION ALL
                        SELECT 'Equipo (Avg)' as label, COALESCE(ROUND((SELECT AVG(cnt) FROM (SELECT COUNT(*) as cnt FROM client_tbl WHERE dependence_id = '${dId}' GROUP BY users_id) as sub), 0), 0) as value
                    `;
                    bar2Query = `SELECT t.type as label, ROUND(COUNT(*), 0) as value FROM alert_tbl t INNER JOIN client_tbl ct ON ct.id = t.client_id WHERE ct.users_id = '${uId}' GROUP BY t.type ORDER BY value DESC LIMIT 5`;
                    lineQuery = `SELECT DATE_FORMAT(created, '%Y-%m-%d') as time_label, COUNT(*) as value FROM client_tbl WHERE users_id = '${uId}' AND created >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) GROUP BY DATE_FORMAT(created, '%Y-%m-%d') ORDER BY time_label ASC`;
                    pieQuery = `
                        SELECT 
                            CASE 
                                WHEN a.level IN ('1', '2') THEN 'Alto'
                                WHEN a.level = '3' THEN 'Medio'
                                ELSE 'Bajo' 
                            END as label, 
                            ROUND(COUNT(*), 0) as value 
                        FROM alert_tbl a INNER JOIN client_tbl c ON a.client_id = c.id 
                        WHERE c.users_id = '${uId}' 
                        GROUP BY label
                        ORDER BY CASE label WHEN 'Bajo' THEN 1 WHEN 'Medio' THEN 2 WHEN 'Alto' THEN 3 END ASC
                    `;
                }

                const [kpiRes, bar1Res, bar2Res, lineRes, pieRes, matrixRes, tableRes, detailsRes] = await Promise.all([
                    fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(kpiQuery)),
                    fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(bar1Query)),
                    fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(bar2Query)),
                    fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(lineQuery)),
                    fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(pieQuery)),
                    fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
                        SELECT dt.id, dt.name, COALESCE(AVG(rdt.impact), 1) as x_impact,
                        COALESCE((SELECT COUNT(a.id) FROM alert_tbl a INNER JOIN client_tbl c ON a.client_id = c.id WHERE c.dependence_id = dt.id) * 5.0 / 
                        NULLIF((SELECT COUNT(c.id) FROM client_tbl c WHERE c.dependence_id = dt.id), 0), 1) as y_prob
                        FROM dependence_tbl dt LEFT JOIN riesgos_judiciales_db.risk_action_tbl rat ON rat.dependence_id = dt.id
                        LEFT JOIN riesgos_judiciales_db.risk_data_tbl rdt ON rdt.id = rat.risk_id
                        WHERE ${matrixFilter} GROUP BY dt.id, dt.name
                    `)),
                    fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
                        SELECT dt.name as dependence_name, COALESCE(MAX(a.\`level\`), 4) as alert_level,
                        CASE COALESCE(MAX(a.\`level\`), 4) WHEN 1 THEN 'Crítico' WHEN 2 THEN 'Alto' WHEN 3 THEN 'Medio' WHEN 4 THEN 'Sin Riesgo' ELSE 'Sin Riesgo' END as alert_description,
                        COALESCE(CEILING(AVG(rdt.impact)), 1) as avg_impact, COALESCE(CEILING(AVG(rdt.probability)), 1) as avg_probability,
                        COUNT(DISTINCT rdt.id) as risk_count, COALESCE(AVG(rdt.impact * rdt.probability), 0) as risk_score
                        FROM dependence_tbl dt
                        LEFT JOIN riesgos_judiciales_db.risk_action_tbl rat ON rat.dependence_id = dt.id
                        LEFT JOIN riesgos_judiciales_db.risk_data_tbl rdt ON rat.risk_id = rdt.id
                        LEFT JOIN client_tbl ct ON ct.dependence_id = dt.id
                        LEFT JOIN alert_tbl a ON a.client_id = ct.id
                        WHERE ${auth.isSuper ? '1=1' : `dt.id = '${auth.dependenceId}'`}
                        GROUP BY dt.name, dt.id ORDER BY risk_score DESC
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

                const kpis: KpiData[] = [];
                // Normalización de datos (Soporte para Array o {results: []})
                const kpiRows = Array.isArray(kpiD) ? kpiD : (kpiD?.results || []);
                const lineRows = Array.isArray(lineD) ? lineD : (lineD?.results || []);
                const bar1Rows = Array.isArray(bar1D) ? bar1D : (bar1D?.results || []);
                const bar2Rows = Array.isArray(bar2D) ? bar2D : (bar2D?.results || []);
                const pieRows = Array.isArray(pieD) ? pieD : (pieD?.results || []);

                if (viewRole === "SUPER" && globalDepId === "SYS_ADMIN") {
                    kpis.push({ label: "Uptime (Disponibilidad)", value: kpiRows[0]?.uptime + "%", suffix: "%", delta: 0.1 });
                    kpis.push({ label: "T. Respuesta Avg", value: parseFloat(kpiRows[0]?.avg_response || 0).toFixed(0), suffix: " ms" });
                    kpis.push({ label: "Sesiones Activas", value: Math.floor(Math.random() * 20) + 10 });
                    kpis.push({ label: "Gasto en APIs (Mes)", value: "$" + parseFloat(kpiRows[0]?.api_costs || 0).toLocaleString(), suffix: " USD" });
                } else if ((viewRole === "SUPER" || viewRole === "ADMIN") && !globalUserId) {
                    kpis.push({ label: "Total Consultas", value: kpiRows[0]?.total_consultas || 0 });
                    kpis.push({ label: "Alertas Críticas", value: kpiRows[0]?.alertas_criticas || 0, delta: -2 });
                    kpis.push({ label: "Analistas Activos", value: kpiRows[0]?.analistas_activos || 0 });
                    kpis.push({ label: "T. Promedio (min)", value: parseFloat(kpiRows[0]?.tiempo_promedio_caso || 0).toFixed(1), suffix: " min" });
                } else {
                    // Vista individual (USER o Selección de analista en ADMIN/SUPER)
                    kpis.push({ label: "Casos Procesados", value: kpiRows[0]?.casos_procesados || 0 });
                    kpis.push({ label: "Alertas Críticas", value: kpiRows[0]?.alertas_criticas_mias || 0 });
                    kpis.push({ label: "Productividad Hoy", value: kpiRows[0]?.productividad_hoy || 0 });
                    kpis.push({ label: "Capacitación (%)", value: kpiRows[0]?.progreso_entrenamiento || 0, suffix: "%" });
                }

                const points = Array.isArray(matrixD) ? matrixD.map((row: any) => ({
                    id: row.id, name: row.name,
                    x: Math.min(5, Math.max(1, parseFloat(row.x_impact || 1))),
                    y: Math.min(5, Math.max(1, parseFloat(row.y_prob || 1)))
                })) : [];

                setPoints(points);
                setSelectedPoints(points.map(p => p.id));
                setRiskDetailsRows(Array.isArray(detailsD) ? detailsD : []);

                const isSysView = auth.isSuper && (globalDepId === "ALL" || allDependencies.find(d => d.id === globalDepId)?.name.toLowerCase().includes("administración sistema"));

                // Mapeo de colores semánticos de riesgo
                const riskColorMap: any = {
                    "Crítico": "#ef4444",
                    "Alto": "#ef4444",
                    "Medio": "#f97316",
                    "Bajo": "#10b981",
                    "Sin Riesgo": "#10b981"
                };

                const processedBar2 = bar2Rows.map((d: any) => ({ ...d, color: riskColorMap[d.label] || "#3b82f6" }));
                const processedPie = pieRows.map((d: any) => ({ ...d, color: riskColorMap[d.label] || "#3b82f6" }));

                // Procesamiento de gráfica multi-línea (para ADMIN/SUPER)
                let finalLineData = [];
                let finalLineConfig = [{ key: "value", name: "Búsquedas", color: "#10b981" }];

                if (viewRole !== "USER" && lineRows.length > 0 && (lineRows[0].email || lineRows[0].time_label)) {
                    const dates = [...new Set(lineRows.map((d: any) => d.time_label))].sort();
                    const emails = [...new Set(lineRows.map((d: any) => d.email))].filter(e => e);
                    
                    if (emails.length > 0) {
                        finalLineData = dates.map(date => {
                            const row: any = { label: date };
                            emails.forEach(email => {
                                const match = lineRows.find((d: any) => d.time_label === date && d.email === email);
                                row[email] = match ? match.value : 0;
                            });
                            return row;
                        });

                        finalLineConfig = emails.map((email, i) => ({
                            key: email,
                            name: email,
                            color: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"][i % 8]
                        }));
                    } else {
                        finalLineData = lineRows.map((d: any) => ({ label: d.time_label, value: d.value }));
                    }
                } else {
                    finalLineData = lineRows.map((d: any) => ({ label: d.time_label, value: d.value }));
                }

                setData({
                    kpis,
                    barChart1: {
                        title: viewRole === "USER" ? "Productividad vs Equipo (Consultas)" : "Top Analistas por Consultas",
                        data: bar1Rows,
                        xKey: "label",
                        series: [{ key: "value", name: "Consultas", color: "#3b82f6" }]
                    },
                    barChart2: { 
                        title: viewRole === "SUPER" && globalDepId === "SYS_ADMIN" ? "Latencia Media por Módulo (ms)" : 
                               viewRole === "USER" ? "Distribución de Mis Alertas" : "Tipos de Alerta más Recurrentes",
                        data: Array.isArray(bar2D) ? bar2D : [], 
                        xKey: "label", 
                        series: [{ key: "value", name: "Cantidad", color: "#f59e0b" }] 
                    },
                    lineChart: { 
                        title: viewRole === "SUPER" && globalDepId === "SYS_ADMIN" ? "Tráfico de Peticiones (Hoy)" : "Evolución Temporal de Búsquedas",
                        data: finalLineData, 
                        xKey: "label", 
                        lines: finalLineConfig 
                    },
                    pieChart: { 
                        title: viewRole === "SUPER" && globalDepId === "SYS_ADMIN" ? "Tasa de Éxito de Peticiones" : "Distribución del Nivel de Riesgo",
                        data: processedPie, 
                        nameKey: "label", 
                        valueKey: "value" 
                    },
                    riskMatrix: { title: "Matriz de Riesgos", points },
                    table: { 
                        title: "Análisis de Riesgos", 
                        columns: [{ key: "dependence_name", header: "Dependencia" }, { key: "alert_description", header: "Nivel" }, { key: "risk_count", header: "Riesgos" }, { key: "risk_score", header: "Score" }], 
                        rows: Array.isArray(tableD) ? tableD.map((r: any) => ({ ...r, risk_score: parseFloat(r.risk_score || 0).toFixed(2) })) : [] 
                    }
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error al cargar los datos");
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [auth, globalDepId, globalUserId, viewRole]); // Escucha cambios en auth y filtros globales

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
                            href={`/dashboard/risk-config?${searchParams.toString()}`} 
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

                {/* Filtros Globales de Vista */}
                <div className="bg-white dark:bg-gray-800 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-8 flex flex-wrap items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-gray-100">Filtros Globales</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Personalice la vista del dashboard</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 ml-auto">
                        {/* Selector de Perspectiva (Solo para SUPER) */}
                        {auth.isSuper && (
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Perspectiva de Rol</label>
                                <select
                                    value={viewRole}
                                    onChange={(e) => setViewRole(e.target.value)}
                                    className="block w-full px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-[10px] font-black uppercase tracking-tighter text-blue-600 dark:text-blue-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                >
                                    <option value="SUPER">VISTA: SUPER (SISTEMA)</option>
                                    <option value="ADMIN">VISTA: ADMIN (DEPENDENCIA)</option>
                                    <option value="USER">VISTA: USER (ANALISTA)</option>
                                </select>
                            </div>
                        )}

                        {/* Selector de Dependencia (Solo para SUPER o ADMIN simulado) */}
                        {(auth.isSuper || auth.isAdmin) && (
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Dependencia</label>
                                <select
                                    disabled={!auth.isSuper && auth.isAdmin} // Solo SUPER puede cambiar dep
                                    value={globalDepId}
                                    onChange={(e) => {
                                        setGlobalDepId(e.target.value);
                                        setMatrixDepId(e.target.value);
                                        setGlobalUserId(""); // Reset user when dependence changes
                                    }}
                                    className="block w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-[10px] font-black uppercase tracking-tighter outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                >
                                    {viewRole === "SUPER" && (
                                        <>
                                            <option value="SYS_ADMIN">-- ADMINISTRADOR DE SISTEMAS (TECH) --</option>
                                            <option value="ALL">-- TODAS LAS DEPENDENCIAS (NEGOCIO) --</option>
                                        </>
                                    )}
                                    {allDependencies.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Selector de Usuario / Email (Para SUPER y ADMIN) */}
                        {(auth.isSuper || auth.isAdmin) && (
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Filtrar por Usuario / Email</label>
                                <select
                                    value={globalUserId}
                                    onChange={(e) => setGlobalUserId(e.target.value)}
                                    className="block w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-[10px] font-black uppercase tracking-tighter outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                >
                                    <option value="ALL">-- TODOS LOS USUARIOS --</option>
                                    {dependenceUsers.map(u => <option key={u.user_id} value={u.user_id}>{u.email || u.user_id}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Indicador para USER */}
                        {auth.isUser && (
                            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter">
                                    Vista limitada a: {auth.userId}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* TABS DE SECCIÓN */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab("operacion")}
                        className={cn(
                            "px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
                            activeTab === "operacion" 
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                                : "bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-600 border border-gray-100 dark:border-gray-700"
                        )}
                    >
                        {viewRole === "SUPER" && globalDepId === "SYS_ADMIN" ? "Infraestructura" : "Operación y Riesgos"}
                    </button>
                    <button
                        onClick={() => setActiveTab("desempeño")}
                        className={cn(
                            "px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
                            activeTab === "desempeño" 
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                                : "bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-600 border border-gray-100 dark:border-gray-700"
                        )}
                    >
                        {viewRole === "SUPER" && globalDepId === "SYS_ADMIN" ? "Logs y Auditoría" : "Desempeño y Capacitación"}
                    </button>
                </div>

                {activeTab === "operacion" ? (
                    <>
                        {/* 2. Matriz (Existente) */}
                        <div className="bg-white dark:bg-gray-800 rounded-[32px] shadow-xl border border-gray-100 dark:border-gray-700 mb-8 overflow-hidden">
                            {/* Cabecera de Configuración */}
                            <div className="p-6 border-b border-gray-50 dark:border-gray-900">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                                            <LayoutDashboard className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-gray-100">Configuración de Matriz</h3>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Cambie la perspectiva del análisis</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        {/* Selector de Modo */}
                                        <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700">
                                            {[
                                                { id: "deps", label: "Dependencias", icon: List },
                                                { id: "inherent", label: "Riesgos Inherentes", icon: AlertTriangle },
                                                { id: "residual", label: "Riesgos Residuales", icon: Zap }
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
                                    </div>
                                </div>

                                {/* Consola de Filtrado (Solo visible en modo Dependencias) */}
                                {matrixMode === "deps" && (
                                    <div className="pt-6 border-t border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-4 duration-500">
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
                                )}
                            </div>

                            {/* Matriz de Riesgo */}
                            <div className="p-8 bg-gray-50/50 dark:bg-gray-900/20">
                                <RiskMatrixScatter
                                    key={`${matrixMode}-${matrixDepId}-${points.map(p => p.id).join('-')}`} // Forzar re-render si cambian los puntos
                                    title={
                                        matrixMode === "deps" ? "Matriz de Riesgos por Dependencia" :
                                        matrixMode === "inherent" ? `Riesgos Inherentes: ${allDependencies.find(d => d.id === matrixDepId)?.name || ""}` :
                                        `Riesgos Residuales: ${allDependencies.find(d => d.id === matrixDepId)?.name || ""}`
                                    }
                                    points={
                                        matrixMode === "deps" 
                                            ? points.filter(p => 
                                                selectedPoints.includes(p.id) && 
                                                impactFilter.includes(Math.round(p.x)) && 
                                                probFilter.includes(Math.round(p.y))
                                            )
                                            : individualRisks
                                                .filter(r => r.dependence_id === matrixDepId)
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
                                                            existing.x = Math.max(1, Math.min(5, r.impact * (1 - ((existing as any).maxImpEff || 0))));
                                                            existing.y = Math.max(1, Math.min(5, r.probability * (1 - ((existing as any).maxProbEff || 0))));
                                                        }
                                                        return acc;
                                                    }

                                                    const probEff = matrixMode === "residual" && config.nature === "Preventivo" ? config.eff : 0;
                                                    const impEff = matrixMode === "residual" && config.nature === "Detectivo" ? config.eff : 0;

                                                    const p: RiskPoint = {
                                                        id: r.id.toString(),
                                                        name: r.name,
                                                        x: matrixMode === "residual" ? Math.max(1, Math.min(5, r.impact * (1 - impEff))) : r.impact,
                                                        y: matrixMode === "residual" ? Math.max(1, Math.min(5, r.probability * (1 - probEff))) : r.probability
                                                    };
                                                    (p as any).maxProbEff = probEff;
                                                    (p as any).maxImpEff = impEff;
                                                    acc.push(p);
                                                    return acc;
                                                }, [])
                                    }
                                />
                            </div>
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
                                {viewRole === "SUPER" && globalDepId === "SYS_ADMIN" ? (
                                    <LineChartGeneric data={data.lineChart.data} xKey={data.lineChart.xKey} lines={data.lineChart.lines} />
                                ) : (
                                    <LineChartGeneric data={data.lineChart.data} xKey={data.lineChart.xKey} lines={data.lineChart.lines} />
                                )}
                            </ChartCard>
                            <ChartCard title={data.pieChart.title}>
                                <PieChartGeneric data={data.pieChart.data} nameKey={data.pieChart.nameKey} valueKey={data.pieChart.valueKey} />
                            </ChartCard>
                        </div>

                        {/* 5. Tablas de Análisis de Riesgos (Vertical Stack) */}
                        <div className="flex flex-col gap-8 mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
                            <div>
                                <ChartCard title={data.table.title} height="auto">
                                    <TableGeneric 
                                        columns={[
                                            { 
                                                key: "dependence_name", 
                                                header: "Dependencia",
                                                render: (val) => <span className="font-black text-blue-600 dark:text-blue-400">{val}</span>
                                            },
                                            { 
                                                key: "alert_description", 
                                                header: "Nivel de Riesgo",
                                                render: (val) => {
                                                    const colors: any = {
                                                        "Sin Riesgo": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                                        "Bajo": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                                        "Medio": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                                                        "Alto": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                                        "Crítico": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                                    };
                                                    const color = colors[val] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
                                                    return <span className={cn("px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm", color)}>{val}</span>;
                                                }
                                            },
                                            { key: "risk_count", header: "Alertas" },
                                            { 
                                                key: "risk_score", 
                                                header: "Score",
                                                render: (val) => <span className={cn("font-black", val > 7 ? "text-red-500" : "text-gray-500")}>{Math.round(val)}</span>
                                            }
                                        ]} 
                                        rows={data.table.data || []} 
                                    />
                                </ChartCard>
                            </div>

                            <div>
                                <ChartCard title="Detalles de Riesgos" height="auto">
                                    <TableGeneric 
                                        columns={[
                                            { 
                                                key: "Riesgo", 
                                                header: "Riesgo",
                                                render: (val) => <span className="font-black text-gray-800 dark:text-gray-200">{val}</span>
                                            },
                                            { key: "Descripcion", header: "Descripción" },
                                            { 
                                                key: "Estado", 
                                                header: "Estado",
                                                render: (val) => (
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
                                                        val === "Activo" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                                                    )}>
                                                        {val}
                                                    </span>
                                                )
                                            },
                                            { key: "Accion", header: "Acción Mitigante" }
                                        ]} 
                                        rows={riskDetailsRows} 
                                    />
                                </ChartCard>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* PESTAÑA DE DESEMPEÑO / TÉCNICA */}
                        {viewRole === "SUPER" && globalDepId === "SYS_ADMIN" ? (
                            <div className="grid grid-cols-1 gap-8 mb-8">
                                <ChartCard title="Logs de Auditoría y Errores Recientes">
                                    <TableGeneric 
                                        columns={[
                                            { key: "code", header: "Código" },
                                            { key: "module", header: "Módulo" },
                                            { key: "message", header: "Mensaje" },
                                            { key: "ts", header: "Timestamp" }
                                        ]} 
                                        rows={[
                                            { code: "500", module: "AUTH_API", message: "Timeout connecting to provider", ts: "2024-05-08 10:20:15" },
                                            { code: "404", module: "PDF_GEN", message: "Resource not found", ts: "2024-05-08 09:15:22" },
                                            { code: "503", module: "DILISENSE", message: "Service Unavailable", ts: "2024-05-08 08:45:10" }
                                        ]} 
                                    />
                                </ChartCard>
                            </div>
                        ) : viewRole === "USER" ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <ChartCard title="Desempeño vs Equipo (T. Ejecución)">
                                    <div className="h-64">
                                        <GaugeChartGeneric 
                                            value={Math.round((data.barChart1.data.find(d => d.label === 'Mio')?.value / data.barChart1.data.find(d => d.label === 'Equipo')?.value) * 100) || 85} 
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
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-8 mb-8">
                                <ChartCard title="Desempeño Detallado por Analista (USER)">
                                    <TableGeneric 
                                        columns={[
                                            { key: "label", header: "Analista (Email)" },
                                            { key: "value", header: "Consultas Totales" },
                                            { key: "time", header: "T. Promedio" },
                                            { key: "status", header: "Estado Hoy" }
                                        ]} 
                                        rows={data.barChart1.data.map(d => ({ ...d, time: "2.5 min", status: "Activo" }))} 
                                    />
                                </ChartCard>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
