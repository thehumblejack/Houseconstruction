'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import { LayoutGrid, Package, LogOut, ReceiptText, Building2, ShoppingCart, User, Shield, ChevronDown, Plus, Trash2 } from 'lucide-react';
import GlobalSearch from './GlobalSearch';
import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
    const pathname = usePathname();
    const { signOut, isAdmin, user, isApproved } = useAuth();
    const { projects, currentProject, setCurrentProject, createProject, deleteProject } = useProject();
    const [pendingCount, setPendingCount] = useState(0);
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
    const supabase = useMemo(() => createClient(), []);

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
    if (pathname === '/' || pathname?.startsWith('/projets/')) return null;

    const navItems = [
        { name: 'DÉPENSES', path: '/expenses', icon: ReceiptText },
        { name: 'FOURNISSEURS', path: '/suppliers', icon: User },
        { name: 'ARTICLES', path: '/articles', icon: Package },
        { name: 'COMMANDES', path: '/orders', icon: ShoppingCart },
        { name: 'CHANTIER', path: '/', icon: LayoutGrid },
    ];

    return (
        <>
            {/* Desktop Navbar - Modern Floating Island */}
            {/* We use 'sticky' so it occupies space in the flow (preventing overlap) but sticks to top when scrolling */}
            <div className="hidden md:flex sticky top-6 z-50 justify-center w-full font-jakarta pointer-events-none mb-8">
                <nav className="flex items-center gap-1.5 p-1.5 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] pointer-events-auto transform transition-all hover:scale-[1.01] hover:shadow-[0_20px_40px_rgb(0,0,0,0.2)]">

                    {/* Logo Section */}
                    <div className="flex items-center gap-2 pl-4 pr-6 border-r border-white/10 mr-1 group cursor-pointer">
                        <div className="bg-[#FFB800] p-1.5 rounded-lg transition-transform group-hover:rotate-12">
                            <Building2 className="h-4 w-4 text-slate-900" />
                        </div>
                        <span className="font-bold tracking-[-0.05em] text-lg text-white uppercase flex items-center">
                            House<span className="text-[#FFB800]">Expert</span>
                        </span>
                    </div>

                    {/* Project Selector */}
                    <div className="relative border-r border-white/10 pr-2 mr-2">
                        <button
                            onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-white/5 rounded-full transition-all group"
                        >
                            <div className="flex flex-col items-start">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Projet Actuel</span>
                                <span className="text-xs font-black text-white uppercase tracking-tight truncate max-w-[1200px]">
                                    {currentProject?.name || 'Sélectionner...'}
                                </span>
                            </div>
                            <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isProjectMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isProjectMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-[-1]" onClick={() => setIsProjectMenuOpen(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute top-full left-0 mt-3 w-64 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[60]"
                                    >
                                        <div className="p-2 space-y-1">
                                            <p className="px-3 py-2 text-[8px] font-black text-slate-500 uppercase tracking-widest">Mes Chantiers</p>
                                            {projects.map((p) => (
                                                <div key={p.id} className="relative group/item">
                                                    <button
                                                        onClick={() => {
                                                            setCurrentProject(p);
                                                            setIsProjectMenuOpen(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between group transition-all ${currentProject?.id === p.id ? 'bg-[#FFB800] text-black' : 'text-slate-300 hover:bg-white/5'}`}
                                                    >
                                                        <span className="text-xs font-bold uppercase truncate pr-8">{p.name}</span>
                                                        {currentProject?.id === p.id && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                                                    </button>
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (confirm(`Êtes-vous sûr de vouloir supprimer le projet "${p.name}" ? Tous les frais, fournisseurs et documents associés seront définitivement supprimés.`)) {
                                                                await deleteProject(p.id);
                                                            }
                                                        }}
                                                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg opacity-0 group-hover/item:opacity-100 transition-all hover:bg-red-500/10 text-red-400 hover:text-red-500 ${currentProject?.id === p.id ? 'text-black/40 hover:text-black hover:bg-black/5' : ''}`}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={async () => {
                                                    const name = prompt('Nom du nouveau projet:');
                                                    if (name) {
                                                        await createProject(name, '');
                                                        setIsProjectMenuOpen(false);
                                                    }
                                                }}
                                                className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-[#FFB800] hover:bg-[#FFB800]/5 border-t border-white/5 mt-1 transition-all"
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

                    {/* Navigation Pills */}
                    <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/5">
                        {navItems.map((item) => {
                            const isActive = pathname === item.path;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className={`
                                        relative flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 ease-out
                                        ${isActive
                                            ? 'text-white bg-slate-800 shadow-lg ring-1 ring-white/10'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }
                                    `}
                                >
                                    {isActive && (
                                        <span className="absolute inset-0 bg-[#FFB800]/10 rounded-full opacity-50" />
                                    )}
                                    <Icon className={`h-4 w-4 relative z-10 ${isActive ? 'text-[#FFB800]' : ''}`} />
                                    <span className="relative z-10 tracking-wide">{item.name}</span>
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

                    <button
                        onClick={() => signOut()}
                        className="group flex items-center gap-2 px-4 py-2 rounded-full text-slate-400 hover:text-white hover:bg-red-500/10 transition-all font-jakarta"
                    >
                        <LogOut className="h-4 w-4 group-hover:text-red-400 transition-colors" />
                        <span className="text-[10px] font-bold uppercase tracking-wider group-hover:text-red-400 transition-colors">Sortir</span>
                    </button>
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
                        { name: 'Chantier', path: '/', icon: LayoutGrid },
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
        </>
    );
}
