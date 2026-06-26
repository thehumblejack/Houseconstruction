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
    CheckCircle2,
    Database,
    Building2,
    Briefcase,
    Activity,
    AlertCircle,
    ChevronRight,
} from 'lucide-react';
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
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                    <p className="text-slate-500 text-sm">Chargement...</p>
                </div>
            </div>
        );
    }

    const cards = [
        {
            label: 'Utilisateurs',
            value: stats.totalUsers,
            hint: stats.pendingUsers > 0 ? `${stats.pendingUsers} en attente` : 'Tout à jour',
            icon: Users,
            tone: 'bg-slate-100 text-slate-600',
            highlight: stats.pendingUsers > 0,
        },
        {
            label: 'Projets actifs',
            value: stats.totalProjects,
            hint: 'Chantiers suivis',
            icon: Building2,
            tone: 'bg-blue-50 text-blue-600',
        },
        {
            label: 'Membres approuvés',
            value: stats.approvedUsers,
            hint: 'Accès actifs',
            icon: CheckCircle2,
            tone: 'bg-emerald-50 text-emerald-600',
        },
        {
            label: 'Activité système',
            value: '99.9%',
            hint: 'Disponibilité',
            icon: Activity,
            tone: 'bg-violet-50 text-violet-600',
        },
    ];

    const shortcuts = [
        { title: 'Gestion des utilisateurs', subtitle: 'Accès, rôles et invitations', icon: Users, link: '/admin/users' },
        { title: 'Configuration des projets', subtitle: 'Paramètres des chantiers', icon: LayoutGrid, link: '#' },
        { title: "Journal d'audit", subtitle: 'Historique des actions', icon: Briefcase, link: '#' },
        { title: 'Support client', subtitle: 'Assistance et tickets', icon: AlertCircle, link: '#' },
    ];

    const events = [
        { user: 'Admin', action: 'Système mis à jour', time: '12m', icon: Shield, tone: 'bg-slate-900 text-white' },
        { user: 'Client', action: 'Nouveau projet créé', time: '1h', icon: LayoutGrid, tone: 'bg-blue-50 text-blue-600' },
        { user: 'Modérateur', action: 'Utilisateur approuvé', time: '3h', icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600' },
        { user: 'Système', action: 'Sauvegarde effectuée', time: '5h', icon: Database, tone: 'bg-slate-100 text-slate-600' },
    ];

    const systemStatus = [
        { label: 'Cloud API', status: 'En ligne', active: true },
        { label: 'Base de données', status: 'En ligne', active: true },
        { label: 'Edge Functions', status: 'Inactif', active: false },
    ];

    return (
        <div className="min-h-screen font-jakarta">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 pb-28 md:pb-12 space-y-5">
                {/* Page header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">Tableau de bord</h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Bienvenue, <span className="text-slate-700 font-medium">{user?.email?.split('@')[0]}</span>.
                        </p>
                    </div>
                    <Link
                        href="/admin/users"
                        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 active:scale-[0.99] transition-colors"
                    >
                        <Users className="h-4 w-4" /> Gérer les utilisateurs
                    </Link>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {cards.map((card) => (
                        <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                            <div className="flex items-start justify-between">
                                <p className="text-xs text-slate-500">{card.label}</p>
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${card.tone}`}>
                                    <card.icon className="h-4 w-4" />
                                </span>
                            </div>
                            <p className="text-xl sm:text-2xl font-semibold text-slate-900 tabular-nums mt-1">{card.value}</p>
                            <p className={`text-xs mt-1 ${card.highlight ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>{card.hint}</p>
                        </div>
                    ))}
                </div>

                {/* Main content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Activity feed */}
                    <div className="lg:col-span-2 space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                <Activity className="h-4 w-4 text-slate-400" />
                                Événements récents
                            </h2>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                            {events.map((item, i) => (
                                <div key={i} className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors">
                                    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${item.tone}`}>
                                        <item.icon className="h-4 w-4" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-slate-900 truncate">{item.action}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{item.user} • {item.time}</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Shortcuts + status */}
                    <div className="space-y-3">
                        <h2 className="text-sm font-semibold text-slate-900 px-1">Raccourcis</h2>
                        <div className="space-y-2.5">
                            {shortcuts.map((nav) => (
                                <Link key={nav.title} href={nav.link}>
                                    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 text-slate-600 shrink-0">
                                            <nav.icon className="h-4 w-4" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-slate-900 truncate">{nav.title}</p>
                                            <p className="text-xs text-slate-400 truncate">{nav.subtitle}</p>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Status widget */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                            <h3 className="text-sm font-semibold text-slate-900 mb-3">Statut système</h3>
                            <div className="space-y-2.5">
                                {systemStatus.map((s) => (
                                    <div key={s.label} className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600">{s.label}</span>
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${s.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                            {s.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
