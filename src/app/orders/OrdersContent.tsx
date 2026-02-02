'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { ShoppingCart, Plus, Calendar, Package, Truck, CheckCircle2, XCircle, ChevronDown, ChevronUp, Trash2, Save, User, Search, Store, Pencil, Eye, TrendingUp, ArrowRight, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import { motion, AnimatePresence } from 'framer-motion';

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
    const { currentProject } = useProject();
    const supabase = useMemo(() => createClient(), []);

    // Main Data
    const [orders, setOrders] = useState<Order[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const { userProfile, isAdmin: authIsAdmin } = useAuth();
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

    const filteredOrders = orders.filter(o =>
        o.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.items?.some(i => i.article_name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const pendingOrders = filteredOrders.filter(o => o.status === 'pending');
    const deliveredOrders = filteredOrders.filter(o => o.status === 'delivered');

    // Total Estimate
    const totalEstimate = newItems.reduce((sum, i) => sum + (i.totalPrice || 0), 0);

    return (
        <div className="max-w-[1600px] mx-auto p-6 space-y-10 pb-32 font-jakarta bg-slate-50 min-h-screen">
            {/* Premium Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 rounded-[2.5rem] p-8 md:p-10 text-white relative overflow-hidden shadow-2xl shadow-slate-900/20"
            >
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-400/20 via-transparent to-transparent rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4"></div>

                <div className="relative z-10 flex flex-col xl:flex-row justify-between items-center gap-8">
                    <div className="space-y-4 w-full xl:w-auto text-center xl:text-left">
                        <div className="flex items-center justify-center xl:justify-start gap-3">
                            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg">
                                <ShoppingCart className="h-5 w-5 text-blue-400" />
                            </div>
                            <span className="text-blue-400 font-black tracking-[0.2em] uppercase text-[10px]">Supply Chain & Logistique</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-tighter leading-tight">
                            Mes <span className="text-blue-400">Commandes</span>
                            <br />
                            <span className="text-white/40">& Approvisionnements</span>
                        </h1>
                    </div>

                    <div className="w-full xl:w-auto flex flex-col md:flex-row items-center gap-4 lg:gap-6">
                        <div className="relative w-full md:w-[400px] group">
                            <div className="absolute inset-0 bg-blue-400/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Rechercher une commande..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white/10 backdrop-blur-xl border border-white/10 text-white h-14 pl-12 pr-4 rounded-2xl font-bold text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all uppercase"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            {authIsAdmin && selectedOrders.length > 0 && (
                                <button
                                    onClick={handleDeleteSelected}
                                    className="p-4 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all duration-500 flex items-center gap-2"
                                >
                                    <Trash2 className="h-5 w-5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{selectedOrders.length}</span>
                                </button>
                            )}
                            <button
                                onClick={openAdd}
                                className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-slate-100 transition-all shadow-xl shadow-white/5 active:scale-95 flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" /> NOUVELLE COMMANDE
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Content Sections */}
            <div className="space-y-16">
                {/* PENDING ORDERS COLUMN */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                                <Truck className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">En Cours de Livraison</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Suivi logistique actif</p>
                            </div>
                        </div>
                        <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-3 py-1 rounded-full">{pendingOrders.length} UNITÉS</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence mode="popLayout">
                            {pendingOrders.map((order, idx) => (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="luxury-card bg-white p-6 border-none shadow-xl shadow-slate-200/40 relative overflow-hidden group"
                                >
                                    <div className={`absolute top-0 left-0 w-1.5 h-full ${order.supplier_color} opacity-40`} />

                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-start gap-4">
                                            {authIsAdmin && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedOrders.includes(order.id)}
                                                    onChange={() => toggleSelectOrder(order.id)}
                                                    className="mt-1 h-5 w-5 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all"
                                                />
                                            )}
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest text-white px-2.5 py-1 rounded-lg ${order.supplier_color}`}>
                                                        {order.supplier_name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                                    <Calendar className="h-3 w-3 mr-1.5 text-slate-300" />
                                                    PRÉVU LE : {order.date}
                                                </div>
                                            </div>
                                        </div>

                                        {authIsAdmin && (
                                            <button
                                                onClick={() => openEdit(order)}
                                                className="p-3 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl text-slate-400 transition-all shadow-sm"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="bg-slate-50/50 rounded-2xl p-4 space-y-3 mb-6 border border-slate-100/50">
                                        {(order.items || []).map((item, iIdx) => (
                                            <div key={iIdx} className="flex justify-between items-center group/item">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                                    <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{item.article_name}</span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xs font-black text-slate-900 tabular-nums tracking-tighter">
                                                        {((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-[10px] text-slate-300">DT</span>
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
                                                        {item.quantity} {item.unit} × {item.unitPrice?.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-3">
                                        {userProfile?.role !== 'viewer' && (
                                            <button
                                                onClick={() => handleUpdateStatus(order.id, 'delivered')}
                                                className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                                Confirmer Réception
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {pendingOrders.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="p-16 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center gap-4"
                            >
                                <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-200">
                                    <Package className="h-8 w-8" />
                                </div>
                                <p className="uppercase font-black tracking-widest text-slate-400 text-[10px]">Aucune commande en cours d'acheminement</p>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* DELIVERED ORDERS SECTION */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Historique Livraisons</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Archive des réceptions</p>
                            </div>
                        </div>
                        <span className="bg-emerald-100 text-emerald-600 text-[10px] font-black px-3 py-1 rounded-full">{deliveredOrders.length} LIVRÉES</span>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="luxury-card bg-white border-none shadow-2xl shadow-slate-200/50 overflow-hidden"
                    >
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-900">
                                        <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-[0.2em] w-20 text-center">#</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-white uppercase tracking-[0.2em]">Partenaire</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-white uppercase tracking-[0.2em]">Date de Réception</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-white uppercase tracking-[0.2em]">Contenu de la Commande</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-white uppercase tracking-[0.2em] text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {deliveredOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-200">
                                                        <Clock className="h-6 w-6" />
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Aucune donnée archivée</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        deliveredOrders.map(order => (
                                            <tr key={order.id} className="hover:bg-slate-50/50 transition-all duration-300 group">
                                                <td className="px-8 py-6 text-center">
                                                    {authIsAdmin && (
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedOrders.includes(order.id)}
                                                            onChange={() => toggleSelectOrder(order.id)}
                                                            className="h-4 w-4 rounded-lg border-2 border-slate-200 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                                                        />
                                                    )}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{order.supplier_name}</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="text-sm font-black text-slate-400 tabular-nums">{order.date}</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <p className="text-xs text-slate-500 font-medium line-clamp-1">
                                                        {(order.items || []).map(i => i.article_name).join(', ')}
                                                    </p>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button
                                                            onClick={() => setViewingOrder(order)}
                                                            className="p-3 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl text-slate-400 transition-all shadow-sm border border-slate-100"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        <div className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                                                            LIVRÉ & ARCHIVÉ
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* ADD MODAL with Enhanced Search */}
            <AnimatePresence>
                {isAdding && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4" onClick={closeModal}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="bg-slate-900 p-8 text-white flex justify-between items-center shrink-0">
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tight">
                                        {isEditing ? 'Modifier la Commande' : 'Nouvelle Commande'}
                                    </h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Planification des approvisionnements</p>
                                </div>
                                <button onClick={closeModal} className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-rose-500 transition-all group">
                                    <XCircle className="h-6 w-6 group-hover:scale-110 transition-transform" />
                                </button>
                            </div>

                            <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 flex-1">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Fournisseur</label>
                                        <select
                                            className="luxury-input h-14"
                                            value={newOrder.supplierId}
                                            onChange={e => setNewOrder({ ...newOrder, supplierId: e.target.value })}
                                        >
                                            <option value="">Sélectionner un partenaire...</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Date Prévue</label>
                                        <input
                                            type="date"
                                            className="luxury-input h-14"
                                            value={newOrder.date}
                                            onChange={e => setNewOrder({ ...newOrder, date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Articles à commander</label>
                                        <button onClick={handleAddItemRow} className="text-[10px] font-black text-blue-500 hover:text-blue-600 uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-xl transition-all">+ Ajouter Ligne</button>
                                    </div>
                                    <div className="space-y-4">
                                        {newItems.map((item, idx) => (
                                            <div key={idx} className="relative flex flex-col md:flex-row gap-4 items-end bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                                <div className="flex-1 relative w-full">
                                                    <div className="relative group">
                                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                                        <input
                                                            placeholder="Rechercher un article..."
                                                            className="luxury-input h-14 pl-12"
                                                            value={item.article_name}
                                                            onChange={e => handleItemChange(idx, 'article_name', e.target.value)}
                                                            onFocus={() => handleItemChange(idx, 'article_name', item.article_name)}
                                                        />
                                                    </div>

                                                    <AnimatePresence>
                                                        {activeSearchIndex === idx && searchResults.length > 0 && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: 10 }}
                                                                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[120] max-h-60 overflow-y-auto"
                                                            >
                                                                {searchResults.map((res, sIdx) => (
                                                                    <button
                                                                        key={sIdx}
                                                                        onClick={() => handleSelectCatalogItem(idx, res)}
                                                                        className="w-full text-left p-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex justify-between items-center group transition-colors"
                                                                    >
                                                                        <div>
                                                                            <p className="font-black text-slate-900 text-xs uppercase tracking-tight">{res.designation}</p>
                                                                            <div className="flex items-center gap-2 text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1">
                                                                                <span className="text-blue-500">{res.supplierName}</span>
                                                                                <span className="text-slate-200">•</span>
                                                                                <span>{res.lastDate}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="font-black text-emerald-600 text-xs tabular-nums">{res.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-[9px]">Dt</span></p>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>

                                                <div className="flex gap-3 w-full md:w-auto">
                                                    <div className="w-24">
                                                        <input
                                                            type="number"
                                                            className="luxury-input h-14 text-center font-black"
                                                            value={item.quantity}
                                                            onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="w-32">
                                                        <input
                                                            type="number"
                                                            step="0.001"
                                                            className="luxury-input h-14 text-center font-black"
                                                            value={item.unitPrice || ''}
                                                            onChange={e => handleItemChange(idx, 'unitPrice', e.target.value)}
                                                        />
                                                    </div>
                                                    {newItems.length > 1 && (
                                                        <button onClick={() => handleRemoveItemRow(idx)} className="h-14 w-14 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all">
                                                            <Trash2 className="h-5 w-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 shrink-0">
                                <div className="text-center md:text-left">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valeur Estimée</p>
                                    <p className="text-3xl font-black text-slate-900 tabular-nums">{totalEstimate.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-[12px] text-slate-400">DT</span></p>
                                </div>
                                <button
                                    onClick={handleSaveOrder}
                                    disabled={!newOrder.supplierId || newItems.every(i => !i.article_name)}
                                    className="w-full md:w-auto bg-slate-900 text-white px-12 py-5 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10 disabled:bg-slate-200 disabled:shadow-none active:scale-95 flex items-center justify-center gap-3"
                                >
                                    <Truck className="h-5 w-5" />
                                    ENREGISTRER LA COMMANDE
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* View Order Modal */}
            <AnimatePresence>
                {viewingOrder && (
                    <div className="fixed inset-0 z-[115] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4" onClick={() => setViewingOrder(null)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className={`p-8 text-white flex justify-between items-center shrink-0 ${viewingOrder.supplier_color}`}>
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tight">{viewingOrder.supplier_name}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Calendar className="h-3 w-3 opacity-60" />
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Livré le {viewingOrder.date}</p>
                                    </div>
                                </div>
                                <button onClick={() => setViewingOrder(null)} className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all group">
                                    <XCircle className="h-6 w-6 group-hover:scale-110 transition-transform" />
                                </button>
                            </div>
                            <div className="p-8 overflow-y-auto custom-scrollbar">
                                <div className="space-y-6">
                                    {(viewingOrder.items || []).map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                                            <div>
                                                <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{item.article_name}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{item.quantity} {item.unit} × {item.unitPrice?.toLocaleString(undefined, { minimumFractionDigits: 3 })} DT</p>
                                            </div>
                                            <p className="text-sm font-black text-slate-900 tabular-nums">
                                                {((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 3 })}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valeur Totale TTC</p>
                                    <p className="text-2xl font-black text-slate-900 tabular-nums mt-1">
                                        {(viewingOrder.items || []).reduce((sum, i) => sum + ((i.quantity || 0) * (i.unitPrice || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-[10px] text-slate-400">DT</span>
                                    </p>
                                </div>
                                <div className="px-6 py-3 rounded-2xl bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">
                                    ARCHIVÉ
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
