'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';

import { Package, LogOut, ReceiptText, Building2, ShoppingCart, User, Shield, ChevronDown, Plus, Trash2, Users, Check, Menu } from 'lucide-react';
import GlobalSearch from './GlobalSearch';
import ProjectSettingsModal from './ProjectSettingsModal';
import { useEffect, useState, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase';

export default function Navbar() {
    const pathname = usePathname();
    const { signOut, isAdmin, user, isApproved } = useAuth();

    // Hide navbar on invite acceptance page
    if (pathname === '/invite/accept') return null;

    const { projects, currentProject, setCurrentProject, createProject, deleteProject, userRole } = useProject();
    const [pendingCount, setPendingCount] = useState(0);
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [showProjectSettings, setShowProjectSettings] = useState(false);
    const supabase = useMemo(() => createClient(), []);

    const projectMenuRef = useRef<HTMLDivElement>(null);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    // Global click listener for dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
                setIsProjectMenuOpen(false);
            }
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isAdmin) {
            const fetchPendingCount = async () => {
                try {
                    const { count, error } = await supabase
                        .from('user_profiles')
                        .select('*', { count: 'exact', head: true })
                        .eq('status', 'pending');

                    if (error) {
                        // Table likely doesn't exist yet, ignore
                        return;
                    }
                    setPendingCount(count || 0);
                } catch (err) {
                    // Silently fail if table doesn't exist
                }
            };
            fetchPendingCount();

            // Subscribe to changes
            const channel = supabase
                .channel('user_profiles_changes')
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'user_profiles' },
                    () => fetchPendingCount()
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [isAdmin, supabase]);

    // Don't show navbar on auth related pages, root landing page, or project case studies
    if (pathname === '/login' || pathname?.startsWith('/auth/')) return null;
    if (pathname === '/') return null; // Root is landing page
    if (pathname?.startsWith('/projets/')) return null;

    const navItems = [
        { name: 'Dépenses', path: '/expenses', icon: ReceiptText },
        { name: 'Fournisseurs', path: '/suppliers', icon: User },
        { name: 'Articles', path: '/articles', icon: Package },
        { name: 'Commandes', path: '/orders', icon: ShoppingCart },
    ];
    const userInitials = user?.email?.substring(0, 2).toUpperCase() || '··';

    return (
        <>
            {/* ───────── Desktop top bar ───────── */}
            <header className="hidden md:flex fixed top-4 inset-x-0 z-[100] justify-center px-4 font-jakarta pointer-events-none">
                <nav className="pointer-events-auto flex items-center gap-1 h-14 px-2 rounded-2xl bg-white/85 backdrop-blur-xl border border-slate-200/80 shadow-sm">

                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 pl-1 pr-1.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-white" strokeWidth={2.4} />
                        </div>
                        <span className="hidden xl:block text-sm font-semibold text-slate-900 tracking-tight">HouseExpert</span>
                    </Link>

                    <div className="w-px h-6 bg-slate-200 mx-1" />

                    {/* Project selector */}
                    <div className="relative" ref={projectMenuRef}>
                        <button
                            onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
                            className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                            <span className="truncate max-w-[130px]">{currentProject?.name || 'Projet'}</span>
                            <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isProjectMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isProjectMenuOpen && (
                            <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2 duration-150">
                                <div className="px-4 pt-3 pb-1.5">
                                    <p className="text-xs font-medium text-slate-400">Vos projets</p>
                                </div>
                                <div className="px-2 pb-2 space-y-0.5 max-h-[320px] overflow-y-auto">
                                    {projects.map((p) => (
                                        <div key={p.id} className="relative group">
                                            <button
                                                onClick={() => { setCurrentProject(p); setIsProjectMenuOpen(false); }}
                                                className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between text-sm font-medium transition-colors ${currentProject?.id === p.id ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                                            >
                                                <span className="truncate pr-6">{p.name}</span>
                                                {currentProject?.id === p.id && <Check className="h-4 w-4 shrink-0" />}
                                            </button>
                                            {p.role === 'admin' && (
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (confirm(`Supprimer "${p.name}" ?`)) await deleteProject(p.id);
                                                    }}
                                                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition ${currentProject?.id === p.id ? 'text-white/70 hover:bg-white/10' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="p-2 border-t border-slate-100">
                                    <button
                                        onClick={async () => {
                                            const name = prompt('Nom du projet:');
                                            if (name) { await createProject(name, ''); setIsProjectMenuOpen(false); }
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                        <Plus className="h-4 w-4 text-slate-400" /> Nouveau projet
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-px h-6 bg-slate-200 mx-1" />

                    {/* Nav links */}
                    <div className="flex items-center gap-0.5">
                        {navItems.map((item) => {
                            const isActive = pathname === item.path;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className={`flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                >
                                    <Icon className="h-4 w-4" strokeWidth={2} />
                                    <span className="hidden lg:inline">{item.name}</span>
                                </Link>
                            );
                        })}
                    </div>

                    <div className="w-px h-6 bg-slate-200 mx-1" />

                    <GlobalSearch />

                    {isAdmin && (
                        <Link
                            href="/admin"
                            className={`relative flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm font-medium transition-colors ${pathname?.startsWith('/admin') ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            <Shield className="h-4 w-4" strokeWidth={2} />
                            <span className="hidden lg:inline">Admin</span>
                            {pendingCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                                    {pendingCount}
                                </span>
                            )}
                        </Link>
                    )}

                    <div className="w-px h-6 bg-slate-200 mx-1" />

                    {/* Profile */}
                    <div className="relative" ref={profileMenuRef}>
                        <button
                            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                            className="flex items-center gap-1.5 pl-1 pr-1.5 h-10 rounded-xl hover:bg-slate-100 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-[11px] font-semibold">
                                {userInitials}
                            </div>
                            <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isProfileMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2 duration-150">
                                <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                                        {userInitials}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 truncate">{isAdmin ? 'Chef de projet' : user?.email?.split('@')[0]}</p>
                                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                                    </div>
                                </div>
                                <div className="p-2">
                                    {currentProject && (
                                        <button
                                            onClick={() => { setIsProfileMenuOpen(false); setShowProjectSettings(true); }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                        >
                                            <Users className="h-4 w-4 text-slate-400" /> Gérer l&apos;équipe
                                        </button>
                                    )}
                                    <button
                                        onClick={() => signOut()}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                                    >
                                        <LogOut className="h-4 w-4" /> Se déconnecter
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </nav>
            </header>

            {/* ───────── Mobile bottom dock ───────── */}
            <div className="md:hidden fixed bottom-4 inset-x-4 z-[60] font-jakarta">

                {/* Bottom sheet */}
                {isMoreOpen && (
                    <>
                        <div
                            onClick={() => setIsMoreOpen(false)}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
                        />
                        <div className="absolute bottom-[calc(100%+12px)] inset-x-0 bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">
                            <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-slate-200" />
                            {/* Project switcher */}
                            <div className="p-4 border-b border-slate-100">
                                <p className="text-xs font-medium text-slate-400 mb-2">Projet</p>
                                <div className="space-y-1">
                                    {projects.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => { setCurrentProject(p); setIsMoreOpen(false); }}
                                            className={`w-full text-left px-3 py-3 rounded-xl flex items-center justify-between text-sm font-medium transition-colors ${currentProject?.id === p.id ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700'}`}
                                        >
                                            <span className="truncate pr-4">{p.name}</span>
                                            {currentProject?.id === p.id && <Check className="h-4 w-4 shrink-0" />}
                                        </button>
                                    ))}
                                    <button
                                        onClick={async () => {
                                            const name = prompt('Nom du nouveau projet:');
                                            if (name) { await createProject(name, ''); setIsMoreOpen(false); }
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
                                    >
                                        <Plus className="h-4 w-4 text-slate-400" /> Nouveau projet
                                    </button>
                                </div>
                            </div>
                            {/* Links */}
                            <div className="p-2">
                                <Link
                                    href="/orders"
                                    onClick={() => setIsMoreOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${pathname === '/orders' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                                >
                                    <ShoppingCart className="h-4 w-4" /> Commandes
                                </Link>
                                {isAdmin && (
                                    <Link
                                        href="/admin/users"
                                        onClick={() => setIsMoreOpen(false)}
                                        className="flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                        <span className="flex items-center gap-3"><Shield className="h-4 w-4" /> Administration</span>
                                        {pendingCount > 0 && (
                                            <span className="bg-rose-500 text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                                                {pendingCount}
                                            </span>
                                        )}
                                    </Link>
                                )}
                                <button
                                    onClick={() => signOut()}
                                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                    <LogOut className="h-4 w-4" /> Se déconnecter
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Dock */}
                <nav className="flex items-stretch h-16 px-1.5 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200 shadow-lg">
                    {navItems.slice(0, 3).map((item) => {
                        const isActive = pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => setIsMoreOpen(false)}
                                className="flex-1 flex flex-col items-center justify-center gap-1"
                            >
                                <div className={`flex items-center justify-center w-11 h-7 rounded-lg transition-colors ${isActive ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>
                                    <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                                </div>
                                <span className={`text-[10px] font-medium leading-none ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>{item.name}</span>
                            </Link>
                        );
                    })}

                    <button
                        onClick={() => setIsMoreOpen(!isMoreOpen)}
                        className="flex-1 flex flex-col items-center justify-center gap-1"
                    >
                        <div className={`flex items-center justify-center w-11 h-7 rounded-lg transition-colors ${isMoreOpen || pathname === '/orders' || pathname?.startsWith('/admin') ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>
                            <Menu className="h-[18px] w-[18px]" strokeWidth={2} />
                        </div>
                        <span className={`text-[10px] font-medium leading-none ${isMoreOpen || pathname === '/orders' || pathname?.startsWith('/admin') ? 'text-slate-900' : 'text-slate-400'}`}>Plus</span>
                    </button>
                </nav>
            </div>

            {/* Spacer for fixed desktop bar */}
            <div className="hidden md:block h-28 w-full" />

            {showProjectSettings && (
                <ProjectSettingsModal onClose={() => setShowProjectSettings(false)} />
            )}
        </>
    );
}
