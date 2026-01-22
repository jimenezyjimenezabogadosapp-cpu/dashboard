"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import KpiCard from "./dashboard/KpiCard";
import ChartCard from "./dashboard/ChartCard";
import BarChartGeneric from "./dashboard/charts/BarChartGeneric";
import LineChartGeneric from "./dashboard/charts/LineChartGeneric";
import AreaChartGeneric from "./dashboard/charts/AreaChartGeneric";
import PieChartGeneric from "./dashboard/charts/PieChartGeneric";
import TableGeneric from "./dashboard/TableGeneric";
import RiskMatrixHeatmap from "./dashboard/RiskMatrixHeatmap";
import { ThemeToggle } from "./theme-toggle";

const DashboardDataSchema = z.object({
    kpis: z.array(z.object({
        label: z.string(),
        value: z.union([z.string(), z.number()]),
        suffix: z.string().optional(),
        delta: z.number().optional(),
    })).optional(),
    bar: z.object({
        title: z.string(),
        xKey: z.string(),
        series: z.array(z.object({
            key: z.string(),
            label: z.string(),
            color: z.string().optional(),
        })),
        data: z.array(z.record(z.string(), z.any())),
    }).optional(),
    line: z.object({
        title: z.string(),
        xKey: z.string(),
        lines: z.array(z.object({
            key: z.string(),
            label: z.string(),
            color: z.string().optional(),
        })),
        data: z.array(z.record(z.string(), z.any())),
    }).optional(),
    area: z.object({
        title: z.string(),
        xKey: z.string(),
        areas: z.array(z.object({
            key: z.string(),
            label: z.string(),
            color: z.string().optional(),
        })),
        data: z.array(z.record(z.string(), z.any())),
    }).optional(),
    pie: z.object({
        title: z.string(),
        nameKey: z.string(),
        valueKey: z.string(),
        data: z.array(z.record(z.string(), z.any())),
    }).optional(),
    table: z.object({
        title: z.string(),
        columns: z.array(z.object({
            key: z.string(),
            header: z.string(),
            className: z.string().optional(),
        })),
        rows: z.array(z.record(z.string(), z.any())),
    }).optional(),
    riskMatrix: z.object({
        title: z.string(),
        xLabels: z.array(z.string()),
        yLabels: z.array(z.string()),
        cells: z.array(z.object({
            x: z.number(),
            y: z.number(),
            value: z.number(),
        })),
    }).optional(),
});

type DashboardData = z.infer<typeof DashboardDataSchema>;

const defaultData: DashboardData = {
    kpis: [
        { label: "Casos abiertos", value: 128, delta: 12 },
        { label: "Riesgo alto", value: 9, delta: -2 },
        { label: "SLA cumplido", value: 97.4, suffix: "%", delta: 1.1 },
    ],
    bar: {
        title: "Riesgo por mes",
        xKey: "mes",
        series: [
            { key: "alto", label: "Alto" },
            { key: "medio", label: "Medio" },
            { key: "bajo", label: "Bajo" },
        ],
        data: [
            { mes: "Oct", alto: 10, medio: 22, bajo: 40 },
            { mes: "Nov", alto: 12, medio: 18, bajo: 35 },
            { mes: "Dic", alto: 8, medio: 25, bajo: 44 },
        ],
    },
    line: {
        title: "Tendencia semanal",
        xKey: "dia",
        lines: [{ key: "valor", label: "Valor" }],
        data: [
            { dia: "Lun", valor: 12 },
            { dia: "Mar", valor: 18 },
            { dia: "Mie", valor: 16 },
            { dia: "Jue", valor: 24 },
            { dia: "Vie", valor: 22 },
        ],
    },
    area: {
        title: "Eventos por hora",
        xKey: "t",
        areas: [{ key: "eventos", label: "Eventos" }],
        data: [
            { t: "00:00", eventos: 2 },
            { t: "06:00", eventos: 14 },
            { t: "12:00", eventos: 20 },
            { t: "18:00", eventos: 11 },
            { t: "23:59", eventos: 6 },
        ],
    },
    pie: {
        title: "Distribución de riesgo",
        nameKey: "name",
        valueKey: "value",
        data: [
            { name: "Alto", value: 12 },
            { name: "Medio", value: 33 },
            { name: "Bajo", value: 55 },
        ],
    },
    table: {
        title: "Listado de casos",
        columns: [
            { key: "id", header: "ID" },
            { key: "proceso", header: "Proceso" },
            { key: "estado", header: "Estado" },
            { key: "score", header: "Score" },
        ],
        rows: [
            { id: "R-1021", proceso: "KYC", estado: "Abierto", score: 84 },
            { id: "R-1033", proceso: "AML", estado: "En análisis", score: 71 },
            { id: "R-1048", proceso: "Auditoría", estado: "Cerrado", score: 92 },
        ],
    },
    riskMatrix: {
        title: "Matriz de riesgo",
        xLabels: ["1", "2", "3", "4", "5"],
        yLabels: ["1", "2", "3", "4", "5"],
        cells: [
            { x: 1, y: 1, value: 2 },
            { x: 2, y: 1, value: 4 },
            { x: 3, y: 1, value: 6 },
            { x: 4, y: 1, value: 7 },
            { x: 5, y: 1, value: 9 },
        ],
    },
};

