'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Search, User, Trash2, Plus, FileText, ChevronRight, Hash, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import Link from 'next/link';
import { Modal } from '@/components/ui';

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
    const { currentProject, userRole } = useProject();
    // Write permission = project role; viewers ("Observateur") are read-only.
    const isAdmin = userRole === 'admin' || userRole === 'editor';
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [deposits, setDeposits] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
    const [notesValue, setNotesValue] = useState('');
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
        if (!isAdmin) return;
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
        if (!isAdmin) return;
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

    const categoryFor = (id: string) => ({
        beton: 'Béton prestige',
        fer: 'Aciers & armateurs',
        ahmed: 'Quincaillerie générale',
        ali: 'Maîtrise d\'oeuvre',
        default: 'Général projet'
    }[id] || 'Général projet');

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                    <p className="text-slate-500 text-sm">Chargement...</p>
                </div>
            </div>
        );
    }

    const deleteMatches = supplierToDelete
        ? deleteConfirmInput.trim().toUpperCase() === supplierToDelete.name.trim().toUpperCase()
        : false;

    return (
        <div className="min-h-screen font-jakarta">
            <div className="max-w-[110rem] mx-auto px-4 sm:px-6 py-5 pb-28 md:pb-12 space-y-5">
                {/* Page header */}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">Fournisseurs</h1>
                            <p className="text-sm text-slate-500 mt-0.5">Annuaire des partenaires et suivi des soldes.</p>
                        </div>
                        {isAdmin && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowDeleted(!showDeleted)}
                                    className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border text-sm font-medium transition-colors ${showDeleted
                                        ? 'bg-rose-50 border-rose-200 text-rose-700'
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="hidden sm:inline">{showDeleted ? 'Masquer supprimés' : 'Supprimés'}</span>
                                </button>
                                <Link
                                    href="/expenses"
                                    className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 active:scale-[0.99] transition-colors"
                                >
                                    <Plus className="h-4 w-4" /> Nouveau
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Search input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Rechercher un partenaire..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
                        />
                    </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                        { label: 'Engagé global', value: stats.reduce((sum, s) => sum + s.totalCost, 0), unit: 'DT', tone: 'bg-slate-100 text-slate-600', icon: Hash },
                        { label: 'Total payé', value: stats.reduce((sum, s) => sum + s.totalPaid, 0), unit: 'DT', tone: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2 },
                        { label: 'Dette restante', value: Math.abs(stats.reduce((sum, s) => sum + (s.remaining < 0 ? s.remaining : 0), 0)), unit: 'DT', tone: 'bg-rose-50 text-rose-600', icon: AlertCircle },
                        { label: 'Partenaires actifs', value: stats.filter(s => s.isSelected).length, total: stats.length, tone: 'bg-blue-50 text-blue-600', icon: User }
                    ].map((stat, idx) => (
                        <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                            <div className="flex items-start justify-between">
                                <p className="text-xs text-slate-500">{stat.label}</p>
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${stat.tone}`}>
                                    <stat.icon className="h-4 w-4" />
                                </span>
                            </div>
                            <p className="text-xl sm:text-2xl font-semibold text-slate-900 tabular-nums mt-1">
                                {stat.value.toLocaleString(undefined, { minimumFractionDigits: stat.unit ? 3 : 0 })}
                                {stat.unit && <span className="text-xs font-medium text-slate-400 ml-1.5">{stat.unit}</span>}
                                {stat.total !== undefined && <span className="text-xs font-medium text-slate-400 ml-1.5">/ {stat.total}</span>}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block rounded-2xl border border-slate-200 overflow-hidden bg-white">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-xs font-medium text-slate-500">
                                <th className="px-4 py-3 w-16 text-center">Statut</th>
                                <th className="px-4 py-3">Partenaire</th>
                                <th className="px-4 py-3">Secteur d'activité</th>
                                <th className="px-4 py-3 text-center">Meilleurs prix</th>
                                <th className="px-4 py-3 text-right">Dépenses TTC</th>
                                <th className="px-4 py-3 text-right">Solde actuel</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSuppliers.map(s => {
                                const category = categoryFor(s.id);
                                return (
                                    <tr key={s.id} className={`border-t border-slate-100 hover:bg-slate-50 transition-colors ${!s.isSelected ? 'opacity-50' : ''}`}>
                                        <td className="px-4 py-3 text-center">
                                            <div className={`w-5 h-5 rounded-md border mx-auto flex items-center justify-center ${s.isSelected ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-200'}`}>
                                                {s.isSelected && <CheckCircle2 className="h-3 w-3" />}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-full ${s.color} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
                                                    {s.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-slate-900 truncate">{s.name}</p>
                                                    <p className="text-xs text-slate-400">{s.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                {category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-1.5">
                                                {[1, 2, 3].map((star) => (
                                                    <div
                                                        key={star}
                                                        className={`w-5 h-1.5 rounded-full ${s.bestPriceCount >= (star * 2) ? 'bg-emerald-500' : 'bg-slate-100'}`}
                                                        title={s.bestPriceCount > 0 ? `${s.bestPriceCount} articles au meilleur prix` : 'Pas d\'articles comparés'}
                                                    />
                                                ))}
                                                {s.bestPriceCount > 0 && (
                                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">Premium</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <p className="text-sm font-medium text-slate-900 tabular-nums">
                                                {s.totalCost.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                                            </p>
                                            <p className="text-xs text-slate-400">{s.articleCount} articles</p>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`inline-flex text-sm font-medium tabular-nums px-2.5 py-1 rounded-full ${s.remaining < 0
                                                ? 'text-rose-700 bg-rose-50'
                                                : s.remaining > 0 ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'
                                                }`}>
                                                {s.remaining.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link
                                                    href={`/expenses?tab=${s.id}`}
                                                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
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
                                                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
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
                                                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                                {isAdmin && showDeleted && (
                                                    <button
                                                        onClick={() => handleRestoreGlobalSupplier(s.id)}
                                                        className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                                                    >
                                                        <RotateCcw className="h-4 w-4" /> Restaurer
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

                {/* Mobile card list */}
                <div className="md:hidden space-y-3">
                    {filteredSuppliers.map(s => {
                        const category = categoryFor(s.id);
                        return (
                            <div key={s.id} className={`rounded-2xl border border-slate-200 bg-white p-4 ${!s.isSelected ? 'opacity-60' : ''}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-full ${s.color} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
                                        {s.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-slate-900 truncate">{s.name}</p>
                                            {s.isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-slate-900 shrink-0" />}
                                        </div>
                                        <p className="text-xs text-slate-400">{s.id}</p>
                                        <span className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                            {category}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-3">
                                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                                        <p className="text-xs text-slate-500">Dépenses TTC</p>
                                        <p className="text-sm font-medium text-slate-900 tabular-nums">
                                            {s.totalCost.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                                        </p>
                                        <p className="text-xs text-slate-400">{s.articleCount} articles</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                                        <p className="text-xs text-slate-500">Solde</p>
                                        <p className={`text-sm font-medium tabular-nums ${s.remaining < 0 ? 'text-rose-700' : s.remaining > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                                            {s.remaining.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        {[1, 2, 3].map((star) => (
                                            <div
                                                key={star}
                                                className={`w-5 h-1.5 rounded-full ${s.bestPriceCount >= (star * 2) ? 'bg-emerald-500' : 'bg-slate-100'}`}
                                                title={s.bestPriceCount > 0 ? `${s.bestPriceCount} articles au meilleur prix` : 'Pas d\'articles comparés'}
                                            />
                                        ))}
                                        {s.bestPriceCount > 0 && (
                                            <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">Premium</span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <Link
                                            href={`/expenses?tab=${s.id}`}
                                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
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
                                                className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
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
                                                className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                        {isAdmin && showDeleted && (
                                            <button
                                                onClick={() => handleRestoreGlobalSupplier(s.id)}
                                                className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                                            >
                                                <RotateCcw className="h-4 w-4" /> Restaurer
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Empty state */}
                {filteredSuppliers.length === 0 && (
                    <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-slate-200 bg-white py-16">
                        <User className="h-10 w-10 mb-3 text-slate-300" />
                        <p className="text-sm text-slate-500">Aucun fournisseur trouvé</p>
                    </div>
                )}
            </div>

            {/* Notes Editing Modal */}
            <Modal
                open={editingNotesId !== null}
                onClose={() => setEditingNotesId(null)}
                title="Notes partenaire"
                description="Édition des informations confidentielles"
                size="lg"
                footer={<>
                    <button
                        onClick={() => setEditingNotesId(null)}
                        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 active:scale-[0.99] transition-colors"
                    >
                        Fermer
                    </button>
                    <button
                        onClick={async () => {
                            if (!isAdmin) return;
                            const { error } = await supabase.from('suppliers').update({ notes: notesValue }).eq('id', editingNotesId);
                            if (!error) {
                                fetchData();
                                setEditingNotesId(null);
                            }
                        }}
                        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 active:scale-[0.99] transition-colors"
                    >
                        Mettre à jour
                    </button>
                </>}
            >
                <textarea
                    className="w-full px-3 py-2.5 min-h-[160px] rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition resize-none"
                    placeholder="Saisissez vos remarques sur ce fournisseur ici..."
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                />
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                open={showDeleteConfirmModal && supplierToDelete !== null}
                onClose={() => setShowDeleteConfirmModal(false)}
                size="md"
                persistent
                icon={<span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-red-50 text-red-600"><AlertCircle className="h-5 w-5" /></span>}
                title="Suppression globale"
                description={supplierToDelete
                    ? `Vous allez supprimer ${supplierToDelete.name} de la base de données. Cette action supprimera ses données dans tous les projets.`
                    : undefined}
                footer={<>
                    <button
                        onClick={() => setShowDeleteConfirmModal(false)}
                        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 active:scale-[0.99] transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleGlobalDeleteSupplier}
                        disabled={isDeleting || !deleteMatches}
                        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-colors"
                    >
                        {isDeleting ? 'Suppression...' : 'Supprimer partout'}
                    </button>
                </>}
            >
                {supplierToDelete && (
                    <div className="space-y-2">
                        <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                            Veuillez taper <span className="text-red-600 font-semibold">"{supplierToDelete.name}"</span> pour confirmer
                        </label>
                        <input
                            type="text"
                            value={deleteConfirmInput}
                            onChange={(e) => setDeleteConfirmInput(e.target.value)}
                            placeholder="Nom du fournisseur..."
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isDeleting && deleteConfirmInput.trim().toUpperCase() === supplierToDelete.name.trim().toUpperCase()) {
                                    handleGlobalDeleteSupplier();
                                }
                            }}
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
}
