'use client';

import { useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft, Building2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);

    const handleAuth = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (mode === 'signin') {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push('/expenses');
            } else if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${location.origin}/auth/callback`,
                    },
                });
                if (error) throw error;
                setMessage('Vérifiez vos e-mails pour le lien de confirmation.');
            } else if (mode === 'forgot') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${location.origin}/auth/update-password`,
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

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 relative overflow-hidden font-jakarta selection:bg-[#FFB800] selection:text-black">

            {/* Background Decorative Elements */}
            <div className="absolute inset-0 z-0 opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#FFB800] rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/10 rounded-full blur-[150px]" />
            </div>

            {/* Grain Overlay */}
            <div className="grain" />

            {/* Back to Home Navigation */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-10 left-10 z-20"
            >
                <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-[#FFB800] transition-colors text-[10px] font-black uppercase tracking-widest group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Retour à l'accueil
                </Link>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-md relative z-10"
            >
                {/* Branding */}
                <div className="flex flex-col items-center mb-12 space-y-4">
                    <div className="w-16 h-16 bg-[#FFB800] rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(255,184,0,0.2)]">
                        <Building2 className="text-black w-8 h-8" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-sm font-black text-[#FFB800] uppercase tracking-[0.4em] mb-1">HouseExpert</h2>
                        <div className="h-[2px] w-8 bg-white/20 mx-auto" />
                    </div>
                </div>

                {/* Form Container */}
                <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 md:p-12 shadow-2xl relative">
                    <div className="mb-10">
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-3">
                            {mode === 'signin' && 'Bon retour'}
                            {mode === 'signup' && 'Nous rejoindre'}
                            {mode === 'forgot' && 'Réinitialiser'}
                        </h1>
                        <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest leading-relaxed">
                            {mode === 'signin' && 'Accédez à votre tableau de bord de construction'}
                            {mode === 'signup' && 'Commencez à gérer vos projets avec précision'}
                            {mode === 'forgot' && 'Entrez votre mail pour recevoir les instructions'}
                        </p>
                    </div>

                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-8 overflow-hidden"
                            >
                                <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl flex items-start gap-3">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                    <p className="text-[10px] font-black uppercase tracking-wider leading-relaxed">{error}</p>
                                </div>
                            </motion.div>
                        )}

                        {message && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-8 overflow-hidden"
                            >
                                <div className="bg-[#FFB800]/10 border border-[#FFB800]/20 text-[#FFB800] px-4 py-3 rounded-xl flex items-start gap-3">
                                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                    <p className="text-[10px] font-black uppercase tracking-wider leading-relaxed">{message}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleAuth} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-[9px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Adresse Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800] transition-all placeholder:text-white/10 text-sm"
                                placeholder="nom@exemple.com"
                            />
                        </div>

                        {mode !== 'forgot' && (
                            <div className="space-y-2">
                                <label className="block text-[9px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Mot de passe</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800] transition-all placeholder:text-white/10 text-sm"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-[#FFB800] transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#FFB800] text-black font-black py-5 rounded-2xl hover:bg-white transition-all flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed text-[11px] uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(255,184,0,0.15)]"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    {mode === 'signin' && 'Se connecter'}
                                    {mode === 'signup' && 'Créer mon compte'}
                                    {mode === 'forgot' && 'M\'envoyer le lien'}
                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 pt-10 border-t border-white/5 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">
                        {mode === 'signin' ? (
                            <>
                                <button onClick={() => setMode('signup')} className="hover:text-[#FFB800] transition-colors">Créer un compte</button>
                                <div className="w-1.5 h-1.5 rounded-full bg-white/5" />
                                <button onClick={() => setMode('forgot')} className="hover:text-[#FFB800] transition-colors">Mot de passe oublié ?</button>
                            </>
                        ) : (
                            <button onClick={() => setMode('signin')} className="hover:text-[#FFB800] transition-colors flex items-center gap-2">
                                <ArrowLeft className="w-3 h-3" />
                                Retour à la connexion
                            </button>
                        )}
                    </div>
                </div>

                {/* Secure Trust Indicator */}
                <div className="mt-8 flex items-center justify-center gap-3 opacity-30 select-none">
                    <div className="h-px w-8 bg-white/20" />
                    <span className="text-[8px] font-black uppercase tracking-[0.5em] text-white">Connexion Sécurisée</span>
                    <div className="h-px w-8 bg-white/20" />
                </div>
            </motion.div>
        </div>
    );
}
