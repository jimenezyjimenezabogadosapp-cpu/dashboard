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
    Activity,
    Eye,
    X
} from "lucide-react";

interface Mitigation {
    id: string;
    controlType: string;
    nature: "Preventivo" | "Detectivo";
    customControlName: string;
    description: string;
    efficacy: number; // 0 to 1
    responsible: string;
    evaluation: string; // "SÍ SE ESTÁN APLICANDO Y SON ADECUADOS" | "NO SE ESTÁN APLICANDO" | "SE APLICAN PARCIALMENTE"
}

interface PHVAFase {
    descripcion: string;
    responsable: string;
    fecha: string;
    seguimiento: string;
    estado: "Abierta" | "Cerrada";
    eficacia: "Sí" | "No" | "En evaluación";
}

interface PHVA {
    planear: PHVAFase;
    hacer: PHVAFase;
    verificar: PHVAFase;
    actuar: PHVAFase;
}

interface RiskConfig {
    id: string;
    dependenceId: string;
    catalogRisk: string;
    customRiskName: string;
    riskType: string;
    description: string;
    comment: string;
    probability: number; // 1 to 4
    impact: number; // 5, 10, 20
    context: string[]; // Factores de riesgo
    associatedImpacts: string[]; // Contagio, Legal, Reputacional, Operativo
    treatment: string; // Opciones de manejo
    mitigations: Mitigation[];
    residualProbability: number;
    residualImpact: number;
    requiresImprovement: boolean;
    manualResidual?: boolean;
    justification: string;
    phva?: PHVA;
}

// --- CATALOGO UNIVERSAL (POR DEFECTO) ---
const DEFAULT_RISK_TYPES = [
    "LA/FT (Lavado de Activos / Financiación del Terrorismo)",
    "FPADM (Financiación de la Proliferación de Armas de Destrucción Masiva)",
    "Corrupción",
    "Soborno Transnacional",
    "Fraude Interno",
    "Operacional",
    "PTEE — Programa de Transparencia y Ética Empresarial"
];

const DEFAULT_CATALOG: Record<string, string[]> = {
    "LA/FT (Lavado de Activos / Financiación del Terrorismo)": [
        "Ingreso de recursos de origen ilícito mediante transacciones comerciales",
        "Uso de la entidad para el ocultamiento de bienes provenientes de actividades delictivas",
        "Vinculación de clientes o proveedores sin verificación en listas restrictivas",
        "PERSONALIZADO"
    ],
    "Corrupción": [
        "Ofrecimiento o recepción de sobornos para favorecer contratos",
        "Apropiación indebida de recursos de la entidad",
        "Tráfico de influencias en la toma de decisiones",
        "PERSONALIZADO"
    ]
};

// --- CATALOGO EXCLUSIVO UNIVERSIDAD SERGIO ARBOLEDA ---
const SERGIO_ARBOLEDA_RISK_TYPES = [
    "LA/FT (Lavado de Activos / Financiación del Terrorismo)",
    "FPADM (Financiación de la Proliferación de Armas de Destrucción Masiva)",
    "Corrupción",
    "Soborno Transnacional",
    "Fraude Interno",
    "Operacional",
    "PTEE",
    "PTEE — Corrupción y Soborno (Programa de Transparencia y Ética Empresarial)",
    "PTEE — Conflicto de Interés",
    "PTEE — Beneficios Indebidos / Donaciones Condicionadas",
    "PTEE — Uso de Intermediarios / Soborno Transnacional",
    "PTEE — Prácticas Anticompetitivas / Colusión",
    "PTEE — Conducta No Ética de Directivos y Colaboradores",
    "PTEE — Cabildeo",
    "PTEE — Donaciones",
    "PTEE — Contratación",
];

const SERGIO_ARBOLEDA_CATALOG: Record<string, string[]> = {
    "LA/FT (Lavado de Activos / Financiación del Terrorismo)": [
        "Apertura de productos o servicios con documentación incompleta de debida diligencia",
        "Prestación de servicios o contratos sin debida diligencia previa (realizada de forma posterior)",
        "Convenios de formación con personas jurídicas vinculadas a LA/FT mediante pago de matrículas con recursos ilícitos",
        "Arrendamiento de instalaciones (auditorios, salones, laboratorios) a clientes vinculados a listas restrictivas",
        "Alianzas estratégicas con empresas fachada utilizadas para canalizar recursos ilícitos",
        "Influencia indebida de directivos para favorecer contrataciones sin transparencia ni controles",
        "Otorgamiento o recepción de préstamos de terceros con condiciones contractuales atípicas y recursos de origen ilícito",
        "Directivos con antecedentes judiciales, disciplinarios o incluidos en listas restrictivas",
        "No revelación de relaciones económicas, societarias o familiares por parte de directivos (beneficiarios finales ocultos)",
        "Recepción de beneficios económicos o en especie por directivos asociados a decisiones institucionales",
        "Conductas de alto riesgo de directivos fuera del ejercicio del cargo que comprometan la reputación institucional",
        "PERSONALIZADO"
    ],
    "PTEE — Corrupción y Soborno (Programa de Transparencia y Ética Empresarial)": [
        "Omisión de debida diligencia sobre contrapartes en procesos de contratación, convenios o licitaciones",
        "Pago de comisiones, regalos o beneficios indebidos para influir en decisiones institucionales (soborno/cohecho)",
        "No declaración o gestión inadecuada de conflictos de interés por directivos, docentes o funcionarios",
        "Recepción de donaciones, patrocinios o aportes condicionados a decisiones institucionales sin controles de transparencia",
        "Uso de intermediarios, consultores o aliados estratégicos para acceder a contratos con comisiones ocultas",
        "Participación en procesos de contratación pública o privada con prácticas anticompetitivas, colusión o tráfico de influencias",
        "Conductas no éticas de directivos, docentes o funcionarios que generen impacto reputacional grave",
        "PERSONALIZADO"
    ],
    "Fraude Interno": [
        "Manipulación de registros académicos o notas por beneficios personales",
        "Desvío de recursos destinados a investigación o becas",
        "Uso indebido de activos de la universidad para fines privados",
        "PERSONALIZADO"
    ],
    "Operacional": [
        "Fallas en los sistemas de información que comprometan la integridad de los datos",
        "Interrupción de servicios educativos por fallas en la infraestructura técnica",
        "PERSONALIZADO"
    ]
};

