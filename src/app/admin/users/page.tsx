'use client';

import { useProject } from '@/context/ProjectContext';
import ProjectSettingsModal from '@/components/ProjectSettingsModal';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { UserProfile } from '@/context/AuthContext';
import { Shield, UserPlus, Search, CheckCircle2, XCircle, Clock, Trash2, Mail, Calendar, UserCheck } from 'lucide-react';
import { Modal } from '@/components/ui';

export default function AdminUsersPage() {
    const { isAdmin, loading: authLoading } = useAuth();
    const { currentProject } = useProject();
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            router.replace('/');
        }
    }, [isAdmin, authLoading, router]);

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            let query = supabase
                .from('user_profiles')
                .select('*')
                .order('requested_at', { ascending: false });

            if (filter !== 'all') {
                query = query.eq('status', filter);
            }

            const { data, error: supabaseError } = await query;

            if (supabaseError) {
                if (supabaseError.message?.includes('relation') || supabaseError.message?.includes('does not exist')) {
                    setError('DATABASE_MISSING');
                    return;
                }
                throw supabaseError;
            }
            setUsers(data || []);
        } catch (err: any) {
            console.error('Error fetching users:', err);
            setError(err.message || 'Échec de la récupération des utilisateurs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        }
    }, [isAdmin, filter]);

    const approveUser = async (userId: string) => {
        setActionLoading(userId);
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    status: 'approved',
                    approved_at: new Date().toISOString(),
                    rejection_reason: null,
                })
                .eq('id', userId);

            if (error) throw error;
            await fetchUsers();
        } catch (error) {
            console.error('Error approving user:', error);
            alert('Échec de l\'approbation');
        } finally {
            setActionLoading(null);
        }
    };

    const rejectUser = async (userId: string) => {
        setActionLoading(userId);
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    status: 'rejected',
                    rejection_reason: rejectionReason || 'Accès refusé par l\'administrateur',
                })
                .eq('id', userId);

            if (error) throw error;
            setShowRejectModal(null);
            setRejectionReason('');
            await fetchUsers();
        } catch (error) {
            console.error('Error rejecting user:', error);
            alert('Échec du rejet');
        } finally {
            setActionLoading(null);
        }
    };

    const updateUserRole = async (userId: string, newRole: 'admin' | 'user' | 'viewer') => {
        setActionLoading(userId);
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;
            await fetchUsers();
        } catch (error) {
            console.error('Error updating user role:', error);
            alert('Échec de la mise à jour du rôle');
        } finally {
            setActionLoading(null);
        }
    };

    const deleteUser = async (userId: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.')) {
            return;
        }

        setActionLoading(userId);
        try {
            const { error } = await supabase
                .from('user_profiles')
                .delete()
                .eq('id', userId);

            if (error) throw error;
            await fetchUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Échec de la suppression');
        } finally {
            setActionLoading(null);
        }
    };

    const filteredUsers = users.filter(user =>
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (authLoading || (loading && users.length === 0)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                    <p className="text-slate-500 text-sm">Chargement...</p>
                </div>
            </div>
        );
    }

    if (error === 'DATABASE_MISSING') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 font-jakarta">
                <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 text-center shadow-sm">
                    <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <Shield className="h-7 w-7 text-red-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-2 tracking-tight">Configuration requise</h2>
                    <p className="text-sm text-slate-500 mb-6">
                        La table <code className="bg-slate-100 px-1.5 py-0.5 rounded text-red-600 text-xs">user_profiles</code> est manquante.
                    </p>
                    <div className="bg-slate-900 text-slate-300 p-4 rounded-xl text-[11px] font-mono text-left mb-6 leading-relaxed">
                        <span className="text-amber-400"># Migration requise</span><br />
                        supabase/migrations/20260112_add_user_management.sql
                    </div>
                    <button
                        onClick={() => fetchUsers()}
                        className="inline-flex items-center justify-center gap-2 w-full h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 active:scale-[0.99] transition-colors"
                    >
                        Vérifier à nouveau
                    </button>
                </div>
            </div>
        );
    }

    if (!isAdmin) return null;

    const pendingCount = users.filter(u => u.status === 'pending').length;

    const statusChip = (status: string) => {
        const map: Record<string, { cls: string; dot: string; label: string }> = {
            approved: { cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', label: 'Approuvé' },
            pending: { cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', label: 'En attente' },
            rejected: { cls: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500', label: 'Rejeté' },
        };
        const s = map[status] || map.rejected;
        return (
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                {s.label}
            </span>
        );
    };

    const roleSelectClass = 'h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition cursor-pointer disabled:opacity-50';

    const renderActions = (user: UserProfile) => (
        <div className="flex items-center justify-end gap-1">
            {user.status === 'pending' && (
                <>
                    <button
                        onClick={() => approveUser(user.id)}
                        disabled={actionLoading === user.id}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                        title="Approuver"
                    >
                        <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setShowRejectModal(user.id)}
                        disabled={actionLoading === user.id}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                        title="Refuser"
                    >
                        <XCircle className="h-4 w-4" />
                    </button>
                </>
            )}
            {user.status === 'approved' && (
                <button
                    onClick={() => setShowRejectModal(user.id)}
                    disabled={actionLoading === user.id}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                    title="Révoquer l'accès"
                >
                    <XCircle className="h-4 w-4" />
                </button>
            )}
            {user.status === 'rejected' && (
                <button
                    onClick={() => approveUser(user.id)}
                    disabled={actionLoading === user.id}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                    title="Ré-approuver"
                >
                    <UserCheck className="h-4 w-4" />
                </button>
            )}
            <button
                onClick={() => deleteUser(user.id)}
                disabled={actionLoading === user.id}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50"
                title="Supprimer"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    );

    return (
        <div className="min-h-screen font-jakarta">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 pb-28 md:pb-12 space-y-5">
                {/* Page header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">Utilisateurs</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Gestion des accès et des permissions.</p>
                    </div>
                    {currentProject && (
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 active:scale-[0.99] transition-colors"
                        >
                            <UserPlus className="h-4 w-4" /> Inviter
                        </button>
                    )}
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                        { label: 'Utilisateurs', value: users.length, icon: Mail, tone: 'bg-slate-100 text-slate-600' },
                        { label: 'En attente', value: pendingCount, icon: Clock, tone: 'bg-amber-50 text-amber-600', highlight: pendingCount > 0 },
                        { label: 'Approuvés', value: users.filter(u => u.status === 'approved').length, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600' },
                        { label: 'Rejetés', value: users.filter(u => u.status === 'rejected').length, icon: XCircle, tone: 'bg-rose-50 text-rose-600' },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                            <div className="flex items-start justify-between">
                                <p className="text-xs text-slate-500">{stat.label}</p>
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${stat.tone}`}>
                                    <stat.icon className="h-4 w-4" />
                                </span>
                            </div>
                            <p className={`text-xl sm:text-2xl font-semibold tabular-nums mt-1 ${stat.highlight ? 'text-amber-600' : 'text-slate-900'}`}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Filters + search */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full lg:w-auto overflow-x-auto no-scrollbar">
                        {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setFilter(tab)}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {tab === 'all' ? 'Tous' : tab === 'pending' ? 'En attente' : tab === 'approved' ? 'Approuvés' : 'Rejetés'}
                                {tab === 'pending' && pendingCount > 0 && (
                                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-amber-500 text-white rounded-full text-[10px] font-semibold">
                                        {pendingCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full lg:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Rechercher un utilisateur..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
                        />
                    </div>
                </div>

                {/* Desktop table */}
                <div className="hidden md:block rounded-2xl border border-slate-200 overflow-hidden bg-white">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-xs font-medium text-slate-500">
                                <th className="px-4 py-3">Utilisateur</th>
                                <th className="px-4 py-3">Statut</th>
                                <th className="px-4 py-3">Rôle</th>
                                <th className="px-4 py-3">Demandé le</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-semibold shrink-0">
                                                {user.full_name?.substring(0, 2).toUpperCase() || '??'}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate">{user.full_name || 'Sans nom'}</p>
                                                <p className="text-xs text-slate-400 truncate">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">{statusChip(user.status)}</td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={user.role}
                                            onChange={(e) => updateUserRole(user.id, e.target.value as any)}
                                            disabled={actionLoading === user.id}
                                            className={roleSelectClass}
                                        >
                                            <option value="viewer">Observateur</option>
                                            <option value="user">Utilisateur</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm text-slate-500 tabular-nums">
                                            {new Date(user.requested_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">{renderActions(user)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredUsers.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-center py-16">
                            <Mail className="h-10 w-10 mb-3 text-slate-300" />
                            <p className="text-sm text-slate-500">Aucun utilisateur trouvé</p>
                        </div>
                    )}
                </div>

                {/* Mobile card list */}
                <div className="md:hidden space-y-3">
                    {filteredUsers.map((user) => (
                        <div key={user.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-semibold shrink-0">
                                    {user.full_name?.substring(0, 2).toUpperCase() || '??'}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-900 truncate">{user.full_name || 'Sans nom'}</p>
                                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                                </div>
                                <div className="shrink-0">{statusChip(user.status)}</div>
                            </div>

                            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                                <Calendar className="h-3.5 w-3.5" />
                                Demandé le {new Date(user.requested_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                                <select
                                    value={user.role}
                                    onChange={(e) => updateUserRole(user.id, e.target.value as any)}
                                    disabled={actionLoading === user.id}
                                    className={roleSelectClass}
                                >
                                    <option value="viewer">Observateur</option>
                                    <option value="user">Utilisateur</option>
                                    <option value="admin">Admin</option>
                                </select>
                                {renderActions(user)}
                            </div>
                        </div>
                    ))}

                    {filteredUsers.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-slate-200 bg-white py-16">
                            <Mail className="h-10 w-10 mb-3 text-slate-300" />
                            <p className="text-sm text-slate-500">Aucun utilisateur trouvé</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Reject Modal */}
            <Modal
                open={showRejectModal !== null}
                onClose={() => { setShowRejectModal(null); setRejectionReason(''); }}
                persistent
                size="md"
                icon={<span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-red-50 text-red-600"><XCircle className="h-5 w-5" /></span>}
                title="Refuser l'accès"
                description="Veuillez indiquer la raison du refus (l'utilisateur pourra la voir)."
                footer={<>
                    <button
                        onClick={() => { setShowRejectModal(null); setRejectionReason(''); }}
                        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 active:scale-[0.99] transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={() => showRejectModal && rejectUser(showRejectModal)}
                        disabled={actionLoading === showRejectModal}
                        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-colors"
                    >
                        {actionLoading === showRejectModal ? 'Traitement...' : "Refuser l'accès"}
                    </button>
                </>}
            >
                <div className="space-y-2">
                    <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Raison du refus</label>
                    <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Ex: Informations incomplètes ou accès non justifié..."
                        className="w-full px-3 py-2.5 min-h-[96px] rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition resize-none"
                    />
                </div>
            </Modal>

            {showInviteModal && (
                <ProjectSettingsModal onClose={() => setShowInviteModal(false)} />
            )}
        </div>
    );
}
