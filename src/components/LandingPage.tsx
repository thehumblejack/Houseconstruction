'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Hammer, Ruler, Clock, ArrowRight, CheckCircle2, Building2, HardHat, ChevronRight, MapPin, Phone, Mail, Facebook, Instagram, Linkedin, Twitter, Star } from 'lucide-react';
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
        { title: 'Villa Azure', category: 'Architecture Moderne', image: 'https://images.unsplash.com/photo-1600596542815-2a4290aa315c?q=80&w=2071&auto=format&fit=crop' },
        { title: 'Le Sommet', category: 'Complexe Résidentiel', image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=2070&auto=format&fit=crop' },
        { title: 'Éclat Urbain', category: 'Design Commercial', image: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?q=80&w=2069&auto=format&fit=crop' },
        { title: 'Havre de Paix', category: 'Maison Individuelle', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop' },
    ];

    const partners = [
        { name: 'ArchiBuild', logo: Building2 },
        { name: 'SteelCore', logo: Shield },
        { name: 'EcoConstruct', logo: HardHat },
        { name: 'SmartDev', logo: Ruler },
        { name: 'SafeHome', logo: Hammer },
    ];

    const testimonials = [
        { name: 'Ahmed Mansour', role: 'Propriétaire Villa', content: 'Une gestion exemplaire du début à la fin. La transparence sur les coûts et les délais a été le point fort.', photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1974&auto=format&fit=crop' },
        { name: 'Sarah Ben Ali', role: 'Investisseur', content: 'Leur approche numérique de la construction est révolutionnaire. Je pouvais suivre mon chantier en temps réel.', photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1974&auto=format&fit=crop' },
        { name: 'Karim Dridi', role: 'Architecte', content: 'En tant qu\'architecte, travailler avec HouseExpert est un plaisir. Ils respectent scrupuleusement les détails.', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1974&auto=format&fit=crop' },
    ];

    const articles = [
        { title: 'L\'avenir de la construction durable', date: '12 Jan 2026', image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?q=80&w=2070&auto=format&fit=crop' },
        { title: 'Comment optimiser son budget chantier', date: '08 Jan 2026', image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=2070&auto=format&fit=crop' },
        { title: 'Top 5 des tendances archi 2026', date: '05 Jan 2026', image: 'https://images.unsplash.com/photo-1531834685032-c34bf0d84c77?q=80&w=2070&auto=format&fit=crop' },
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
                        {['Accueil', 'Services', 'Projets', 'Témoignages', 'Contact'].map((item) => (
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
            <section id="accueil" className="relative min-h-[90vh] flex items-center overflow-hidden bg-[#FAF9F6]">
                <div className="max-w-[1400px] mx-auto px-6 md:px-10 w-full grid lg:grid-cols-2 gap-12 items-center pt-24">
                    <div className="space-y-8 animate-in fade-in slide-in-from-left-12 duration-1000">
                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-900/5 rounded-full border border-slate-900/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FFB800] animate-pulse"></span>
                            <span className="text-slate-900 text-[9px] font-black uppercase tracking-[0.3em]">L'excellence en Construction</span>
                        </div>

                        <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-slate-900 leading-[0.85] tracking-tighter uppercase">
                            Construction <br />
                            <GoldText>Management</GoldText> <br />
                            Solutions.
                        </h1>

                        <p className="text-base md:text-lg text-slate-500 max-w-xl font-medium leading-relaxed">
                            Nous redéfinissons les standards de la construction moderne. Précision technique, transparence totale et résultats d'exception pour vos projets résidentiels et commerciaux.
                        </p>

                        <div className="flex flex-wrap gap-5">
                            <Link href="/login" className="bg-[#FFB800] text-slate-900 px-10 py-5 rounded-2xl font-black uppercase tracking-[0.1em] hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-4 group text-xs">
                                Commencer ICI
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>

                    <div className="relative flex justify-center lg:justify-end animate-in fade-in zoom-in duration-1000 delay-200">
                        <div className="relative w-full max-w-[500px] aspect-square rounded-full border-t-8 border-r-8 border-[#FFB800] p-4">
                            <div className="w-full h-full rounded-full overflow-hidden relative shadow-2xl">
                                <Image
                                    src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop"
                                    alt="Construction Expert"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="absolute -bottom-10 -left-10 bg-white p-6 rounded-3xl shadow-xl border border-slate-50 flex flex-col gap-1">
                                <span className="text-slate-900 text-3xl font-black tracking-tighter uppercase">41</span>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ans d'Expertise</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Reliable Solutions Section (The '41' Section) */}
            <section id="expertise" className="py-24 md:py-32 bg-white relative overflow-hidden">
                <div className="max-w-[1400px] mx-auto px-6 md:px-10">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="relative">
                            <div className="absolute -top-20 -left-10 text-[280px] font-black text-slate-50 select-none z-0 leading-none">41</div>
                            <div className="relative z-10 rounded-[40px] overflow-hidden aspect-[4/3] shadow-2xl transform -rotate-1 hover:rotate-0 transition-transform duration-700">
                                <Image
                                    src="https://images.unsplash.com/photo-1581094794329-cd11179a28eb?q=80&w=2135&auto=format&fit=crop"
                                    alt="Expertise"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        </div>
                        <div className="space-y-8 relative z-10">
                            <div className="w-12 h-1 bg-[#FFB800]"></div>
                            <h2 className="text-4xl md:text-6xl font-black text-slate-900 uppercase leading-[0.9] tracking-tighter">
                                Build with quality, <br />
                                safety, & Durability, <br />
                                delivering <GoldText>reliable solutions</GoldText> <br />
                                for all project needs.
                            </h2>
                            <p className="text-slate-500 font-medium leading-relaxed max-w-lg">
                                Plus de 4 décennies d'excellence. Nous combinons l'artisanat traditionnel avec les technologies de gestion les plus avancées pour garantir le succès de vos chantiers.
                            </p>
                            <div className="flex gap-4">
                                <Link href="/login" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border-b-2 border-slate-900 pb-1 hover:border-[#FFB800] transition-colors">
                                    En savoir plus <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Wide Construction View */}
            <section className="px-6 md:px-10 h-[400px] md:h-[600px] relative overflow-hidden rounded-[60px] max-w-[1500px] mx-auto group">
                <Image
                    src="https://images.unsplash.com/photo-1590486803833-1c5c5050130a?q=80&w=2070&auto=format&fit=crop"
                    alt="Massive Construction Site"
                    fill
                    className="object-cover transition-transform duration-[2s] group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-transparent duration-700"></div>
            </section>

            {/* Partners Bar */}
            <section className="py-20 border-y border-slate-100">
                <div className="max-w-[1400px] mx-auto px-6 md:px-10 flex flex-wrap justify-between items-center gap-12 opacity-40 grayscale group hover:grayscale-0 transition-all">
                    {partners.map((P, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <P.logo className="w-8 h-8" />
                            <span className="text-sm font-black uppercase tracking-widest">{P.name}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Testimonials (Reviews) Section */}
            <section id="témoignages" className="py-24 md:py-32 bg-[#FAF9F6]">
                <div className="max-w-[1400px] mx-auto px-6 md:px-10 text-center space-y-20">
                    <div className="space-y-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#FFB800]">Nos Clients</span>
                        <h2 className="text-5xl md:text-[80px] font-black text-slate-900 uppercase leading-[0.8] tracking-tighter">
                            What do people <GoldText>think</GoldText> about <br />
                            New developments?
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {testimonials.map((t, i) => (
                            <div key={i} className="bg-white p-10 rounded-[40px] shadow-sm hover:shadow-xl transition-all border border-slate-100 text-left space-y-8">
                                <div className="flex gap-1">
                                    {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-[#FFB800] text-[#FFB800]" />)}
                                </div>
                                <p className="text-slate-600 font-medium italic leading-relaxed text-lg italic">"{t.content}"</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full overflow-hidden relative bg-slate-100">
                                        <Image src={t.photo} alt={t.name} fill className="object-cover" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-black uppercase tracking-tight text-slate-900">{t.name}</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-[#FFB800]">{t.role}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* News & Articles Section */}
            <section className="py-24 md:py-32 bg-white">
                <div className="max-w-[1400px] mx-auto px-6 md:px-10 space-y-20">
                    <div className="text-center md:text-left">
                        <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
                            <div className="w-10 h-0.5 bg-[#FFB800]"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#FFB800]">Blog & News</span>
                        </div>
                        <h2 className="text-5xl md:text-7xl font-black text-slate-900 uppercase tracking-tighter italic">
                            Latest <GoldText>News</GoldText> & <br />Articles.
                        </h2>
                    </div>
                    <div className="grid gap-0">
                        {articles.map((art, i) => (
                            <div key={i} className="flex flex-col md:flex-row md:items-center gap-6 md:gap-12 py-10 border-b border-slate-100 group cursor-pointer hover:pl-4 transition-all duration-500">
                                <div className="w-full md:w-48 h-32 relative rounded-3xl overflow-hidden shrink-0 shadow-lg">
                                    <Image src={art.image} alt={art.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFB800]">{art.date}</span>
                                    <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 group-hover:text-[#FFB800] transition-colors leading-tight">{art.title}</h3>
                                    <p className="text-slate-400 text-sm font-medium line-clamp-1">Découvrez comment nous réinventons la construction pour le 21ème siècle...</p>
                                </div>
                                <div className="w-14 h-14 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-slate-900 group-hover:border-slate-900 group-hover:text-[#FFB800] transition-all duration-500 shrink-0">
                                    <ArrowRight className="w-6 h-6" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Black Section - Luxury Brand Identity */}
            <section className="py-24 md:py-10">
                <div className="max-w-[1400px] mx-auto px-6 md:px-10">
                    <div className="bg-slate-900 rounded-[60px] overflow-hidden relative min-h-[600px] flex items-center">
                        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#FFB800]/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>

                        <div className="grid lg:grid-cols-2 gap-20 items-center p-10 md:p-20 w-full">
                            <div className="space-y-10">
                                <div className="space-y-4">
                                    <div className="w-12 h-1 bg-[#FFB800]"></div>
                                    <h2 className="text-4xl md:text-6xl font-black text-white uppercase leading-[0.9] tracking-tighter">
                                        How We Create a <br />
                                        <GoldText>Luxury</GoldText> Brand <br />
                                        Identity.
                                    </h2>
                                    <p className="text-white/40 font-medium leading-relaxed max-w-lg">
                                        L'élégance architecturale ne tolère aucun compromis. Notre processus intègre les plus hauts standards de design mondial avec une gestion technique rigoureuse.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    {[
                                        { title: 'Conception Architecturale', val: 'Premium' },
                                        { title: 'Expertise Structurelle', val: 'Avancée' },
                                        { title: 'Gestion de Projet', val: 'Numérique' }
                                    ].map((row, i) => (
                                        <div key={i} className="flex items-center justify-between py-6 border-b border-white/10 group cursor-pointer hover:border-[#FFB800]/50 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#FFB800]"></div>
                                                <span className="text-white text-xs font-black uppercase tracking-widest">{row.title}</span>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-[#FFB800] group-hover:translate-x-1 transition-all" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="relative aspect-square rounded-[40px] overflow-hidden shadow-2xl">
                                <Image
                                    src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070&auto=format&fit=crop"
                                    alt="Luxury Identity"
                                    fill
                                    className="object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                                <div className="absolute bottom-8 left-8 right-8 flex justify-center">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center animate-bounce">
                                        <div className="w-2 h-2 rounded-full bg-slate-900"></div>
                                    </div>
                                </div>
                            </div>
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
