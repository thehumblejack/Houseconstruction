'use client';

import { useState } from 'react';
import Image from 'next/image';
import { constructionSteps, type ConstructionStep } from '@/data/construction-steps';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Building2,
    CheckCircle2,
    Circle,
    Clock,
    Filter,
    ChevronDown,
    ChevronUp,
    ImageIcon
} from 'lucide-react';

export default function ConstructionDashboard() {
    const [steps, setSteps] = useState<ConstructionStep[]>(constructionSteps);
    const [activeStepId, setActiveStepId] = useState<string>('1');
    const [hoveredDetailIndex, setHoveredDetailIndex] = useState<number | null>(null);

    // Find the active step object
    const activeStep = steps.find(s => s.id === activeStepId) || steps[0];

    // Determine which image to show: Hovered detail image > Main step image > Fallback
    const currentDisplayImage = hoveredDetailIndex !== null && activeStep.details[hoveredDetailIndex]?.image
        ? activeStep.details[hoveredDetailIndex].image
        : activeStep.image;

    const toggleStepCompletion = (id: string) => {
        setSteps(steps.map(step =>
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
        <div className="min-h-screen bg-white flex flex-col">
            {/* Top Navigation Bar - The "Steppes" on full top */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-2 px-4 py-4 overflow-x-auto no-scrollbar scroll-smooth">
                        {steps.map((step) => (
                            <button
                                key={step.id}
                                onClick={() => {
                                    setActiveStepId(step.id);
                                    setHoveredDetailIndex(null);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={`
                                    flex flex-col items-start justify-center min-w-[140px] max-w-[140px] gap-2 p-3 rounded-xl transition-all duration-300 border text-left
                                    ${activeStepId === step.id
                                        ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-100 z-10'
                                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                    }
                                    ${step.completed ? 'ring-2 ring-green-500 ring-offset-2 border-green-500' : ''}
                                `}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeStepId === step.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                        Step {step.order}
                                    </span>
                                    {step.completed && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                </div>
                                <span className={`text-sm font-semibold leading-tight line-clamp-2 w-full ${activeStepId === step.id ? 'text-white' : 'text-slate-900'}`}>
                                    {step.title}
                                </span>
                                <div className={`h-1 w-full rounded-full mt-1 ${step.completed ? 'bg-green-500' : activeStepId === step.id ? 'bg-white/30' : 'bg-slate-100'}`} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <main className="flex-1 max-w-[1600px] mx-auto w-full p-4 lg:p-8">
                <div className="grid lg:grid-cols-12 gap-6 lg:gap-12 items-start">

                    {/* Left Column: Text Content */}
                    <div className="space-y-8 lg:col-span-5 lg:sticky lg:top-[180px] lg:py-4 lg:h-[calc(100vh-180px)] lg:overflow-y-auto no-scrollbar">
                        {/* Header Info */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Badge className={`px-3 py-1 text-sm font-medium rounded-full ${getCategoryColor(activeStep.category)}`}>
                                    Step {activeStep.order}
                                </Badge>
                                <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">
                                    {activeStep.category} Phase
                                </span>
                                <Badge variant="outline" className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-white border-slate-200 text-slate-600">
                                    <Clock className="w-3.5 h-3.5" />
                                    {activeStep.duration}
                                </Badge>
                            </div>

                            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                                {activeStep.title}
                            </h1>

                            <p className="text-lg text-slate-600 leading-relaxed">
                                {activeStep.description}
                            </p>
                        </div>

                        {/* Progress Control */}
                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <Checkbox
                                id="step-complete"
                                checked={activeStep.completed}
                                onCheckedChange={() => toggleStepCompletion(activeStep.id)}
                                className="w-6 h-6 border-2 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                            />
                            <div className="flex flex-col">
                                <label
                                    htmlFor="step-complete"
                                    className="font-semibold text-slate-900 cursor-pointer select-none"
                                >
                                    Mark as Complete
                                </label>
                                <span className="text-sm text-slate-500">
                                    {activeStep.completed
                                        ? `Completed on ${new Date(activeStep.timestamp || Date.now()).toLocaleDateString()}`
                                        : 'Click when finished'
                                    }
                                </span>
                            </div>
                        </div>

                        {/* Interactive Details List */}
                        <div className="space-y-4 pb-20">
                            <h3 className="font-bold text-xl text-slate-900">Process Details</h3>
                            <div className="space-y-3">
                                {activeStep.details.map((detail, idx) => (
                                    <div
                                        key={idx}
                                        onMouseEnter={() => setHoveredDetailIndex(idx)}
                                        onClick={() => setHoveredDetailIndex(idx)}
                                        className={`
                                            group p-4 rounded-xl transition-all duration-300 cursor-pointer border-l-4
                                            ${hoveredDetailIndex === idx
                                                ? 'bg-slate-900 border-l-blue-500 shadow-md transform translate-x-1'
                                                : 'bg-white border-l-slate-200 hover:border-l-slate-400 hover:bg-slate-50'
                                            }
                                        `}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`
                                                w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm transition-colors
                                                ${hoveredDetailIndex === idx ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}
                                            `}>
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className={`text-base font-bold leading-tight mb-1 transition-colors ${hoveredDetailIndex === idx ? 'text-white' : 'text-slate-900 group-hover:text-blue-700'
                                                    }`}>
                                                    {detail.title}
                                                </h4>
                                                <p className={`text-sm leading-relaxed transition-colors ${hoveredDetailIndex === idx ? 'text-blue-100' : 'text-slate-600'
                                                    }`}>
                                                    {detail.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex items-center justify-between pt-8 pb-20 border-t border-slate-100">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    const prevId = String(Number(activeStepId) - 1);
                                    if (steps.find(s => s.id === prevId)) {
                                        setActiveStepId(prevId);
                                        setHoveredDetailIndex(null);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }
                                }}
                                disabled={activeStep.order === 1}
                                className="gap-2"
                            >
                                <ChevronUp className="w-4 h-4" /> Previous Step
                            </Button>

                            <Button
                                onClick={() => {
                                    const nextId = String(Number(activeStepId) + 1);
                                    if (steps.find(s => s.id === nextId)) {
                                        setActiveStepId(nextId);
                                        setHoveredDetailIndex(null);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }
                                }}
                                disabled={activeStep.order === steps.length}
                                className="bg-slate-900 hover:bg-slate-800 gap-2"
                            >
                                Next Step <ChevronDown className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Right Column: Sticky Image Display */}
                    <div className="hidden lg:block lg:col-span-7 lg:sticky lg:top-[180px] h-[calc(100vh-180px)] rounded-3xl overflow-hidden shadow-2xl bg-black border-4 border-slate-900/5 order-first lg:order-last">
                        <div className="relative w-full h-full flex items-center justify-center group/image">
                            {activeStep.details.map((detail, idx) => (
                                <div
                                    key={idx}
                                    className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${(hoveredDetailIndex === idx) || (hoveredDetailIndex === null && idx === 0)
                                        ? 'opacity-100 z-10'
                                        : activeStep.image && hoveredDetailIndex === null && idx === -1
                                            ? 'opacity-100'
                                            : 'opacity-0 z-0'
                                        }`}
                                >
                                    {detail.image ? (
                                        <Image
                                            src={detail.image}
                                            alt={detail.title}
                                            fill
                                            className="object-contain p-2"
                                            priority={idx === 0}
                                        />
                                    ) : activeStep.image && (
                                        <Image
                                            src={activeStep.image}
                                            alt={activeStep.title}
                                            fill
                                            className="object-contain p-2"
                                        />
                                    )}

                                    {/* Image Overlay Label */}
                                    <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300">
                                        <p className="text-white text-xl font-medium drop-shadow-md text-center">
                                            {detail.title}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {(!activeStep.details[0]?.image && activeStep.image) && (
                                <Image
                                    src={activeStep.image}
                                    alt="Step Overview"
                                    fill
                                    className="object-contain p-2 -z-10"
                                />
                            )}
                        </div>
                    </div>

                    {/* Mobile Image (Visible only on small screens) */}
                    <div className="lg:hidden w-full aspect-square relative rounded-2xl overflow-hidden shadow-lg mb-8 bg-black">
                        <Image
                            src={currentDisplayImage || '/placeholder.png'}
                            alt="Current Step"
                            fill
                            className="object-contain"
                        />
                    </div>

                </div>
            </main>
        </div>
    );
}
