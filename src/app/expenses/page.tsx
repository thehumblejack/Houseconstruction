'use client';

import React, { useState, useRef } from 'react';
import {
    Plus, Receipt, FileText, Trash2, TrendingUp, DollarSign,
    Upload, X, CheckCircle2, Clock, Eye, AlertCircle, Download, FileDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Types ---
type PaymentStatus = 'paid' | 'pending';

interface InvoiceItem {
    code: string;
    designation: string;
    unit: string;
    quantity: number;
    unitPrice: number; // This is unitPrice TTC for older data
    unitPriceHT?: number;
    crt?: string;
    remise?: number;
    totalHRE?: number;
    tva?: string;
    totalTTC: number;
}

interface Expense {
    id: string;
    date: string;
    item: string; // Num Facture
    quantity: string;
    price: number;
    status: PaymentStatus;
    invoiceImage: string | null;
    items?: InvoiceItem[];
    // Mostakbel Header specific fields
    codeClient?: string;
    client?: string;
    adresse?: string;
    cin?: string;
    lieuLivraison?: string;
    dateAutorisation?: string;
    numAutorisation?: string;
    dateBCommande?: string;
    numBCommande?: string;
    // Beton specific fields
    toupie?: string;
    chaufeur?: string;
    pompe?: string;
    pompiste?: string;
    heure?: string;
    adjuvant?: string;
    classe?: string;
    created_at?: string;
}

type SupplierType = 'beton' | 'fer' | 'ahmed' | 'ali';

interface Deposit {
    id: string;
    date: string;
    amount: number;
    receiptImage: string | null;
    ref?: string;
    payer?: string;
    commercial?: string;
}

interface SupplierData {
    id: SupplierType;
    name: string;
    description: string;
    color: string;
    expenses: Expense[];
    tva?: string;
    tel?: string;
    address?: string;
    clientName?: string;
    deposits?: Deposit[];
}

// --- Components ---

// Status Badge Component
const StatusBadge = ({ status, onClick }: { status: PaymentStatus, onClick: () => void }) => {
    return (
        <button
            onClick={onClick}
            type="button"
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all border ${status === 'paid'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                }`}
        >
            {status === 'paid' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {status === 'paid' ? 'PAYÉ' : 'ATTENTE'}
        </button>
    );
};

// Invoice Modal Component
const ImageViewer = ({ src, onClose }: { src: string, onClose: () => void }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
                onClick={onClose}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2"
            >
                <X className="h-8 w-8" />
            </button>
            <img
                src={src}
                alt="Facture"
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl bg-white"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    </div>
);

import { useAuth } from '@/context/AuthContext';

import { createClient } from '@/lib/supabase';
import { useCallback, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ExpensesContent() {
    const { isAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState<SupplierType>('beton');
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');
    const [newSupplierColor, setNewSupplierColor] = useState('bg-slate-500');

    // Deposit State
    const [showAddDepositModal, setShowAddDepositModal] = useState(false);
    const [newDepositData, setNewDepositData] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        payer: '',
        commercial: '',
        ref: ''
    });
    const [editingDepositId, setEditingDepositId] = useState<string | null>(null);

    const [suppliers, setSuppliers] = useState<Record<string, SupplierData>>({}); // Change type to string to allow dynamic keys

    const searchParams = useSearchParams();

    // Sync URL params to State
    useEffect(() => {
        if (!loading && Object.keys(suppliers).length > 0) {
            const tabParam = searchParams.get('tab');
            if (tabParam && suppliers[tabParam] && activeTab !== tabParam) {
                setActiveTab(tabParam as SupplierType);
            }

            const highlightId = searchParams.get('highlight');
            if (highlightId) {
                // Wait for tab switch and render
                setTimeout(() => {
                    const el = document.getElementById(highlightId);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // Add highlight effect
                        el.style.backgroundColor = '#fef3c7'; // amber-100
                        el.style.transition = 'background-color 1s';
                        setTimeout(() => {
                            el.style.backgroundColor = '';
                        }, 3000);
                    }
                }, 500);
            }
        }
    }, [searchParams, loading, suppliers]);

    const supabase = createClient();

    const fetchData = useCallback(async () => {
        try {
            const { data: suppliersData } = await supabase.from('suppliers').select('*');
            const { data: expensesData } = await supabase.from('expenses').select('*, items:invoice_items(*)');
            const { data: depositsData } = await supabase.from('deposits').select('*');

            if (suppliersData && expensesData) {
                const newSuppliers: Record<string, SupplierData> = {};

                suppliersData.forEach((s: any) => {
                    newSuppliers[s.id] = {
                        id: s.id as SupplierType,
                        name: s.name,
                        description: s.description || '',
                        address: s.address || '',
                        tva: s.tva || '',
                        tel: s.tel || '',
                        clientName: s.client_name || '',
                        color: s.color || 'bg-slate-500',
                        expenses: [],
                        deposits: []
                    };
                });

                expensesData.forEach((e: any) => {
                    if (newSuppliers[e.supplier_id]) {
                        newSuppliers[e.supplier_id].expenses.push({
                            id: e.id,
                            date: e.date,
                            item: e.item,
                            quantity: e.quantity || '',
                            price: e.price,
                            status: e.status as PaymentStatus,
                            invoiceImage: e.invoice_image,
                            items: e.items?.map((i: any) => ({
                                code: i.code || '',
                                designation: i.designation || '',
                                unit: i.unit || '',
                                quantity: i.quantity || 0,
                                unitPrice: i.unit_price || 0,
                                unitPriceHT: i.unit_price_ht,
                                crt: i.crt,
                                remise: i.remise,
                                totalHRE: i.total_hre,
                                tva: i.tva,
                                totalTTC: i.total_ttc || 0
                            })) || [],
                            // Mostakbel specific
                            codeClient: e.code_client,
                            client: e.client,
                            adresse: e.adresse,
                            cin: e.cin,
                            lieuLivraison: e.lieu_livraison,
                            dateAutorisation: e.date_autorisation,
                            numAutorisation: e.num_autorisation,
                            dateBCommande: e.date_b_commande,
                            numBCommande: e.num_b_commande,
                            // Beton specific
                            toupie: e.toupie,
                            chaufeur: e.chaufeur,
                            pompe: e.pompe,
                            pompiste: e.pompiste,
                            heure: e.heure,
                            adjuvant: e.adjuvant,
                            classe: e.classe
                        });
                    }
                });

                if (depositsData) {
                    depositsData.forEach((d: any) => {
                        if (newSuppliers[d.supplier_id]) {
                            newSuppliers[d.supplier_id].deposits?.push({
                                id: d.id,
                                date: d.date,
                                amount: d.amount,
                                receiptImage: d.receipt_image,
                                ref: d.ref,
                                payer: d.payer,
                                commercial: d.commercial
                            });
                        }
                    });
                }

                // Sort expenses by date desc (naive string sort or better logic needed? strings are dd/mm/yyyy so naive wont work well)
                // For now, let's just keep DB order or reverse.
                // ideally convert date string to Date object for sort.
                Object.values(newSuppliers).forEach(s => {
                    s.expenses.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()); // relying on created_at not present in interface but present in local obj? no.
                    // we don't have created_at in interface. Let's trust insert order or use date string parsing later.
                });

                setSuppliers(newSuppliers as Record<SupplierType, SupplierData>);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchData();

        // Realtime subscription
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                },
                (payload) => {
                    console.log('Change received!', payload);
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData, supabase]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [scanState, setScanState] = useState<'idle' | 'scanning' | 'review'>('idle');
    const [scannedResult, setScannedResult] = useState<Expense | null>(null);

    // Calculations
    const isPayment = (item: string) => {
        const up = item.toUpperCase();
        return up.includes('REÇU') ||
            up.includes('PAIEMENT') ||
            up.includes('AVANCE') ||
            up.includes('ACOMPTE') ||
            up.includes('CHEQUE') ||
            up.includes('CHÈQUE') ||
            up.includes('VERSEMENT') ||
            up.includes('VIREMENT');
    };

    const supplierStats = useMemo(() => Object.values(suppliers).map(s => {
        const d_Total = s.deposits?.reduce((sum, d) => sum + d.amount, 0) || 0;
        const hasDeposits = (s.deposits && s.deposits.length > 0);
        const isLabor = s.id === 'ali';

        let totalInvoiceAmount = 0;

        s.expenses.forEach(e => {
            // All expenses count towards Total Montant
            totalInvoiceAmount += e.price;
        });

        // Scenario 1: Has Deposits (Mostakbel)
        // Payé = Sum(Deposits)
        // Reste = Payé - TotalInvoiceAmount

        // Scenario 2: No Deposits (Ben Hdya, Ali, Cap Beton now)
        // Payé = TotalInvoiceAmount
        // Reste = 0

        let computedPaid = 0;
        let computedRemaining = 0;

        if (hasDeposits) {
            computedPaid = d_Total;
            computedRemaining = d_Total - totalInvoiceAmount;
        } else {
            // For standard suppliers, we calculate paid based on status
            // All expenses (including REÇU) with status='paid' count as paid
            const paidExpenses = s.expenses.filter(e => e.status === 'paid');
            computedPaid = paidExpenses.reduce((sum, e) => sum + e.price, 0);

            // Remaining = Paid - Cost
            computedRemaining = computedPaid - totalInvoiceAmount;

            // @ts-ignore
            if (s.id === 'test' || s.id === 'cap_beton' || s.name.toLowerCase().includes('test') || s.name.toLowerCase().includes('cap')) {
                console.log(`--- DEBUG: ${s.name} ---`);
                console.log('Total Montant (All expenses):', totalInvoiceAmount);
                console.log('Paid (Status=paid):', computedPaid);
                console.log('Solde (Paid - Cost):', computedRemaining);
                console.log('--- DETAILS ---');
                s.expenses.forEach(e => {
                    console.log(`Item: ${e.item} | Price: ${e.price} | Status: ${e.status}`);
                });
            }
        }

        return {
            id: s.id as SupplierType,
            name: s.name,
            totalCost: totalInvoiceAmount,
            totalPaid: computedPaid,
            remaining: computedRemaining,
            color: s.color
        };
    }), [suppliers]);

    const grandTotal = supplierStats.reduce((sum, s) => sum + s.totalCost, 0);
    const totalPaidGlobal = supplierStats.reduce((sum, s) => sum + s.totalPaid, 0);
    // Reste à Payer = Sum of ONLY negative soldes (debts)
    const totalRemainingGlobal = supplierStats.reduce((sum, s) => sum + (s.remaining < 0 ? s.remaining : 0), 0);

    const currentSupplier = suppliers[activeTab];
    const activeStat = supplierStats.find(s => s.id === activeTab)!;
    // We no longer need manual currentSolde calculation, we use activeStat

    // Handlers
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setScanState('scanning');
            setTimeout(() => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const mockExtracted: Expense = {
                        id: Date.now().toString(),
                        date: '10/01/2026',
                        item: '2600XXX',
                        codeClient: '6505',
                        client: 'SAHBI HEDOUSSA',
                        adresse: 'AHF CITE EL WAFA MREZGHA NABEU',
                        cin: '01692387',
                        lieuLivraison: 'SIEGE',
                        quantity: 'Lot Réceptionné',
                        price: 0,
                        status: 'pending',
                        invoiceImage: reader.result as string,
                        items: [
                            { code: 'ART-SCAN', designation: 'ARTICLE DÉTECTÉ PAR IA', crt: '', unit: 'UNI', quantity: 1, unitPriceHT: 100.000, remise: 0, totalHRE: 100.000, tva: '19%', unitPrice: 119.000, totalTTC: 119.000 },
                            { code: 'TIMBRE', designation: 'DROIT DE TIMBRE', crt: '', unit: 'UNI', quantity: 1, unitPriceHT: 1.000, remise: 0, totalHRE: 1.000, tva: '0%', unitPrice: 1.000, totalTTC: 1.000 }
                        ]
                    };
                    mockExtracted.price = mockExtracted.items!.reduce((sum, i) => sum + i.totalTTC, 0);
                    setScannedResult(mockExtracted);
                    setScanState('review');
                };
                reader.readAsDataURL(file);
            }, 2000);
        }
    };

    const confirmScan = () => {
        if (!scannedResult) return;
        setSuppliers(prev => ({
            ...prev,
            [activeTab]: {
                ...prev[activeTab],
                expenses: [scannedResult, ...prev[activeTab].expenses]
            }
        }));
        setScanState('idle');
        setScannedResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };


    const updateStatus = async (id: string, newStatus: PaymentStatus) => {
        try {
            const { error } = await supabase
                .from('expenses')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            // Force immediate refresh
            await fetchData();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Impossible de mettre à jour le statut');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer cet enregistrement définitivement ?')) return;
        try {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', id);

            if (error) throw error;
            // Realtime subscription will handle the UI update
        } catch (error) {
            console.error('Error deleting expense:', error);
            alert('Impossible de supprimer');
        }
    };



    const handleAddSupplier = async () => {
        if (!newSupplierName) return;
        const id = newSupplierName.toLowerCase().replace(/\s+/g, '_');

        try {
            const { error } = await supabase.from('suppliers').insert({
                id,
                name: newSupplierName,
                color: newSupplierColor
            });

            if (error) throw error;
            setShowAddSupplierModal(false);
            setNewSupplierName('');
            // Realtime will update UI
        } catch (err) {
            console.error(err);
            alert('Erreur lors de l\'ajout');
        }
    };

    const handleDeleteSupplier = async (id: string, name: string) => {
        if (!confirm(`Attention ! Vous allez supprimer le fournisseur "${name}" et TOUTES ses dépenses associées. Cette action est irréversible.\n\nConfirmer la suppression ?`)) return;
        const { error } = await supabase.from('suppliers').delete().eq('id', id);
        if (error) {
            console.error('Error deleting supplier:', error);
            alert("Erreur lors de la suppression du fournisseur. Vérifiez vos permissions.");
        } else {
            // If we deleted the active tab, switch to another one if possible, or wait for realtime to update list.
            // We'll trust realtime or just switch to default.
            setActiveTab('beton'); // Fallback
        }
    };

    const handleAddDeposit = async () => {
        const amount = parseFloat(newDepositData.amount);
        if (isNaN(amount) || amount <= 0) {
            alert('Veuillez entrer un montant valide');
            return;
        }

        try {
            const { error } = await supabase.from('deposits').insert({
                supplier_id: activeTab,
                amount: amount,
                date: newDepositData.date, // Format YYYY-MM-DD expected by Postgres date or string
                payer: newDepositData.payer,
                commercial: newDepositData.commercial,
                ref: newDepositData.ref
                // invoice_image ? We can add upload later if needed
            });

            if (error) throw error;

            setShowAddDepositModal(false);
            setNewDepositData({
                amount: '',
                date: new Date().toISOString().split('T')[0],
                payer: '',
                commercial: '',
                ref: ''
            });
            fetchData(); // Refresh data
        } catch (error) {
            console.error('Error adding deposit:', error);
            alert("Erreur lors de l'ajout de l'acompte");
        }
    };

    const handleSaveDeposit = async () => {
        const amount = parseFloat(newDepositData.amount);
        if (isNaN(amount) || amount <= 0) {
            alert('Veuillez entrer un montant valide');
            return;
        }

        try {
            if (editingDepositId) {
                // UPDATE existing
                const { error } = await supabase.from('deposits').update({
                    amount: amount,
                    date: newDepositData.date,
                    payer: newDepositData.payer,
                    commercial: newDepositData.commercial,
                    ref: newDepositData.ref
                }).eq('id', editingDepositId);

                if (error) throw error;
            } else {
                // INSERT new
                const { error } = await supabase.from('deposits').insert({
                    supplier_id: activeTab,
                    amount: amount,
                    date: newDepositData.date,
                    payer: newDepositData.payer,
                    commercial: newDepositData.commercial,
                    ref: newDepositData.ref
                });

                if (error) throw error;
            }

            closeDepositModal();
            fetchData();
        } catch (error) {
            console.error('Error saving deposit:', error);
            alert("Erreur lors de l'enregistrement");
        }
    };

    const handleDeleteDeposit = async (id: string) => {
        if (!confirm('Supprimer cet acompte définitivement ?')) return;
        try {
            const { error } = await supabase.from('deposits').delete().eq('id', id);
            if (error) throw error;
            fetchData();
        } catch (error) {
            console.error('Error deleting deposit:', error);
            alert("Impossible de supprimer l'acompte");
        }
    };

    const handleEditDeposit = (deposit: Deposit) => {
        setNewDepositData({
            amount: deposit.amount.toString(),
            date: deposit.date,
            payer: deposit.payer || '',
            commercial: deposit.commercial || '',
            ref: deposit.ref || ''
        });
        setEditingDepositId(deposit.id);
        setShowAddDepositModal(true);
    };

    const closeDepositModal = () => {
        setShowAddDepositModal(false);
        setEditingDepositId(null);
        setNewDepositData({
            amount: '',
            date: new Date().toISOString().split('T')[0],
            payer: '',
            commercial: '',
            ref: ''
        });
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Bilan Dépenses - MaMaison", 14, 22);
        doc.setFontSize(11);
        doc.text(`Généré le: ${new Date().toLocaleDateString()}`, 14, 30);

        const tableData: any[] = [];

        Object.values(suppliers).forEach(s => {
            // Header for supplier
            tableData.push([{ content: s.name.toUpperCase(), colSpan: 5, styles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' } }]);

            s.expenses.forEach(e => {
                tableData.push([
                    e.date,
                    e.item,
                    e.status === 'paid' ? 'Payé' : 'Attente',
                    e.price.toLocaleString(undefined, { minimumFractionDigits: 3 }) + ' DT',
                    '-'
                ]);

                if (e.items && e.items.length > 0) {
                    e.items.forEach(i => {
                        tableData.push([
                            '',
                            `-> ${i.designation}`,
                            '-',
                            '-',
                            i.totalTTC.toLocaleString(undefined, { minimumFractionDigits: 3 }) + ' DT'
                        ]);
                    });
                }
            });

            // Subtotal row
            tableData.push([
                { content: 'Total ' + s.name, colSpan: 3, styles: { fontStyle: 'bold', halign: 'right' } },
                { content: s.expenses.reduce((sum, x) => sum + x.price, 0).toLocaleString(undefined, { minimumFractionDigits: 3 }) + ' DT', colSpan: 2, styles: { fontStyle: 'bold' } }
            ]);
        });

        // Final Total
        tableData.push([
            { content: 'TOTAL GÉNÉRAL', colSpan: 3, styles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold', halign: 'right' } },
            { content: totalRemainingGlobal.toLocaleString(undefined, { minimumFractionDigits: 3 }) + ' DT', colSpan: 2, styles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold' } }
        ]);

        autoTable(doc, {
            head: [['Date', 'Désignation', 'Statut', 'Montant', 'Détail TTC']],
            body: tableData,
            startY: 40,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [44, 62, 80] }
        });

        doc.save("Bilan_MaMaison.pdf");
    };



    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center">
                    <div className="h-10 w-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-sm font-black text-slate-500 uppercase tracking-widest animate-pulse">Chargement des données...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-3 md:p-6 space-y-4 md:space-y-6 pb-20 font-jakarta">
            {/* Image Modal */}
            {viewingImage && <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} />}

            {/* Global Stats - Compact */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
                <div className="bg-slate-900 text-white p-3 md:p-5 rounded-xl shadow-lg border border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Chantier</p>
                    <h2 className="text-lg md:text-2xl font-black">{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-[10px] text-slate-500">DT</span></h2>
                </div>
                <div className="bg-white p-3 md:p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total Payé</p>
                    <h2 className="text-lg md:text-2xl font-black text-emerald-700">{totalPaidGlobal.toLocaleString(undefined, { minimumFractionDigits: 3 })}</h2>
                </div>
                <button
                    onClick={() => setShowBreakdown(true)}
                    className="bg-white p-3 md:p-5 rounded-xl border border-amber-200 shadow-sm text-left hover:bg-amber-50 transition-all group"
                >
                    <div className="flex justify-between items-start">
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Reste à Payer</p>
                        <AlertCircle className="h-3 w-3 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h2 className="text-lg md:text-2xl font-black text-amber-700">{totalRemainingGlobal.toLocaleString(undefined, { minimumFractionDigits: 3 })}</h2>
                </button>



                <button
                    onClick={handleExportPDF}
                    className="bg-white p-3 md:p-5 rounded-xl border border-slate-200 shadow-sm text-left hover:bg-slate-50 transition-all group flex flex-col justify-center items-center gap-2"
                >
                    <FileDown className="h-6 w-6 text-slate-400 group-hover:text-red-600 transition-colors" />
                    <span className="text-[10px] font-black text-slate-500 group-hover:text-red-700 uppercase">PDF</span>
                </button>
            </div>

            {/* Add Supplier Modal */}
            {showAddSupplierModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-sm">
                        <h3 className="text-lg font-black mb-4">Nouveau Fournisseur</h3>
                        <input
                            className="w-full border p-2 rounded mb-4 text-sm font-bold"
                            placeholder="Nom (ex: Quincaillerie X)"
                            value={newSupplierName}
                            onChange={(e) => setNewSupplierName(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowAddSupplierModal(false)} className="text-xs font-bold px-4 py-2 text-slate-500">Annuler</button>
                            <button onClick={handleAddSupplier} className="text-xs font-bold px-4 py-2 bg-slate-900 text-white rounded-lg">Ajouter</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Deposit Modal */}
            {showAddDepositModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                        <h3 className="text-lg font-black mb-4 text-slate-900 uppercase tracking-tight">
                            {editingDepositId ? 'Modifier Acompte' : 'Nouvel Acompte'}
                        </h3>

                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Montant (DT)</label>
                                <input
                                    type="number"
                                    className="w-full border border-slate-200 p-3 rounded-xl text-lg font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="0.000"
                                    autoFocus
                                    value={newDepositData.amount}
                                    onChange={(e) => setNewDepositData({ ...newDepositData, amount: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Date</label>
                                    <input
                                        type="date"
                                        className="w-full border border-slate-200 p-2 rounded-lg text-sm font-bold"
                                        value={newDepositData.date}
                                        onChange={(e) => setNewDepositData({ ...newDepositData, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Référence</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-200 p-2 rounded-lg text-sm font-bold"
                                        placeholder="Chèque/Virement..."
                                        value={newDepositData.ref}
                                        onChange={(e) => setNewDepositData({ ...newDepositData, ref: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Payeur</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-200 p-2 rounded-lg text-sm font-bold"
                                    placeholder="Qui a payé ?"
                                    value={newDepositData.payer}
                                    onChange={(e) => setNewDepositData({ ...newDepositData, payer: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Commercial</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-200 p-2 rounded-lg text-sm font-bold"
                                    placeholder="Reçu par..."
                                    value={newDepositData.commercial}
                                    onChange={(e) => setNewDepositData({ ...newDepositData, commercial: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={closeDepositModal} className="text-xs font-bold px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">Annuler</button>
                            <button onClick={handleSaveDeposit} className="text-xs font-bold px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4" />
                                {editingDepositId ? 'Enregistrer' : 'Confirmer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Breakdown Modal */}
            {showBreakdown && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={() => setShowBreakdown(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tighter">Bilan par Fournisseur</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Payé - Total Montant = Solde</p>
                            </div>
                            <X className="h-6 w-6 cursor-pointer hover:text-red-400 transition-colors" onClick={() => setShowBreakdown(false)} />
                        </div>
                        <div className="p-4 space-y-3">
                            {supplierStats.map(s => (
                                <div key={s.id} className="flex flex-col p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${s.color}`} />
                                            <span className="text-sm font-black text-slate-900 uppercase">{s.name}</span>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase">Total Montant</p>
                                            <p className="text-xs font-black text-slate-700">{s.totalCost.toLocaleString(undefined, { minimumFractionDigits: 3 })}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase">Payé</p>
                                            <p className="text-xs font-black text-emerald-600">{s.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 3 })}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[8px] font-bold text-slate-400 uppercase">Solde</p>
                                            <p className={`text-sm font-black ${s.remaining < 0 ? 'text-red-600' : 'text-blue-600'}`}>{s.remaining.toLocaleString(undefined, { minimumFractionDigits: 3 })}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase">Solde Général</span>
                            <span className={`text-xl font-black ${totalRemainingGlobal < 0 ? 'text-red-600' : 'text-slate-900'}`}>{totalRemainingGlobal.toLocaleString(undefined, { minimumFractionDigits: 3 })} DT</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Layout Main */}
            <div className="flex flex-col lg:flex-row gap-4">
                {/* Tabs Mobile Side Scroll / Table Desktop Sidebar */}
                <div className="w-full lg:w-64 flex-shrink-0">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible no-scrollbar">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Fournisseurs</span>
                            {isAdmin && (
                                <button onClick={() => setShowAddSupplierModal(true)} className="bg-slate-100 hover:bg-slate-200 p-1 rounded transition-colors">
                                    <Plus className="h-3 w-3 text-slate-600" />
                                </button>
                            )}
                        </div>
                        {(Object.values(suppliers) as SupplierData[]).map((sup) => (
                            <div key={sup.id} className="relative group">
                                <button
                                    onClick={() => setActiveTab(sup.id as any)}
                                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-all ${activeTab === sup.id
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    <span className="text-xs font-bold whitespace-nowrap truncate">{sup.name}</span>
                                </button>
                                {isAdmin && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteSupplier(sup.id, sup.name);
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Supprimer"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 space-y-4">
                    {/* Header Supplier */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">{currentSupplier.name}</h1>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black text-white ${currentSupplier.color}`}>
                                    {currentSupplier.id.toUpperCase()}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-xs">{currentSupplier.address || 'Tunisie'}</p>
                        </div>
                        <div className="flex gap-2">

                            <div className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-right">
                                <p className="text-[8px] font-black text-slate-500 uppercase">Total Montant</p>
                                <p className="text-sm font-black text-slate-900">{activeStat.totalCost.toLocaleString(undefined, { minimumFractionDigits: 3 })}</p>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg text-right">
                                <p className="text-[8px] font-black text-emerald-600 uppercase">Payé</p>
                                <p className="text-sm font-black text-emerald-800">{activeStat.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 3 })}</p>
                            </div>
                            <div className={`${activeStat.remaining < 0 ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'} border px-3 py-1.5 rounded-lg text-right`}>
                                <p className={`text-[8px] font-black ${activeStat.remaining < 0 ? 'text-red-500' : 'text-blue-500'} uppercase`}>Solde</p>
                                <p className={`text-sm font-black ${activeStat.remaining < 0 ? 'text-red-800' : 'text-blue-800'}`}>{activeStat.remaining.toLocaleString(undefined, { minimumFractionDigits: 3 })}</p>
                            </div>
                        </div>
                    </div>

                    {/* Fiche de Dépôts if applicable */}
                    {currentSupplier.deposits && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                            <div className="px-6 py-4 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase tracking-widest text-emerald-900 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-emerald-500" /> Historique Acomptes
                                </h3>
                                {isAdmin && (
                                    <button
                                        onClick={() => {
                                            setEditingDepositId(null);
                                            setNewDepositData({
                                                amount: '',
                                                date: new Date().toISOString().split('T')[0],
                                                payer: '',
                                                commercial: '',
                                                ref: ''
                                            });
                                            setShowAddDepositModal(true);
                                        }}
                                        className="bg-emerald-600 px-3 py-1.5 rounded-lg text-white text-[10px] font-bold uppercase hover:bg-emerald-500 transition-all flex items-center gap-1 shadow-lg shadow-emerald-500/20"
                                    >
                                        <Plus className="h-3 w-3" /> Nouveau
                                    </button>
                                )}
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[500px]">
                                    <thead className="bg-white/50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-3 w-32">Date</th>
                                            <th className="px-6 py-3">Référence / Payeur</th>
                                            <th className="px-6 py-3 text-right">Montant</th>
                                            <th className="px-6 py-3 text-right w-32">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {currentSupplier.deposits.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                                                    Aucun acompte enregistré
                                                </td>
                                            </tr>
                                        ) : (
                                            currentSupplier.deposits.map(d => (
                                                <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-6 py-4 text-xs font-bold text-slate-400 font-mono">
                                                        {d.date}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            {d.ref ? (
                                                                <span className="text-xs font-bold text-slate-700">{d.ref}</span>
                                                            ) : <span className="text-xs font-bold text-slate-300 italic">Sans réf.</span>}
                                                            {(d.payer || d.commercial) && (
                                                                <span className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">
                                                                    {d.payer} {d.commercial && `• ${d.commercial}`}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                                            {d.amount.toLocaleString(undefined, { minimumFractionDigits: 3 })} DT
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-all">
                                                            {(d.receiptImage || d.id === 'd_cap_1') && (
                                                                <button
                                                                    onClick={() => setViewingImage(d.receiptImage || 'https://via.placeholder.com/800x1000?text=Recu+476+3900DT')}
                                                                    className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition-colors"
                                                                    title="Voir reçu"
                                                                >
                                                                    <Eye className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                            {isAdmin && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleEditDeposit(d)}
                                                                        className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-500 transition-colors"
                                                                        title="Modifier"
                                                                    >
                                                                        <FileText className="h-3.5 w-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteDeposit(d.id)}
                                                                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                                                        title="Supprimer"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* AI Scanner Zone */}
                    {isAdmin && (
                        <div className="bg-white rounded-2xl p-6 border-2 border-dashed border-blue-200 hover:border-blue-400 transition-all flex flex-col items-center text-center">
                            {scanState === 'idle' ? (
                                <>
                                    <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mb-3 shadow-lg shadow-blue-200">
                                        <Upload className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase mb-1">Scanner un Bon de Livraison</h3>
                                    <p className="text-[10px] text-slate-400 mb-4 max-w-xs uppercase font-bold tracking-tighter">L'IA extraira automatiquement articles et prix</p>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="bg-slate-900 text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-slate-800 transition-all"
                                    >
                                        Sélectionner un fichier
                                    </button>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                </>
                            ) : scanState === 'scanning' ? (
                                <div className="py-2">
                                    <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                    <p className="text-[10px] font-black uppercase text-blue-600 animate-pulse">Lecture IA en cours...</p>
                                </div>
                            ) : (
                                <div className="w-full space-y-4 text-left">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <h3 className="text-[10px] font-black uppercase text-slate-900">Validation Pointage IA</h3>
                                        <X className="h-4 w-4 text-slate-300 cursor-pointer" onClick={() => setScanState('idle')} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2 bg-slate-50 rounded-lg">
                                            <p className="text-[8px] font-black text-slate-400 uppercase">N° BL</p>
                                            <p className="text-xs font-black">{scannedResult?.item}</p>
                                        </div>
                                        <div className="p-2 bg-slate-900 rounded-lg">
                                            <p className="text-[8px] font-black text-blue-400 uppercase">Total TTC</p>
                                            <p className="text-xs font-black text-white">{scannedResult?.price.toLocaleString(undefined, { minimumFractionDigits: 3 })} DT</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={confirmScan}
                                        className="w-full bg-emerald-600 text-white py-2 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-500 shadow-lg shadow-emerald-100"
                                    >
                                        Valider et Archiver
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Table Responsive */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Historique des Pièces</h4>
                            <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase">{currentSupplier.expenses.length} docs</span>
                        </div>

                        <div className="overflow-x-auto overflow-y-hidden">
                            <table className="w-full text-left border-collapse min-w-[500px]">
                                <thead className="bg-slate-50/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-100 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center">
                                    <tr>
                                        <th className="px-4 py-3 text-left w-24">État</th>
                                        <th className="px-4 py-3 text-left w-32">Date</th>
                                        <th className="px-4 py-3 text-left">Référence</th>
                                        <th className="px-4 py-3 text-right">Montant</th>
                                        <th className="px-4 py-3 text-right w-32">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentSupplier.expenses.map(e => (
                                        <React.Fragment key={e.id}>
                                            <tr id={e.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-all duration-200">
                                                <td className="px-4 py-3">
                                                    <div className={`
                                                        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold transition-all border
                                                        ${e.status === 'paid'
                                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                            : 'bg-amber-50 text-amber-600 border-amber-100'}
                                                    `}>
                                                        {e.status === 'paid' ? 'PAYÉ' : 'ATTENTE'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-[11px] font-bold text-slate-400 font-mono tracking-tight">{e.date}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs font-bold text-slate-700 uppercase group-hover:text-blue-600 transition-colors cursor-default">
                                                        {e.item}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm font-black text-slate-900 tabular-nums tracking-tight">
                                                    {e.price.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-[10px] text-slate-400 font-bold ml-0.5">DT</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-all duration-300">
                                                        <select
                                                            value={e.status}
                                                            onChange={(ev) => {
                                                                const newStatus = ev.target.value as PaymentStatus;
                                                                updateStatus(e.id, newStatus);
                                                            }}
                                                            className="w-4 h-4 opacity-0 absolute"
                                                        />
                                                        {/* Custom Action Buttons for minimal look */}
                                                        <button
                                                            onClick={() => updateStatus(e.id, e.status === 'paid' ? 'pending' : 'paid')}
                                                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                                            title="Changer statut"
                                                        >
                                                            {e.status === 'paid' ? <X className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                                        </button>

                                                        {e.invoiceImage && (
                                                            <button onClick={() => setViewingImage(e.invoiceImage!)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition-colors">
                                                                <Eye className="h-3.5 w-3.5" />
                                                            </button>
                                                        )}
                                                        {isAdmin && (
                                                            <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Détails Table */}
                                            {e.items && (
                                                <tr>
                                                    <td colSpan={5} className="p-2 bg-slate-50/50">
                                                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                                                            {/* Detailed Metadata Row (Provider Specific) */}
                                                            {(e.toupie || e.client || e.lieuLivraison) && (
                                                                <div className="p-3 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4 md:gap-8">
                                                                    {e.client && (
                                                                        <div className="space-y-0.5">
                                                                            <p className="text-[7px] font-black text-slate-400 uppercase">Client / Chantier</p>
                                                                            <p className="text-[10px] font-black text-slate-900 uppercase">{e.client} {e.codeClient && `(${e.codeClient})`}</p>
                                                                        </div>
                                                                    )}
                                                                    {e.lieuLivraison && (
                                                                        <div className="space-y-0.5">
                                                                            <p className="text-[7px] font-black text-slate-400 uppercase">Destination</p>
                                                                            <p className="text-[10px] font-black text-slate-900 uppercase">{e.lieuLivraison}</p>
                                                                        </div>
                                                                    )}
                                                                    {e.toupie && (
                                                                        <div className="space-y-0.5">
                                                                            <p className="text-[7px] font-black text-blue-400 uppercase">Toupie / Camion</p>
                                                                            <p className="text-[10px] font-black text-blue-900 uppercase">{e.toupie}</p>
                                                                        </div>
                                                                    )}
                                                                    {e.chaufeur && (
                                                                        <div className="space-y-0.5">
                                                                            <p className="text-[7px] font-black text-slate-400 uppercase">Chauffeur</p>
                                                                            <p className="text-[10px] font-black text-slate-900 uppercase">{e.chaufeur}</p>
                                                                        </div>
                                                                    )}
                                                                    {e.pompe && (
                                                                        <div className="space-y-0.5">
                                                                            <p className="text-[7px] font-black text-emerald-400 uppercase">Pompe / Pompiste</p>
                                                                            <p className="text-[10px] font-black text-emerald-900 uppercase">{e.pompe} / {e.pompiste}</p>
                                                                        </div>
                                                                    )}
                                                                    {e.heure && (
                                                                        <div className="space-y-0.5">
                                                                            <p className="text-[7px] font-black text-slate-400 uppercase">Heure / Adjuvant</p>
                                                                            <p className="text-[10px] font-black text-slate-600 uppercase font-mono">{e.heure} | {e.adjuvant}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-[9px] min-w-[600px]">
                                                                    <thead className="bg-slate-100 text-[7px] font-black text-slate-400 uppercase tracking-tighter">
                                                                        <tr>
                                                                            <th className="p-2 text-left">Désignation</th>
                                                                            <th className="p-2 text-center">CRT</th>
                                                                            <th className="p-2 text-center">Qté</th>
                                                                            <th className="p-2 text-right">Prix HT</th>
                                                                            <th className="p-2 text-center">Rem</th>
                                                                            <th className="p-2 text-right">Total TTC</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-50">
                                                                        {e.items.map((item, idx) => (
                                                                            <tr key={idx}>
                                                                                <td className="p-2 font-bold text-slate-700">{item.designation}</td>
                                                                                <td className="p-2 text-center text-slate-400 font-mono italic">{item.crt || '-'}</td>
                                                                                <td className="p-2 text-center font-black text-slate-900">{item.quantity}</td>
                                                                                <td className="p-2 text-right text-indigo-500 font-bold">{(item.unitPriceHT || item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 3 })}</td>
                                                                                <td className="p-2 text-center text-red-500 font-black">{item.remise ? `${item.remise}%` : ''}</td>
                                                                                <td className="p-2 text-right font-black text-slate-900">{item.totalTTC.toLocaleString(undefined, { minimumFractionDigits: 3 })}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ExpensesPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-bold animate-pulse">Chargement de votre chantier...</p>
                </div>
            </div>
        }>
            <ExpensesContent />
        </Suspense>
    );
}
