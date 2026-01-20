'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { CheckCircle2, XCircle, Loader2, Mail, Eye, EyeOff, Building2, ChevronRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function AcceptInvitePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    // Core Invitation State
    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'unauthenticated'>('loading');
    const [message, setMessage] = useState('Vérification de l\'invitation...');
    const [inviteDetails, setInviteDetails] = useState<{ project_name: string; email: string } | null>(null);

    // Integrated Auth State
    const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const supabase = useMemo(() => createClient(), []);

    const acceptInviteFlow = useCallback(async () => {
        if (!token) return;
        setStatus('loading');
        setMessage('Acceptation de l\'invitation...');

        try {
            const { data, error } = await supabase.rpc('accept_project_invitation', {
                invite_token: token
            });

            if (error) throw error;

            if (data && data.success) {
                setStatus('success');
                setMessage(data.message || 'Invitation acceptée avec succès !');
                setTimeout(() => router.push('/expenses'), 2000);
            } else {
                setStatus('error');
                setMessage(data?.error || 'Erreur lors de l\'acceptation.');
            }
        } catch (error: any) {
            console.error('Error in flow:', error);
            setStatus('error');
            setMessage(error.message || 'Une erreur est survenue.');
        }
    }, [token, router, supabase]);

    useEffect(() => {
        const checkInvite = async () => {
            if (!token) {
                setStatus('error');
                setMessage('Lien d\'invitation invalide (token manquant).');
                return;
            }

            try {
                // 1. Check if token is valid publicly
                const { data: details, error: detailsError } = await supabase.rpc('get_invitation_details', {
                    invite_token: token
                });

                if (detailsError) {
                    console.error('Error fetching details:', detailsError);
                    if (!detailsError.message?.includes('function')) throw detailsError;
                } else if (!details.success) {
                    setStatus('error');
                    setMessage(details.error || 'Invitation invalide.');
                    return;
                } else {
                    setInviteDetails(details);
                    setEmail(details.email); // Pre-fill email from invitation
                }

                // 2. Check session
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setStatus('unauthenticated');
                    setAuthMode('signup'); // Default to signup for invited users
                    return;
                }

                // 3. User is already logged in, try to accept immediately
                await acceptInviteFlow();

            } catch (error: any) {
                console.error('Error checking invite:', error);
                setStatus('error');
                setMessage(error.message || 'Une erreur est survenue.');
            }
        };

        checkInvite();
    }, [token, supabase, acceptInviteFlow]);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError(null);

        try {
            if (authMode === 'signin') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                // session changed listener will eventually trigger acceptInviteFlow but let's just trigger it manually too
                await acceptInviteFlow();
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(`/invite/accept?token=${token}`)}`,
                    },
                });
                if (error) throw error;
                setStatus('loading');
                setMessage('Vérifiez vos e-mails pour le lien de confirmation.');
            }
        } catch (err: any) {
            setAuthError(err.message);
        } finally {
            setAuthLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 relative overflow-hidden font-jakarta selection:bg-[#FFB800] selection:text-black">

            {/* Premium Background */}
            <div className="absolute inset-0 z-0 opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#FFB800] rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[150px]" />
            </div>
            <div className="grain" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-lg relative z-10"
            >
                {/* Branding */}
                <div className="flex flex-col items-center mb-10 space-y-4">
                    <div className="w-16 h-16 bg-[#FFB800] rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(255,184,0,0.2)]">
                        <Building2 className="text-black w-8 h-8" />
                    </div>
                </div>

                <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative">

                    {/* Status Top Bar */}
                    <div className="bg-white/5 border-b border-white/10 px-8 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#FFB800] animate-pulse" />
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Système d'Invitation</span>
                        </div>
                        {inviteDetails && (
                            <span className="text-[9px] font-black text-[#FFB800] uppercase tracking-[0.2em]">
                                Vers: {inviteDetails.project_name}
                            </span>
                        )}
                    </div>

                    <div className="p-10 md:p-12">
                        <AnimatePresence mode="wait">
                            {status === 'loading' && (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="flex flex-col items-center gap-6 py-10"
                                >
                                    <div className="relative">
                                        <div className="w-16 h-16 border-4 border-white/5 border-t-[#FFB800] rounded-full animate-spin" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Building2 className="w-6 h-6 text-[#FFB800]/40" />
                                        </div>
                                    </div>
                                    <p className="text-[11px] font-black text-white/50 uppercase tracking-[0.3em] animate-pulse">
                                        {message}
                                    </p>
                                </motion.div>
                            )}

                            {status === 'success' && (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col items-center gap-6 py-10 text-center"
                                >
                                    <div className="w-20 h-20 bg-emerald-500/20 rounded-[2rem] flex items-center justify-center">
                                        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Bienvenue !</h2>
                                        <p className="text-[11px] font-bold text-emerald-400/80 uppercase tracking-widest">{message}</p>
                                    </div>
                                    <p className="text-[9px] text-white/30 uppercase tracking-[0.2em]">Redirection automatique...</p>
                                </motion.div>
                            )}

                            {status === 'error' && (
                                <motion.div
                                    key="error"
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col items-center gap-6 py-10 text-center"
                                >
                                    <div className="w-20 h-20 bg-red-500/20 rounded-[2rem] flex items-center justify-center">
                                        <XCircle className="h-10 w-10 text-red-400" />
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Erreur</h2>
                                        <p className="text-[11px] font-bold text-red-400/80 uppercase tracking-widest leading-relaxed">
                                            {message}
                                        </p>
                                    </div>
                                    <Link href="/" className="mt-4 px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                        Retour à l'accueil
                                    </Link>
                                </motion.div>
                            )}

                            {status === 'unauthenticated' && (
                                <motion.div
                                    key="auth"
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    className="space-y-8"
                                >
                                    <div className="text-center">
                                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none mb-4">
                                            {authMode === 'signin' ? 'Bon retour' : 'Rejoindre l\'équipe'}
                                        </h1>
                                        <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest leading-relaxed">
                                            {authMode === 'signin'
                                                ? 'Connectez-vous pour accepter votre invitation'
                                                : `Créez votre compte pour rejoindre ${inviteDetails?.project_name || 'le projet'}`
                                            }
                                        </p>
                                    </div>

                                    {authError && (
                                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl flex items-start gap-3">
                                            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                            <p className="text-[10px] font-black uppercase tracking-wider leading-relaxed">{authError}</p>
                                        </div>
                                    )}

                                    <form onSubmit={handleAuth} className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="block text-[9px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Adresse Email</label>
                                            <input
                                                type="email"
                                                required
                                                disabled={!!inviteDetails?.email} // Lock email if invitation is for a specific email
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800] transition-all placeholder:text-white/10 text-sm disabled:opacity-50"
                                                placeholder="nom@exemple.com"
                                            />
                                        </div>
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

                                        <button
                                            type="submit"
                                            disabled={authLoading}
                                            className="w-full bg-[#FFB800] text-black font-black py-5 rounded-2xl hover:bg-white transition-all flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed text-[11px] uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(255,184,0,0.15)] mt-4"
                                        >
                                            {authLoading ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <>
                                                    {authMode === 'signin' ? 'Se connecter & Rejoindre' : 'Créer mon compte & Rejoindre'}
                                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                </>
                                            )}
                                        </button>
                                    </form>

                                    <div className="pt-8 border-t border-white/5 flex items-center justify-center gap-4 text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">
                                        <button
                                            onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                                            className="hover:text-[#FFB800] transition-colors"
                                        >
                                            {authMode === 'signin' ? 'Besoin d\'un compte ? S\'inscrire' : 'Déjà un compte ? Se connecter'}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Secure Trust Indicator */}
                <div className="mt-8 flex items-center justify-center gap-3 opacity-30 select-none">
                    <div className="h-px w-8 bg-white/20" />
                    <span className="text-[8px] font-black uppercase tracking-[0.5em] text-white">HouseExpert Secure Auth</span>
                    <div className="h-px w-8 bg-white/20" />
                </div>
            </motion.div>
        </div>
    );
}
