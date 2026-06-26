'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X, Loader2, Receipt, ShoppingCart, User, Wallet, Command, Package, CornerDownLeft, ArrowUp, ArrowDown, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

type ResultType = 'expense' | 'order' | 'supplier' | 'deposit';

type SearchResult = {
    id: string;
    type: ResultType;
    title: string;
    subtitle: string;
    date?: string;
    amount?: number;
    url: string;
    status?: string;
};

const TYPE_META: Record<ResultType, { label: string; icon: any; chip: string }> = {
    supplier: { label: 'Fournisseurs', icon: User, chip: 'bg-slate-100 text-slate-600' },
    expense: { label: 'Factures & bons', icon: Receipt, chip: 'bg-amber-50 text-amber-600' },
    order: { label: 'Commandes', icon: ShoppingCart, chip: 'bg-blue-50 text-blue-600' },
    deposit: { label: 'Acomptes', icon: Wallet, chip: 'bg-emerald-50 text-emerald-600' },
};
const TYPE_ORDER: ResultType[] = ['supplier', 'expense', 'order', 'deposit'];

const QUICK_ACTIONS = [
    { id: 'qa-exp', icon: Receipt, label: 'Dépenses', subtitle: 'Factures, bons & acomptes', url: '/expenses' },
    { id: 'qa-sup', icon: User, label: 'Fournisseurs', subtitle: 'Annuaire & soldes', url: '/suppliers' },
    { id: 'qa-art', icon: Package, label: 'Articles', subtitle: 'Comparateur de prix', url: '/articles' },
    { id: 'qa-ord', icon: ShoppingCart, label: 'Commandes', subtitle: 'Livraisons & réceptions', url: '/orders' },
];

function highlight(text: string, q: string) {
    if (!q) return text;
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i === -1) return text;
    return (
        <>
            {text.slice(0, i)}
            <mark className="bg-amber-100 text-slate-900 rounded px-0.5">{text.slice(i, i + q.length)}</mark>
            {text.slice(i + q.length)}
        </>
    );
}

