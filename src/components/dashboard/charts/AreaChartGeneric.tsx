import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

interface AreaChartGenericProps {
    data: any[];
    xKey: string;
    areas: { key: string; label: string; color?: string }[];
    height?: number;
}

export default function AreaChartGeneric({
    data,
    xKey,
    areas,
    height = 250,
}: AreaChartGenericProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                {areas.map((a) => (
                    <Area
                        key={a.key}
                        type="monotone"
                        dataKey={a.key}
                        name={a.label}
                        stroke={a.color ?? "#8884d8"}
                        fill={a.color ?? "#8884d8"}
                        fillOpacity={0.3}
                        strokeWidth={2}
                    />
                ))}
            </AreaChart>
        </ResponsiveContainer>
    );
}
