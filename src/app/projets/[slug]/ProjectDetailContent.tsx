'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { projectsData } from '@/data/projects-case-studies';
import {
    ArrowLeft, CheckCircle2, Building2, TrendingUp,
    Shield, Target, Zap, ChevronRight, BarChart3,
    FileText, Users
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ProjectDetail() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const project = projectsData.find(p => p.slug === slug);
    const [scrolled, setScrolled] = React.useState(false);

    React.useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (!project) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-white">
                <h1 className="text-4xl font-black mb-4">Projet Introuvable</h1>
                <Link href="/" className="text-[#FFB800] uppercase font-black text-xs tracking-widest flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
                </Link>
            </div>
        );
    }

    const iconMap: Record<string, any> = {
        'Dashboard de Chantier': Target,
        'Gestion des Dépenses': BarChart3,
        'Suivi des Fournisseurs': Users,
        'Comparateur de Prix': Zap,
        'Gestion des Commandes': FileText,
        'Analytics Marché': TrendingUp,
        'Chronologie Chantier': Target,
        'Acomptes Fournisseurs': BarChart3,
        'Gestion Documentaire': FileText,
        'Coffre-fort Numérique': Shield,
        'Suivi de Livraison': Zap,
        'Tableau de Bord Admin': Shield
    };

    return (
        <div className="bg-[#0A0A0A] min-h-screen text-white font-jakarta selection:bg-[#FFB800] selection:text-black">
            {/* Header / Nav */}
            <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 px-6 md:px-12 ${scrolled ? 'py-4' : 'py-8'}`}>
                <div className={`max-w-[1200px] mx-auto flex items-center justify-between transition-all duration-700 rounded-full px-8 py-3 ${scrolled ? 'bg-slate-900/80 backdrop-blur-2xl border border-white/10 shadow-2xl' : 'bg-transparent border-transparent'}`}>
                    <Link href="/" className="flex items-center gap-2 group">
                        <ArrowLeft className="text-[#FFB800] w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white transition-colors">Retour</span>
                    </Link>
                    <div className="hidden md:flex items-center gap-2">
                        <Building2 className="text-[#FFB800] w-4 h-4" />
                        <span className="font-bold text-[10px] tracking-tight uppercase text-white">
                            House<span className="text-[#FFB800]">Expert</span> <span className="text-white/40 mx-2">/</span> Case Study
                        </span>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative h-[70vh] flex items-end pb-24 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <Image
                        src={project.image}
                        alt={project.title}
                        fill
                        className="object-cover opacity-40"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/20 to-transparent" />
                </div>

                <div className="max-w-[1200px] mx-auto px-8 w-full relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="space-y-6"
                    >
                        <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10">
                            <span className="w-1.5 h-1.5 bg-[#FFB800] rounded-full" />
                            <span className="text-[#FFB800] text-[8px] font-black uppercase tracking-[0.4em]">{project.category}</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
                            {project.title}
                        </h1>
                        <p className="text-xl text-white/60 max-w-2xl font-medium tracking-tight">
                            {project.description}
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Stats Grid */}
            <section className="border-y border-white/5 bg-white/[0.02]">
                <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-3 divide-x divide-white/5">
                    {project.stats.map((stat: { label: string, value: string }, i: number) => (
                        <div key={i} className="p-12 text-center space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">{stat.label}</p>
                            <p className="text-3xl font-black text-[#FFB800]">{stat.value}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Content Body */}
            <section className="py-32">
                <div className="max-w-[1200px] mx-auto px-8 grid lg:grid-cols-2 gap-24">
                    {/* Left: Narrative */}
                    <div className="space-y-20">
                        <div className="space-y-8">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#FFB800]">Le Challenge</h2>
                            <p className="text-2xl font-bold leading-relaxed text-white/80">
                                {project.challenge}
                            </p>
                        </div>

                        <div className="space-y-8">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#FFB800]">L'Impact HouseExpert</h2>
                            <p className="text-2xl font-bold leading-relaxed text-white/80">
                                {project.solution}
                            </p>
                        </div>

                        <div className="space-y-8">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#FFB800]">Résultats Clés</h2>
                            <div className="grid gap-4">
                                {project.results.map((result: string, i: number) => (
                                    <div key={i} className="flex gap-4 p-6 bg-white/5 rounded-2xl border border-white/10 items-start">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                        <p className="font-bold text-white/70">{result}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Features & CTA */}
                    <div className="space-y-12">
                        <div className="bg-white/[0.03] border border-white/10 rounded-[3rem] p-12 sticky top-32">
                            <h3 className="text-xl font-black uppercase tracking-tighter mb-8">Features Clés <span className="text-[#FFB800]">Utilisées</span></h3>
                            <div className="space-y-6 mb-12">
                                {project.featuresUsed.map((feat: string, i: number) => {
                                    const Icon = iconMap[feat] || Target;
                                    return (
                                        <div key={i} className="flex items-center gap-6 group">
                                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-[#FFB800] group-hover:bg-[#FFB800] group-hover:text-black transition-all">
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <span className="font-black uppercase text-xs tracking-widest text-white/60 group-hover:text-white transition-colors">
                                                {feat}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="space-y-6 pt-12 border-t border-white/10">
                                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                                    Prêt à optimiser votre propre projet avec la même rigueur ?
                                </p>
                                <Link
                                    href="/login"
                                    className="w-full bg-[#FFB800] text-black font-black py-6 rounded-2xl hover:bg-white transition-all flex items-center justify-center gap-3 group text-[11px] uppercase tracking-[0.2em]"
                                >
                                    Commencer mon projet
                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer Copy */}
            <footer className="py-24 border-t border-white/5 text-center">
                <div className="max-w-[800px] mx-auto px-8 space-y-8">
                    <Building2 className="text-[#FFB800] w-10 h-10 mx-auto" />
                    <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.5em]">
                        © 2026 HOUSEEXPERT STUDIO. ANALYZING {project.title.toUpperCase()}.
                    </p>
                </div>
            </footer>
        </div>
    );
}
