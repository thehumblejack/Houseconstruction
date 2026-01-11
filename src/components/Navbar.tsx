'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LayoutGrid, Package, LogOut, ReceiptText, HardHat, ShoppingCart } from 'lucide-react';
import GlobalSearch from './GlobalSearch';

export default function Navbar() {
    const pathname = usePathname();
    const { signOut } = useAuth();

    // Don't show navbar on login page
    if (pathname === '/login') return null;

    const navItems = [
        { name: 'CHANTIER', path: '/', icon: LayoutGrid },
        { name: 'COMMANDES', path: '/orders', icon: ShoppingCart },
        { name: 'DÉPENSES', path: '/expenses', icon: ReceiptText },
        { name: 'ARTICLES', path: '/articles', icon: Package },
    ];

    return (
        <>
            {/* Desktop Navbar - Modern Floating Island */}
            {/* We use 'sticky' so it occupies space in the flow (preventing overlap) but sticks to top when scrolling */}
            <div className="hidden md:flex sticky top-6 z-50 justify-center w-full font-jakarta pointer-events-none mb-8">
                <nav className="flex items-center gap-1.5 p-1.5 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] pointer-events-auto transform transition-all hover:scale-[1.01] hover:shadow-[0_20px_40px_rgb(0,0,0,0.2)]">

                    {/* Logo Section */}
                    <div className="flex items-center gap-2 pl-4 pr-6 border-r border-white/10 mr-1">
                        <div className="bg-blue-500 p-1.5 rounded-lg">
                            <HardHat className="h-4 w-4 text-white" fill="currentColor" />
                        </div>
                        <span className="font-black tracking-tighter text-lg text-white italic">HOUSING</span>
                    </div>

                    {/* Navigation Pills */}
                    <div className="flex items-center bg-slate-800/50 rounded-full p-1 border border-white/5">
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
                                        <span className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-purple-600/20 rounded-full opacity-50" />
                                    )}
                                    <Icon className={`h-4 w-4 relative z-10 ${isActive ? 'text-blue-400' : ''}`} />
                                    <span className="relative z-10 tracking-wide">{item.name}</span>
                                </Link>
                            );
                        })}
                    </div>

                    <div className="ml-2">
                        <GlobalSearch />
                    </div>

                    {/* Actions */}
                    <div className="w-px h-6 bg-white/10 mx-2" />

                    <button
                        onClick={() => signOut()}
                        className="group flex items-center gap-2 px-4 py-2 rounded-full text-slate-400 hover:text-white hover:bg-red-500/10 transition-all"
                    >
                        <LogOut className="h-4 w-4 group-hover:text-red-400 transition-colors" />
                        <span className="text-[10px] font-black uppercase group-hover:text-red-400 transition-colors">Sortir</span>
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
                                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-900/50 translate-y-[-4px]'
                                        : 'text-slate-500 hover:bg-white/5'
                                    }
                                `}
                            >
                                <Icon className={`h-5 w-5 ${isActive ? 'animate-pulse-once' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                                <span className={`text-[9px] font-black uppercase tracking-tight ${isActive ? 'opacity-100' : 'opacity-60'}`}>{item.name}</span>
                            </Link>
                        );
                    })}

                    <div className="w-px h-8 bg-white/10 mx-2" />

                    <button
                        onClick={() => signOut()}
                        className="flex flex-col items-center justify-center w-16 h-16 rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-500 transition-all"
                    >
                        <LogOut className="h-5 w-5 my-auto" />
                    </button>
                </nav>
            </div>
        </>
    );
}
