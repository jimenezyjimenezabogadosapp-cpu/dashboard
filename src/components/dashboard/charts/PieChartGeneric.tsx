import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

interface PieChartGenericProps {
    data: any[];
    nameKey: string;
    valueKey: string;
    colors?: string[];
    height?: number;
}

const DEFAULT_COLORS = [
    "#3b82f6",  // blue-500
    "#10b981",  // emerald-500
    "#f59e0b",  // amber-500
    "#ef4444",  // red-500
    "#8b5cf6",  // violet-500
    "#ec4899",  // pink-500
    "#06b6d4",  // cyan-500
    "#84cc16",  // lime-500
];

const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent
}: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Solo mostrar etiqueta si el porcentaje es mayor al 5%
    if (percent < 0.05) return null;

    return (
        <text
            x={x}
            y={y}
            fill="white"
            textAnchor={x > cx ? 'start' : 'end'}
            dominantBaseline="central"
            fontSize={11}
            fontWeight={600}
        >
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

export default function PieChartGeneric({
    data,
    nameKey,
    valueKey,
    colors = DEFAULT_COLORS,
    height = 320,
}: PieChartGenericProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="45%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey={valueKey}
                    paddingAngle={2}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || colors[index % colors.length]} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#d1d5db", fontWeight: 600 }}
                    itemStyle={{ color: "#d1d5db" }}
                    formatter={(value: any, name: any) => [
                        `${value} (${((value / data.reduce((sum, item) => sum + item[valueKey], 0)) * 100).toFixed(1)}%)`,
                        name
                    ]}
                />
                <Legend
                    wrapperStyle={{ paddingTop: "10px" }}
                    iconType="circle"
                    verticalAlign="bottom"
                    height={80}
                    formatter={(value: string, entry: any) => (
                        <span style={{ color: "#d1d5db" }}>
                            {entry.payload[nameKey]}
                        </span>
                    )}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}
