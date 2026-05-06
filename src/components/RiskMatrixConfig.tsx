"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { 
    ChevronRight, 
    ChevronLeft,
    Save, 
    Plus, 
    Trash2, 
    AlertTriangle, 
    ShieldCheck, 
    Info,
    LayoutDashboard,
    Settings,
    List,
    FileText,
    Calculator,
    Zap,
    Edit3,
    Search,
    User,
    BookOpen,
    RefreshCw,
    PlusCircle,
    Activity
} from "lucide-react";

interface Mitigation {
    id: string;
    controlType: string;
    customControlName: string;
    description: string;
    efficacy: number; // 0 to 1
    responsible: string;
}

interface RiskConfig {
    id: string;
    catalogRisk: string;
    customRiskName: string;
    riskType: string;
    description: string;
    comment: string;
    probability: number;
    impact: number;
    justification: string;
    mitigations: Mitigation[];
}

const RISK_TYPES = [
    "LA/FT (Lavado de Activos / Financiación del Terrorismo)",
    "FPADM (Financiación de la Proliferación de Armas de Destrucción Masiva)",
    "Corrupción",
    "Soborno Transnacional",
    "Fraude Interno",
    "Operacional"
];

const CONTROL_TYPES = [
    { name: "Verificación Automática en Listas Restrictivas", efficacy: 1.0 },
    { name: "Monitoreo Transaccional Automatizado", efficacy: 0.8 },
    { name: "Debida Diligencia Intensificada (Manual)", efficacy: 0.5 },
    { name: "Reporte de Operaciones Sospechosas (ROS)", efficacy: 0.8 },
    { name: "Capacitación y Concienciación Periódica", efficacy: 0.2 },
    { name: "Conciliación de Saldos Mensual", efficacy: 0.5 },
    { name: "Auditoría Interna de Procesos", efficacy: 0.5 },
    { name: "OTRO (PERSONALIZADO)", efficacy: 0.5 }
];

const CATALOG_BY_TYPE: Record<string, string[]> = {
    "LA/FT (Lavado de Activos / Financiación del Terrorismo)": [
        "Apertura de productos con documentación falsa",
        "Fraccionamiento de transacciones (Pitufeo)",
        "Uso de cuentas de terceros (Testaferrato)",
        "Inyección de capital de origen ilícito",
        "Uso de empresas fachada"
    ],
    "FPADM (Financiación de la Proliferación de Armas de Destrucción Masiva)": [
        "Triangulación de recursos para compra de materiales duales",
        "Transferencias a países con sanciones internacionales",
        "Uso de intermediarios en paraísos fiscales"
    ],
    "Corrupción": [
        "Pagos de facilitación a funcionarios públicos",
        "Sobornos para la adjudicación de contratos",
        "Tráfico de influencias en la cadena de suministro"
    ],
    "Soborno Transnacional": [
        "Pagos indebidos a funcionarios extranjeros",
        "Uso de agentes externos para ocultar dádivas",
        "Financiación irregular de campañas en el exterior"
    ],
    "Fraude Interno": [
        "Malversación de fondos por empleados",
        "Manipulación de estados financieros",
        "Robo de información confidencial o activos"
    ],
    "Operacional": [
        "Fallas en los sistemas de monitoreo",
        "Errores humanos en la debida diligencia",
        "Incumplimiento de políticas internas"
    ]
};

const RISK_SUGGESTIONS: Record<string, { p: number, i: number }> = {
    "Apertura de productos con documentación falsa": { p: 4, i: 5 },
    "Fraccionamiento de transacciones (Pitufeo)": { p: 5, i: 3 },
    "Uso de cuentas de terceros (Testaferrato)": { p: 3, i: 5 },
    "Inyección de capital de origen ilícito": { p: 2, i: 5 },
    "Pagos de facilitación a funcionarios públicos": { p: 4, i: 4 },
    "Fallas en los sistemas de monitoreo": { p: 3, i: 3 }
};

