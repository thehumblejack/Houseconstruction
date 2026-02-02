'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Receipt, ShoppingCart, User, ArrowRight, Wallet, Command, History, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

type SearchResult = {
    id: string;
    type: 'expense' | 'order' | 'supplier' | 'deposit';
    title: string;
    subtitle: string;
    date?: string;
    amount?: number;
    url: string;
    status?: string;
};

export default function GlobalSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    const toggleSearch = () => setIsOpen(!isOpen);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        setMounted(true);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        const h = setTimeout(async () => {
            if (!query || query.length < 2) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                const searchResults: SearchResult[] = [];
                const searchTerm = `%${query}%`;

                const { data: suppliers } = await supabase
                    .from('suppliers')
                    .select('id, name, description')
                    .ilike('name', searchTerm)
                    .limit(3);

                if (suppliers) {
                    suppliers.forEach((s: any) => searchResults.push({
                        id: s.id,
                        type: 'supplier',
                        title: s.name,
                        subtitle: s.description || 'Fournisseur',
                        url: `/expenses?tab=${s.id}`,
                    }));
                }

                const { data: expenses } = await supabase
                    .from('expenses')
                    .select('id, item, price, date, supplier_id, status')
                    .or(`item.ilike.${searchTerm},date.ilike.${searchTerm}`)
                    .limit(5);

                if (expenses) {
                    expenses.forEach((e: any) => searchResults.push({
                        id: e.id,
                        type: 'expense',
                        title: `Facture: ${e.item}`,
                        subtitle: `${e.price?.toLocaleString()} DT`,
                        date: e.date,
                        status: e.status,
                        url: `/expenses?tab=${e.supplier_id}&highlight=${e.id}`
                    }));
                }

                const { data: orders } = await supabase
                    .from('orders')
                    .select('id, supplier_name, date, status, items')
                    .or(`supplier_name.ilike.${searchTerm}`)
                    .limit(5);

                if (orders) {
                    orders.forEach((o: any) => searchResults.push({
                        id: o.id,
                        type: 'order',
                        title: `Commande: ${o.supplier_name}`,
                        subtitle: `${(o.items || []).length} articles`,
                        date: o.date,
                        status: o.status,
                        url: '/orders'
                    }));
                }

                const { data: deposits } = await supabase
                    .from('deposits')
                    .select('id, amount, date, ref, payer')
                    .or(`ref.ilike.${searchTerm},payer.ilike.${searchTerm}`)
                    .limit(5);

                if (deposits) {
                    deposits.forEach((d: any) => searchResults.push({
                        id: d.id,
                        type: 'deposit',
                        title: `Acompte: ${d.amount} DT`,
                        subtitle: `${d.payer || 'Inconnu'} - Ref: ${d.ref || '-'}`,
                        date: d.date,
                        url: '/expenses'
                    }));
                }

                setResults(searchResults);
            } catch (error) {
                console.error("Search error", error);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(h);
    }, [query, supabase]);

    if (!mounted) return null;

    return (
        <>
            <button
                onClick={toggleSearch}
                className="group flex items-center gap-3 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full transition-all duration-300"
            >
                <Search className="h-4 w-4 text-slate-400 group-hover:text-[#FFB800] transition-colors" />
                <span className="hidden lg:block text-[10px] font-black tracking-widest text-slate-400 group-hover:text-slate-200 transition-colors uppercase">RECHERCHER...</span>
                <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-white/10 ml-1">
                    <Command className="h-3 w-3 text-slate-500" strokeWidth={3} />
                    <span className="text-[10px] font-black text-slate-500">K</span>
                </div>
            </button>

            {createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4 md:px-6 font-jakarta">
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={toggleSearch}
                                className="absolute inset-0 bg-slate-950/60 backdrop-blur-2xl"
                            />

                            {/* Modal Container */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative bg-[#F8FAFC] w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border border-white/20"
                            >
                                {/* Header / Search Input */}
                                <div className="p-6 pb-0 relative">
                                    <div className="flex items-center gap-6 p-2 relative bg-white rounded-2xl shadow-sm border border-slate-100 group focus-within:ring-2 focus-within:ring-[#FFB800]/20 transition-all duration-300">
                                        <div className={`p-2.5 rounded-xl transition-colors ${loading ? 'bg-blue-50 text-blue-500' : 'bg-slate-50 text-slate-400 group-focus-within:bg-[#FFB800]/10 group-focus-within:text-[#FFB800]'}`}>
                                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                                        </div>
                                        <input
                                            ref={inputRef}
                                            className="flex-1 text-lg font-bold outline-none placeholder:text-slate-300 text-slate-900 bg-transparent min-w-0"
                                            placeholder="Cherchez n'importe quoi..."
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                        />
                                        <button
                                            onClick={toggleSearch}
                                            className="p-2 hover:bg-slate-100 rounded-xl transition-all group/close"
                                        >
                                            <X className="h-5 w-5 text-slate-300 group-hover/close:text-slate-600 group-hover/close:rotate-90 transition-all duration-300" />
                                        </button>
                                    </div>

                                    {/* Shortcuts / Quick Filters */}
                                    <div className="flex items-center gap-2 mt-6 pb-2 overflow-x-auto no-scrollbar">
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-100 rounded-lg whitespace-nowrap">
                                            <History className="h-3 w-3 text-slate-400" />
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">RÉCENT</span>
                                        </div>
                                        {['Factures', 'Commandes', 'Fournisseurs', 'Acomptes'].map((cat) => (
                                            <button key={cat} className="px-3 py-1.5 hover:bg-[#FFB800]/10 text-slate-400 hover:text-[#FFB800] border border-transparent rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap">
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Results Area */}
                                <div className="max-h-[50vh] overflow-y-auto mt-4 px-6 pb-6 custom-scrollbar">
                                    {results.length === 0 && query.length > 1 && !loading && (
                                        <div className="py-20 text-center bg-white/50 rounded-3xl border border-dashed border-slate-200">
                                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <X className="h-8 w-8 text-slate-200" />
                                            </div>
                                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Aucun résultat</p>
                                            <p className="text-xs text-slate-400 mt-1 font-medium">Recherchez avec d'autres mots-clés.</p>
                                        </div>
                                    )}

                                    {results.length === 0 && query.length < 2 && (
                                        <div className="py-12 px-4 space-y-6">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Suggestions</span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {['Dernières dépenses', 'Fournisseurs actifs', 'Commandes en cours'].map(s => (
                                                    <div key={s} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-[#FFB800]/30 hover:shadow-lg hover:shadow-[#FFB800]/5 cursor-pointer transition-all duration-300 group">
                                                        <span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-900">{s}</span>
                                                        <ArrowRight className="h-3.5 w-3.5 text-slate-200 group-hover:text-[#FFB800] transition-colors" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <AnimatePresence mode='popLayout'>
                                            {results.map((result, i) => (
                                                <motion.div
                                                    key={result.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.05 }}
                                                >
                                                    <Link
                                                        href={result.url}
                                                        onClick={() => setIsOpen(false)}
                                                        className="flex items-center gap-5 p-4 bg-white rounded-2xl border border-slate-100 hover:border-[#FFB800]/50 hover:shadow-xl hover:shadow-[#FFB800]/5 group transition-all duration-300 relative overflow-hidden"
                                                    >
                                                        <div className={`
                                                            p-3 rounded-xl transition-colors duration-300
                                                            ${result.type === 'expense' ? 'bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white' : ''}
                                                            ${result.type === 'order' ? 'bg-blue-50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white' : ''}
                                                            ${result.type === 'supplier' ? 'bg-slate-50 text-slate-400 group-hover:bg-slate-900 group-hover:text-white' : ''}
                                                            ${result.type === 'deposit' ? 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white' : ''}
                                                        `}>
                                                            {result.type === 'expense' && <Receipt className="h-5 w-5" />}
                                                            {result.type === 'order' && <ShoppingCart className="h-5 w-5" />}
                                                            {result.type === 'supplier' && <User className="h-5 w-5" />}
                                                            {result.type === 'deposit' && <Wallet className="h-5 w-5" />}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between mb-0.5">
                                                                <h4 className="text-sm font-black text-slate-900 truncate group-hover:text-[#FFB800] transition-colors">{result.title}</h4>
                                                                {result.date && <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">{result.date}</span>}
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <p className="text-[11px] text-slate-500 font-medium truncate uppercase tracking-widest opacity-60">{result.subtitle}</p>
                                                                {result.status && (
                                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${result.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                                                        {result.status}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:bg-[#FFB800]/10 transition-all duration-500">
                                                            <ArrowRight className="h-4 w-4 text-[#FFB800]" />
                                                        </div>
                                                    </Link>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* Footer Info */}
                                <div className="p-4 bg-slate-900 border-t border-white/5 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-8">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white border border-white/5 font-mono">ESC</kbd>
                                            <span>Fermer</span>
                                        </div>
                                    </div>
                                    <span className="text-[#FFB800] opacity-80">Recherche Premium HE</span>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
