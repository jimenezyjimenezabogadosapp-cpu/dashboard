import Link from "next/link";

export default function Footer() {
    return (
        <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                    {/* Logo y información principal */}
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <img
                                src="/brand/gyo.svg"
                                alt="Gamma y Omega Logo"
                                className="w-8 h-8"
                            />
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                <span className="font-medium">Powered by</span>
                                <span className="ml-1">Gamma y Omega, Desarrollos</span>
                            </div>
                        </div>
                        <div className="hidden md:block w-px h-4 bg-gray-300 dark:bg-gray-600" />
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                            Producto digital 100% Colombiano
                        </div>
                    </div>

                    {/* Créditos y derechos */}
                    <div className="flex flex-col items-center md:items-end space-y-2">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Desarrollado por{" "}
                            <Link
                                href="https://www.linkedin.com/in/juanmahecha-dc/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors underline decoration-2 underline-offset-2 decoration-blue-200 dark:decoration-blue-800 hover:decoration-blue-300 dark:hover:decoration-blue-700"
                            >
                                Juan David Mahceha Cruz
                            </Link>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                            © 2025 Jimenez M&M Abogados Asociados SAS. All Rights Reserved.
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
