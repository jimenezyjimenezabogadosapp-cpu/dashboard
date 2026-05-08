import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

interface BarChartGenericProps {
    data: any[];
    xKey: string;
    series: { key: string; label: string; color?: string }[];
    height?: number;
}

export default function BarChartGeneric({
    data,
    xKey,
    series,
    height = 320,
}: BarChartGenericProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                    dataKey={xKey}
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    tickLine={{ stroke: "#9ca3af" }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                />
                <YAxis
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                    tickLine={{ stroke: "#9ca3af" }}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#d1d5db" }}
                    itemStyle={{ color: "#d1d5db" }}
                />
                <Legend
                    wrapperStyle={{ paddingTop: "20px" }}
                    iconType="rect"
                />
                {series.map((s) => (
                    <Bar
                        key={s.key}
                        dataKey={s.key}
                        name={s.label}
                        fill={s.color ?? "#8884d8"}
                        radius={[4, 4, 0, 0]}
                        stackId={series.length > 1 ? "stack" : undefined}
                    />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
}
