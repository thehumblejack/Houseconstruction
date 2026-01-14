'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LayoutGrid, Package, LogOut, ReceiptText, Building2, ShoppingCart, User, Shield } from 'lucide-react';
import GlobalSearch from './GlobalSearch';
import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
    const pathname = usePathname();
    const { signOut, isAdmin, user, isApproved } = useAuth();
    const [pendingCount, setPendingCount] = useState(0);
    const [isMoreOpen, setIsMoreOpen] = useState(false);
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


    // Don't show navbar on auth related pages or root landing page
    if (pathname === '/login' || pathname?.startsWith('/auth/')) return null;
    if (pathname === '/' && (!user || !isApproved)) return null;

    const navItems = [
        { name: 'CHANTIER', path: '/', icon: LayoutGrid },
        { name: 'DÉPENSES', path: '/expenses', icon: ReceiptText },
        { name: 'FOURNISSEURS', path: '/suppliers', icon: User },
        { name: 'ARTICLES', path: '/articles', icon: Package },
        { name: 'COMMANDES', path: '/orders', icon: ShoppingCart },
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
                        { name: 'Chantier', path: '/', icon: LayoutGrid },
                        { name: 'Dépenses', path: '/expenses', icon: ReceiptText },
                        { name: 'Fourn.', path: '/suppliers', icon: User },
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
                                `}
                            >
                                <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-[#FFB800]/10' : ''}`}>
                                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                                </div>
                                <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-40'}`}>
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
