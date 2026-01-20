'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';

import { LayoutGrid, Package, LogOut, ReceiptText, Building2, ShoppingCart, User, Shield, ChevronDown, Plus, Trash2, Settings, Bell, CreditCard, Users } from 'lucide-react';
import GlobalSearch from './GlobalSearch';
import ProjectSettingsModal from './ProjectSettingsModal';
import { useEffect, useState, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

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
        { name: 'DÉPENSES', path: '/expenses', icon: ReceiptText },
        { name: 'FOURNISSEURS', path: '/suppliers', icon: User },
        { name: 'ARTICLES', path: '/articles', icon: Package },
        { name: 'COMMANDES', path: '/orders', icon: ShoppingCart },
        { name: 'CHANTIER', path: '/chantier', icon: LayoutGrid },
    ];

    return (
        <>
            {/* Desktop Navbar - Fixed & Compact */}
            <div className="hidden md:flex fixed top-4 left-0 right-0 z-[100] justify-center w-full font-jakarta pointer-events-none">
                <nav className="flex items-center gap-1.5 p-1.5 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-full shadow-2xl pointer-events-auto transition-transform">

                    {/* Logo Section - Compact */}
                    <Link href="/" className="flex items-center gap-2 pl-4 pr-5 border-r border-white/10 mr-1 group cursor-pointer hover:bg-white/5 rounded-l-full py-2 transition-colors">
                        <div className="bg-[#FFB800] p-1.5 rounded-md transition-transform group-hover:rotate-12">
                            <Building2 className="h-4 w-4 text-slate-900" />
                        </div>
                        <span className="font-black tracking-tighter text-sm text-white uppercase">
                            HE
                        </span>
                    </Link>

                    {/* Project Selector - Compact */}
                    <div className="relative border-r border-white/10 pr-2 mr-1" ref={projectMenuRef}>
                        <button
                            onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
                            className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-full transition-all group"
                        >
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-tight truncate max-w-[150px]">
                                {currentProject?.name || 'Projet...'}
                            </span>
                            <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${isProjectMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isProjectMenuOpen && (
                                <>
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute top-full left-0 mt-2 w-64 bg-slate-900 border border-white/10 rounded-2xl shadow-xl overflow-hidden z-[60]"
                                    >
                                        <div className="p-2 space-y-1">
                                            {projects.map((p) => (
                                                <div key={p.id} className="relative group/item">
                                                    <button
                                                        onClick={() => {
                                                            setCurrentProject(p);
                                                            setIsProjectMenuOpen(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between group transition-all ${currentProject?.id === p.id ? 'bg-[#FFB800] text-black' : 'text-slate-300 hover:bg-white/5'}`}
                                                    >
                                                        <span className="text-xs font-black uppercase truncate pr-8">{p.name}</span>
                                                        {currentProject?.id === p.id && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                                                    </button>
                                                    {p.role === 'admin' && (
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (confirm(`Supprimer "${p.name}" ?`)) {
                                                                    await deleteProject(p.id);
                                                                }
                                                            }}
                                                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg opacity-0 group-hover/item:opacity-100 transition-all hover:bg-red-500/10 text-red-400 hover:text-red-500 ${currentProject?.id === p.id ? 'text-black/40 hover:text-black hover:bg-black/5' : ''}`}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                onClick={async () => {
                                                    const name = prompt('Nom du projet:');
                                                    if (name) {
                                                        await createProject(name, '');
                                                        setIsProjectMenuOpen(false);
                                                    }
                                                }}
                                                className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-2 text-[#FFB800] hover:bg-[#FFB800]/5 border-t border-white/5 mt-1 transition-all"
                                            >
                                                <Plus className="h-4 w-4" />
                                                <span className="text-xs font-black uppercase tracking-widest">Nouveau Projet</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Navigation Pills - Simpler & Compact */}
                    <div className="flex items-center">
                        {navItems.map((item) => {
                            const isActive = pathname === item.path;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className={`
                                        relative flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-black transition-all duration-200
                                        ${isActive
                                            ? 'text-black bg-[#FFB800] shadow-sm'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }
                                    `}
                                >
                                    <Icon className={`h-4 w-4 ${isActive ? 'text-black' : ''}`} />
                                    <span className="uppercase tracking-tight">{item.name}</span>
                                </Link>
                            );
                        })}
                    </div>

                    <div className="ml-2">
                        <GlobalSearch />
                    </div>

                    {/* Admin Link */}
                    {isAdmin && (
                        <>
                            <div className="w-px h-6 bg-white/10 mx-2" />
                            <Link
                                href="/admin/users"
                                className={`
                                    relative flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300
                                    ${pathname === '/admin/users'
                                        ? 'text-white bg-slate-800 ring-1 ring-[#FFB800]/50 shadow-lg'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }
                                `}
                            >
                                <Shield className={`h-4 w-4 ${pathname === '/admin/users' ? 'text-[#FFB800]' : ''}`} />
                                <span className="tracking-wide">ADMIN</span>
                                {pendingCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-[#FFB800] text-slate-900 text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                                        {pendingCount}
                                    </span>
                                )}
                            </Link>
                        </>
                    )}

                    {/* Actions */}
                    <div className="w-px h-6 bg-white/10 mx-2" />

                    {/* Profile & Settings Dropdown */}
                    <div className="relative ml-2" ref={profileMenuRef}>
                        <button
                            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                            className="flex items-center gap-3 pl-1 pr-4 py-1.5 rounded-full hover:bg-white/5 transition-all group"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFB800] to-amber-600 p-[2px]">
                                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
                                    {/* Placeholder for user image if available, else initials */}
                                    <span className="text-xs font-black text-[#FFB800]">
                                        {user?.email?.substring(0, 2).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <ChevronDown className={`h-3 w-3 text-slate-500 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isProfileMenuOpen && (
                                <>
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute top-full right-0 mt-2 w-72 bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-[60]"
                                    >
                                        {/* User Info Header */}
                                        <div className="p-5 border-b border-white/5 bg-white/5">
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FFB800] to-amber-600 p-[2px] shadow-lg shadow-amber-500/20">
                                                    <div className="w-full h-full rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-sm">
                                                        {user?.email?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white leading-tight mb-1 line-clamp-1">{isAdmin ? 'Administrateur' : user?.email?.split('@')[0]}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium truncate max-w-[140px]">{user?.email}</p>
                                                </div>
                                            </div>

                                            {/* Subscription Status */}
                                            <div className="flex items-center gap-2 bg-[#FFB800]/10 border border-[#FFB800]/20 rounded-xl p-2.5">
                                                <div className="p-1.5 bg-[#FFB800] rounded-lg">
                                                    <CreditCard className="h-3.5 w-3.5 text-slate-900" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-[#FFB800] uppercase tracking-widest leading-none mb-0.5">Abonnement Actif</p>
                                                    <p className="text-[10px] font-bold text-white leading-none">Plan Premium</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Menu Items */}
                                        <div className="p-2 space-y-1">
                                            {currentProject && (
                                                <button
                                                    onClick={() => {
                                                        setIsProfileMenuOpen(false);
                                                        setShowProjectSettings(true);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all text-xs font-bold bg-transparent border-none outline-none focus:outline-none"
                                                >
                                                    <Users className="h-4 w-4" />
                                                    Gérer l'équipe
                                                </button>
                                            )}
                                            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all text-xs font-bold bg-transparent border-none outline-none focus:outline-none">
                                                <Settings className="h-4 w-4" />
                                                Paramètres
                                            </button>
                                            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all text-xs font-bold bg-transparent border-none outline-none focus:outline-none">
                                                <div className="relative">
                                                    <Bell className="h-4 w-4" />
                                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900"></span>
                                                </div>
                                                Notifications
                                            </button>

                                            <div className="h-px bg-white/5 my-1 mx-2" />

                                            <button
                                                onClick={() => signOut()}
                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all text-xs font-bold bg-transparent border-none outline-none focus:outline-none"
                                            >
                                                <LogOut className="h-4 w-4" />
                                                Se déconnecter
                                            </button>
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </nav>
            </div>

            {/* Mobile Navbar - Clean App-style Dock */}
            <div className="md:hidden fixed bottom-6 left-4 right-4 z-[60] font-jakarta">

                {/* Dropdown Menu Overlay */}
                <AnimatePresence>
                    {isMoreOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsMoreOpen(false)}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[-1]"
                            />
                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                                className="absolute bottom-[calc(100%+12px)] right-0 left-0 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                            >
                                <div className="p-2 space-y-1">
                                    {/* Mobile Project Selector */}
                                    <div className="px-5 py-4 border-b border-white/5 mb-2">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3">Changer de Projet</p>
                                        <div className="flex flex-col gap-2">
                                            {projects.map((p) => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => {
                                                        setCurrentProject(p);
                                                        setIsMoreOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all ${currentProject?.id === p.id ? 'bg-[#FFB800] text-black' : 'bg-white/5 text-slate-300'}`}
                                                >
                                                    <span className="text-xs font-bold uppercase truncate pr-4">{p.name}</span>
                                                    {currentProject?.id === p.id && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                                                </button>
                                            ))}
                                            <button
                                                onClick={async () => {
                                                    const name = prompt('Nom du nouveau projet:');
                                                    if (name) {
                                                        await createProject(name, '');
                                                        setIsMoreOpen(false);
                                                    }
                                                }}
                                                className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-[#FFB800] border border-[#FFB800]/20 bg-[#FFB800]/5 mt-1"
                                            >
                                                <Plus className="h-4 w-4" />
                                                <span className="text-xs font-black uppercase tracking-widest">Nouveau Projet</span>
                                            </button>
                                        </div>
                                    </div>

                                    {[
                                        { name: 'ARTICLES', path: '/articles', icon: Package },
                                        { name: 'COMMANDES', path: '/orders', icon: ShoppingCart },
                                    ].map((item) => (
                                        <Link
                                            key={item.path}
                                            href={item.path}
                                            onClick={() => setIsMoreOpen(false)}
                                            className="flex items-center gap-4 px-5 py-4 text-white hover:bg-white/5 transition-colors rounded-xl group"
                                        >
                                            <div className="p-2 bg-white/5 rounded-lg text-slate-400 group-hover:text-[#FFB800] transition-colors">
                                                <item.icon className="w-5 h-5" />
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-widest">{item.name}</span>
                                        </Link>
                                    ))}

                                    {isAdmin && (
                                        <Link
                                            href="/admin/users"
                                            onClick={() => setIsMoreOpen(false)}
                                            className="flex items-center justify-between px-5 py-4 text-white hover:bg-white/5 transition-colors rounded-xl group border-t border-white/5"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-[#FFB800]/10 rounded-lg text-[#FFB800]">
                                                    <Shield className="w-5 h-5" />
                                                </div>
                                                <span className="text-xs font-black uppercase tracking-widest">Administration</span>
                                            </div>
                                            {pendingCount > 0 && (
                                                <span className="bg-[#FFB800] text-black text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center">
                                                    {pendingCount}
                                                </span>
                                            )}
                                        </Link>
                                    )}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                <nav className="flex items-center justify-around bg-slate-900/95 backdrop-blur-2xl border border-white/10 p-2 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    {[
                        { name: 'Dépenses', path: '/expenses', icon: ReceiptText },
                        { name: 'Fourn.', path: '/suppliers', icon: User },
                        { name: 'Chantier', path: '/chantier', icon: LayoutGrid },
                    ].map((item) => {
                        const isActive = pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => setIsMoreOpen(false)}
                                className={`
                                    flex flex-col items-center justify-center flex-1 h-14 rounded-xl transition-all duration-300 gap-1
                                    ${isActive ? 'text-[#FFB800]' : 'text-slate-500'}
                                    ${item.name === 'Fourn.' ? 'scale-110' : ''}
                                `}
                            >
                                <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-[#FFB800]/10' : ''}`}>
                                    <Icon className={`${item.name === 'Fourn.' ? 'h-6 w-6' : 'h-5 w-5'}`} strokeWidth={isActive ? 3 : 2} />
                                </div>
                                <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-40'} ${item.name === 'Fourn.' ? 'text-[9px]' : ''}`}>
                                    {item.name}
                                </span>
                            </Link>
                        );
                    })}

                    {/* More Menu Toggle */}
                    <button
                        onClick={() => setIsMoreOpen(!isMoreOpen)}
                        className={`
                            flex flex-col items-center justify-center flex-1 h-14 rounded-xl transition-all duration-300 gap-1
                            ${isMoreOpen || (pathname === '/articles' || pathname === '/orders' || pathname === '/admin/users') ? 'text-[#FFB800]' : 'text-slate-500'}
                        `}
                    >
                        <div className={`p-2 rounded-lg transition-colors ${isMoreOpen || (pathname === '/articles' || pathname === '/orders' || pathname === '/admin/users') ? 'bg-[#FFB800]/10' : ''}`}>
                            <Package className="h-5 w-5" />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Plus</span>
                    </button>

                    <div className="w-px h-8 bg-white/10 mx-1" />

                    <button
                        onClick={() => signOut()}
                        className="flex items-center justify-center w-12 h-12 rounded-xl text-slate-500 hover:text-red-500 transition-colors"
                    >
                        <LogOut className="h-5 w-5" strokeWidth={2} />
                    </button>
                </nav>
            </div>
            {/* Spacer for Fixed Navbar */}
            <div className="hidden md:block h-24 w-full" />

            {showProjectSettings && (
                <ProjectSettingsModal onClose={() => setShowProjectSettings(false)} />
            )}
        </>
    );
}
