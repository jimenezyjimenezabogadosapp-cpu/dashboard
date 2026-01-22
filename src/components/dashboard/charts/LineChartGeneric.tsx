import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

interface LineChartGenericProps {
    data: any[];
    xKey: string;
    lines: { key: string; label: string; color?: string }[];
    height?: number;
}

export default function LineChartGeneric({
    data,
    xKey,
    lines,
    height = 320,
}: LineChartGenericProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                    dataKey={xKey}
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                    tickLine={{ stroke: "#9ca3af" }}
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
                    iconType="line"
                />
                {lines.map((l) => (
                    <Line
                        key={l.key}
                        type="monotone"
                        dataKey={l.key}
                        name={l.label}
                        stroke={l.color ?? "#8884d8"}
                        strokeWidth={2}
                        dot={{ fill: l.color ?? "#8884d8", r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}
