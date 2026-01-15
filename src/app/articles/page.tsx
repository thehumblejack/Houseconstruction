'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
    Plus, X, Search, Pencil, Save, Loader2, Package,
    LayoutGrid, List, TrendingDown, Medal, ArrowRightLeft,
    ChevronDown, Trash2
} from 'lucide-react';

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

export default function ArticlesPage() {
    const { isAdmin } = useAuth();
    const [loading, setLoading] = useState(true);
    const [articles, setArticles] = useState<ArticleRow[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [suppliersList, setSuppliersList] = useState<{ id: string, name: string }[]>([]);
    const [viewMode, setViewMode] = useState<'inventory' | 'matrix'>('matrix');
    const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
    const [columnOrder, setColumnOrder] = useState<string[]>([]);
    const [showColumnSettings, setShowColumnSettings] = useState(false);

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

    // Helper to pick a clean label for merged items
    const normalizedNameLabel = (normalized: string, originalItems: ArticleRow[]) => {
        if (normalized.startsWith("FER Ø")) return normalized;
        if (normalized === "FIL ATTACHE") return "FIL ATTACHÉ (RECUIT)";
        if (normalized === "BRIQUE 8") {
            const detailed = originalItems.find(i => i.designation.toUpperCase().includes("BCM"));
            return detailed ? detailed.designation : "BRIQUE DE 8";
        }
        if (normalized === "BRIQUE 12") {
            const detailed = originalItems.find(i => i.designation.toUpperCase().includes("BCM"));
            return detailed ? detailed.designation : "BRIQUE DE 12";
        }

        // If it already has unit info from normalizeArticleName, return it
        if (normalized.includes("(1m3)")) return normalized;
        if (normalized.startsWith("OM ")) return normalized;
        if (normalized.startsWith("BERLIET ")) return normalized;

        // Otherwise use the most frequent original name or just the first one
        return originalItems[0].designation;
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
            <div className="bg-slate-900 rounded-[32px] p-6 md:p-8 text-white relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FFB800]/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>

                <div className="relative z-10 flex flex-col xl:flex-row justify-between items-center gap-6">
                    <div className="space-y-2 w-full xl:w-auto text-center xl:text-left">
                        <div className="flex items-center justify-center xl:justify-start gap-2">
                            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                                <Package className="h-5 w-5 text-[#FFB800]" />
                            </div>
                            <span className="text-[#FFB800] font-black tracking-widest uppercase text-[10px]">Gestion de Matériaux</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none">
                            Inventaire & <span className="text-[#FFB800]">Market Analytics</span>
                        </h1>
                    </div>

                    <div className="w-full xl:w-auto flex flex-col gap-4 md:gap-6">
                        {/* Tab Switcher */}
                        <div className="bg-white/10 p-1.5 rounded-2xl backdrop-blur-md flex flex-col md:flex-row w-full md:w-auto gap-1 md:gap-0">
                            <button
                                onClick={() => setViewMode('inventory')}
                                className={`
                                    flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all w-full md:w-auto
                                    ${viewMode === 'inventory' ? 'bg-[#FFB800] text-slate-900 shadow-md' : 'text-white hover:bg-white/5'}
                                `}
                            >
                                <List className="w-3.5 h-3.5" />
                                Inventaire
                            </button>
                            <button
                                onClick={() => setViewMode('matrix')}
                                className={`
                                    flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all w-full md:w-auto
                                    ${viewMode === 'matrix' ? 'bg-[#FFB800] text-slate-900 shadow-lg' : 'text-white hover:bg-white/5'}
                                `}
                            >
                                <LayoutGrid className="w-4 h-4" />
                                Tableau Comparatif
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full xl:w-[350px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder={viewMode === 'inventory' ? "Rechercher..." : "Comparer un matériau..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white text-slate-900 h-12 pl-11 pr-4 rounded-xl font-bold text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FFB800]/50 transition-all shadow-md"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {viewMode === 'matrix' ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
                    <div className="flex items-center justify-between px-2">
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <LayoutGrid className="text-[#FFB800] w-6 h-6" />
                                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Comparatif Multi-Fournisseurs</h2>
                            </div>

                            {/* Filter Chips */}
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { label: 'Tous', value: '' },
                                    { label: 'Briques', value: 'BRIQUE' },
                                    { label: 'Fer', value: 'FER' },
                                    { label: 'Gravier', value: 'GRAVIER' },
                                    { label: 'Sable', value: 'SABLE' }
                                ].map((chip) => {
                                    const isActive = searchTerm.toUpperCase() === chip.value.toUpperCase() || (chip.value === '' && searchTerm === '');
                                    return (
                                        <button
                                            key={chip.label}
                                            onClick={() => setSearchTerm(chip.value)}
                                            className={`
                                                px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                                                ${isActive
                                                    ? 'bg-[#FFB800] text-slate-900 shadow-lg scale-105'
                                                    : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-100'
                                                }
                                            `}
                                        >
                                            {chip.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setShowColumnSettings(!showColumnSettings)}
                                className={`p-3 md:p-4 rounded-2xl transition-all shadow-xl border flex items-center gap-2 md:gap-3 ${showColumnSettings ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-100 hover:border-[#FFB800]'}`}
                            >
                                <LayoutGrid className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Colonnes</span>
                            </button>

                            {showColumnSettings && (
                                <div className="absolute top-full right-0 mt-4 w-64 md:w-72 bg-white rounded-[32px] shadow-2xl border border-slate-100 p-6 z-[120] animate-in zoom-in-95 duration-200">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-2">Fournisseurs Affichés</h3>
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                                        {matrixData.suppliers.map((s) => (
                                            <label key={s} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-2xl cursor-pointer group transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={visibleColumns.includes(s)}
                                                    onChange={() => {
                                                        setVisibleColumns(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
                                                    }}
                                                    className="w-5 h-5 rounded-lg border-2 border-slate-200 checked:bg-slate-900 checked:border-slate-900 transition-all cursor-pointer"
                                                />
                                                <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">{s}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden">
                        <div className="overflow-x-auto touch-pan-x pb-2">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-900">
                                        <th className="sticky left-0 z-20 bg-slate-900 px-3 md:px-5 py-3.5 text-[9px] font-black text-[#FFB800] uppercase tracking-[0.2em] border-r border-white/5 min-w-[140px] md:min-w-[200px] shadow-[4px_0_8px_rgb(0,0,0,0.2)]">Article</th>
                                        {columnOrder.filter(s => visibleColumns.includes(s) && matrixData.suppliers.includes(s)).map((s, idx) => (
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
                                                className="px-3 md:px-4 py-3.5 text-[9px] font-black text-white uppercase tracking-[0.2em] text-center border-r border-white/5 min-w-[110px] md:min-w-[140px] cursor-move hover:bg-slate-800 transition-colors"
                                            >
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <List className="w-3 h-3 text-slate-500" />
                                                    {s}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {matrixData.rows.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase())).map((row) => (
                                        <tr key={row.name} className="hover:bg-slate-50 transition-colors group">
                                            <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 transition-colors px-3 md:px-5 py-2.5 border-r border-slate-100 shadow-[4px_0_12px_rgb(0,0,0,0.05)]">
                                                <span className="text-[10px] md:text-xs font-black text-slate-900 uppercase tracking-tight line-clamp-2 md:line-clamp-1">{row.name}</span>
                                            </td>
                                            {columnOrder.filter(s => visibleColumns.includes(s) && matrixData.suppliers.includes(s)).map(sup => {
                                                const entry = row.prices[sup];
                                                const price = entry?.price;
                                                const visiblePrices = Object.entries(row.prices)
                                                    .filter(([s]) => visibleColumns.includes(s))
                                                    .map(([, v]) => v.price);
                                                const isBest = price && price === Math.min(...visiblePrices);

                                                return (
                                                    <td key={sup} className="px-2 md:px-4 py-2.5 text-center border-r border-slate-50">
                                                        {price ? (
                                                            <div className={`inline-flex flex-col items-center p-1.5 rounded-xl w-full transition-all ${isBest ? 'bg-emerald-50 border border-emerald-100 shadow-sm' : ''}`}>
                                                                <span className={`text-[10px] md:text-[11px] font-black tabular-nums ${isBest ? 'text-emerald-600' : 'text-slate-600'}`}>
                                                                    {price.toFixed(3)}
                                                                </span>
                                                                <span className={`text-[6px] md:text-[7px] font-black uppercase mt-0.5 ${isBest ? 'text-emerald-400' : entry?.isRef ? 'text-blue-500' : 'text-slate-300'}`}>
                                                                    {entry?.isRef ? 'CMD' : isBest ? 'MIN' : 'DER'}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-200 font-bold text-[10px] md:text-[10px]">---</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
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
                            <div key={group.name} className="bg-white rounded-[24px] p-0.5 shadow-sm border border-slate-100 overflow-hidden transition-all duration-300">
                                <div
                                    onClick={() => toggleSupplier(group.name)}
                                    className={`
                                        p-4 flex items-center justify-between cursor-pointer rounded-[20px] transition-all
                                        ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'}
                                    `}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl ${group.color} flex items-center justify-center text-white shadow-md text-base font-black`}>
                                            {group.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">{group.name}</h2>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                                    {group.rows.length} Matériaux
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="hidden sm:flex flex-col items-end">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                                            <span className="text-lg font-black text-slate-900 tabular-nums leading-none">
                                                {group.total.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-[10px] text-slate-400 font-bold">DT</span>
                                            </span>
                                        </div>
                                        <div className={`p-2 rounded-full border transition-all duration-300 ${isExpanded ? 'bg-slate-900 text-white border-slate-900 rotate-180' : 'bg-white text-slate-400 border-slate-200'}`}>
                                            <ChevronDown className="h-4 w-4" />
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="p-1.5 animate-in slide-in-from-top-2 duration-300">
                                        <div className="bg-white rounded-[16px] border border-slate-100 overflow-hidden">
                                            <div className="overflow-x-auto touch-pan-x pb-2">
                                                <table className="w-full text-left border-collapse min-w-[700px] md:min-w-0">
                                                    <thead className="bg-slate-50 border-b border-slate-100">
                                                        <tr>
                                                            <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-28">Date</th>
                                                            <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Désignation</th>
                                                            <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-20 text-center">Qté</th>
                                                            <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-32 text-right">P.U</th>
                                                            <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-32 text-right">Total</th>
                                                            {isAdmin && <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-16 text-center"></th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {group.rows.map((row) => (
                                                            <tr key={row.id} className="hover:bg-blue-50/20 transition-colors group">
                                                                <td className="px-5 py-3">
                                                                    <div className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-600">{row.date}</div>
                                                                </td>
                                                                <td className="px-5 py-3 text-xs font-black text-slate-800 uppercase line-clamp-1">{normalizeArticleName(row.designation)}</td>
                                                                <td className="px-5 py-3 text-center">
                                                                    <span className="text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{row.quantity}</span>
                                                                </td>
                                                                <td className="px-5 py-3 text-right font-bold text-slate-500 tabular-nums text-xs">{row.unitPrice.toFixed(3)}</td>
                                                                <td className="px-5 py-3 text-right font-black text-slate-900 tabular-nums text-xs">{row.totalPrice.toFixed(3)}</td>
                                                                {isAdmin && (
                                                                    <td className="px-5 py-3 text-center">
                                                                        <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                                            <button onClick={(e) => { e.stopPropagation(); openEdit(row); }} className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-300 hover:text-blue-600 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                                                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(row); }} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-600 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                                                                        </div>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
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
