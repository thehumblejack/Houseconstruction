'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Search, Loader2, User, Phone, MapPin, Package, TrendingUp, TrendingDown, Plus, Pencil, Trash2, ArrowRight, ChevronRight, Hash, FileText, X, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
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
    bestPriceCount: number;
    notes?: string;
    isSelected: boolean;
}

export default function SuppliersContent() {
    const { isAdmin } = useAuth();
    const { currentProject } = useProject();
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [deposits, setDeposits] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
    const [notesValue, setNotesValue] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'compact'>('compact');
    const [showDeleted, setShowDeleted] = useState(false);
    const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());

    // Delete Confirmation State
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [supplierToDelete, setSupplierToDelete] = useState<{ id: string, name: string } | null>(null);
    const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const supabase = useMemo(() => createClient(), []);

    const fetchData = useCallback(async () => {
        if (!currentProject) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [sups, exps, deps, its, projectSups] = await Promise.all([
                supabase.from('suppliers').select('*').order('name'),
                supabase.from('expenses').select('*').eq('project_id', currentProject.id).is('deleted_at', null),
                supabase.from('deposits').select('*').eq('project_id', currentProject.id).is('deleted_at', null),
                supabase.from('invoice_items').select('*'),
                supabase.from('project_suppliers').select('supplier_id').eq('project_id', currentProject.id)
            ]);

            const linkedSupplierIds = new Set<string>(projectSups.data?.map((ps: any) => ps.supplier_id) || []);

            setSuppliers(sups.data || []);
            setExpenses(exps.data || []);
            setDeposits(deps.data || []);
            setItems(its.data || []);

            // Pass linked IDs to stats calculation if needed by storing in state, 
            // OR just rely on re-calc. Since stats is a useMemo on [suppliers, expenses...], 
            // we should probably store linkedIds in state if we want to use them in useMemo.
            // Let's create a state for it or just inline the logic if we move stats calculation.
            // Actually, best to store 'linkedSupplierIds' in a state to use it in useMemo.
            setLinkedIds(linkedSupplierIds);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [supabase, currentProject]);

    useEffect(() => {
        fetchData();
    }, [supabase, fetchData]);

    const handleGlobalDeleteSupplier = async () => {
        if (!supplierToDelete) return;
        if (deleteConfirmInput.trim().toUpperCase() !== supplierToDelete.name.trim().toUpperCase()) {
            alert('Le nom saisi ne correspond pas exactement.');
            return;
        }

        setIsDeleting(true);
        try {
            // Soft delete
            const { error } = await supabase.from('suppliers').update({ deleted_at: new Date().toISOString() }).eq('id', supplierToDelete.id);
            if (error) throw error;

            setShowDeleteConfirmModal(false);
            setSupplierToDelete(null);
            setDeleteConfirmInput('');
            await fetchData();
        } catch (err) {
            console.error('Error deleting supplier globally:', err);
            alert('Erreur lors de la suppression globale');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleRestoreGlobalSupplier = async (id: string) => {
        try {
            const { error } = await supabase.from('suppliers').update({ deleted_at: null }).eq('id', id);
            if (error) throw error;
            fetchData();
        } catch (err) {
            console.error('Restore error:', err);
        }
    };

    const stats = useMemo(() => {
        // Find best prices for items
        const itemPrices: Record<string, { price: number, supplierId: string }> = {};
        items.forEach(item => {
            const designation = item.designation?.toLowerCase().trim();
            if (!designation) return;
            const price = item.unit_price || 0;
            if (price <= 0) return;

            const parentExpense = expenses.find(e => e.id === item.expense_id);
            if (!parentExpense) return;

            if (!itemPrices[designation] || price < itemPrices[designation].price) {
                itemPrices[designation] = { price, supplierId: parentExpense.supplier_id };
            }
        });

        const statsData = suppliers.map((s: any) => {
            const supplierExpenses = expenses.filter(e => e.supplier_id === s.id);
            const supplierDeposits = deposits.filter(d => d.supplier_id === s.id);
            const supplierItems = items.filter(i => {
                const parent = expenses.find(e => e.id === i.expense_id);
                return parent && parent.supplier_id === s.id;
            });

            const totalInvoiceAmount = supplierExpenses.reduce((sum, e) => sum + e.price, 0);

            const hasDeposits = supplierDeposits.length > 0;
            let computedPaid = 0;
            if (hasDeposits) {
                computedPaid = supplierDeposits.reduce((sum, d) => sum + d.amount, 0);
            } else {
                computedPaid = supplierExpenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.price, 0);
            }

            // Calculate best price count
            let bestPriceCount = 0;
            const uniqueSupplierItems = Array.from(new Set(supplierItems.map(i => i.designation?.toLowerCase().trim())));
            uniqueSupplierItems.forEach(designation => {
                if (designation && itemPrices[designation]?.supplierId === s.id) {
                    bestPriceCount++;
                }
            });

            return {
                id: s.id,
                name: s.name,
                color: s.color || 'bg-slate-500',
                address: s.address || '-',
                tel: s.tel || '-',
                totalCost: totalInvoiceAmount,
                totalPaid: computedPaid,
                remaining: computedPaid - totalInvoiceAmount,
                articleCount: supplierItems.length,
                bestPriceCount,
                notes: s.notes,
                isSelected: totalInvoiceAmount > 0 || linkedIds.has(s.id),
                deletedAt: s.deleted_at
            };
        }).sort((a: any, b: any) => b.totalCost - a.totalCost);

        return showDeleted
            ? statsData.filter((s: any) => s.deletedAt !== null)
            : statsData.filter((s: any) => s.deletedAt === null);
    }, [suppliers, expenses, deposits, items, showDeleted, linkedIds]);

    const filteredSuppliers = stats.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50/50 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest animate-pulse">Chargement...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 space-y-4 pb-20 font-jakarta">
            {/* Minimal Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-lg shadow-slate-200">
                        <User className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Fournisseurs</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Base de données & Comparaison</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="RECHERCHER..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border-slate-100 border rounded-2xl py-3 pl-10 pr-4 text-xs font-black text-slate-900 placeholder:text-slate-300 focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all uppercase"
                        />
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => setShowDeleted(!showDeleted)}
                            className={`p-3 rounded-2xl transition-all shadow-lg ${showDeleted ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}
                            title={showDeleted ? 'Voir Actifs' : 'Voir Corbeille'}
                        >
                            <Clock className="h-5 w-5" />
                        </button>
                    )}
                    {isAdmin && (
                        <Link href="/expenses" className="bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-2xl shadow-lg transition-all">
                            <Plus className="h-5 w-5" />
                        </Link>
                    )}
                </div>
            </div>

            {/* Quick Stats Banner - Very Compact */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-slate-900 text-white p-4 rounded-2xl">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Engagé Global</p>
                    <p className="text-lg font-black">{stats.reduce((sum, s) => sum + s.totalCost, 0).toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-[10px] opacity-40">DT</span></p>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-2xl">
                    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total Payé</p>
                    <p className="text-lg font-black text-slate-900">{stats.reduce((sum, s) => sum + s.totalPaid, 0).toLocaleString(undefined, { minimumFractionDigits: 3 })}</p>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-2xl">
                    <p className="text-[8px] font-black text-red-500 uppercase tracking-widest mb-1">Dette Totale</p>
                    <p className="text-lg font-black text-red-600">
                        {Math.abs(stats.reduce((sum, s) => sum + (s.remaining < 0 ? s.remaining : 0), 0)).toLocaleString(undefined, { minimumFractionDigits: 3 })}
                    </p>
                </div>
                <div className="bg-blue-600 text-white p-4 rounded-2xl">
                    <p className="text-[8px] font-black text-blue-200 uppercase tracking-widest mb-1">Fournisseurs Actifs</p>
                    <p className="text-lg font-black">{stats.filter(s => s.isSelected).length} / {stats.length}</p>
                </div>
            </div>

            {/* Compact Table View */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-12 text-center">In</th>
                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Fournisseur</th>
                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Catégorie</th>
                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Rating Prix</th>
                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Dépensé</th>
                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Solde</th>
                                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredSuppliers.map(s => {
                                const category = {
                                    beton: 'BÉTON / BPE',
                                    fer: 'MATÉRIAUX / FER',
                                    ahmed: 'MATÉRIAUX / DIVERS',
                                    ali: 'MAIN D\'OEUVRE',
                                    default: 'GÉNÉRAL'
                                }[s.id as string] || 'GÉNÉRAL';

                                return (
                                    <tr key={s.id} className={`hover:bg-slate-50/50 transition-colors group ${!s.isSelected ? 'opacity-60' : ''}`}>
                                        <td className="px-6 py-4 text-center">
                                            <div className={`w-5 h-5 rounded-md border-2 mx-auto flex items-center justify-center transition-all ${s.isSelected ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-200'}`}>
                                                {s.isSelected && <CheckCircle2 className="h-3 w-3" />}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center text-white text-xs font-black shadow-sm group-hover:scale-110 transition-transform`}>
                                                    {s.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{s.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] font-bold text-slate-400 uppercase">
                                                        <span>{s.id}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[9px] font-black text-slate-400 border border-slate-100 px-2 py-1 rounded bg-slate-50 whitespace-nowrap">{category}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-1">
                                                {[1, 2, 3].map((star) => (
                                                    <div
                                                        key={star}
                                                        className={`w-4 h-1.5 rounded-full transition-all ${s.bestPriceCount >= (star * 2) ? 'bg-emerald-500' : 'bg-slate-100'}`}
                                                        title={s.bestPriceCount > 0 ? `${s.bestPriceCount} articles au meilleur prix` : 'Pas d\'articles comparés'}
                                                    />
                                                ))}
                                                {s.bestPriceCount > 0 && (
                                                    <span className="ml-2 text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 rounded uppercase">TOP</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="text-[13px] font-black text-slate-900 tabular-nums">
                                                {s.totalCost.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-300 uppercase">{s.articleCount} arts.</p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`text-[13px] font-black tabular-nums px-2 py-1 rounded-lg ${s.remaining < 0
                                                ? 'text-red-600 bg-red-50'
                                                : s.remaining > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-50'
                                                }`}>
                                                {s.remaining.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link
                                                    href={`/expenses?tab=${s.id}`}
                                                    className="p-2 hover:bg-slate-900 hover:text-white text-slate-400 rounded-xl transition-all"
                                                    title="Voir Détails"
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Link>
                                                {isAdmin && !showDeleted && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingNotesId(s.id);
                                                            setNotesValue(s.notes || '');
                                                        }}
                                                        className="p-2 hover:bg-slate-100 text-slate-400 rounded-xl transition-all"
                                                        title="Notes"
                                                    >
                                                        <FileText className="h-4 w-4" />
                                                    </button>
                                                )}
                                                {isAdmin && !showDeleted && (
                                                    <button
                                                        onClick={() => {
                                                            setSupplierToDelete({ id: s.id, name: s.name });
                                                            setShowDeleteConfirmModal(true);
                                                            setDeleteConfirmInput('');
                                                        }}
                                                        className="p-2 hover:bg-red-50 hover:text-red-500 text-slate-400 rounded-xl transition-all"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                                {isAdmin && showDeleted && (
                                                    <button
                                                        onClick={() => handleRestoreGlobalSupplier(s.id)}
                                                        className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
                                                    >
                                                        <Clock className="h-3.5 w-3.5" />
                                                        Restaurer
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
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

            {/* Delete Confirmation Modal */}
            {showDeleteConfirmModal && supplierToDelete && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="bg-red-600 p-8 text-white relative">
                            <button
                                onClick={() => setShowDeleteConfirmModal(false)}
                                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                            <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                                <AlertCircle className="h-8 w-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter leading-tight">Suppression Globale</h2>
                            <p className="mt-2 text-red-100 text-sm font-medium">
                                Attention ! Vous allez supprimer <span className="font-black underline">{supplierToDelete.name}</span> de la base de données.
                                Cette action supprimera ses données dans <span className="font-black uppercase">Tous les projets</span>.
                            </p>
                        </div>

                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">
                                    Veuillez taper <span className="text-red-600">"{supplierToDelete.name}"</span> pour confirmer
                                </label>
                                <input
                                    type="text"
                                    value={deleteConfirmInput}
                                    onChange={(e) => setDeleteConfirmInput(e.target.value)}
                                    placeholder="NOM DU FOURNISSEUR..."
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-center text-sm font-black text-slate-900 focus:border-red-600 outline-none transition-all uppercase placeholder:text-slate-200"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !isDeleting && deleteConfirmInput.trim().toUpperCase() === supplierToDelete.name.trim().toUpperCase()) {
                                            handleGlobalDeleteSupplier();
                                        }
                                    }}
                                />
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowDeleteConfirmModal(false)}
                                    className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors bg-slate-50 rounded-2xl"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleGlobalDeleteSupplier}
                                    disabled={isDeleting || deleteConfirmInput.trim().toUpperCase() !== supplierToDelete.name.trim().toUpperCase()}
                                    className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${deleteConfirmInput.trim().toUpperCase() === supplierToDelete.name.trim().toUpperCase()
                                        ? 'bg-red-600 text-white shadow-xl shadow-red-200 hover:bg-red-700'
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    {isDeleting ? 'Suppression...' : 'Supprimer Partout'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

