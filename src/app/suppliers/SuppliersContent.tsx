'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Search, Loader2, User, Phone, MapPin, Package, TrendingUp, TrendingDown, Plus, Pencil, Trash2, ArrowRight, ChevronRight, Hash, FileText, X, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

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
        <div className="max-w-[1600px] mx-auto p-6 space-y-8 pb-32 font-jakarta bg-slate-50 min-h-screen">
            {/* Premium Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 rounded-[2.5rem] p-8 md:p-10 text-white relative overflow-hidden shadow-2xl shadow-slate-900/20"
            >
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-400/20 via-transparent to-transparent rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4"></div>

                <div className="relative z-10 flex flex-col xl:flex-row justify-between items-center gap-8">
                    <div className="space-y-4 w-full xl:w-auto text-center xl:text-left">
                        <div className="flex items-center justify-center xl:justify-start gap-3">
                            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg">
                                <User className="h-5 w-5 text-blue-400" />
                            </div>
                            <span className="text-blue-400 font-black tracking-[0.2em] uppercase text-[10px]">Annuaire Partenaires</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-tighter leading-tight">
                            Gestion <span className="text-blue-400">Fournisseurs</span>
                            <br />
                            <span className="text-white/40">& Relations Commerciales</span>
                        </h1>
                    </div>

                    <div className="w-full xl:w-auto flex flex-col md:flex-row items-center gap-4 lg:gap-6">
                        <div className="relative w-full md:w-[400px] group">
                            <div className="absolute inset-0 bg-blue-400/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Rechercher un partenaire..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white/10 backdrop-blur-xl border border-white/10 text-white h-14 pl-12 pr-4 rounded-2xl font-bold text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all uppercase"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            {isAdmin && (
                                <button
                                    onClick={() => setShowDeleted(!showDeleted)}
                                    className={`p-4 rounded-2xl backdrop-blur-md border transition-all duration-500 ${showDeleted ? 'bg-rose-500 text-white border-rose-400' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white'}`}
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            )}
                            {isAdmin && (
                                <Link href="/expenses" className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-slate-100 transition-all shadow-xl shadow-white/5 active:scale-95 flex items-center gap-2">
                                    <Plus className="h-4 w-4" /> NOUVEAU
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Premium Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Engagé Global', value: stats.reduce((sum, s) => sum + s.totalCost, 0), unit: 'DT', color: 'slate', icon: Hash },
                    { label: 'Total Payé', value: stats.reduce((sum, s) => sum + s.totalPaid, 0), unit: 'DT', color: 'emerald', icon: CheckCircle2 },
                    { label: 'Dette Restante', value: Math.abs(stats.reduce((sum, s) => sum + (s.remaining < 0 ? s.remaining : 0), 0)), unit: 'DT', color: 'rose', icon: AlertCircle },
                    { label: 'Partenaires Actifs', value: stats.filter(s => s.isSelected).length, total: stats.length, color: 'blue', icon: User }
                ].map((stat, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`luxury-card bg-white p-6 border-none shadow-xl shadow-slate-200/40 group overflow-hidden relative`}
                    >
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2`}></div>
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl bg-${stat.color}-50 text-${stat.color}-600`}>
                                <stat.icon className="h-5 w-5" />
                            </div>
                            <TrendingUp className="h-4 w-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className={`text-2xl font-black text-slate-900 tracking-tighter`}>
                            {stat.value.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                            {stat.unit && <span className="text-xs text-slate-300 ml-1.5">{stat.unit}</span>}
                            {stat.total && <span className="text-xs text-slate-300 ml-1.5">/ {stat.total}</span>}
                        </p>
                    </motion.div>
                ))}
            </div>

            {/* Premium Supplier Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="luxury-card bg-white border-none shadow-2xl shadow-slate-200/50 overflow-hidden"
            >
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900">
                                <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-[0.2em] w-20 text-center">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white uppercase tracking-[0.2em]">Partenaire</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white uppercase tracking-[0.2em]">Secteur d'Activité</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white uppercase tracking-[0.2em] text-center">Performance Prix</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white uppercase tracking-[0.2em] text-right">Dépenses TTC</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white uppercase tracking-[0.2em] text-right">Solde Actuel</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white uppercase tracking-[0.2em] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredSuppliers.map(s => {
                                const category = {
                                    beton: 'BÉTON PRESTIGE',
                                    fer: 'ACIERS & ARMATEURS',
                                    ahmed: 'QUINCAILLERIE GENERALE',
                                    ali: 'MAÎTRISE D\'OEUVRE',
                                    default: 'GÉNÉRAL PROJET'
                                }[s.id as string] || 'GÉNÉRAL PROJET';

                                return (
                                    <tr key={s.id} className={`hover:bg-slate-50 transition-all duration-300 group ${!s.isSelected ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                                        <td className="px-8 py-6 text-center">
                                            <div className={`w-6 h-6 rounded-lg border-2 mx-auto flex items-center justify-center transition-all duration-500 ${s.isSelected ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'border-slate-200 group-hover:border-slate-400'}`}>
                                                {s.isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-14 h-14 rounded-2xl ${s.color} flex items-center justify-center text-white text-lg font-black shadow-2xl transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                                                    {s.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-base font-black text-slate-900 uppercase tracking-tighter group-hover:text-blue-600 transition-colors uppercase">{s.name}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{s.id}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 transition-colors group-hover:bg-blue-50 group-hover:border-blue-100">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-500">{category}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center justify-center gap-1.5">
                                                {[1, 2, 3].map((star) => (
                                                    <div
                                                        key={star}
                                                        className={`w-6 h-1.5 rounded-full transition-all duration-700 ${s.bestPriceCount >= (star * 2) ? 'bg-emerald-500 shadow-sm shadow-emerald-500/20' : 'bg-slate-100 group-hover:bg-slate-200'}`}
                                                        title={s.bestPriceCount > 0 ? `${s.bestPriceCount} articles au meilleur prix` : 'Pas d\'articles comparés'}
                                                    />
                                                ))}
                                                {s.bestPriceCount > 0 && (
                                                    <span className="ml-2 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg uppercase tracking-tighter">PREMIUM</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex flex-col items-end">
                                                <p className="text-base font-black text-slate-900 tabular-nums tracking-tighter">
                                                    {s.totalCost.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                                                </p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{s.articleCount} ARTICLES</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <span className={`text-base font-black tabular-nums px-4 py-2 rounded-2xl tracking-tighter transition-all duration-500 ${s.remaining < 0
                                                ? 'text-rose-600 bg-rose-50 group-hover:bg-rose-100'
                                                : s.remaining > 0 ? 'text-emerald-600 bg-emerald-50 group-hover:bg-emerald-100' : 'text-slate-400 bg-slate-50'
                                                }`}>
                                                {s.remaining.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500">
                                                <Link
                                                    href={`/expenses?tab=${s.id}`}
                                                    className="p-3 bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-400 rounded-xl transition-all shadow-sm"
                                                    title="Détails"
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Link>
                                                {isAdmin && !showDeleted && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingNotesId(s.id);
                                                            setNotesValue(s.notes || '');
                                                        }}
                                                        className="p-3 bg-slate-50 hover:bg-blue-500 hover:text-white text-slate-400 rounded-xl transition-all shadow-sm"
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
                                                        className="p-3 bg-slate-50 hover:bg-rose-500 hover:text-white text-slate-400 rounded-xl transition-all shadow-sm"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                                {isAdmin && showDeleted && (
                                                    <button
                                                        onClick={() => handleRestoreGlobalSupplier(s.id)}
                                                        className="luxury-button-secondary scale-90"
                                                    >
                                                        RESTAURER
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
            </motion.div>

            {/* Notes Editing Modal */}
            <AnimatePresence>
                {editingNotesId && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white p-8 rounded-[3rem] w-full max-w-lg shadow-2xl border border-slate-100"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter">Notes Partenaire</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Édition des informations confidentielles</p>
                                    </div>
                                </div>
                                <button onClick={() => setEditingNotesId(null)} className="p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-300 hover:text-slate-900">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            <textarea
                                className="w-full h-60 bg-slate-50 border-2 border-slate-100 p-6 rounded-[2rem] text-sm font-medium text-slate-700 focus:border-slate-900 outline-none transition-all resize-none shadow-inner"
                                placeholder="Saisissez vos remarques sur ce fournisseur ici..."
                                value={notesValue}
                                onChange={(e) => setNotesValue(e.target.value)}
                            />
                            <div className="mt-8 flex gap-4">
                                <button
                                    onClick={() => setEditingNotesId(null)}
                                    className="flex-1 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all"
                                >
                                    Fermer
                                </button>
                                <button
                                    onClick={async () => {
                                        const { error } = await supabase.from('suppliers').update({ notes: notesValue }).eq('id', editingNotesId);
                                        if (!error) {
                                            fetchData();
                                            setEditingNotesId(null);
                                        }
                                    }}
                                    className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
                                >
                                    Mettre à jour
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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

