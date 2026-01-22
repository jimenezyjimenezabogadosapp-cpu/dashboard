import { cn } from "@/lib/utils";

interface RiskMatrixCell {
    x: number;
    y: number;
    value: number;
}

interface RiskMatrixHeatmapProps {
    title?: string;
    xLabels: string[];
    yLabels: string[];
    cells: RiskMatrixCell[];
    className?: string;
}

function getColorForValue(value: number): { bg: string; border: string; text: string; glow: string } {
    if (value <= 2) return {
        bg: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20",
        border: "border-green-200 dark:border-green-700",
        text: "text-green-700 dark:text-green-300",
        glow: "shadow-green-200 dark:shadow-green-800/20"
    };
    if (value <= 4) return {
        bg: "bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20",
        border: "border-yellow-200 dark:border-yellow-700",
        text: "text-yellow-700 dark:text-yellow-300",
        glow: "shadow-yellow-200 dark:shadow-yellow-800/20"
    };
    if (value <= 6) return {
        bg: "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20",
        border: "border-orange-200 dark:border-orange-700",
        text: "text-orange-700 dark:text-orange-300",
        glow: "shadow-orange-200 dark:shadow-orange-800/20"
    };
    if (value <= 8) return {
        bg: "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20",
        border: "border-red-200 dark:border-red-700",
        text: "text-red-700 dark:text-red-300",
        glow: "shadow-red-200 dark:shadow-red-800/20"
    };
    return {
        bg: "bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30",
        border: "border-red-300 dark:border-red-600",
        text: "text-red-800 dark:text-red-200",
        glow: "shadow-red-300 dark:shadow-red-700/30"
    };
}

function getRiskLabel(value: number): string {
    if (value <= 2) return "Bajo";
    if (value <= 4) return "Medio-Bajo";
    if (value <= 6) return "Medio-Alto";
    if (value <= 8) return "Alto";
    return "Crítico";
}

export default function RiskMatrixHeatmap({
    title,
    xLabels,
    yLabels,
    cells,
    className,
}: RiskMatrixHeatmapProps) {
    const cellMap = new Map(
        cells.map((c) => [`${c.x}-${c.y}`, c.value])
    );

    return (
        <div className={cn("space-y-6", className)}>
            {title && (
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {title}
                </h3>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6">
                    <div className="grid gap-2" style={{ gridTemplateColumns: `60px repeat(${xLabels.length}, 1fr)` }}>
                        {/* Encabezado X */}
                        <div></div>
                        {xLabels.map((label, i) => (
                            <div
                                key={`x-${i}`}
                                className="text-center text-sm font-semibold text-gray-700 dark:text-gray-300 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                            >
                                {label}
                            </div>
                        ))}

                        {/* Filas Y + celdas */}
                        {yLabels.map((yLabel, yIdx) => (
                            <div key={`row-${yIdx}`} className="contents">
                                <div className="text-right text-sm font-semibold text-gray-700 dark:text-gray-300 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-end">
                                    {yLabel}
                                </div>
                                {xLabels.map((_, xIdx) => {
                                    const value = cellMap.get(`${xIdx + 1}-${yIdx + 1}`) ?? 0;
                                    const colors = getColorForValue(value);
                                    return (
                                        <div
                                            key={`cell-${xIdx}-${yIdx}`}
                                            className={cn(
                                                "relative h-16 rounded-lg border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer group",
                                                colors.bg,
                                                colors.border,
                                                colors.glow
                                            )}
                                            title={`Riesgo: ${getRiskLabel(value)} (${value})`}
                                        >
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className={cn("text-lg font-bold", colors.text)}>
                                                    {value}
                                                </span>
                                                <span className={cn("text-xs opacity-75", colors.text)}>
                                                    {getRiskLabel(value)}
                                                </span>
                                            </div>
                                            <div className="absolute inset-0 bg-white/10 dark:bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Leyenda mejorada */}
                <div className="bg-gray-50 dark:bg-gray-700/30 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-center space-x-6">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nivel de Riesgo:</span>
                        <div className="flex items-center space-x-4">
                            {[
                                { value: 1, label: "Bajo" },
                                { value: 3, label: "Medio-Bajo" },
                                { value: 5, label: "Medio-Alto" },
                                { value: 7, label: "Alto" },
                                { value: 9, label: "Crítico" }
                            ].map((risk) => {
                                const colors = getColorForValue(risk.value);
                                return (
                                    <div key={risk.value} className="flex items-center space-x-2">
                                        <div className={cn("w-6 h-6 rounded-md border-2", colors.bg, colors.border)} />
                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                            {risk.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
