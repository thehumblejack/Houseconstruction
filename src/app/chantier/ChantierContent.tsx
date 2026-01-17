'use client';

import { useState } from 'react';
import Image from 'next/image';
import { constructionSteps, type ConstructionStep } from '@/data/construction-steps';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
    CheckCircle2,
    Clock,
    ChevronDown,
    ChevronUp,
    TrendingUp,
    Lock
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function ChantierContent() {
    const { user, isApproved, loading } = useAuth();
    const [steps, setSteps] = useState<ConstructionStep[]>(constructionSteps);
    const [activeStepId, setActiveStepId] = useState<string>('1');
    const [hoveredDetailIndex, setHoveredDetailIndex] = useState<number | null>(null);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    if (!user || !isApproved) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 max-w-md w-full text-center space-y-6">
                    <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                        <Lock className="h-8 w-8 text-amber-600" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-black text-slate-900 uppercase">Accès Restreint</h1>
                        <p className="text-slate-500 font-medium">
                            Vous devez être connecté et votre compte doit être approuvé pour accéder au suivi de chantier.
                        </p>
                    </div>
                    <Link href="/login" className="block w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all">
                        Se connecter
                    </Link>
                </div>
            </div>
        );
    }

    const activeStep = steps.find((s: ConstructionStep) => s.id === activeStepId) || steps[0];

    const toggleStepCompletion = (id: string) => {
        setSteps(steps.map((step: ConstructionStep) =>
            step.id === id
                ? { ...step, completed: !step.completed, timestamp: !step.completed ? new Date().toISOString() : undefined }
                : step
        ));
    };

    const getCategoryColor = (category: string) => {
        const colors = {
            foundation: 'bg-amber-100 text-amber-800 border-amber-200',
            structure: 'bg-blue-100 text-blue-800 border-blue-200',
            masonry: 'bg-green-100 text-green-800 border-green-200',
            finishing: 'bg-purple-100 text-purple-800 border-purple-200'
        };
        return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-jakarta pb-20 md:pb-0">
            {/* Top Navigation Bar - Compact Labels */}
            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
                <div className="max-w-[1600px] mx-auto overflow-x-auto no-scrollbar scroll-smooth p-3 md:p-4">
                    <div className="flex items-center gap-2 md:gap-3 min-w-max px-2">
                        {steps.map((step: ConstructionStep) => (
                            <button
                                key={step.id}
                                onClick={() => {
                                    setActiveStepId(step.id);
                                    setHoveredDetailIndex(null);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={`
                                    flex items-center gap-2.5 px-4 py-2 rounded-xl transition-all border text-left
                                    ${activeStepId === step.id
                                        ? 'bg-slate-900 border-slate-900 text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] scale-105'
                                        : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50 active:scale-95'
                                    }
                                `}
                            >
                                <span className={`text-[9px] md:text-[10px] font-black px-1.5 py-0.5 rounded-lg ${activeStepId === step.id ? 'bg-[#FFB800] text-black' : 'bg-slate-100 text-slate-400'}`}>
                                    {step.order < 10 ? `0${step.order}` : step.order}
                                </span>
                                <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest whitespace-nowrap">
                                    {step.title.split(' ')[0]}
                                </span>
                                {step.completed && <CheckCircle2 className="w-3 h-3 text-[#FFB800]" />}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <main className="flex-1 max-w-[1600px] mx-auto w-full p-4 md:p-8 lg:p-12">
                <div className="grid lg:grid-cols-12 gap-8 lg:gap-16 items-start">

                    {/* Left Column: Text Content */}
                    <div className="space-y-6 md:space-y-8 lg:col-span-5 lg:sticky lg:top-[140px]">
                        {/* Header Info - Tighter */}
                        <div className="space-y-3 md:space-y-5">
                            <div className="flex items-center gap-3">
                                <Badge className={`px-2.5 py-1 text-[9px] font-black rounded-full shadow-sm uppercase tracking-wider ${getCategoryColor(activeStep.category)}`}>
                                    {activeStep.category}
                                </Badge>
                                <div className="h-1 w-1 rounded-full bg-slate-300" />
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                    <Clock className="w-3.5 h-3.5" />
                                    {activeStep.duration}
                                </div>
                            </div>

                            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter leading-[1.1] uppercase italic">
                                {activeStep.title}
                            </h1>

                            <p className="text-xs md:text-sm text-slate-500 leading-relaxed font-medium max-w-xl">
                                {activeStep.description}
                            </p>
                        </div>

                        {/* Progress Control - More Compact */}
                        <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                            <Checkbox
                                id="step-complete"
                                checked={activeStep.completed}
                                onCheckedChange={() => toggleStepCompletion(activeStep.id)}
                                className="w-5 h-5 rounded-md border-2 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                            />
                            <div className="flex flex-col">
                                <label htmlFor="step-complete" className="text-[11px] font-black text-slate-900 cursor-pointer uppercase tracking-tight">
                                    Marquer comme Terminé
                                </label>
                                <p className="text-[10px] text-slate-400 font-bold uppercase italic">
                                    {activeStep.completed ? 'Validé sur chantier' : 'Action requise'}
                                </p>
                            </div>
                        </div>

                        {/* Interactive Details List - Denser */}
                        <div className="space-y-3">
                            <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <TrendingUp className="h-3 w-3" /> Étapes de déploiement
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                                {activeStep.details?.map((detail: any, idx: number) => (
                                    <div
                                        key={idx}
                                        onMouseEnter={() => setHoveredDetailIndex(idx)}
                                        onClick={() => setHoveredDetailIndex(idx)}
                                        className={`
                                            group p-3 rounded-xl transition-all duration-200 cursor-pointer border
                                            ${hoveredDetailIndex === idx
                                                ? 'bg-slate-900 border-slate-900 shadow-lg scale-[1.02]'
                                                : 'bg-white border-slate-200 hover:bg-slate-50'
                                            }
                                        `}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`
                                                w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-black text-[10px] transition-colors
                                                ${hoveredDetailIndex === idx ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}
                                            `}>
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className={`text-xs font-black leading-tight mb-0.5 transition-colors uppercase tracking-tight ${hoveredDetailIndex === idx ? 'text-white' : 'text-slate-900'}`}>
                                                    {detail.title}
                                                </h4>
                                                <p className={`text-[10px] leading-relaxed transition-colors font-medium ${hoveredDetailIndex === idx ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {detail.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Navigation Buttons - Tighter */}
                        <div className="flex items-center gap-2 pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const prevId = String(Number(activeStepId) - 1);
                                    const prevStep = steps.find((s: ConstructionStep) => s.order === (activeStep.order - 1));
                                    if (prevStep) {
                                        setActiveStepId(prevStep.id);
                                        setHoveredDetailIndex(null);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }
                                }}
                                disabled={activeStep.order === 1}
                                className="flex-1 bg-white hover:bg-slate-50 text-[10px] font-black uppercase h-9"
                            >
                                <ChevronUp className="w-3 h-3 mr-1" /> Précédent
                            </Button>

                            <Button
                                size="sm"
                                onClick={() => {
                                    const nextId = String(Number(activeStepId) + 1);
                                    const nextStep = steps.find((s: ConstructionStep) => s.order === (activeStep.order + 1));
                                    if (nextStep) {
                                        setActiveStepId(nextStep.id);
                                        setHoveredDetailIndex(null);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }
                                }}
                                disabled={activeStep.order === steps.length}
                                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase h-9"
                            >
                                Suivant <ChevronDown className="w-3 h-3 ml-1" />
                            </Button>
                        </div>
                    </div>

                    {/* Right Column: Dynamic Image Context */}
                    <div className="lg:col-span-7 bg-white rounded-2xl md:rounded-3xl p-2 md:p-4 border border-slate-200 shadow-sm min-h-[400px] md:h-[calc(100vh-160px)] sticky top-[140px] flex flex-col">
                        <div className="relative flex-1 bg-slate-100 rounded-xl md:rounded-2xl overflow-hidden group">
                            {/* Current Detail/Main Image */}
                            <div className="absolute inset-0 transition-opacity duration-300">
                                {hoveredDetailIndex !== null && activeStep.details?.[hoveredDetailIndex]?.image ? (
                                    <Image
                                        src={activeStep.details[hoveredDetailIndex].image}
                                        alt={activeStep.details[hoveredDetailIndex].title}
                                        fill
                                        className="object-contain p-4 md:p-8"
                                        priority
                                    />
                                ) : activeStep.image ? (
                                    <Image
                                        src={activeStep.image}
                                        alt={activeStep.title}
                                        fill
                                        className="object-contain p-4 md:p-8"
                                        priority
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                                        <CheckCircle2 className="h-20 w-20 opacity-10" />
                                    </div>
                                )}
                            </div>

                            {/* Label Overlay */}
                            <div className="absolute bottom-4 left-4 right-4 p-4 bg-slate-900/90 backdrop-blur-sm rounded-xl text-center transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                <p className="text-white text-[10px] font-black uppercase tracking-widest">
                                    {(hoveredDetailIndex !== null && activeStep.details?.[hoveredDetailIndex]?.title) || activeStep.title}
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
