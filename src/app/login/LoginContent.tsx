'use client';

import { useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { AUTH_EMAIL_BASE } from '@/lib/app-url';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft, HardHat, ArrowRight, Check, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const inputClass =
    'w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition';

export default function LoginContent() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);

    // Initial mode from query params
    const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const m = params.get('mode');
            if (m === 'signup' || m === 'forgot' || m === 'signin') return m;
        }
        return 'signin';
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleAuth = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        // Get returnUrl from search params
        const params = new URLSearchParams(window.location.search);
        const returnUrl = params.get('returnUrl') || '/expenses';

        try {
            if (mode === 'signin') {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push(returnUrl);
            } else if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${AUTH_EMAIL_BASE}/auth/callback?next=${encodeURIComponent(returnUrl)}`,
                    },
                });
                if (error) throw error;
                setMessage('Vérifiez vos e-mails pour le lien de confirmation.');
            } else if (mode === 'forgot') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${AUTH_EMAIL_BASE}/auth/update-password`,
                });
                if (error) throw error;
                setMessage('Instructions envoyées par e-mail.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [mode, email, password, supabase, router]);

    const title =
        mode === 'signin' ? 'Bon retour' :
        mode === 'signup' ? 'Créer votre compte' :
        'Mot de passe oublié';

    const subtitle =
        mode === 'signin' ? 'Connectez-vous pour retrouver votre chantier.' :
        mode === 'signup' ? 'Quelques secondes suffisent pour commencer.' :
        'Entrez votre e-mail, nous vous envoyons les instructions.';

    return (
        <div className="min-h-screen bg-white font-jakarta antialiased lg:grid lg:grid-cols-2">

            {/* ============ LEFT — FORM ============ */}
            <div className="flex min-h-screen flex-col px-6 py-8 sm:px-10">
                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-sm mx-auto flex flex-1 flex-col"
                >
                    {/* Logo */}
                    <div className="flex items-center justify-between">
                        <Link href="/" className="inline-flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center">
                                <HardHat className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-semibold tracking-tight text-slate-900">HouseExpert</span>
                        </Link>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-700 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Retour
                        </Link>
                    </div>

                    <div className="flex-1 flex flex-col justify-center py-12">
                        {/* Heading */}
                        <div className="mb-8">
                            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                                {title}
                            </h1>
                            <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
                        </div>

                        {/* Banners */}
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    key="error"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3">
                                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                                        <p className="text-sm text-rose-700 leading-snug">{error}</p>
                                    </div>
                                </motion.div>
                            )}

                            {message && (
                                <motion.div
                                    key="message"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3">
                                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                                        <p className="text-sm text-emerald-700 leading-snug">{message}</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Form */}
                        <form onSubmit={handleAuth} className="space-y-4">
                            <div>
                                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                                    Adresse e-mail
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={inputClass}
                                    placeholder="nom@exemple.com"
                                />
                            </div>

                            {mode !== 'forgot' && (
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="block text-[13px] font-medium text-slate-700">
                                            Mot de passe
                                        </label>
                                        {mode === 'signin' && (
                                            <button
                                                type="button"
                                                onClick={() => setMode('forgot')}
                                                className="text-[13px] font-medium text-slate-400 hover:text-slate-700 transition-colors"
                                            >
                                                Mot de passe oublié ?
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className={`${inputClass} pr-11`}
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-colors group"
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        {mode === 'signin' && 'Se connecter'}
                                        {mode === 'signup' && 'Créer mon compte'}
                                        {mode === 'forgot' && 'Envoyer le lien'}
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                    </>
                                )}
                            </button>

                            {mode === 'signup' && (
                                <p className="text-center text-xs text-slate-400 leading-relaxed">
                                    Gratuit — votre espace chantier est créé automatiquement.
                                </p>
                            )}
                        </form>

                        {/* Mode switch */}
                        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-sm text-slate-500">
                            {mode === 'signin' && (
                                <p>
                                    Pas encore de compte ?{' '}
                                    <button
                                        onClick={() => setMode('signup')}
                                        className="font-medium text-slate-900 hover:underline underline-offset-4"
                                    >
                                        S&rsquo;inscrire
                                    </button>
                                </p>
                            )}
                            {mode === 'signup' && (
                                <p>
                                    Déjà un compte ?{' '}
                                    <button
                                        onClick={() => setMode('signin')}
                                        className="font-medium text-slate-900 hover:underline underline-offset-4"
                                    >
                                        Se connecter
                                    </button>
                                </p>
                            )}
                            {mode === 'forgot' && (
                                <button
                                    onClick={() => setMode('signin')}
                                    className="inline-flex items-center gap-1.5 font-medium text-slate-900 hover:underline underline-offset-4"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    Retour à la connexion
                                </button>
                            )}
                        </div>
                    </div>

                    <p className="text-center text-xs text-slate-300 select-none">
                        Connexion sécurisée · HouseExpert
                    </p>
                </motion.div>
            </div>

            {/* ============ RIGHT — DARK PANEL (lg+) ============ */}
            <div className="hidden lg:flex relative overflow-hidden bg-slate-900 text-white">
                {/* subtle grid */}
                <div
                    aria-hidden
                    className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_40%,black,transparent)]"
                />
                {/* soft glow */}
                <div aria-hidden className="absolute -top-32 right-0 w-[28rem] h-[28rem] rounded-full bg-blue-600/15 blur-[120px]" />

                <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="relative w-full max-w-lg mx-auto flex flex-col justify-center px-10 py-16"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-blue-300 mb-6 self-start">
                        <Sparkles className="w-3.5 h-3.5" />
                        Suivi de chantier intelligent
                    </div>

                    <h2 className="text-3xl xl:text-4xl font-semibold tracking-tight leading-tight">
                        Chaque dinar,
                        <br />
                        sous contrôle.
                    </h2>

                    <ul className="mt-8 space-y-4">
                        {[
                            'Suivi en temps réel des dépenses du chantier',
                            'Extraction des factures par IA, une photo suffit',
                            'Comparateur de prix entre fournisseurs',
                        ].map((item) => (
                            <li key={item} className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center shrink-0 mt-0.5">
                                    <Check className="w-3 h-3 text-emerald-400" />
                                </div>
                                <p className="text-sm text-slate-300 leading-relaxed">{item}</p>
                            </li>
                        ))}
                    </ul>

                    {/* Mini dashboard mockup */}
                    <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                        <div className="rounded-xl bg-white text-slate-900 overflow-hidden shadow-2xl">
                            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/70">
                                <p className="text-[11px] font-medium text-slate-500">Chantier — Villa El Menzah</p>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700">
                                    À jour
                                </span>
                            </div>
                            <div className="p-3.5">
                                <div className="grid grid-cols-3 gap-2.5">
                                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                        <p className="text-[11px] text-slate-500">Total</p>
                                        <p className="text-sm font-semibold tabular-nums mt-0.5 text-slate-900">148 250 DT</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                        <p className="text-[11px] text-slate-500">Payé</p>
                                        <p className="text-sm font-semibold tabular-nums mt-0.5 text-emerald-600">96 400 DT</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                        <p className="text-[11px] text-slate-500">Solde</p>
                                        <p className="text-sm font-semibold tabular-nums mt-0.5 text-amber-600">51 850 DT</p>
                                    </div>
                                </div>
                                <div className="mt-2.5 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                        <p className="text-[12px] font-medium text-slate-700">Facture scannée par IA</p>
                                    </div>
                                    <p className="text-[12px] font-semibold tabular-nums text-slate-900">1 705,000 DT</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