const EFFICACY_LABELS = [
    { value: 0.2, label: "Baja", color: "bg-red-500" },
    { value: 0.5, label: "Media", color: "bg-yellow-500" },
    { value: 0.8, label: "Alta", color: "bg-green-500" },
    { value: 1.0, label: "Total", color: "bg-blue-500" }
];

export default function RiskMatrixConfig() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<"create" | "list">("create");
    const [step, setStep] = useState(1);
    const [isEditing, setIsEditing] = useState(false);
    const [isAutoCalculating, setIsAutoCalculating] = useState(false);
    
    const [auth, setAuth] = useState({
        role: "",
        dependenceId: "",
        isSuper: false
    });
    const [dependencies, setDependencies] = useState<{id: string, name: string}[]>([]);
    const [loading, setLoading] = useState(true);
    const [risksList, setRisksList] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    const [config, setConfig] = useState<RiskConfig & { dependenceId: string }>({
        id: "",
        dependenceId: "",
        catalogRisk: "",
        customRiskName: "",
        riskType: RISK_TYPES[0],
        description: "",
        comment: "",
        probability: 3,
        impact: 3,
        justification: "",
        mitigations: [{ 
            id: "1", 
            controlType: CONTROL_TYPES[0].name, 
            customControlName: "",
            description: "", 
            efficacy: CONTROL_TYPES[0].efficacy, 
            responsible: "" 
        }]
    });

    const isFirstRender = useRef(true);
    const userKey = searchParams.get("x-user-key") || "019bdbff-d27c-7583-b76f-80edd5ae064e";

    const loadRisks = async (depId: string, isSuper: boolean) => {
        try {
            let query = "SELECT rdt.*, ANY_VALUE(dt.name) as dependence_name FROM risk_data_tbl rdt LEFT JOIN risk_action_tbl rat ON rat.risk_id = rdt.id LEFT JOIN dependence_tbl dt ON dt.id = rat.dependence_id";
            if (!isSuper && depId) {
                query += ` WHERE rat.dependence_id = '${depId}'`;
            }
            query += " GROUP BY rdt.id ORDER BY rdt.created DESC";

            const resRisks = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(query));
            const dataRisks = await resRisks.json();
            setRisksList(Array.isArray(dataRisks) ? dataRisks : []);
        } catch (err) {
            console.error("Error loading risks", err);
        }
    };

    useEffect(() => {
        const role = searchParams.get("role_id") || "";
        const depId = searchParams.get("dependence_id") || "";
        const isSuper = role === "SUPER";
        
        setAuth({ role, dependenceId: depId, isSuper });
        setConfig(prev => ({ ...prev, dependenceId: depId }));

        async function init() {
            setLoading(true);
            try {
                const resDeps = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent("SELECT id, name FROM dependence_tbl ORDER BY name ASC"));
                const dataDeps = await resDeps.json();
                setDependencies(Array.isArray(dataDeps) ? dataDeps : []);
                await loadRisks(depId, isSuper);
            } catch (err) {
                console.error("Error init", err);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [searchParams]);

    useEffect(() => {
        if (isEditing) return;
        const options = CATALOG_BY_TYPE[config.riskType] || [];
        setConfig(prev => ({
            ...prev,
            catalogRisk: options[0] || "PERSONALIZADO",
            customRiskName: ""
        }));
    }, [config.riskType, isEditing]);

    useEffect(() => {
        if (isEditing) return;
        if (config.catalogRisk === "PERSONALIZADO") return;
        
        const suggestion = RISK_SUGGESTIONS[config.catalogRisk];
        if (suggestion) {
            setIsAutoCalculating(true);
            setConfig(prev => ({
                ...prev,
                probability: suggestion.p,
                impact: suggestion.i
            }));
            setTimeout(() => setIsAutoCalculating(false), 800);
        }
    }, [config.catalogRisk, isEditing]);

    const handleAddMitigation = () => {
        setConfig(prev => ({
            ...prev,
            mitigations: [
                ...prev.mitigations,
                { 
                    id: Math.random().toString(36).substr(2, 9), 
                    controlType: CONTROL_TYPES[0].name, 
                    customControlName: "",
                    description: "", 
                    efficacy: CONTROL_TYPES[0].efficacy, 
                    responsible: "" 
                }
            ]
        }));
    };

    const handleRemoveMitigation = (id: string) => {
        setConfig(prev => ({
            ...prev,
            mitigations: prev.mitigations.filter(m => m.id !== id)
        }));
    };

    const handleMitigationChange = (id: string, field: keyof Mitigation, value: any) => {
        setConfig(prev => {
            const updated = prev.mitigations.map(m => {
                if (m.id === id) {
                    const newMit = { ...m, [field]: value };
                    // Auto-update efficacy if controlType changes
                    if (field === "controlType" && value !== "OTRO (PERSONALIZADO)") {
                        const suggestion = CONTROL_TYPES.find(ct => ct.name === value);
                        if (suggestion) {
                            newMit.efficacy = suggestion.efficacy;
                        }
                    }
                    return newMit;
                }
                return m;
            });
            return { ...prev, mitigations: updated };
        });
    };

    const handleEditRisk = async (risk: any) => {
        setLoading(true);
        try {
            const query = `SELECT * FROM risk_action_tbl WHERE risk_id = ${risk.id}`;
            const res = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(query));
            const actions = await res.json();

            const mitigations: Mitigation[] = Array.isArray(actions) ? actions.map(a => ({
                id: a.id.toString(),
                controlType: a.type || "OTRO (PERSONALIZADO)",
                customControlName: a.type || "",
                description: a.description,
                efficacy: 0.5,
                responsible: a.person || ""
            })) : [];

            setConfig({
                id: risk.id.toString(),
                dependenceId: risk.dependence_id || auth.dependenceId,
                catalogRisk: risk.name || "PERSONALIZADO",
                customRiskName: risk.name || "",
                riskType: risk.type || RISK_TYPES[0],
                description: risk.description || "",
                comment: risk.comments || "",
                probability: risk.probability || 3,
                impact: risk.impact || 3,
                justification: risk.comments || "",
                mitigations: mitigations.length > 0 ? mitigations : [{ 
                    id: "1", 
                    controlType: CONTROL_TYPES[0].name, 
                    customControlName: "",
                    description: "", 
                    efficacy: CONTROL_TYPES[0].efficacy, 
                    responsible: "" 
                }]
            });

            setIsEditing(true);
            setStep(2); 
            setActiveTab("create");
        } catch (err) {
            console.error("Error loading risk details", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            alert(`Configuración de riesgo ${isEditing ? 'actualizada' : 'creada'} exitosamente`);
            await loadRisks(auth.dependenceId, auth.isSuper);
            setActiveTab("list");
            setIsEditing(false);
            resetForm();
        } catch (err) {
            console.error("Error saving", err);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setConfig({
            id: "",
            dependenceId: auth.dependenceId,
            catalogRisk: CATALOG_BY_TYPE[RISK_TYPES[0]][0],
            customRiskName: "",
            riskType: RISK_TYPES[0],
            description: "",
            comment: "",
            probability: 3,
            impact: 3,
            justification: "",
            mitigations: [{ 
                id: "1", 
                controlType: CONTROL_TYPES[0].name, 
                customControlName: "",
                description: "", 
                efficacy: CONTROL_TYPES[0].efficacy, 
                responsible: "" 
            }]
        });
        setIsEditing(false);
        setStep(1);
    };

    const inherentRisk = config.impact * config.probability;
    const maxEfficacy = Math.max(...config.mitigations.map(m => m.efficacy), 0);
    const residualRisk = inherentRisk * (1 - maxEfficacy);

    const getRiskLevel = (score: number) => {
        if (score <= 5) return { label: "Bajo", color: "text-green-500", bg: "bg-green-500/10" };
        if (score <= 12) return { label: "Moderado", color: "text-yellow-500", bg: "bg-yellow-500/10" };
        if (score <= 20) return { label: "Alto", color: "text-orange-500", bg: "bg-orange-500/10" };
        return { label: "Extremo", color: "text-red-500", bg: "bg-red-500/10" };
    };

    const filteredRisks = risksList.filter(r => 
        (r.name || r.risk_name || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase tracking-widest">
                            <Settings className="w-4 h-4" />
                            <span>LexChain Compliance</span>
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                            Parametrización de Riesgos
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <div className="flex p-1 bg-gray-200 dark:bg-gray-800 rounded-2xl">
                            <button 
                                onClick={() => { setActiveTab("create"); resetForm(); }}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                                    activeTab === "create" && !isEditing ? "bg-white dark:bg-gray-700 text-blue-500 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                <Plus className="w-4 h-4" />
                                Nuevo
                            </button>
                            <button 
                                onClick={() => setActiveTab("list")}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                                    activeTab === "list" ? "bg-white dark:bg-gray-700 text-blue-500 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                <List className="w-4 h-4" />
                                Listado
                            </button>
                        </div>
                    </div>
                </div>

                {activeTab === "list" ? (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-xl border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input 
                                    type="text"
                                    placeholder="Buscar riesgo por nombre..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-transparent rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                                />
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-[32px] shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="p-8 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <List className="w-5 h-5 text-blue-500" />
                                    Historial de Riesgos Parametrizados
                                </h3>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{filteredRisks.length} Registros</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                                        <tr>
                                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Riesgo / Proceso</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Dependencia</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Inherente</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Residual</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {filteredRisks.map((risk) => (
                                            <tr key={risk.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                                                <td className="px-8 py-6">
                                                    <div className="font-bold text-gray-900 dark:text-white">{risk.name || risk.risk_name}</div>
                                                    <div className="text-[10px] text-gray-400 mt-1 uppercase">{risk.status}</div>
                                                </td>
                                                <td className="px-8 py-6 text-sm text-gray-500 dark:text-gray-400">
                                                    {risk.dependence_name || "General"}
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase", getRiskLevel(risk.impact * risk.probability).bg, getRiskLevel(risk.impact * risk.probability).color)}>
                                                        {risk.impact * risk.probability}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full text-[10px] font-black">
                                                        --
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <button 
                                                        onClick={() => handleEditRisk(risk)}
                                                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-500 rounded-xl transition-all active:scale-90"
                                                    >
                                                        <Edit3 className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                        {isEditing && (
                            <div className="max-w-4xl mx-auto mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500 text-white rounded-lg">
                                        <Edit3 className="w-4 h-4" />
                                    </div>
                                    <div className="text-sm">
                                        <span className="font-bold text-blue-500">Modo Edición de Controles:</span>
                                        <span className="text-gray-500 ml-2">Parámetros inherentes bloqueados.</span>
                                    </div>
                                </div>
                                <button onClick={resetForm} className="text-xs font-bold text-red-500 hover:underline">Cancelar y Volver</button>
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-10 max-w-4xl mx-auto">
                            {[
                                { n: 1, label: "Identificación", icon: FileText },
                                { n: 2, label: "Controles", icon: ShieldCheck },
                                { n: 3, label: "Impacto Residual", icon: Zap }
                            ].map((s) => (
                                <div key={s.n} className="flex flex-col items-center gap-3 relative z-10">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                                        step >= s.n ? "bg-blue-600 text-white shadow-xl shadow-blue-600/30 scale-110" : "bg-gray-200 dark:bg-gray-800 text-gray-400",
                                        isEditing && s.n === 1 && "opacity-50 grayscale"
                                    )}>
                                        <s.icon className="w-5 h-5" />
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-widest",
                                        step >= s.n ? "text-blue-500" : "text-gray-400"
                                    )}>{s.label}</span>
                                </div>
                            ))}
                            <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-lg h-[2px] bg-gray-200 dark:bg-gray-800 -z-10 mt-[-20px]">
                                <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${((step - 1) / 2) * 100}%` }}></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            <div className="lg:col-span-8 space-y-8">
                                {step === 1 && (
                                    <div className="bg-white dark:bg-gray-800 rounded-[40px] p-10 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-10 animate-in fade-in slide-in-from-left-8 duration-500">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-2">
                                                <h3 className="text-2xl font-black text-gray-900 dark:text-white">Registrar Riesgo</h3>
                                                <p className="text-gray-500 dark:text-gray-400 text-sm">Categorización SARLAFT dinámica.</p>
                                            </div>
                                            {isAutoCalculating && (
                                                <div className="flex items-center gap-2 text-blue-500 animate-pulse">
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                    <span className="text-[10px] font-black uppercase">Actualizando...</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo de Riesgo (SARLAFT)</label>
                                                <select 
                                                    disabled={isEditing}
                                                    value={config.riskType}
                                                    onChange={(e) => setConfig({...config, riskType: e.target.value})}
                                                    className="w-full px-6 py-5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-[24px] focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-gray-900 dark:text-white appearance-none disabled:opacity-60 shadow-sm"
                                                >
                                                    {RISK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                    <BookOpen className="w-3 h-3" /> Riesgo a Catalogar
                                                </label>
                                                <select 
                                                    disabled={isEditing}
                                                    value={config.catalogRisk}
                                                    onChange={(e) => setConfig({...config, catalogRisk: e.target.value})}
                                                    className="w-full px-6 py-5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-[24px] focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-gray-900 dark:text-white appearance-none disabled:opacity-60 shadow-sm"
                                                >
                                                    {(CATALOG_BY_TYPE[config.riskType] || []).map(r => <option key={r} value={r}>{r}</option>)}
                                                    <option value="PERSONALIZADO">-- OTRO (PERSONALIZADO) --</option>
                                                </select>
                                            </div>

                                            {config.catalogRisk === "PERSONALIZADO" && (
                                                <div className="space-y-4 col-span-full animate-in slide-in-from-top-2 duration-300">
                                                    <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                        <PlusCircle className="w-3 h-3" /> Nombre del Riesgo Personalizado
                                                    </label>
                                                    <input 
                                                        type="text"
                                                        value={config.customRiskName}
                                                        onChange={(e) => setConfig({...config, customRiskName: e.target.value})}
                                                        placeholder="Especifique el nombre del riesgo..."
                                                        className="w-full px-6 py-5 bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-[24px] focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-gray-900 dark:text-white"
                                                    />
                                                </div>
                                            )}

                                            <div className="space-y-4 col-span-full pt-4 border-t border-gray-100 dark:border-gray-700">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contexto Organizacional</label>
                                                <select 
                                                    disabled={isEditing || !auth.isSuper || loading}
                                                    value={config.dependenceId}
                                                    onChange={(e) => setConfig({...config, dependenceId: e.target.value})}
                                                    className="w-full px-6 py-5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-[24px] focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-gray-900 dark:text-white appearance-none disabled:opacity-60"
                                                >
                                                    <option value="">Seleccione una dependencia...</option>
                                                    {dependencies.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                </select>
                                            </div>

                                            <div className="space-y-4 col-span-full">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción Detallada</label>
                                                <textarea 
                                                    disabled={isEditing}
                                                    value={config.description}
                                                    onChange={(e) => setConfig({...config, description: e.target.value})}
                                                    placeholder="Escribe la descripción del riesgo..."
                                                    className="w-full px-6 py-5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-[24px] focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-gray-900 dark:text-white h-24 disabled:opacity-60"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-6 border-t border-gray-100 dark:border-gray-700">
                                            <div className={cn("space-y-6", isEditing && "opacity-50")}>
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Probabilidad</label>
                                                    <span className="text-2xl font-black text-blue-500">{config.probability}</span>
                                                </div>
                                                <input 
                                                    type="range" min="1" max="5" 
                                                    disabled={isEditing}
                                                    value={config.probability}
                                                    onChange={(e) => setConfig({...config, probability: parseInt(e.target.value)})}
                                                    className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-600 shadow-sm"
                                                />
                                            </div>

                                            <div className={cn("space-y-6", isEditing && "opacity-50")}>
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Impacto</label>
                                                    <span className="text-2xl font-black text-amber-500">{config.impact}</span>
                                                </div>
                                                <input 
                                                    type="range" min="1" max="5" 
                                                    disabled={isEditing}
                                                    value={config.impact}
                                                    onChange={(e) => setConfig({...config, impact: parseInt(e.target.value)})}
                                                    className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-amber-500 shadow-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="bg-white dark:bg-gray-800 rounded-[40px] p-10 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                                        <div className="flex justify-between items-center">
                                            <div className="space-y-2">
                                                <h3 className="text-2xl font-black text-gray-900 dark:text-white">Fase 2: Sistema de Control</h3>
                                                <p className="text-gray-500 dark:text-gray-400 text-sm">Gestione las medidas de mitigación con eficacia sugerida.</p>
                                            </div>
                                            <button 
                                                onClick={handleAddMitigation}
                                                className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-2xl hover:bg-blue-100 transition-all active:scale-90"
                                            >
                                                <Plus className="w-6 h-6" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 gap-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                            {config.mitigations.map((mitigation, idx) => (
                                                <div 
                                                    key={mitigation.id}
                                                    className="p-8 bg-gray-50 dark:bg-gray-900/50 rounded-[32px] border border-gray-100 dark:border-gray-700 space-y-6 group"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Medida #{idx + 1}</span>
                                                        <button 
                                                            onClick={() => handleRemoveMitigation(mitigation.id)}
                                                            className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-500 transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-4">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                                <Activity className="w-3 h-3" /> Tipo de Control
                                                            </label>
                                                            <select 
                                                                value={mitigation.controlType}
                                                                onChange={(e) => handleMitigationChange(mitigation.id, "controlType", e.target.value)}
                                                                className="w-full px-5 py-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none"
                                                            >
                                                                {CONTROL_TYPES.map(ct => <option key={ct.name} value={ct.name}>{ct.name}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                                <User className="w-3 h-3" /> Responsable
                                                            </label>
                                                            <input 
                                                                type="text"
                                                                value={mitigation.responsible}
                                                                onChange={(e) => handleMitigationChange(mitigation.id, "responsible", e.target.value)}
                                                                placeholder="Nombre del responsable"
                                                                className="w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                            />
                                                        </div>

                                                        {mitigation.controlType === "OTRO (PERSONALIZADO)" && (
                                                            <div className="space-y-4 col-span-full animate-in slide-in-from-top-2 duration-300">
                                                                <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                                    <PlusCircle className="w-3 h-3" /> Nombre del Control Personalizado
                                                                </label>
                                                                <input 
                                                                    type="text"
                                                                    value={mitigation.customControlName}
                                                                    onChange={(e) => handleMitigationChange(mitigation.id, "customControlName", e.target.value)}
                                                                    placeholder="Especifique el control..."
                                                                    className="w-full px-5 py-4 bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-2xl text-sm outline-none transition-all"
                                                                />
                                                            </div>
                                                        )}

                                                        <div className="space-y-4 col-span-full">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción Detallada del Control</label>
                                                            <textarea 
                                                                value={mitigation.description}
                                                                onChange={(e) => handleMitigationChange(mitigation.id, "description", e.target.value)}
                                                                placeholder="Describa el funcionamiento específico del control..."
                                                                className="w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 transition-all"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                        <div className="flex justify-between items-center">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Eficacia Técnica (Auto-calculada)</label>
                                                            <span className={cn("text-[10px] font-black uppercase px-3 py-1 rounded-full", EFFICACY_LABELS.find(l => mitigation.efficacy === l.value)?.color, "text-white shadow-sm")}>
                                                                {EFFICACY_LABELS.find(l => mitigation.efficacy === l.value)?.label}
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-3">
                                                            {EFFICACY_LABELS.map(level => (
                                                                <button
                                                                    key={level.value}
                                                                    onClick={() => handleMitigationChange(mitigation.id, "efficacy", level.value)}
                                                                    className={cn(
                                                                        "flex-1 h-3 rounded-full transition-all duration-300",
                                                                        mitigation.efficacy === level.value 
                                                                            ? level.color + " shadow-md" 
                                                                            : "bg-gray-200 dark:bg-gray-700"
                                                                    )}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="bg-white dark:bg-gray-800 rounded-[40px] p-10 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-10 animate-in zoom-in-95 duration-500">
                                        <div className="text-center space-y-4">
                                            <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                                                <Zap className="w-10 h-10" />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-3xl font-black text-gray-900 dark:text-white">Impacto Residual</h3>
                                                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">Nivel de riesgo remanente tras aplicar las mitigaciones.</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            <div className="p-8 bg-gray-50 dark:bg-gray-900/50 rounded-[32px] border border-gray-100 dark:border-gray-700 text-center space-y-2">
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Inherente</div>
                                                <div className="text-3xl font-black text-gray-900 dark:text-white">{inherentRisk}</div>
                                            </div>
                                            <div className="p-8 bg-gray-50 dark:bg-gray-900/50 rounded-[32px] border border-gray-100 dark:border-gray-700 text-center space-y-2">
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Eficacia Máxima</div>
                                                <div className="text-3xl font-black text-blue-500">{(maxEfficacy * 100).toFixed(0)}%</div>
                                            </div>
                                            <div className="p-8 bg-blue-600 rounded-[32px] text-center space-y-2 shadow-xl shadow-blue-600/30">
                                                <div className="text-[10px] font-black text-white/60 uppercase tracking-widest">Residual</div>
                                                <div className="text-3xl font-black text-white">{residualRisk.toFixed(1)}</div>
                                            </div>
                                        </div>

                                        <div className="p-8 bg-gray-900 rounded-[32px] text-white space-y-6">
                                            <div className="flex items-center gap-3">
                                                <FileText className="w-5 h-5 text-blue-400" />
                                                <h4 className="font-bold">Justificación Técnica del Resultado</h4>
                                            </div>
                                            <textarea 
                                                value={config.justification}
                                                onChange={(e) => setConfig({...config, justification: e.target.value})}
                                                placeholder="Documente el sustento técnico de la mitigación..."
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-32 transition-all"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-4">
                                    <button 
                                        disabled={step === 1 && !isEditing}
                                        onClick={() => setStep(prev => prev - 1)}
                                        className="flex items-center gap-2 px-8 py-4 text-gray-500 font-bold hover:text-gray-700 disabled:opacity-0 transition-all"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                        Anterior
                                    </button>
                                    
                                    {step < 3 ? (
                                        <button 
                                            onClick={() => setStep(prev => prev + 1)}
                                            className="flex items-center gap-2 px-10 py-5 bg-blue-600 text-white rounded-[24px] font-black shadow-xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all"
                                        >
                                            Siguiente Paso
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    ) : (
                                        <button 
                                            disabled={loading}
                                            onClick={handleSave}
                                            className="flex items-center gap-2 px-10 py-5 bg-green-600 text-white rounded-[24px] font-black shadow-xl shadow-green-600/30 hover:bg-green-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                        >
                                            {isEditing ? 'Actualizar Controles' : 'Finalizar y Guardar'}
                                            <Save className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="lg:col-span-4 space-y-8">
                                <div className="bg-white dark:bg-gray-800 rounded-[32px] p-8 shadow-xl border border-gray-100 dark:border-gray-700 space-y-8 sticky top-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500">
                                            <Calculator className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-bold text-gray-900 dark:text-white">Resumen Operativo</h3>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400 font-medium">Inherente</span>
                                            <span className={cn("font-black uppercase text-[10px] px-2 py-1 rounded-md", getRiskLevel(inherentRisk).bg, getRiskLevel(inherentRisk).color)}>
                                                {getRiskLevel(inherentRisk).label} ({inherentRisk})
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400 font-medium">Controles</span>
                                            <span className="text-blue-500 font-black">{config.mitigations.length}</span>
                                        </div>
                                        <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
                                            <div className="flex justify-between items-end mb-2">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Riesgo Residual</span>
                                                <span className={cn("text-lg font-black", getRiskLevel(residualRisk).color)}>{residualRisk.toFixed(1)}</span>
                                            </div>
                                            <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div 
                                                    className={cn("h-full transition-all duration-1000", getRiskLevel(residualRisk).bg.replace('/10', ''))}
                                                    style={{ width: `${(residualRisk / 25) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
