import { cn } from "@/lib/utils";
import React from "react";

interface TableColumn {
    key: string;
    header: string;
    className?: string;
    render?: (value: any, row: any) => React.ReactNode;
}

interface TableGenericProps {
    columns: TableColumn[];
    rows: Record<string, any>[];
    className?: string;
}

export default function TableGeneric({ columns, rows, className }: TableGenericProps) {
    return (
        <div className={cn("overflow-auto rounded-xl border border-gray-100 dark:border-gray-800 max-h-[500px]", className)}>
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                <thead className="bg-gray-50/50 dark:bg-gray-900/50">
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                scope="col"
                                className={cn(
                                    "px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest",
                                    col.className
                                )}
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-50 dark:divide-gray-800">
                    {!rows || rows.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="px-6 py-10 text-center text-xs font-bold text-gray-400 uppercase tracking-tighter">
                                No se encontraron registros disponibles
                            </td>
                        </tr>
                    ) : (
                        rows.map((row, idx) => (
                            <tr key={idx} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-200">
                                {columns.map((col) => (
                                    <td
                                        key={col.key}
                                        className={cn(
                                            "px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors group-hover:text-gray-900 dark:group-hover:text-white",
                                            col.className
                                        )}
                                    >
                                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "-")}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
