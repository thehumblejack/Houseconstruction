'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { useProject } from '@/context/ProjectContext';
import {
    Plus, Search, Pencil, Save, Loader2, Package,
    ChevronDown, Trash2, Trophy, ShoppingCart, X
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

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 3 });

export default function ArticlesContent() {
    const { currentProject, userRole } = useProject();
    // Write permission = project role; viewers ("Observateur") are read-only.
    const isAdmin = userRole === 'admin' || userRole === 'editor';
    const [loading, setLoading] = useState(true);
    const [articles, setArticles] = useState<ArticleRow[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [suppliersList, setSuppliersList] = useState<{ id: string, name: string }[]>([]);

    // Two tabs only: price book (default) + purchase history
    const [activeTab, setActiveTab] = useState<'prix' | 'historique'>('prix');
    const [activeCategory, setActiveCategory] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'savings' | 'price'>('name');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

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

    // Price book rows: every supplier that has a price is compared (no column filtering).
    const priceRows = useMemo(() => {
        const allSuppliers = matrixData.suppliers;
        const enriched = matrixData.rows.map(row => {
            const best = bestPriceFor(row.prices, allSuppliers);
            const priceCount = Object.entries(row.prices).filter(([s, v]) => allSuppliers.includes(s) && v.price > 0).length;
            return { ...row, best, priceCount };
        });

        const filtered = enriched.filter(r =>
            r.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
            (!activeCategory || r.name.toUpperCase().includes(activeCategory.toUpperCase()))
        );

        if (sortBy === 'savings') {
            return [...filtered].sort((a, b) => (b.best?.savings ?? -Infinity) - (a.best?.savings ?? -Infinity));
        }
        if (sortBy === 'price') {
            return [...filtered].sort((a, b) => (a.best?.price ?? Infinity) - (b.best?.price ?? Infinity));
        }
        return filtered; // 'name' keeps matrixData order (Fer d'abord, puis A–Z)
    }, [matrixData, searchTerm, activeCategory, sortBy]);

    const resetFilters = () => {
        setSearchTerm('');
        setActiveCategory('');
        setSortBy('name');
    };

    const toggleRow = (name: string) => setExpandedRow(prev => (prev === name ? null : name));

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
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">Articles</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Carnet de prix des matériaux</p>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={openAdd}
                            className="shrink-0 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            <span className="hidden sm:inline">Ajouter</span>
                        </button>
                    )}
                </div>

                {/* Toolbar — one row: tabs + search + sort */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex p-1 rounded-xl border border-slate-200 bg-white shrink-0">
                        <button
                            onClick={() => setActiveTab('prix')}
                            className={`inline-flex items-center justify-center h-8 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === 'prix' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Prix
                        </button>
                        <button
                            onClick={() => setActiveTab('historique')}
                            className={`inline-flex items-center justify-center h-8 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === 'historique' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Historique
                        </button>
                    </div>

                    <div className="relative flex-1 min-w-[180px]">
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
                                aria-label="Effacer la recherche"
                                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-6 h-6 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {activeTab === 'prix' && (
                        <div className="relative shrink-0">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as 'name' | 'savings' | 'price')}
                                aria-label="Trier"
                                className="h-10 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                            >
                                <option value="name">Nom A–Z</option>
                                <option value="savings">Économie</option>
                                <option value="price">Prix</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                    )}
                </div>

                {/* Category chips */}
                {activeTab === 'prix' && (
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                        {filterChips.map((chip) => {
                            const isActive = activeCategory === chip.value;
                            return (
                                <button
                                    key={chip.label}
                                    onClick={() => setActiveCategory(chip.value)}
                                    className={`shrink-0 inline-flex items-center h-10 sm:h-9 px-4 rounded-full text-xs font-medium transition-colors ${isActive ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:text-slate-900'}`}
                                >
                                    {chip.label}
                                </button>
                            );
                        })}
                        <span className="ml-auto shrink-0 text-xs text-slate-400 tabular-nums whitespace-nowrap pl-2">
                            {priceRows.length} article{priceRows.length > 1 ? 's' : ''}
                        </span>
                    </div>
                )}

                {/* Tab «Prix» — one calm price-book list */}
                {activeTab === 'prix' && (
                    priceRows.length > 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
                            {priceRows.map((row) => {
                                const best = row.best;
                                const isExpanded = expandedRow === row.name;
                                const nextBest = best && best.savings > 0 ? best.price + best.savings : null;
                                const pct = best && nextBest ? (best.savings / nextBest) * 100 : 0;
                                const supplierEntries = matrixData.suppliers
                                    .filter(s => (row.prices[s]?.price ?? 0) > 0)
                                    .map(s => ({ sup: s, entry: row.prices[s]! }))
                                    .sort((a, b) => a.entry.price - b.entry.price);
                                const maxPrice = supplierEntries.length ? Math.max(...supplierEntries.map(e => e.entry.price)) : 0;

                                return (
                                    <div key={row.name}>
                                        <button
                                            onClick={() => toggleRow(row.name)}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                                        >
                                            {/* Desktop row */}
                                            <div className="hidden md:flex items-center gap-3 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate" title={row.name}>{row.name}</p>
                                                <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 tabular-nums">
                                                    {row.priceCount} prix
                                                </span>
                                                <span className="flex-1" />
                                                {best && best.savings > 0 && (
                                                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 tabular-nums">
                                                        −{fmt(best.savings)} DT · −{pct.toFixed(pct < 10 ? 1 : 0)}%
                                                    </span>
                                                )}
                                                {best ? (
                                                    <>
                                                        <span className="shrink-0 text-sm text-slate-500 truncate max-w-[160px]">{best.supplier}</span>
                                                        <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-600">
                                                            {fmt(best.price)} <span className="text-xs font-normal text-slate-400">DT</span>
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="shrink-0 text-sm text-slate-300">—</span>
                                                )}
                                                <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                            </div>

                                            {/* Mobile row — two lines */}
                                            <div className="md:hidden min-w-0">
                                                <div className="flex items-center justify-between gap-3 min-w-0">
                                                    <p className="text-sm font-medium text-slate-900 truncate min-w-0" title={row.name}>{row.name}</p>
                                                    {best ? (
                                                        <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-600">
                                                            {fmt(best.price)} <span className="text-xs font-normal text-slate-400">DT</span>
                                                        </span>
                                                    ) : (
                                                        <span className="shrink-0 text-sm text-slate-300">—</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 min-w-0">
                                                    <span className="text-xs text-slate-500 truncate min-w-0">
                                                        {best ? `${best.supplier} · ` : ''}{row.priceCount} prix
                                                    </span>
                                                    {best && best.savings > 0 && (
                                                        <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 tabular-nums">
                                                            −{fmt(best.savings)} DT · −{pct.toFixed(pct < 10 ? 1 : 0)}%
                                                        </span>
                                                    )}
                                                    <ChevronDown className={`h-3.5 w-3.5 text-slate-400 shrink-0 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                </div>
                                            </div>
                                        </button>

                                        {/* Expanded panel — one sub-row per supplier, cheapest first */}
                                        {isExpanded && (
                                            <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 space-y-2.5 animate-in fade-in duration-150">
                                                {supplierEntries.length === 0 && (
                                                    <p className="text-xs text-slate-400">Aucun prix enregistré pour cet article.</p>
                                                )}
                                                {supplierEntries.map(({ sup, entry }) => {
                                                    const isBest = !!best && sup === best.supplier;
                                                    const width = maxPrice > 0 ? (entry.price / maxPrice) * 100 : 0;
                                                    const delta = best ? entry.price - best.price : 0;
                                                    return (
                                                        <div key={sup}>
                                                            <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
                                                                <span className={`inline-flex items-center gap-1.5 text-xs truncate min-w-0 ${isBest ? 'font-semibold text-emerald-700' : 'text-slate-600'}`}>
                                                                    {isBest && <Trophy className="h-3 w-3 shrink-0" />}
                                                                    <span className="truncate">{sup}</span>
                                                                    {entry.isRef && (
                                                                        <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700">CMD</span>
                                                                    )}
                                                                </span>
                                                                <span className="flex items-baseline gap-1.5 shrink-0">
                                                                    <span className={`text-xs font-semibold tabular-nums ${isBest ? 'text-emerald-600' : 'text-slate-700'}`}>
                                                                        {fmt(entry.price)} <span className="text-[10px] font-normal text-slate-400">DT</span>
                                                                    </span>
                                                                    {!isBest && delta > 0 && (
                                                                        <span className="text-[10px] font-medium text-slate-400 tabular-nums">+{fmt(delta)}</span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div className="h-1.5 rounded-full bg-slate-200/60 overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${isBest ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                                                    style={{ width: `${Math.max(width, 4)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {best && (
                                                    <div className="flex justify-end pt-1">
                                                        <Link
                                                            href={`/orders?article=${encodeURIComponent(row.name)}&price=${best.price}&supplier=${encodeURIComponent(best.supplier)}`}
                                                            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 active:scale-[0.99] transition-colors"
                                                        >
                                                            <ShoppingCart className="h-3.5 w-3.5" /> Commander au meilleur prix
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 px-4">
                            <Package className="h-10 w-10 text-slate-300 mb-3" />
                            {articles.length === 0 ? (
                                <>
                                    <p className="text-sm font-medium text-slate-900">Aucun article enregistré</p>
                                    <p className="text-sm text-slate-500 mt-1">Commencez par ajouter votre premier achat.</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm text-slate-500">Aucun article ne correspond à la recherche.</p>
                                    <button
                                        onClick={resetFilters}
                                        className="mt-3 inline-flex items-center gap-1 h-9 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
                                    >
                                        <X className="h-3.5 w-3.5" /> Réinitialiser les filtres
                                    </button>
                                </>
                            )}
                        </div>
                    )
                )}

                {/* Tab «Historique» — per-supplier accordion in the same list language */}
                {activeTab === 'historique' && (
                    <div className="space-y-5">
                        {supplierGroups.length > 0 && (
                            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
                                {supplierGroups.map((group) => {
                                    const isExpanded = expandedSuppliers[group.name];
                                    return (
                                        <div key={group.name}>
                                            <button
                                                onClick={() => toggleSupplier(group.name)}
                                                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className={`w-9 h-9 shrink-0 rounded-full ${group.color} flex items-center justify-center text-white text-sm font-semibold`}>
                                                        {group.name.charAt(0).toUpperCase()}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-slate-900 truncate">{group.name}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5 tabular-nums">{group.rows.length} article{group.rows.length > 1 ? 's' : ''}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="text-sm font-semibold text-slate-900 tabular-nums">
                                                        {fmt(group.total)} <span className="text-xs font-normal text-slate-400">DT</span>
                                                    </span>
                                                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                </div>
                                            </button>

                                            {isExpanded && (
                                                <div className="border-t border-slate-100 bg-slate-50/40">
                                                    {/* Desktop table */}
                                                    <div className="hidden md:block overflow-x-auto">
                                                        <table className="w-full text-left border-collapse">
                                                            <thead>
                                                                <tr>
                                                                    <th className="px-4 py-2.5 text-xs font-medium text-slate-500 w-28">Date</th>
                                                                    <th className="px-4 py-2.5 text-xs font-medium text-slate-500">Désignation</th>
                                                                    <th className="px-4 py-2.5 text-xs font-medium text-slate-500 w-20 text-center">Qté</th>
                                                                    <th className="px-4 py-2.5 text-xs font-medium text-slate-500 w-32 text-right">Unit. TTC</th>
                                                                    <th className="px-4 py-2.5 text-xs font-medium text-slate-500 w-32 text-right">Total TTC</th>
                                                                    {isAdmin && <th className="px-4 py-2.5 w-24"></th>}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {group.rows.map((row) => (
                                                                    <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50 group">
                                                                        <td className="px-4 py-3 text-sm text-slate-500 tabular-nums whitespace-nowrap">{row.date}</td>
                                                                        <td className="px-4 py-3">
                                                                            <p className="text-sm font-medium text-slate-900">{normalizeArticleName(row.designation)}</p>
                                                                            {row.reference && row.reference !== '-' && (
                                                                                <p className="text-xs text-slate-400 truncate max-w-[220px] mt-0.5">{row.reference}</p>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-center">
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 tabular-nums">{row.quantity}</span>
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right text-sm text-slate-500 tabular-nums">{fmt(row.unitPrice)}</td>
                                                                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 tabular-nums">{fmt(row.totalPrice)}</td>
                                                                        {isAdmin && (
                                                                            <td className="px-4 py-3">
                                                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                    <button onClick={(e) => { e.stopPropagation(); openEdit(row); }} aria-label="Modifier" className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"><Pencil className="h-4 w-4" /></button>
                                                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(row); }} aria-label="Supprimer" className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                                                                                </div>
                                                                            </td>
                                                                        )}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    {/* Mobile stacked rows */}
                                                    <div className="md:hidden divide-y divide-slate-100">
                                                        {group.rows.map((row) => (
                                                            <div key={row.id} className="px-4 py-3">
                                                                <div className="flex items-start justify-between gap-3 min-w-0">
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-sm font-medium text-slate-900 truncate">{normalizeArticleName(row.designation)}</p>
                                                                        <p className="text-xs text-slate-400 mt-0.5 tabular-nums">{row.date} · Qté {row.quantity}</p>
                                                                    </div>
                                                                    <div className="shrink-0 text-right">
                                                                        <p className="text-sm font-semibold text-slate-900 tabular-nums">
                                                                            {fmt(row.totalPrice)} <span className="text-xs font-normal text-slate-400">DT</span>
                                                                        </p>
                                                                        <p className="text-xs text-slate-400 tabular-nums mt-0.5">{fmt(row.unitPrice)} / u.</p>
                                                                    </div>
                                                                </div>
                                                                {isAdmin && (
                                                                    <div className="flex justify-end gap-1 mt-1.5">
                                                                        <button onClick={(e) => { e.stopPropagation(); openEdit(row); }} aria-label="Modifier" className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"><Pencil className="h-4 w-4" /></button>
                                                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(row); }} aria-label="Supprimer" className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {articles.length === 0 && (
                            <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 px-4">
                                <Package className="h-10 w-10 text-slate-300 mb-3" />
                                <p className="text-sm font-medium text-slate-900">Aucun article enregistré</p>
                                <p className="text-sm text-slate-500 mt-1">Commencez par ajouter votre premier achat.</p>
                            </div>
                        )}

                        {articles.length > 0 && supplierGroups.length === 0 && (
                            <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 px-4">
                                <Search className="h-10 w-10 text-slate-300 mb-3" />
                                <p className="text-sm text-slate-500">Aucun résultat pour cette recherche.</p>
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="mt-3 inline-flex items-center gap-1 h-9 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
                                >
                                    <X className="h-3.5 w-3.5" /> Effacer la recherche
                                </button>
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
