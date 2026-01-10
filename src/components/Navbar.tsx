'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Home, Calculator, Truck, LayoutGrid, LogOut } from 'lucide-react';

export default function Navbar() {
    const pathname = usePathname();
    const { signOut, user } = useAuth();

    const isActive = (path: string) => pathname === path
        ? "bg-white text-slate-900 shadow-sm"
        : "text-slate-300 hover:text-white hover:bg-white/10";

    // Don't show navbar on login page
    if (pathname === '/login') return null;

    return (
        <>
            {/* Desktop Navbar */}
            <nav className="hidden md:block bg-slate-900 text-white p-3 sticky top-0 z-50 shadow-xl font-jakarta border-b border-white/5">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black text-lg tracking-tighter italic">
                        <Truck className="h-5 w-5 text-blue-400" />
                        <span>MA<span className="text-blue-400">MAISON</span></span>
                    </div>

                    <div className="flex gap-1 items-center">
                        <Link
                            href="/"
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black transition-all uppercase tracking-widest ${isActive('/')}`}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            <span>Chantier</span>
                        </Link>

                        <Link
                            href="/expenses"
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black transition-all uppercase tracking-widest ${isActive('/expenses')}`}
                        >
                            <Calculator className="h-3.5 w-3.5" />
                            <span>Finances</span>
                        </Link>

                        <button
                            onClick={() => signOut()}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black text-red-400 hover:bg-white/10 transition-all uppercase tracking-widest ml-4"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            <span>Sortir</span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Bottom Navbar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-white/10 px-6 py-3 z-[60] backdrop-blur-md bg-opacity-90 font-jakarta">
                <div className="flex items-center justify-between">
                    <Link
                        href="/"
                        className={`flex flex-col items-center gap-1 p-2 transition-all ${pathname === '/' ? 'text-blue-400 scale-110' : 'text-slate-500'}`}
                    >
                        <LayoutGrid className="h-5 w-5" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">Chantier</span>
                    </Link>

                    <Link
                        href="/expenses"
                        className={`flex flex-col items-center gap-1 p-2 transition-all ${pathname === '/expenses' ? 'text-blue-400 scale-110' : 'text-slate-500'}`}
                    >
                        <Calculator className="h-5 w-5" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">Finances</span>
                    </Link>

                    <button
                        onClick={() => signOut()}
                        className="flex flex-col items-center gap-1 p-2 transition-all text-red-500"
                    >
                        <LogOut className="h-5 w-5" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">Sortir</span>
                    </button>
                </div>
            </nav>
        </>
    );
}