export default function TestingAppClient() {
    const [jsonText, setJsonText] = useState(JSON.stringify(defaultData, null, 2));
    const [data, setData] = useState<DashboardData>(defaultData);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            const parsed = JSON.parse(jsonText);
            const result = DashboardDataSchema.safeParse(parsed);
            if (result.success) {
                setData(result.data);
                setError(null);
            } else {
                setError(result.error.message);
            }
        } catch (e) {
            setError((e as Error).message);
        }
    }, [jsonText]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Testing App
                </h2>
                <ThemeToggle />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Editor JSON */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        JSON Editor
                    </label>
                    <textarea
                        value={jsonText}
                        onChange={(e) => setJsonText(e.target.value)}
                        className="w-full h-96 p-3 font-mono text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Pega aquí tu JSON..."
                    />
                    {error && (
                        <div className="p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-800 dark:text-red-200">
                            <strong>Error:</strong> {error}
                        </div>
                    )}
                </div>

                {/* Preview */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Preview
                    </label>
                    <div className="h-96 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
                        <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {JSON.stringify(data, null, 2)}
                        </pre>
                    </div>
                </div>
            </div>

            {/* Render de componentes */}
            <div className="space-y-8">
                {/* KPIs */}
                {data.kpis && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            KPIs
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {data.kpis.map((kpi: any, idx: number) => (
                                <KpiCard key={idx} {...kpi} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Gráficas en grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {data.bar && (
                        <ChartCard title={data.bar.title}>
                            <BarChartGeneric
                                data={data.bar.data}
                                xKey={data.bar.xKey}
                                series={data.bar.series}
                            />
                        </ChartCard>
                    )}

                    {data.line && (
                        <ChartCard title={data.line.title}>
                            <LineChartGeneric
                                data={data.line.data}
                                xKey={data.line.xKey}
                                lines={data.line.lines}
                            />
                        </ChartCard>
                    )}

                    {data.area && (
                        <ChartCard title={data.area.title}>
                            <AreaChartGeneric
                                data={data.area.data}
                                xKey={data.area.xKey}
                                areas={data.area.areas}
                            />
                        </ChartCard>
                    )}

                    {data.pie && (
                        <ChartCard title={data.pie.title}>
                            <PieChartGeneric
                                data={data.pie.data}
                                nameKey={data.pie.nameKey}
                                valueKey={data.pie.valueKey}
                            />
                        </ChartCard>
                    )}
                </div>

                {/* Tabla */}
                {data.table && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            {data.table.title}
                        </h3>
                        <TableGeneric
                            columns={data.table.columns}
                            rows={data.table.rows}
                        />
                    </div>
                )}

                {/* Matriz de riesgo */}
                {data.riskMatrix && (
                    <RiskMatrixHeatmap
                        title={data.riskMatrix.title}
                        xLabels={data.riskMatrix.xLabels}
                        yLabels={data.riskMatrix.yLabels}
                        cells={data.riskMatrix.cells}
                    />
                )}
            </div>
        </div >
    );
}
