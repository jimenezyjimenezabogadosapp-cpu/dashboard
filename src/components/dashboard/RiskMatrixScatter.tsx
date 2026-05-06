"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface RiskPoint {
    id: string;
    name: string;
    x: number; // Impacto 1-5
    y: number; // Probabilidad 1-5
    details?: string;
}

interface RiskMatrixProps {
    title?: string;
    points: RiskPoint[];
}

const GOLDEN_ANGLE = 2.399963;

const RiskMatrixScatter: React.FC<RiskMatrixProps> = ({ title, points }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeTooltip, setActiveTooltip] = useState<{
        point: RiskPoint;
        x: number;
        y: number;
    } | null>(null);

    // 1. Agrupar puntos por celda usando useMemo
    const groupedPoints = useMemo(() => {
        const groups: Record<string, RiskPoint[]> = {};
        points.forEach((p) => {
            const key = `${Math.round(p.x)}-${Math.round(p.y)}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        });
        return groups;
    }, [points]);

    // 2. Manejo de posición del mouse para el tooltip
    const handleMouseEnter = (e: React.MouseEvent, point: RiskPoint) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setActiveTooltip({
            point,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!activeTooltip || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setActiveTooltip({
            ...activeTooltip,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 shadow-sm border border-gray-100 dark:border-gray-700 relative">
            {title && (
                <div className="flex items-center justify-between mb-12">
                    <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-tighter">
                        {title}
                    </h3>
                </div>
            )}

            <div className="relative ml-40 mr-12 mb-12" ref={containerRef} onMouseMove={handleMouseMove} onMouseLeave={() => setActiveTooltip(null)}>
                {/* Título Eje X */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] z-10">
                    Impacto
                </div>

                {/* Grid 5x5 */}
                <div className="grid grid-cols-5 gap-1 w-full relative" style={{ aspectRatio: '21/9', minHeight: '400px' }}>
                    {[5, 4, 3, 2, 1].map((row) => (
                        <React.Fragment key={`row-${row}`}>
                            {[1, 2, 3, 4, 5].map((col) => {
                                const key = `${col}-${row}`;
                                const cellPoints = groupedPoints[key] || [];
                                
                                return (
                                    <div
                                        key={key}
                                        className={cn(
                                            "relative border border-white/20 dark:border-white/5 transition-colors group/cell",
                                            // Colores según cuadrante
                                            row >= 4 && col >= 4 ? "bg-red-500" :
                                            row >= 4 && col === 3 ? "bg-red-500/80" :
                                            row === 3 && col >= 4 ? "bg-red-500/80" :
                                            row >= 4 && col <= 2 ? "bg-orange-400" :
                                            row <= 2 && col >= 4 ? "bg-orange-400" :
                                            row === 3 && col === 3 ? "bg-yellow-400" :
                                            row <= 2 && col === 3 ? "bg-yellow-400/80" :
                                            row === 3 && col <= 2 ? "bg-yellow-400/80" :
                                            "bg-emerald-500/90"
                                        )}
                                    >
                                        {/* Eje Y Labels (Solo en la primera columna) */}
                                        {col === 1 && (
                                            <div className="absolute -left-38 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-500 uppercase text-right w-36 leading-tight tracking-tighter">
                                                {row === 5 ? "Muy Probable" : row === 4 ? "Probable" : row === 3 ? "Posible" : row === 2 ? "Poco Probable" : "Improbable"}
                                            </div>
                                        )}
                                        {/* Eje X Labels (Solo en la última fila) */}
                                        {row === 1 && (
                                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-black text-gray-500 uppercase whitespace-nowrap tracking-tighter">
                                                {col === 1 ? "Muy Bajo" : col === 2 ? "Bajo" : col === 3 ? "Medio" : col === 4 ? "Alto" : "Muy Alto"}
                                            </div>
                                        )}

                                        {/* Puntos distribuidos en espiral */}
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            {cellPoints.map((p, idx) => {
                                                // 3. Espiral de Fermat con Ángulo Dorado
                                                const radius = 10 * Math.sqrt(idx + 1); // Escala aumentada para mayor ancho
                                                const angle = idx * GOLDEN_ANGLE;
                                                const offsetX = Math.cos(angle) * radius * 2.5; // Multiplicador para ancho
                                                const offsetY = Math.sin(angle) * radius;

                                                // Extraer siglas
                                                const initials = p.name
                                                    .split(' ')
                                                    .map(word => word[0])
                                                    .join('')
                                                    .substring(0, 3)
                                                    .toUpperCase();

                                                return (
                                                    <div
                                                        key={p.id}
                                                        className="absolute pointer-events-auto group/point cursor-help"
                                                        style={{
                                                            transform: `translate(${offsetX}px, ${offsetY}px)`,
                                                            zIndex: 20
                                                        }}
                                                        onMouseEnter={(e) => handleMouseEnter(e, p)}
                                                        onMouseLeave={() => setActiveTooltip(null)}
                                                    >
                                                        <div className="relative flex flex-col items-center">
                                                            <div className="w-6 h-6 bg-white border-2 border-gray-900 rounded-full shadow-xl flex items-center justify-center group-hover/point:scale-125 transition-transform shrink-0">
                                                                <span className="text-[8px] font-black text-gray-900 leading-none">{initials}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>

                {/* 4. Tooltip Global (zIndex 9999) */}
                {activeTooltip && (
                    <div 
                        className="fixed pointer-events-none transition-all duration-75 z-[9999]"
                        style={{
                            left: activeTooltip.x + (containerRef.current?.getBoundingClientRect().left || 0),
                            top: activeTooltip.y + (containerRef.current?.getBoundingClientRect().top || 0),
                            transform: `translate(${activeTooltip.x > (containerRef.current?.clientWidth || 0) * 0.7 ? '-110%' : '10%'}, ${activeTooltip.y < 50 ? '10%' : '-110%'})`
                        }}
                    >
                        <div className="bg-gray-900 text-white p-3 rounded-2xl shadow-2xl border border-white/20 min-w-[180px]">
                            <p className="text-[11px] font-black text-blue-400 uppercase border-b border-white/10 pb-2 mb-2 tracking-wider">
                                {activeTooltip.point.name}
                            </p>
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-gray-400">Impacto:</span>
                                    <span className="font-bold text-amber-400">{activeTooltip.point.x.toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-gray-400">Probabilidad:</span>
                                    <span className="font-bold text-blue-300">{activeTooltip.point.y.toFixed(1)}</span>
                                </div>
                            </div>
                            {activeTooltip.point.details && (
                                <p className="mt-2 text-[9px] text-gray-400 italic leading-tight border-t border-white/5 pt-2">
                                    {activeTooltip.point.details}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Leyenda de Riesgo */}
            <div className="mt-12 flex flex-wrap justify-center gap-6">
                {[
                    { label: "Bajo", color: "bg-emerald-500" },
                    { label: "Medio", color: "bg-yellow-400" },
                    { label: "Alto", color: "bg-orange-400" },
                    { label: "Crítico", color: "bg-red-500" },
                ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", item.color)} />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RiskMatrixScatter;