const RISK_SUGGESTIONS: Record<string, { p: number, i: number }> = {
    "Apertura de productos": { p: 3, i: 10 },
    "Prestación de servicios": { p: 4, i: 20 },
    "Convenios de formación": { p: 2, i: 20 },
    "Arrendamiento de instalaciones": { p: 2, i: 20 },
    "Alianzas estratégicas": { p: 1, i: 20 },
    "Omisión de debida diligencia": { p: 3, i: 10 },
    "Pago de comisiones": { p: 4, i: 20 },
    "No declaración": { p: 3, i: 20 },
    "donaciones, patrocinios": { p: 2, i: 20 },
    "intermediarios, consultores": { p: 3, i: 20 },
    "prácticas anticompetitivas": { p: 1, i: 20 },
    "Manipulación de registros": { p: 3, i: 20 },
    "Desvío de recursos": { p: 2, i: 20 },
    "Uso indebido de activos": { p: 3, i: 10 },
    "Fallas en los sistemas": { p: 2, i: 10 }
};

const CONTROL_TYPES = [
    { name: "Verificación Automática en Listas Restrictivas", efficacy: 0.85, nature: "Preventivo" as const },
    { name: "Monitoreo Transaccional Automatizado", efficacy: 0.85, nature: "Detectivo" as const },
    { name: "Debida Diligencia Intensificada (Manual)", efficacy: 0.65, nature: "Preventivo" as const },
    { name: "Debida Diligencia Reforzada a Directivos", efficacy: 0.85, nature: "Preventivo" as const },
    { name: "Reporte de Operaciones Sospechosas — ROS a la UIAF", efficacy: 0.80, nature: "Detectivo" as const },
    { name: "Capacitación y Concienciación Periódica (SARLAFT/PTEE)", efficacy: 0.40, nature: "Preventivo" as const },
    { name: "Conciliación de Saldos Mensual", efficacy: 0.55, nature: "Detectivo" as const },
    { name: "Auditoría Interna de Procesos", efficacy: 0.70, nature: "Detectivo" as const },
    { name: "Política de No Servicio sin SARLAFT Aprobado", efficacy: 0.85, nature: "Preventivo" as const },
    { name: "Verificación de Beneficiario Final", efficacy: 0.85, nature: "Preventivo" as const },
    { name: "Cláusulas SARLAFT y de Terminación Automática en Contratos", efficacy: 0.75, nature: "Preventivo" as const },
    { name: "Formato de Declaración de Conflicto de Interés", efficacy: 0.70, nature: "Preventivo" as const },
    { name: "Canal de Denuncias Confidencial y Anónimo", efficacy: 0.80, nature: "Detectivo" as const },
    { name: "Comité de Aprobación Financiera / Cumplimiento", efficacy: 0.75, nature: "Preventivo" as const },
    { name: "Segregación de Funciones", efficacy: 0.80, nature: "Preventivo" as const },
    { name: "Programa Anual de Capacitación PTEE Obligatoria", efficacy: 0.50, nature: "Preventivo" as const },
    { name: "Cruce Trimestral en Aplicativo de Directivos", efficacy: 0.85, nature: "Detectivo" as const },
    { name: "OTRO (PERSONALIZADO)", efficacy: 0.5, nature: "Preventivo" as const }
];

const CONTEXT_FACTORS = ["Colaboradores", "Proveedores", "Directivos", "Contrapartes", "Clientes", "Aliados Estratégicos", "Administración Sistema", "Todas las áreas"];

const ASSOCIATED_IMPACTS = ["Contagio", "Legal", "Reputacional", "Operativo"];

const TREATMENT_OPTIONS = [
    "Asumir el Riesgo",
    "Reducir el Riesgo",
    "Evitar el Riesgo",
    "Compartir o Transferir el Riesgo",
    "Evitar el Riesgo / Reducir el Riesgo / Compartir o Transferir",
    "Asumir / Reducir el Riesgo / Compartir o Transferir"
];

const RESPONSIBLE_AREAS = [
    "Área de Cumplimiento / Oficial de Cumplimiento",
    "Consejo Directivo",
    "Área Financiera / Contabilidad",
    "Todas las áreas",
    "Área Jurídica",
    "Rectoría",
    "Vicerrectoría Administrativa",
    "Área de Contratación",
    "Auditoría Interna"
];

const PROBABILITY_SCALE = [
    { value: 1, label: "Baja" },
    { value: 2, label: "Media" },
    { value: 3, label: "Alta" },
    { value: 4, label: "Muy Alta" }
];

const IMPACT_SCALE = [
    { value: 5, label: "Leve" },
    { value: 10, label: "Moderado" },
    { value: 20, label: "Catastrófico" }
];

const EFFICACY_LABELS = [
    { value: 0.2, label: "Baja", color: "bg-red-500" },
    { value: 0.5, label: "Media", color: "bg-yellow-500" },
    { value: 0.75, label: "Alta", color: "bg-green-500" },
    { value: 0.85, label: "Óptima", color: "bg-blue-500" }
];

