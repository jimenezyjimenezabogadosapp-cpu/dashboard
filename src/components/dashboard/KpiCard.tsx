import { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
    label: string;
    value: string | number;
    suffix?: string;
    delta?: number;
    icon?: ReactNode;
    className?: string;
}

export default function KpiCard({
    label,
    value,
    suffix = "",
    delta,
    icon,
    className,
}: KpiCardProps) {
    const isPositive = delta !== undefined && delta > 0;
    const isNegative = delta !== undefined && delta < 0;

    return (
        <div
            className={cn(
                "relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300 hover:shadow-md hover:scale-[1.02]",
                className
            )}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {label}
                    </p>
                    <div className="mt-2 flex items-baseline">
                        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                            {value}
                        </p>
                        {suffix && (
                            <span className="ml-1 text-lg text-gray-600 dark:text-gray-400">
                                {suffix}
                            </span>
                        )}
                    </div>
                    {delta !== undefined && (
                        <div className="mt-2 flex items-center text-sm">
                            {isPositive && <TrendingUp className="w-4 h-4 text-green-500 mr-1" />}
                            {isNegative && <TrendingDown className="w-4 h-4 text-red-500 mr-1" />}
                            <span
                                className={cn(
                                    "font-medium",
                                    isPositive && "text-green-600 dark:text-green-400",
                                    isNegative && "text-red-600 dark:text-red-400"
                                )}
                            >
                                {isPositive && "+"}
                                {delta}
                            </span>
                        </div>
                    )}
                </div>
                {icon && (
                    <div className="ml-4 flex-shrink-0 text-gray-400 dark:text-gray-600">
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
}
