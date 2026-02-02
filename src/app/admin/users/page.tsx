'use client';

import { useProject } from '@/context/ProjectContext';
import ProjectSettingsModal from '@/components/ProjectSettingsModal';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { UserProfile } from '@/context/AuthContext';
import { Shield, UserPlus, Search, Filter, MoreVertical, CheckCircle2, XCircle, Clock, Trash2, Mail, Calendar, UserCheck, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
                        <div className="absolute inset-0 rounded-full border-4 border-[#FFB800] border-t-transparent animate-spin" />
                    </div>
                    <p className="text-sm font-black text-slate-500 uppercase tracking-widest animate-pulse">Chargement...</p>
                </div>
            </div>
        );
    }

    if (error === 'DATABASE_MISSING') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6 font-jakarta">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full glass-morphism rounded-[32px] p-10 text-center relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
                    <div className="w-20 h-20 bg-red-50 rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/10">
                        <Shield className="h-10 w-10 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">CONFIGURATION REQUISE</h2>
                    <p className="text-slate-500 mb-8 font-medium">
                        La table <code className="bg-slate-100 px-1.5 py-0.5 rounded text-red-600">user_profiles</code> est manquante.
                    </p>
                    <div className="bg-slate-900 text-slate-400 p-5 rounded-[24px] text-[11px] font-mono text-left mb-8 border border-white/5 shadow-2xl leading-relaxed">
                        <span className="text-[#FFB800]"># Migration requise</span><br />
                        supabase/migrations/20260112_add_user_management.sql
                    </div>
                    <button
                        onClick={() => fetchUsers()}
                        className="luxury-button-primary w-full py-4 text-xs font-black tracking-widest"
                    >
                        VÉRIFIER À NOUVEAU
                    </button>
                </motion.div>
            </div>
        );
    }

    if (!isAdmin) return null;

    const pendingCount = users.filter(u => u.status === 'pending').length;

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 font-jakarta">
            <div className="max-w-7xl mx-auto px-6 pt-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-[#FFB800]/10 p-2 rounded-xl">
                                <ShieldCheck className="h-5 w-5 text-[#FFB800]" />
                            </div>
                            <span className="text-[10px] font-black text-[#FFB800] tracking-[0.3em] uppercase">Administration</span>
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gestion des Utilisateurs</h1>
                        <p className="text-slate-400 text-sm mt-1 font-medium">Contrôlez les accès et les permissions de votre plateforme.</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        {currentProject && (
                            <button
                                onClick={() => setShowInviteModal(true)}
                                className="luxury-button-gold flex items-center gap-3 py-4 shadow-xl shadow-amber-500/20"
                            >
                                <UserPlus className="h-4 w-4" />
                                <span className="tracking-widest text-[11px] font-black uppercase">Inviter au Projet</span>
                            </button>
                        )}
                    </motion.div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {[
                        { label: 'Utilisateurs', value: users.length, icon: Mail, color: 'slate' },
                        { label: 'En attente', value: pendingCount, icon: Clock, color: 'amber', highlight: pendingCount > 0 },
                        { label: 'Approuvés', value: users.filter(u => u.status === 'approved').length, icon: CheckCircle2, color: 'emerald' },
                        { label: 'Refusés', value: users.filter(u => u.status === 'rejected').length, icon: XCircle, color: 'rose' },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="luxury-card p-6 flex items-center gap-5 group"
                        >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${stat.color === 'amber' ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white' :
                                    stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' :
                                        stat.color === 'rose' ? 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white' :
                                            'bg-slate-50 text-slate-600 group-hover:bg-slate-900 group-hover:text-white'
                                }`}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                <p className={`text-2xl font-black tracking-tight ${stat.highlight ? 'text-amber-600 animate-pulse' : 'text-slate-900'}`}>{stat.value}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-8">
                    <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-[20px] w-full lg:w-auto overflow-x-auto no-scrollbar">
                        {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setFilter(tab)}
                                className={`
                                    px-6 py-2.5 rounded-[14px] text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap
                                    ${filter === tab
                                        ? 'bg-white text-slate-900 shadow-lg shadow-slate-200/50'
                                        : 'text-slate-400 hover:text-slate-600'
                                    }
                                `}
                            >
                                {tab === 'all' ? 'Tous' : tab === 'pending' ? 'En Attente' : tab === 'approved' ? 'Approuvés' : 'Refusés'}
                                {tab === 'pending' && pendingCount > 0 && (
                                    <span className="ml-2 bg-[#FFB800] text-black w-5 h-5 inline-flex items-center justify-center rounded-full text-[9px]">
                                        {pendingCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full lg:w-96 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#FFB800] transition-colors" />
                        <input
                            type="text"
                            placeholder="Rechercher un utilisateur..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="luxury-input pl-12 py-4"
                        />
                    </div>
                </div>

                {/* Table Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="luxury-card overflow-hidden"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">UTILISATEUR</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">STATUT</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">RÔLE</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">REQUIS LE</th>
                                    <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                <AnimatePresence mode='popLayout'>
                                    {filteredUsers.map((user) => (
                                        <motion.tr
                                            key={user.id}
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="group hover:bg-slate-50/50 transition-colors"
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-black text-sm shadow-sm group-hover:scale-110 transition-transform duration-500">
                                                        {user.full_name?.substring(0, 2).toUpperCase() || '??'}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 text-sm mb-0.5">{user.full_name || 'Sans nom'}</div>
                                                        <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                                                            <Mail className="h-3 w-3" />
                                                            {user.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`
                                                    inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest
                                                    ${user.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                        user.status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                            'bg-rose-50 text-rose-600 border border-rose-100'}
                                                `}>
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${user.status === 'approved' ? 'bg-emerald-500' :
                                                            user.status === 'pending' ? 'bg-amber-500 animate-pulse' :
                                                                'bg-rose-500'
                                                        }`} />
                                                    {user.status === 'approved' ? 'Approuvé' : user.status === 'pending' ? 'En attente' : 'Refusé'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => updateUserRole(user.id, e.target.value as any)}
                                                    disabled={actionLoading === user.id}
                                                    className="bg-slate-100/50 border-none rounded-xl px-4 py-2 text-[11px] font-bold text-slate-700 focus:ring-2 focus:ring-[#FFB800]/20 hover:bg-slate-100 transition-colors cursor-pointer"
                                                >
                                                    <option value="viewer">Observateur</option>
                                                    <option value="user">Utilisateur</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2 text-slate-400 font-medium text-[11px]">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {new Date(user.requested_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end items-center gap-2">
                                                    {user.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => approveUser(user.id)}
                                                                disabled={actionLoading === user.id}
                                                                className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all duration-300"
                                                                title="Approuver"
                                                            >
                                                                <CheckCircle2 className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setShowRejectModal(user.id)}
                                                                disabled={actionLoading === user.id}
                                                                className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all duration-300"
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
                                                            className="p-2.5 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-600 hover:text-white transition-all duration-300"
                                                            title="Révoquer l'accès"
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    {user.status === 'rejected' && (
                                                        <button
                                                            onClick={() => approveUser(user.id)}
                                                            disabled={actionLoading === user.id}
                                                            className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all duration-300"
                                                            title="Ré-approuver"
                                                        >
                                                            <UserCheck className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteUser(user.id)}
                                                        disabled={actionLoading === user.id}
                                                        className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-600 hover:text-white transition-all duration-300"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>

                    {filteredUsers.length === 0 && (
                        <div className="text-center py-24">
                            <div className="w-20 h-20 bg-slate-50 rounded-[28px] flex items-center justify-center mx-auto mb-6">
                                <Mail className="h-10 w-10 text-slate-200" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 mb-2 uppercase tracking-tight">Aucun résultat</h3>
                            <p className="text-slate-400 text-sm font-medium">Nous n'avons trouvé aucun utilisateur correspondant à votre recherche.</p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Reject Modal */}
            <AnimatePresence>
                {showRejectModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowRejectModal(null)}
                            className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-[40px] max-w-lg w-full p-10 relative overflow-hidden shadow-2xl"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
                            <div className="w-16 h-16 bg-red-50 rounded-[24px] flex items-center justify-center mb-8">
                                <XCircle className="h-8 w-8 text-red-600" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">REFUSER L'ACCÈS</h3>
                            <p className="text-slate-400 text-sm mb-8 font-medium">
                                Veuillez indiquer la raison du refus (l'utilisateur pourra la voir).
                            </p>

                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Ex: Informations incomplètes ou accès non justifié..."
                                className="luxury-input h-32 py-4 mb-8 resize-none"
                            />

                            <div className="flex gap-4">
                                <button
                                    onClick={() => {
                                        setShowRejectModal(null);
                                        setRejectionReason('');
                                    }}
                                    className="luxury-button-secondary flex-1 py-4 text-[10px] font-black tracking-widest uppercase"
                                >
                                    ANNULER
                                </button>
                                <button
                                    onClick={() => rejectUser(showRejectModal)}
                                    disabled={actionLoading === showRejectModal}
                                    className="luxury-button-primary flex-1 bg-red-600 hover:bg-red-700 py-4 text-[10px] font-black tracking-widest uppercase"
                                >
                                    {actionLoading === showRejectModal ? 'TRAITEMENT...' : 'REFUSER ACCÈS'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {showInviteModal && (
                <ProjectSettingsModal onClose={() => setShowInviteModal(false)} />
            )}
        </div>
    );
}
