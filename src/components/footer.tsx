"use client";

import Link from "next/link";

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <span>
                            Powered by{" "}
                            <Link
                                href="https://blipkgo.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors underline decoration-2 underline-offset-2 decoration-blue-200 dark:decoration-blue-800 hover:decoration-blue-300 dark:hover:decoration-blue-700"
                            >
                                Blipk Go
                            </Link>
                        </span>
                        <span className="hidden md:inline w-px h-4 bg-gray-300 dark:bg-gray-600" />
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                            Producto digital 100% Colombiano
                        </span>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-500">
                        © {year} Jimenez M&M Abogados Asociados SAS. All Rights Reserved.
                    </div>
                </div>
            </div>
        </footer>
    );
}
