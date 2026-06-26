'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { UserPlus, Copy, Check, Trash2, Mail, Users, Send, ShieldCheck, UserCheck, AlertTriangle, Settings } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/ui';

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
    const { currentProject, userRole } = useProject();
    const { user, isAdmin: isGlobalAdmin } = useAuth();
    // Only project admins (or the app owner) can manage the team. Viewers/editors are read-only.
    const canManageTeam = userRole === 'admin' || isGlobalAdmin;
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
    const [emailError, setEmailError] = useState<string | null>(null);

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
        if (!canManageTeam) return;
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
        setEmailError(null);
        setEmailSuccess(false);
    };

    const deleteInvitation = async (inviteId: string) => {
        if (!canManageTeam) return;
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

    const roleChip = (role: string) => {
        const map: Record<string, string> = {
            admin: 'bg-amber-50 text-amber-700',
            editor: 'bg-blue-50 text-blue-700',
            viewer: 'bg-slate-100 text-slate-600',
        };
        const label = role === 'admin' ? 'Administrateur' : role === 'editor' ? 'Éditeur' : 'Lecteur';
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[role] || map.viewer}`}>
                {label}
            </span>
        );
    };

    return (
        <Modal
            open
            onClose={onClose}
            size="xl"
            icon={<span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white"><ShieldCheck className="h-5 w-5" /></span>}
            title="Équipe et accès"
            description={currentProject?.name || 'Gérer les membres et invitations'}
        >
            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-4">
                <button
                    onClick={() => { setActiveTab('members'); resetInviteObj(); }}
                    className={`flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'members' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Users className="h-4 w-4" />
                    Membres
                </button>
                <button
                    onClick={() => { setActiveTab('invites'); resetInviteObj(); }}
                    className={`flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'invites' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Send className="h-4 w-4" />
                    Invitations
                </button>
            </div>

            {activeTab === 'members' ? (
                <div className="space-y-2.5">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
                            <p className="text-sm text-slate-500">Chargement...</p>
                        </div>
                    ) : members.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-slate-200 bg-white py-12">
                            <Users className="h-9 w-9 mb-2.5 text-slate-300" />
                            <p className="text-sm text-slate-500">Aucun membre trouvé</p>
                        </div>
                    ) : (
                        members.map((m) => (
                            <div
                                key={m.id}
                                className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-3"
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-semibold shrink-0">
                                        {m.user_profiles?.email?.substring(0, 2).toUpperCase() || '??'}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-900 truncate">
                                            {m.user_profiles?.full_name || m.user_profiles?.email?.split('@')[0] || 'Utilisateur inconnu'}
                                        </p>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
                                            <Mail className="h-3 w-3 shrink-0" />
                                            <span className="truncate">{m.user_profiles?.email || 'Email masqué'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="shrink-0">{roleChip(m.role)}</div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="space-y-5">
                    {/* Invite form (project admins only) */}
                    {!canManageTeam && (
                        <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                            <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                            Seuls les administrateurs du projet peuvent inviter ou gérer les membres.
                        </div>
                    )}
                    {canManageTeam && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                        <div className="flex items-center gap-2.5 mb-4">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 text-white">
                                <UserPlus className="h-4 w-4" />
                            </span>
                            <h4 className="text-sm font-semibold text-slate-900">Inviter un membre</h4>
                        </div>

                        {!inviteLink ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Adresse email</label>
                                        <input
                                            type="email"
                                            placeholder="nom@exemple.com"
                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                                            value={inviteEmail}
                                            onChange={e => setInviteEmail(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Rôle</label>
                                        <select
                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition cursor-pointer"
                                            value={inviteRole}
                                            onChange={(e: any) => setInviteRole(e.target.value)}
                                        >
                                            <option value="editor">Éditeur</option>
                                            <option value="viewer">Lecteur</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                </div>
                                <button
                                    onClick={handleInvite}
                                    disabled={isInviting || !inviteEmail}
                                    className="inline-flex items-center justify-center gap-2 w-full h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-colors"
                                >
                                    {isInviting ? 'Génération en cours...' : "Générer l'invitation"}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-600 text-white">
                                            <UserCheck className="h-4 w-4" />
                                        </span>
                                        <p className="text-sm font-semibold text-emerald-700">Invitation prête</p>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-3">Partagez ce lien directement avec la personne invitée :</p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-xs text-slate-600 font-mono truncate px-3 h-10 inline-flex items-center bg-white border border-slate-200 rounded-xl">{inviteLink}</code>
                                        <button
                                            onClick={copyToClipboard}
                                            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
                                            title="Copier le lien"
                                        >
                                            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={copyToClipboard}
                                        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 active:scale-[0.99] transition-colors"
                                    >
                                        {copied ? 'Copié !' : 'Copier le lien'}
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setSendingEmail(true);
                                            setEmailSuccess(false);
                                            setEmailError(null);
                                            try {
                                                const payload = {
                                                    email: inviteEmail,
                                                    projectName: currentProject?.name || 'Projet',
                                                    inviteLink: inviteLink,
                                                    inviterName: user?.user_metadata?.full_name || user?.email
                                                };
                                                const { data, error } = await supabase.functions.invoke('send-invitation-email', {
                                                    body: payload
                                                });
                                                // supabase-js returns a generic "non-2xx" message — read the function's
                                                // real error body so the user sees the actual cause.
                                                if (error) {
                                                    let detail = error.message;
                                                    try {
                                                        const ctx = (error as any).context;
                                                        if (ctx && typeof ctx.json === 'function') {
                                                            const body = await ctx.json();
                                                            if (body?.error) detail = body.error;
                                                        }
                                                    } catch { /* ignore parse errors */ }
                                                    throw new Error(detail);
                                                }
                                                if (data?.error) throw new Error(data.error);
                                                setEmailSuccess(true);
                                                setTimeout(() => setEmailSuccess(false), 5000);
                                            } catch (error: any) {
                                                console.error('send-invitation-email failed:', error);
                                                setEmailError(error.message || "Échec de l'envoi");
                                            } finally {
                                                setSendingEmail(false);
                                            }
                                        }}
                                        disabled={sendingEmail}
                                        className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-white text-sm font-medium active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-colors ${emailSuccess ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'}`}
                                    >
                                        {sendingEmail ? 'Envoi...' : emailSuccess ? 'Envoyé !' : 'Envoyer par email'}
                                    </button>
                                </div>
                                {emailError && (
                                    <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3">
                                        {/not configured/i.test(emailError)
                                            ? <Settings className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                                            : <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />}
                                        <div className="min-w-0 text-[13px] leading-snug">
                                            {/not configured/i.test(emailError) ? (
                                                <>
                                                    <p className="font-medium text-rose-700">Service email non configuré</p>
                                                    <p className="text-rose-600/90 mt-0.5">
                                                        La clé <code className="font-mono text-xs bg-rose-100 px-1 py-0.5 rounded">BREVO_API_KEY</code> n&apos;est pas définie côté serveur. Utilisez « Copier le lien » en attendant, ou configurez l&apos;envoi (voir <span className="font-mono text-xs">SETUP_EMAIL.md</span>).
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="font-medium text-rose-700">Échec de l&apos;envoi</p>
                                                    <p className="text-rose-600/90 mt-0.5 break-words">{emailError}</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={resetInviteObj}
                                    className="w-full text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors pt-1"
                                >
                                    Nouvelle invitation
                                </button>
                            </div>
                        )}
                    </div>
                    )}

                    {/* Pending list */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between px-1">
                            <h4 className="text-sm font-semibold text-slate-900">Invitations en attente</h4>
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{invitations.length}</span>
                        </div>

                        {invitations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-slate-200 bg-white py-10">
                                <Send className="h-8 w-8 mb-2 text-slate-300" />
                                <p className="text-sm text-slate-500">Aucune invitation active</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {invitations.map(inv => (
                                    <div key={inv.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 text-slate-500 shrink-0">
                                                <Mail className="h-4 w-4" />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate">{inv.email}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {roleChip(inv.role)}
                                                    <span className="text-xs text-slate-400">Expire le {new Date(new Date(inv.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {canManageTeam && (
                                            <button
                                                onClick={() => deleteInvitation(inv.id)}
                                                disabled={deletingInvite === inv.id}
                                                className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50 shrink-0"
                                                title="Supprimer l'invitation"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
}