export default function RiskMatrixConfig() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<"create" | "list">("create");
    const [step, setStep] = useState(1);
    const [isEditing, setIsEditing] = useState(false);
    const [isAutoCalculating, setIsAutoCalculating] = useState(false);

    const [viewingRisk, setViewingRisk] = useState<any | null>(null);
    const [viewingActions, setViewingActions] = useState<any[]>([]);
    const [isViewing, setIsViewing] = useState(false);

    const [auth, setAuth] = useState({
        role: "",
        dependenceId: "",
        isSuper: false
    });
    const [dependencies, setDependencies] = useState<{ id: string, name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [risksList, setRisksList] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    const [config, setConfig] = useState<RiskConfig>({
        id: "",
        dependenceId: "",
        catalogRisk: "",
        customRiskName: "",
        riskType: DEFAULT_RISK_TYPES[0],
        description: "",
        comment: "",
        probability: 2,
        impact: 10,
        context: [],
        associatedImpacts: [],
        treatment: TREATMENT_OPTIONS[1],
        mitigations: [{
            id: "1",
            controlType: CONTROL_TYPES[0].name,
            nature: CONTROL_TYPES[0].nature,
            customControlName: "",
            description: "",
            efficacy: CONTROL_TYPES[0].efficacy,
            responsible: "",
            evaluation: "SÍ SE ESTÁN APLICANDO Y SON ADECUADOS"
        }],
        residualProbability: 2,
        residualImpact: 10,
        requiresImprovement: false,
        manualResidual: false,
        justification: ""
    });

    const isFirstRender = useRef(true);
    const userKey = searchParams.get("x-user-key") || "019bdbff-d27c-7583-b76f-80edd5ae064e";

    const activeRiskTypes = useRef<string[]>(DEFAULT_RISK_TYPES);
    const activeCatalog = useRef<Record<string, string[]>>(DEFAULT_CATALOG);

    const isSergioArboleda = dependencies.find(d => d.id === config.dependenceId)?.name?.toUpperCase().includes("SERGIO ARBOLEDA");

    if (isSergioArboleda) {
        activeRiskTypes.current = SERGIO_ARBOLEDA_RISK_TYPES;
        activeCatalog.current = SERGIO_ARBOLEDA_CATALOG;
    } else {
        activeRiskTypes.current = DEFAULT_RISK_TYPES;
        activeCatalog.current = DEFAULT_CATALOG;
    }

    // Auto-reset riskType if it's not available in the new active list
    useEffect(() => {
        if (!activeRiskTypes.current.includes(config.riskType)) {
            setConfig(prev => ({ ...prev, riskType: activeRiskTypes.current[0] }));
        }
    }, [config.dependenceId, dependencies]);

    useEffect(() => {
        if (!config.manualResidual) {
            const preventives = config.mitigations.filter(m => m.nature === "Preventivo");
            const detectives = config.mitigations.filter(m => m.nature === "Detectivo");

            const avgEfficacyProb = preventives.length > 0
                ? preventives.reduce((acc, m) => acc + (m.efficacy || 0), 0) / preventives.length
                : 0;
            const avgEfficacyImpact = detectives.length > 0
                ? detectives.reduce((acc, m) => acc + (m.efficacy || 0), 0) / detectives.length
                : 0;

            // Reducción proporcional: Preventivos afectan Probabilidad, Detectivos afectan Impacto
            const redProb = Math.max(1, Math.ceil(config.probability * (1 - avgEfficacyProb)));
            const redImpact = Math.max(1, Math.ceil(config.impact * (1 - avgEfficacyImpact)));

            setConfig(prev => ({
                ...prev,
                residualProbability: redProb,
                residualImpact: redImpact
            }));
        }
    }, [config.probability, config.impact, config.mitigations, config.manualResidual]);

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
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (isEditing) return;
        const options = activeCatalog.current[config.riskType] || [];
        setConfig(prev => ({
            ...prev,
            catalogRisk: options[0] || "PERSONALIZADO",
            customRiskName: ""
        }));
    }, [config.riskType, isEditing, config.dependenceId]);

    useEffect(() => {
        if (isEditing) return;
        if (config.catalogRisk === "PERSONALIZADO") return;

        // Find suggestion using partial match (first key found that is part of the catalog name)
        const suggestionKey = Object.keys(RISK_SUGGESTIONS).find(key => config.catalogRisk.includes(key));
        const suggestion = suggestionKey ? RISK_SUGGESTIONS[suggestionKey] : null;

        if (suggestion) {
            setIsAutoCalculating(true);
            setConfig(prev => ({
                ...prev,
                probability: suggestion.p,
                impact: suggestion.i
            }));
            // Show auto-calc animation then allow manual override
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
                    nature: CONTROL_TYPES[0].nature,
                    customControlName: "",
                    description: "",
                    efficacy: CONTROL_TYPES[0].efficacy,
                    responsible: "",
                    evaluation: "SÍ SE ESTÁN APLICANDO Y SON ADECUADOS"
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

    const handleAssociatedImpactChange = (impact: string) => {
        setConfig(prev => {
            const newImpacts = prev.associatedImpacts.includes(impact)
                ? prev.associatedImpacts.filter(i => i !== impact)
                : [...prev.associatedImpacts, impact];
            return { ...prev, associatedImpacts: newImpacts };
        });
    };

    const handleContextChange = (factor: string) => {
        setConfig(prev => {
            const newContext = prev.context.includes(factor)
                ? prev.context.filter(f => f !== factor)
                : [...prev.context, factor];
            return { ...prev, context: newContext };
        });
    };

    const handleMitigationChange = (id: string, field: keyof Mitigation, value: any) => {
        setConfig(prev => {
            const updated = prev.mitigations.map(m => {
                if (m.id === id) {
                    const newMit = { ...m, [field]: value };
                    if (field === "controlType" && value !== "OTRO (PERSONALIZADO)") {
                        const suggestion = CONTROL_TYPES.find(ct => ct.name === value);
                        if (suggestion) {
                            newMit.efficacy = suggestion.efficacy;
                            newMit.nature = suggestion.nature;
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

            const mitigations: Mitigation[] = Array.isArray(actions) ? actions.map(a => {
                const ctMatch = CONTROL_TYPES.find(ct => ct.name === a.type);
                return {
                    id: a.id.toString(),
                    controlType: ctMatch ? a.type : "OTRO (PERSONALIZADO)",
                    nature: ctMatch ? ctMatch.nature : "Preventivo",
                    customControlName: ctMatch ? "" : (a.type || ""),
                    description: a.description,
                    efficacy: ctMatch ? ctMatch.efficacy : 0.5,
                    responsible: a.person || "",
                    evaluation: "SÍ SE ESTÁN APLICANDO Y SON ADECUADOS"
                };
            }) : [];

            setConfig({
                id: risk.id.toString(),
                dependenceId: risk.dependence_id || auth.dependenceId,
                catalogRisk: risk.name || "PERSONALIZADO",
                customRiskName: risk.name || "",
                riskType: risk.type || activeRiskTypes.current[0],
                description: risk.description || "",
                comment: risk.comments || "",
                probability: Number(risk.probability) || 3,
                impact: Number(risk.impact) || 3,
                justification: risk.comments || "",
                mitigations: mitigations.length > 0 ? mitigations : [{
                    id: "1",
                    controlType: CONTROL_TYPES[0].name,
                    nature: CONTROL_TYPES[0].nature,
                    customControlName: "",
                    description: "",
                    efficacy: CONTROL_TYPES[0].efficacy,
                    responsible: "",
                    evaluation: "SÍ SE ESTÁN APLICANDO Y SON ADECUADOS"
                }],
                context: [],
                associatedImpacts: [],
                treatment: TREATMENT_OPTIONS[1],
                residualProbability: Number(risk.residual_probability) || 2,
                residualImpact: Number(risk.residual_impact) || 10,
                requiresImprovement: false,
                manualResidual: true
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

    const handleViewRisk = async (risk: any) => {
        setLoading(true);
        try {
            const query = `SELECT * FROM risk_action_tbl WHERE risk_id = ${risk.id}`;
            const res = await fetch(`/api/sql?x-user-key=${userKey}&query=` + encodeURIComponent(query));
            const actions = await res.json();
            
            setViewingRisk(risk);
            setViewingActions(Array.isArray(actions) ? actions : []);
            setIsViewing(true);
        } catch (err) {
            console.error("Error loading risk details for view", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        const userKey = process.env.NEXT_PUBLIC_DASHBOARD_USER_KEY || "019bdbff-d27c-7583-b76f-80edd5ae064e";

        try {
            const riskPayload = {
                name: config.customRiskName || config.catalogRisk,
                description: config.description,
                impact: config.impact,
                probability: config.probability,
                residual_impact: config.residualImpact,
                residual_probability: config.residualProbability,
                status: 'ACTIVO'
            };

            if (isEditing && config.id) {
                await fetch(`/api/sql?x-user-key=${userKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sql: `UPDATE riesgos_judiciales_db.risk_data_tbl SET name = ?, description = ?, impact = ?, probability = ?, residual_impact = ?, residual_probability = ? WHERE id = ?`,
                        params: [riskPayload.name, riskPayload.description, riskPayload.impact, riskPayload.probability, riskPayload.residual_impact, riskPayload.residual_probability, config.id]
                    })
                });

                // Update mitigations by deleting existing ones and inserting the new ones
                await fetch(`/api/sql?x-user-key=${userKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sql: `DELETE FROM riesgos_judiciales_db.risk_action_tbl WHERE risk_id = ?`,
                        params: [config.id]
                    })
                });

                for (const mitigation of config.mitigations) {
                    await fetch(`/api/sql?x-user-key=${userKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sql: `INSERT INTO riesgos_judiciales_db.risk_action_tbl (risk_id, description, type, person, dependence_id, status) VALUES (?, ?, ?, ?, ?, ?)`,
                            params: [
                                config.id,
                                mitigation.description || '',
                                mitigation.controlType === 'OTRO (PERSONALIZADO)' ? mitigation.customControlName : mitigation.controlType || '',
                                mitigation.responsible || '',
                                config.dependenceId,
                                'ACTIVO'
                            ]
                        })
                    });
                }
            } else {
                const res = await fetch(`/api/sql?x-user-key=${userKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sql: `INSERT INTO riesgos_judiciales_db.risk_data_tbl (name, description, impact, probability, residual_impact, residual_probability, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        params: [riskPayload.name, riskPayload.description, riskPayload.impact, riskPayload.probability, riskPayload.residual_impact, riskPayload.residual_probability, riskPayload.status]
                    })
                });
                const data = await res.json();
                const newId = data.data.insertId;

                if (newId) {
                    for (const mitigation of config.mitigations) {
                        await fetch(`/api/sql?x-user-key=${userKey}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                sql: `INSERT INTO riesgos_judiciales_db.risk_action_tbl (risk_id, description, type, person, dependence_id, status) VALUES (?, ?, ?, ?, ?, ?)`,
                                params: [
                                    newId,
                                    mitigation.description || '',
                                    mitigation.controlType === 'OTRO (PERSONALIZADO)' ? mitigation.customControlName : mitigation.controlType || '',
                                    mitigation.responsible || '',
                                    config.dependenceId,
                                    'ACTIVO'
                                ]
                            })
                        });
                    }
                }
            }

            alert(`Configuración de riesgo ${isEditing ? 'actualizada' : 'creada'} exitosamente`);
            await loadRisks(auth.dependenceId, auth.isSuper);
            setActiveTab("list");
            setIsEditing(false);
            resetForm();
        } catch (err) {
            console.error("Error saving", err);
            alert("Error al guardar el riesgo.");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        const types = activeRiskTypes.current;
        const catalog = activeCatalog.current;

        setConfig({
            id: "",
            dependenceId: auth.dependenceId,
            catalogRisk: catalog[types[0]] ? catalog[types[0]][0] : "PERSONALIZADO",
            customRiskName: "",
            riskType: types[0],
            description: "",
            comment: "",
            probability: 3,
            impact: 10,
            justification: "",
            mitigations: [{
                id: "1",
                controlType: CONTROL_TYPES[0].name,
                nature: CONTROL_TYPES[0].nature,
                customControlName: "",
                description: "",
                efficacy: CONTROL_TYPES[0].efficacy,
                responsible: "",
                evaluation: "SÍ SE ESTÁN APLICANDO Y SON ADECUADOS"
            }],
            context: [],
            associatedImpacts: [],
            treatment: TREATMENT_OPTIONS[1],
            residualProbability: 2,
            residualImpact: 10,
            requiresImprovement: false,
            manualResidual: false
        });
        setIsEditing(false);
        setStep(1);
    };

    const inherentRisk = config.impact * config.probability;
    const residualRisk = config.residualImpact * config.residualProbability;

    const getRiskZone = (score: number) => {
        if (isNaN(score) || score === null || score === undefined) return { label: "N/A", color: "text-gray-400", bg: "bg-gray-400/10", zone: "Gris" };
        if (score <= 5) return { label: "Zona Aceptable", color: "text-green-500", bg: "bg-green-500/10", zone: "Verde" };
        if (score <= 10) return { label: "Zona Tolerable", color: "text-yellow-500", bg: "bg-yellow-500/10", zone: "Amarillo" };
        if (score <= 15) return { label: "Zona Moderada", color: "text-orange-400", bg: "bg-orange-400/10", zone: "Naranja Claro" };
        if (score <= 25) return { label: "Zona Importante", color: "text-orange-600", bg: "bg-orange-600/10", zone: "Naranja" };
        return { label: "Zona Inaceptable", color: "text-red-500", bg: "bg-red-500/10", zone: "Rojo" };
    };

    const isInacceptable = getRiskZone(inherentRisk).zone === "Rojo";
    const canSave = !isInacceptable || config.mitigations.length >= 2;

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
                                        {filteredRisks.map((risk) => {
                                            const inherentScore = (risk.impact && risk.probability) ? (Number(risk.impact) * Number(risk.probability)) : NaN;
                                            const residualScore = (risk.residual_impact && risk.residual_probability) ? (Number(risk.residual_impact) * Number(risk.residual_probability)) : NaN;
                                            const inherentScoreStr = isNaN(inherentScore) ? "N/A" : inherentScore.toString();
                                            const residualScoreStr = isNaN(residualScore) ? "N/A" : residualScore.toString();
                                            const inherentZone = getRiskZone(inherentScore);
                                            const residualZone = getRiskZone(residualScore);

                                            return (
                                                <tr key={risk.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                                                    <td className="px-8 py-6">
                                                        <div className="font-bold text-gray-900 dark:text-white">{risk.name || risk.risk_name}</div>
                                                        <div className="text-[10px] text-gray-400 mt-1 uppercase">{risk.status}</div>
                                                    </td>
                                                    <td className="px-8 py-6 text-sm text-gray-500 dark:text-gray-400">
                                                        {risk.dependence_name || "General"}
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase", inherentZone.bg, inherentZone.color)}>
                                                            {inherentScoreStr}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase", residualZone.bg, residualZone.color)}>
                                                            {residualScoreStr}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleViewRisk(risk)}
                                                            title="Ver Detalle Completo"
                                                            className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-500 rounded-xl transition-all active:scale-90"
                                                        >
                                                            <Eye className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditRisk(risk)}
                                                            title="Editar Riesgo"
                                                            className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-500 rounded-xl transition-all active:scale-90"
                                                        >
                                                            <Edit3 className="w-5 h-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
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
                                        <span className="font-bold text-blue-500">Modo Edición:</span>
                                        <span className="text-gray-500 ml-2">Editando registros existentes.</span>
                                    </div>
                                </div>
                                <button onClick={resetForm} className="text-xs font-bold text-red-500 hover:underline">Cancelar y Volver</button>
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-10 max-w-4xl mx-auto">
                            {[
                                { n: 1, label: "Identificación", icon: FileText },
                                { n: 2, label: "Inherente", icon: Calculator },
                                { n: 3, label: "Controles", icon: ShieldCheck },
                                { n: 4, label: "Residual", icon: Zap }
                            ].map((s) => (
                                <div key={s.n} className="flex flex-col items-center gap-3 relative z-10">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                                        step >= s.n ? "bg-blue-600 text-white shadow-xl shadow-blue-600/30 scale-110" : "bg-gray-200 dark:bg-gray-800 text-gray-400"
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
                                <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            <div className="lg:col-span-8 space-y-8">
                                {step === 1 && (
                                    <div className="bg-white dark:bg-gray-800 rounded-[40px] p-10 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-10 animate-in fade-in slide-in-from-left-8 duration-500">
                                        <div className="space-y-2">
                                            <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Paso 1: Identificación del Riesgo</h3>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm italic">Caracterización institucional para SARLAFT/PTEE.</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo de Riesgo (SARLAFT)</label>
                                                <select
                                                    value={config.riskType}
                                                    onChange={(e) => setConfig({ ...config, riskType: e.target.value })}
                                                    className="w-full px-6 py-5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-[24px] focus:ring-4 focus:ring-blue-500/20 outline-none transition-all appearance-none shadow-sm dark:text-white"
                                                >
                                                    {activeRiskTypes.current.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                    <BookOpen className="w-3 h-3" /> Riesgo a Catalogar
                                                </label>
                                                <select
                                                    value={config.catalogRisk}
                                                    onChange={(e) => setConfig({ ...config, catalogRisk: e.target.value })}
                                                    className="w-full px-6 py-5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-[24px] focus:ring-4 focus:ring-blue-500/20 outline-none transition-all appearance-none shadow-sm dark:text-white"
                                                >
                                                    {(activeCatalog.current[config.riskType] || []).map(r => <option key={r} value={r}>{r}</option>)}
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
                                                        onChange={(e) => setConfig({ ...config, customRiskName: e.target.value })}
                                                        placeholder="Especifique el nombre del riesgo..."
                                                        className="w-full px-6 py-5 bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-[24px] focus:ring-4 focus:ring-blue-500/20 outline-none transition-all dark:text-white"
                                                    />
                                                </div>
                                            )}

                                            <div className="space-y-4 col-span-full pt-4 border-t border-gray-100 dark:border-gray-700">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Dependencia / Área Responsable</label>
                                                <select
                                                    disabled={!auth.isSuper}
                                                    value={config.dependenceId}
                                                    onChange={(e) => setConfig({ ...config, dependenceId: e.target.value })}
                                                    className="w-full px-6 py-5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-[24px] focus:ring-4 focus:ring-blue-500/20 outline-none appearance-none transition-all dark:text-white"
                                                >
                                                    <option value="">Seleccione una dependencia...</option>
                                                    {dependencies.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                </select>
                                            </div>

                                            <div className="space-y-4 col-span-full">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción Detallada</label>
                                                <textarea
                                                    value={config.description}
                                                    onChange={(e) => setConfig({ ...config, description: e.target.value })}
                                                    placeholder="Escriba la descripción del riesgo..."
                                                    className="w-full px-6 py-5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-[24px] focus:ring-4 focus:ring-blue-500/20 outline-none transition-all h-24 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="bg-white dark:bg-gray-800 rounded-[40px] p-10 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-12 animate-in fade-in slide-in-from-right-8 duration-500">
                                        <div className="text-center space-y-4">
                                            <div className="w-20 h-20 bg-blue-500/10 text-blue-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                                                <Calculator className="w-10 h-10" />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Paso 2: Riesgo Inherente</h3>
                                                <p className="text-gray-500 dark:text-gray-400 text-sm">Evaluación del impacto y probabilidad base.</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                            <div className="space-y-8">
                                                <div className="space-y-6">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Probabilidad (Escala 1-4)</label>
                                                        <span className="text-2xl font-black text-blue-500">{config.probability}</span>
                                                    </div>
                                                    <input
                                                        type="range" min="1" max="4"
                                                        value={config.probability}
                                                        onChange={(e) => setConfig({ ...config, probability: parseInt(e.target.value) })}
                                                        className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-600 shadow-sm"
                                                    />
                                                </div>

                                                <div className="space-y-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Impacto (Escala 5-20)</label>
                                                        <span className="text-2xl font-black text-amber-500">{config.impact}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {[5, 10, 20].map(val => (
                                                            <button
                                                                key={val}
                                                                onClick={() => setConfig({ ...config, impact: val })}
                                                                className={cn(
                                                                    "flex-1 py-3 rounded-xl text-xs font-black transition-all border",
                                                                    config.impact === val ? "bg-amber-500 text-white border-amber-500 shadow-lg" : "bg-white dark:bg-gray-800 text-gray-400 border-gray-100 dark:border-gray-700 dark:text-white"
                                                                )}
                                                            >
                                                                {val === 5 ? 'Leve' : val === 10 ? 'Mod' : 'Cat'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col justify-center items-center p-12 bg-gray-50 dark:bg-gray-900/50 rounded-[40px] border border-gray-100 dark:border-gray-700 space-y-6 relative overflow-hidden">
                                                <div className={cn("absolute inset-0 opacity-10 transition-colors duration-500", getRiskZone(inherentRisk).bg)} />
                                                <div className="text-center relative z-10">
                                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Puntaje Inherente</div>
                                                    <div className={cn("text-7xl font-black transition-colors duration-500", getRiskZone(inherentRisk).color)}>
                                                        {inherentRisk}
                                                    </div>
                                                </div>
                                                <div className={cn("px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest shadow-lg transition-all duration-500 relative z-10", getRiskZone(inherentRisk).bg, getRiskZone(inherentRisk).color)}>
                                                    {getRiskZone(inherentRisk).label}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="bg-white dark:bg-gray-800 rounded-[40px] p-10 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                                        <div className="flex justify-between items-center">
                                            <div className="space-y-2">
                                                <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Paso 3: Sistema de Control</h3>
                                                <p className="text-gray-500 dark:text-gray-400 text-sm italic">Mitigación técnica y evaluación de eficacia.</p>
                                            </div>
                                            <button
                                                onClick={handleAddMitigation}
                                                className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                                            >
                                                <Plus className="w-6 h-6" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 gap-8 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                            {config.mitigations.map((mitigation, idx) => (
                                                <div
                                                    key={mitigation.id}
                                                    className="p-8 bg-gray-50 dark:bg-gray-900/50 rounded-[32px] border border-gray-100 dark:border-gray-700 space-y-8 group relative"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center font-black text-sm">
                                                                {idx + 1}
                                                            </div>
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Identificación del Control</span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveMitigation(mitigation.id)}
                                                            className="p-2 text-red-400 hover:text-red-500 transition-all"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                        <div className="space-y-4">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo de Control</label>
                                                            <select
                                                                value={mitigation.controlType}
                                                                onChange={(e) => handleMitigationChange(mitigation.id, "controlType", e.target.value)}
                                                                className="w-full px-5 py-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm outline-none transition-all dark:text-white"
                                                            >
                                                                {CONTROL_TYPES.map(ct => <option key={ct.name} value={ct.name}>{ct.name}</option>)}
                                                            </select>
                                                        </div>
                                                        {mitigation.controlType === "OTRO (PERSONALIZADO)" && (
                                                            <div className="space-y-4 md:col-span-1 animate-in slide-in-from-top-2 duration-300">
                                                                <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                                    <PlusCircle className="w-3 h-3" /> Nombre del Control Personalizado
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={mitigation.customControlName}
                                                                    onChange={(e) => handleMitigationChange(mitigation.id, "customControlName", e.target.value)}
                                                                    placeholder="Nombre del control..."
                                                                    className="w-full px-5 py-4 bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-2xl focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-sm dark:text-white"
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="space-y-4">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Área Responsable</label>
                                                            <input
                                                                type="text"
                                                                value={mitigation.responsible}
                                                                onChange={(e) => handleMitigationChange(mitigation.id, "responsible", e.target.value)}
                                                                placeholder="Responsable..."
                                                                className="w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 text-sm outline-none transition-all dark:text-white"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {step === 4 && (
                                    <div className="bg-white dark:bg-gray-800 rounded-[40px] p-10 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-10 animate-in zoom-in-95 duration-500">
                                        <div className="text-center space-y-4">
                                            <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                                                <Zap className="w-10 h-10" />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Paso 4: Riesgo Residual</h3>
                                                <p className="text-gray-500 dark:text-gray-400 text-sm">Validación del impacto residual final.</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-center justify-center p-12 bg-gray-900 rounded-[40px] shadow-2xl relative overflow-hidden">
                                            <div className={cn("absolute inset-0 opacity-20 transition-colors duration-500", getRiskZone(residualRisk).bg)} />
                                            <div className="text-center relative z-10">
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Resultado Residual Final</div>
                                                <div className={cn("text-8xl font-black transition-colors duration-500", getRiskZone(residualRisk).color)}>
                                                    {residualRisk}
                                                </div>
                                            </div>
                                            <div className={cn("mt-6 px-10 py-3 rounded-full text-xs font-black uppercase tracking-widest shadow-xl transition-all duration-500 relative z-10", getRiskZone(residualRisk).bg, getRiskZone(residualRisk).color)}>
                                                {getRiskZone(residualRisk).label}
                                            </div>
                                        </div>

                                        <div className="p-8 bg-gray-50 dark:bg-gray-900/50 rounded-[32px] border border-gray-100 dark:border-gray-700 space-y-6">
                                            <h4 className="font-bold uppercase tracking-widest text-xs">MÓDULO 10 — Justificación</h4>
                                            <textarea
                                                value={config.justification}
                                                onChange={(e) => setConfig({ ...config, justification: e.target.value })}
                                                className="w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-32 transition-all"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-4">
                                    <button
                                        disabled={step === 1}
                                        onClick={() => setStep(prev => prev - 1)}
                                        className="flex items-center gap-2 px-8 py-4 text-gray-500 font-bold hover:text-gray-700 disabled:opacity-0 transition-all"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                        Anterior
                                    </button>

                                    {step < 4 ? (
                                        <button
                                            onClick={() => setStep(prev => prev + 1)}
                                            className="flex items-center gap-2 px-10 py-5 bg-blue-600 text-white rounded-[24px] font-black shadow-xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all"
                                        >
                                            Siguiente Paso
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleSave}
                                            className="px-10 py-5 bg-blue-600 text-white rounded-[24px] font-black flex items-center gap-3 transition-all hover:bg-blue-700 active:scale-95 shadow-xl shadow-blue-600/30"
                                        >
                                            {isEditing ? 'Actualizar Riesgo' : 'Finalizar y Guardar'}
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
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Escenario de Riesgo Residual</h4>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="manualResidual"
                                                    checked={config.manualResidual}
                                                    onChange={(e) => setConfig(prev => ({ ...prev, manualResidual: e.target.checked }))}
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <label htmlFor="manualResidual" className="text-[10px] font-bold text-gray-500 uppercase">Ajuste Manual</label>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Probabilidad Residual</label>
                                                <select
                                                    value={config.residualProbability}
                                                    disabled={!config.manualResidual}
                                                    onChange={(e) => setConfig(prev => ({ ...prev, residualProbability: parseInt(e.target.value) }))}
                                                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
                                                >
                                                    {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Impacto Residual</label>
                                                <select
                                                    value={config.residualImpact}
                                                    disabled={!config.manualResidual}
                                                    onChange={(e) => setConfig(prev => ({ ...prev, residualImpact: parseInt(e.target.value) }))}
                                                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
                                                >
                                                    {[1, 5, 10, 15, 20].map(v => <option key={v} value={v}>{v}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
                                            <div className="flex justify-between items-end mb-2">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Riesgo Residual</span>
                                                <span className={cn("text-lg font-black", getRiskZone(residualRisk).color)}>{residualRisk}</span>
                                            </div>
                                            <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full transition-all duration-1000", getRiskZone(residualRisk).color.replace('text-', 'bg-'))}
                                                    style={{ width: `${(residualRisk / 80) * 100}%` }}
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

            {/* MODAL DE VISTA DETALLADA */}
            {isViewing && viewingRisk && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsViewing(false)}></div>
                    <div className="relative w-full max-w-5xl bg-white dark:bg-gray-800 rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100 dark:border-gray-700">
                        {/* Header Modal */}
                        <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start bg-gray-50/50 dark:bg-gray-900/50">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                        <ShieldCheck className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                                        {viewingRisk.name || viewingRisk.risk_name}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                        {viewingRisk.dependence_name || "Dependencia General"}
                                    </span>
                                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest", viewingRisk.status === 'ACTIVO' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-200 text-gray-500')}>
                                        Estado: {viewingRisk.status || "N/A"}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsViewing(false)}
                                className="p-2 bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-sm"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Contenido Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-white dark:bg-gray-800 space-y-8">
                            
                            {/* Sección 1: Identificación y Descripción */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-indigo-400" />
                                        Identificación del Riesgo
                                    </h3>
                                    <div className="p-5 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
                                        <div>
                                            <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Tipo de Riesgo (SARLAFT)</div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-white">{viewingRisk.type || "General"}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Riesgo a Catalogar</div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-white">{viewingRisk.name || viewingRisk.risk_name || "Personalizado"}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-indigo-400" />
                                        Descripción / Justificación
                                    </h3>
                                    <div className="p-5 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
                                        <div>
                                            <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Descripción del Escenario</div>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                                {viewingRisk.description || "No se proporcionó descripción."}
                                            </p>
                                        </div>
                                        {viewingRisk.comments && (
                                            <div>
                                                <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Justificación (Ajuste Residual)</div>
                                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                                    {viewingRisk.comments}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Sección 2: Matrices de Riesgo (Inherente vs Residual) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Inherente */}
                                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-700 space-y-4 relative overflow-hidden">
                                    {(() => {
                                        const score = (Number(viewingRisk.impact) * Number(viewingRisk.probability));
                                        const zone = getRiskZone(score);
                                        return (
                                            <>
                                                <div className={cn("absolute inset-0 opacity-10", zone.bg)}></div>
                                                <div className="relative z-10 flex justify-between items-start">
                                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                        <Calculator className="w-4 h-4 text-gray-500" /> Riesgo Inherente
                                                    </h4>
                                                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", zone.bg, zone.color)}>
                                                        {zone.label}
                                                    </span>
                                                </div>
                                                <div className="relative z-10 grid grid-cols-2 gap-4 mt-4">
                                                    <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                                        <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Probabilidad</div>
                                                        <div className="text-2xl font-black text-gray-900 dark:text-white">{viewingRisk.probability || "-"}</div>
                                                    </div>
                                                    <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                                        <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Impacto</div>
                                                        <div className="text-2xl font-black text-gray-900 dark:text-white">{viewingRisk.impact || "-"}</div>
                                                    </div>
                                                </div>
                                                <div className="relative z-10 flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                    <div className="text-xs font-bold text-gray-500 uppercase">Puntaje Total</div>
                                                    <div className={cn("text-3xl font-black", zone.color)}>{isNaN(score) ? "N/A" : score}</div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>

                                {/* Residual */}
                                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-700 space-y-4 relative overflow-hidden">
                                    {(() => {
                                        const score = (Number(viewingRisk.residual_impact) * Number(viewingRisk.residual_probability));
                                        const zone = getRiskZone(score);
                                        return (
                                            <>
                                                <div className={cn("absolute inset-0 opacity-10", zone.bg)}></div>
                                                <div className="relative z-10 flex justify-between items-start">
                                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                        <Zap className="w-4 h-4 text-gray-500" /> Riesgo Residual
                                                    </h4>
                                                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", zone.bg, zone.color)}>
                                                        {zone.label}
                                                    </span>
                                                </div>
                                                <div className="relative z-10 grid grid-cols-2 gap-4 mt-4">
                                                    <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                                        <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Probabilidad</div>
                                                        <div className="text-2xl font-black text-gray-900 dark:text-white">{viewingRisk.residual_probability || "-"}</div>
                                                    </div>
                                                    <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                                        <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Impacto</div>
                                                        <div className="text-2xl font-black text-gray-900 dark:text-white">{viewingRisk.residual_impact || "-"}</div>
                                                    </div>
                                                </div>
                                                <div className="relative z-10 flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                    <div className="text-xs font-bold text-gray-500 uppercase">Puntaje Total</div>
                                                    <div className={cn("text-3xl font-black", zone.color)}>{isNaN(score) ? "N/A" : score}</div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Sección 3: Controles / Mitigaciones */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-indigo-400" />
                                        Controles y Mitigaciones Implementados
                                    </span>
                                    <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg text-[10px]">
                                        Total: {viewingActions.length}
                                    </span>
                                </h3>
                                
                                {viewingActions.length === 0 ? (
                                    <div className="p-8 text-center bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                                        <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500 font-bold">No hay controles registrados para este riesgo.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {viewingActions.map((action, idx) => (
                                            <div key={action.id || idx} className="p-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:border-indigo-200 transition-colors">
                                                <div className="space-y-2 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black">
                                                            {idx + 1}
                                                        </span>
                                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                                                            {action.type || "Control sin nombre"}
                                                        </h4>
                                                    </div>
                                                    {action.description && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 pl-8">
                                                            {action.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-2 pl-8 md:pl-0 min-w-[200px]">
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <User className="w-3 h-3" />
                                                        <span className="font-bold">{action.person || "Sin responsable"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <Activity className="w-3 h-3 text-gray-400" />
                                                        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase", action.status === 'ACTIVO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
                                                            Estado: {action.status || "N/A"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
