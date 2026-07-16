'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { AUTH_EMAIL_BASE } from '@/lib/app-url';
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff, Building2, ChevronRight, AlertCircle } from 'lucide-react';
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
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${AUTH_EMAIL_BASE}/auth/callback?next=${encodeURIComponent(`/invite/accept?token=${token}`)}`,
                    },
                });
                if (error) throw error;

                // Email already registered: Supabase returns a user with no identities
                // (and sends no email). Tell them to sign in instead.
                if (data.user && (data.user.identities?.length ?? 0) === 0) {
                    setAuthMode('signin');
                    setAuthError('Un compte existe déjà avec cet e-mail. Connectez-vous pour accepter l\'invitation.');
                    return;
                }

                if (data.session) {
                    // Email confirmation is disabled → we already have a session, accept now.
                    await acceptInviteFlow();
                } else {
                    // Email confirmation is required → user must click the link Supabase sends.
                    setStatus('loading');
                    setMessage("Vérifiez vos e-mails pour le lien de confirmation. Si rien n'arrive, l'administrateur doit désactiver la confirmation d'e-mail dans Supabase (Auth → Providers → Email) ou configurer un service SMTP.");
                }
            }
        } catch (err: any) {
            setAuthError(err.message);
        } finally {
            setAuthLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-jakarta">
            <div className="w-full max-w-md">
                {/* Branding */}
                <div className="flex flex-col items-center mb-6">
                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center">
                        <Building2 className="text-white w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Status header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                        <span className="text-xs font-medium text-slate-500">Invitation</span>
                        {inviteDetails && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 max-w-[60%] truncate">
                                {inviteDetails.project_name}
                            </span>
                        )}
                    </div>

                    <div className="p-5 sm:p-6">
                        {status === 'loading' && (
                            <div className="flex flex-col items-center gap-4 py-8 text-center">
                                <div className="h-10 w-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                                <p className="text-sm text-slate-500">{message}</p>
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="flex flex-col items-center gap-4 py-8 text-center">
                                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center">
                                    <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-lg font-semibold tracking-tight text-slate-900">Bienvenue !</h2>
                                    <p className="text-sm text-emerald-700">{message}</p>
                                </div>
                                <p className="text-xs text-slate-400">Redirection automatique...</p>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="flex flex-col items-center gap-4 py-8 text-center">
                                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
                                    <XCircle className="h-7 w-7 text-red-600" />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-lg font-semibold tracking-tight text-slate-900">Erreur</h2>
                                    <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
                                </div>
                                <Link
                                    href="/"
                                    className="mt-2 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 active:scale-[0.99] transition-colors"
                                >
                                    Retour à l'accueil
                                </Link>
                            </div>
                        )}

                        {status === 'unauthenticated' && (
                            <div className="space-y-5">
                                <div className="text-center">
                                    <h1 className="text-xl font-semibold tracking-tight text-slate-900 mb-1">
                                        {authMode === 'signin' ? 'Bon retour' : 'Rejoindre l\'équipe'}
                                    </h1>
                                    <p className="text-sm text-slate-500">
                                        {authMode === 'signin'
                                            ? 'Connectez-vous pour accepter votre invitation'
                                            : `Créez votre compte pour rejoindre ${inviteDetails?.project_name || 'le projet'}`
                                        }
                                    </p>
                                </div>

                                {authError && (
                                    <div className="bg-red-50 border border-red-100 text-red-600 px-3 py-2.5 rounded-xl flex items-start gap-2">
                                        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm leading-snug">{authError}</p>
                                    </div>
                                )}

                                <form onSubmit={handleAuth} className="space-y-4">
                                    <div>
                                        <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Adresse email</label>
                                        <input
                                            type="email"
                                            required
                                            disabled={!!inviteDetails?.email} // Lock email if invitation is for a specific email
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition disabled:opacity-60 disabled:bg-slate-50"
                                            placeholder="nom@exemple.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Mot de passe</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full h-10 pl-3 pr-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={authLoading}
                                        className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-colors group"
                                    >
                                        {authLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                {authMode === 'signin' ? 'Se connecter et rejoindre' : 'Créer mon compte et rejoindre'}
                                                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </form>

                                <div className="pt-4 border-t border-slate-100 flex items-center justify-center">
                                    <button
                                        onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                                        className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                                    >
                                        {authMode === 'signin' ? 'Besoin d\'un compte ? S\'inscrire' : 'Déjà un compte ? Se connecter'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Trust indicator */}
                <p className="mt-6 text-center text-xs text-slate-400">HouseExpert · Connexion sécurisée</p>
            </div>
        </div>
    );
}
