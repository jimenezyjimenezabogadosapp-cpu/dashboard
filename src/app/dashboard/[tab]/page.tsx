import { notFound } from "next/navigation";

const validTabs = ["tab1", "tab2"];

export default function TabPage({ params }: { params: { tab: string } }) {
    const { tab } = params;

    if (!validTabs.includes(tab)) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 capitalize">
                {tab}
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <p className="text-gray-700 dark:text-gray-300">
                    Contenido dinámico para la tab: <strong>{tab}</strong>
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Aquí puedes renderizar componentes específicos para cada tab.
                </p>
            </div>
        </div>
    );
}
