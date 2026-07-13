'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { useProject } from '@/context/ProjectContext';
import {
    Plus, Search, Pencil, Save, Loader2, Package,
    LayoutGrid, List, ChevronDown, Trash2, SlidersHorizontal, Trophy, ShoppingCart,
    Check, X, ArrowUpDown, Table2
} from 'lucide-react';
import { Modal } from '@/components/ui';

// Cheapest visible supplier for an article row (ignores zero/blank prices).
function bestPriceFor(prices: Record<string, { price: number; isRef?: boolean }>, visibleColumns: string[]) {
    const entries = Object.entries(prices).filter(([s, v]) => visibleColumns.includes(s) && v.price > 0);
    if (entries.length === 0) return null;
    const [supplier, v] = entries.reduce((min, cur) => (cur[1].price < min[1].price ? cur : min));
    const others = entries.filter(([s]) => s !== supplier).map(([, x]) => x.price);
    const savings = others.length ? Math.min(...others) - v.price : 0;
    return { supplier, price: v.price, savings };
}

const MOSTAKBEL_PRICES: Record<string, number> = {
    "FER ROND DE 06/": 2.650,
    "FER ROND DE 08/": 13.000,
    "FER ROND DE 10/": 18.000,
    "FER ROND DE 12/": 25.000,
    "FER ROND DE 14/": 36.000,
    "FER ROND DE 16/": 48.000,
    "BRIQUE 12": 0.680,
    "BRIQUE 8": 0.650,
    "OM SABLE": 120.000,
    "OM GRAVIER": 140.000,
    "BERLIET - SABLE SUPER M3 (1m3)": 350.000,
    "BERLIET - GRAVIER 04/15 (1m3)": 370.000
};

const BEN_HDEYA_PRICES: Record<string, number> = {
    "FER 08": 13.000,
    "FER 16": 48.000,
    "OM SABLE": 90.000,
    "OM GRAVIER": 110.000
};

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

