'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Search, Loader2, Package, Calendar, FileText, Plus, X, Pencil, Trash2, Save, ChevronDown, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface ArticleRow {
    id: string;
    sourceTable: 'expenses' | 'invoice_items'; // Track source for edits
    parentId?: string; // For invoice_items, who is the parent expense?
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

    // Edit/Add States
    const [editingItem, setEditingItem] = useState<ArticleRow | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    // Form State (shared for add/edit)
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

    const supabase = createClient();

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

                // If it has items, show them.
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
                    // Startndalone expense
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
                // Update
                if (editingItem.sourceTable === 'expenses') {
                    // Editing an expense row
                    const { error } = await supabase.from('expenses').update({
                        item: formData.designation,
                        price: formData.totalPrice,
                        quantity: formData.quantity.toString()
                    }).eq('id', editingItem.id);
                    if (error) throw error;
                } else {
                    // Editing an invoice_item
                    const { error } = await supabase.from('invoice_items').update({
                        designation: formData.designation,
                        quantity: formData.quantity,
                        unit_price: formData.unitPrice,
                        total_ttc: formData.totalPrice
                    }).eq('id', editingItem.id);
                    if (error) throw error;
                }
            } else {
                // Create New (We create a new Expense with this item as description/price, simplest way)
                const { error } = await supabase.from('expenses').insert({
                    supplier_id: formData.supplierId || 'beton', // Fallback
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
        a.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.reference.toLowerCase().includes(searchTerm.toLowerCase())
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
    })).sort((a, b) => b.total - a.total); // Sort by total value by default

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="h-10 w-10 text-slate-900 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 space-y-6 pb-20 font-jakarta">
            <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                        <Package className="h-6 w-6 text-blue-400" />
                        Inventaire Complet
                    </h1>
                    <p className="text-slate-400 text-xs font-bold uppercase mt-1">Tous les articles et matériaux achetés</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Rechercher un article..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                    {isAdmin && (
                        <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-colors">
                            <Plus className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isAdding && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-black uppercase text-slate-900">{editingItem ? 'Modifier' : 'Ajouter'} Article</h2>
                            <button onClick={() => setIsAdding(false)}><X className="h-6 w-6 text-slate-400 hover:text-red-500" /></button>
                        </div>
                        <div className="space-y-4">
                            {!editingItem && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400">Fournisseur</label>
                                        <select
                                            className="w-full p-2 border rounded font-bold text-sm bg-slate-50"
                                            value={formData.supplierId}
                                            onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                                        >
                                            <option value="">Sélectionner...</option>
                                            {suppliersList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400">Date</label>
                                        <input
                                            className="w-full p-2 border rounded font-bold text-sm bg-slate-50"
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400">Désignation</label>
                                <input
                                    className="w-full p-3 border rounded-xl font-bold text-slate-900 bg-slate-50"
                                    value={formData.designation}
                                    onChange={e => setFormData({ ...formData, designation: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400">Quantité</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded font-bold text-sm bg-slate-50"
                                        value={formData.quantity}
                                        onChange={e => {
                                            const qty = Number(e.target.value);
                                            setFormData({ ...formData, quantity: qty, totalPrice: qty * formData.unitPrice })
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400">Prix Unit.</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded font-bold text-sm bg-slate-50"
                                        value={formData.unitPrice}
                                        onChange={e => {
                                            const price = Number(e.target.value);
                                            setFormData({ ...formData, unitPrice: price, totalPrice: formData.quantity * price })
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 text-blue-500">Total</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded font-bold text-sm bg-blue-50 text-blue-900"
                                        value={formData.totalPrice}
                                        onChange={e => setFormData({ ...formData, totalPrice: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <button onClick={handleSave} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase hover:bg-slate-800 transition-all flex items-center justify-center gap-2 mt-4">
                                <Save className="h-4 w-4" />
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {supplierGroups.map((group) => {
                    const isExpanded = expandedSuppliers[group.name];
                    return (
                        <div key={group.name} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300">
                            <div
                                onClick={() => toggleSupplier(group.name)}
                                className={`
                                    p-5 flex items-center justify-between cursor-pointer transition-colors
                                    ${isExpanded ? 'bg-slate-50 border-b border-slate-100' : 'hover:bg-slate-50/50'}
                                `}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-2xl ${group.color} flex items-center justify-center text-white shadow-lg`}>
                                        {group.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">{group.name}</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group.rows.length} ARTICLES ACHETÉS</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="hidden sm:flex flex-col items-end">
                                        <span className="text-[9px] font-black text-slate-400 uppercase">Valeur Inventaire</span>
                                        <span className="text-sm font-black text-slate-900 tabular-nums">
                                            {group.total.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-[10px] text-slate-400 ml-0.5">DT</span>
                                        </span>
                                    </div>
                                    <div className={`p-2 rounded-xl transition-all duration-300 ${isExpanded ? 'bg-blue-600 text-white rotate-180' : 'bg-slate-100 text-slate-400'}`}>
                                        <ChevronDown className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="overflow-x-auto animate-in slide-in-from-top-2 duration-300">
                                    <table className="w-full text-left border-collapse min-w-[600px]">
                                        <thead className="bg-slate-100/50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            <tr>
                                                <th className="px-6 py-4 w-24">Date</th>
                                                <th className="px-6 py-4 w-32">Référence</th>
                                                <th className="px-6 py-4">Désignation</th>
                                                <th className="px-6 py-4 w-24 text-center">Qté</th>
                                                <th className="px-6 py-4 w-32 text-right">Unit. (DT)</th>
                                                <th className="px-6 py-4 w-32 text-right">Total TTC</th>
                                                {isAdmin && <th className="px-6 py-4 w-20 text-center">Actions</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm divide-y divide-slate-50">
                                            {group.rows.map(row => (
                                                <tr key={row.id} className="hover:bg-blue-50/20 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 font-mono">
                                                            {row.date}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{row.reference}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="font-black text-slate-900 uppercase text-[11px] leading-tight block">{row.designation}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-black text-slate-700">{row.quantity}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-xs font-bold text-slate-400 tabular-nums">{row.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 3 })}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-sm font-black text-slate-900 tabular-nums tracking-tight">{row.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 3 })}</span>
                                                    </td>
                                                    {isAdmin && (
                                                        <td className="px-6 py-4">
                                                            <div className="flex justify-center gap-1 opacity-20 group-hover:opacity-100 transition-all">
                                                                <button onClick={(e) => { e.stopPropagation(); openEdit(row); }} className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(row); }} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}

                {articles.length === 0 && (
                    <div className="text-center py-20 text-slate-400">
                        <Package className="h-16 w-16 mx-auto mb-4 opacity-20" />
                        <p className="uppercase font-black tracking-widest">Aucun article trouvé</p>
                    </div>
                )}
            </div>
        </div>
    );
}
