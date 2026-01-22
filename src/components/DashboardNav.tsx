"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

const tabs = [
    { name: "Testing App", href: "/dashboard/testingapp" },
    { name: "Tab 1", href: "/dashboard/tab1" },
    { name: "Tab 2", href: "/dashboard/tab2" },
];

export default function DashboardNav() {
    const searchParams = useSearchParams();
    const key = searchParams.get("x-user-key");

    const buildHref = (href: string) => {
        if (!key) return href;
        const separator = href.includes("?") ? "&" : "?";
        return `${href}${separator}x-user-key=${encodeURIComponent(key)}`;
    };

    return (
        <nav className="flex space-x-4">
            {tabs.map((tab) => (
                <Link
                    key={tab.href}
                    href={buildHref(tab.href)}
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    {tab.name}
                </Link>
            ))}
        </nav>
    );
}
