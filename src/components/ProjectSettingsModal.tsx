'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { X, UserPlus, Copy, Check, Shield, Trash2, Mail, CheckCircle2, Users, Send, Settings2, ShieldCheck, UserCheck, ShieldAlert } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface Member {
    id: string; // project_member id
    user_id: string;
    role: 'admin' | 'editor' | 'viewer';
    joined_at: string;
    user_profiles: {
        email: string;
        full_name: string | null;
    } | null; // Joined data
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
                const { data: membersData, error: memberError } = await supabase
                    .from('project_members')
                    .select('*')
                    .eq('project_id', currentProject.id);

                if (memberError) throw memberError;

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
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
                const link = `${baseUrl}/invite/accept?token=${data.token}`;
                setInviteLink(link);
                fetchData();
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
            await fetchData();
        } catch (error) {
            console.error('Error deleting invitation:', error);
            alert('Erreur lors de la suppression de l\'invitation.');
        } finally {
            setDeletingInvite(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 font-jakarta">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-xl"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-10"
            >
                {/* Header - Dark & Premium */}
                <div className="bg-slate-900 pt-10 pb-12 px-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFB800]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

                    <div className="relative flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-[#FFB800] p-2 rounded-xl">
                                    <ShieldCheck className="h-5 w-5 text-slate-900" />
                                </div>
                                <span className="text-[10px] font-black text-[#FFB800] tracking-[0.3em] uppercase">PARAMÈTRES PROJET</span>
                            </div>
                            <h3 className="text-3xl font-black text-white tracking-tight uppercase leading-tight">Équipe & Accès</h3>
                            <p className="text-sm font-medium text-slate-400 mt-1 uppercase tracking-widest">{currentProject?.name}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-all duration-300"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Tabs - Integrated into Header */}
                    <div className="flex gap-2 mt-10 bg-white/5 p-1.5 rounded-[22px] backdrop-blur-md border border-white/5">
                        <button
                            onClick={() => { setActiveTab('members'); resetInviteObj(); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'members' ? 'bg-white text-slate-900 shadow-xl shadow-black/10' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Users className="h-4 w-4" />
                            Membres
                        </button>
                        <button
                            onClick={() => { setActiveTab('invites'); resetInviteObj(); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'invites' ? 'bg-white text-slate-900 shadow-xl shadow-black/10' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Send className="h-4 w-4" />
                            Invitations
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-[#F8FAFC]">
                    <AnimatePresence mode='wait'>
                        {activeTab === 'members' ? (
                            <motion.div
                                key="members"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="space-y-4"
                            >
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-30">
                                        <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Chargement...</p>
                                    </div>
                                ) : members.length === 0 ? (
                                    <div className="text-center py-20">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Aucun membre trouvé.</p>
                                    </div>
                                ) : (
                                    members.map((m, i) => (
                                        <motion.div
                                            key={m.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="luxury-card p-5 flex items-center justify-between group transition-all duration-500 bg-white"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-sm group-hover:scale-110 transition-transform duration-500">
                                                    {m.user_profiles?.email?.substring(0, 2).toUpperCase() || '??'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 mb-0.5">
                                                        {m.user_profiles?.full_name || m.user_profiles?.email?.split('@')[0] || 'Utilisateur Inconnu'}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                                                        <Mail className="h-3 w-3" />
                                                        {m.user_profiles?.email || 'Email masqué'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors ${m.role === 'admin' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        m.role === 'editor' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                            'bg-slate-50 text-slate-500 border-slate-100'
                                                    }`}>
                                                    {m.role === 'admin' ? 'Administrateur' : m.role === 'editor' ? 'Éditeur' : 'Lecteur'}
                                                </span>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="invites"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-10"
                            >
                                {/* Invite Form */}
                                <div className="luxury-card p-8 bg-white overflow-visible">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="bg-slate-900 text-white p-2 rounded-xl">
                                            <UserPlus className="h-4 w-4" />
                                        </div>
                                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Nouveau membre</h4>
                                    </div>

                                    {!inviteLink ? (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="md:col-span-2">
                                                    <input
                                                        type="email"
                                                        placeholder="ADRESSE EMAIL..."
                                                        className="luxury-input py-4 pr-12"
                                                        value={inviteEmail}
                                                        onChange={e => setInviteEmail(e.target.value)}
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <select
                                                        className="luxury-input py-4 appearance-none cursor-pointer"
                                                        value={inviteRole}
                                                        onChange={(e: any) => setInviteRole(e.target.value)}
                                                    >
                                                        <option value="editor">Éditeur</option>
                                                        <option value="viewer">Lecteur</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-30">
                                                        <Settings2 className="h-4 w-4" />
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleInvite}
                                                disabled={isInviting || !inviteEmail}
                                                className="luxury-button-primary w-full py-5 text-[11px] font-black tracking-[0.2em] shadow-2xl shadow-slate-900/20"
                                            >
                                                {isInviting ? 'GÉNÉRATION EN COURS...' : 'GÉNÉRER L\'INVITATION'}
                                            </button>
                                        </div>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="space-y-6 p-1 bg-white"
                                        >
                                            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[28px] relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="bg-emerald-500 text-white p-1.5 rounded-lg">
                                                        <UserCheck className="h-4 w-4" />
                                                    </div>
                                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Invitation prête !</p>
                                                </div>
                                                <p className="text-[11px] text-slate-500 font-medium mb-4 leading-relaxed">Inscrivez cette invitation ou partagez-la directement :</p>
                                                <div className="flex items-center gap-2 bg-white/80 backdrop-blur p-2 rounded-2xl border border-emerald-100 group">
                                                    <code className="flex-1 text-[11px] text-slate-600 font-mono truncate px-3 py-2 bg-slate-50 rounded-xl">{inviteLink}</code>
                                                    <button
                                                        onClick={copyToClipboard}
                                                        className="p-3 bg-white text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-50"
                                                    >
                                                        {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <button
                                                    onClick={copyToClipboard}
                                                    className="luxury-button-secondary py-4 text-[10px]"
                                                >
                                                    {copied ? 'COPIÉ !' : 'COPIER LE LIEN'}
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        setSendingEmail(true);
                                                        setEmailSuccess(false);
                                                        try {
                                                            const payload = {
                                                                email: inviteEmail,
                                                                projectName: currentProject?.name,
                                                                inviteLink: inviteLink,
                                                                inviterName: user?.user_metadata?.full_name || user?.email
                                                            };
                                                            const response = await supabase.functions.invoke('send-invitation-email', {
                                                                body: payload
                                                            });
                                                            if (response.error) throw new Error(response.error.message || response.error.toString());
                                                            setEmailSuccess(true);
                                                            setTimeout(() => setEmailSuccess(false), 5000);
                                                        } catch (error: any) {
                                                            alert(`Erreur: ${error.message || 'Échec de l\'envoi'}`);
                                                        } finally {
                                                            setSendingEmail(false);
                                                        }
                                                    }}
                                                    disabled={sendingEmail}
                                                    className={`luxury-button-primary py-4 text-[10px] ${emailSuccess ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                                                >
                                                    {sendingEmail ? 'ENVOI...' : emailSuccess ? 'ENVOYÉ !' : 'ENVOYER PAR EMAIL'}
                                                </button>
                                            </div>
                                            <button
                                                onClick={resetInviteObj}
                                                className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors pt-2"
                                            >
                                                Nouvelle Invitation
                                            </button>
                                        </motion.div>
                                    )}
                                </div>

                                {/* Pending List */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">Invitations en attente</h4>
                                        </div>
                                        <span className="bg-slate-100 px-2.5 py-1 rounded-full text-[10px] font-black text-slate-500">{invitations.length}</span>
                                    </div>

                                    <div className="space-y-3">
                                        {invitations.length === 0 ? (
                                            <div className="p-8 text-center bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200">
                                                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-widest">Aucune invitation active</p>
                                            </div>
                                        ) : (
                                            invitations.map(inv => (
                                                <div key={inv.id} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-[24px] shadow-sm group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                                                            <Mail className="h-4 w-4 text-slate-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900 leading-tight mb-0.5">{inv.email}</p>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-[#FFB800]">{inv.role}</span>
                                                                <span className="text-[9px] text-slate-300 font-medium">Expire le {new Date(new Date(inv.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => deleteInvitation(inv.id)}
                                                        disabled={deletingInvite === inv.id}
                                                        className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
