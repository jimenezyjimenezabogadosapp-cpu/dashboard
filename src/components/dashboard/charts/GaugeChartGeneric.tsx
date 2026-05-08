"use client";

import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface GaugeChartProps {
    value: number;
    min?: number;
    max?: number;
    label?: string;
    color?: string;
}

export default function GaugeChartGeneric({ value, min = 0, max = 100, label, color = "#3b82f6" }: GaugeChartProps) {
    const data = [
        { value: value },
        { value: max - value },
    ];

    return (
        <div className="w-full h-full flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="80%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius="60%"
                        outerRadius="80%"
                        paddingAngle={0}
                        dataKey="value"
                        stroke="none"
                    >
                        <Cell key="cell-0" fill={color} />
                        <Cell key="cell-1" fill="rgba(0,0,0,0.05)" />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute mt-8 text-center">
                <span className="text-2xl font-black text-gray-900 dark:text-gray-100">{value}</span>
                {label && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{label}</p>}
            </div>
        </div>
    );
}