export default function ArticlesContent() {
    const { currentProject, userRole } = useProject();
    // Write permission = project role; viewers ("Observateur") are read-only.
    const isAdmin = userRole === 'admin' || userRole === 'editor';
    const [loading, setLoading] = useState(true);
    const [articles, setArticles] = useState<ArticleRow[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [suppliersList, setSuppliersList] = useState<{ id: string, name: string }[]>([]);
    const [viewMode, setViewMode] = useState<'best' | 'matrix' | 'inventory'>('best');
    const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
    const [columnOrder, setColumnOrder] = useState<string[]>([]);
    const [showColumnSettings, setShowColumnSettings] = useState(false);

    // Comparator filters (presentation-only, derived from matrixData)
    const [activeCategory, setActiveCategory] = useState('');
    const [supplierFilter, setSupplierFilter] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<'name' | 'savings' | 'price'>('name');
    const [comparableOnly, setComparableOnly] = useState(false);
    const [showSupplierFilter, setShowSupplierFilter] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

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

    // Close column settings when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (showColumnSettings && !target.closest('.column-settings-container')) {
                setShowColumnSettings(false);
            }
        };

        if (showColumnSettings) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showColumnSettings]);

    // Close supplier filter when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (showSupplierFilter && !target.closest('.supplier-filter-container')) {
                setShowSupplierFilter(false);
            }
        };

        if (showSupplierFilter) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showSupplierFilter]);

    const fetchArticles = async () => {
        if (!currentProject) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // Fetch suppliers
            const { data: suppliersData } = await supabase.from('suppliers').select('*').order('name');
            const suppliersMap: Record<string, { name: string, color: string }> = {};
            const sList: { id: string, name: string }[] = [];

            suppliersData?.forEach((s: any) => {
                suppliersMap[s.id] = { name: s.name, color: s.color || 'bg-slate-500' };
                sList.push({ id: s.id, name: s.name });
            });
            setSuppliersList(sList);

            const parseQuantity = (q: any): number => {
                if (typeof q === 'number') return q || 1;
                if (!q || typeof q !== 'string') return 1;
                const match = q.match(/(\d+(?:[.,]\d+)?)/);
                if (match) return parseFloat(match[1].replace(',', '.')) || 1;
                return 1;
            };

            const parseDate = (d: string) => {
                if (!d) return 0;
                const parts = d.split('/');
                if (parts.length === 3) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
                return 0;
            };

            // Fetch expenses
            const { data: expensesData } = await supabase.from('expenses').select('*, items:invoice_items(*)').eq('project_id', currentProject.id);
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
                    const qty = parseQuantity(e.quantity);
                    const uPrice = e.price / qty;
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
                        unitPrice: uPrice,
                        totalPrice: e.price,
                    });
                }
            });

            rows.sort((a, b) => parseDate(b.date) - parseDate(a.date));

            // Initial column setup if not yet set
            const initialSuppliers = Array.from(new Set(rows.map(r => r.supplierName)));
            if (!initialSuppliers.includes('STE Mostakbel')) initialSuppliers.push('STE Mostakbel');
            if (!initialSuppliers.includes('Ahmed Ben Hdya')) initialSuppliers.push('Ahmed Ben Hdya');
            initialSuppliers.sort();

            setVisibleColumns(initialSuppliers);
            setColumnOrder(initialSuppliers);

            // 3. Inject Virtual Mostakbel Order Prices as baseline articles
            Object.entries(MOSTAKBEL_PRICES).forEach(([designation, price], idx) => {
                const sup = suppliersMap['fer'] || { name: 'STE Mostakbel', color: 'bg-blue-600' };
                // Check if we already have a real Mostakbel entry for this specific Fer item to avoid duplicates in Inventory Global
                // But for comparison, we ALWAYS want the order price as reference.
                // We'll add it as a special sourceTable 'order_ref' to differentiate if needed.
                rows.push({
                    id: `ref-mostakbel-${idx}`,
                    sourceTable: 'expenses', // Use expenses to make it appear in global list if needed, or handle separately
                    date: 'Réf. 2024',
                    supplierId: 'fer',
                    supplierName: 'STE Mostakbel',
                    supplierColor: sup.color,
                    reference: 'PRIX COMMANDE',
                    designation: designation,
                    quantity: 1,
                    unitPrice: price,
                    totalPrice: price,
                });
            });

            // 4. Inject Virtual Ben Hdeya Order Prices
            Object.entries(BEN_HDEYA_PRICES).forEach(([designation, price], idx) => {
                const sup = suppliersMap['ahmed'] || { name: 'Ahmed Ben Hdya', color: 'bg-[#FF5722]' };
                rows.push({
                    id: `ref-benhdeya-${idx}`,
                    sourceTable: 'expenses',
                    date: 'Réf. 2024',
                    supplierId: 'ahmed',
                    supplierName: 'Ahmed Ben Hdya',
                    supplierColor: sup.color,
                    reference: 'PRIX COMMANDE',
                    designation: designation,
                    quantity: 1,
                    unitPrice: price,
                    totalPrice: price,
                });
            });

            setArticles(rows);
        } catch (error) {
            console.error('Error fetching articles:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchArticles();
    }, [supabase, currentProject]);

    const handleDelete = async (row: ArticleRow) => {
        if (!isAdmin) return;
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
        if (!isAdmin) return;
        const project = currentProject;
        if (!project) return;
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
                    project_id: project.id,
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

    const normalizeArticleName = (name: string) => {
        if (!name) return "";
        let n = name.toUpperCase().trim();
        // Remove trailing /
        n = n.replace(/\/$/, "").trim();

        // Handle Iron/Fer specifically
        if (n.startsWith("FER")) {
            const match = n.match(/FER\s*(?:ROND\s*DE|DE|Ø)?\s*(\d+)/);
            if (match) {
                const size = match[1].padStart(2, '0');
                return `FER Ø${size}`;
            }
        }

        // Handle Fil Attaché
        if (n.includes("FIL") && (n.includes("DATACHE") || n.includes("ATTACHÉ") || n.includes("RECUIT"))) {
            return "FIL ATTACHE";
        }

        // Handle Briques
        const briqueMatch = n.match(/BRIQUE.*?\b(\d+)\b/);
        if (briqueMatch) {
            const num = briqueMatch[1];
            if (num === "8" || num === "12") {
                return `BRIQUE ${num}`;
            }
        }

        // Specific OM normalization to avoid redundancy
        if (n.includes("SABLE") && n.includes("OM")) return "OM SABLE";
        if (n.includes("GRAVIER") && n.includes("OM")) return "OM GRAVIER";
        if (n.includes("SABLE") && n.includes("SUPER")) return "BERLIET - SABLE SUPER M3 (1m3)";
        if (n.includes("GRAVIER") && n.includes("04/15")) return "BERLIET - GRAVIER 04/15 (1m3)";

        // Remove multiple spaces
        return n.replace(/\s+/g, ' ');
    };

    // Matrix View Logic
    const matrixData = useMemo(() => {
        // 1. Consolidate Suppliers case-insensitively and filter out blanks
        const supplierNamesRaw = articles.map(a => a.supplierName);
        const standardizedNames = new Set<string>();
        const rawToLowerMap: Record<string, string> = {};

        supplierNamesRaw.forEach(name => {
            if (!name) return;
            let standard = name.trim();
            const lower = standard.toLowerCase();
            if (lower.includes('mostakbel')) {
                standard = 'STE Mostakbel';
            } else if (lower.includes('ben hdya') || lower.includes('ben hdeya')) {
                standard = 'Ahmed Ben Hdya';
            }
            standardizedNames.add(standard);
            rawToLowerMap[name.toLowerCase().trim()] = standard;
        });

        const allSuppliers = Array.from(standardizedNames).sort();

        const articleMap: Record<string, Record<string, { price: number, isRef?: boolean }>> = {};

        articles.forEach(a => {
            const name = normalizeArticleName(a.designation);
            if (!name) return; // Skip empty names

            const rawSupName = a.supplierName?.toLowerCase().trim() || "";
            const standardSupName = rawToLowerMap[rawSupName] || (rawSupName.includes('mostakbel') ? 'STE Mostakbel' : a.supplierName);
            const isRef = a.reference === 'PRIX COMMANDE';

            if (!articleMap[name]) articleMap[name] = {};

            // Prioritization:
            // 1. If it's a PRIX COMMANDE (virtual reference), it ALWAYS takes precedence and overwrites.
            // 2. If it's a real purchase, it only sets the price if no price (real or ref) has been set yet.
            //    Since rows are sorted by date desc, the first real purchase we encounter is the most recent one.
            if (isRef) {
                articleMap[name][standardSupName] = { price: a.unitPrice, isRef: true };
            } else if (!articleMap[name][standardSupName]) {
                articleMap[name][standardSupName] = { price: a.unitPrice, isRef: false };
            }
        });

        const rows = Object.keys(articleMap).map(name => ({
            name,
            prices: articleMap[name]
        }));

        // Filter suppliers to only those who have at least one price in the matrix
        const suppliersWithPrices = allSuppliers.filter(sup =>
            rows.some(row => row.prices[sup] !== undefined)
        );

        // 3. Custom Sorting: Fer products first, then others, sorted by Ø
        rows.sort((a, b) => {
            const isAFer = a.name.startsWith('FER Ø');
            const isBFer = b.name.startsWith('FER Ø');

            if (isAFer && !isBFer) return -1;
            if (!isAFer && isBFer) return 1;
            if (isAFer && isBFer) {
                const diameterA = parseInt(a.name.replace('FER Ø', ''));
                const diameterB = parseInt(b.name.replace('FER Ø', ''));
                return diameterA - diameterB;
            }
            return a.name.localeCompare(b.name);
        });

        return { suppliers: suppliersWithPrices, rows };
    }, [articles]);

    const filterChips = [
        { label: 'Tous', value: '' },
        { label: 'Briques', value: 'BRIQUE' },
        { label: 'Fer', value: 'FER' },
        { label: 'Gravier', value: 'GRAVIER' },
        { label: 'Sable', value: 'SABLE' }
    ];

    const activeMatrixCols = columnOrder.filter(s => visibleColumns.includes(s) && matrixData.suppliers.includes(s));
    const matrixRows = matrixData.rows.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (!activeCategory || r.name.toUpperCase().includes(activeCategory.toUpperCase()))
    );

    // Comparator rows: matrix rows enriched with best price, filtered + sorted (derived only — no change to matrixData/bestPriceFor semantics)
    const comparatorRows = useMemo(() => {
        const enriched = matrixData.rows.map(row => {
            const best = bestPriceFor(row.prices, visibleColumns);
            const priceCount = Object.entries(row.prices).filter(([s, v]) => visibleColumns.includes(s) && v.price > 0).length;
            return { ...row, best, priceCount };
        });

        const filtered = enriched.filter(r =>
            r.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
            (!activeCategory || r.name.toUpperCase().includes(activeCategory.toUpperCase())) &&
            (supplierFilter.length === 0 || supplierFilter.every(s => (r.prices[s]?.price ?? 0) > 0)) &&
            (!comparableOnly || r.priceCount >= 2)
        );

        if (sortBy === 'savings') {
            return [...filtered].sort((a, b) => (b.best?.savings ?? -Infinity) - (a.best?.savings ?? -Infinity));
        }
        if (sortBy === 'price') {
            return [...filtered].sort((a, b) => (a.best?.price ?? Infinity) - (b.best?.price ?? Infinity));
        }
        return filtered; // 'name' keeps matrixData order (Fer d'abord, puis A–Z)
    }, [matrixData, visibleColumns, searchTerm, activeCategory, supplierFilter, comparableOnly, sortBy]);

    const activeFilterCount = (searchTerm ? 1 : 0) + (activeCategory ? 1 : 0) + supplierFilter.length + (comparableOnly ? 1 : 0);

    const resetFilters = () => {
        setSearchTerm('');
        setActiveCategory('');
        setSupplierFilter([]);
        setComparableOnly(false);
        setSortBy('name');
    };

    const toggleRow = (name: string) => setExpandedRows(prev => ({ ...prev, [name]: !prev[name] }));

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 text-slate-900 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen font-jakarta">
            <div className="max-w-[110rem] mx-auto px-4 sm:px-6 py-5 pb-28 md:pb-12 space-y-5">

                {/* Page header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">Articles</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Catalogue des matériaux et comparatif des prix</p>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={openAdd}
                            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            Nouvel article
                        </button>
                    )}
                </div>

                {/* Controls: view switch + search + colonnes */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="inline-flex p-1 rounded-xl border border-slate-200 bg-white self-start">
                        <button
                            onClick={() => setViewMode('best')}
                            className={`inline-flex items-center justify-center gap-2 h-8 px-3 rounded-lg text-sm font-medium transition-colors ${viewMode === 'best' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            <Trophy className="w-4 h-4" />
                            Comparatif
                        </button>
                        <button
                            onClick={() => setViewMode('matrix')}
                            className={`inline-flex items-center justify-center gap-2 h-8 px-3 rounded-lg text-sm font-medium transition-colors ${viewMode === 'matrix' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            <Table2 className="w-4 h-4" />
                            Matrice
                        </button>
                        <button
                            onClick={() => setViewMode('inventory')}
                            className={`inline-flex items-center justify-center gap-2 h-8 px-3 rounded-lg text-sm font-medium transition-colors ${viewMode === 'inventory' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            <List className="w-4 h-4" />
                            Inventaire
                        </button>
                    </div>

                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Rechercher un article..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-10 pl-9 pr-9 rounded-xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-6 h-6 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {viewMode !== 'inventory' && (
                        <div className="relative column-settings-container self-start">
                            <button
                                onClick={() => setShowColumnSettings(!showColumnSettings)}
                                className={`inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl border text-sm font-medium transition-colors ${showColumnSettings ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                Colonnes
                                {visibleColumns.length < matrixData.suppliers.length && (
                                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold tabular-nums">
                                        {matrixData.suppliers.filter(s => visibleColumns.includes(s)).length}
                                    </span>
                                )}
                            </button>

                            {showColumnSettings && (
                                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-lg border border-slate-200 p-3 z-[120] animate-in fade-in zoom-in-95 duration-150">
                                    <p className="text-xs font-medium text-slate-500 px-1 pb-2">Fournisseurs comparés</p>
                                    <div className="space-y-0.5 max-h-[360px] overflow-y-auto">
                                        {matrixData.suppliers.map((s) => {
                                            const checked = visibleColumns.includes(s);
                                            return (
                                                <label key={s} className="flex items-center gap-3 px-2 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                                    <span className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-slate-900 border-slate-900' : 'border-slate-300'}`}>
                                                        {checked && <span className="w-1.5 h-1.5 bg-white rounded-sm" />}
                                                    </span>
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => {
                                                            setVisibleColumns(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
                                                        }}
                                                        className="hidden"
                                                    />
                                                    <span className={`text-sm ${checked ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>{s}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Content Area */}
                {viewMode !== 'inventory' ? (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {/* Filters toolbar */}
                        <div className="space-y-2">
                            {/* Category chips — horizontal scroll on mobile */}
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
                                {filterChips.map((chip) => {
                                    const isActive = activeCategory === chip.value;
                                    return (
                                        <button
                                            key={chip.label}
                                            onClick={() => setActiveCategory(chip.value)}
                                            className={`shrink-0 inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${isActive ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:text-slate-900'}`}
                                        >
                                            {chip.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Fournisseur filter + sort + comparables + reset */}
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="relative supplier-filter-container">
                                    <button
                                        onClick={() => setShowSupplierFilter(!showSupplierFilter)}
                                        className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-medium transition-colors ${supplierFilter.length > 0 || showSupplierFilter ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                    >
                                        Fournisseurs
                                        {supplierFilter.length > 0 && (
                                            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white/20 text-white text-[10px] font-semibold tabular-nums">
                                                {supplierFilter.length}
                                            </span>
                                        )}
                                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showSupplierFilter ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showSupplierFilter && (
                                        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-lg border border-slate-200 p-3 z-[120] animate-in fade-in zoom-in-95 duration-150">
                                            <p className="text-xs font-medium text-slate-500 px-1 pb-2">Articles où participent :</p>
                                            <div className="space-y-0.5 max-h-[300px] overflow-y-auto">
                                                {matrixData.suppliers.map((s) => {
                                                    const checked = supplierFilter.includes(s);
                                                    return (
                                                        <label key={s} className="flex items-center gap-3 px-2 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                                            <span className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-slate-900 border-slate-900' : 'border-slate-300'}`}>
                                                                {checked && <Check className="w-3 h-3 text-white" />}
                                                            </span>
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => {
                                                                    setSupplierFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
                                                                }}
                                                                className="hidden"
                                                            />
                                                            <span className={`text-sm ${checked ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>{s}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                            {supplierFilter.length > 0 && (
                                                <button
                                                    onClick={() => setSupplierFilter([])}
                                                    className="w-full mt-2 inline-flex items-center justify-center gap-1 h-8 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                                >
                                                    <X className="h-3.5 w-3.5" /> Effacer la sélection
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="relative">
                                    <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as 'name' | 'savings' | 'price')}
                                        className="h-9 pl-8 pr-8 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                                    >
                                        <option value="name">Nom (A–Z)</option>
                                        <option value="savings">Plus grosse économie</option>
                                        <option value="price">Prix croissant</option>
                                    </select>
                                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                                </div>

                                <button
                                    onClick={() => setComparableOnly(!comparableOnly)}
                                    className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-medium transition-colors ${comparableOnly ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                >
                                    <Check className="h-3.5 w-3.5" />
                                    Comparables uniquement
                                </button>

                                {activeFilterCount > 0 && (
                                    <button
                                        onClick={resetFilters}
                                        className="inline-flex items-center gap-1 h-9 px-3 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                        {activeFilterCount} filtre{activeFilterCount > 1 ? 's' : ''} · Réinitialiser
                                    </button>
                                )}

                                <span className="ml-auto text-xs text-slate-400 tabular-nums">
                                    {viewMode === 'best' ? comparatorRows.length : matrixRows.length} article{(viewMode === 'best' ? comparatorRows.length : matrixRows.length) > 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>

                        {/* Comparatif — best-price-first list (default view) */}
                        {viewMode === 'best' && (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 items-start">
                                {comparatorRows.map((row) => {
                                    const best = row.best;
                                    const isExpanded = !!expandedRows[row.name];
                                    const nextBest = best && best.savings > 0 ? best.price + best.savings : null;
                                    const pct = best && nextBest ? (best.savings / nextBest) * 100 : 0;
                                    const supplierEntries = activeMatrixCols
                                        .filter(s => (row.prices[s]?.price ?? 0) > 0)
                                        .map(s => ({ sup: s, entry: row.prices[s]! }))
                                        .sort((a, b) => a.entry.price - b.entry.price);
                                    const maxPrice = supplierEntries.length ? Math.max(...supplierEntries.map(e => e.entry.price)) : 0;

                                    return (
                                        <div key={row.name} className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col">
                                            <div
                                                onClick={() => toggleRow(row.name)}
                                                className="p-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-sm font-semibold text-slate-900 leading-snug min-w-0 flex-1" title={row.name}>{row.name}</p>
                                                    <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 mt-0.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                </div>

                                                {best ? (
                                                    <>
                                                        <div className="flex items-center justify-between gap-2 mt-2.5">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 min-w-0">
                                                                <Trophy className="h-3 w-3 shrink-0" />
                                                                <span className="truncate">{best.supplier}</span>
                                                            </span>
                                                            <p className="text-base font-semibold text-emerald-600 tabular-nums leading-none shrink-0">
                                                                {best.price.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-[10px] font-normal text-slate-400">DT</span>
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1.5 text-xs">
                                                            {row.prices[best.supplier]?.isRef && (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700">CMD</span>
                                                            )}
                                                            {best.savings > 0 ? (
                                                                <span className="font-medium text-emerald-600 tabular-nums truncate">
                                                                    −{best.savings.toLocaleString(undefined, { minimumFractionDigits: 3 })} DT · −{pct.toFixed(pct < 10 ? 1 : 0)}%
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-300">—</span>
                                                            )}
                                                            <span className="ml-auto text-slate-400 tabular-nums shrink-0">
                                                                {row.priceCount > 1 ? `${row.priceCount} prix` : 'Seul prix'}
                                                            </span>
                                                        </div>
                                                        <Link
                                                            href={`/orders?article=${encodeURIComponent(row.name)}&price=${best.price}&supplier=${encodeURIComponent(best.supplier)}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors"
                                                        >
                                                            <ShoppingCart className="h-3.5 w-3.5" /> Commander
                                                        </Link>
                                                    </>
                                                ) : (
                                                    <p className="text-xs text-slate-400 mt-2">Aucun prix parmi les fournisseurs visibles</p>
                                                )}
                                            </div>

                                            {isExpanded && (
                                                <div className="border-t border-slate-100 bg-slate-50/60 px-3.5 py-3 space-y-2 animate-in fade-in duration-150">
                                                    {supplierEntries.length === 0 && (
                                                        <p className="text-xs text-slate-400">Aucun prix parmi les fournisseurs visibles.</p>
                                                    )}
                                                    {supplierEntries.map(({ sup, entry }) => {
                                                        const isBest = !!best && sup === best.supplier;
                                                        const width = maxPrice > 0 ? (entry.price / maxPrice) * 100 : 0;
                                                        const delta = best ? entry.price - best.price : 0;
                                                        return (
                                                            <div key={sup}>
                                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                                    <span className={`text-xs truncate min-w-0 ${isBest ? 'font-semibold text-emerald-700' : 'text-slate-600'}`}>
                                                                        {sup}
                                                                        {entry.isRef && <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700">CMD</span>}
                                                                    </span>
                                                                    <span className="flex items-baseline gap-1.5 shrink-0">
                                                                        <span className={`text-xs font-semibold tabular-nums ${isBest ? 'text-emerald-600' : 'text-slate-700'}`}>
                                                                            {entry.price.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-[10px] font-normal text-slate-400">DT</span>
                                                                        </span>
                                                                        {!isBest && delta > 0 && (
                                                                            <span className="text-[10px] font-medium text-rose-600 tabular-nums">+{delta.toLocaleString(undefined, { minimumFractionDigits: 3 })}</span>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                                <div className="h-1.5 rounded-full bg-slate-200/70 overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full ${isBest ? 'bg-emerald-500' : 'bg-slate-400/60'}`}
                                                                        style={{ width: `${Math.max(width, 4)}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {comparatorRows.length === 0 && (
                                    <div className="col-span-full flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-slate-200 bg-white py-16">
                                        <Trophy className="h-10 w-10 text-slate-300 mb-3" />
                                        <p className="text-sm text-slate-500">Aucun article ne correspond aux filtres.</p>
                                        {activeFilterCount > 0 && (
                                            <button
                                                onClick={resetFilters}
                                                className="mt-3 inline-flex items-center gap-1 h-9 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
                                            >
                                                <X className="h-3.5 w-3.5" /> Réinitialiser les filtres
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {viewMode === 'matrix' && (
                        <>
                        {/* Matrix — desktop table */}
                        <div className="hidden md:block rounded-2xl border border-slate-200 overflow-hidden bg-white">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500 min-w-[200px]">Article</th>
                                            <th className="px-4 py-3 text-xs font-medium text-slate-500 min-w-[220px]">Meilleur prix</th>
                                            {activeMatrixCols.map((s) => (
                                                <th
                                                    key={s}
                                                    draggable
                                                    onDragStart={(e) => e.dataTransfer.setData('text/plain', s)}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        const draggedSup = e.dataTransfer.getData('text/plain');
                                                        if (draggedSup === s) return;
                                                        const newOrder = [...columnOrder];
                                                        const draggedIdx = newOrder.indexOf(draggedSup);
                                                        const targetIdx = newOrder.indexOf(s);
                                                        newOrder.splice(draggedIdx, 1);
                                                        newOrder.splice(targetIdx, 0, draggedSup);
                                                        setColumnOrder(newOrder);
                                                    }}
                                                    className="px-4 py-3 text-xs font-medium text-slate-500 text-center min-w-[130px] cursor-move hover:bg-slate-100 transition-colors"
                                                >
                                                    {s}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {matrixRows.map((row) => {
                                            const visiblePrices = Object.entries(row.prices)
                                                .filter(([s]) => visibleColumns.includes(s))
                                                .map(([, v]) => v.price);
                                            const best = bestPriceFor(row.prices, visibleColumns);
                                            return (
                                                <tr key={row.name} className="border-t border-slate-100 hover:bg-slate-50">
                                                    <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-medium text-slate-900">{row.name}</td>
                                                    <td className="px-4 py-3">
                                                        {best ? (
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                                                        <span className="text-sm font-semibold text-slate-900 tabular-nums">{best.price.toLocaleString(undefined, { minimumFractionDigits: 3 })}</span>
                                                                        <span className="text-[10px] text-slate-400">DT</span>
                                                                    </div>
                                                                    <p className="text-xs text-slate-500 truncate mt-0.5">
                                                                        {best.supplier}
                                                                        {best.savings > 0 && <span className="text-emerald-600 font-medium"> · −{best.savings.toLocaleString(undefined, { minimumFractionDigits: 3 })}</span>}
                                                                    </p>
                                                                </div>
                                                                <Link
                                                                    href={`/orders?article=${encodeURIComponent(row.name)}&price=${best.price}&supplier=${encodeURIComponent(best.supplier)}`}
                                                                    className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors shrink-0"
                                                                >
                                                                    <ShoppingCart className="h-3.5 w-3.5" /> Commander
                                                                </Link>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300">—</span>
                                                        )}
                                                    </td>
                                                    {activeMatrixCols.map(sup => {
                                                        const entry = row.prices[sup];
                                                        const price = entry?.price;
                                                        const isBest = price && price === Math.min(...visiblePrices);

                                                        return (
                                                            <td key={sup} className="px-4 py-3 text-center">
                                                                {price ? (
                                                                    <div className="inline-flex flex-col items-center gap-1">
                                                                        <span className={`text-sm font-semibold tabular-nums ${isBest ? 'text-emerald-600' : 'text-slate-700'}`}>
                                                                            {price.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-[10px] font-normal text-slate-400">DT</span>
                                                                        </span>
                                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${isBest ? 'bg-emerald-50 text-emerald-700' : entry?.isRef ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                                                            {entry?.isRef ? 'CMD' : isBest ? 'Meilleur' : 'Actuel'}
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-300">—</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Matrix — mobile stacked cards */}
                        <div className="md:hidden space-y-3">
                            {matrixRows.map((row) => {
                                const visiblePrices = Object.entries(row.prices)
                                    .filter(([s]) => visibleColumns.includes(s))
                                    .map(([, v]) => v.price);
                                const best = bestPriceFor(row.prices, visibleColumns);
                                return (
                                    <div key={row.name} className="rounded-2xl border border-slate-200 bg-white p-4">
                                        <p className="text-sm font-semibold text-slate-900 mb-3">{row.name}</p>
                                        {best && (
                                            <div className="flex items-center justify-between gap-3 mb-3 rounded-xl bg-amber-50 px-3 py-2">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                                        <span className="text-sm font-semibold text-slate-900 tabular-nums">{best.price.toLocaleString(undefined, { minimumFractionDigits: 3 })}</span>
                                                        <span className="text-[10px] text-slate-400">DT</span>
                                                    </div>
                                                    <p className="text-xs text-amber-800/80 truncate mt-0.5">{best.supplier}</p>
                                                </div>
                                                <Link
                                                    href={`/orders?article=${encodeURIComponent(row.name)}&price=${best.price}&supplier=${encodeURIComponent(best.supplier)}`}
                                                    className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-slate-900 text-white text-xs font-medium shrink-0"
                                                >
                                                    <ShoppingCart className="h-3.5 w-3.5" /> Commander
                                                </Link>
                                            </div>
                                        )}
                                        <div className="space-y-1.5">
                                            {activeMatrixCols.map(sup => {
                                                const entry = row.prices[sup];
                                                const price = entry?.price;
                                                if (!price) return null;
                                                const isBest = price === Math.min(...visiblePrices);
                                                return (
                                                    <div key={sup} className="flex items-center justify-between gap-3">
                                                        <span className="text-xs text-slate-500 truncate">{sup}</span>
                                                        <span className="flex items-center gap-2 shrink-0">
                                                            <span className={`text-sm font-semibold tabular-nums ${isBest ? 'text-emerald-600' : 'text-slate-700'}`}>
                                                                {price.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-[10px] font-normal text-slate-400">DT</span>
                                                            </span>
                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${isBest ? 'bg-emerald-50 text-emerald-700' : entry?.isRef ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                                                {entry?.isRef ? 'CMD' : isBest ? 'Meilleur' : 'Actuel'}
                                                            </span>
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {matrixRows.length === 0 && (
                            <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-slate-200 bg-white py-16">
                                <LayoutGrid className="h-10 w-10 text-slate-300 mb-3" />
                                <p className="text-sm text-slate-500">Aucun article à comparer.</p>
                            </div>
                        )}
                        </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3 animate-in fade-in duration-300">
                        {supplierGroups.map((group) => {
                            const isExpanded = expandedSuppliers[group.name];
                            return (
                                <div key={group.name} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                                    <button
                                        onClick={() => toggleSupplier(group.name)}
                                        className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className={`w-10 h-10 shrink-0 rounded-full ${group.color} flex items-center justify-center text-white text-sm font-semibold`}>
                                                {group.name.charAt(0).toUpperCase()}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 truncate">{group.name}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{group.rows.length} articles</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="text-right">
                                                <p className="text-xs text-slate-500">Total TTC</p>
                                                <p className="text-sm font-semibold text-slate-900 tabular-nums">
                                                    {group.total.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-xs text-slate-400">DT</span>
                                                </p>
                                            </div>
                                            <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="border-t border-slate-100">
                                            {/* Desktop table */}
                                            <div className="hidden md:block overflow-x-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-slate-50">
                                                            <th className="px-4 py-3 text-xs font-medium text-slate-500 w-28">Date</th>
                                                            <th className="px-4 py-3 text-xs font-medium text-slate-500">Désignation</th>
                                                            <th className="px-4 py-3 text-xs font-medium text-slate-500 w-20 text-center">Qté</th>
                                                            <th className="px-4 py-3 text-xs font-medium text-slate-500 w-32 text-right">Unit. TTC</th>
                                                            <th className="px-4 py-3 text-xs font-medium text-slate-500 w-32 text-right">Total TTC</th>
                                                            {isAdmin && <th className="px-4 py-3 w-24"></th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.rows.map((row) => (
                                                            <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50 group">
                                                                <td className="px-4 py-3 text-sm text-slate-500 tabular-nums">{row.date}</td>
                                                                <td className="px-4 py-3">
                                                                    <p className="text-sm font-medium text-slate-900">{normalizeArticleName(row.designation)}</p>
                                                                    {row.reference && row.reference !== '-' && (
                                                                        <p className="text-xs text-slate-400 truncate max-w-[220px] mt-0.5">{row.reference}</p>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 tabular-nums">{row.quantity}</span>
                                                                </td>
                                                                <td className="px-4 py-3 text-right text-sm text-slate-500 tabular-nums">{row.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 3 })}</td>
                                                                <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 tabular-nums">{row.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 3 })}</td>
                                                                {isAdmin && (
                                                                    <td className="px-4 py-3">
                                                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button onClick={(e) => { e.stopPropagation(); openEdit(row); }} className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"><Pencil className="h-4 w-4" /></button>
                                                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(row); }} className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                                                                        </div>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Mobile stacked cards */}
                                            <div className="md:hidden divide-y divide-slate-100">
                                                {group.rows.map((row) => (
                                                    <div key={row.id} className="p-4">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-medium text-slate-900">{normalizeArticleName(row.designation)}</p>
                                                                <p className="text-xs text-slate-400 mt-0.5 tabular-nums">{row.date}</p>
                                                            </div>
                                                            {isAdmin && (
                                                                <div className="flex gap-1 shrink-0">
                                                                    <button onClick={(e) => { e.stopPropagation(); openEdit(row); }} className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"><Pencil className="h-4 w-4" /></button>
                                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(row); }} className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2 mt-3">
                                                            <div>
                                                                <p className="text-xs text-slate-400">Qté</p>
                                                                <p className="text-sm text-slate-700 tabular-nums">{row.quantity}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-slate-400">Unit. TTC</p>
                                                                <p className="text-sm text-slate-700 tabular-nums">{row.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 3 })}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-slate-400">Total TTC</p>
                                                                <p className="text-sm font-semibold text-slate-900 tabular-nums">{row.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 3 })}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {articles.length === 0 && (
                            <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-slate-200 bg-white py-16">
                                <Package className="h-10 w-10 text-slate-300 mb-3" />
                                <p className="text-sm font-medium text-slate-900">Aucun article enregistré</p>
                                <p className="text-sm text-slate-500 mt-1">Commencez par ajouter votre premier achat.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Add / Edit modal */}
            <Modal
                open={isAdding}
                onClose={() => { setIsAdding(false); setEditingItem(null); }}
                title={editingItem ? 'Modifier l\'article' : 'Nouvel article'}
                description="Détails de l'achat"
                size="lg"
                footer={
                    <>
                        <button
                            onClick={() => { setIsAdding(false); setEditingItem(null); }}
                            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleSave}
                            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 active:scale-[0.99] transition-colors"
                        >
                            <Save className="h-4 w-4" />
                            {editingItem ? 'Mettre à jour' : 'Enregistrer'}
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    {!editingItem && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Fournisseur</label>
                                <div className="relative">
                                    <select
                                        className="w-full h-10 px-3 pr-9 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 appearance-none transition"
                                        value={formData.supplierId}
                                        onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                                    >
                                        <option value="">Sélectionner...</option>
                                        {suppliersList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Date</label>
                                <input
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    placeholder="JJ/MM/AAAA"
                                />
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Désignation article</label>
                        <input
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                            value={formData.designation}
                            onChange={e => setFormData({ ...formData, designation: e.target.value })}
                            placeholder="Ex: Ciment 50kg..."
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Quantité</label>
                            <input
                                type="number"
                                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition tabular-nums"
                                value={formData.quantity}
                                onChange={e => {
                                    const qty = Number(e.target.value);
                                    setFormData({ ...formData, quantity: qty, totalPrice: qty * formData.unitPrice })
                                }}
                            />
                        </div>
                        <div>
                            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">P.U.</label>
                            <input
                                type="number"
                                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition tabular-nums"
                                value={formData.unitPrice}
                                onChange={e => {
                                    const price = Number(e.target.value);
                                    setFormData({ ...formData, unitPrice: price, totalPrice: formData.quantity * price })
                                }}
                            />
                        </div>
                        <div>
                            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Total</label>
                            <input
                                type="number"
                                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition tabular-nums"
                                value={formData.totalPrice}
                                onChange={e => setFormData({ ...formData, totalPrice: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
