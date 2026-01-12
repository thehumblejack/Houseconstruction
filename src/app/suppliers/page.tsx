'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { Search, Loader2, User, Phone, MapPin, Package, TrendingUp, TrendingDown, Plus, Pencil, Trash2, ArrowRight, ChevronRight, Hash, FileText, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

interface SupplierStats {
    id: string;
    name: string;
    color: string;
    address: string;
    tel: string;
    totalCost: number;
    totalPaid: number;
    remaining: number;
    articleCount: number;
    lastArticle?: string;
    notes?: string;
}

export default function SuppliersPage() {
    const { isAdmin } = useAuth();
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [deposits, setDeposits] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
    const [notesValue, setNotesValue] = useState('');

    const supabase = useMemo(() => createClient(), []);

    const fetchData = async () => {
        console.log('Suppliers: Fetching data started...');
        try {
            const [sups, exps, deps, its] = await Promise.all([
                supabase.from('suppliers').select('*'),
                supabase.from('expenses').select('*'),
                supabase.from('deposits').select('*'),
                supabase.from('invoice_items').select('*')
            ]);

            if (sups.error) console.error('Suppliers: Error fetching suppliers:', sups.error);
            if (exps.error) console.error('Suppliers: Error fetching expenses:', exps.error);
            if (deps.error) console.error('Suppliers: Error fetching deposits:', deps.error);
            if (its.error) console.error('Suppliers: Error fetching invoice_items:', its.error);

            setSuppliers(sups.data || []);
            setExpenses(exps.data || []);
            setDeposits(deps.data || []);
            setItems(its.data || []);

            console.log('Suppliers: Data received:', {
                suppliers: sups.data?.length ?? 0,
                expenses: exps.data?.length ?? 0
            });
        } catch (error) {
            console.error('Suppliers: Critical error fetching data:', error);
        } finally {
            console.log('Suppliers: Fetching complete.');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [supabase]);

    const stats = useMemo(() => {
        return suppliers.map(s => {
            const supplierExpenses = expenses.filter(e => e.supplier_id === s.id);
            const supplierDeposits = deposits.filter(d => d.supplier_id === s.id);
            const supplierItems = items.filter(i => {
                const parent = expenses.find(e => e.id === i.expense_id);
                return parent && parent.supplier_id === s.id;
            });

            const totalInvoiceAmount = supplierExpenses.reduce((sum, e) => sum + e.price, 0);

            // Financial logic matching expenses page
            const hasDeposits = supplierDeposits.length > 0;
            let computedPaid = 0;
            if (hasDeposits) {
                computedPaid = supplierDeposits.reduce((sum, d) => sum + d.amount, 0);
            } else {
                computedPaid = supplierExpenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.price, 0);
            }

            const lastItem = supplierItems.sort((a, b) => {
                const dA = expenses.find(e => e.id === a.expense_id)?.date || '';
                const dB = expenses.find(e => e.id === b.expense_id)?.date || '';
                return dB.localeCompare(dA);
            })[0];

            return {
                id: s.id,
                name: s.name,
                color: s.color || 'bg-slate-500',
                address: s.address || 'Tunisie',
                tel: s.tel || '-',
                totalCost: totalInvoiceAmount,
                totalPaid: computedPaid,
                remaining: computedPaid - totalInvoiceAmount,
                articleCount: supplierItems.length + (supplierExpenses.some(e => (!e.items || e.items.length === 0)) ? 1 : 0), // rough estimate
                lastArticle: lastItem?.designation || (supplierExpenses[0]?.item),
                notes: s.notes
            };
        }).sort((a, b) => b.totalCost - a.totalCost);
    }, [suppliers, expenses, deposits, items]);

    const filteredSuppliers = stats.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="h-10 w-10 text-slate-900 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 space-y-6 pb-20 font-jakarta">
            {/* Header Content */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3 text-slate-900">
                        <div className="bg-slate-900 text-white p-2 rounded-2xl">
                            <User className="h-7 w-7" />
                        </div>
                        Gestion Fournisseurs
                    </h1>
                    <p className="text-slate-400 text-xs font-bold uppercase mt-2 tracking-widest pl-1">Annuaire et Situation Financière</p>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
                        <input
                            type="text"
                            placeholder="RECHERCHER UN FOURNISSEUR..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border-slate-100 border-2 rounded-2xl py-4 pl-12 pr-4 text-sm font-black text-slate-900 placeholder:text-slate-300 focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all uppercase"
                        />
                    </div>
                    {isAdmin && (
                        <Link href="/expenses" className="bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-2xl shadow-xl shadow-slate-200 transition-all flex items-center justify-center group">
                            <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform" />
                        </Link>
                    )}
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-white/10 rounded-2xl">
                            <TrendingUp className="h-6 w-6 text-emerald-400" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Total Engagé</span>
                    </div>
                    <p className="text-3xl font-black tabular-nums">{stats.reduce((sum, s) => sum + s.totalCost, 0).toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-sm text-white/50">DT</span></p>
                    <p className="text-[10px] font-bold text-white/30 uppercase mt-1 tracking-tighter">Cumul de toutes les factures</p>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 rounded-2xl">
                            <TrendingDown className="h-6 w-6 text-emerald-600" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Payé</span>
                    </div>
                    <p className="text-3xl font-black text-slate-900 tabular-nums">{stats.reduce((sum, s) => sum + s.totalPaid, 0).toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-sm text-slate-400 font-bold">DT</span></p>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1 tracking-tighter italic">Paiements & Acomptes effectués</p>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-50 rounded-2xl">
                            <TrendingUp className="h-6 w-6 text-red-600" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Dette Totale</span>
                    </div>
                    <p className="text-3xl font-black text-red-600 tabular-nums">{Math.abs(stats.reduce((sum, s) => sum + (s.remaining < 0 ? s.remaining : 0), 0)).toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-sm text-red-400 font-bold">DT</span></p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">Solde restant à régler</p>
                </div>
            </div>

            {/* Suppliers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSuppliers.map(s => (
                    <div key={s.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all group border-b-4 border-b-slate-900/5">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-3xl ${s.color} flex items-center justify-center text-white text-xl font-black shadow-lg shadow-${s.color.split('-')[1]}-200/50 group-hover:scale-110 transition-transform`}>
                                    {s.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-4 group-hover:text-blue-600 transition-colors">{s.name}</h3>
                                    <div className="flex items-center gap-1 mt-1">
                                        <Hash className="h-3 w-3 text-slate-300" />
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{s.id}</span>
                                    </div>
                                </div>
                            </div>
                            <Link href={`/expenses?tab=${s.id}`} className="bg-slate-50 opacity-0 group-hover:opacity-100 p-3 rounded-2xl hover:bg-slate-900 hover:text-white transition-all">
                                <ChevronRight className="h-5 w-5" />
                            </Link>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-end border-b border-slate-50 pb-4">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Dépensé</p>
                                    <p className="text-xl font-black text-slate-900 tabular-nums">{s.totalCost.toLocaleString(undefined, { minimumFractionDigits: 3 })}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Solde</p>
                                    <p className={`text-xl font-black tabular-nums ${s.remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {s.remaining.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-slate-50 rounded-lg">
                                        <Phone className="h-3 w-3 text-slate-400" />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-600 uppercase truncate">{s.tel}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-slate-50 rounded-lg">
                                        <MapPin className="h-3 w-3 text-slate-400" />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-600 uppercase truncate">{s.address}</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Package className="h-3 w-3 text-blue-500" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dernier Article</span>
                                    </div>
                                    <span className="text-[10px] font-black text-blue-600 uppercase">{s.articleCount} total</span>
                                </div>
                                <p className="text-xs font-black text-slate-800 uppercase line-clamp-1">{s.lastArticle || 'Aucun document'}</p>
                            </div>

                            <Link
                                href={`/expenses?tab=${s.id}`}
                                className="w-full bg-slate-100 hover:bg-slate-900 hover:text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                                Voir Situation
                                <ArrowRight className="h-3 w-3" />
                            </Link>

                            {/* Notes Section */}
                            {isAdmin && (
                                <div className="pt-4 border-t border-slate-50">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-3 w-3 text-slate-400" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes / Observations</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setEditingNotesId(s.id);
                                                setNotesValue(s.notes || '');
                                            }}
                                            className="p-1 hover:bg-slate-100 rounded transition-colors"
                                        >
                                            <Pencil className="h-3 w-3 text-slate-400" />
                                        </button>
                                    </div>
                                    <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
                                        <p className="text-[11px] font-medium text-slate-600 leading-relaxed italic">
                                            {s.notes || "Aucune note pour ce fournisseur..."}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Notes Editing Modal */}
            {editingNotesId && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white p-8 rounded-[2rem] w-full max-w-md shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black uppercase tracking-tighter">Éditer Notes</h3>
                            <button onClick={() => setEditingNotesId(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <textarea
                            className="w-full h-40 bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-sm font-medium text-slate-700 focus:border-slate-900 outline-none transition-all resize-none"
                            placeholder="Écrivez vos notes ici..."
                            value={notesValue}
                            onChange={(e) => setNotesValue(e.target.value)}
                        />
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setEditingNotesId(null)}
                                className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors bg-slate-50 rounded-2xl"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={async () => {
                                    const { error } = await supabase.from('suppliers').update({ notes: notesValue }).eq('id', editingNotesId);
                                    if (!error) {
                                        fetchData();
                                        setEditingNotesId(null);
                                    }
                                }}
                                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-200 transition-all"
                            >
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {filteredSuppliers.length === 0 && (
                <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                    <User className="h-16 w-16 mx-auto mb-4 text-slate-100" />
                    <p className="uppercase font-black tracking-widest text-slate-400">Aucun fournisseur trouvé</p>
                </div>
            )}
        </div>
    );
}

