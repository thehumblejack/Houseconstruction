'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Receipt, ShoppingCart, User, ArrowRight, Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { createPortal } from 'react-dom';
import Link from 'next/link';

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

    // Toggle logic
    const toggleSearch = () => setIsOpen(!isOpen);

    // Close on Escape
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

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Search Logic
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

                // 1. Search Suppliers
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
                        url: `/expenses?tab=${s.id}`, // Open specific tab
                    }));
                }

                // 2. Search Expenses (Invoices)
                // We assume there is a relationship or we search raw expenses
                // Ideally join with supplier name if needed, but for now raw search
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

                // 3. Search Orders
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

                // 4. Search Deposits (Money paid)
                // Use implicit join or raw query if possible, or just amount/ref
                // Checking text fields like 'ref', 'payer'
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
        }, 300); // Debounce

        return () => clearTimeout(h);
    }, [query, supabase]);


    if (!isOpen || !mounted) {
        return (
            <button
                onClick={toggleSearch}
                className="p-2 md:px-4 md:py-2 md:bg-white/10 md:hover:bg-white/20 rounded-full text-slate-400 hover:text-white transition-all flex items-center gap-2 group border border-transparent md:border-white/5"
            >
                <Search className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span className="hidden md:block text-xs font-bold opacity-60">Rechercher... (⌘K)</span>
            </button>
        );
    }

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 font-jakarta">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={toggleSearch} />

            {/* Modal */}
            <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header Input */}
                <div className="flex items-center gap-3 p-4 border-b border-slate-100">
                    <Search className="h-5 w-5 text-slate-400" />
                    <input
                        ref={inputRef}
                        className="flex-1 text-lg font-medium outline-none placeholder:text-slate-300 text-slate-800 bg-transparent"
                        placeholder="Chercher factures, commandes, montants..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    {loading ? (
                        <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                    ) : (
                        <button onClick={toggleSearch} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                            <X className="h-5 w-5 text-slate-400" />
                        </button>
                    )}
                </div>

                {/* Results List */}
                <div className="max-h-[60vh] overflow-y-auto p-2 bg-slate-50/50">
                    {results.length === 0 && query.length > 1 && !loading && (
                        <div className="p-8 text-center text-slate-400">
                            <p className="text-sm font-bold">Aucun résultat trouvé pour "{query}"</p>
                        </div>
                    )}

                    {results.length === 0 && query.length < 2 && (
                        <div className="p-8 text-center text-slate-400">
                            <p className="text-xs font-bold uppercase tracking-widest opacity-50">Commencez à taper pour chercher</p>
                        </div>
                    )}

                    <div className="space-y-1">
                        {results.map((result) => (
                            <Link
                                key={result.id}
                                href={result.url}
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 group transition-all"
                            >
                                <div className={`
                                    p-2 rounded-lg 
                                    ${result.type === 'expense' ? 'bg-amber-100 text-amber-600' : ''}
                                    ${result.type === 'order' ? 'bg-blue-100 text-blue-600' : ''}
                                    ${result.type === 'supplier' ? 'bg-slate-100 text-slate-600' : ''}
                                    ${result.type === 'deposit' ? 'bg-emerald-100 text-emerald-600' : ''}
                                `}>
                                    {result.type === 'expense' && <Receipt className="h-5 w-5" />}
                                    {result.type === 'order' && <ShoppingCart className="h-5 w-5" />}
                                    {result.type === 'supplier' && <User className="h-5 w-5" />}
                                    {result.type === 'deposit' && <Wallet className="h-5 w-5" />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-bold text-slate-800 truncate">{result.title}</h4>
                                        {result.date && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{result.date}</span>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>
                                        {result.status && (
                                            <span className={`text-[8px] font-black uppercase px-1.5 rounded-sm ${result.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {result.status}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100" />
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="p-2 bg-slate-50 border-t border-slate-100 text-[10px] font-bold text-slate-400 uppercase text-center flex justify-between px-4">
                    <span>Recherche Intelligente</span>
                    <span>ESC pour fermer</span>
                </div>
            </div>
        </div>,
        document.body
    );
}
