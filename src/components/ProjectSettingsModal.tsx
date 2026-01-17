'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { X, UserPlus, Copy, Check, Shield, Trash2, Mail, CheckCircle2 } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';

interface Member {
    id: string; // project_member id
    user_id: string;
    role: 'admin' | 'editor' | 'viewer';
    joined_at: string;
    user_profiles: {
        email: string;
        full_name: string | null;
    } | null; // Joined data
    // Fallback if user_profiles join fails or is empty, can try to match auth.users if possible but usually we join profiles
}

interface Invitation {
    id: string;
    email: string;
    role: 'admin' | 'editor' | 'viewer';
    token: string;
    created_at: string;
    status: 'pending' | 'accepted' | 'expired';
}

export default function ProjectSettingsModal({ onClose }: { onClose: () => void }) {
    const { currentProject } = useProject();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'members' | 'invites'>('members');
    const [members, setMembers] = useState<Member[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Invite Form
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('editor');
    const [isInviting, setIsInviting] = useState(false);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [deletingInvite, setDeletingInvite] = useState<string | null>(null);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailSuccess, setEmailSuccess] = useState(false);

    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        if (currentProject) {
            fetchData();
        }
    }, [currentProject, activeTab]);

    const fetchData = async () => {
        if (!currentProject) return;
        setIsLoading(true);
        try {
            if (activeTab === 'members') {
                // 1. Fetch members
                const { data: membersData, error: memberError } = await supabase
                    .from('project_members')
                    .select('*')
                    .eq('project_id', currentProject.id);

                if (memberError) {
                    // Safe logging for empty error objects
                    if (Object.keys(memberError).length !== 0) console.error(memberError);
                    throw memberError;
                }

                // 2. Fetch profiles safely
                let mergedMembers = [];
                if (membersData && membersData.length > 0) {
                    const userIds = membersData.map((m: any) => m.user_id).filter((id: string) => id !== null);
                    const { data: profilesData } = await supabase
                        .from('user_profiles')
                        .select('id, email, full_name')
                        .in('id', userIds);

                    mergedMembers = membersData.map((m: any) => ({
                        ...m,
                        user_profiles: profilesData?.find((p: any) => p.id === m.user_id) || null
                    }));
                }

                setMembers(mergedMembers as any);
            } else {
                // Fetch invitations
                const { data, error } = await supabase
                    .from('project_invitations')
                    .select('*')
                    .eq('project_id', currentProject.id)
                    .eq('status', 'pending');

                if (error) throw error;
                setInvitations(data as any || []);
            }
        } catch (error) {
            console.error('Error fetching settings data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInvite = async () => {
        if (!inviteEmail || !currentProject) return;
        setIsInviting(true);
        try {
            const { data, error } = await supabase
                .from('project_invitations')
                .insert({
                    project_id: currentProject.id,
                    email: inviteEmail,
                    role: inviteRole,
                    invited_by: user?.id
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                // Use production URL instead of localhost
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
                const link = `${baseUrl}/invite/accept?token=${data.token}`;
                setInviteLink(link);
                fetchData(); // Refresh list
            }
        } catch (error) {
            console.error('Error creating invitation:', error);
            alert('Erreur lors de la création de l\'invitation.');
        } finally {
            setIsInviting(false);
        }
    };

    const copyToClipboard = () => {
        if (inviteLink) {
            navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const resetInviteObj = () => {
        setInviteLink(null);
        setInviteEmail('');
        setCopied(false);
    };

    const deleteInvitation = async (inviteId: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette invitation ?')) return;

        setDeletingInvite(inviteId);
        try {
            const { error } = await supabase
                .from('project_invitations')
                .delete()
                .eq('id', inviteId);

            if (error) throw error;
            await fetchData(); // Refresh list
        } catch (error) {
            console.error('Error deleting invitation:', error);
            alert('Erreur lors de la suppression de l\'invitation.');
        } finally {
            setDeletingInvite(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 font-jakarta">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="bg-slate-900 p-8 text-white flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-1">Équipe du Projet</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{currentProject?.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 shrink-0">
                    <button
                        onClick={() => { setActiveTab('members'); resetInviteObj(); }}
                        className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'members' ? 'text-slate-900 border-b-2 border-slate-900 bg-slate-50' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Membres
                    </button>
                    <button
                        onClick={() => { setActiveTab('invites'); resetInviteObj(); }}
                        className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'invites' ? 'text-slate-900 border-b-2 border-slate-900 bg-slate-50' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Invitations En Attente
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">

                    {activeTab === 'members' && (
                        <div className="space-y-4">
                            {isLoading ? (
                                <div className="text-center py-10 text-slate-400 text-xs font-black uppercase">Chargement...</div>
                            ) : members.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 text-xs font-black uppercase">Aucun membre (étrange...)</div>
                            ) : (
                                members.map(m => (
                                    <div key={m.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-black text-xs">
                                                {m.user_profiles?.email?.substring(0, 2).toUpperCase() || '??'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 leading-none mb-1">
                                                    {m.user_profiles?.full_name || m.user_profiles?.email?.split('@')[0] || 'Utilisateur Inconnu'}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                                    {m.user_profiles?.email || 'Email masqué'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${m.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                m.role === 'editor' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                    'bg-slate-100 text-slate-700 border-slate-200'
                                                }`}>
                                                {m.role}
                                            </span>
                                            {/* Delete button only if admin and not deleting self logic to be added */}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'invites' && (
                        <div className="space-y-8">

                            {/* Invite Form */}
                            <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 border-dashed">
                                <h4 className="text-sm font-black text-slate-900 uppercase mb-4 flex items-center gap-2">
                                    <UserPlus className="h-4 w-4" />
                                    Inviter un nouveau membre
                                </h4>

                                {!inviteLink ? (
                                    <div className="space-y-4">
                                        <div className="flex flex-col md:flex-row gap-4">
                                            <input
                                                type="email"
                                                placeholder="ADRESSE EMAIL..."
                                                className="flex-[2] bg-white p-4 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:border-slate-900 transition-colors uppercase placeholder:normal-case"
                                                value={inviteEmail}
                                                onChange={e => setInviteEmail(e.target.value)}
                                            />
                                            <select
                                                className="flex-1 bg-white p-4 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:border-slate-900 transition-colors uppercase text-slate-700"
                                                value={inviteRole}
                                                onChange={(e: any) => setInviteRole(e.target.value)}
                                            >
                                                <option value="editor">Éditeur</option>
                                                <option value="viewer">Lecteur</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>
                                        <button
                                            onClick={handleInvite}
                                            disabled={isInviting || !inviteEmail}
                                            className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-900/10"
                                        >
                                            {isInviting ? 'Création...' : 'Générer l\'invitation'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in slide-in-from-bottom-2">
                                        <div className="bg-white border-2 border-green-100 p-4 rounded-2xl mb-4">
                                            <p className="text-xs font-bold text-green-600 mb-2 uppercase flex items-center gap-2">
                                                <Check className="h-4 w-4" /> Invitation prête !
                                            </p>
                                            <p className="text-[10px] text-slate-400 mb-3">Partagez ce lien avec l'utilisateur :</p>
                                            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                                                <code className="flex-1 text-xs text-slate-700 font-mono truncate p-2">{inviteLink}</code>
                                                <button
                                                    onClick={copyToClipboard}
                                                    className="p-2 bg-white border border-slate-200 rounded-lg hover:border-slate-900 transition-colors relative"
                                                >
                                                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-slate-500" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    copyToClipboard();
                                                    setCopied(true);
                                                    setTimeout(() => setCopied(false), 2000);
                                                }}
                                                className={`flex-1 ${copied ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'} py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-colors text-center flex items-center justify-center gap-2`}
                                            >
                                                {copied ? (
                                                    <CheckCircle2 className="h-3 w-3" />
                                                ) : (
                                                    <Copy className="h-3 w-3" />
                                                )}
                                                {copied ? 'Copié !' : 'Copier le lien'}
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    setSendingEmail(true);
                                                    setEmailSuccess(false);
                                                    try {
                                                        console.log('Sending invitation email...');

                                                        const payload = {
                                                            email: inviteEmail,
                                                            projectName: currentProject?.name,
                                                            inviteLink: inviteLink,
                                                            inviterName: user?.user_metadata?.full_name || user?.email
                                                        };

                                                        console.log('Calling Edge Function with:', payload);

                                                        const response = await supabase.functions.invoke('send-invitation-email', {
                                                            body: payload
                                                        });

                                                        console.log('Edge Function full response:', response);

                                                        if (response.error) {
                                                            console.error('Edge Function error:', response.error);
                                                            const errorMessage = response.error.message || response.error.toString();
                                                            throw new Error(errorMessage);
                                                        }

                                                        if (response.data?.error) {
                                                            console.error('Edge Function returned error:', response.data.error);
                                                            throw new Error(response.data.error);
                                                        }

                                                        console.log('Email sent successfully!', response.data);
                                                        setEmailSuccess(true);
                                                        setTimeout(() => setEmailSuccess(false), 5000);
                                                    } catch (error: any) {
                                                        console.error('Error sending email:', error);
                                                        const errorMsg = error.message || error.toString() || 'Erreur inconnue';
                                                        alert(`Erreur lors de l'envoi de l'email: ${errorMsg}`);
                                                    } finally {
                                                        setSendingEmail(false);
                                                    }
                                                }}
                                                disabled={sendingEmail}
                                                className={`flex-1 ${emailSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'} py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-100 transition-colors text-center flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                {emailSuccess ? <CheckCircle2 className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                                                {sendingEmail ? 'Envoi...' : emailSuccess ? 'Email Envoyé !' : 'Par Email'}
                                            </button>
                                        </div>
                                        <button
                                            onClick={resetInviteObj}
                                            className="w-full mt-3 bg-slate-100 text-slate-500 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-colors"
                                        >
                                            Nouvelle Invitation
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Pending List */}
                            <div>
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 pl-2">En attente ({invitations.length})</h4>
                                <div className="space-y-3">
                                    {invitations.length === 0 ? (
                                        <p className="pl-2 text-xs text-slate-300 italic">Aucune invitation en cours.</p>
                                    ) : (
                                        invitations.map(inv => (
                                            <div key={inv.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900">{inv.email}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold uppercase">{inv.role}</span>
                                                        <span className="text-[9px] text-slate-300">Expire: {new Date(inv.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => deleteInvitation(inv.id)}
                                                    disabled={deletingInvite === inv.id}
                                                    className="text-slate-300 hover:text-red-500 transition-colors p-2 disabled:opacity-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
