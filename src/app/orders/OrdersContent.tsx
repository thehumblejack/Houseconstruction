'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { Plus, Calendar, Package, Truck, CheckCircle2, Trash2, Search, Pencil, Eye, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import { Modal, AnchoredDropdown } from '@/components/ui';

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

// --- Shared class recipes ---
const inputClass = "w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition";
const labelClass = "block text-[13px] font-medium text-slate-700 mb-1.5";
const primaryBtn = "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-colors";
const secondaryBtn = "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 active:scale-[0.99] transition-colors";

// --- Component ---

export default function OrdersContent() {
    const { currentProject, userRole } = useProject();
    const supabase = useMemo(() => createClient(), []);

    // Main Data
    const [orders, setOrders] = useState<Order[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const { isAdmin: authIsAdmin } = useAuth();
    // Write permission is driven by the PROJECT role. Viewers ("Observateur") are read-only.
    const canEdit = authIsAdmin || userRole === 'admin' || userRole === 'editor';
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [catalog, setCatalog] = useState<CatalogItem[]>([]); // For Autocomplete

    // UI State
    const [isAdding, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
    const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
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
    const [searchAnchorEl, setSearchAnchorEl] = useState<HTMLElement | null>(null);
    const [searchResults, setSearchResults] = useState<CatalogItem[]>([]);

    // --- Fetching ---

    const fetchData = async () => {
        if (!currentProject) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // 1. Fetch Suppliers - Exclude deleted
            const { data: supData } = await supabase.from('suppliers').select('*').is('deleted_at', null).order('name');
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
            .channel('orders_channel_v2')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `project_id=eq.${currentProject.id}`
            }, fetchData)
            .subscribe();
        return () => { subscription.unsubscribe(); };
    }, [currentProject]);

    useEffect(() => {
        setIsAdmin(authIsAdmin);
    }, [authIsAdmin]);

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

        if (field === 'article_name') {
            const name = value.trim().toUpperCase();
            if (MOSTAKBEL_PRICES[name]) {
                updated[index].unitPrice = MOSTAKBEL_PRICES[name];
            } else if (BEN_HDEYA_PRICES[name]) {
                updated[index].unitPrice = BEN_HDEYA_PRICES[name];
            }
        }

        if (field === 'quantity' || field === 'unitPrice' || field === 'article_name') {
            const qty = Number(updated[index].quantity || 0);
            const price = Number(updated[index].unitPrice || 0);
            updated[index].totalPrice = qty * price;
        }

        setNewItems(updated);

        if (field === 'article_name') {
            const query = value.toString().toLowerCase();
            if (query.length > 0) {
                const catalogHits = catalog.filter(c =>
                    c.designation.toLowerCase().includes(query) ||
                    c.supplierName.toLowerCase().includes(query)
                );

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

        if (!newOrder.supplierId) {
            setNewOrder(prev => ({ ...prev, supplierId: item.supplierId }));
        }

        setNewItems(updated);
        setActiveSearchIndex(null);
    };

    const handleSaveOrder = async () => {
        if (!canEdit) return;
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
                const { error: orderError } = await supabase
                    .from('orders')
                    .update({
                        supplier_id: newOrder.supplierId,
                        date: formattedDate,
                        notes: newOrder.notes,
                    })
                    .eq('id', orderId);

                if (orderError) throw orderError;

                const { error: deleteError } = await supabase.from('order_items').delete().eq('order_id', orderId);
                if (deleteError) throw deleteError;
            } else {
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

            if (newItems.length > 0 && orderId) {
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

    // Prefill the new-order modal when arriving from Articles ("Commander")
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const p = new URLSearchParams(window.location.search);
        const article = p.get('article');
        if (!article) return;
        const price = parseFloat(p.get('price') || '0') || 0;
        setEditingOrderId(null);
        setIsEditing(false);
        setNewOrder({ supplierId: '', date: new Date().toISOString().split('T')[0], notes: '' });
        setNewItems([{ article_name: article, quantity: 1, unit: 'pcs', unitPrice: price, totalPrice: price }]);
        setIsAdding(true);
        window.history.replaceState(null, '', '/orders');
    }, []);

    const openAdd = () => {
        if (!canEdit) return;
        setIsEditing(false);
        setEditingOrderId(null);
        setNewOrder({ supplierId: '', date: new Date().toISOString().split('T')[0], notes: '' });
        setNewItems([{ article_name: '', quantity: 1, unit: 'pcs', unitPrice: 0, totalPrice: 0 }]);
        setIsAdding(true);
    };

    const openEdit = (order: Order) => {
        if (!canEdit) return;
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
        setActiveSearchIndex(null);
    };

    const handleUpdateStatus = async (orderId: string, newStatus: string) => {
        if (!canEdit) return;
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
        if (!authIsAdmin) return;
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

    const filteredOrders = orders.filter(o =>
        o.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.items?.some(i => i.article_name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const pendingOrders = filteredOrders.filter(o => o.status === 'pending');
    const deliveredOrders = filteredOrders.filter(o => o.status === 'delivered');

    // Total Estimate
    const totalEstimate = newItems.reduce((sum, i) => sum + (i.totalPrice || 0), 0);

    const orderTotal = (order: Order) =>
        (order.items || []).reduce((sum, i) => sum + ((i.quantity || 0) * (i.unitPrice || 0)), 0);

    return (
        <div className="min-h-screen font-jakarta">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 pb-28 md:pb-12 space-y-5">

                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">Commandes</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Suivi des approvisionnements et livraisons</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {authIsAdmin && selectedOrders.length > 0 && (
                            <button
                                onClick={handleDeleteSelected}
                                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 active:scale-[0.99] transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                                <span className="tabular-nums">{selectedOrders.length}</span>
                            </button>
                        )}
                        {canEdit && (
                            <button onClick={openAdd} className={primaryBtn}>
                                <Plus className="h-4 w-4" />
                                Nouvelle commande
                            </button>
                        )}
                    </div>
                </div>

                {/* Controls: search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Rechercher une commande..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
                    />
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                        <div className="flex items-start justify-between">
                            <p className="text-xs text-slate-500">En cours</p>
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-50 text-amber-600">
                                <Truck className="h-4 w-4" />
                            </span>
                        </div>
                        <p className="text-xl sm:text-2xl font-semibold text-slate-900 tabular-nums mt-1">{pendingOrders.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                        <div className="flex items-start justify-between">
                            <p className="text-xs text-slate-500">Livrées</p>
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600">
                                <CheckCircle2 className="h-4 w-4" />
                            </span>
                        </div>
                        <p className="text-xl sm:text-2xl font-semibold text-slate-900 tabular-nums mt-1">{deliveredOrders.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                        <div className="flex items-start justify-between">
                            <p className="text-xs text-slate-500">Total commandes</p>
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-600">
                                <Package className="h-4 w-4" />
                            </span>
                        </div>
                        <p className="text-xl sm:text-2xl font-semibold text-slate-900 tabular-nums mt-1">{filteredOrders.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                        <div className="flex items-start justify-between">
                            <p className="text-xs text-slate-500">Valeur en cours</p>
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-blue-600">
                                <Clock className="h-4 w-4" />
                            </span>
                        </div>
                        <p className="text-xl sm:text-2xl font-semibold text-slate-900 tabular-nums mt-1">
                            {pendingOrders.reduce((s, o) => s + orderTotal(o), 0).toLocaleString(undefined, { minimumFractionDigits: 3 })}
                            <span className="text-xs text-slate-400 ml-1">DT</span>
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="rounded-2xl border border-slate-200 bg-white py-16 flex flex-col items-center gap-3">
                        <div className="h-7 w-7 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
                        <p className="text-sm text-slate-500">Chargement des commandes...</p>
                    </div>
                ) : (
                    <>
                        {/* PENDING ORDERS */}
                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-slate-900">En cours de livraison</h2>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                                    {pendingOrders.length}
                                </span>
                            </div>

                            {pendingOrders.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 flex flex-col items-center gap-3">
                                    <Package className="h-7 w-7 text-slate-300" />
                                    <p className="text-sm text-slate-500">Aucune commande en cours d&apos;acheminement</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {pendingOrders.map((order) => (
                                        <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                                    {authIsAdmin && (
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedOrders.includes(order.id)}
                                                            onChange={() => toggleSelectOrder(order.id)}
                                                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20 cursor-pointer"
                                                        />
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-slate-900 truncate">{order.supplier_name}</p>
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                            Prévu le {order.date}
                                                        </div>
                                                    </div>
                                                </div>
                                                {canEdit && (
                                                    <button
                                                        onClick={() => openEdit(order)}
                                                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                                                {(order.items || []).map((item, iIdx) => (
                                                    <div key={iIdx} className="flex justify-between items-start gap-3">
                                                        <span className="text-sm text-slate-700 min-w-0 truncate">{item.article_name}</span>
                                                        <div className="flex flex-col items-end shrink-0">
                                                            <span className="text-sm font-medium text-slate-900 tabular-nums">
                                                                {((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 3 })}
                                                                <span className="text-xs text-slate-400 ml-0.5">DT</span>
                                                            </span>
                                                            <span className="text-[11px] text-slate-400 tabular-nums">
                                                                {item.quantity} {item.unit} × {item.unitPrice?.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {canEdit && (
                                                <button
                                                    onClick={() => handleUpdateStatus(order.id, 'delivered')}
                                                    className="mt-3 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 active:scale-[0.99] transition-colors"
                                                >
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    Confirmer réception
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* DELIVERED ORDERS */}
                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-slate-900">Historique des livraisons</h2>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                    {deliveredOrders.length}
                                </span>
                            </div>

                            {deliveredOrders.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 flex flex-col items-center gap-3">
                                    <Clock className="h-7 w-7 text-slate-300" />
                                    <p className="text-sm text-slate-500">Aucune donnée archivée</p>
                                </div>
                            ) : (
                                <>
                                    {/* Desktop table */}
                                    <div className="hidden md:block rounded-2xl border border-slate-200 overflow-hidden bg-white">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50">
                                                    {authIsAdmin && <th className="px-4 py-3 text-xs font-medium text-slate-500 w-12"></th>}
                                                    <th className="px-4 py-3 text-xs font-medium text-slate-500">Partenaire</th>
                                                    <th className="px-4 py-3 text-xs font-medium text-slate-500">Date de réception</th>
                                                    <th className="px-4 py-3 text-xs font-medium text-slate-500">Contenu</th>
                                                    <th className="px-4 py-3 text-xs font-medium text-slate-500 text-right">Total</th>
                                                    <th className="px-4 py-3 text-xs font-medium text-slate-500 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {deliveredOrders.map(order => (
                                                    <tr key={order.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                                                        {authIsAdmin && (
                                                            <td className="px-4 py-3 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedOrders.includes(order.id)}
                                                                    onChange={() => toggleSelectOrder(order.id)}
                                                                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20 cursor-pointer"
                                                                />
                                                            </td>
                                                        )}
                                                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{order.supplier_name}</td>
                                                        <td className="px-4 py-3 text-sm text-slate-500 tabular-nums">{order.date}</td>
                                                        <td className="px-4 py-3 text-sm text-slate-500 max-w-xs">
                                                            <p className="line-clamp-1">{(order.items || []).map(i => i.article_name).join(', ')}</p>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right tabular-nums">
                                                            {orderTotal(order).toLocaleString(undefined, { minimumFractionDigits: 3 })}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                                                    Livré
                                                                </span>
                                                                <button
                                                                    onClick={() => setViewingOrder(order)}
                                                                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile stacked cards */}
                                    <div className="md:hidden space-y-3">
                                        {deliveredOrders.map(order => (
                                            <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                                        {authIsAdmin && (
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedOrders.includes(order.id)}
                                                                onChange={() => toggleSelectOrder(order.id)}
                                                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20 cursor-pointer"
                                                            />
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-slate-900 truncate">{order.supplier_name}</p>
                                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                                Livré le {order.date}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setViewingOrder(order)}
                                                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                                                    {(order.items || []).map(i => i.article_name).join(', ')}
                                                </p>
                                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                                        Livré
                                                    </span>
                                                    <span className="text-sm font-semibold text-slate-900 tabular-nums">
                                                        {orderTotal(order).toLocaleString(undefined, { minimumFractionDigits: 3 })}
                                                        <span className="text-xs text-slate-400 ml-1">DT</span>
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </section>
                    </>
                )}
            </div>

            {/* ADD / EDIT MODAL */}
            <Modal
                open={isAdding}
                onClose={closeModal}
                title={isEditing ? 'Modifier la commande' : 'Nouvelle commande'}
                description="Planification des approvisionnements"
                size="xl"
                footer={
                    <>
                        <div className="mr-auto text-left">
                            <p className="text-xs text-slate-500">Valeur estimée</p>
                            <p className="text-lg font-semibold text-slate-900 tabular-nums">
                                {totalEstimate.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                                <span className="text-xs text-slate-400 ml-1">DT</span>
                            </p>
                        </div>
                        <button className={secondaryBtn} onClick={closeModal}>Annuler</button>
                        <button
                            className={primaryBtn}
                            onClick={handleSaveOrder}
                            disabled={!newOrder.supplierId || newItems.every(i => !i.article_name)}
                        >
                            <Truck className="h-4 w-4" />
                            Enregistrer
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Fournisseur</label>
                            <select
                                className={inputClass}
                                value={newOrder.supplierId}
                                onChange={e => setNewOrder({ ...newOrder, supplierId: e.target.value })}
                            >
                                <option value="">Sélectionner un partenaire...</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Date prévue</label>
                            <input
                                type="date"
                                className={inputClass}
                                value={newOrder.date}
                                onChange={e => setNewOrder({ ...newOrder, date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className={labelClass + ' mb-0'}>Articles à commander</label>
                            <button onClick={handleAddItemRow} className="text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">
                                + Ajouter une ligne
                            </button>
                        </div>
                        <div className="space-y-3">
                            {newItems.map((item, idx) => (
                                <div key={idx} className="relative flex flex-col sm:flex-row gap-2 sm:items-start rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <div className="flex-1 relative w-full">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <input
                                                placeholder="Rechercher un article..."
                                                className={inputClass + ' pl-9'}
                                                value={item.article_name}
                                                onChange={e => handleItemChange(idx, 'article_name', e.target.value)}
                                                onFocus={e => { setSearchAnchorEl(e.currentTarget); handleItemChange(idx, 'article_name', item.article_name); }}
                                            />
                                        </div>

                                        <AnchoredDropdown
                                            open={activeSearchIndex === idx && searchResults.length > 0}
                                            anchorEl={searchAnchorEl}
                                            onClose={() => setActiveSearchIndex(null)}
                                        >
                                            {searchResults.map((res, sIdx) => (
                                                <button
                                                    key={sIdx}
                                                    onClick={() => { handleSelectCatalogItem(idx, res); setActiveSearchIndex(null); }}
                                                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex justify-between items-center gap-3 transition-colors"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-slate-900 truncate">{res.designation}</p>
                                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                                                            <span className="text-blue-600">{res.supplierName}</span>
                                                            <span>•</span>
                                                            <span>{res.lastDate}</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm font-medium text-emerald-600 tabular-nums shrink-0">
                                                        {res.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                                                        <span className="text-[11px] ml-0.5">DT</span>
                                                    </p>
                                                </button>
                                            ))}
                                        </AnchoredDropdown>
                                    </div>

                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <input
                                            type="number"
                                            placeholder="Qté"
                                            className={inputClass + ' w-20 text-center'}
                                            value={item.quantity}
                                            onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                                        />
                                        <input
                                            type="number"
                                            step="0.001"
                                            placeholder="Prix"
                                            className={inputClass + ' w-28 text-center'}
                                            value={item.unitPrice || ''}
                                            onChange={e => handleItemChange(idx, 'unitPrice', e.target.value)}
                                        />
                                        {newItems.length > 1 && (
                                            <button
                                                onClick={() => handleRemoveItemRow(idx)}
                                                className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* VIEW ORDER MODAL */}
            <Modal
                open={!!viewingOrder}
                onClose={() => setViewingOrder(null)}
                title={viewingOrder?.supplier_name}
                description={viewingOrder ? `Livré le ${viewingOrder.date}` : undefined}
                size="lg"
                footer={
                    <>
                        <div className="mr-auto text-left">
                            <p className="text-xs text-slate-500">Valeur totale TTC</p>
                            <p className="text-lg font-semibold text-slate-900 tabular-nums">
                                {viewingOrder ? orderTotal(viewingOrder).toLocaleString(undefined, { minimumFractionDigits: 3 }) : '0'}
                                <span className="text-xs text-slate-400 ml-1">DT</span>
                            </p>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                            Archivé
                        </span>
                    </>
                }
            >
                {viewingOrder && (
                    <div className="space-y-3">
                        {(viewingOrder.items || []).map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-900">{item.article_name}</p>
                                    <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                                        {item.quantity} {item.unit} × {item.unitPrice?.toLocaleString(undefined, { minimumFractionDigits: 3 })} DT
                                    </p>
                                </div>
                                <p className="text-sm font-medium text-slate-900 tabular-nums shrink-0">
                                    {((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 3 })}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>
        </div>
    );
}
