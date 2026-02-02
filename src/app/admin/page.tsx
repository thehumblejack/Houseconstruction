'use client';

import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import {
    Shield,
    Users,
    LayoutGrid,
    Settings,
    TrendingUp,
    Activity,
    AlertCircle,
    CheckCircle2,
    Clock,
    ChevronRight,
    Database,
    ShieldCheck,
    ArrowUpRight,
    Building2,
    Briefcase
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function AdminDashboard() {
    const { isAdmin, loading: authLoading, user } = useAuth();
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);

    const [stats, setStats] = useState({
        totalUsers: 0,
        pendingUsers: 0,
        totalProjects: 0,
        approvedUsers: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            router.push('/');
        }
    }, [isAdmin, authLoading, router]);

    useEffect(() => {
        if (isAdmin) {
            fetchStats();
        }
    }, [isAdmin]);

    const fetchStats = async () => {
        try {
            // Fetch Users count
            const { count: totalUsers } = await supabase
                .from('user_profiles')
                .select('*', { count: 'exact', head: true });

            const { count: pendingUsers } = await supabase
                .from('user_profiles')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            const { count: approvedUsers } = await supabase
                .from('user_profiles')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'approved');

            // Fetch Projects count
            const { count: totalProjects } = await supabase
                .from('projects')
                .select('*', { count: 'exact', head: true });

            setStats({
                totalUsers: totalUsers || 0,
                pendingUsers: pendingUsers || 0,
                totalProjects: totalProjects || 0,
                approvedUsers: approvedUsers || 0
            });
        } catch (error) {
            console.error('Error fetching admin stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-[#FFB800]/10 border-t-[#FFB800] rounded-full animate-spin" />
                        <Shield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-[#FFB800]" />
                    </div>
                    <p className="text-[10px] font-black text-[#FFB800] uppercase tracking-[0.3em] animate-pulse">Initialisation du Centre d'Administration...</p>
                </div>
            </div>
        );
    }

    const cards = [
        {
            title: 'Utilisateurs',
            subtitle: 'Gérer les accès et rôles',
            value: stats.totalUsers,
            trend: stats.pendingUsers > 0 ? `${stats.pendingUsers} en attente` : 'Tout à jour',
            icon: Users,
            color: '#FFB800',
            link: '/admin/users',
            highlight: stats.pendingUsers > 0
        },
        {
            title: 'Projets Actifs',
            subtitle: 'Surveillance des chantiers',
            value: stats.totalProjects,
            trend: 'Stable',
            icon: Building2,
            color: '#3B82F6',
            link: '#',
        },
        {
            title: 'Activité Système',
            subtitle: 'Performances globales',
            value: '99.9%',
            trend: 'Optimisé',
            icon: Activity,
            color: '#10B981',
            link: '#',
        },
        {
            title: 'Base de Données',
            subtitle: 'Santé de l\'infrastructure',
            value: 'OK',
            trend: 'Synchronisé',
            icon: Database,
            color: '#8B5CF6',
            link: '#',
        }
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 font-jakarta">
            {/* Background Decorative Elements */}
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[#FFB800]/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 pt-16 relative">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-[#FFB800] p-2 rounded-xl shadow-lg shadow-amber-500/20">
                                <ShieldCheck className="h-5 w-5 text-slate-900" />
                            </div>
                            <span className="text-[10px] font-black text-[#FFB800] tracking-[0.4em] uppercase">Espace Administrateur</span>
                        </div>
                        <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none mb-3">Tableau de Bord</h1>
                        <p className="text-slate-400 text-sm font-medium uppercase tracking-widest flex items-center gap-2">
                            Bienvenue, <span className="text-slate-900 font-black">{user?.email?.split('@')[0]}</span>
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-4 bg-white p-2 rounded-[24px] shadow-sm border border-slate-100"
                    >
                        <div className="flex -space-x-3 p-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-10 h-10 rounded-xl bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-400">
                                    {String.fromCharCode(64 + i)}
                                </div>
                            ))}
                        </div>
                        <div className="pr-4 border-l border-slate-100 pl-4">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Membres Actifs</p>
                            <p className="text-sm font-black text-slate-900">{stats.approvedUsers} Approuvés</p>
                        </div>
                    </motion.div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                    {cards.map((card, i) => (
                        <motion.div
                            key={card.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="group"
                        >
                            <Link href={card.link}>
                                <div className="luxury-card p-8 h-full flex flex-col justify-between bg-white relative overflow-hidden group-hover:scale-[1.02] transition-all duration-500">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-[#FFB800]/5 transition-colors duration-500" />

                                    <div className="relative mb-8">
                                        <div className="w-16 h-16 rounded-[24px] bg-slate-50 flex items-center justify-center mb-6 group-hover:bg-slate-900 transition-all duration-500 group-hover:rotate-6 shadow-sm">
                                            <card.icon className="h-7 w-7 text-slate-900 group-hover:text-white transition-colors duration-500" />
                                        </div>
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{card.title}</h3>
                                        <div className="flex items-baseline gap-3">
                                            <span className="text-4xl font-black text-slate-900 tracking-tighter">{card.value}</span>
                                            {card.highlight && (
                                                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                                            )}
                                        </div>
                                    </div>

                                    <div className="relative pt-6 border-t border-slate-50 flex items-center justify-between">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${card.highlight ? 'text-amber-600' : 'text-slate-400 group-hover:text-slate-900'}`}>{card.trend}</span>
                                        <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-slate-900 transition-all" />
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Activity Feed */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="flex items-center justify-between mb-2 px-2">
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                                <Activity className="h-5 w-5 text-[#FFB800]" />
                                Événements Récents
                            </h2>
                            <button className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-[0.2em] transition-colors">Voir Tout</button>
                        </div>

                        <div className="luxury-card bg-white p-2">
                            {[
                                { user: 'Admin', action: 'Système mis à jour', time: '12m', icon: Shield, type: 'system' },
                                { user: 'Client', action: 'Nouveau projet créé', time: '1h', icon: LayoutGrid, type: 'info' },
                                { user: 'Modérateur', action: 'Utilisateur approuvé', time: '3h', icon: CheckCircle2, type: 'success' },
                                { user: 'Système', action: 'Sauvegarde effectuée', time: '5h', icon: Database, type: 'system' },
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 + i * 0.1 }}
                                    className="flex items-center gap-5 p-5 hover:bg-slate-50 rounded-[24px] group transition-all duration-300 cursor-default"
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm ${item.type === 'success' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' :
                                            item.type === 'system' ? 'bg-slate-900 text-white' :
                                                'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                                        }`}>
                                        <item.icon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-black text-slate-900 group-hover:translate-x-1 transition-transform">{item.action}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{item.user} • {item.time}</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-slate-400 transition-colors" />
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Shortcuts */}
                    <div className="space-y-8">
                        <div className="px-2">
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                                <Settings className="h-5 w-5 text-[#FFB800]" />
                                Raccourcis
                            </h2>
                        </div>

                        <div className="space-y-4">
                            {[
                                { title: 'Gestion Utilisateurs', icon: Users, color: '#FFB800', link: '/admin/users' },
                                { title: 'Configuration Projets', icon: LayoutGrid, color: '#3B82F6', link: '#' },
                                { title: 'Journal d\'Audit', icon: Briefcase, color: '#8B5CF6', link: '#' },
                                { title: 'Support Client', icon: AlertCircle, color: '#EF4444', link: '#' },
                            ].map((nav, i) => (
                                <motion.div
                                    key={nav.title}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 + i * 0.1 }}
                                >
                                    <Link href={nav.link}>
                                        <div className="luxury-card p-6 flex items-center justify-between group bg-white border border-slate-100 hover:border-[#FFB800]/30 hover:shadow-xl hover:shadow-[#FFB800]/5 transition-all duration-500">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm">
                                                    <nav.icon className="h-5 w-5 text-slate-900" style={{ color: nav.color }} />
                                                </div>
                                                <span className="text-[11px] font-black text-slate-600 group-hover:text-slate-900 uppercase tracking-[0.1em]">{nav.title}</span>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>

                        {/* Status Widget */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.9 }}
                            className="luxury-card p-8 bg-slate-900 text-white relative overflow-hidden group shadow-2xl shadow-slate-900/20"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                            <h3 className="text-[9px] font-black text-[#FFB800] uppercase tracking-[0.3em] mb-4">Statut de la Maintenance</h3>
                            <div className="space-y-4">
                                {[
                                    { label: 'Cloud API', status: 'En ligne', active: true },
                                    { label: 'Base de Données', status: 'En ligne', active: true },
                                    { label: 'Edge Functions', status: 'Inactif', active: false },
                                ].map(s => (
                                    <div key={s.label} className="flex justify-between items-end border-b border-white/5 pb-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</span>
                                        <span className={`text-[10px] font-black uppercase flex items-center gap-2 ${s.active ? 'text-emerald-400' : 'text-slate-500'}`}>
                                            <div className={`h-1 w-1 rounded-full ${s.active ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-slate-500'}`} />
                                            {s.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
