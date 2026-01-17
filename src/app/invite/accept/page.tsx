'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function AcceptInvitePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'unauthenticated'>('loading');
    const [message, setMessage] = useState('Vérification de l\'invitation...');
    const [inviteDetails, setInviteDetails] = useState<{ project_name: string; email: string } | null>(null);
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        const acceptInvite = async () => {
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
                    // Fallback: if function doesn't exist yet, we'll try the direct acceptance and let it fail if not logged in
                    if (!detailsError.message?.includes('function')) {
                        throw detailsError;
                    }
                } else if (!details.success) {
                    setStatus('error');
                    setMessage(details.error || 'Invitation invalide.');
                    return;
                } else {
                    setInviteDetails(details);
                }

                // 2. Check session
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setStatus('unauthenticated');
                    setMessage('Vous avez été invité à rejoindre ce projet.');
                    return;
                }

                // 3. Perform acceptance
                setMessage('Acceptation de l\'invitation...');
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
        };

        acceptInvite();
    }, [token, router, supabase]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-jakarta">
            <div className="bg-white p-8 rounded-[2rem] w-full max-w-sm shadow-xl text-center">

                {status === 'loading' && (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <Loader2 className="h-12 w-12 text-slate-300 animate-spin" />
                        <p className="text-sm font-black text-slate-500 uppercase tracking-widest animate-pulse">
                            {message}
                        </p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center gap-4 py-8 animate-in zoom-in-95 duration-300">
                        <div className="bg-emerald-50 p-4 rounded-full">
                            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Félicitations !</h2>
                        <p className="text-sm font-bold text-slate-500">
                            {message}
                        </p>
                        <p className="text-xs text-slate-400 font-medium">
                            Redirection vers le projet...
                        </p>
                    </div>
                )}

                {status === 'unauthenticated' && (
                    <div className="flex flex-col items-center gap-6 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center shadow-inner">
                            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">Bienvenue !</h2>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                {inviteDetails?.project_name ? (
                                    <>Vous êtes invité à rejoindre le projet <span className="text-slate-900">{inviteDetails.project_name}</span></>
                                ) : (
                                    <>Félicitations, vous avez été invité !</>
                                )}
                            </p>
                        </div>

                        <div className="w-full space-y-3 pt-4">
                            <Link
                                href={`/login?returnUrl=/invite/accept?token=${token}`}
                                className="flex items-center justify-between w-full px-6 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all group"
                            >
                                <span>Se connecter</span>
                                <Loader2 className="h-4 w-4 opacity-0 group-hover:opacity-20 transition-opacity" />
                            </Link>

                            <div className="flex items-center gap-4 py-2">
                                <div className="h-px flex-1 bg-slate-100" />
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Ou</span>
                                <div className="h-px flex-1 bg-slate-100" />
                            </div>

                            <Link
                                href={`/login?mode=signup&returnUrl=/invite/accept?token=${token}`}
                                className="flex items-center justify-between w-full px-6 py-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:border-slate-900 transition-all group shadow-sm"
                            >
                                <span>Créer un compte</span>
                                <CheckCircle2 className="h-4 w-4 opacity-0 group-hover:opacity-20 transition-opacity" />
                            </Link>
                        </div>

                        <p className="text-[9px] text-slate-400 font-medium px-4">
                            L'invitation est envoyée à <span className="font-bold text-slate-900">{inviteDetails?.email}</span>
                        </p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center gap-4 py-8 animate-in zoom-in-95 duration-300">
                        <div className="bg-red-50 p-4 rounded-full">
                            <XCircle className="h-12 w-12 text-red-500" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Oups !</h2>
                        <p className="text-sm font-bold text-slate-500">
                            {message}
                        </p>
                        <Link
                            href="/"
                            className="mt-4 px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                        >
                            Retour à l'accueil
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
