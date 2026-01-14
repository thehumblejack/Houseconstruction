'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Shield, Hammer, Ruler, Clock, ArrowRight, CheckCircle2,
    Building2, HardHat, ChevronRight, MapPin, Phone, Mail,
    Star, Zap, Gem, Award, Globe, Plus
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { motion, useScroll, useTransform } from 'framer-motion';

const MotionImage = motion(Image);

export default function LandingPage() {
    const { user, isApproved } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const containerRef = useRef(null);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const portfolioItems = [
        { title: 'Villa Azure', category: 'Architecture Moderne', image: '/images/landing/hero.png' },
        { title: 'Éclat Urbain', category: 'Design Commercial', image: '/images/landing/detail.png' },
        { title: 'Havre de Paix', category: 'Maison Individuelle', image: '/images/landing/interior.png' },
        { title: 'Structure Pro', category: 'Ingénierie', image: '/images/landing/construction.png' },
    ];

    const fadeInUp = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    };

    const stagger = {
        animate: {
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    return (
        <div ref={containerRef} className="bg-[#0A0A0A] text-white font-jakarta selection:bg-[#FFB800] selection:text-black scroll-smooth min-h-screen overflow-x-hidden">

            {/* Minimalist Floating Navigation */}
            <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 px-6 md:px-12 ${scrolled ? 'py-4' : 'py-8'}`}>
                <div className={`max-w-[1200px] mx-auto flex items-center justify-between transition-all duration-700 rounded-full px-8 py-3 ${scrolled ? 'bg-white/5 backdrop-blur-2xl border border-white/10 shadow-xl' : 'bg-transparent border-transparent'}`}>
                    <div className="flex items-center gap-2 group cursor-pointer">
                        <Building2 className="text-[#FFB800] w-5 h-5" />
                        <span className="font-bold text-sm tracking-tight uppercase">
                            House<span className="text-[#FFB800]">Expert</span>
                        </span>
                    </div>

                    <div className="hidden lg:flex items-center gap-8">
                        {[
                            { name: 'Services', href: '#services' },
                            { name: 'Projets', href: '#projets' },
                            { name: 'Contact', href: '#contact' }
                        ].map((item) => (
                            <a key={item.name} href={item.href} className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">
                                {item.name}
                            </a>
                        ))}
                    </div>

                    <Link
                        href={user ? (isApproved ? '/' : '/auth/pending') : '/login'}
                        className="bg-white text-black px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-[#FFB800] transition-all"
                    >
                        {user ? 'Chantier' : 'Accès Client'}
                    </Link>
                </div>
            </nav>

            {/* Minimally Elegant Hero Section */}
            <section id="accueil" className="relative h-screen flex items-center justify-center pt-20">
                <div className="absolute inset-0 z-0 opacity-30">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-transparent to-[#0A0A0A] z-10" />
                    <MotionImage
                        src="/images/landing/hero.png"
                        alt="Background"
                        fill
                        className="object-cover"
                        style={{
                            scale: useTransform(scrollYProgress, [0, 0.5], [1, 1.1])
                        }}
                        priority
                    />
                </div>

                <div className="max-w-[1200px] mx-auto px-8 relative z-20 w-full">
                    <motion.div
                        initial="initial"
                        animate="animate"
                        variants={stagger}
                        className="space-y-8 max-w-2xl"
                    >
                        <motion.div variants={fadeInUp} className="inline-flex items-center gap-3 px-4 py-1.5 bg-white/5 backdrop-blur-md rounded-full border border-white/10">
                            <span className="w-1.5 h-1.5 bg-[#FFB800] rounded-full animate-pulse" />
                            <span className="text-[#FFB800] text-[8px] font-black uppercase tracking-[0.4em]">Expertise Structurelle</span>
                        </motion.div>

                        <div className="space-y-4">
                            <motion.h1 variants={fadeInUp} className="text-4xl md:text-6xl font-black text-white leading-[1.1] tracking-tighter uppercase">
                                Redéfinir <br />
                                <span className="text-[#FFB800]">L'Espace</span> Bâti.
                            </motion.h1>
                            <motion.p variants={fadeInUp} className="text-sm md:text-base text-white/40 max-w-lg font-medium leading-relaxed tracking-tight">
                                Précision technique et vision architecturale. Nous transformons vos ambitions en structures durables avec une rigueur d'ingénierie absolue.
                            </motion.p>
                        </div>

                        <motion.div variants={fadeInUp} className="flex flex-wrap gap-4 pt-4">
                            <Link href="/login" className="bg-[#FFB800] text-black px-8 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-white transition-all flex items-center gap-3 group text-[10px]">
                                Commencer un projet
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <a href="#projets" className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-white/10 transition-all text-[10px]">
                                Nos réalisations
                            </a>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Clean Services Section */}
            <section id="services" className="py-24 bg-white text-black">
                <div className="max-w-[1200px] mx-auto px-8">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8 text-black">
                        <div className="space-y-4">
                            <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-[0.9]">
                                Expertise <br /> <span className="text-slate-200">Technique.</span>
                            </h2>
                        </div>
                        <p className="text-slate-400 max-w-sm text-xs font-medium leading-relaxed tracking-tight uppercase">
                            Gestion intégrale de l'ingénierie structurelle et architecturale.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { icon: Shield, title: "Structure", desc: "Fondations et ossatures béton armé." },
                            { icon: Hammer, title: "Gros Œuvre", desc: "Maçonnerie et élévation de précision." },
                            { icon: Ruler, title: "Finition", desc: "Design d'intérieur et revêtements premium." }
                        ].map((service, i) => (
                            <div key={i} className="p-10 bg-slate-50 border border-slate-100 rounded-[2rem] space-y-6 group hover:bg-[#0A0A0A] transition-all duration-500">
                                <service.icon className="w-8 h-8 text-[#FFB800]" />
                                <h3 className="text-xl font-black uppercase tracking-tight group-hover:text-white transition-colors">{service.title}</h3>
                                <p className="text-xs text-slate-400 group-hover:text-slate-500 transition-colors">{service.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Compact Portfolio */}
            <section id="projets" className="py-24 bg-white text-black">
                <div className="max-w-[1200px] mx-auto px-8">
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-16">Réalisations</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        {portfolioItems.map((item, i) => (
                            <div key={i} className="group cursor-pointer space-y-4">
                                <div className="relative aspect-video rounded-3xl overflow-hidden bg-slate-100 border border-slate-100">
                                    <Image
                                        src={item.image}
                                        alt={item.title}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="flex justify-between items-center px-2">
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-tight">{item.title}</h3>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#FFB800] transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Premium Enhanced Footer */}
            <footer id="contact" className="bg-[#0A0A0A] text-white pt-32 pb-12 border-t border-white/5">
                <div className="max-w-[1200px] mx-auto px-8">
                    {/* Pre-footer: Big Statement */}
                    <div className="grid lg:grid-cols-2 gap-20 mb-32 items-end">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="space-y-8"
                        >
                            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                                Prêt à bâtir <br />
                                <span className="text-[#FFB800]">votre futur ?</span>
                            </h2>
                            <p className="text-white/40 text-sm font-medium max-w-sm tracking-tight leading-relaxed">
                                De la conception à la remise des clés, nous apportons une rigueur d'ingénierie et une vision architecturale à chaque mètre carré.
                            </p>
                            <Link href="/login" className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#FFB800] transition-all">
                                Démarrer un projet
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </motion.div>

                        <div className="flex flex-col gap-8 lg:items-end">
                            <div className="text-left lg:text-right">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FFB800] mb-2">Bureau de Tunis</p>
                                <p className="text-sm font-bold text-white/60 leading-relaxed uppercase tracking-tight">Les Berges du Lac II, Tunis</p>
                            </div>
                            <div className="text-left lg:text-right">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FFB800] mb-2">Contact Direct</p>
                                <a href="mailto:contact@houseexpert.tn" className="text-xl md:text-2xl font-black hover:text-[#FFB800] transition-colors">contact@houseexpert.tn</a>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-white/5 w-full mb-16" />

                    {/* Main Footer Links */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-20">
                        <div className="col-span-2 md:col-span-1 space-y-6">
                            <div className="flex items-center gap-2">
                                <Building2 className="text-[#FFB800] w-5 h-5" />
                                <span className="font-bold text-sm uppercase tracking-tight">HouseExpert</span>
                            </div>
                            <p className="text-[10px] text-white/30 font-bold leading-relaxed uppercase tracking-widest max-w-[180px]">
                                Ingénierie & Architecture de précision depuis 2026.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#FFB800]">Studio</h4>
                            <ul className="space-y-3 text-[11px] font-bold text-white/40 uppercase tracking-widest">
                                <li><a href="#accueil" className="hover:text-white transition-colors">Accueil</a></li>
                                <li><a href="#projets" className="hover:text-white transition-colors">Portfolio</a></li>
                                <li><a href="#services" className="hover:text-white transition-colors">Expertise</a></li>
                            </ul>
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#FFB800]">Services</h4>
                            <ul className="space-y-3 text-[11px] font-bold text-white/40 uppercase tracking-widest">
                                <li>Ingénierie Structure</li>
                                <li>Béton Armé</li>
                                <li>Architecture</li>
                                <li>Design d'Intérieur</li>
                            </ul>
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#FFB800]">Réseaux</h4>
                            <ul className="space-y-3 text-[11px] font-bold text-white/40 uppercase tracking-widest">
                                <li><a href="#" className="hover:text-white transition-colors">Instagram</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">LinkedIn</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Behance</a></li>
                            </ul>
                        </div>
                    </div>

                    {/* Bottom Bar */}
                    <div className="flex flex-col md:flex-row justify-between items-center pt-10 border-t border-white/5 gap-6">
                        <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.5em]">
                            © 2026 HOUSEEXPERT STUDIO. TOUS DROITS RÉSERVÉS.
                        </p>
                        <div className="flex gap-8 text-[9px] font-black uppercase tracking-[0.5em] text-white/20">
                            <a href="#" className="hover:text-white transition-colors">Confidentialité</a>
                            <a href="#" className="hover:text-white transition-colors">Mentions Légales</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
