'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LayoutGrid, Package, LogOut, ReceiptText, Building2, ShoppingCart, User, Shield } from 'lucide-react';
import GlobalSearch from './GlobalSearch';
import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';

export default function Navbar() {
    const pathname = usePathname();
    const { signOut, isAdmin, user, isApproved } = useAuth();
    const [pendingCount, setPendingCount] = useState(0);
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

            {/* Mobile Navbar - Modern Floating Dock */}
            <div className="md:hidden fixed bottom-6 left-4 right-4 z-[60] font-jakarta">
                <nav className="flex items-center justify-between bg-slate-900/95 backdrop-blur-2xl border border-white/10 p-2 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`
                                    flex flex-col items-center justify-center flex-1 h-16 rounded-xl transition-all duration-300 gap-1
                                    ${isActive
                                        ? 'bg-[#FFB800] text-slate-900 shadow-lg shadow-amber-900/20 translate-y-[-4px]'
                                        : 'text-slate-500 hover:bg-white/5'
                                    }
                                `}
                            >
                                <Icon className={`h-5 w-5 ${isActive ? 'animate-pulse-once' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                                <span className={`text-[9px] font-bold uppercase tracking-tight ${isActive ? 'opacity-100' : 'opacity-60'}`}>{item.name}</span>
                            </Link>
                        );
                    })}

                    {isAdmin && (
                        <>
                            <div className="w-px h-8 bg-white/10 mx-1" />
                            <Link
                                href="/admin/users"
                                className={`
                                    relative flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all duration-300 gap-1
                                    ${pathname === '/admin/users'
                                        ? 'bg-[#FFB800] text-slate-900 shadow-lg shadow-amber-900/20 translate-y-[-4px]'
                                        : 'text-slate-500 hover:bg-white/5'
                                    }
                                `}
                            >
                                <Shield className="h-5 w-5" strokeWidth={pathname === '/admin/users' ? 2.5 : 2} />
                                <span className={`text-[9px] font-bold uppercase tracking-tight ${pathname === '/admin/users' ? 'opacity-100' : 'opacity-60'}`}>ADMIN</span>
                                {pendingCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-white text-red-600 text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                                        {pendingCount}
                                    </span>
                                )}
                            </Link>
                        </>
                    )}

                    <div className="w-px h-8 bg-white/10 mx-2" />

                    <button
                        onClick={() => signOut()}
                        className="flex flex-col items-center justify-center w-16 h-16 rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-500 transition-all"
                    >
                        <LogOut className="h-5 w-5 my-auto" strokeWidth={2.5} />
                    </button>
                </nav>
            </div>
        </>
    );
}
