import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChartCardProps {
    title: string;
    children: ReactNode;
    className?: string;
    height?: string;
}

export default function ChartCard({ title, children, className, height }: ChartCardProps) {
    return (
        <div
            className={cn(
                "bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300 hover:shadow-md",
                className
            )}
        >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 truncate">
                {title}
            </h3>
            <div className="relative w-full" style={{ height: height || "auto", minHeight: height ? "auto" : "350px" }}>
                {children}
            </div>
        </div>
    );
}
