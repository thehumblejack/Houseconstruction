'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { ShoppingCart, Plus, Calendar, Package, Truck, CheckCircle2, XCircle, ChevronDown, ChevronUp, Trash2, Save, User, Search, Store, Pencil } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';

// --- Interfaces ---

interface OrderItem {
    id?: string;
    article_name: string;
    quantity: number;
    unit: string;
    unitPrice?: number; // Estimate
    totalPrice?: number; // Estimate
}

interface Order {
    id: string;
    supplier_id: string;
    supplier_name?: string;
    supplier_color?: string;
    date: string;
    status: 'pending' | 'delivered' | 'cancelled';
    notes?: string;
    items?: OrderItem[];
    created_at?: string;
}

interface CatalogItem {
    id: string; // generated key
    designation: string;
    supplierId: string;
    supplierName: string;
    unitPrice: number;
    lastDate: string;
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

// --- Component ---

export default function OrdersContent() {
    const { isAdmin } = useAuth();
    const { currentProject } = useProject();
    const supabase = useMemo(() => createClient(), []);

    // Main Data
    const [orders, setOrders] = useState<Order[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [catalog, setCatalog] = useState<CatalogItem[]>([]); // For Autocomplete
    const [loading, setLoading] = useState(true);

    // UI State
    const [isAdding, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

    // Form State
    const [newOrder, setNewOrder] = useState({
        supplierId: '',
        date: '', // Initialize empty to match server
        notes: ''
    });

    useEffect(() => {
        // Set default date on client mount
        setNewOrder(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }));
    }, []);

    const [newItems, setNewItems] = useState<OrderItem[]>([
        { article_name: '', quantity: 1, unit: 'pcs', unitPrice: 0, totalPrice: 0 }
    ]);

    // Autocomplete State per row
    const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
    const [searchResults, setSearchResults] = useState<CatalogItem[]>([]);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // --- Fetching ---

    const fetchData = async () => {
        if (!currentProject) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // 1. Fetch Suppliers
            const { data: supData } = await supabase.from('suppliers').select('*').order('name');
            const supMap: Record<string, any> = {};
            (supData || []).forEach((s: any) => supMap[s.id] = s);
            setSuppliers(supData || []);

            // 2. Fetch Orders
            const { data: orderData, error } = await supabase
                .from('orders')
                .select('*, items:order_items(*)')
                .eq('project_id', currentProject.id)
                .order('created_at', { ascending: false });

            if (error && error.code !== 'PGRST116') console.error("Order fetch error", error);

            const enrichedOrders = (orderData || []).map((o: any) => ({
                ...o,
                supplier_name: supMap[o.supplier_id]?.name || o.supplier_id,
                supplier_color: supMap[o.supplier_id]?.color || 'bg-slate-500',
                items: o.items.map((i: any) => ({
                    ...i,
                    unitPrice: i.unit_price || 0,
                    totalPrice: (i.quantity || 0) * (i.unit_price || 0)
                }))
            }));
            setOrders(enrichedOrders);

            // 3. Fetch Catalog (Articles History) for Autocomplete
            const { data: expensesData } = await supabase.from('expenses').select('*, items:invoice_items(*)').eq('project_id', currentProject.id);

            const rawCatalog: CatalogItem[] = [];
            expensesData?.forEach((e: any) => {
                const sup = supMap[e.supplier_id] || { name: 'Inconnu' };
                if (e.items && e.items.length > 0) {
                    e.items.forEach((i: any) => {
                        rawCatalog.push({
                            id: i.id,
                            designation: i.designation,
                            supplierId: e.supplier_id,
                            supplierName: sup.name,
                            unitPrice: i.unit_price || 0,
                            lastDate: e.date
                        });
                    });
                } else {
                    rawCatalog.push({
                        id: e.id,
                        designation: e.item,
                        supplierId: e.supplier_id,
                        supplierName: sup.name,
                        unitPrice: e.price, // Roughly
                        lastDate: e.date
                    });
                }
            });
            // Sort by most recent
            // rawCatalog.sort((a, b) => ...); 
            setCatalog(rawCatalog);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        if (!currentProject) return;
        const subscription = supabase
            .channel('orders_channel_v2') // Changed channel name to avoid conflict
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `project_id=eq.${currentProject.id}`
            }, fetchData)
            .subscribe();
        return () => { subscription.unsubscribe(); };
    }, [currentProject]);

    // Click outside handler for autocomplete
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setActiveSearchIndex(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);


    // --- Handlers ---

    const handleAddItemRow = () => {
        setNewItems([...newItems, { article_name: '', quantity: 1, unit: 'pcs', unitPrice: 0, totalPrice: 0 }]);
    };

    const handleRemoveItemRow = (index: number) => {
        setNewItems(newItems.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
        const updated = [...newItems];
        // @ts-ignore
        updated[index][field] = value;

        // Auto-fill price for Reference items
        if (field === 'article_name') {
            const name = value.trim().toUpperCase();
            if (MOSTAKBEL_PRICES[name]) {
                updated[index].unitPrice = MOSTAKBEL_PRICES[name];
            } else if (BEN_HDEYA_PRICES[name]) {
                updated[index].unitPrice = BEN_HDEYA_PRICES[name];
            }
        }

        // Auto-recalculate total if qty or unit price changes
        if (field === 'quantity' || field === 'unitPrice' || field === 'article_name') {
            const qty = Number(updated[index].quantity || 0);
            const price = Number(updated[index].unitPrice || 0);
            updated[index].totalPrice = qty * price;
        }

        setNewItems(updated);

        if (field === 'article_name') {
            const query = value.toString().toLowerCase();
            if (query.length > 0) {
                // 1. Filter history
                const catalogHits = catalog.filter(c =>
                    c.designation.toLowerCase().includes(query) ||
                    c.supplierName.toLowerCase().includes(query)
                );

                // 2. Add Reference price hits
                const mostakbelHits = Object.entries(MOSTAKBEL_PRICES)
                    .filter(([name]) => name.toLowerCase().includes(query))
                    .map(([name, price]) => ({
                        id: `ref-mos-${name}`,
                        designation: name,
                        supplierId: 'fer',
                        supplierName: 'STE Mostakbel',
                        unitPrice: price,
                        lastDate: 'Prix Officiel'
                    }));

                const benHdyaHits = Object.entries(BEN_HDEYA_PRICES)
                    .filter(([name]) => name.toLowerCase().includes(query))
                    .map(([name, price]) => ({
                        id: `ref-ben-${name}`,
                        designation: name,
                        supplierId: 'ahmed',
                        supplierName: 'Ahmed Ben Hdya',
                        unitPrice: price,
                        lastDate: 'Prix Officiel'
                    }));

                // Combine and limit
                const combined = [...mostakbelHits, ...benHdyaHits, ...catalogHits].slice(0, 15);
                setSearchResults(combined);
                setActiveSearchIndex(index);
            } else {
                setSearchResults([]);
                setActiveSearchIndex(null);
            }
        }
    };

    const handleSelectCatalogItem = (index: number, item: CatalogItem) => {
        const updated = [...newItems];
        updated[index].article_name = item.designation;
        updated[index].unitPrice = item.unitPrice;
        updated[index].totalPrice = item.unitPrice * updated[index].quantity;

        // If user hasn't selected a supplier yet, maybe we propose it?
        if (!newOrder.supplierId) {
            setNewOrder(prev => ({ ...prev, supplierId: item.supplierId }));
        }

        setNewItems(updated);
        setActiveSearchIndex(null);
    };

    const handleSaveOrder = async () => {
        if (!currentProject) return;
        if (!newOrder.supplierId) {
            alert('Veuillez sélectionner un fournisseur');
            return;
        }

        try {
            const [y, m, d] = newOrder.date.split('-');
            const formattedDate = `${d}/${m}/${y}`;

            let orderId = editingOrderId;

            if (isEditing && orderId) {
                // Update Order
                const { error: orderError } = await supabase
                    .from('orders')
                    .update({
                        supplier_id: newOrder.supplierId,
                        date: formattedDate,
                        notes: newOrder.notes,
                    })
                    .eq('id', orderId);

                if (orderError) throw orderError;

                // Simple strategy: Delete old items and insert new ones
                const { error: deleteError } = await supabase.from('order_items').delete().eq('order_id', orderId);
                if (deleteError) throw deleteError;
            } else {
                // Create Order
                const { data: orderData, error: orderError } = await supabase
                    .from('orders').insert({
                        project_id: currentProject.id,
                        supplier_id: newOrder.supplierId,
                        date: formattedDate,
                        notes: newOrder.notes,
                        status: 'pending'
                    })
                    .select()
                    .single();

                if (orderError) throw orderError;
                orderId = orderData.id;
            }

            if (newItems.length > 0) {
                const itemsToInsert = newItems
                    .filter(i => i.article_name.trim() !== '')
                    .map(i => ({
                        project_id: currentProject.id,
                        order_id: orderId,
                        article_name: i.article_name,
                        quantity: i.quantity,
                        unit: i.unit,
                        unit_price: i.unitPrice || 0,
                        status: 'pending'
                    }));

                if (itemsToInsert.length > 0) {
                    const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
                    if (itemsError) throw itemsError;
                }
            }

            closeModal();
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Erreur lors de l'enregistrement.");
        }
    };

    const openAdd = () => {
        setIsEditing(false);
        setEditingOrderId(null);
        setNewOrder({ supplierId: '', date: new Date().toISOString().split('T')[0], notes: '' });
        setNewItems([{ article_name: '', quantity: 1, unit: 'pcs', unitPrice: 0, totalPrice: 0 }]);
        setIsAdding(true);
    };

    const openEdit = (order: Order) => {
        setIsEditing(true);
        setEditingOrderId(order.id);

        let dateVal = '';
        if (order.date && order.date.includes('/')) {
            const [d, m, y] = order.date.split('/');
            dateVal = `${y}-${m}-${d}`;
        } else {
            dateVal = order.date;
        }

        setNewOrder({
            supplierId: order.supplier_id,
            date: dateVal,
            notes: order.notes || ''
        });

        if (order.items && order.items.length > 0) {
            setNewItems(order.items.map(i => ({
                article_name: i.article_name,
                quantity: i.quantity,
                unit: i.unit,
                unitPrice: i.unitPrice || 0,
                totalPrice: (i.quantity || 0) * (i.unitPrice || 0)
            })));
        } else {
            setNewItems([{ article_name: '', quantity: 1, unit: 'pcs', unitPrice: 0, totalPrice: 0 }]);
        }

        setIsAdding(true);
    };

    const closeModal = () => {
        setIsAdding(false);
        setIsEditing(false);
        setEditingOrderId(null);
    };

    const handleUpdateStatus = async (orderId: string, newStatus: string) => {
        const project = currentProject;
        if (!project) return;
        if (newStatus === 'delivered') {
            const order = orders.find(o => o.id === orderId);
            if (!order) return;

            if (!confirm(`Confirmer la réception de la commande pour ${order.supplier_name} ?\n\nCela générera automatiquement une dépense dans sa fiche.`)) return;

            const totalAmount = order.items?.reduce((sum, i) => sum + ((i.quantity || 0) * (i.unitPrice || 0)), 0) || 0;

            try {
                const { data: expenseData, error: expError } = await supabase.from('expenses').insert({
                    project_id: project.id,
                    supplier_id: order.supplier_id,
                    date: new Date().toLocaleDateString('fr-FR'),
                    item: `Commande du ${order.date}`,
                    quantity: 'Lot',
                    price: totalAmount,
                    status: 'pending'
                }).select().single();

                if (expError) throw expError;

                if (order.items && order.items.length > 0) {
                    const invoiceItems = order.items.map(i => ({
                        project_id: project.id,
                        expense_id: expenseData.id,
                        designation: i.article_name,
                        quantity: i.quantity,
                        unit: i.unit,
                        unit_price: i.unitPrice || 0,
                        total_ttc: (i.quantity * (i.unitPrice || 0))
                    }));

                    const { error: itemsError } = await supabase.from('invoice_items').insert(invoiceItems);
                    if (itemsError) throw itemsError;
                }

                alert("Commande transférée avec succès vers les dépenses !");
            } catch (err: any) {
                console.error("Error creating expense from order", err);
                alert(`Erreur lors de la création de la dépense : ${err.message || err.details || 'Erreur inconnue'}`);
                return;
            }
        }
        await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
        fetchData();
    };



    const handleDeleteSelected = async () => {
        if (selectedOrders.length === 0) {
            alert("Aucune commande sélectionnée");
            return;
        }
        if (!confirm('Supprimer ' + selectedOrders.length + ' commande(s) sélectionnée(s) ?')) return;

        for (const id of selectedOrders) {
            await supabase.from('orders').delete().eq('id', id);
        }
        setSelectedOrders([]);
        fetchData();
    };



    const toggleSelectOrder = (orderId: string) => {
        setSelectedOrders(prev =>
            prev.includes(orderId)
                ? prev.filter(id => id !== orderId)
                : [...prev, orderId]
        );
    };



    const pendingOrders = orders.filter(o => o.status === 'pending');
    const deliveredOrders = orders.filter(o => o.status === 'delivered');

    // Total Estimate
    const totalEstimate = newItems.reduce((sum, i) => sum + (i.totalPrice || 0), 0);

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 pb-24 font-jakarta">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                        <ShoppingCart className="h-8 w-8 text-blue-600" />
                        Mes Commandes
                    </h1>
                    <p className="text-slate-500 font-bold text-sm">Suivi des approvisionnements chantier</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    {isAdmin && selectedOrders.length > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-3 rounded-2xl flex items-center gap-2 font-bold text-sm transition-all"
                        >
                            <Trash2 className="h-4 w-4" />
                            Supprimer ({selectedOrders.length})
                        </button>
                    )}
                    <button
                        onClick={openAdd}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-2xl flex items-center gap-2 font-black uppercase tracking-wide transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                        <Plus className="h-5 w-5" />
                        Nouvelle Commande
                    </button>
                </div>
            </div>

            {/* Columns */}
            <div className="grid md:grid-cols-2 gap-8">
                {/* PENDING */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Truck className="h-4 w-4" /> En Cours
                        </h2>
                        <span className="bg-slate-200 text-slate-600 text-xs font-black px-2 py-0.5 rounded-full">{pendingOrders.length}</span>
                    </div>
                    {pendingOrders.map(order => (
                        <div key={order.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-5 relative overflow-hidden group">
                            <div className={`absolute top-0 left-0 w-1 h-full ${order.supplier_color}`} />
                            <div className="flex justify-between items-start w-full">
                                <div className="flex items-start gap-4">
                                    {isAdmin && (
                                        <input
                                            type="checkbox"
                                            checked={selectedOrders.includes(order.id)}
                                            onChange={() => toggleSelectOrder(order.id)}
                                            className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                    )}
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black uppercase text-slate-800 bg-slate-100 px-2 py-1 rounded">{order.supplier_name}</span>
                                        </div>
                                        <div className="flex items-center text-xs text-slate-400 font-bold">
                                            <Calendar className="h-3 w-3 mr-1" />
                                            {order.date}
                                        </div>
                                    </div>
                                </div>

                                {isAdmin && (
                                    <button
                                        onClick={() => openEdit(order)}
                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            <div className="space-y-2 mb-4">
                                {(order.items || []).map(item => (
                                    <div key={item.id} className="flex justify-between text-[11px] items-center border-b border-slate-50 pb-1.5 pt-0.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                            <span className="font-bold text-slate-700">{item.article_name}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-slate-900 font-black tabular-nums">
                                                {((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-[8px] text-slate-400">DT</span>
                                            </span>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase">
                                                {item.quantity} {item.unit} × {item.unitPrice?.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button onClick={() => handleUpdateStatus(order.id, 'delivered')} className="flex-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 py-2 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1 transition-colors">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Reçu Confirmé
                                </button>
                            </div>
                        </div>
                    ))}
                    {pendingOrders.length === 0 && <div suppressHydrationWarning className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 text-xs font-bold uppercase">Aucune commande en cours</div>}
                </div>

                {/* DELIVERED */}
                {/* DELIVERED */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-8">
                    <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Historique Livraisons
                        </h2>
                        <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-100">{deliveredOrders.length}</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-white/50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                <tr>
                                    <th className="px-6 py-3 w-12 text-center">
                                        #
                                    </th>
                                    <th className="px-6 py-3">Fournisseur</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Articles</th>
                                    <th className="px-6 py-3 text-right">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {deliveredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                                            Aucune commande livrée
                                        </td>
                                    </tr>
                                ) : (
                                    deliveredOrders.map(order => (
                                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 text-center">
                                                {isAdmin && (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedOrders.includes(order.id)}
                                                        onChange={() => toggleSelectOrder(order.id)}
                                                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                                                    />
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-700 text-sm">
                                                {order.supplier_name}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-slate-400 font-mono">
                                                {order.date}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-500 max-w-md truncate font-medium">
                                                {(order.items || []).map(i => i.article_name).join(', ')}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                    <CheckCircle2 className="h-3 w-3" /> LIVRÉ
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ADD MODAL with Enhanced Search */}
            {isAdding && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-visible" ref={wrapperRef}>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-2xl ${isEditing ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {isEditing ? <Pencil className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                                </div>
                                <h2 className="text-xl font-black uppercase text-slate-900 tracking-tight">
                                    {isEditing ? 'Modifier la Commande' : 'Nouvelle Commande'}
                                </h2>
                            </div>
                            <button onClick={closeModal}><XCircle className="h-8 w-8 text-slate-300 hover:text-red-500 transition-colors" /></button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400">Fournisseur</label>
                                    <select
                                        className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newOrder.supplierId}
                                        onChange={e => setNewOrder({ ...newOrder, supplierId: e.target.value })}
                                    >
                                        <option value="">Sélectionner...</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400">Date Prévue</label>
                                    <input
                                        type="date"
                                        className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-slate-700 outline-none"
                                        value={newOrder.date}
                                        onChange={e => setNewOrder({ ...newOrder, date: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Items Editor */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400">Articles à commander</label>
                                    <button onClick={handleAddItemRow} className="text-xs font-black text-blue-500 hover:underline uppercase">+ Ajouter Ligne</button>
                                </div>
                                <div className="space-y-4">
                                    {newItems.map((item, idx) => (
                                        <div key={idx} className="relative flex flex-col md:flex-row gap-2 items-start bg-slate-50 p-2 rounded-xl border border-transparent hover:border-slate-200 transition-all">
                                            {/* Article Input + Autocomplete Dropdown */}
                                            <div className="flex-1 relative w-full">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                    <input
                                                        placeholder="Rechercher un article..."
                                                        className="w-full pl-9 p-3 bg-white border border-slate-100 rounded-xl font-bold text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500"
                                                        value={item.article_name}
                                                        onChange={e => handleItemChange(idx, 'article_name', e.target.value)}
                                                        onFocus={() => handleItemChange(idx, 'article_name', item.article_name)}
                                                    />
                                                </div>

                                                {/* Dropdown Results - positioned absolutely with high z-index */}
                                                {activeSearchIndex === idx && searchResults.length > 0 && (
                                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 z-[110] max-h-60 overflow-y-auto w-[150%] md:w-[120%] transform -translate-x-0">
                                                        {searchResults.map((res, sIdx) => (
                                                            <button
                                                                key={`${res.id} - ${sIdx}`}
                                                                onClick={() => handleSelectCatalogItem(idx, res)}
                                                                className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex justify-between items-center group"
                                                            >
                                                                <div>
                                                                    <p className="font-bold text-slate-900 text-sm">{res.designation}</p>
                                                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-black">
                                                                        <span>{res.supplierName}</span>
                                                                        <span>•</span>
                                                                        <span>{res.lastDate}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="font-black text-emerald-600 text-xs">{res.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-[9px]">Dt</span></p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-2 w-full md:w-auto">
                                                <div className="flex flex-col w-20">
                                                    <label className="text-[9px] uppercase font-black text-slate-400 pl-1 mb-0.5">Quantité</label>
                                                    <input
                                                        type="number"
                                                        className="w-full p-3 bg-white border border-slate-100 rounded-xl font-bold text-sm text-center outline-none focus:border-blue-500 transition-colors"
                                                        value={item.quantity}
                                                        onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex flex-col w-28">
                                                    <label className="text-[9px] uppercase font-black text-slate-400 pl-1 mb-0.5">Prix Unit.</label>
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        className="w-full p-3 bg-white border border-slate-100 rounded-xl font-bold text-sm text-center outline-none text-slate-600 focus:border-blue-500 transition-colors"
                                                        value={item.unitPrice || ''}
                                                        onChange={e => handleItemChange(idx, 'unitPrice', e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex flex-col w-28">
                                                    <label className="text-[9px] uppercase font-black text-emerald-500 pl-1 mb-0.5 font-jakarta">Total</label>
                                                    <div className="w-full p-3 bg-emerald-50 border border-emerald-100 rounded-xl font-black text-sm text-center text-emerald-700 font-mono">
                                                        {(item.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 3 })}
                                                    </div>
                                                </div>
                                            </div>

                                            {newItems.length > 1 && (
                                                <button onClick={() => handleRemoveItemRow(idx)} className="p-3 text-slate-300 hover:text-red-500 mt-4 md:mt-2"><XCircle className="h-5 w-5" /></button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Estimated Total Footer */}
                            <div className="flex justify-between items-center bg-slate-900 text-white p-5 rounded-2xl shadow-xl">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Estimatif</p>
                                    <p className="text-[10px] text-slate-500">Hors frais de livraison</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black">{totalEstimate.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-sm text-slate-400">DT</span></p>
                                </div>
                            </div>

                            <button
                                onClick={handleSaveOrder}
                                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest hover:scale-[1.01] transition-all flex justify-center items-center gap-2 shadow-xl ${isEditing ? 'bg-amber-500 hover:bg-amber-400 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                            >
                                <Save className="h-5 w-5" />
                                {isEditing ? 'Mettre à jour' : 'Valider la Commande'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
