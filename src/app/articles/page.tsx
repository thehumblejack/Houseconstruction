'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
    Plus, X, Search, Pencil, Save, Loader2, Package,
    LayoutGrid, List, TrendingDown, Medal, ArrowRightLeft,
    ChevronDown, Trash2
} from 'lucide-react';

interface ArticleRow {
    id: string;
    sourceTable: 'expenses' | 'invoice_items';
    parentId?: string;
    date: string;
    supplierId: string;
    supplierName: string;
    supplierColor: string;
    reference: string;
    designation: string;
    quantity: string | number;
    unitPrice: number;
    totalPrice: number;
}

export default function ArticlesPage() {
    const { isAdmin } = useAuth();
    const [loading, setLoading] = useState(true);
    const [articles, setArticles] = useState<ArticleRow[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [suppliersList, setSuppliersList] = useState<{ id: string, name: string }[]>([]);
    const [viewMode, setViewMode] = useState<'inventory' | 'comparison'>('inventory');

    // Edit/Add States
    const [editingItem, setEditingItem] = useState<ArticleRow | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        supplierId: '',
        date: new Date().toLocaleDateString('fr-FR'),
        reference: '',
        designation: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0
    });
    const [expandedSuppliers, setExpandedSuppliers] = useState<Record<string, boolean>>({});

    const toggleSupplier = (name: string) => {
        setExpandedSuppliers(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const supabase = useMemo(() => createClient(), []);

    const fetchArticles = async () => {
        try {
            // Fetch suppliers
            const { data: suppliersData } = await supabase.from('suppliers').select('*');
            const suppliersMap: Record<string, { name: string, color: string }> = {};
            const sList: { id: string, name: string }[] = [];

            suppliersData?.forEach((s: any) => {
                suppliersMap[s.id] = { name: s.name, color: s.color || 'bg-slate-500' };
                sList.push({ id: s.id, name: s.name });
            });
            setSuppliersList(sList);

            // Fetch expenses
            const { data: expensesData } = await supabase.from('expenses').select('*, items:invoice_items(*)');
            const rows: ArticleRow[] = [];

            expensesData?.forEach((e: any) => {
                const sup = suppliersMap[e.supplier_id] || { name: 'Inconnu', color: 'bg-slate-300' };

                if (e.items && e.items.length > 0) {
                    e.items.forEach((i: any) => {
                        rows.push({
                            id: i.id,
                            sourceTable: 'invoice_items',
                            parentId: e.id,
                            date: e.date,
                            supplierId: e.supplier_id,
                            supplierName: sup.name,
                            supplierColor: sup.color,
                            reference: e.item,
                            designation: i.designation || 'Article sans nom',
                            quantity: i.quantity || 1,
                            unitPrice: i.unit_price || 0,
                            totalPrice: i.total_ttc || 0,
                        });
                    });
                } else {
                    rows.push({
                        id: e.id,
                        sourceTable: 'expenses',
                        date: e.date,
                        supplierId: e.supplier_id,
                        supplierName: sup.name,
                        supplierColor: sup.color,
                        reference: '-',
                        designation: e.item,
                        quantity: e.quantity || 1,
                        unitPrice: e.price,
                        totalPrice: e.price,
                    });
                }
            });

            const parseDate = (d: string) => {
                if (!d) return 0;
                const parts = d.split('/');
                if (parts.length === 3) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
                return 0;
            };
            rows.sort((a, b) => parseDate(b.date) - parseDate(a.date));
            setArticles(rows);
        } catch (error) {
            console.error('Error fetching articles:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchArticles();
    }, [supabase]);

    const handleDelete = async (row: ArticleRow) => {
        if (!confirm('Supprimer cet article ?')) return;
        try {
            const { error } = await supabase.from(row.sourceTable).delete().eq('id', row.id);
            if (error) throw error;
            fetchArticles();
        } catch (err) {
            console.error(err);
            alert('Impossible de supprimer');
        }
    };

    const handleSave = async () => {
        try {
            if (editingItem) {
                if (editingItem.sourceTable === 'expenses') {
                    const { error } = await supabase.from('expenses').update({
                        item: formData.designation,
                        price: formData.totalPrice,
                        quantity: formData.quantity.toString()
                    }).eq('id', editingItem.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('invoice_items').update({
                        designation: formData.designation,
                        quantity: formData.quantity,
                        unit_price: formData.unitPrice,
                        total_ttc: formData.totalPrice
                    }).eq('id', editingItem.id);
                    if (error) throw error;
                }
            } else {
                const { error } = await supabase.from('expenses').insert({
                    supplier_id: formData.supplierId || 'beton',
                    date: formData.date,
                    item: formData.designation,
                    quantity: formData.quantity.toString(),
                    price: formData.totalPrice,
                    status: 'pending'
                });
                if (error) throw error;
            }
            setIsAdding(false);
            setEditingItem(null);
            fetchArticles();
        } catch (err) {
            console.error(err);
            alert('Erreur lors de la sauvegarde');
        }
    };

    const openEdit = (row: ArticleRow) => {
        setEditingItem(row);
        setFormData({
            supplierId: row.supplierId,
            date: row.date,
            reference: row.reference,
            designation: row.designation,
            quantity: Number(row.quantity) || 1,
            unitPrice: row.unitPrice,
            totalPrice: row.totalPrice
        });
        setIsAdding(true);
    };

    const openAdd = () => {
        setEditingItem(null);
        setFormData({
            supplierId: suppliersList[0]?.id || '',
            date: new Date().toLocaleDateString('fr-FR'),
            reference: '',
            designation: '',
            quantity: 1,
            unitPrice: 0,
            totalPrice: 0
        });
        setIsAdding(true);
    };

    const filteredArticles = articles.filter(a =>
        a.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const grouped = filteredArticles.reduce((acc, row) => {
        if (!acc[row.supplierName]) acc[row.supplierName] = [];
        acc[row.supplierName].push(row);
        return acc;
    }, {} as Record<string, ArticleRow[]>);

    const supplierGroups = Object.entries(grouped).map(([name, rows]) => ({
        name,
        rows,
        total: rows.reduce((sum, r) => sum + r.totalPrice, 0),
        color: rows[0].supplierColor
    })).sort((a, b) => b.total - a.total);

    // Comparison Logic
    const comparisonGroups = useMemo(() => {
        const groups: Record<string, ArticleRow[]> = {};

        filteredArticles.forEach(row => {
            const normalizedName = row.designation.trim().toLowerCase();
            if (!groups[normalizedName]) {
                groups[normalizedName] = [];
            }
            groups[normalizedName].push(row);
        });

        return Object.entries(groups)
            .map(([name, items]) => {
                const sortedItems = [...items].sort((a, b) => a.unitPrice - b.unitPrice);
                return {
                    name: items[0].designation,
                    items: sortedItems,
                    bestPrice: sortedItems[0].unitPrice,
                    bestSupplier: sortedItems[0].supplierName,
                    priceSpread: sortedItems[sortedItems.length - 1].unitPrice - sortedItems[0].unitPrice
                };
            })
            // Filter groups that have useful comparison data (optional: or just sort by Relevance)
            .sort((a, b) => b.items.length - a.items.length);
    }, [filteredArticles]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="h-10 w-10 text-slate-900 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto p-6 space-y-8 pb-32 font-jakarta bg-slate-50 min-h-screen">

            {/* Header Section */}
            <div className="bg-slate-900 rounded-[40px] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FFB800]/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>

                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
                                <Package className="h-8 w-8 text-[#FFB800]" />
                            </div>
                            <span className="text-[#FFB800] font-black tracking-widest uppercase text-xs">Gestion de Matériaux</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                            Inventaire & <br />
                            <span className="text-[#FFB800]">Market Analytics</span>
                        </h1>
                    </div>

                    <div className="w-full lg:w-auto flex flex-col gap-6">
                        {/* Tab Switcher */}
                        <div className="bg-white/10 p-1.5 rounded-2xl backdrop-blur-md flex self-start lg:self-end">
                            <button
                                onClick={() => setViewMode('inventory')}
                                className={`
                                    flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                                    ${viewMode === 'inventory' ? 'bg-[#FFB800] text-slate-900 shadow-lg' : 'text-white hover:bg-white/5'}
                                `}
                            >
                                <List className="w-4 h-4" />
                                Inventaire Global
                            </button>
                            <button
                                onClick={() => setViewMode('comparison')}
                                className={`
                                    flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                                    ${viewMode === 'comparison' ? 'bg-[#FFB800] text-slate-900 shadow-lg' : 'text-white hover:bg-white/5'}
                                `}
                            >
                                <ArrowRightLeft className="w-4 h-4" />
                                Comparateur Prix
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full lg:w-[400px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder={viewMode === 'inventory' ? "Rechercher un article..." : "Comparer un matériau (ex: Ciment, Fer)..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white text-slate-900 h-14 pl-12 pr-6 rounded-2xl font-bold text-sm placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#FFB800]/50 transition-all shadow-xl"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {viewMode === 'comparison' ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
                    <div className="flex items-center gap-4 px-2">
                        <TrendingDown className="text-[#FFB800] w-6 h-6" />
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Meilleures Opportunités</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {comparisonGroups.map((group, idx) => (
                            <div key={idx} className="bg-white rounded-[32px] p-6 shadow-sm hover:shadow-xl transition-all border border-slate-100 group flex flex-col h-full relative overflow-hidden">
                                {/* Decor */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[100px] -z-0 transition-colors group-hover:bg-[#FFB800]/10"></div>

                                <div className="relative z-10 mb-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full mb-2">
                                            <Package className="w-3 h-3 text-[#FFB800]" />
                                            <span className="text-[9px] font-black text-white uppercase tracking-widest">{group.items.length} Achats</span>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-tight line-clamp-2 min-h-[3rem]" title={group.name}>
                                        {group.name}
                                    </h3>
                                </div>

                                {/* Stats Bar */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Meilleur Prix</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl font-black text-green-700">{group.bestPrice.toFixed(3)}</span>
                                            <span className="text-[10px] font-bold text-green-600">DT</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Dernier Achat</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-black text-slate-700 truncate">{group.items[0].date}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 space-y-3">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Historique des prix</span>
                                    {group.items.slice(0, 5).map((item, i) => (
                                        <div key={i} className={`flex justify-between items-center p-3 rounded-xl border ${i === 0 ? 'bg-[#FFB800]/10 border-[#FFB800] relative overflow-hidden' : 'bg-white border-slate-100'}`}>
                                            {i === 0 && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FFB800]"></div>
                                            )}
                                            <div className="flex items-center gap-3">
                                                {i === 0 && <Medal className="w-4 h-4 text-[#FFB800] fill-[#FFB800]" />}
                                                <div>
                                                    <div className="text-xs font-black text-slate-900 uppercase">{item.supplierName}</div>
                                                    <div className="text-[9px] font-bold text-slate-400">{item.date}</div>
                                                </div>
                                            </div>
                                            <span className={`text-sm font-black ${i === 0 ? 'text-[#e5a500]' : 'text-slate-600'}`}>
                                                {item.unitPrice.toFixed(3)}
                                            </span>
                                        </div>
                                    ))}
                                    {group.items.length > 5 && (
                                        <div className="text-center py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            + {group.items.length - 5} autres entrées
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {comparisonGroups.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-32 text-center opacity-50">
                            <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-6">
                                <Search className="w-10 h-10 text-slate-400" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 uppercase">Aucun Résultat</h3>
                            <p className="text-slate-500 font-medium">Essayez de rechercher un autre matériau.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex justify-between items-center px-2">
                        <div className="flex items-center gap-4">
                            <LayoutGrid className="text-slate-400 w-6 h-6" />
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Liste Fournisseurs</h2>
                        </div>
                        {isAdmin && (
                            <button
                                onClick={openAdd}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center gap-2 text-xs font-black uppercase tracking-widest transform hover:scale-105"
                            >
                                <Plus className="h-4 w-4" />
                                Nouvel Article
                            </button>
                        )}
                    </div>

                    {supplierGroups.map((group) => {
                        const isExpanded = expandedSuppliers[group.name];
                        return (
                            <div key={group.name} className="bg-white rounded-[32px] p-1 shadow-sm border border-slate-100 overflow-hidden transition-all duration-300">
                                <div
                                    onClick={() => toggleSupplier(group.name)}
                                    className={`
                                        p-6 flex items-center justify-between cursor-pointer rounded-[28px] transition-all
                                        ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'}
                                    `}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={`w-14 h-14 rounded-2xl ${group.color} flex items-center justify-center text-white shadow-lg text-xl font-black`}>
                                            {group.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{group.name}</h2>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="bg-white px-2 py-0.5 rounded text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-100">
                                                    {group.rows.length} Articles
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-8">
                                        <div className="hidden sm:flex flex-col items-end">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Dépensé</span>
                                            <span className="text-2xl font-black text-slate-900 tabular-nums leading-none">
                                                {group.total.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-sm text-slate-400 ml-0.5 font-bold">DT</span>
                                            </span>
                                        </div>
                                        <div className={`p-3 rounded-full border transition-all duration-300 ${isExpanded ? 'bg-slate-900 text-white border-slate-900 rotate-180' : 'bg-white text-slate-400 border-slate-200'}`}>
                                            <ChevronDown className="h-5 w-5" />
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="p-2 animate-in slide-in-from-top-4 duration-300">
                                        <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden">
                                            <table className="w-full text-left border-collapse min-w-[800px]">
                                                <thead className="bg-slate-50 border-b border-slate-100">
                                                    <tr>
                                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Date</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40">Référence</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Désignation</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24 text-center">Qté</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40 text-right">Prix Unitaire</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40 text-right">Total TTC</th>
                                                        {isAdmin && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24 text-center">Actions</th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {group.rows.map((row, i) => (
                                                        <tr key={row.id} className="hover:bg-blue-50/30 transition-colors group">
                                                            <td className="px-6 py-5">
                                                                <div className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-[10px] font-bold text-slate-600">{row.date}</div>
                                                            </td>
                                                            <td className="px-6 py-5 text-sm font-bold text-slate-500">{row.reference}</td>
                                                            <td className="px-6 py-5 text-sm font-black text-slate-900 uppercase">{row.designation}</td>
                                                            <td className="px-6 py-5 text-center">
                                                                <span className="text-xs font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">{row.quantity}</span>
                                                            </td>
                                                            <td className="px-6 py-5 text-right font-bold text-slate-500 tabular-nums">{row.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 3 })}</td>
                                                            <td className="px-6 py-5 text-right font-black text-slate-900 tabular-nums">{row.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 3 })}</td>
                                                            {isAdmin && (
                                                                <td className="px-6 py-5 text-center">
                                                                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                                        <button onClick={(e) => { e.stopPropagation(); openEdit(row); }} className="p-2 hover:bg-blue-50 rounded-xl text-slate-400 hover:text-blue-600 transition-colors"><Pencil className="h-4 w-4" /></button>
                                                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(row); }} className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                                                                    </div>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {articles.length === 0 && (
                        <div className="text-center py-20 opacity-50">
                            <Package className="h-20 w-20 mx-auto mb-6 text-slate-300" />
                            <h3 className="text-xl font-black text-slate-900 uppercase">Aucun article enregistré</h3>
                            <p className="text-slate-500 mt-2 font-medium">Commencez par ajouter votre premier achat.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {isAdding && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-black uppercase text-slate-900 tracking-tight">{editingItem ? 'Modifier' : 'Nouvel'} Article</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase mt-1">Détails de l'achat</p>
                            </div>
                            <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="h-6 w-6 text-slate-400 hover:text-red-500" /></button>
                        </div>
                        <div className="space-y-6">
                            {!editingItem && (
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Fournisseur</label>
                                        <div className="relative">
                                            <select
                                                className="w-full p-4 border-none bg-slate-50 rounded-2xl font-bold text-sm text-slate-900 focus:ring-2 focus:ring-[#FFB800] appearance-none"
                                                value={formData.supplierId}
                                                onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                                            >
                                                <option value="">Sélectionner...</option>
                                                {suppliersList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Date</label>
                                        <input
                                            className="w-full p-4 border-none bg-slate-50 rounded-2xl font-bold text-sm text-slate-900 focus:ring-2 focus:ring-[#FFB800]"
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                            placeholder="JJ/MM/AAAA"
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Désignation article</label>
                                <input
                                    className="w-full p-4 border-none bg-slate-50 rounded-2xl font-black text-slate-900 focus:ring-2 focus:ring-[#FFB800]"
                                    value={formData.designation}
                                    onChange={e => setFormData({ ...formData, designation: e.target.value })}
                                    placeholder="Ex: Ciment 50kg..."
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Quantité</label>
                                    <input
                                        type="number"
                                        className="w-full p-4 border-none bg-slate-50 rounded-2xl font-bold text-sm text-slate-900 focus:ring-2 focus:ring-[#FFB800]"
                                        value={formData.quantity}
                                        onChange={e => {
                                            const qty = Number(e.target.value);
                                            setFormData({ ...formData, quantity: qty, totalPrice: qty * formData.unitPrice })
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">P.U.</label>
                                    <input
                                        type="number"
                                        className="w-full p-4 border-none bg-slate-50 rounded-2xl font-bold text-sm text-slate-900 focus:ring-2 focus:ring-[#FFB800]"
                                        value={formData.unitPrice}
                                        onChange={e => {
                                            const price = Number(e.target.value);
                                            setFormData({ ...formData, unitPrice: price, totalPrice: formData.quantity * price })
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-[#FFB800] tracking-widest pl-1">Total</label>
                                    <input
                                        type="number"
                                        className="w-full p-4 border-none bg-[#FFB800]/10 rounded-2xl font-black text-sm text-slate-900 focus:ring-2 focus:ring-[#FFB800]"
                                        value={formData.totalPrice}
                                        onChange={e => setFormData({ ...formData, totalPrice: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <button onClick={handleSave} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-[#FFB800] hover:text-slate-900 transition-all flex items-center justify-center gap-3 mt-4 shadow-xl">
                                <Save className="h-5 w-5" />
                                {editingItem ? 'Mettre à jour' : 'Enregistrer Article'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
