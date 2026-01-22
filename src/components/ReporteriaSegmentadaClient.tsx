"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import KpiCard from "./dashboard/KpiCard";
import ChartCard from "./dashboard/ChartCard";
import BarChartGeneric from "./dashboard/charts/BarChartGeneric";
import LineChartGeneric from "./dashboard/charts/LineChartGeneric";
import PieChartGeneric from "./dashboard/charts/PieChartGeneric";
import TableGeneric from "./dashboard/TableGeneric";
import RiskMatrixHeatmap from "./dashboard/RiskMatrixHeatmap";
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

interface RiskMatrixCell {
    x: number;
    y: number;
    value: number;
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
        xLabels: string[];
        yLabels: string[];
        cells: RiskMatrixCell[];
    };
    table: {
        title: string;
        columns: Array<{ key: string; header: string; className?: string }>;
        rows: ChartData[];
    };
    riskTable: {
        title: string;
        columns: Array<{ key: string; header: string; className?: string }>;
        rows: ChartData[];
    };
}

export default function ReporteriaSegmentadaClient() {
    const [data, setData] = useState<ReporteriaData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dependenceName, setDependenceName] = useState<string>('');
    const searchParams = useSearchParams();

    const roleId = searchParams.get('role_id');
    const dependenceId = searchParams.get('dependence_id');

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);

                const userKey = "019bdbff-d27c-7583-b76f-80edd5ae064e";

                // Build WHERE clause for dependence filtering
                const dependenceFilter = dependenceId ? `WHERE ct.dependence_id = ${dependenceId}` : '';
                const dependenceFilterAlerts = dependenceId ? `WHERE ct.dependence_id = ${dependenceId}` : '';
                const dependenceFilterRisk = dependenceId ? `WHERE rat.dependence_id = ${dependenceId}` : '';

                // Fetch KPIs
                const kpiResponse = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
          SELECT 
            COUNT(*) as busquedas_realizadas
          FROM client_tbl 
          WHERE dependence_id = '${dependenceId}'
        `));

                // Fetch dependence name
                const dependenceNameResponse = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
          SELECT 
            name as dependence_name
          FROM dependence_tbl 
          WHERE id = '${dependenceId}'
        `));

                const kpiResponse2 = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
          SELECT 
            COUNT(*) as total_alertas
          FROM alert_tbl a 
          INNER JOIN client_tbl ct ON ct.id = a.client_id 
          WHERE ct.dependence_id = '${dependenceId}'
        `));

                const kpiResponse3 = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
          SELECT 
            COUNT(DISTINCT client_id) as clientes_con_alertas
          FROM alert_tbl a 
          INNER JOIN client_tbl ct ON ct.id = a.client_id 
          WHERE ct.dependence_id = '${dependenceId}'
        `));

                const kpiResponse4 = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
          SELECT 
            AVG(execute_time) as tiempo_promedio_caso
          FROM stadistics_usage_tbl 
        `));

                // Fetch Bar Chart 1 - Total clientes vs Clientes con alertas
                const bar1Response1 = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
          SELECT 
            COUNT(*) as "Total clientes"
          FROM client_tbl 
          WHERE dependence_id = '${dependenceId}'
        `));

                const bar1Response2 = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
          SELECT 
            COUNT(DISTINCT client_id) as "Total clientes con alertas"
          FROM alert_tbl a 
          INNER JOIN client_tbl ct ON ct.id = a.client_id 
          WHERE ct.dependence_id = '${dependenceId}'
        `));

                // Fetch Bar Chart 2 - Dependencias vs Uso
                const bar2Response = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
          SELECT 
            dt.name as "Dependencia",
            COUNT(*) as "Total casos"
          FROM client_tbl ct
          INNER JOIN dependence_tbl dt ON dt.id = ct.dependence_id 
          WHERE ct.dependence_id = '${dependenceId}'
          GROUP BY ct.dependence_id
          ORDER BY COUNT(*) DESC
        `));

                // Fetch Line Chart - Casos últimos 3 meses
                const lineResponse = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
          SELECT 
            DATE_FORMAT(created, '%Y-%m-%d') AS "Fecha",
            COUNT(*) AS "Total de registros"
          FROM client_tbl ct
          WHERE ct.dependence_id = '${dependenceId}'
          AND created >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
          GROUP BY DATE_FORMAT(created, '%Y-%m-%d')
          ORDER BY "Fecha" ASC
          LIMIT 100
        `));

                // Fetch Pie Chart - Tipos de alerta (TOP 10)
                const pieResponse = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
          SELECT 
            t.type AS "Alerta registrada",
            COUNT(*) AS "Cantidad"
          FROM alert_tbl t
          INNER JOIN client_tbl ct ON ct.id = t.client_id 
          INNER JOIN dependence_tbl dt ON dt.id = ct.dependence_id 
          WHERE ct.dependence_id = '${dependenceId}'
          GROUP BY t.type
          ORDER BY "Cantidad" DESC
          LIMIT 10
        `));

                // Fetch Risk Matrix
                const riskMatrixResponse = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
          SELECT 
            CEILING(rdt.impact) as x,
            CEILING(rdt.probability) as y,
            COUNT(*) as value
          FROM riesgos_judiciales_db.risk_data_tbl rdt
          INNER JOIN riesgos_judiciales_db.risk_action_tbl rat ON rat.risk_id = rdt.id
          WHERE rat.dependence_id = '${dependenceId}'
          GROUP BY CEILING(rdt.impact), CEILING(rdt.probability)
          ORDER BY x, y
        `));

                // Fetch Table Data - Riesgos por dependencia
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
          WHERE rat.dependence_id = '${dependenceId}'
          GROUP BY dt.name, rat.dependence_id
          ORDER BY risk_score DESC
        `));

                // Fetch Risk Details Table
                const riskDetailsResponse = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(`
          SELECT 
            rdt.name as "Riesgo", 
            rdt.description as "Descripcion", 
            rdt.status as "Estado",
            rat.description as "Accion"
          FROM riesgos_judiciales_db.risk_data_tbl rdt
          inner join riesgos_judiciales_db.risk_action_tbl rat on rat.risk_id = rdt.id
          WHERE rat.dependence_id = '${dependenceId}'
        `));

                const [kpiData1, dependenceNameData, kpiData2, kpiData3, kpiData4, bar1Data1, bar1Data2, bar2Data, lineData, pieData, riskMatrixData, tableData, riskDetailsData] = await Promise.all([
                    kpiResponse.json(),
                    dependenceNameResponse.json(),
                    kpiResponse2.json(),
                    kpiResponse3.json(),
                    kpiResponse4.json(),
                    bar1Response1.json(),
                    bar1Response2.json(),
                    bar2Response.json(),
                    lineResponse.json(),
                    pieResponse.json(),
                    riskMatrixResponse.json(),
                    tableResponse.json(),
                    riskDetailsResponse.json()
                ]);

                // Process KPIs
                const kpis: KpiData[] = [
                    {
                        label: "Búsquedas realizadas",
                        value: kpiData1[0]?.busquedas_realizadas || 0
                    },
                    {
                        label: "Total alertas",
                        value: kpiData2[0]?.total_alertas || 0
                    },
                    {
                        label: "Clientes con alertas",
                        value: kpiData3[0]?.clientes_con_alertas || 0
                    },
                    {
                        label: "Tiempo promedio por caso (min)",
                        value: parseFloat(kpiData4[0]?.tiempo_promedio_caso || 0).toFixed(1),
                        suffix: " min"
                    }
                ];

                // Process Risk Matrix
                const riskMatrixCells: RiskMatrixCell[] = Array.isArray(riskMatrixData)
                    ? riskMatrixData.map((row: any) => ({
                        x: row.x,
                        y: row.y,
                        value: row.value
                    }))
                    : [];

                // Process Table
                const tableRows = Array.isArray(tableData)
                    ? tableData.map((row: any) => ({
                        ...row,
                        risk_score: parseFloat(row.risk_score || 0).toFixed(2)
                    }))
                    : [];

                // Process Risk Details
                const riskDetailsRows = Array.isArray(riskDetailsData) ? riskDetailsData : [];

                // Get dependence name and set state
                const depName = dependenceNameData[0]?.dependence_name || `Dependencia ${dependenceId}`;
                setDependenceName(depName);

                const reporteriaData: ReporteriaData = {
                    kpis,
                    barChart1: {
                        title: "Total Búsquedas vs Clientes con Alertas",
                        data: [
                            { metric: "Total clientes", value: bar1Data1[0]?.["Total clientes"] || 0 },
                            { metric: "Clientes con alertas", value: bar1Data2[0]?.["Total clientes con alertas"] || 0 }
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
                        title: "Matriz de Riesgos General",
                        xLabels: ["Muy Bajo", "Bajo", "Medio", "Alto", "Muy Alto"],
                        yLabels: ["Muy Baja", "Baja", "Media", "Alta", "Muy Alta"],
                        cells: riskMatrixCells
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
                        rows: tableRows
                    },
                    riskTable: {
                        title: "Detalles de Riesgos",
                        columns: [
                            { key: "Riesgo", header: "Riesgo" },
                            { key: "Descripcion", header: "Descripción" },
                            { key: "Estado", header: "Estado" },
                            { key: "Accion", header: "Acción" }
                        ],
                        rows: riskDetailsRows
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
    }, [roleId, dependenceId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500 dark:text-gray-400">Cargando datos...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="text-red-700 dark:text-red-300">Error: {error}</div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            <div className="max-w-full mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Reportería - {dependenceName}
                    </h2>
                    <ThemeToggle />
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {data.kpis.map((kpi: KpiData, idx: number) => (
                        <KpiCard key={idx} {...kpi} />
                    ))}
                </div>

                {/* Gráficas principales */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                    <ChartCard title={data.barChart1.title}>
                        <BarChartGeneric
                            data={data.barChart1.data}
                            xKey={data.barChart1.xKey}
                            series={data.barChart1.series}
                        />
                    </ChartCard>

                    <ChartCard title={data.barChart2.title}>
                        <BarChartGeneric
                            data={data.barChart2.data}
                            xKey={data.barChart2.xKey}
                            series={data.barChart2.series}
                        />
                    </ChartCard>

                    <ChartCard title={data.lineChart.title}>
                        <LineChartGeneric
                            data={data.lineChart.data}
                            xKey={data.lineChart.xKey}
                            lines={data.lineChart.lines}
                        />
                    </ChartCard>

                    <ChartCard title={data.pieChart.title}>
                        <PieChartGeneric
                            data={data.pieChart.data}
                            nameKey={data.pieChart.nameKey}
                            valueKey={data.pieChart.valueKey}
                        />
                    </ChartCard>
                </div>

                {/* Matriz de riesgo y tablas */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                    <RiskMatrixHeatmap
                        title={data.riskMatrix.title}
                        xLabels={data.riskMatrix.xLabels}
                        yLabels={data.riskMatrix.yLabels}
                        cells={data.riskMatrix.cells}
                    />

                    <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            {data.table.title}
                        </h3>
                        <TableGeneric
                            columns={data.table.columns}
                            rows={data.table.rows}
                        />
                    </div>
                </div>

                {/* Tabla de detalles de riesgos */}
                <div className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        {data.riskTable.title}
                    </h3>
                    <TableGeneric
                        columns={data.riskTable.columns}
                        rows={data.riskTable.rows}
                    />
                </div>
            </div>
        </div>
    );
}
