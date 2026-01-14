'use client';

import React, { useState, useEffect } from 'react';
import {
    Shield, Hammer, Ruler, Clock, ArrowRight, CheckCircle2,
    Building2, HardHat, ChevronRight, MapPin, Phone, Mail,
    Facebook, Instagram, Linkedin, Twitter, Star, ExternalLink,
    Zap, Gem, Award, Globe
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

export default function LandingPage() {
    const { user, isApproved } = useAuth();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const portfolioItems = [
        { title: 'Villa Azure', category: 'Architecture Moderne', image: 'https://images.unsplash.com/photo-1600596542815-2a4290aa315c?q=80&w=2071&auto=format&fit=crop' },
        { title: 'Le Sommet', category: 'Complexe Résidentiel', image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=2070&auto=format&fit=crop' },
        { title: 'Éclat Urbain', category: 'Design Commercial', image: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?q=80&w=2069&auto=format&fit=crop' },
        { title: 'Havre de Paix', category: 'Maison Individuelle', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop' },
    ];

    const stats = [
        { label: "Années d'Expertise", value: "41+" },
        { label: "Projets Réalisés", value: "500+" },
        { label: "Partenaires Stratégiques", value: "25" },
        { label: "Satisfaction Client", value: "99%" },
    ];

    return (
        <div className="bg-[#fcfcfc] text-slate-900 font-jakarta selection:bg-amber-100 scroll-smooth min-h-screen">

            {/* Navigation - Ultra Minimalist Glassmorphism */}
            <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 px-4 md:px-10 ${scrolled ? 'py-4' : 'py-8'}`}>
                <div className={`max-w-[1400px] mx-auto flex items-center justify-between transition-all duration-700 rounded-[2rem] px-6 md:px-10 ${scrolled ? 'bg-white/70 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] border border-white/20 py-3' : 'bg-transparent py-0'}`}>
                    <div className="flex items-center gap-2 group cursor-pointer">
                        <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center transition-transform group-hover:rotate-12">
                            <Building2 className="text-[#FFB800] w-5 h-5" />
                        </div>
                        <span className="font-bold text-lg tracking-[-0.05em] uppercase">
                            House<span className="text-[#FFB800]">Expert</span>
                        </span>
                    </div>

                    <div className="hidden lg:flex items-center gap-8">
                        {['Accueil', 'Services', 'Projets', 'Contact'].map((item) => (
                            <a key={item} href={`#${item.toLowerCase()}`} className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 hover:text-slate-900 transition-colors">
                                {item}
                            </a>
                        ))}
                    </div>

                    <div className="flex items-center gap-4">
                        <Link
                            href={user ? (isApproved ? '/' : '/auth/pending') : '/login'}
                            className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-[#FFB800] hover:text-slate-900 transition-all active:scale-95 border border-slate-900"
                        >
                            {user ? 'Dashboard' : 'Accès Client'}
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section - Bento Inspired Hybrid */}
            <section id="accueil" className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
                <div className="max-w-[1400px] mx-auto px-6 md:px-10">
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <div className="space-y-10">
                            <div className="inline-flex items-center gap-3 px-4 py-2 bg-amber-50 rounded-full border border-amber-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FFB800] animate-pulse"></span>
                                <span className="text-[#B48A00] text-[9px] font-bold uppercase tracking-[0.2em]">L'excellence en Archi-Tech</span>
                            </div>

                            <h1 className="text-6xl md:text-8xl font-black text-slate-900 leading-[0.9] tracking-[-0.06em] uppercase">
                                Redéfinir <br />
                                <span className="text-[#FFB800] italic">L'Espace</span> <br />
                                Construit.
                            </h1>

                            <p className="text-lg md:text-xl text-slate-500 max-w-xl font-medium leading-relaxed tracking-tight">
                                Précision technique et vision architecturale. Nous transformons vos ambitions en structures durables grâce à une gestion numérique de pointe.
                            </p>

                            <div className="flex flex-wrap gap-4 pt-4">
                                <Link href="/login" className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-[#FFB800] hover:text-slate-900 transition-all flex items-center gap-3 group text-xs shadow-2xl shadow-slate-900/10">
                                    Démarrer un projet
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                                <button className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-bold uppercase tracking-widest border border-slate-200 hover:border-slate-900 transition-all text-xs">
                                    Voir Portfolio
                                </button>
                            </div>
                        </div>

                        {/* Bento Hero Grid */}
                        <div className="grid grid-cols-12 gap-4 h-[500px] md:h-[600px]">
                            <div className="col-span-8 overflow-hidden rounded-[2.5rem] relative shadow-2xl group">
                                <Image
                                    src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop"
                                    alt="Modern Construction"
                                    fill
                                    className="object-cover transition-transform duration-1000 group-hover:scale-105"
                                    priority
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
                                <div className="absolute bottom-8 left-8">
                                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-white">
                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Impact</p>
                                        <p className="text-xl font-black tracking-tighter uppercase">Structure Pure</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-span-4 flex flex-col gap-4">
                                <div className="flex-1 overflow-hidden rounded-[2.5rem] relative shadow-xl group">
                                    <Image
                                        src="https://images.unsplash.com/photo-1600585154340-be6199f7d009?q=80&w=2070&auto=format&fit=crop"
                                        alt="Interior Design"
                                        fill
                                        className="object-cover transition-transform duration-1000 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-amber-500/10 mix-blend-overlay"></div>
                                </div>
                                <div className="flex-1 bg-[#FFB800] rounded-[2.5rem] p-8 flex flex-col justify-end transition-transform hover:-rotate-3 duration-500 cursor-default">
                                    <Award className="w-10 h-10 text-slate-900 mb-4" />
                                    <p className="text-slate-900 text-3xl font-black leading-tight tracking-tighter uppercase">41 Ans</p>
                                    <p className="text-slate-900/60 text-[10px] font-bold uppercase tracking-widest">D'Excellence</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Background Decor */}
                <div className="absolute top-0 right-[-10%] w-[500px] h-[500px] bg-amber-100/30 rounded-full blur-[120px] -z-10"></div>
            </section>

            {/* Core Services - Bento Grid Section */}
            <section id="services" className="py-24 md:py-40 bg-white">
                <div className="max-w-[1400px] mx-auto px-6 md:px-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-20">
                        <div className="space-y-4">
                            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#FFB800]">Services & Expertise</span>
                            <h2 className="text-5xl md:text-7xl font-black text-slate-900 uppercase leading-[0.85] tracking-[-0.04em]">
                                Une Approche <br />
                                <span className="opacity-20 italic">Sans Compromis</span>
                            </h2>
                        </div>
                        <p className="text-slate-400 max-w-sm font-medium leading-relaxed">
                            De la conception technique à la livraison clé en main, nous utilisons le BIM et le management agile pour garantir vos délais et budgets.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {/* Big Bento Item */}
                        <div className="md:col-span-2 lg:col-span-3 bg-slate-50 rounded-[3rem] p-10 md:p-14 flex flex-col justify-between group hover:bg-slate-900 transition-all duration-700 hover:shadow-2xl">
                            <div className="space-y-6">
                                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                                    <Zap className="w-8 h-8 text-[#FFB800]" />
                                </div>
                                <h3 className="text-3xl font-black uppercase tracking-tighter leading-none group-hover:text-white transition-colors duration-500">
                                    Management <br />Intelligent
                                </h3>
                                <p className="text-slate-500 font-medium group-hover:text-slate-400 transition-colors duration-500">
                                    Suivi en temps réel de votre chantier. Transparence totale sur l'approvisionnement et les ressources.
                                </p>
                            </div>
                            <div className="pt-10 flex items-center justify-between">
                                <div className="flex -space-x-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden relative shadow-sm">
                                            <Image src={`https://i.pravatar.cc/100?u=${i}`} alt="Avatar" fill className="object-cover" />
                                        </div>
                                    ))}
                                    <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-900 flex items-center justify-center text-[10px] text-white font-bold">
                                        +50
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#FFB800]">Voir détails</span>
                            </div>
                        </div>

                        {/* Bento Item - Color Accent */}
                        <div className="md:col-span-2 lg:col-span-3 bg-slate-900 rounded-[3rem] p-10 md:p-14 flex flex-col justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 opacity-10 pointer-events-none">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFB800] rounded-full blur-[80px]"></div>
                            </div>
                            <div className="relative z-10 space-y-8">
                                <h3 className="text-4xl md:text-5xl font-black text-white uppercase leading-[0.8] tracking-tighter italic">
                                    Qualité <br />
                                    <span className="text-[#FFB800]">Absolue</span>
                                </h3>
                                <p className="text-white/50 font-medium leading-relaxed max-w-xs">
                                    Plus de 40 ans d'expertise dans le béton armé et la finition haut de gamme.
                                </p>
                                <ul className="space-y-4 pt-4">
                                    {['Structure Certifiée', 'Matériaux Premium', 'Finition de Luxe'].map(item => (
                                        <li key={item} className="flex items-center gap-3 text-white text-[10px] font-bold uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity cursor-default">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#FFB800]"></div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Smaller Bento Items */}
                        <div className="md:col-span-2 lg:col-span-2 bg-[#FAF9F6] rounded-[3rem] p-10 border border-slate-100 flex flex-col gap-6 group hover:translate-y-[-8px] transition-all duration-500">
                            <Clock className="w-10 h-10 text-slate-400 group-hover:text-slate-900 transition-colors" />
                            <h4 className="text-xl font-bold uppercase tracking-tight text-slate-900">Respect des Délais</h4>
                            <p className="text-sm text-slate-400 font-medium leading-relaxed">Planning rigoureux et anticipation de tous les aléas techniques.</p>
                        </div>

                        <div className="md:col-span-2 lg:col-span-2 bg-white rounded-[3rem] p-10 border-2 border-slate-900 flex flex-col gap-6 transition-all hover:bg-slate-900 hover:text-white group">
                            <Gem className="w-10 h-10 text-[#FFB800]" />
                            <h4 className="text-xl font-bold uppercase tracking-tight">Design Unique</h4>
                            <p className="text-sm text-slate-400 font-medium leading-relaxed group-hover:text-slate-300">Intégration parfaite entre l'architecte et l'exécution terrain.</p>
                        </div>

                        <div className="md:col-span-2 lg:col-span-2 bg-slate-50 rounded-[3rem] p-10 border border-slate-100 flex flex-col gap-6 group hover:shadow-xl transition-all">
                            <Globe className="w-10 h-10 text-[#FFB800]" />
                            <h4 className="text-xl font-bold uppercase tracking-tight text-slate-900 tracking-[-0.02em]">Durable</h4>
                            <p className="text-sm text-slate-400 font-medium leading-relaxed">Engagement pour des constructions à faible empreinte carbone.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials - Large Typography Style */}
            <section id="témoignages" className="py-24 md:py-40 bg-slate-900 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                <div className="max-w-[1400px] mx-auto px-6 md:px-10">
                    <div className="grid lg:grid-cols-12 gap-20">
                        <div className="lg:col-span-4 space-y-8">
                            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#FFB800]">Témoignages</span>
                            <h2 className="text-5xl md:text-6xl font-black text-white uppercase leading-[0.85] tracking-tighter">
                                L'Excellence <br />
                                Reconnue.
                            </h2>
                            <div className="flex items-center gap-6 pt-10">
                                <div className="text-white">
                                    <p className="text-4xl font-black">4.9/5</p>
                                    <div className="flex gap-1 text-[#FFB800]">
                                        {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                                    </div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-2">Score de Confiance</p>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-8 space-y-12">
                            {[
                                { name: 'Ahmed Mansour', role: 'Investisseur Immobilier', quote: "Une gestion exemplaire du début à la fin. La transparence sur les coûts et les délais a été le point fort de cette collaboration." },
                                { name: 'Sarah Ben Ali', role: 'Architecte DPLG', quote: "Travailler avec HouseExpert permet une liberté de conception rare. Leur maîtrise technique assure que chaque détail est respecté." }
                            ].map((t, i) => (
                                <div key={i} className="group cursor-default">
                                    <p className="text-2xl md:text-4xl font-medium text-white/90 leading-snug tracking-tight mb-8 group-hover:text-white transition-colors duration-500 italic font-serif">
                                        "{t.quote}"
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-0.5 bg-[#FFB800]"></div>
                                        <div>
                                            <p className="text-sm font-black text-white uppercase tracking-wider">{t.name}</p>
                                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.1em]">{t.role}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Featured Projects - Full Width Elegant Slider/Grid */}
            <section id="projets" className="py-24 md:py-40 bg-white">
                <div className="max-w-[1400px] mx-auto px-6 md:px-10">
                    <div className="flex items-baseline justify-between mb-20 gap-4 flex-wrap">
                        <h2 className="text-6xl md:text-9xl font-black text-slate-900 tracking-[-0.05em] uppercase leading-none">
                            Portfolio
                        </h2>
                        <a href="#" className="inline-flex items-center gap-4 text-[11px] font-black uppercase tracking-widest text-[#FFB800] hover:text-slate-900 transition-colors group">
                            Voir tous les projets <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </a>
                    </div>

                    <div className="grid md:grid-cols-2 gap-10">
                        {portfolioItems.slice(0, 2).map((item, i) => (
                            <div key={i} className="group space-y-6">
                                <div className="relative aspect-[4/3] rounded-[3rem] overflow-hidden bg-slate-100 shadow-xl group">
                                    <Image
                                        src={item.image}
                                        alt={item.title}
                                        fill
                                        className="object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors duration-700"></div>
                                    <div className="absolute top-8 right-8 w-14 h-14 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-50 group-hover:scale-100 translate-x-4 group-hover:translate-x-0">
                                        <ExternalLink className="w-6 h-6 text-slate-900" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between px-4">
                                    <div>
                                        <h4 className="text-2xl font-black uppercase tracking-tighter text-slate-900">{item.title}</h4>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.category}</p>
                                    </div>
                                    <span className="text-slate-200 font-bold text-6xl italic transition-colors group-hover:text-amber-100 cursor-default">0{i + 1}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section - Minimalist & Bold */}
            <section className="py-24 md:py-32">
                <div className="max-w-[1400px] mx-auto px-6 md:px-10">
                    <div className="bg-[#FFB800] rounded-[4rem] p-10 md:p-32 text-center relative overflow-hidden group shadow-2xl shadow-amber-200/50 transition-transform hover:scale-[0.99] duration-700">
                        <div className="relative z-10 space-y-12">
                            <h2 className="text-5xl md:text-8xl font-black text-slate-900 uppercase leading-[0.9] tracking-[-0.04em] italic transform group-hover:scale-105 transition-transform duration-1000">
                                Votre Projet, <br />
                                <span className="underline decoration-slate-900/20 underline-offset-8">Notre Engagement.</span>
                            </h2>
                            <p className="text-slate-900/60 font-medium max-w-xl mx-auto text-lg leading-relaxed">
                                Commençons dès aujourd'hui la construction de votre héritage. Notre équipe est prête à relever vos défis architecturaux.
                            </p>
                            <div className="flex justify-center flex-wrap gap-6 pt-4">
                                <Link href="/login" className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-bold uppercase tracking-widest hover:scale-105 hover:shadow-2xl active:scale-95 transition-all text-sm shadow-xl shadow-slate-900/20">
                                    Démarrer gratuitement
                                </Link>
                            </div>
                        </div>
                        {/* Abstract Decor */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-white opacity-20 rounded-full blur-[100px] -z-0"></div>
                    </div>
                </div>
            </section>

            {/* Footer - High End Clean */}
            <footer id="contact" className="bg-white pt-24 pb-12">
                <div className="max-w-[1400px] mx-auto px-6 md:px-10">
                    <div className="grid lg:grid-cols-12 gap-20 pb-20 border-b border-slate-100">
                        <div className="lg:col-span-5 space-y-12">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center transition-transform hover:rotate-12">
                                    <Building2 className="text-[#FFB800] w-6 h-6" />
                                </div>
                                <span className="font-bold text-2xl tracking-tighter uppercase transition-colors">
                                    House<span className="text-[#FFB800]">Expert</span>
                                </span>
                            </div>
                            <p className="text-slate-400 font-medium max-w-sm leading-relaxed text-lg tracking-tight">
                                L'excellence technique au service de l'architecture moderne. Nous construisons le futur avec précision et passion.
                            </p>
                            <div className="flex gap-6">
                                {[Instagram, Linkedin, Facebook].map((Icon, i) => (
                                    <a key={i} href="#" className="text-slate-300 hover:text-slate-900 transition-colors p-1 transform hover:scale-125 duration-300">
                                        <Icon className="w-5 h-5" />
                                    </a>
                                ))}
                            </div>
                        </div>

                        <div className="lg:col-span-3 space-y-10 pt-4">
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-900 opacity-30">Plan du site</h4>
                            <ul className="space-y-4">
                                {['Accueil', 'Expertise', 'Portfolio', 'Collaborer', 'Login'].map(link => (
                                    <li key={link}>
                                        <a href="#" className="text-sm font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">{link}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="lg:col-span-4 space-y-12 pt-4">
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-900 opacity-30">Contact</h4>
                            <div className="space-y-6">
                                <a href="mailto:contact@houseexpert.tn" className="group block">
                                    <p className="text-[10px] font-bold text-[#FFB800] uppercase tracking-widest mb-1 group-hover:text-slate-900 transition-colors">Email</p>
                                    <p className="text-xl font-bold text-slate-900 transition-transform group-hover:translate-x-2 duration-300 tracking-tight underline hidden md:block decoration-slate-200">contact@houseexpert.tn</p>
                                    <p className="text-base font-bold text-slate-900 md:hidden">contact@houseexpert.tn</p>
                                </a>
                                <div className="group block select-none">
                                    <p className="text-[10px] font-bold text-[#FFB800] uppercase tracking-widest mb-1 group-hover:text-slate-900 transition-colors">Siège</p>
                                    <p className="text-sm font-bold text-slate-500 uppercase leading-relaxed max-w-[200px]">Ave Mohamed V, Tunis, Tunisie</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex items-center gap-8">
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-300">© 2026 HouseExpert</span>
                            <div className="flex gap-6">
                                <a href="#" className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-300 hover:text-slate-900 transition-colors">Privacy</a>
                                <a href="#" className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-300 hover:text-slate-900 transition-colors">Legal</a>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 tracking-[0.1em]">Serveur Opérationnel</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
