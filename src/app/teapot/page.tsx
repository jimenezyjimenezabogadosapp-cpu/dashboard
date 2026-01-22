import { Metadata } from 'next';

export const metadata: Metadata = {
    title: '418 - Soy una tetera',
};

export default function TeapotPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-purple-950 dark:via-pink-950 dark:to-orange-950">
            <div className="text-center space-y-8 p-8 max-w-md">
                {/* Animated teapot icon */}
                <div className="relative inline-block">
                    <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-400 to-pink-400 rounded-full shadow-lg" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-5xl">🫖</span>
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                    418 — Soy una tetera
                </h1>

                {/* Message */}
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    No tienes permiso para acceder a esta área. Por favor, incluye una llave válida en la URL:
                </p>

                {/* Code example */}
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-left">
                    <code className="text-sm text-gray-800 dark:text-gray-200 break-all">
                        ?x-user-key=019bdbff-d27c-7583-b76f-80edd5ae064e
                    </code>
                </div>

                {/* Back button */}
                <a
                    href="/"
                    className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-full shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                >
                    Volver al inicio
                </a>
            </div>
        </div>
    );
}
