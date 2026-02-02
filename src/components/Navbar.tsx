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
            <div className="hidden md:flex fixed top-6 left-0 right-0 z-[100] justify-center w-full font-jakarta pointer-events-none">
                <nav className="flex items-center gap-1.5 p-1.5 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] pointer-events-auto transition-all duration-500 hover:shadow-[0_30px_70px_rgba(0,0,0,0.4)]">

                    {/* Logo Section - Compact */}
                    <Link href="/" className="flex items-center gap-2 pl-4 pr-5 border-r border-white/5 mr-1 group cursor-pointer hover:bg-white/5 rounded-l-full py-2 transition-all duration-300">
                        <div className="bg-[#FFB800] p-2 rounded-xl shadow-lg shadow-amber-500/20 transition-all duration-500 group-hover:rotate-[360deg] group-hover:scale-110">
                            <Building2 className="h-4 w-4 text-slate-900" strokeWidth={2.5} />
                        </div>
                        <span className="font-black tracking-tighter text-sm text-white uppercase group-hover:text-[#FFB800] transition-colors">
                            HE
                        </span>
                    </Link>

                    {/* Project Selector - Compact */}
                    <div className="relative border-r border-white/5 pr-2 mr-1" ref={projectMenuRef}>
                        <button
                            onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
                            className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-full transition-all group"
                        >
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors truncate max-w-[140px]">
                                {currentProject?.name || 'Projet...'}
                            </span>
                            <ChevronDown className={`h-3 w-3 text-slate-500 transition-transform duration-500 ${isProjectMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isProjectMenuOpen && (
                                <>
                                    <motion.div
                                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 15, scale: 0.95 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        className="absolute top-full left-0 mt-3 w-72 bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-[60] backdrop-blur-xl"
                                    >
                                        <div className="p-2 space-y-1">
                                            <div className="px-4 py-3 border-b border-white/5 mb-1">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Vos Projets</p>
                                            </div>
                                            {projects.map((p) => (
                                                <div key={p.id} className="relative group/item px-1">
                                                    <button
                                                        onClick={() => {
                                                            setCurrentProject(p);
                                                            setIsProjectMenuOpen(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-3.5 rounded-2xl flex items-center justify-between group transition-all duration-300 ${currentProject?.id === p.id ? 'bg-[#FFB800] text-black shadow-lg shadow-amber-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                                    >
                                                        <span className="text-[11px] font-black uppercase tracking-tight truncate pr-8">{p.name}</span>
                                                        {currentProject?.id === p.id && <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />}
                                                    </button>
                                                    {p.role === 'admin' && (
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (confirm(`Supprimer "${p.name}" ?`)) {
                                                                    await deleteProject(p.id);
                                                                }
                                                            }}
                                                            className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl opacity-0 group-hover/item:opacity-100 transition-all hover:bg-red-500/10 text-red-400 hover:text-red-500 ${currentProject?.id === p.id ? 'text-black/40 hover:text-black hover:bg-black/5' : ''}`}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <div className="p-1 mt-1 border-t border-white/5">
                                                <button
                                                    onClick={async () => {
                                                        const name = prompt('Nom du projet:');
                                                        if (name) {
                                                            await createProject(name, '');
                                                            setIsProjectMenuOpen(false);
                                                        }
                                                    }}
                                                    className="w-full text-left px-4 py-4 rounded-2xl flex items-center gap-3 text-[#FFB800] hover:bg-[#FFB800]/5 hover:translate-x-1 transition-all group"
                                                >
                                                    <div className="p-1.5 bg-[#FFB800]/10 rounded-lg group-hover:bg-[#FFB800] group-hover:text-black transition-colors">
                                                        <Plus className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-[11px] font-black uppercase tracking-widest">Nouveau Projet</span>
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Navigation Pills - Simpler & Compact */}
                    <div className="flex items-center gap-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.path;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className={`
                                        relative flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black transition-all duration-300
                                        ${isActive
                                            ? 'text-black bg-[#FFB800] shadow-lg shadow-amber-500/20'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }
                                    `}
                                >
                                    <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-black' : ''}`} strokeWidth={2.5} />
                                    <span className="uppercase tracking-[0.15em]">{item.name}</span>
                                </Link>
                            );
                        })}
                    </div>

                    <div className="ml-2 pr-2 border-r border-white/5">
                        <GlobalSearch />
                    </div>

                    {/* Admin Link */}
                    {isAdmin && (
                        <div className="pl-1">
                            <Link
                                href="/admin"
                                className={`
                                    relative flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black transition-all duration-300
                                    ${pathname?.startsWith('/admin')
                                        ? 'text-white bg-slate-800 ring-1 ring-[#FFB800]/50 shadow-xl'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }
                                `}
                            >
                                <Shield className={`h-3.5 w-3.5 ${pathname?.startsWith('/admin') ? 'text-[#FFB800]' : ''}`} strokeWidth={2.5} />
                                <span className="uppercase tracking-[0.15em]">ADMIN</span>
                                {pendingCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-[#FFB800] text-slate-900 text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center animate-bounce shadow-lg shadow-amber-500/20">
                                        {pendingCount}
                                    </span>
                                )}
                            </Link>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="w-px h-6 bg-white/5 mx-1" />

                    {/* Profile & Settings Dropdown */}
                    <div className="relative ml-1" ref={profileMenuRef}>
                        <button
                            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                            className="flex items-center gap-3 pl-1 pr-4 py-1.5 rounded-full hover:bg-white/5 transition-all group"
                        >
                            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#FFB800] to-amber-600 p-[2px] shadow-lg shadow-amber-500/10 group-hover:scale-105 group-hover:rotate-3 transition-all duration-500">
                                <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center overflow-hidden">
                                    <span className="text-[10px] font-black text-[#FFB800]">
                                        {user?.email?.substring(0, 2).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <ChevronDown className={`h-3 w-3 text-slate-500 transition-transform duration-500 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isProfileMenuOpen && (
                                <>
                                    <motion.div
                                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 15, scale: 0.95 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        className="absolute top-full right-0 mt-3 w-80 bg-slate-900 border border-white/10 rounded-[32px] shadow-2xl overflow-hidden z-[60] backdrop-blur-xl"
                                    >
                                        {/* User Info Header */}
                                        <div className="p-6 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                                            <div className="flex items-center gap-5 mb-5">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FFB800] to-amber-600 p-[2.5px] shadow-xl shadow-amber-500/20">
                                                    <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center text-white font-black text-lg">
                                                        {user?.email?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-white leading-tight mb-1 truncate uppercase tracking-tight">
                                                        {isAdmin ? 'Chef de Projet' : user?.email?.split('@')[0]}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 font-bold truncate tracking-wide">{user?.email}</p>
                                                </div>
                                            </div>

                                            {/* Subscription Status */}
                                            <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-2xl p-3.5 group hover:bg-white/[0.05] transition-colors cursor-default">
                                                <div className="p-2 bg-[#FFB800] rounded-xl shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                                                    <CreditCard className="h-4 w-4 text-slate-900" strokeWidth={2.5} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-black text-[#FFB800] uppercase tracking-[0.2em] leading-none mb-1.5">Premium</p>
                                                    <p className="text-[11px] font-bold text-white/90 leading-none">Accès Illimité</p>
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
                                                    className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-[11px] font-black uppercase tracking-widest bg-transparent border-none outline-none group"
                                                >
                                                    <div className="p-2 rounded-xl group-hover:bg-[#FFB800]/10 transition-colors">
                                                        <Users className="h-4 w-4" />
                                                    </div>
                                                    Gérer l'équipe
                                                </button>
                                            )}
                                            <button className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-[11px] font-black uppercase tracking-widest bg-transparent border-none outline-none group">
                                                <div className="p-2 rounded-xl group-hover:bg-[#FFB800]/10 transition-colors">
                                                    <Settings className="h-4 w-4" />
                                                </div>
                                                Paramètres
                                            </button>
                                            <button className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-[11px] font-black uppercase tracking-widest bg-transparent border-none outline-none group">
                                                <div className="relative">
                                                    <div className="p-2 rounded-xl group-hover:bg-[#FFB800]/10 transition-colors">
                                                        <Bell className="h-4 w-4" />
                                                    </div>
                                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FFB800] rounded-full border-2 border-slate-900 animate-pulse"></span>
                                                </div>
                                                Notifications
                                            </button>

                                            <div className="h-px bg-white/5 my-2 mx-4" />

                                            <button
                                                onClick={() => signOut()}
                                                className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all text-[11px] font-black uppercase tracking-widest bg-transparent border-none outline-none group"
                                            >
                                                <div className="p-2 rounded-xl group-hover:bg-red-500/10 transition-colors">
                                                    <LogOut className="h-4 w-4" strokeWidth={2.5} />
                                                </div>
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
            <div className="md:hidden fixed bottom-6 left-6 right-6 z-[60] font-jakarta">

                {/* Dropdown Menu Overlay */}
                <AnimatePresence>
                    {isMoreOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsMoreOpen(false)}
                                className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[-1]"
                            />
                            <motion.div
                                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="absolute bottom-[calc(100%+20px)] right-0 left-0 bg-slate-900 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-2xl"
                            >
                                <div className="p-2 space-y-1">
                                    {/* Mobile Project Selector */}
                                    <div className="px-6 py-5 border-b border-white/5 mb-2 bg-gradient-to-b from-white/5 to-transparent">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Changer de Projet</p>
                                        <div className="flex flex-col gap-2">
                                            {projects.map((p) => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => {
                                                        setCurrentProject(p);
                                                        setIsMoreOpen(false);
                                                    }}
                                                    className={`w-full text-left px-5 py-4 rounded-2xl flex items-center justify-between transition-all duration-300 ${currentProject?.id === p.id ? 'bg-[#FFB800] text-black shadow-lg shadow-amber-500/20' : 'bg-white/5 text-slate-400'}`}
                                                >
                                                    <span className="text-[11px] font-black uppercase tracking-tight truncate pr-4">{p.name}</span>
                                                    {currentProject?.id === p.id && <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />}
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
                                                className="w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 text-[#FFB800] border border-[#FFB800]/20 bg-[#FFB800]/5 mt-1 active:scale-95 transition-all"
                                            >
                                                <div className="p-1.5 bg-[#FFB800] text-slate-900 rounded-lg">
                                                    <Plus className="h-4 w-4" strokeWidth={3} />
                                                </div>
                                                <span className="text-[11px] font-black uppercase tracking-widest">Nouveau Projet</span>
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
                                            className="flex items-center gap-5 px-6 py-4.5 text-slate-400 hover:text-white hover:bg-white/5 transition-all rounded-2xl group"
                                        >
                                            <div className="p-2.5 bg-white/5 rounded-xl group-hover:bg-[#FFB800]/10 group-hover:text-[#FFB800] transition-all">
                                                <item.icon className="w-5 h-5" strokeWidth={2.5} />
                                            </div>
                                            <span className="text-[11px] font-black uppercase tracking-[0.15em]">{item.name}</span>
                                        </Link>
                                    ))}

                                    {isAdmin && (
                                        <Link
                                            href="/admin/users"
                                            onClick={() => setIsMoreOpen(false)}
                                            className="flex items-center justify-between px-6 py-4.5 text-slate-400 hover:text-white hover:bg-white/10 transition-all rounded-2xl group border-t border-white/5 mt-1"
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className="p-2.5 bg-[#FFB800]/10 rounded-xl text-[#FFB800]">
                                                    <Shield className="w-5 h-5" strokeWidth={2.5} />
                                                </div>
                                                <span className="text-[11px] font-black uppercase tracking-[0.15em]">Administration</span>
                                            </div>
                                            {pendingCount > 0 && (
                                                <span className="bg-[#FFB800] text-slate-900 text-[10px] font-black w-7 h-7 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/20 animate-bounce">
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

                <nav className="flex items-center justify-around bg-slate-900/95 backdrop-blur-2xl border border-white/10 p-2.5 rounded-[28px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)]">
                    {[
                        { name: 'Dépenses', path: '/expenses', icon: ReceiptText },
                        { name: 'Fours.', path: '/suppliers', icon: User },
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
                                    flex flex-col items-center justify-center flex-1 h-16 rounded-[20px] transition-all duration-300 gap-1.5
                                    ${isActive ? 'text-[#FFB800]' : 'text-slate-500'}
                                    ${item.name === 'Fours.' ? 'scale-110' : ''}
                                `}
                            >
                                <div className={`p-2.5 rounded-xl transition-all duration-500 ${isActive ? 'bg-[#FFB800]/10 scale-110 shadow-inner' : 'hover:bg-white/5'}`}>
                                    <Icon className={`${item.name === 'Fours.' ? 'h-6 w-6' : 'h-5 w-5'}`} strokeWidth={isActive ? 3 : 2} />
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest leading-none ${isActive ? 'opacity-100' : 'opacity-40'} ${item.name === 'Fours.' ? 'text-[9px]' : ''}`}>
                                    {item.name}
                                </span>
                            </Link>
                        );
                    })}

                    {/* More Menu Toggle */}
                    <button
                        onClick={() => setIsMoreOpen(!isMoreOpen)}
                        className={`
                            flex flex-col items-center justify-center flex-1 h-16 rounded-[20px] transition-all duration-300 gap-1.5
                            ${isMoreOpen || (pathname === '/articles' || pathname === '/orders' || pathname === '/admin/users') ? 'text-[#FFB800]' : 'text-slate-500 hover:text-slate-300'}
                        `}
                    >
                        <div className={`p-2.5 rounded-xl transition-all duration-500 ${isMoreOpen || (pathname === '/articles' || pathname === '/orders' || pathname === '/admin/users') ? 'bg-[#FFB800]/10 scale-110' : 'hover:bg-white/5'}`}>
                            <Package className="h-5 w-5" strokeWidth={isMoreOpen ? 3 : 2} />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest leading-none opacity-40">Plus</span>
                    </button>

                    <div className="w-px h-10 bg-white/5 mx-1" />

                    <button
                        onClick={() => signOut()}
                        className="flex items-center justify-center w-14 h-16 rounded-[20px] text-slate-500 hover:text-red-400 transition-all active:scale-90"
                    >
                        <LogOut className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                </nav>
            </div>
            {/* Spacer for Fixed Navbar */}
            <div className="hidden md:block h-32 w-full" />

            {showProjectSettings && (
                <ProjectSettingsModal onClose={() => setShowProjectSettings(false)} />
            )}
        </>
    );
}