export default function GlobalSearch() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [recent, setRecent] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const supabase = useMemo(() => createClient(), []);

    const close = useCallback(() => setIsOpen(false), []);

    // Recent searches (localStorage)
    useEffect(() => {
        try {
            const r = JSON.parse(localStorage.getItem('he_recent_searches') || '[]');
            if (Array.isArray(r)) setRecent(r.slice(0, 5));
        } catch { /* ignore */ }
    }, []);
    const pushRecent = useCallback((term: string) => {
        const t = term.trim();
        if (t.length < 2) return;
        setRecent(prev => {
            const next = [t, ...prev.filter(x => x.toLowerCase() !== t.toLowerCase())].slice(0, 5);
            try { localStorage.setItem('he_recent_searches', JSON.stringify(next)); } catch { /* ignore */ }
            return next;
        });
    }, []);

    // Sorted/grouped results — flat order matches render order (for keyboard nav)
    const sortedResults = useMemo(
        () => [...results].sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)),
        [results]
    );
    const isSearching = query.trim().length >= 2;
    const navigable: { url: string }[] = isSearching ? sortedResults : QUICK_ACTIONS;

    const go = useCallback((url: string) => {
        if (isSearching) pushRecent(query);
        close();
        router.push(url);
    }, [isSearching, query, pushRecent, close, router]);

    // Open / global shortcuts + body scroll lock
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setIsOpen(v => !v); }
        };
        window.addEventListener('keydown', onKey);
        setMounted(true);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        setTimeout(() => inputRef.current?.focus(), 60);
        return () => { document.body.style.overflow = prev; };
    }, [isOpen]);

    // Reset selection when the list changes
    useEffect(() => { setActiveIndex(0); }, [query, results.length, isOpen]);

    // Keep the active row in view
    useEffect(() => {
        const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
        el?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    // In-modal keyboard nav
    const onModalKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') { e.preventDefault(); close(); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, navigable.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
        else if (e.key === 'Enter') {
            e.preventDefault();
            const item = navigable[activeIndex];
            if (item) go(item.url);
        }
    };

    // Debounced fetch
    useEffect(() => {
        const h = setTimeout(async () => {
            if (!isSearching) { setResults([]); setLoading(false); return; }
            setLoading(true);
            try {
                const out: SearchResult[] = [];
                const term = `%${query}%`;

                const { data: suppliers } = await supabase.from('suppliers').select('id, name, description').ilike('name', term).limit(4);
                suppliers?.forEach((s: any) => out.push({ id: s.id, type: 'supplier', title: s.name, subtitle: s.description || 'Fournisseur', url: `/expenses?tab=${s.id}` }));

                const { data: expenses } = await supabase.from('expenses').select('id, item, price, date, supplier_id, status').or(`item.ilike.${term},date.ilike.${term}`).limit(6);
                expenses?.forEach((e: any) => out.push({ id: e.id, type: 'expense', title: e.item || 'Facture', subtitle: `${e.price?.toLocaleString(undefined, { minimumFractionDigits: 3 })} DT`, date: e.date, status: e.status, url: `/expenses?tab=${e.supplier_id}&highlight=${e.id}` }));

                const { data: orders } = await supabase.from('orders').select('id, supplier_name, date, status, items').or(`supplier_name.ilike.${term}`).limit(5);
                orders?.forEach((o: any) => out.push({ id: o.id, type: 'order', title: o.supplier_name || 'Commande', subtitle: `${(o.items || []).length} article${(o.items || []).length > 1 ? 's' : ''}`, date: o.date, status: o.status, url: '/orders' }));

                const { data: deposits } = await supabase.from('deposits').select('id, amount, date, ref, payer').or(`ref.ilike.${term},payer.ilike.${term}`).limit(5);
                deposits?.forEach((d: any) => out.push({ id: d.id, type: 'deposit', title: `Acompte ${d.amount?.toLocaleString(undefined, { minimumFractionDigits: 3 })} DT`, subtitle: `${d.payer || 'Inconnu'} · Réf ${d.ref || '—'}`, date: d.date, url: '/expenses' }));

                setResults(out);
            } catch (err) {
                console.error('Search error', err);
            } finally {
                setLoading(false);
            }
        }, 250);
        return () => clearTimeout(h);
    }, [query, isSearching, supabase]);

    if (!mounted) return null;

    // Render the flat list with group headers, keeping flat index for nav
    let flatIdx = -1;
    let lastType: ResultType | null = null;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="group flex items-center gap-2 h-9 px-3 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
                <Search className="h-4 w-4" strokeWidth={2} />
                <span className="hidden lg:block text-sm font-medium text-slate-400 group-hover:text-slate-600 transition-colors">Rechercher</span>
                <span className="hidden lg:flex items-center gap-0.5 ml-1 rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                    <Command className="h-2.5 w-2.5" strokeWidth={2.5} /> K
                </span>
            </button>

            {isOpen && createPortal(
                <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4 font-jakarta" onKeyDown={onModalKeyDown}>
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150" onClick={close} />

                    <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[72vh] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150">
                        {/* Search input */}
                        <div className="flex items-center gap-3 px-4 h-14 border-b border-slate-100 shrink-0">
                            {loading
                                ? <Loader2 className="h-5 w-5 text-slate-400 animate-spin shrink-0" />
                                : <Search className="h-5 w-5 text-slate-400 shrink-0" strokeWidth={2} />}
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Rechercher factures, fournisseurs, commandes…"
                                className="flex-1 h-full bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 outline-none min-w-0"
                            />
                            <button onClick={close} className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div ref={listRef} className="flex-1 overflow-y-auto no-scrollbar py-2">
                            {/* Default state: quick actions + recent */}
                            {!isSearching && (
                                <>
                                    <p className="px-4 pt-1 pb-1.5 text-[11px] font-medium text-slate-400 uppercase tracking-wide">Accès rapide</p>
                                    {QUICK_ACTIONS.map((a, i) => {
                                        flatIdx++;
                                        const idx = flatIdx;
                                        const Icon = a.icon;
                                        const active = idx === activeIndex;
                                        return (
                                            <button
                                                key={a.id}
                                                data-idx={idx}
                                                onMouseEnter={() => setActiveIndex(idx)}
                                                onClick={() => go(a.url)}
                                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${active ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                                            >
                                                <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 text-slate-600 shrink-0">
                                                    <Icon className="h-4 w-4" />
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block text-sm font-medium text-slate-900 truncate">{a.label}</span>
                                                    <span className="block text-xs text-slate-400 truncate">{a.subtitle}</span>
                                                </span>
                                            </button>
                                        );
                                    })}

                                    {recent.length > 0 && (
                                        <>
                                            <p className="px-4 pt-3 pb-1.5 text-[11px] font-medium text-slate-400 uppercase tracking-wide">Récent</p>
                                            <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                                                {recent.map((r) => (
                                                    <button
                                                        key={r}
                                                        onClick={() => setQuery(r)}
                                                        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                                                    >
                                                        <Clock className="h-3 w-3 text-slate-400" /> {r}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </>
                            )}

                            {/* Empty results */}
                            {isSearching && !loading && sortedResults.length === 0 && (
                                <div className="py-14 text-center">
                                    <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                                        <Search className="h-5 w-5 text-slate-300" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-900">Aucun résultat</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Essayez avec d&apos;autres mots-clés.</p>
                                </div>
                            )}

                            {/* Grouped results */}
                            {isSearching && sortedResults.map((r) => {
                                flatIdx++;
                                const idx = flatIdx;
                                const active = idx === activeIndex;
                                const meta = TYPE_META[r.type];
                                const Icon = meta.icon;
                                const header = r.type !== lastType ? (lastType = r.type, meta.label) : null;
                                return (
                                    <div key={r.id}>
                                        {header && (
                                            <p className="px-4 pt-2.5 pb-1 text-[11px] font-medium text-slate-400 uppercase tracking-wide">{header}</p>
                                        )}
                                        <button
                                            data-idx={idx}
                                            onMouseEnter={() => setActiveIndex(idx)}
                                            onClick={() => go(r.url)}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${active ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                                        >
                                            <span className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${meta.chip}`}>
                                                <Icon className="h-4 w-4" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm font-medium text-slate-900 truncate">{highlight(r.title, query)}</span>
                                                <span className="block text-xs text-slate-400 truncate">{r.subtitle}</span>
                                            </span>
                                            {r.status && (
                                                <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${r.status === 'paid' || r.status === 'delivered' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                    {r.status === 'paid' ? 'Payé' : r.status === 'pending' ? 'En attente' : r.status}
                                                </span>
                                            )}
                                            {r.date && <span className="hidden sm:block text-[11px] text-slate-400 tabular-nums shrink-0">{r.date}</span>}
                                            {active && <CornerDownLeft className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer hints */}
                        <div className="flex items-center justify-between gap-4 px-4 h-10 border-t border-slate-100 text-[11px] text-slate-400 shrink-0">
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1"><kbd className="inline-flex items-center justify-center w-5 h-5 rounded border border-slate-200 bg-slate-50"><ArrowUp className="h-3 w-3" /></kbd><kbd className="inline-flex items-center justify-center w-5 h-5 rounded border border-slate-200 bg-slate-50"><ArrowDown className="h-3 w-3" /></kbd> Naviguer</span>
                                <span className="flex items-center gap-1"><kbd className="inline-flex items-center justify-center w-5 h-5 rounded border border-slate-200 bg-slate-50"><CornerDownLeft className="h-3 w-3" /></kbd> Ouvrir</span>
                            </div>
                            <span className="flex items-center gap-1"><kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded border border-slate-200 bg-slate-50 font-mono text-[10px]">esc</kbd> Fermer</span>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
