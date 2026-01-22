import { redirect } from "next/navigation";

export default function DashboardPage() {
    // Redirige a testingapp, pero necesitamos preservar x-user-key
    // Como no podemos leer searchParams aquí, lo hacemos en un client component o middleware
    redirect("/dashboard/testingapp");
}
