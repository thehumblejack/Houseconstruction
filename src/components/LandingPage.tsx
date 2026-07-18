'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
    HardHat, ArrowRight, Receipt, Sparkles, Users, Scale,
    Layers, ShieldCheck, Camera, CheckCircle2, Trophy, FileText,
    ScanLine, Wallet, ChevronRight, Check, UserPlus, LineChart, Lock
} from 'lucide-react';

/* ---------- Animation helpers (subtle, once) ---------- */

const revealProps = {
    initial: { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-70px' },
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
};

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
    return (
        <motion.div
            {...revealProps}
            transition={{ ...revealProps.transition, delay }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/* ---------- Small mockup primitives ---------- */

function StatTile({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'emerald' | 'amber' }) {
    const toneClass = tone === 'emerald' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : 'text-slate-900';
    return (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 min-w-0">
            <p className="text-[11px] text-slate-500 truncate">{label}</p>
            <p className={`text-sm sm:text-base font-semibold tabular-nums mt-0.5 truncate ${toneClass}`}>{value}</p>
        </div>
    );
}

function Chip({ children, tone }: { children: React.ReactNode; tone: 'emerald' | 'amber' | 'blue' | 'slate' | 'dark' }) {
    const tones: Record<string, string> = {
        emerald: 'bg-emerald-50 text-emerald-700',
        amber: 'bg-amber-50 text-amber-700',
        blue: 'bg-blue-50 text-blue-700',
        slate: 'bg-slate-100 text-slate-600',
        dark: 'bg-slate-900 text-white',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${tones[tone]}`}>
            {children}
        </span>
    );
}

function FactureRow({ name, detail, amount, status }: { name: string; detail: string; amount: string; status: 'paid' | 'pending' }) {
    return (
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-t border-slate-100 first:border-t-0">
            <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Receipt className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="min-w-0">
                    <p className="text-[13px] font-medium text-slate-900 truncate">{name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{detail}</p>
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <span className="text-[13px] font-semibold text-slate-900 tabular-nums">{amount}</span>
                {status === 'paid'
                    ? <Chip tone="emerald">Payé</Chip>
                    : <Chip tone="amber">En attente</Chip>}
            </div>
        </div>
    );
}

/* ---------- Hero scan demo (looping: scan → extract → success) ---------- */

function HeroScanDemo() {
    // 0 = scanning, 1 = fields extracting, 2 = success, 3 = dashboard updated
    const [stage, setStage] = useState(0);

    useEffect(() => {
        const durations = [2600, 2400, 2300, 4200];
        const t = setTimeout(() => setStage((s) => (s + 1) % 4), durations[stage]);
        return () => clearTimeout(t);
    }, [stage]);

    const fields = [
        { label: 'Fournisseur', value: 'STE Mostakbel' },
        { label: 'Date', value: '15/03/2026' },
        { label: 'Montant total', value: '1 705,000 DT' },
        { label: 'Articles détectés', value: '3 lignes' },
    ];

    return (
        <div className="max-w-3xl mx-auto rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.25)] overflow-hidden">
            {/* window bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                </div>
                <AnimatePresence mode="wait">
                    {stage <= 2 ? (
                        <motion.p key="t-scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                            <ScanLine className="w-3.5 h-3.5 text-blue-500" />
                            Extraction IA — HouseExpert
                        </motion.p>
                    ) : (
                        <motion.p key="t-dash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                            Chantier — Villa El Menzah
                        </motion.p>
                    )}
                </AnimatePresence>
                <span className="w-12" />
            </div>

            <AnimatePresence mode="wait">
            {stage <= 2 ? (
            <motion.div key="scan-phase" exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="grid sm:grid-cols-2 gap-4 sm:gap-5 p-4 sm:p-6 items-start">
                {/* ── Left: the document being scanned ── */}
                <div className="relative rounded-xl border border-slate-200 bg-white overflow-hidden select-none">
                    <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                            <span className={`text-[13px] font-bold text-slate-900 px-1 -mx-1 rounded transition-all duration-500 ${stage >= 1 ? 'bg-blue-100 ring-2 ring-blue-400/50' : ''}`}>
                                STE MOSTAKBEL
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 tracking-wide">FACTURE N° 2026-0087</span>
                        </div>
                        <div className="space-y-1.5 pt-1">
                            {['w-full', 'w-11/12', 'w-full', 'w-9/12', 'w-10/12'].map((w, i) => (
                                <div key={i} className={`h-2 rounded-full bg-slate-100 ${w}`} />
                            ))}
                        </div>
                        <div className="border-t border-dashed border-slate-200 pt-2.5 flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-400 tracking-wide">TOTAL TTC</span>
                            <span className={`text-[13px] font-bold text-slate-900 tabular-nums px-1 -mx-1 rounded transition-all duration-500 ${stage >= 1 ? 'bg-blue-100 ring-2 ring-blue-400/50' : ''}`}>
                                1 705,000 DT
                            </span>
                        </div>
                    </div>

                    {/* scan beam */}
                    <AnimatePresence>
                        {stage === 0 && (
                            <motion.div
                                key="beam"
                                initial={{ top: '-18%', opacity: 0 }}
                                animate={{ top: ['-18%', '108%'], opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ top: { duration: 1.6, repeat: Infinity, ease: 'linear' }, opacity: { duration: 0.2 } }}
                                className="absolute inset-x-0 h-10 pointer-events-none"
                            >
                                <div className="h-full bg-gradient-to-b from-transparent via-blue-400/25 to-transparent" />
                                <div className="absolute bottom-0 inset-x-0 h-[2px] bg-blue-500/80 shadow-[0_0_12px_2px_rgba(59,130,246,0.55)]" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* status pill on the document */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                        <AnimatePresence mode="wait">
                            {stage === 0 ? (
                                <motion.span key="scanning" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-medium whitespace-nowrap">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                    Analyse en cours…
                                </motion.span>
                            ) : (
                                <motion.span key="read" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-medium whitespace-nowrap">
                                    <Check className="w-3 h-3" />
                                    Document lu
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* ── Right: extraction results ── */}
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/70">
                        <p className="text-[11px] font-medium text-slate-500">Champs extraits</p>
                        <AnimatePresence mode="wait">
                            {stage === 0 ? (
                                <motion.span key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <Chip tone="blue">IA · analyse…</Chip>
                                </motion.span>
                            ) : (
                                <motion.span key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <Chip tone="emerald">IA · terminé</Chip>
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                    <div className="p-3 space-y-2">
                        {fields.map((f, i) => (
                            <div key={f.label} className="flex items-center justify-between rounded-lg border border-slate-100 px-2.5 py-2 min-h-[42px]">
                                <div className="min-w-0">
                                    <p className="text-[10px] text-slate-400">{f.label}</p>
                                    <AnimatePresence mode="wait">
                                        {stage >= 1 ? (
                                            <motion.p
                                                key="v"
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ delay: stage === 1 ? 0.25 + i * 0.35 : 0, duration: 0.3 }}
                                                className="text-[12px] font-semibold text-slate-900 truncate"
                                            >
                                                {f.value}
                                            </motion.p>
                                        ) : (
                                            <motion.div key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-1 h-2.5 w-24 rounded-full bg-slate-100 animate-pulse" />
                                        )}
                                    </AnimatePresence>
                                </div>
                                <AnimatePresence>
                                    {stage >= 1 && (
                                        <motion.span
                                            key="check"
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ delay: stage === 1 ? 0.35 + i * 0.35 : 0, type: 'spring', stiffness: 400, damping: 22 }}
                                        >
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}

                        {/* success bar */}
                        <div className="pt-1 min-h-[40px]">
                            <AnimatePresence mode="wait">
                                {stage === 2 ? (
                                    <motion.div
                                        key="done"
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-center justify-center gap-2 h-10 rounded-lg bg-emerald-600 text-white text-[12px] font-semibold"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Extraction réussie — validation…
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="pending"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-center justify-center h-10 rounded-lg border border-dashed border-slate-200 text-[11px] text-slate-400"
                                    >
                                        Validation ligne par ligne avant l’ajout
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </motion.div>
            ) : (
            /* ── Stage 3: the dashboard, updated with the new facture ── */
            <motion.div
                key="dash-phase"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="p-4 sm:p-6"
            >
                <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] font-semibold h-9 mb-3"
                >
                    <CheckCircle2 className="w-4 h-4" />
                    Facture validée — ajoutée au chantier avec ses 3 articles
                </motion.div>

                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                    {[
                        { label: 'Total chantier', value: '149 955,000 DT', tone: 'slate' as const, delta: '+1 705,000' },
                        { label: 'Payé', value: '96 400,000 DT', tone: 'emerald' as const },
                        { label: 'Solde', value: '53 555,000 DT', tone: 'amber' as const, delta: '+1 705,000' },
                    ].map((t, i) => (
                        <motion.div key={t.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.15 }} className="relative">
                            <StatTile label={t.label} value={t.value} tone={t.tone} />
                            {t.delta && (
                                <motion.span
                                    initial={{ opacity: 0, scale: 0.6 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.9 + i * 0.15, type: 'spring', stiffness: 380, damping: 20 }}
                                    className="absolute -top-2 right-1.5 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-semibold tabular-nums shadow-sm"
                                >
                                    {t.delta}
                                </motion.span>
                            )}
                        </motion.div>
                    ))}
                </div>

                <div className="mt-3 sm:mt-4 rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                        <p className="text-[11px] font-medium text-slate-500">Dernières factures</p>
                        <p className="text-[11px] font-medium text-slate-400">Juillet 2026</p>
                    </div>
                    {/* the freshly added facture */}
                    <motion.div
                        initial={{ opacity: 0, x: -14, backgroundColor: 'rgba(16,185,129,0.14)' }}
                        animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(16,185,129,0.05)' }}
                        transition={{ delay: 0.55, duration: 0.45 }}
                        className="flex items-center justify-between gap-3 px-3 py-2.5"
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[13px] font-medium text-slate-900 truncate">STE Mostakbel</p>
                                <p className="text-[11px] text-slate-400 truncate">Facture N° 2026-0087 — 3 articles</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[13px] font-semibold text-slate-900 tabular-nums">1 705,000 DT</span>
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 1.0, type: 'spring', stiffness: 400, damping: 20 }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-medium whitespace-nowrap"
                            >
                                <Check className="w-3 h-3" />
                                Ajoutée
                            </motion.span>
                        </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}>
                        <FactureRow name="Comptoir du Bâtiment" detail="Briques 12 — 3 000 unités" amount="2 340,000 DT" status="pending" />
                    </motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
                        <FactureRow name="Sanitaire Ben Salah" detail="Plomberie — phase 2" amount="864,500 DT" status="paid" />
                    </motion.div>
                </div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="mt-3 text-center text-[11px] text-slate-400"
                >
                    Totaux, solde fournisseur et articles mis à jour instantanément.
                </motion.p>
            </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
}

/* ---------- Feature tabs (animated explainer per feature) ---------- */

const demoItem = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// Remounts its children on a timer so the staggered entrance loops forever.
function DemoLoop({ children }: { children: React.ReactNode }) {
    const [cycle, setCycle] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setCycle((c) => c + 1), 6000);
        return () => clearInterval(t);
    }, []);
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={cycle}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                variants={{ show: { transition: { staggerChildren: 0.4 } } }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}

function DemoDepenses() {
    return (
        <DemoLoop>
            <motion.div variants={demoItem} className="grid grid-cols-3 gap-2">
                <StatTile label="Total" value="24 180,000" />
                <StatTile label="Payé" value="18 500,000" tone="emerald" />
                <StatTile label="Solde" value="5 680,000" tone="amber" />
            </motion.div>
            <motion.div variants={demoItem} className="mt-2.5 rounded-xl border border-slate-200 bg-white overflow-hidden">
                <FactureRow name="Facture n° 244" detail="14 juil. — 12 articles" amount="1 705,000 DT" status="paid" />
            </motion.div>
            <motion.div variants={demoItem} className="mt-2 rounded-xl border border-slate-200 bg-white overflow-hidden">
                <FactureRow name="Facture n° 239" detail="02 juil. — acompte 2 000 DT" amount="3 120,000 DT" status="pending" />
            </motion.div>
            <motion.p variants={demoItem} className="mt-2.5 text-center text-[11px] text-slate-400">
                Chaque saisie recalcule total, payé et solde.
            </motion.p>
        </DemoLoop>
    );
}

function DemoIA() {
    return (
        <DemoLoop>
            <motion.div variants={demoItem} className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-2.5">
                <div>
                    <p className="text-[10px] text-slate-500">Fournisseur détecté</p>
                    <p className="text-[13px] font-semibold text-slate-900">STE Mostakbel</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </motion.div>
            <motion.div variants={demoItem} className="mt-2 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-2.5">
                <div>
                    <p className="text-[10px] text-slate-500">Montant total</p>
                    <p className="text-[13px] font-semibold text-slate-900 tabular-nums">1 705,000 DT</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </motion.div>
            <motion.div variants={demoItem} className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p className="text-[12px] text-slate-600">3 articles extraits ligne par ligne</p>
                <Chip tone="blue">IA</Chip>
            </motion.div>
            <motion.div variants={demoItem} className="mt-2.5 flex items-center justify-center gap-2 h-9 rounded-lg bg-emerald-600 text-white text-[12px] font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                Vous validez — rien ne s’ajoute sans vous
            </motion.div>
        </DemoLoop>
    );
}

function DemoFournisseurs() {
    const rows = [
        { name: 'STE Mostakbel', paid: '76%', solde: '5 680,000 DT' },
        { name: 'Comptoir du Bâtiment', paid: '48%', solde: '12 340,000 DT' },
        { name: 'Sanitaire Ben Salah', paid: '100%', solde: '0,000 DT' },
    ];
    return (
        <DemoLoop>
            {rows.map((r) => (
                <motion.div key={r.name} variants={demoItem} className="mb-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[13px] font-medium text-slate-900">{r.name}</p>
                        <p className="text-[11px] text-slate-500 tabular-nums">Solde {r.solde}</p>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <motion.div
                            variants={{ hidden: { width: 0 }, show: { width: r.paid, transition: { duration: 0.7, ease: 'easeOut' } } }}
                            className={`h-full rounded-full ${r.paid === '100%' ? 'bg-emerald-500' : 'bg-violet-500'}`}
                        />
                    </div>
                </motion.div>
            ))}
            <motion.p variants={demoItem} className="text-center text-[11px] text-slate-400 mt-1">
                Barre = part payée · l’historique complet est à un clic.
            </motion.p>
        </DemoLoop>
    );
}

function DemoComparateur() {
    const rows = [
        { name: 'Comptoir du Bâtiment', price: '14,500 DT', width: '58%', best: true },
        { name: 'STE Mostakbel', price: '16,800 DT', width: '72%', best: false },
        { name: 'Matériaux El Amen', price: '19,300 DT', width: '100%', best: false },
    ];
    return (
        <DemoLoop>
            <motion.div variants={demoItem} className="flex items-center justify-between mb-2.5">
                <p className="text-[13px] font-medium text-slate-900">Ciment CEM II — sac 50 kg</p>
                <Chip tone="emerald"><Trophy className="w-3 h-3" /> −25 %</Chip>
            </motion.div>
            {rows.map((r) => (
                <motion.div key={r.name} variants={demoItem} className="mb-2">
                    <div className="flex items-center justify-between text-[12px] mb-1">
                        <span className={`flex items-center gap-1.5 font-medium ${r.best ? 'text-emerald-700' : 'text-slate-600'}`}>
                            {r.best && <Trophy className="w-3 h-3" />}
                            {r.name}
                        </span>
                        <span className={`tabular-nums font-semibold ${r.best ? 'text-emerald-700' : 'text-slate-500'}`}>{r.price}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <motion.div
                            variants={{ hidden: { width: 0 }, show: { width: r.width, transition: { duration: 0.7, ease: 'easeOut' } } }}
                            className={`h-full rounded-full ${r.best ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        />
                    </div>
                </motion.div>
            ))}
            <motion.p variants={demoItem} className="text-center text-[11px] text-slate-400 mt-1">
                Le moins cher est repéré automatiquement, prix issus de vos factures.
            </motion.p>
        </DemoLoop>
    );
}

function DemoPhases() {
    return (
        <DemoLoop>
            <motion.div variants={demoItem} className="flex flex-wrap gap-2">
                <Chip tone="blue">Phase 1 · Fondations</Chip>
                <Chip tone="amber">Phase 2 · Gros œuvre</Chip>
                <Chip tone="emerald">Phase 3 · Finitions</Chip>
            </motion.div>
            <motion.div variants={demoItem} className="mt-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <p className="text-[13px] text-slate-700 truncate">Groupe — Commande fer & ciment</p>
                </div>
                <span className="text-[13px] font-semibold text-slate-900 tabular-nums shrink-0">9 420,000 DT</span>
            </motion.div>
            <motion.div variants={demoItem} className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <p className="text-[13px] text-slate-700">Total Phase 2 · Gros œuvre</p>
                </div>
                <span className="text-[13px] font-semibold text-slate-900 tabular-nums">41 260,000 DT</span>
            </motion.div>
            <motion.p variants={demoItem} className="mt-2.5 text-center text-[11px] text-slate-400">
                Chaque facture porte son badge — le coût par étape est immédiat.
            </motion.p>
        </DemoLoop>
    );
}

function DemoEquipe() {
    const members = [
        { initials: 'HB', name: 'Hamza B.', role: 'Admin', tone: 'dark' as const },
        { initials: 'SK', name: 'Sami K.', role: 'Éditeur', tone: 'blue' as const },
        { initials: 'AM', name: 'Amel M.', role: 'Lecteur', tone: 'slate' as const },
    ];
    return (
        <DemoLoop>
            {members.map((m) => (
                <motion.div key={m.initials} variants={demoItem} className="mb-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-semibold text-slate-600">
                            {m.initials}
                        </div>
                        <p className="text-[13px] font-medium text-slate-900">{m.name}</p>
                    </div>
                    <Chip tone={m.tone}>{m.role}</Chip>
                </motion.div>
            ))}
            <motion.div variants={demoItem} className="rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2.5 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <p className="text-[11px] text-rose-700">Le lecteur voit tout, ne peut rien modifier — verrouillé aussi côté base de données.</p>
            </motion.div>
        </DemoLoop>
    );
}

const FEATURES = [
    {
        key: 'depenses',
        icon: Receipt,
        title: 'Dépenses & factures',
        desc: 'Chaque facture enregistrée avec ses articles, montants et acomptes. Totaux calculés automatiquement.',
        bullets: ['Total, payé et solde recalculés à chaque saisie', 'Acomptes et paiements partiels pris en charge', 'Exports PDF en un clic'],
        iconBg: 'bg-sky-50', iconColor: 'text-sky-600',
        demo: DemoDepenses,
    },
    {
        key: 'ia',
        icon: Sparkles,
        title: 'Extraction IA',
        desc: 'Photographiez une facture : fournisseur, montants et articles sont extraits et pré-remplis pour vous.',
        bullets: ['Une photo suffit, même depuis le chantier', 'Articles détectés ligne par ligne', 'Validation manuelle avant tout ajout'],
        iconBg: 'bg-blue-600', iconColor: 'text-white',
        demo: DemoIA,
    },
    {
        key: 'fournisseurs',
        icon: Users,
        title: 'Fournisseurs',
        desc: 'Un espace par fournisseur : total, payé, crédit restant et historique complet des factures.',
        bullets: ['Solde restant visible en permanence', 'Historique complet des factures et acomptes', 'Notes et documents par fournisseur'],
        iconBg: 'bg-violet-50', iconColor: 'text-violet-600',
        demo: DemoFournisseurs,
    },
    {
        key: 'comparateur',
        icon: Scale,
        title: 'Comparateur de prix',
        desc: 'Comparez le prix du même article chez plusieurs fournisseurs et repérez le moins cher en un regard.',
        bullets: ['Prix relevés depuis vos propres factures', 'Meilleur fournisseur identifié par article', 'Écart en dinars et en pourcentage'],
        iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
        demo: DemoComparateur,
    },
    {
        key: 'phases',
        icon: Layers,
        title: 'Phases & groupes',
        desc: 'Organisez le chantier par étape, regroupez les factures liées et suivez le coût de chaque phase.',
        bullets: ['Badges colorés par phase, totaux dédiés', 'Groupes de factures pour les commandes liées', 'Inclusion ou exclusion des totaux au choix'],
        iconBg: 'bg-amber-50', iconColor: 'text-amber-600',
        demo: DemoPhases,
    },
    {
        key: 'equipe',
        icon: ShieldCheck,
        title: 'Équipe & rôles',
        desc: 'Invitez votre équipe avec des rôles précis : admin, éditeur ou lecteur en lecture seule stricte.',
        bullets: ['Invitations par e-mail en un clic', 'Espaces de projet isolés par utilisateur', 'Lecture seule stricte pour les lecteurs'],
        iconBg: 'bg-rose-50', iconColor: 'text-rose-600',
        demo: DemoEquipe,
    },
];

function FeatureTabs() {
    const [active, setActive] = useState(FEATURES[0].key);
    const feature = FEATURES.find((f) => f.key === active) ?? FEATURES[0];
    const Demo = feature.demo;

    return (
        <div className="mt-10">
            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
                {FEATURES.map((f) => {
                    const isActive = f.key === active;
                    return (
                        <button
                            key={f.key}
                            onClick={() => setActive(f.key)}
                            className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                                isActive
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                            }`}
                        >
                            <f.icon className={`w-4 h-4 ${isActive ? 'text-white' : feature && f.iconColor === 'text-white' ? 'text-blue-600' : f.iconColor}`} />
                            {f.title}
                        </button>
                    );
                })}
            </div>

            {/* Panel */}
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={feature.key}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                        className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center p-5 sm:p-8 lg:p-10"
                    >
                        <div className="min-w-0">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${feature.iconBg}`}>
                                <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
                            </div>
                            <h3 className="mt-4 text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">{feature.title}</h3>
                            <p className="mt-2.5 text-sm sm:text-[15px] text-slate-600 leading-relaxed">{feature.desc}</p>
                            <ul className="mt-5 space-y-2.5">
                                {feature.bullets.map((b) => (
                                    <li key={b} className="flex items-start gap-2.5 text-sm text-slate-700">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                        {b}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 min-h-[280px] flex flex-col justify-center min-w-0 overflow-hidden">
                            <Demo />
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

/* ---------- Page ---------- */

export default function LandingPage() {
    const { user, isApproved } = useAuth();
    const loggedIn = Boolean(user && isApproved);
    const appHref = loggedIn ? '/expenses' : '/login';

    const navLinks = [
        { name: 'Fonctionnalités', href: '#fonctionnalites' },
        { name: 'IA', href: '#ia' },
        { name: 'Comment ça marche', href: '#comment' },
    ];

    const stats = [
        { value: '3 s', label: 'pour ajouter une facture par photo', color: 'text-blue-600' },
        { value: '100 %', label: 'de vos dépenses tracées, au dinar près', color: 'text-emerald-600' },
        { value: '0 DT', label: 'pour commencer — création de compte gratuite', color: 'text-violet-600' },
        { value: '24/7', label: 'accessible partout, mobile et ordinateur', color: 'text-amber-500' },
    ];

    const steps = [
        {
            icon: UserPlus,
            title: 'Créez votre compte',
            desc: 'Inscription gratuite en quelques secondes. Votre premier projet de chantier est prêt immédiatement.',
            iconBg: 'bg-blue-600', numColor: 'text-blue-100',
        },
        {
            icon: Camera,
            title: 'Ajoutez vos factures',
            desc: 'Saisissez fournisseurs et factures à la main, ou photographiez-les et laissez l’IA remplir les champs.',
            iconBg: 'bg-violet-600', numColor: 'text-violet-100',
        },
        {
            icon: LineChart,
            title: 'Suivez vos coûts',
            desc: 'Totaux, soldes et comparaisons de prix se mettent à jour en temps réel, phase par phase.',
            iconBg: 'bg-emerald-600', numColor: 'text-emerald-100',
        },
    ];

    return (
        <div className="min-h-screen bg-white text-slate-900 font-jakarta antialiased scroll-smooth">

            {/* ============ NAV ============ */}
            <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-lg border-b border-slate-200/70">
                <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                    <a href="#" className="flex items-center gap-2 shrink-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center">
                            <HardHat className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold tracking-tight text-slate-900">HouseExpert</span>
                    </a>

                    <div className="hidden md:flex items-center gap-7">
                        {navLinks.map((item) => (
                            <a
                                key={item.href}
                                href={item.href}
                                className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                {item.name}
                            </a>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {loggedIn ? (
                            <Link
                                href="/expenses"
                                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                            >
                                Ouvrir le tableau de bord
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="hidden sm:inline-flex items-center h-10 px-4 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                    Se connecter
                                </Link>
                                <Link
                                    href="/login"
                                    className="inline-flex items-center h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                                >
                                    Commencer
                                </Link>
                            </>
                        )}
                    </div>
                </nav>
            </header>

            {/* ============ HERO ============ */}
            <section className="relative overflow-hidden">
                {/* subtle grid background */}
                <div
                    aria-hidden
                    className="absolute inset-0 [background-image:linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] [background-size:36px_36px] opacity-40 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
                />
                {/* soft color glows */}
                <div aria-hidden className="absolute -top-32 left-1/2 -translate-x-1/2 w-[30rem] h-[16rem] rounded-full bg-blue-200/25 blur-3xl pointer-events-none" />
                <div aria-hidden className="absolute top-52 right-[6%] w-56 h-56 rounded-full bg-emerald-200/15 blur-3xl pointer-events-none hidden sm:block" />
                <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20">
                    <div className="max-w-3xl mx-auto text-center">
                        <Reveal>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-xs font-medium text-blue-700 mb-6">
                                <Sparkles className="w-3.5 h-3.5" />
                                Factures scannées et remplies par IA
                            </div>
                        </Reveal>
                        <Reveal delay={0.05}>
                            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-slate-900 leading-[1.05]">
                                Votre chantier.
                                <br />
                                Chaque dinar,{' '}
                                <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-500 bg-clip-text text-transparent">
                                    sous contrôle.
                                </span>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                                HouseExpert centralise les dépenses de votre chantier : fournisseurs, factures,
                                acomptes et soldes — avec une extraction par IA qui lit vos factures photographiées
                                à votre place.
                            </p>
                        </Reveal>
                        <Reveal delay={0.15}>
                            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                                <Link
                                    href={appHref}
                                    className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors w-full sm:w-auto"
                                >
                                    {loggedIn ? 'Ouvrir le tableau de bord' : 'Commencer gratuitement'}
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                                <a
                                    href="#fonctionnalites"
                                    className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors w-full sm:w-auto"
                                >
                                    Voir les fonctionnalités
                                </a>
                            </div>
                        </Reveal>
                    </div>

                    {/* Hero — live AI scan demo (looping) */}
                    <Reveal delay={0.2} className="mt-14 sm:mt-16">
                        <HeroScanDemo />
                    </Reveal>
                </div>
            </section>

            {/* ============ STATS STRIP ============ */}
            <section className="border-y border-slate-200 bg-slate-50/60">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
                        {stats.map((s, i) => (
                            <Reveal key={s.value} delay={i * 0.05}>
                                <div className="text-center lg:text-left">
                                    <p className={`text-4xl sm:text-5xl font-semibold tracking-tight tabular-nums ${s.color}`}>
                                        {s.value}
                                    </p>
                                    <p className="mt-2 text-sm text-slate-500 leading-snug">{s.label}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ FEATURES GRID ============ */}
            <section id="fonctionnalites" className="scroll-mt-20">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
                    <Reveal>
                        <div className="max-w-2xl">
                            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
                                Tout votre chantier, un seul outil.
                            </h2>
                            <p className="mt-4 text-slate-600 leading-relaxed">
                                Fini les carnets, les tickets perdus et les tableurs éparpillés. HouseExpert réunit
                                tout ce qu’il faut pour piloter les dépenses d’un chantier, du premier sac de ciment
                                à la dernière finition.
                            </p>
                        </div>
                    </Reveal>
                    <Reveal delay={0.08}>
                        <FeatureTabs />
                    </Reveal>
                </div>
            </section>

            {/* ============ DARK SECTION — IA ============ */}
            <section id="ia" className="relative bg-slate-900 text-white scroll-mt-20 overflow-hidden">
                <div aria-hidden className="absolute -top-32 -left-24 w-[30rem] h-[30rem] rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />
                <div aria-hidden className="absolute -bottom-40 -right-24 w-[26rem] h-[26rem] rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
                <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        <Reveal>
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-blue-300 mb-6">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Extraction intelligente
                                </div>
                                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight">
                                    Scannez. L’IA remplit.
                                    <br />
                                    Vous validez.
                                </h2>
                                <p className="mt-5 text-slate-300 leading-relaxed max-w-lg">
                                    Une facture papier de votre fournisseur ? Une simple photo suffit. L’IA lit le
                                    document et prépare la saisie — vous gardez toujours le dernier mot.
                                </p>
                                <ul className="mt-8 space-y-5">
                                    {[
                                        {
                                            title: 'Photographiez la facture',
                                            desc: 'Depuis votre téléphone, sur le chantier ou au bureau. L’image est compressée et analysée en quelques secondes.',
                                        },
                                        {
                                            title: 'L’IA extrait les données',
                                            desc: 'Fournisseur, date, montants, acomptes et liste des articles sont détectés et pré-remplis automatiquement.',
                                        },
                                        {
                                            title: 'Validez ligne par ligne',
                                            desc: 'Vous vérifiez et corrigez chaque champ avant l’enregistrement. Rien n’est ajouté sans votre accord.',
                                        },
                                    ].map((step, i) => (
                                        <li key={step.title} className="flex gap-4">
                                            <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shrink-0 text-[13px] font-semibold text-blue-300 tabular-nums">
                                                {i + 1}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">{step.title}</p>
                                                <p className="mt-1 text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </Reveal>

                        {/* Mock scan card */}
                        <Reveal delay={0.1}>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
                                <div className="rounded-2xl bg-white text-slate-900 overflow-hidden shadow-2xl">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                                        <div className="flex items-center gap-2">
                                            <ScanLine className="w-4 h-4 text-blue-600" />
                                            <p className="text-[13px] font-medium text-slate-700">Analyse de la facture</p>
                                        </div>
                                        <Chip tone="blue">IA · terminé</Chip>
                                    </div>
                                    <div className="p-4 space-y-2.5">
                                        <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-2.5">
                                            <div>
                                                <p className="text-[11px] text-slate-500">Fournisseur</p>
                                                <p className="text-sm font-medium text-slate-900">STE Mostakbel</p>
                                            </div>
                                            <CheckCircle2 className="w-[18px] h-[18px] text-blue-600" />
                                        </div>
                                        <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-2.5">
                                            <div>
                                                <p className="text-[11px] text-slate-500">Montant total</p>
                                                <p className="text-sm font-semibold text-slate-900 tabular-nums">1 705,000 DT</p>
                                            </div>
                                            <CheckCircle2 className="w-[18px] h-[18px] text-blue-600" />
                                        </div>
                                        <div className="rounded-xl border border-slate-200 px-3 py-2.5">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[11px] text-slate-500">Articles détectés</p>
                                                <Chip tone="blue">3</Chip>
                                            </div>
                                            <div className="mt-2 space-y-1.5">
                                                {[
                                                    ['Ciment CEM II 42,5', '32 × 14,500 DT'],
                                                    ['Fer à béton Ø12', '40 × 28,000 DT'],
                                                    ['Treillis soudé', '6 × 19,500 DT'],
                                                ].map(([name, qty]) => (
                                                    <div key={name} className="flex items-center justify-between text-[12px]">
                                                        <span className="text-slate-700">{name}</span>
                                                        <span className="text-slate-500 tabular-nums">{qty}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="pt-1.5 flex items-center gap-2">
                                            <div className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-blue-600 text-white text-sm font-medium">
                                                <Check className="w-4 h-4" />
                                                Valider et ajouter
                                            </div>
                                            <div className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-600">
                                                Corriger
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-4 text-center text-xs text-slate-400">
                                    Aperçu du flux de validation — chaque champ reste modifiable avant l’ajout.
                                </p>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* ============ TERRAIN — mobile quick-add ============ */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    <Reveal>
                        <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-200 bg-amber-50 text-xs font-medium text-amber-700 mb-6">
                                <HardHat className="w-3.5 h-3.5" />
                                Pensé pour le terrain
                            </div>
                            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-slate-900">
                                Une facture ajoutée depuis le chantier, en 3 secondes.
                            </h2>
                            <p className="mt-4 text-slate-600 leading-relaxed">
                                Pas d’ordinateur sur le dépôt ? Aucun problème. Ouvrez HouseExpert sur votre
                                téléphone, photographiez le bon, choisissez le fournisseur, tapez le montant —
                                c’est envoyé en file de vérification avant même de remonter dans la voiture.
                            </p>
                            <ul className="mt-6 space-y-3">
                                {[
                                    'Ajout rapide : photo + fournisseur + montant, rien de plus',
                                    'File de vérification — rien ne compte avant votre validation',
                                    'Installable sur l’écran d’accueil, comme une vraie app',
                                ].map((item) => (
                                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </Reveal>
                    <Reveal delay={0.08}>
                        {/* phone mockup */}
                        <div className="relative mx-auto w-[290px]">
                            {/* glow to seat the device */}
                            <div aria-hidden className="absolute -inset-8 rounded-full bg-gradient-to-br from-amber-100/60 via-transparent to-blue-100/60 blur-2xl" />
                            {/* frame — iPhone Pro Max proportions */}
                            <div className="relative rounded-[3rem] bg-slate-900 p-[10px] shadow-[0_30px_70px_-30px_rgba(15,23,42,0.5)]">
                                {/* side buttons */}
                                <div aria-hidden className="absolute -left-[2px] top-28 w-[3px] h-8 rounded-l bg-slate-700" />
                                <div aria-hidden className="absolute -left-[2px] top-40 w-[3px] h-12 rounded-l bg-slate-700" />
                                <div aria-hidden className="absolute -right-[2px] top-36 w-[3px] h-16 rounded-r bg-slate-700" />
                                {/* screen */}
                                <div className="relative rounded-[2.4rem] bg-slate-50 overflow-hidden h-[590px] flex flex-col">
                                    {/* dynamic island */}
                                    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-[22px] rounded-full bg-slate-900 z-10" />
                                    {/* status bar */}
                                    <div className="flex items-center justify-between px-7 pt-3.5 pb-1 shrink-0">
                                        <span className="text-[11px] font-semibold text-slate-900 tabular-nums">9:41</span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-3.5 h-2 rounded-[2px] bg-slate-300" />
                                            <span className="w-4 h-2 rounded-[2px] bg-slate-900" />
                                        </span>
                                    </div>
                                    {/* app content */}
                                    <div className="px-4 pt-3 pb-2 space-y-3.5 flex-1">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                                                <Camera className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-[14px] font-semibold text-slate-900 leading-tight">Ajout rapide</p>
                                                <p className="text-[10px] text-slate-400">Photo → file de vérification</p>
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-white h-[104px] flex flex-col items-center justify-center gap-1.5">
                                            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
                                                <Camera className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <p className="text-[10px] font-medium text-slate-500">bon_goddi_0712.jpg <span className="text-emerald-600">✓</span></p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                                            <p className="text-[9px] text-slate-400 uppercase tracking-wide">Fournisseur</p>
                                            <p className="text-[13px] font-medium text-slate-900 mt-0.5">Goddi</p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                                            <p className="text-[9px] text-slate-400 uppercase tracking-wide">Montant (DT)</p>
                                            <p className="text-[13px] font-semibold text-slate-900 tabular-nums mt-0.5">340,000</p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[9px] text-slate-400 uppercase tracking-wide">Phase</p>
                                                <span className="text-[8px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full">Suggérée</span>
                                            </div>
                                            <p className="text-[13px] font-medium text-slate-900 mt-0.5">Phase 2 · Gros œuvre</p>
                                        </div>
                                        <div className="rounded-xl bg-slate-900 text-white text-[12px] font-semibold h-11 flex items-center justify-center gap-1.5">
                                            <Check className="w-3.5 h-3.5" />
                                            Envoyer en vérification
                                        </div>
                                        <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-medium px-3 h-9 flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                            Reçu — en attente de validation
                                        </div>
                                    </div>
                                    {/* home indicator */}
                                    <div className="shrink-0 pb-2 pt-1">
                                        <div className="mx-auto w-28 h-1 rounded-full bg-slate-300" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ============ CONFIANCE ============ */}
            <section className="border-y border-slate-200 bg-slate-50/60">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
                    <Reveal>
                        <div className="max-w-2xl mx-auto text-center">
                            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
                                Vos données restent les vôtres.
                            </h2>
                            <p className="mt-4 text-slate-600 leading-relaxed">
                                Un chantier, c’est des montants sensibles. HouseExpert est conçu pour que vous
                                gardiez le contrôle à chaque étape.
                            </p>
                        </div>
                    </Reveal>
                    <div className="mt-12 grid sm:grid-cols-3 gap-4 sm:gap-5">
                        {[
                            {
                                icon: ShieldCheck,
                                iconBg: 'bg-violet-50', iconColor: 'text-violet-600',
                                title: 'Espace 100 % isolé',
                                desc: 'Chaque compte a son propre chantier. Vos fournisseurs, prix et factures ne sont visibles que par vous et les personnes que vous invitez.',
                            },
                            {
                                icon: Sparkles,
                                iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
                                title: 'L’IA propose, vous décidez',
                                desc: 'Aucune donnée extraite n’entre dans vos comptes sans votre validation explicite, ligne par ligne.',
                            },
                            {
                                icon: Lock,
                                iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
                                title: 'Rôles stricts',
                                desc: 'Admin, éditeur ou lecteur : les droits sont appliqués jusqu’à la base de données — un lecteur ne peut vraiment rien modifier.',
                            },
                        ].map((c, i) => (
                            <Reveal key={c.title} delay={i * 0.06}>
                                <div className="h-full rounded-2xl border border-slate-200 bg-white p-6">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.iconBg}`}>
                                        <c.icon className={`w-5 h-5 ${c.iconColor}`} />
                                    </div>
                                    <h3 className="mt-4 font-semibold text-slate-900">{c.title}</h3>
                                    <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{c.desc}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ COMMENT ÇA MARCHE ============ */}
            <section id="comment" className="border-t border-slate-200 bg-slate-50/60 scroll-mt-20">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
                    <Reveal>
                        <div className="max-w-2xl">
                            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
                                Comment ça marche
                            </h2>
                            <p className="mt-4 text-slate-600 leading-relaxed">
                                Trois étapes suffisent pour reprendre la main sur le budget de votre chantier.
                            </p>
                        </div>
                    </Reveal>
                    <div className="mt-12 grid md:grid-cols-3 gap-4 sm:gap-6">
                        {steps.map((step, i) => (
                            <Reveal key={step.title} delay={i * 0.06}>
                                <div className="relative h-full rounded-2xl border border-slate-200 bg-white p-6">
                                    <span className={`absolute top-6 right-6 text-4xl font-semibold tabular-nums select-none ${step.numColor}`}>
                                        {i + 1}
                                    </span>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${step.iconBg}`}>
                                        <step.icon className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="mt-5 font-semibold text-slate-900">{step.title}</h3>
                                    <p className="mt-2 text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ FINAL CTA ============ */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
                <Reveal>
                    <div className="rounded-3xl bg-slate-900 px-6 sm:px-12 py-14 sm:py-20 text-center relative overflow-hidden">
                        <div
                            aria-hidden
                            className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_65%_80%_at_50%_50%,black,transparent)]"
                        />
                        <div aria-hidden className="absolute -top-20 left-[15%] w-80 h-80 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
                        <div aria-hidden className="absolute -bottom-24 right-[12%] w-72 h-72 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
                        <div className="relative">
                            <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white leading-tight">
                                Reprenez la main sur
                                <br className="hidden sm:block" />
                                {' '}le budget de votre chantier.
                            </h2>
                            <p className="mt-5 text-slate-300 max-w-xl mx-auto leading-relaxed">
                                Créez votre compte gratuitement et ajoutez votre première facture en moins d’une
                                minute — à la main ou en photo.
                            </p>
                            <div className="mt-8">
                                <Link
                                    href={appHref}
                                    className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl bg-white text-slate-900 text-sm font-semibold hover:bg-slate-100 transition-colors"
                                >
                                    {loggedIn ? 'Ouvrir le tableau de bord' : 'Commencer gratuitement'}
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </Reveal>
            </section>

            {/* ============ FOOTER ============ */}
            <footer className="border-t border-slate-200">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
                        <div className="sm:col-span-2 space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center">
                                    <HardHat className="w-4 h-4 text-white" />
                                </div>
                                <span className="font-semibold tracking-tight text-slate-900">HouseExpert</span>
                            </div>
                            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
                                Le suivi des dépenses de chantier, simple et précis — fournisseurs, factures et
                                extraction par IA, en dinars.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-slate-900 mb-4">Produit</h4>
                            <ul className="space-y-2.5 text-sm text-slate-500">
                                <li><a href="#fonctionnalites" className="hover:text-slate-900 transition-colors">Fonctionnalités</a></li>
                                <li><a href="#ia" className="hover:text-slate-900 transition-colors">Extraction IA</a></li>
                                <li><a href="#comment" className="hover:text-slate-900 transition-colors">Comment ça marche</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-slate-900 mb-4">Compte</h4>
                            <ul className="space-y-2.5 text-sm text-slate-500">
                                <li><Link href="/login" className="hover:text-slate-900 transition-colors">Se connecter</Link></li>
                                <li><Link href="/login" className="hover:text-slate-900 transition-colors">S’inscrire</Link></li>
                                {loggedIn && (
                                    <li>
                                        <Link href="/expenses" className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors">
                                            Tableau de bord
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                    <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-xs text-slate-400">© 2026 HouseExpert. Tous droits réservés.</p>
                        <p className="text-xs text-slate-400">Conçu pour les chantiers en Tunisie</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
