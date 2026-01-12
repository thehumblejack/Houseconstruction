'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Hammer, Ruler, Clock, ArrowRight, CheckCircle2, Building2, HardHat, ChevronRight, MapPin, Phone, Mail, Facebook, Instagram, Linkedin, Twitter } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

export default function LandingPage() {
    const { user, isApproved } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const GoldText = ({ children }: { children: React.ReactNode }) => (
        <span className="text-[#FFB800]">{children}</span>
    );

    const portfolioItems = [
        { title: 'Villa Azure', category: 'Architecture Moderne', image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2071&auto=format&fit=crop' },
        { title: 'Le Sommet', category: 'Complexe Résidentiel', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop' },
        { title: 'Éclat Urbain', category: 'Design Commercial', image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=2069&auto=format&fit=crop' },
        { title: 'Havre de Paix', category: 'Maison Individuelle', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop' },
    ];

    return (
        <div className="bg-white text-slate-900 font-sans selection:bg-yellow-200 scroll-smooth">
            {/* Navigation */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/95 backdrop-blur-xl shadow-lg py-3' : 'bg-transparent py-5 md:py-8'}`}>
                <div className="max-w-[1400px] mx-auto px-6 md:px-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-black/10">
                            <Building2 className="text-[#FFB800] w-6 h-6" />
                        </div>
                        <span className={`font-black text-xl tracking-tighter uppercase ${scrolled ? 'text-slate-900' : 'text-slate-900 md:text-white'}`}>
                            House<span className="text-[#FFB800]">Expert</span>
                        </span>
                    </div>

                    <div className="hidden lg:flex items-center gap-10">
                        {['Accueil', 'Services', 'Projets', 'Contact'].map((item) => (
                            <a key={item} href={`#${item.toLowerCase()}`} className={`text-[10px] font-black uppercase tracking-[0.2em] hover:text-[#FFB800] transition-colors ${scrolled ? 'text-slate-500' : 'text-white/60'}`}>
                                {item}
                            </a>
                        ))}
                    </div>

                    <div className="flex items-center gap-4">
                        <Link
                            href={user ? (isApproved ? '/' : '/auth/pending') : '/login'}
                            className="bg-[#FFB800] hover:bg-[#D49A00] text-slate-900 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-yellow-500/20"
                        >
                            {user ? 'Mon Dashboard' : 'Authentification'}
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section id="accueil" className="relative min-h-screen flex items-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <Image
                        src="https://images.unsplash.com/photo-1503387762-592dee58c460?q=80&w=2135&auto=format&fit=crop"
                        alt="High-end Architecture"
                        fill
                        className="object-cover scale-105 animate-pulse-slow"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/40 to-transparent"></div>
                </div>

                <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-10 w-full pt-20">
                    <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FFB800] animate-pulse"></span>
                            <span className="text-white text-[9px] font-black uppercase tracking-[0.3em]">L'excellence en Construction</span>
                        </div>

                        <h1 className="text-6xl md:text-8xl lg:text-[110px] font-black text-white leading-[0.85] tracking-tighter uppercase drop-shadow-2xl">
                            Build with <br />
                            <GoldText>Quality, Safety</GoldText> <br />
                            & Durability.
                        </h1>

                        <p className="text-base md:text-lg text-white/50 max-w-xl font-medium leading-relaxed">
                            Nous redéfinissons les standards de la construction moderne. Précision technique, transparence totale et résultats d'exception.
                        </p>

                        <div className="flex flex-wrap gap-5 pt-4">
                            <Link href="/login" className="bg-[#FFB800] text-slate-900 px-10 py-5 rounded-2xl font-black uppercase tracking-[0.1em] hover:bg-white transition-all flex items-center justify-center gap-4 group text-xs">
                                Commencer ICI
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-10 right-10 z-10 hidden xl:flex gap-16">
                    <div className="flex flex-col text-right">
                        <span className="text-white/30 text-[9px] font-black uppercase tracking-widest mb-1">Localisation</span>
                        <span className="text-white text-xs font-bold font-mono">Tunis / Remote</span>
                    </div>
                </div>
            </section>

            {/* Experience & Value Section */}
            <section id="services" className="py-24 md:py-32 bg-white relative">
                <div className="max-w-[1400px] mx-auto px-6 md:px-10 grid lg:grid-cols-2 gap-20 items-center">
                    <div className="relative group">
                        <div className="absolute -top-16 -left-8 text-[240px] font-black text-slate-100/80 leading-none select-none -z-10 group-hover:text-yellow-50 transition-colors">41</div>
                        <div className="relative space-y-8 pl-4">
                            <h2 className="text-5xl md:text-7xl font-black text-slate-900 uppercase leading-[0.9] tracking-tighter">
                                Building Your <br />
                                <GoldText>Reliable</GoldText> Visions.
                            </h2>
                            <p className="text-slate-500 font-medium leading-relaxed max-w-md">
                                Plus de 4 décennies de savoir-faire au service de vos projets les plus ambitieux. Nous ne construisons pas seulement des murs, nous bâtissons des patrimoines.
                            </p>
                            <div className="flex items-center gap-10 pt-4">
                                <div className="space-y-1">
                                    <div className="text-3xl font-black text-slate-900 tracking-tighter uppercase">500+</div>
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Projets Réalisés</div>
                                </div>
                                <div className="space-y-1 border-l border-slate-200 pl-10">
                                    <div className="text-3xl font-black text-slate-900 tracking-tighter uppercase">100%</div>
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Satisfaction Client</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {[
                            { title: 'Qualité Supérieure', icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                            { title: 'Sécurité Totale', icon: HardHat, color: 'text-orange-600', bg: 'bg-orange-50' },
                            { title: 'Durabilité', icon: Hammer, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { title: 'Modernité', icon: Ruler, color: 'text-blue-600', bg: 'bg-blue-50' }
                        ].map((item, i) => (
                            <div key={i} className="p-8 rounded-[32px] bg-slate-50 border border-slate-100 hover:border-[#FFB800] transition-all hover:shadow-2xl hover:shadow-black/5 group cursor-default">
                                <div className={`w-14 h-14 ${item.bg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                    <item.icon className={`w-7 h-7 ${item.color}`} />
                                </div>
                                <h3 className="text-base font-black uppercase tracking-tight text-slate-900 mb-2">{item.title}</h3>
                                <p className="text-xs text-slate-400 font-semibold leading-relaxed uppercase tracking-tighter">Engagement d'excellence sur chaque mètre carré.</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Black Section - Brand Identity */}
            <section className="bg-slate-900 py-32 rounded-[60px] mx-4 md:mx-10 my-10 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#FFB800]/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>

                <div className="max-w-[1400px] mx-auto px-6 md:px-10 grid lg:grid-cols-2 gap-20 items-center">
                    <div className="order-2 lg:order-1 relative aspect-square rounded-[40px] overflow-hidden">
                        <Image
                            src="https://images.unsplash.com/photo-1541976590-71395037a3f7?q=80&w=2135&auto=format&fit=crop"
                            alt="Construction Detail"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="order-1 lg:order-2 space-y-10">
                        <div className="space-y-4">
                            <h2 className="text-4xl md:text-6xl font-black text-white uppercase leading-[0.9] tracking-tighter">
                                How We Create a <br />
                                <GoldText>Luxury</GoldText> Identity.
                            </h2>
                            <p className="text-white/40 font-medium leading-relaxed max-w-lg">
                                Chaque détail est pensé pour refléter l'élégance et la solidité. Notre processus intègre les meilleures technologies numériques pour une transparence complète.
                            </p>
                        </div>
                        <div className="space-y-4">
                            {[
                                { title: 'Conception Architecturale', val: 'Premium' },
                                { title: 'Expertise Structurelle', val: 'Avancée' },
                                { title: 'Gestion de Projet', val: 'Numérique' }
                            ].map((row, i) => (
                                <div key={i} className="flex items-center justify-between py-6 border-b border-white/10 group cursor-pointer hover:border-[#FFB800] transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#FFB800]"></div>
                                        <span className="text-white text-sm font-black uppercase tracking-widest">{row.title}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-white/30 text-[10px] uppercase font-bold tracking-widest">{row.val}</span>
                                        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-[#FFB800] transform group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Portfolio Section */}
            <section id="projets" className="py-24 md:py-32 bg-white">
                <div className="max-w-[1400px] mx-auto px-6 md:px-10 space-y-20">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-0.5 bg-[#FFB800]"></div>
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#FFB800]">Galerie</span>
                            </div>
                            <h2 className="text-5xl md:text-8xl font-black text-slate-900 uppercase leading-[0.8] tracking-tighter italic">
                                Our <GoldText>Portfolio</GoldText>
                            </h2>
                        </div>
                        <button className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] group border-b-2 border-slate-900 pb-2 hover:border-[#FFB800] transition-colors">
                            Voir Tout <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {portfolioItems.map((item, i) => (
                            <div key={i} className="group relative aspect-[3/4] rounded-[40px] overflow-hidden cursor-pointer">
                                <Image
                                    src={item.image}
                                    alt={item.title}
                                    fill
                                    className="object-cover transition-transform duration-1000 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity"></div>
                                <div className="absolute inset-x-8 bottom-8 translate-y-4 group-hover:translate-y-0 transition-transform">
                                    <div className="text-[#FFB800] text-[9px] font-black uppercase tracking-widest mb-1">{item.category}</div>
                                    <div className="text-white text-xl font-black uppercase tracking-tight">{item.title}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Call to Action - Dream Together */}
            <section className="py-24 bg-slate-50">
                <div className="max-w-[1400px] mx-auto px-6 md:px-10">
                    <div className="bg-slate-900 rounded-[60px] p-10 md:p-24 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')] opacity-20"></div>
                        <div className="relative z-10 space-y-10">
                            <h2 className="text-4xl md:text-7xl font-black text-white uppercase leading-none tracking-tighter">
                                Build Your <GoldText>Dream</GoldText> <br />
                                Together With Us
                            </h2>
                            <p className="text-white/40 font-medium max-w-xl mx-auto">
                                Rejoignez plus de 500 clients qui ont fait confiance à notre expertise pour leurs projets de vie.
                            </p>
                            <div className="flex justify-center">
                                <Link href="/login" className="bg-[#FFB800] text-slate-900 px-12 py-5 rounded-2xl font-black uppercase tracking-[0.1em] hover:bg-white transition-all text-sm">
                                    Démarrer Mon Projet
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer id="contact" className="bg-white pt-24 pb-12">
                <div className="max-w-[1400px] mx-auto px-6 md:px-10">
                    <div className="grid lg:grid-cols-4 gap-16 pb-20 border-b border-slate-100">
                        <div className="lg:col-span-2 space-y-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                                    <Building2 className="text-[#FFB800] w-6 h-6" />
                                </div>
                                <span className="font-black text-2xl tracking-tighter uppercase">
                                    House<span className="text-[#FFB800]">Expert</span>
                                </span>
                            </div>
                            <p className="text-slate-400 font-medium max-w-md leading-relaxed">
                                Leader de la construction haut de gamme, nous mettons notre expertise au service de vos ambitions architecturales.
                            </p>
                            <div className="flex gap-4">
                                {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                                    <a key={i} href="#" className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-[#FFB800] transition-all">
                                        <Icon className="w-4 h-4" />
                                    </a>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-8">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Contact</h4>
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <MapPin className="w-5 h-5 text-[#FFB800] shrink-0" />
                                    <span className="text-xs font-bold text-slate-500 uppercase leading-loose">Ave Mohamed V, Tunis, Tunisie</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Phone className="w-5 h-5 text-[#FFB800] shrink-0" />
                                    <span className="text-xs font-bold text-slate-500 uppercase">+216 22 222 222</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Mail className="w-5 h-5 text-[#FFB800] shrink-0" />
                                    <span className="text-xs font-bold text-slate-500 uppercase">contact@houseexpert.tn</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Newsletter</h4>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter leading-relaxed">
                                Abonnez-vous pour recevoir nos dernières actualités et projets.
                            </p>
                            <div className="relative">
                                <input
                                    type="email"
                                    placeholder="VOTRE EMAIL"
                                    className="w-full bg-slate-50 border-none rounded-xl py-4 px-6 text-xs font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-[#FFB800] transition-all"
                                />
                                <button className="absolute right-2 top-2 bottom-2 bg-slate-900 text-[#FFB800] px-4 rounded-lg">
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-12 flex flex-col md:flex-row justify-between items-center gap-6">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">© 2026 HouseExpert Construction. Tous droits réservés.</span>
                        <div className="flex gap-8">
                            <a href="#" className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors">Politique de Confidentialité</a>
                            <a href="#" className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors">Mentions Légales</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
