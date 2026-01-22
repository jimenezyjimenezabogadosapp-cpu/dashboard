import { cn } from "@/lib/utils";

interface TableColumn {
    key: string;
    header: string;
    className?: string;
}

interface TableGenericProps {
    columns: TableColumn[];
    rows: Record<string, any>[];
    className?: string;
}

export default function TableGeneric({ columns, rows, className }: TableGenericProps) {
    return (
        <div className={cn("overflow-x-auto", className)}>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                scope="col"
                                className={cn(
                                    "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider",
                                    col.className
                                )}
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            {columns.map((col) => (
                                <td
                                    key={col.key}
                                    className={cn(
                                        "px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100",
                                        col.className
                                    )}
                                >
                                    {row[col.key] ?? "-"}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
