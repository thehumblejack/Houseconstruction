'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import {
    Plus, Receipt, FileText, Trash2, TrendingUp, DollarSign,
    Upload, X, CheckCircle2, Clock, Eye, EyeOff, AlertCircle, FileDown, ChevronDown,
    ArrowRight, ArrowUp, ArrowDown, ArrowUpDown, Search, Pencil, Image as ImageIcon, Package, GripVertical,
    Store, FilePlus, Sparkles, Keyboard, ImagePlus, ClipboardList
} from 'lucide-react';
import { motion, Reorder, useDragControls } from 'framer-motion';
import { Modal, AnchoredDropdown } from '@/components/ui';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Types ---
type PaymentStatus = 'paid' | 'pending';

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
    notes?: string;
}

// --- Components ---



// Invoice Modal Component
const ImageViewer = ({ src, onClose }: { src: string, onClose: () => void }) => {
    const isPdf = src.toLowerCase().includes('.pdf') || src.startsWith('data:application/pdf');
    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 font-jakarta" onClick={onClose}>
            <div className="relative max-w-5xl w-full h-[90vh] flex flex-col items-center">
                <button
                    onClick={onClose}
                    aria-label="Fermer"
                    className="absolute -top-11 right-0 inline-flex items-center justify-center w-9 h-9 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <X className="h-6 w-6" />
                </button>
                {isPdf ? (
                    <iframe
                        src={src}
                        className="w-full h-full bg-white rounded-2xl shadow-xl"
                        title="Document Viewer"
                    />
                ) : (
                    <img
                        src={src}
                        alt="Document"
                        className="max-w-full max-h-full object-contain rounded-2xl shadow-xl bg-white"
                        onClick={(e) => e.stopPropagation()}
                    />
                )}
            </div>
        </div>
    );
};

// Sub-component for Supplier List to use drag controls properly
const SupplierList = ({
    orderedSuppliers,
    activeTab,
    setActiveTab,
    handleReorder,
    isAdmin,
    setSupplierToDelete,
    setShowDeleteConfirmModal,
    setDeleteConfirmInput
}: any) => {
    return (
        <Reorder.Group axis="y" values={orderedSuppliers} onReorder={handleReorder} className="flex lg:flex-col gap-2 lg:gap-2.5 overflow-x-auto lg:overflow-visible no-scrollbar snap-x snap-mandatory -mx-4 px-4 lg:mx-0 lg:px-0 pb-1 lg:pb-0">
            {orderedSuppliers.map((sup: any) => (
                <SupplierListItem
                    key={sup.id}
                    sup={sup}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    isAdmin={isAdmin}
                    setSupplierToDelete={setSupplierToDelete}
                    setShowDeleteConfirmModal={setShowDeleteConfirmModal}
                    setDeleteConfirmInput={setDeleteConfirmInput}
                />
            ))}
        </Reorder.Group>
    );
};

const SupplierListItem = ({
    sup,
    activeTab,
    setActiveTab,
    isAdmin,
    setSupplierToDelete,
    setShowDeleteConfirmModal,
    setDeleteConfirmInput
}: any) => {
    const controls = useDragControls();

    return (
        <Reorder.Item
            value={sup}
            dragControls={controls}
            dragListener={false}
            className={`
                group snap-start shrink-0 lg:shrink flex items-center gap-2.5 pl-2 pr-3 py-2 lg:py-2.5 rounded-xl cursor-pointer transition-colors border
                ${activeTab === sup.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}
            `}
            onClick={() => setActiveTab(sup.id as any)}
            layout
        >
            {isAdmin && (
                <div
                    className={`hidden lg:flex items-center justify-center rounded-lg transition-colors cursor-grab active:cursor-grabbing ${activeTab === sup.id ? 'text-white/30 hover:text-white/60' : 'text-slate-300 hover:text-slate-400'}`}
                    onPointerDown={(e) => controls.start(e)}
                >
                    <GripVertical className="h-4 w-4" />
                </div>
            )}
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-semibold shrink-0 ${activeTab === sup.id ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {sup.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
                <span className={`text-[13px] font-medium tracking-tight truncate ${activeTab === sup.id ? 'text-white' : 'text-slate-900'}`}>{sup.name}</span>
                <span className={`text-[11px] mt-0.5 ${activeTab === sup.id ? 'text-white/50' : 'text-slate-400'}`}>
                    {sup.expenses?.length || 0} docs
                </span>
            </div>
            {isAdmin && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setSupplierToDelete({ id: sup.id, name: sup.name });
                        setShowDeleteConfirmModal(true);
                        setDeleteConfirmInput('');
                    }}
                    className={`hidden lg:inline-flex shrink-0 ml-auto items-center justify-center w-8 h-8 rounded-lg transition-colors lg:opacity-0 lg:group-hover:opacity-100 ${activeTab === sup.id ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}
                    title="Supprimer"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            )}
        </Reorder.Item>
    );
};

function ExpensesContentMain() {
    const { isAdmin: isGlobalAdmin, user } = useAuth();
    const { currentProject, userRole, loading: projectLoading } = useProject();

    // Permission check: Global admins OR project admins/editors can edit
    const isAdmin = isGlobalAdmin || userRole === 'admin' || userRole === 'editor';
    const canManageProject = isGlobalAdmin || userRole === 'admin';

    const [activeTab, setActiveTab] = useState<SupplierType>('beton');
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');

    // ... (rest of the state definitions)
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
    const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'price', direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

    // Expense Add State
    const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
    const [newExpenseData, setNewExpenseData] = useState({
        item: '',
        price: '',
        date: new Date().toISOString().split('T')[0],
        status: 'pending' as PaymentStatus,
        quantity: '1'
    });
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

    // Direct image attachment for the new/edit facture-bon modal
    const [expenseImageFile, setExpenseImageFile] = useState<File | null>(null);
    const [expenseImagePreview, setExpenseImagePreview] = useState<string | null>(null); // object URL for a freshly picked file
    const [expenseExistingImage, setExpenseExistingImage] = useState<string | null>(null); // already-saved invoice_image when editing

    const handleExpenseImageSelect = (file: File | null) => {
        if (expenseImagePreview) URL.revokeObjectURL(expenseImagePreview);
        if (file) {
            setExpenseImageFile(file);
            setExpenseImagePreview(URL.createObjectURL(file));
        } else {
            setExpenseImageFile(null);
            setExpenseImagePreview(null);
        }
    };

    const clearExpenseImage = () => {
        handleExpenseImageSelect(null);
        setExpenseExistingImage(null);
    };

    // Revoke the object URL when the preview changes or on unmount (avoids leaks).
    useEffect(() => {
        return () => {
            if (expenseImagePreview) URL.revokeObjectURL(expenseImagePreview);
        };
    }, [expenseImagePreview]);

    const [showAddInvoiceItemsStep, setShowAddInvoiceItemsStep] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const [showAIComingSoonModal, setShowAIComingSoonModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const toggleRow = (id: string) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const [showUploadedDocs, setShowUploadedDocs] = useState(true);
    const [showExpensesSection, setShowExpensesSection] = useState(true);
    const [showDepositsSection, setShowDepositsSection] = useState(true);
    // Tabbed supplier panel: factures | acomptes | documents | notes
    const [panelTab, setPanelTab] = useState<'factures' | 'acomptes' | 'documents' | 'notes'>('factures');

    const [suppliers, setSuppliers] = useState<Record<string, SupplierData>>({});
    const [allAvailableSuppliers, setAllAvailableSuppliers] = useState<any[]>([]);
    const [showGlobalAddModal, setShowGlobalAddModal] = useState(false);
    const [globalSearchTerm, setGlobalSearchTerm] = useState('');
    const [sessionLinkedSuppliers, setSessionLinkedSuppliers] = useState<Set<string>>(new Set());

    // New Invoice Flow State
    const [showAddInvoiceStep1, setShowAddInvoiceStep1] = useState(false);
    const [showAddInvoiceStep2, setShowAddInvoiceStep2] = useState(false);
    const [invoiceFlowMode, setInvoiceFlowMode] = useState<'ai' | 'manual' | null>(null);
    const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
    const [newInvoiceSupplierId, setNewInvoiceSupplierId] = useState<string>('');

    const [isCreatingNewSupplier, setIsCreatingNewSupplier] = useState(false);
    const [tempInvoiceFile, setTempInvoiceFile] = useState<File | null>(null);
    const invoiceFileInputRef = useRef<HTMLInputElement>(null);

    const handleInvoiceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setTempInvoiceFile(e.target.files[0]);
        }
    };

    // Notes State
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [noteEditorType, setNoteEditorType] = useState<'supplier' | 'general'>('supplier');
    const [tempNoteValue, setTempNoteValue] = useState('');
    const [generalNote, setGeneralNote] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [replacingDocId, setReplacingDocId] = useState<string | null>(null);
    const [lastReplacedDoc, setLastReplacedDoc] = useState<{ id: string, oldUrl: string, oldFileName: string } | null>(null);
    const [showUndoToast, setShowUndoToast] = useState(false);
    const [privacyMode, setPrivacyMode] = useState(false);
    const replaceFileInputRef = useRef<HTMLInputElement>(null);
    const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Delete Confirmation Modal State
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [docToDelete, setDocToDelete] = useState<{ id: string | 'all', fileName?: string } | null>(null);
    const [showDocDeleteModal, setShowDocDeleteModal] = useState(false);
    const [supplierToDelete, setSupplierToDelete] = useState<{ id: string, name: string } | null>(null);
    const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [showTrashModal, setShowTrashModal] = useState(false);
    const [archivedSuppliers, setArchivedSuppliers] = useState<any[]>([]);
    const [orderedSuppliers, setOrderedSuppliers] = useState<SupplierData[]>([]);

    // Document Picker State
    const [showDocPicker, setShowDocPicker] = useState(false);
    const [pickerTarget, setPickerTarget] = useState<{ type: 'expense' | 'deposit', id: string } | null>(null);

    const searchParams = useSearchParams();
    const supabase = useMemo(() => createClient(), []);

    const availableArticles = useMemo(() => {
        const articlesMap = new Map<string, { name: string, price: number, supplier: string, isOfficial: boolean }>();
        
        // 1. Helper to normalize names (copied from ArticlesContent for consistency)
        const normalize = (n: string) => {
            const upper = n.toUpperCase().trim();
            // Expanded normalization rules for better matching
            if (upper.includes("SABLE") && (upper.includes("OM") || upper === "SABLE")) return "OM SABLE";
            if (upper.includes("GRAVIER") && (upper.includes("OM") || upper === "GRAVIER")) return "OM GRAVIER";
            return upper;
        };

        // 2. Inject Virtual Official Prices (Mostakbel)
        Object.entries(MOSTAKBEL_PRICES).forEach(([designation, price]) => {
            const name = normalize(designation);
            // Unique key to avoid collisions, but group by name/supplier
            const key = `${name}|STE MOSTAKBEL|OFFICIAL`;
            articlesMap.set(key, { name, price, supplier: 'STE MOSTAKBEL', isOfficial: true });
        });

        // 3. Inject Virtual Official Prices (Ben Hdeya)
        Object.entries(BEN_HDEYA_PRICES).forEach(([designation, price]) => {
            const name = normalize(designation);
            const key = `${name}|AHMED BEN HDYA|OFFICIAL`;
            articlesMap.set(key, { name, price, supplier: 'AHMED BEN HDYA', isOfficial: true });
        });

        // 4. Collect from all historical data (suppliers state)
        Object.values(suppliers).forEach(s => {
            const supplierName = s.name.toUpperCase();
            
            s.expenses?.forEach(e => {
                // Detailed items
                if (e.items && e.items.length > 0) {
                    e.items.forEach(i => {
                        if (i.designation) {
                            const name = normalize(i.designation);
                            const key = `${name}|${supplierName}|REAL`;
                            // Don't overwrite if we already have it from this supplier (prefer latest/existing)
                            if (!articlesMap.has(key)) {
                                articlesMap.set(key, { name, price: i.unitPrice, supplier: supplierName, isOfficial: false });
                            }
                        }
                    });
                } 
                
                // Main field (if items is empty)
                if ((!e.items || e.items.length === 0) && e.item && e.item.length > 2 && 
                    !e.item.toUpperCase().includes('FACT') && 
                    !e.item.toUpperCase().includes('BON') &&
                    !e.item.toUpperCase().includes('DEBOUR') &&
                    !e.item.toUpperCase().includes('AVANCE')) {
                    
                    const name = normalize(e.item);
                    const qty = parseFloat(e.quantity) || 1;
                    const pricePerUnit = e.price / qty;
                    const key = `${name}|${supplierName}|REAL`;
                    
                    if (!articlesMap.has(key)) {
                        articlesMap.set(key, { name, price: pricePerUnit, supplier: supplierName, isOfficial: false });
                    }
                }
            });
        });

        return Array.from(articlesMap.values())
            .filter((a: any) => a.name.length >= 1)
            .sort((a, b) => {
                // 1. Official ones strictly first
                if (a.isOfficial && !b.isOfficial) return -1;
                if (!a.isOfficial && b.isOfficial) return 1;
                // 2. Then alphabetical by name
                const nameComp = a.name.localeCompare(b.name);
                if (nameComp !== 0) return nameComp;
                // 3. Then alphabetical by supplier
                return a.supplier.localeCompare(b.supplier);
            });
    }, [suppliers]);

    const [activeArticleSearchIdx, setActiveArticleSearchIdx] = useState<number | null>(null);
    const [articleSearchAnchorEl, setArticleSearchAnchorEl] = useState<HTMLElement | null>(null);

    // Sync URL params to State
    useEffect(() => {
        if (!loading && Object.keys(suppliers).length > 0) {
            const tabParam = searchParams.get('tab');
            if (tabParam && suppliers[tabParam] && activeTab !== tabParam) {
                setActiveTab(tabParam as SupplierType);
            }

            const highlightId = searchParams.get('highlight');
            if (highlightId) {
                setTimeout(() => {
                    const el = document.getElementById(highlightId);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.style.backgroundColor = '#fef3c7';
                        el.style.transition = 'background-color 1s';
                        setTimeout(() => {
                            el.style.backgroundColor = '';
                        }, 3000);
                    }
                }, 500);
            }
        }
    }, [searchParams, loading, suppliers, activeTab]);

    // Clear session-linked list when project changes
    useEffect(() => {
        setSessionLinkedSuppliers(new Set());
    }, [currentProject?.id]);

    useEffect(() => {
        setSelectedExpenseIds(new Set());
    }, [activeTab]);

    const fetchData = useCallback(async () => {
        if (!currentProject) {
            // Projects may still be resolving on reload — only declare "empty" once they have loaded.
            if (!projectLoading) setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const [allSuppliersRes, expensesRes, depositsRes, settingsRes, uploadedDocsRes] = await Promise.all([
                supabase.from('suppliers').select('*').is('deleted_at', null).order('name'),
                supabase.from('expenses').select('*, items:invoice_items(*)').eq('project_id', currentProject.id).is('deleted_at', null),
                supabase.from('deposits').select('*').eq('project_id', currentProject.id).is('deleted_at', null),
                supabase.from('project_settings').select('*').eq('project_id', currentProject.id),
                supabase.from('uploaded_documents').select('*').eq('project_id', currentProject.id).order('uploaded_at', { ascending: false }),
            ]);

            // Optional fetch for project_suppliers
            const { data: projectSupsData, error: projectSupsError } = await supabase.from('project_suppliers').select('*').eq('project_id', currentProject.id).is('deleted_at', null);

            // Also fetch ARCHIVED suppliers for the project
            const { data: archivedProjectSups } = await supabase.from('project_suppliers').select('supplier_id').eq('project_id', currentProject.id).not('deleted_at', 'is', null);
            const archivedIds = new Set(archivedProjectSups?.map((ps: any) => ps.supplier_id) || []);
            const { data: allGlobalSuppliers } = await supabase.from('suppliers').select('*');
            setArchivedSuppliers(allGlobalSuppliers?.filter((s: any) => archivedIds.has(s.id)) || []);

            if (allSuppliersRes.error) console.error('Expenses: Suppliers fetch error:', allSuppliersRes.error);
            if (expensesRes.error) console.error('Expenses: Expenses fetch error:', expensesRes.error);
            if (depositsRes.error) console.error('Expenses: Deposits fetch error:', depositsRes.error);
            if (settingsRes.error) console.error('Expenses: Settings fetch error:', settingsRes.error);
            if (uploadedDocsRes.error) console.error('Expenses: Uploaded docs fetch error:', uploadedDocsRes.error);
            if (projectSupsError) console.warn('Expenses: project_suppliers fetch error (table might be missing):', projectSupsError);

            const allSuppliersData = allSuppliersRes.data || [];
            const expensesData = expensesRes.data || [];
            const depositsData = depositsRes.data || [];
            const settingsData = settingsRes.data || [];
            const uploadedDocsData = uploadedDocsRes.data || [];
            const projectSups = projectSupsData || [];

            setAllAvailableSuppliers(allSuppliersData);

            // Filter suppliers that have data in THIS project OR are explicitly linked
            const projectSupplierIds = new Set([
                ...expensesData.map((e: any) => e.supplier_id),
                ...depositsData.map((d: any) => d.supplier_id),
                ...projectSups.map((ps: any) => ps.supplier_id),
                ...Array.from(sessionLinkedSuppliers)
            ]);

            const suppliersData = allSuppliersData.filter((s: any) => projectSupplierIds.has(s.id));

            console.log('Expenses: Data received:', {
                suppliers: suppliersData?.length ?? 0,
                expenses: expensesData?.length ?? 0,
                uploadedDocs: uploadedDocsData?.length ?? 0
            });

            if (settingsData) {
                const note = settingsData.find((s: any) => s.key === 'general_note')?.value || '';
                setGeneralNote(note);
            }

            // Load uploaded documents
            if (uploadedDocsData) {
                const docs = uploadedDocsData.map((d: any) => ({
                    id: d.id,
                    supplierId: d.supplier_id,
                    url: d.file_url,
                    fileName: d.file_name,
                    note: d.note || '',
                    uploadedAt: new Date(d.uploaded_at)
                }));
                setUploadedDocs(docs);
            }

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
                        deposits: [],
                        notes: s.notes || ''
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

                // Sort expenses
                Object.values(newSuppliers).forEach(s => {
                    s.expenses.sort((a, b) => {
                        const dateA = new Date(a.date.split('/').reverse().join('-')).getTime();
                        const dateB = new Date(b.date.split('/').reverse().join('-')).getTime();
                        return dateB - dateA;
                    });
                });

                setSuppliers(newSuppliers as Record<SupplierType, SupplierData>);

                // Set ordered suppliers for display
                const sorted = suppliersData.map((s: any) => {
                    const link = projectSups.find((ps: any) => ps.supplier_id === s.id);
                    return { ...newSuppliers[s.id], sortOrder: link?.sort_order || 0 };
                }).sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));

                setOrderedSuppliers(sorted as SupplierData[]);

                // If activeTab is no longer valid, switch to the first available supplier
                const supplierIds = sorted.map((s: any) => s.id);
                if (supplierIds.length > 0 && !newSuppliers[activeTab]) {
                    setActiveTab(supplierIds[0] as SupplierType);
                }
            } else {
                console.warn('Expenses: Missing required data (suppliers or expenses)');
                setSuppliers({});
            }
        } catch (error) {
            console.error('Expenses: Critical error in fetchData:', error);
        } finally {
            console.log('Expenses: Fetching data complete.');
            setLoading(false);
        }
    }, [supabase, currentProject, activeTab, sessionLinkedSuppliers, projectLoading]);

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
                (payload: any) => {
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
    const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set());
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [showAllPending, setShowAllPending] = useState(false);
    const [showAllPaid, setShowAllPaid] = useState(false);
    const [showAllExpenses, setShowAllExpenses] = useState(false);
    const [expandedSuppliers, setExpandedSuppliers] = useState<Record<string, boolean>>({});

    // Manual Expense Add State
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [manualForm, setManualForm] = useState({
        files: [] as File[]
    });
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [uploadedDocs, setUploadedDocs] = useState<Array<{ id: string, supplierId: string, url: string, fileName: string, note: string, uploadedAt: Date }>>([]);

    const processFiles = (files: File[]) => {
        const validFiles = files.filter(file =>
            file.type.startsWith('image/') || file.type === 'application/pdf'
        );

        if (validFiles.length > 0) {
            setManualForm(prev => ({ files: [...prev.files, ...validFiles] }));
            setPreviewUrls(prev => [
                ...prev,
                ...validFiles.map(file => URL.createObjectURL(file))
            ]);
        }
    };

    const handleManualFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(Array.from(e.target.files));
            // Reset input so the same file selection triggers change again if needed
            e.target.value = '';
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleRemoveFile = (index: number) => {
        setManualForm(prev => {
            const updatedFiles = [...prev.files];
            updatedFiles.splice(index, 1);
            return { files: updatedFiles };
        });
        setPreviewUrls(prev => {
            const updatedUrls = [...prev];
            URL.revokeObjectURL(updatedUrls[index]); // Cleanup
            updatedUrls.splice(index, 1);
            return updatedUrls;
        });
    };

    const handleClearAll = (e?: React.MouseEvent) => {
        e?.stopPropagation(); // Prevent opening file dialog
        setManualForm({ files: [] });
        setPreviewUrls(prev => {
            prev.forEach(url => URL.revokeObjectURL(url));
            return [];
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleUpdateDocNote = async (docId: string, note: string) => {
        if (!isAdmin) return;
        const { error } = await supabase
            .from('uploaded_documents')
            .update({ note })
            .eq('id', docId);

        if (error) {
            console.error('Failed to update note:', error);
        } else {
            setUploadedDocs(prev => prev.map(doc =>
                doc.id === docId ? { ...doc, note } : doc
            ));
        }
    };

    const handleDeleteUploadedDoc = async (docId: string | 'all') => {
        if (!isAdmin) return;
        setIsDeleting(true);
        try {
            if (docId === 'all') {
                const docsToDelete = uploadedDocs.filter(doc => doc.supplierId === activeTab);
                for (const doc of docsToDelete) {
                    await supabase.from('uploaded_documents').delete().eq('id', doc.id);
                }
                setUploadedDocs(prev => prev.filter(d => d.supplierId !== activeTab));
            } else {
                const { error } = await supabase
                    .from('uploaded_documents')
                    .delete()
                    .eq('id', docId);

                if (error) throw error;
                setUploadedDocs(prev => prev.filter(d => d.id !== docId));
            }
            setShowDocDeleteModal(false);
            setDocToDelete(null);
        } catch (error) {
            console.error('Failed to delete document(s):', error);
            alert("Erreur lors de la suppression.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleReplaceDocument = async (docId: string, file: File) => {
        if (!isAdmin) return;
        const project = currentProject;
        if (!project) return;

        setIsUploading(true);
        try {
            const doc = uploadedDocs.find(d => d.id === docId);
            if (!doc) throw new Error("Document non trouvé");

            // Store for Undo
            setLastReplacedDoc({
                id: docId,
                oldUrl: doc.url,
                oldFileName: doc.fileName
            });

            // 1. Upload new file
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            const filePath = `${activeTab}/${fileName}`;

            let bucketName = 'invoices';
            let { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file);

            if (uploadError) {
                bucketName = 'documents';
                const { error: matchError } = await supabase.storage
                    .from(bucketName)
                    .upload(filePath, file);
                if (matchError) throw matchError;
            }

            const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
            const publicUrl = data.publicUrl;

            // 2. Update database
            const cleanFileName = file.name.replace(/[:\\/]/g, '-');
            const { error: updateError } = await supabase
                .from('uploaded_documents')
                .update({
                    file_url: publicUrl,
                    file_name: cleanFileName,
                    uploaded_at: new Date().toISOString()
                })
                .eq('id', docId);

            if (updateError) throw updateError;

            await fetchData();

            // Show Undo Toast
            setShowUndoToast(true);
            if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
            undoTimeoutRef.current = setTimeout(() => setShowUndoToast(false), 5000);

        } catch (error) {
            console.error('Error replacing document:', error);
            alert("Erreur lors du remplacement du document.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleUndoReplace = async () => {
        if (!isAdmin) return;
        if (!lastReplacedDoc) return;
        setIsUploading(true);
        try {
            const { error } = await supabase
                .from('uploaded_documents')
                .update({
                    file_url: lastReplacedDoc.oldUrl,
                    file_name: lastReplacedDoc.oldFileName,
                    uploaded_at: new Date().toISOString()
                })
                .eq('id', lastReplacedDoc.id);

            if (error) throw error;
            setLastReplacedDoc(null);
            setShowUndoToast(false);
            await fetchData();
        } catch (error) {
            console.error('Error undoing replacement:', error);
            alert("Erreur lors de l'annulation.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleManualSubmit = async () => {
        if (!isAdmin) return;
        const project = currentProject;
        if (!project) return;
        if (manualForm.files.length === 0) {
            alert('Veuillez sélectionner au moins un fichier.');
            return;
        }

        setIsUploading(true);
        try {
            let publicUrl = null;

            if (false) {
                // const fileExt = (manualForm as any).file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.dat`;
                const filePath = `${activeTab}/${fileName}`;

                // Upload to 'invoices' bucket
                const { error: uploadError } = await supabase.storage
                    .from('invoices')
                    .upload(filePath, (manualForm as any).file);

                if (uploadError) {
                    // Try 'documents' bucket if 'invoices' fails, or handle error
                    console.warn("Upload to 'invoices' failed, trying 'documents'...", uploadError);
                    const { error: matchError } = await supabase.storage
                        .from('documents')
                        .upload(filePath, (manualForm as any).file);

                    if (matchError) throw uploadError; // Throw original if both fail? or matchError

                    const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
                    publicUrl = data.publicUrl;
                } else {
                    const { data } = supabase.storage.from('invoices').getPublicUrl(filePath);
                    publicUrl = data.publicUrl;
                }
            }

            // Insert Expense
            const { error: insertError } = await supabase.from('expenses').insert({
                project_id: project.id,
                supplier_id: activeTab,
                date: new Date().toLocaleDateString('fr-FR'),
                item: 'Deprecated',
                price: 0,
                status: 'pending',
                invoice_image: publicUrl,
                quantity: '1' // Default
            });

            if (insertError) throw insertError;

            // Reset Form
            setManualForm({
                files: []
            });
            // setPreviewUrl(null);

            if (fileInputRef.current) fileInputRef.current.value = '';

            // Refresh
            fetchData();

        } catch (error) {
            console.error('Error adding expense:', error);
            alert("Erreur lors de l'enregistrement: " + (error as any).message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleManualSubmitNew = async () => {
        if (!isAdmin) return;
        const project = currentProject;
        if (!project) return;
        if (manualForm.files.length === 0) {
            alert('Veuillez sélectionner au moins un fichier.');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        const newUploadedDocs: Array<{ id: string, supplierId: string, url: string, fileName: string, note: string, uploadedAt: Date }> = [];

        try {
            for (let i = 0; i < manualForm.files.length; i++) {
                const file = manualForm.files[i];
                let publicUrl = null;

                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${i}.${fileExt}`;
                const filePath = `${activeTab}/${fileName}`;

                // Upload to 'invoices' bucket
                let bucketName = 'invoices';
                let { error: uploadError } = await supabase.storage
                    .from(bucketName)
                    .upload(filePath, file);

                if (uploadError) {
                    console.warn(`Upload to '${bucketName}' failed:`, uploadError);

                    // Fallback to 'documents'
                    bucketName = 'documents';
                    const { error: matchError } = await supabase.storage
                        .from(bucketName)
                        .upload(filePath, file);

                    if (matchError) {
                        console.error(`Failed to upload ${file.name} to fallback '${bucketName}':`, matchError);

                        // Check for bucket not found
                        if ((matchError as any).message?.includes('Bucket not found') || (matchError as any).error?.includes('Bucket not found')) {
                            alert(`Erreur de configuration: Le bucket de stockage 'invoices' ou 'documents' n'existe pas dans Supabase. Veuillez le créer.`);
                            throw matchError; // Stop processing
                        }
                        continue;
                    }
                }

                const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
                publicUrl = data.publicUrl;

                // Insert into uploaded_documents table (NOT expenses)
                if (publicUrl) {
                    const cleanFileName = file.name.replace(/[:\\/]/g, '-');
                    const { data: insertedDoc, error: insertError } = await supabase
                        .from('uploaded_documents')
                        .insert({
                            project_id: project.id,
                            supplier_id: activeTab,
                            file_url: publicUrl,
                            file_name: cleanFileName,
                            note: '',
                            created_by: user?.id
                        })
                        .select()
                        .single();

                    if (insertError) {
                        console.error(`Failed to save document ${file.name}:`, insertError.message, insertError.details, insertError.hint);
                    } else if (insertedDoc) {
                        newUploadedDocs.push({
                            id: insertedDoc.id,
                            supplierId: insertedDoc.supplier_id,
                            url: insertedDoc.file_url,
                            fileName: insertedDoc.file_name,
                            note: insertedDoc.note || '',
                            uploadedAt: new Date(insertedDoc.uploaded_at)
                        });
                    }
                }

                setUploadProgress(Math.round(((i + 1) / manualForm.files.length) * 100));
            }

            // Add to uploaded docs state
            setUploadedDocs(prev => [...newUploadedDocs, ...prev]);

            // Reset Form and Previews
            setManualForm({ files: [] });
            setPreviewUrls(prev => {
                prev.forEach(url => URL.revokeObjectURL(url));
                return [];
            });
            if (fileInputRef.current) fileInputRef.current.value = '';

            // Success message
            alert(`${newUploadedDocs.length} document(s) uploadé(s) avec succès!`);

        } catch (error) {
            console.error('Error uploading files:', error);
            alert("Une erreur est survenue lors de l'importation.");
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    // Calculations

    const supplierStats = useMemo(() => Object.values(suppliers).map(s => {
        // Sum of all acomptes (deposits/règlements)
        const d_Total = s.deposits?.reduce((sum, d) => sum + d.amount, 0) || 0;

        let totalExpenseAll = 0;   // sum of elements in factures et bons
        let totalExpensePaid = 0;  // sum of only 'payé'

        s.expenses.forEach(e => {
            totalExpenseAll += e.price;
            if (e.status === 'paid') {
                totalExpensePaid += e.price;
            }
        });

        // sum of elements that has Attente status (Outstanding Bill)
        let totalExpensePending = 0;
        s.expenses.forEach(e => {
            if (e.status === 'pending') {
                totalExpensePending += e.price;
            }
        });

        // 1. Total Montant = The sum of ALL internal elements (factures et bons)
        const computedTotalMontant = totalExpenseAll;

        // 2. Payé = The cash you have outlaid
        // This is the maximum between your advances and your settled invoices.
        const computedTotalPaye = Math.max(d_Total, totalExpensePaid);

        // 3. Solde Calculation (Dual-Mode to ensure instant responsiveness):
        let computedRemaining = 0;
        if (d_Total > computedTotalMontant) {
            // CREDIT MODE: You have given more than they have billed.
            // Solde = "Money I have left" in my cash envelope.
            // This updates instantly whenever you mark a bill as 'payé' (consuming credit).
            computedRemaining = d_Total - totalExpensePaid;
        } else {
            // DEBT MODE: (Mostakbel case) They have billed more than your advance.
            // Solde = Your current debt position.
            // This updates instantly whenever you settle more bills than your initial advance.
            computedRemaining = computedTotalPaye - computedTotalMontant;
        }

        return {
            id: s.id as SupplierType,
            name: s.name,
            totalCost: computedTotalMontant,
            totalPaid: computedTotalPaye,
            remaining: computedRemaining,
            color: s.color
        };
    }), [suppliers]);

    const grandTotal = supplierStats.reduce((sum, s) => sum + s.totalCost, 0);
    const totalPaidGlobal = supplierStats.reduce((sum, s) => sum + s.totalPaid, 0);
    // Solde Général = Sum of all individual balances
    const totalRemainingGlobal = supplierStats.reduce((sum, s) => sum + s.remaining, 0);

    const currentSupplier = suppliers[activeTab];

    const selectedTotal = useMemo(() => {
        if (!currentSupplier) return 0;
        return currentSupplier.expenses
            .filter(e => selectedExpenseIds.has(e.id))
            .reduce((sum, e) => sum + e.price, 0);
    }, [currentSupplier, selectedExpenseIds]);

    const toggleSelectExpense = (id: string) => {
        setSelectedExpenseIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (!currentSupplier) return;
        if (selectedExpenseIds.size === currentSupplier.expenses.length) {
            setSelectedExpenseIds(new Set());
        } else {
            setSelectedExpenseIds(new Set(currentSupplier.expenses.map(e => e.id)));
        }
    };

    const handleSort = (key: 'date' | 'price') => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const sortedExpenses = useMemo(() => {
        if (!currentSupplier || !currentSupplier.expenses) return [];
        let items = [...currentSupplier.expenses];

        // Filter by status
        if (statusFilter !== 'all') {
            items = items.filter(e => e.status === statusFilter);
        }

        // Sort
        items.sort((a, b) => {
            if (sortConfig.key === 'date') {
                const [d1, m1, y1] = a.date.split('/').map(Number);
                const [d2, m2, y2] = b.date.split('/').map(Number);
                const t1 = new Date(y1, m1 - 1, d1).getTime();
                const t2 = new Date(y2, m2 - 1, d2).getTime();
                return sortConfig.direction === 'asc' ? t1 - t2 : t2 - t1;
            } else {
                return sortConfig.direction === 'asc' ? a.price - b.price : b.price - a.price;
            }
        });
        return items;
    }, [currentSupplier, sortConfig, statusFilter]);

    const activeStat = useMemo(() => {
        const stat = supplierStats.find(s => s.id === activeTab);
        if (stat) return stat;
        return {
            id: activeTab,
            name: activeTab,
            totalCost: 0,
            totalPaid: 0,
            remaining: 0,
            color: 'bg-slate-500'
        };
    }, [supplierStats, activeTab]);
    // We no longer need manual currentSolde calculation, we use activeStat




    const updateStatus = async (id: string, newStatus: PaymentStatus) => {
        if (!isAdmin) return;
        // Optimistic Update for immediate UI feedback
        setSuppliers(prev => {
            const next = { ...prev };
            let found = false;
            for (const supId in next) {
                const sup = next[supId];
                const idx = sup.expenses.findIndex(e => e.id === id);
                if (idx !== -1) {
                    const newExpenses = [...sup.expenses];
                    newExpenses[idx] = { ...newExpenses[idx], status: newStatus };
                    next[supId] = { ...sup, expenses: newExpenses };
                    found = true;
                    break;
                }
            }
            return next;
        });

        try {
            const { error } = await supabase
                .from('expenses')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            // No need to call fetchData() immediately if realtime is active, 
            // but keeping it as a fallback won't hurt. 
            // Actually, let's keep it to ensure consistency.
            await fetchData();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Impossible de mettre à jour le statut');
            await fetchData(); // Rollback to server state
        }
    };

    const handleDelete = async (id: string) => {
        if (!isAdmin) return;
        if (!confirm('Supprimer cet enregistrement définitivement ?')) return;

        // Optimistic Delete
        setSuppliers(prev => {
            const next = { ...prev };
            for (const supId in next) {
                const sup = next[supId];
                const idx = sup.expenses.findIndex(e => e.id === id);
                if (idx !== -1) {
                    const newExpenses = sup.expenses.filter(e => e.id !== id);
                    next[supId] = { ...sup, expenses: newExpenses };
                    break;
                }
            }
            return next;
        });

        try {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error deleting expense:', error);
            alert('Impossible de supprimer');
            await fetchData();
        }
    };

    const handleSaveNote = async () => {
        if (!isAdmin) return;
        try {
            if (noteEditorType === 'supplier') {
                const { error } = await supabase.from('suppliers').update({ notes: tempNoteValue }).eq('id', activeTab);
                if (error) throw error;
            } else {
                const project = currentProject;
                if (!project) return;

                // Upsert to handle projects that don't have a general_note yet
                const { error } = await supabase.from('project_settings')
                    .upsert({
                        project_id: project.id,
                        key: 'general_note',
                        value: tempNoteValue
                    }, {
                        onConflict: 'project_id,key'
                    });
                if (error) throw error;
            }
            fetchData();
            setShowNoteModal(false);
        } catch (error) {
            console.error('Error saving note:', error);
            // Alert with more detail if possible
            const errorMsg = (error as any)?.message || '';
            alert('Erreur lors de l\'enregistrement de la note' + (errorMsg ? ': ' + errorMsg : ''));
        }
    };


    const handleAddSupplier = async () => {
        if (!isAdmin) return;
        const project = currentProject;
        if (!project) return;
        if (!newSupplierName) return;
        const id = newSupplierName.toLowerCase().replace(/\s+/g, '_');

        try {
            // 1. Create global supplier if it doesn't exist
            const { error: supError } = await supabase.from('suppliers').upsert({
                id,
                name: newSupplierName,
                color: newSupplierColor
            }, { onConflict: 'id' });

            if (supError) throw supError;

            // 2. Link to current project
            const { error: linkError } = await supabase.from('project_suppliers').insert({
                project_id: project.id,
                supplier_id: id
            });

            // We ignore conflict error if already linked
            if (linkError && linkError.code !== '23505') throw linkError;

            setShowAddSupplierModal(false);
            setNewSupplierName('');
            setSessionLinkedSuppliers(prev => new Set(prev).add(id));
            setActiveTab(id as any);
            if (showAddInvoiceStep2) {
                setNewInvoiceSupplierId(id);
            }
            await fetchData();
        } catch (err) {
            console.error(err);
            alert('Erreur lors de l\'ajout');
        }
    };

    const handleLinkSupplierToProject = async (supplierId: string) => {
        if (!isAdmin) return;
        const project = currentProject;
        if (!project) return;

        try {
            const { error } = await supabase.from('project_suppliers').insert({
                project_id: project.id,
                supplier_id: supplierId
            });

            // Ignore if already exists (PGRST116 or 23505)
            if (error && error.code !== '23505') throw error;

            setSessionLinkedSuppliers(prev => new Set(prev).add(supplierId));
            setActiveTab(supplierId as any);
            setShowAddSupplierModal(false);
            setNewSupplierName('');
            if (showAddInvoiceStep2) {
                setNewInvoiceSupplierId(supplierId);
            }
            await fetchData();
        } catch (err) {
            console.error('Error linking supplier:', err);
            // Even if link fails (e.g. table not created yet), we try to select it for the session
            setSessionLinkedSuppliers(prev => new Set(prev).add(supplierId));
            setActiveTab(supplierId as any);
            setShowAddSupplierModal(false);
            setNewSupplierName('');
            if (showAddInvoiceStep2) {
                setNewInvoiceSupplierId(supplierId);
            }
        }
    };

    const handleRemoveSupplierFromProject = async () => {
        if (!isAdmin) return;
        if (!supplierToDelete || !currentProject) return;
        // Require the typed name to match exactly before this destructive action.
        if (deleteConfirmInput.trim().toUpperCase() !== supplierToDelete.name.trim().toUpperCase()) return;

        setIsDeleting(true);
        try {
            const now = new Date().toISOString();
            // 1. Soft-delete project association
            const { error: linkErr } = await supabase.from('project_suppliers').update({ deleted_at: now }).eq('project_id', currentProject.id).eq('supplier_id', supplierToDelete.id);
            if (linkErr) throw linkErr;

            // 2. Soft-delete project-specific expenses
            const { error: expErr } = await supabase.from('expenses').update({ deleted_at: now }).eq('project_id', currentProject.id).eq('supplier_id', supplierToDelete.id);
            if (expErr) throw expErr;

            // 3. Soft-delete project-specific deposits
            const { error: depErr } = await supabase.from('deposits').update({ deleted_at: now }).eq('project_id', currentProject.id).eq('supplier_id', supplierToDelete.id);
            if (depErr) throw depErr;

            setSessionLinkedSuppliers(prev => {
                const next = new Set(prev);
                next.delete(supplierToDelete.id);
                return next;
            });

            setShowDeleteConfirmModal(false);
            setSupplierToDelete(null);
            setDeleteConfirmInput('');
            setActiveTab('beton');
            await fetchData();
        } catch (err) {
            console.error('Error archiving supplier from project:', err);
            alert('Erreur lors de l\'archivage');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleRestoreSupplierToProject = async (supplierId: string) => {
        if (!isAdmin) return;
        if (!currentProject) return;
        try {
            // Restore association, expenses, and deposits
            await Promise.all([
                supabase.from('project_suppliers').update({ deleted_at: null }).eq('project_id', currentProject.id).eq('supplier_id', supplierId),
                supabase.from('expenses').update({ deleted_at: null }).eq('project_id', currentProject.id).eq('supplier_id', supplierId),
                supabase.from('deposits').update({ deleted_at: null }).eq('project_id', currentProject.id).eq('supplier_id', supplierId)
            ]);

            await fetchData();
            setActiveTab(supplierId as any);
            setShowTrashModal(false);
        } catch (err) {
            console.error('Restore error:', err);
            alert('Erreur lors de la restauration');
        }
    };

    const handleReorder = async (newOrder: SupplierData[]) => {
        if (!isAdmin) return;
        setOrderedSuppliers(newOrder);
        if (!currentProject) return;

        try {
            // Optimistically update DB
            // We use upsert to update the sort_order in project_suppliers
            const updates = newOrder.map((s, index) => ({
                project_id: currentProject.id,
                supplier_id: s.id,
                sort_order: index
            }));

            const { error } = await supabase
                .from('project_suppliers')
                .upsert(updates, { onConflict: 'project_id,supplier_id' });

            if (error) {
                console.error('Error saving reorder to DB:', error);
            }
        } catch (err) {
            console.error('Error saving reorder:', err);
        }
    };

    const handleAddDeposit = async () => {
        if (!isAdmin) return;
        const project = currentProject;
        if (!project) return;
        const amount = parseFloat(newDepositData.amount);
        if (isNaN(amount) || amount <= 0) {
            alert('Veuillez entrer un montant valide');
            return;
        }

        // Optimistic Update for immediate feedback
        const tempId = 'temp-' + Date.now();
        const activeTabSave = activeTab;
        const newDeposit = {
            id: tempId,
            amount: amount,
            date: newDepositData.date,
            payer: newDepositData.payer,
            commercial: newDepositData.commercial,
            ref: newDepositData.ref,
            receiptImage: null
        };

        setSuppliers(prev => {
            const next = { ...prev };
            if (next[activeTabSave]) {
                const newDeposits = [...(next[activeTabSave].deposits || []), newDeposit];
                next[activeTabSave] = { ...next[activeTabSave], deposits: newDeposits };
            }
            return next;
        });

        try {
            const { error } = await supabase.from('deposits').insert({
                project_id: project.id,
                supplier_id: activeTabSave,
                amount: amount,
                date: newDepositData.date,
                payer: newDepositData.payer,
                commercial: newDepositData.commercial,
                ref: newDepositData.ref
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
            await fetchData();
        } catch (error) {
            console.error('Error adding deposit:', error);
            alert("Erreur lors de l'ajout de l'acompte");
            await fetchData(); // Rollback
        }
    };

    const handleSaveDeposit = async () => {
        if (!isAdmin) return;
        const project = currentProject;
        if (!project) return;
        const amount = parseFloat(newDepositData.amount);
        if (isNaN(amount) || amount <= 0) {
            alert('Veuillez entrer un montant valide');
            return;
        }

        const idToUpdate = editingDepositId;
        const activeTabSave = activeTab;

        // Optimistic Update
        setSuppliers(prev => {
            const next = { ...prev };
            if (next[activeTabSave]) {
                const newDeposits = idToUpdate
                    ? next[activeTabSave].deposits?.map(d =>
                        d.id === idToUpdate ? {
                            ...d,
                            amount: amount,
                            date: newDepositData.date,
                            payer: newDepositData.payer,
                            commercial: newDepositData.commercial,
                            ref: newDepositData.ref
                        } : d
                    )
                    : [...(next[activeTabSave].deposits || []), {
                        id: 'temp-' + Date.now(),
                        amount: amount,
                        date: newDepositData.date,
                        payer: newDepositData.payer,
                        commercial: newDepositData.commercial,
                        ref: newDepositData.ref,
                        receiptImage: null
                    }];
                next[activeTabSave] = { ...next[activeTabSave], deposits: newDeposits as any };
            }
            return next;
        });

        try {
            if (idToUpdate) {
                const { error } = await supabase.from('deposits').update({
                    amount: amount,
                    date: newDepositData.date,
                    payer: newDepositData.payer,
                    commercial: newDepositData.commercial,
                    ref: newDepositData.ref
                }).eq('id', idToUpdate);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('deposits').insert({
                    project_id: project.id,
                    supplier_id: activeTabSave,
                    amount: amount,
                    date: newDepositData.date,
                    payer: newDepositData.payer,
                    commercial: newDepositData.commercial,
                    ref: newDepositData.ref
                });
                if (error) throw error;
            }

            closeDepositModal();
            await fetchData();
        } catch (error) {
            console.error('Error saving deposit:', error);
            alert("Erreur lors de l'enregistrement");
            await fetchData(); // Rollback
        }
    };

    const handleDeleteDeposit = async (id: string) => {
        if (!isAdmin) return;
        if (!confirm('Supprimer cet acompte définitivement ?')) return;

        const activeTabSave = activeTab;
        // Optimistic Delete
        setSuppliers(prev => {
            const next = { ...prev };
            if (next[activeTabSave]) {
                const newDeposits = next[activeTabSave].deposits?.filter(d => d.id !== id);
                next[activeTabSave] = { ...next[activeTabSave], deposits: newDeposits };
            }
            return next;
        });

        try {
            const { error } = await supabase.from('deposits').delete().eq('id', id);
            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error deleting deposit:', error);
            alert("Impossible de supprimer l'acompte");
            await fetchData(); // Rollback
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

    const closeExpenseModal = () => {
        setShowAddExpenseModal(false);
        setEditingExpenseId(null);
        setNewExpenseData({
            item: '',
            price: '',
            date: new Date().toISOString().split('T')[0],
            status: 'pending',
            quantity: '1'
        });
        setInvoiceItems([]);
        setActiveArticleSearchIdx(null);
        clearExpenseImage();
    };

    const handleSaveExpense = async () => {
        if (!isAdmin) return;
        const project = currentProject;
        if (!project) return;
        const price = parseFloat(newExpenseData.price);
        if (isNaN(price)) {
            alert('Veuillez entrer un montant valide');
            return;
        }
        if (!newExpenseData.item) {
            alert('Veuillez entrer une désignation');
            return;
        }

        try {
            const dateObj = new Date(newExpenseData.date);
            const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;

            // Resolve the invoice image: upload a freshly picked file, otherwise keep
            // whatever existing image remains (null if the user removed it).
            let invoiceImageUrl: string | null = expenseExistingImage;
            if (expenseImageFile) {
                const ext = expenseImageFile.name.split('.').pop() || 'jpg';
                const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
                const filePath = `${activeTab}/${fileName}`;

                let bucketName = 'invoices';
                const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, expenseImageFile);
                if (uploadError) {
                    bucketName = 'documents';
                    const { error: matchError } = await supabase.storage.from(bucketName).upload(filePath, expenseImageFile);
                    if (matchError) throw uploadError;
                }
                const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
                invoiceImageUrl = data.publicUrl;
            }

            let expenseId = editingExpenseId;

            if (editingExpenseId) {
                const { error } = await supabase.from('expenses').update({
                    item: newExpenseData.item,
                    price: price,
                    date: formattedDate,
                    status: newExpenseData.status,
                    quantity: newExpenseData.quantity,
                    invoice_image: invoiceImageUrl
                }).eq('id', editingExpenseId);
                if (error) throw error;

                // Sync Items: Simplest is Delete then Insert
                await supabase.from('invoice_items').delete().eq('expense_id', editingExpenseId);
            } else {
                const { data: newExp, error } = await supabase.from('expenses').insert({
                    project_id: project.id,
                    supplier_id: activeTab,
                    item: newExpenseData.item,
                    price: price,
                    date: formattedDate,
                    status: newExpenseData.status,
                    quantity: newExpenseData.quantity,
                    invoice_image: invoiceImageUrl
                }).select().single();
                if (error) throw error;
                expenseId = newExp?.id;
            }

            // Insert new items if any
            if (expenseId && invoiceItems.length > 0) {
                const finalItems = invoiceItems
                    .filter(i => i.designation.trim() !== '')
                    .map(i => ({
                        project_id: project.id,
                        expense_id: expenseId,
                        designation: i.designation.toUpperCase(),
                        quantity: i.quantity,
                        unit: i.unit || 'U',
                        unit_price: i.unitPrice,
                        total_ttc: i.totalTTC
                    }));
                if (finalItems.length > 0) {
                    const { error: itemsError } = await supabase.from('invoice_items').insert(finalItems);
                    if (itemsError) throw itemsError;
                }
            }

            closeExpenseModal();
            fetchData();
        } catch (error) {
            console.error('Error saving expense:', error);
            alert("Erreur lors de l'enregistrement");
        }
    };

    const handleEditExpense = (expense: Expense) => {
        // Convert DD/MM/YYYY to YYYY-MM-DD for input[type=date]
        const [d, m, y] = expense.date.split('/');
        const isoDate = `${y}-${m}-${d}`;

        setNewExpenseData({
            item: expense.item,
            price: expense.price.toString(),
            date: isoDate,
            status: expense.status,
            quantity: expense.quantity || '1'
        });
        setInvoiceItems(expense.items || []);
        handleExpenseImageSelect(null);
        setExpenseExistingImage(expense.invoiceImage || null);
        setEditingExpenseId(expense.id);
        setShowAddExpenseModal(true);
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

    const handleOpenDocPicker = (type: 'expense' | 'deposit', id: string) => {
        setPickerTarget({ type, id });
        setShowDocPicker(true);
    };

    const handleSelectDocLink = async (url: string) => {
        if (!isAdmin) return;
        if (!pickerTarget) return;

        try {
            const table = pickerTarget.type === 'expense' ? 'expenses' : 'deposits';
            const column = pickerTarget.type === 'expense' ? 'invoice_image' : 'receipt_image';

            const { error } = await supabase
                .from(table)
                .update({ [column]: url })
                .eq('id', pickerTarget.id);

            if (error) throw error;

            setShowDocPicker(false);
            setPickerTarget(null);
            fetchData(); // Refresh to show the Eye icon
        } catch (error) {
            console.error('Error linking document:', error);
            alert('Erreur lors de la liaison du document');
        }
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Bilan Dépenses - MaMaison", 14, 22);
        doc.setFontSize(11);
        doc.text(`Généré le: ${new Date().toLocaleDateString()}`, 14, 30);

        const tableData: any[] = [];

        Object.values(supplierStats).forEach(s => {
            // Header for supplier
            tableData.push([{ content: s.name.toUpperCase(), colSpan: 5, styles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' } }]);

            // We use the original suppliers data for listing individual items
            const originalSup = suppliers[s.id];
            if (originalSup) {
                originalSup.expenses.forEach(e => {
                    tableData.push([
                        e.date,
                        e.item,
                        e.status === 'paid' ? 'Payé' : 'Attente',
                        e.price.toLocaleString(undefined, { minimumFractionDigits: 3 }) + ' DT',
                        '-'
                    ]);
                });
            }

            // Subtotal rows for this supplier
            tableData.push([
                { content: 'TOTAL MONTANT (FOURNISSEUR)', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right' } },
                { content: s.totalCost.toLocaleString(undefined, { minimumFractionDigits: 3 }) + ' DT', colSpan: 2, styles: { fontStyle: 'bold' } }
            ]);
            tableData.push([
                { content: 'TOTAL PAYE', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', textColor: [39, 174, 96] } },
                { content: s.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 3 }) + ' DT', colSpan: 2, styles: { fontStyle: 'bold', textColor: [39, 174, 96] } }
            ]);
            tableData.push([
                { content: 'SOLDE (PAYE - MONTANT)', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', textColor: s.remaining < 0 ? [192, 57, 43] : [41, 128, 185] } },
                { content: s.remaining.toLocaleString(undefined, { minimumFractionDigits: 3 }) + ' DT', colSpan: 2, styles: { fontStyle: 'bold', textColor: s.remaining < 0 ? [192, 57, 43] : [41, 128, 185] } }
            ]);
        });

        // Final Global Totals
        tableData.push([{ content: '', colSpan: 5, styles: { fillColor: [255, 255, 255] } }]);
        
        tableData.push([
            { content: 'TOTAL CHANTIER (TOUS LES FOURNISSEURS)', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 247, 250] } },
            { content: grandTotal.toLocaleString(undefined, { minimumFractionDigits: 3 }) + ' DT', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [245, 247, 250] } }
        ]);

        tableData.push([
            { content: 'TOTAL PAYE (AVANCES + RÉGLEMENTS)', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', textColor: [39, 174, 96], fillColor: [245, 247, 250] } },
            { content: totalPaidGlobal.toLocaleString(undefined, { minimumFractionDigits: 3 }) + ' DT', colSpan: 2, styles: { fontStyle: 'bold', textColor: [39, 174, 96], fillColor: [245, 247, 250] } }
        ]);

        tableData.push([
            { content: 'SOLDE RESTANT (GLOBAL)', colSpan: 3, styles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold', halign: 'right' } },
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



    const formatValue = (val: number) => {
        if (privacyMode) return '••••••';
        return val.toLocaleString(undefined, { minimumFractionDigits: 3 });
    };

    if (loading || projectLoading) {
        return (
            <div className="min-h-screen font-jakarta">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 pb-28 md:pb-12 space-y-5 animate-pulse">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="space-y-2">
                            <div className="h-6 w-40 rounded-lg bg-slate-200" />
                            <div className="h-3.5 w-56 rounded bg-slate-100" />
                        </div>
                        <div className="hidden sm:flex gap-2">
                            <div className="h-10 w-28 rounded-xl bg-slate-100" />
                            <div className="h-10 w-24 rounded-xl bg-slate-200" />
                        </div>
                    </div>
                    {/* Stat cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div className="h-3 w-20 rounded bg-slate-100" />
                                    <div className="h-7 w-7 rounded-lg bg-slate-100" />
                                </div>
                                <div className="h-6 w-24 rounded-lg bg-slate-200" />
                            </div>
                        ))}
                    </div>
                    {/* Supplier rail + panel */}
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex lg:flex-col gap-2.5 lg:w-64 overflow-hidden">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl border border-slate-200 bg-white shrink-0 lg:shrink">
                                    <div className="h-8 w-8 rounded-lg bg-slate-100 shrink-0" />
                                    <div className="space-y-1.5">
                                        <div className="h-3 w-20 rounded bg-slate-200" />
                                        <div className="h-2.5 w-10 rounded bg-slate-100" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex-1 space-y-4">
                            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
                                <div className="h-5 w-40 rounded-lg bg-slate-200" />
                                <div className="grid grid-cols-3 gap-2">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <div key={i} className="h-16 rounded-2xl border border-slate-200 bg-slate-50" />
                                    ))}
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-100 h-12" />
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-t border-slate-100">
                                        <div className="h-4 w-4 rounded bg-slate-100" />
                                        <div className="flex-1 space-y-1.5">
                                            <div className="h-3.5 w-1/3 rounded bg-slate-200" />
                                            <div className="h-2.5 w-20 rounded bg-slate-100" />
                                        </div>
                                        <div className="h-5 w-16 rounded-full bg-slate-100" />
                                        <div className="h-4 w-20 rounded bg-slate-200" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }




    const isEmpty = Object.keys(suppliers).length === 0;

    return (
        <div className="min-h-screen font-jakarta">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 pb-28 md:pb-12 space-y-5">
            {/* Image Modal */}
            {viewingImage && <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} />}

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">Dépenses</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Factures, bons et acomptes par fournisseur</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPrivacyMode(!privacyMode)}
                        className={`inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl text-sm font-medium transition-colors ${privacyMode ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                        title={privacyMode ? 'Afficher les montants' : 'Masquer les montants'}
                    >
                        {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="hidden sm:inline">{privacyMode ? 'Mode discret' : 'Visible'}</span>
                    </button>
                    {!isEmpty && (
                        <button
                            onClick={handleExportPDF}
                            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 active:scale-[0.99] transition-colors"
                        >
                            <FileDown className="h-4 w-4" /> <span className="hidden sm:inline">Export PDF</span>
                        </button>
                    )}
                    {isAdmin && (
                        <button
                            onClick={() => setShowAddInvoiceStep1(true)}
                            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 active:scale-[0.99] transition-colors"
                        >
                            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Facture</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Step 1 Modal: Choose AI or Manual */}
            <Modal
                open={showAddInvoiceStep1}
                onClose={() => setShowAddInvoiceStep1(false)}
                title="Ajouter une facture"
                description="Choisissez votre méthode d'ajout"
                size="lg"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                        onClick={() => {
                            setInvoiceFlowMode('ai');
                            setShowAddInvoiceStep1(false);
                            // Potential AI flow call here
                            setShowAIComingSoonModal(true);
                        }}
                        className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors flex flex-col items-center gap-3 text-center"
                    >
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Sparkles className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900 text-sm mb-0.5">Extraire avec l'IA</p>
                            <p className="text-xs text-slate-500 leading-relaxed">Scannez et remplissez automatiquement les champs</p>
                        </div>
                    </button>

                    <button
                        onClick={() => {
                            setInvoiceFlowMode('manual');
                            setShowAddInvoiceStep1(false);
                            setShowAddInvoiceItemsStep(false);
                            setTempInvoiceFile(null); // Reset when opening new
                            setShowAddInvoiceStep2(true);
                            setNewInvoiceSupplierId(activeTab); // Pre-select current supplier if any
                            setNewExpenseData({
                                item: '',
                                price: '',
                                date: new Date().toISOString().split('T')[0],
                                status: 'pending',
                                quantity: '1'
                            });
                            setInvoiceItems([]);
                        }}
                        className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-slate-900 transition-colors flex flex-col items-center gap-3 text-center"
                    >
                        <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                            <Keyboard className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900 text-sm mb-0.5">Ajout manuel</p>
                            <p className="text-xs text-slate-500 leading-relaxed">Saisissez les informations de la facture vous-même</p>
                        </div>
                    </button>
                </div>
            </Modal>

            {/* Step 2 Modal: Basic Info */}
            <Modal
                open={showAddInvoiceStep2}
                onClose={() => setShowAddInvoiceStep2(false)}
                title="Nouvelle facture / bon"
                description="Informations du document"
                size="lg"
                footer={<>
                    <button
                        onClick={() => setShowAddInvoiceStep2(false)}
                        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={() => {
                            if (!newInvoiceSupplierId && !newSupplierName) {
                                alert("Veuillez sélectionner un fournisseur");
                                return;
                            }
                            if (newInvoiceSupplierId === 'new' || (newInvoiceSupplierId === 'CREATING_NEW' && !newSupplierName)) {
                                alert("Veuillez entrer un nom pour le nouveau fournisseur");
                                return;
                            }
                            if (!newExpenseData.item) {
                                alert("Veuillez entrer une désignation");
                                return;
                            }
                            setShowAddInvoiceStep2(false);
                            setShowAddInvoiceItemsStep(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 active:scale-[0.99] transition-colors"
                    >
                        Continuer
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </>}
            >
                <div className="space-y-4">
                    {/* Supplier Selection */}
                    <div>
                        <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Fournisseur</label>
                        <div className="relative">
                            <select
                                className="w-full h-10 px-3 pr-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition appearance-none"
                                value={newInvoiceSupplierId}
                                onChange={(e) => {
                                    if (e.target.value === 'new') {
                                        setIsCreatingNewSupplier(true);
                                    } else {
                                        setNewInvoiceSupplierId(e.target.value);
                                        setIsCreatingNewSupplier(false);
                                    }
                                }}
                            >
                                <option value="">Sélectionner...</option>
                                {allAvailableSuppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                                <option value="new">+ Ajouter nouveau</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>

                        {isCreatingNewSupplier && (
                            <div className="flex gap-2 mt-2">
                                <input
                                    className="flex-1 h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                                    placeholder="Nom du fournisseur..."
                                    value={newSupplierName}
                                    onChange={(e) => setNewSupplierName(e.target.value)}
                                    autoFocus
                                />
                                <button
                                    onClick={() => {
                                        if (!newSupplierName) return;
                                        setNewInvoiceSupplierId('CREATING_NEW');
                                        setIsCreatingNewSupplier(false);
                                    }}
                                    className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                                >
                                    Appliquer
                                </button>
                            </div>
                        )}

                        {newInvoiceSupplierId === 'CREATING_NEW' && (
                            <div className="mt-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-emerald-700">Nouveau fournisseur</p>
                                    <p className="text-sm font-semibold text-slate-900">{newSupplierName}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setNewInvoiceSupplierId('');
                                        setIsCreatingNewSupplier(true);
                                    }}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-colors"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Drag & Drop */}
                    <div
                        className="border border-dashed border-slate-300 rounded-xl p-5 text-center bg-slate-50/50 hover:border-slate-400 transition-colors cursor-pointer"
                        onClick={() => invoiceFileInputRef.current?.click()}
                    >
                        <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center mx-auto mb-2">
                            {tempInvoiceFile ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            ) : (
                                <ImagePlus className="h-5 w-5 text-slate-400" />
                            )}
                        </div>
                        <p className="text-xs text-slate-500">
                            {tempInvoiceFile
                                ? `Fichier sélectionné: ${tempInvoiceFile.name}`
                                : "Glisser une image ou l'ajouter de mon PC (optionnel)"
                            }
                        </p>
                        <input
                            type="file"
                            ref={invoiceFileInputRef}
                            className="hidden"
                            accept="image/*,application/pdf"
                            onChange={handleInvoiceFileSelect}
                        />
                    </div>

                    <div>
                        <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Désignation (N° facture/bon)</label>
                        <input
                            type="text"
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                            placeholder="Ex: Facture 123"
                            value={newExpenseData.item}
                            onChange={(e) => setNewExpenseData({ ...newExpenseData, item: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Montant (DT)</label>
                            <input
                                type="number"
                                step="0.001"
                                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 tabular-nums placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                                placeholder="0.000"
                                value={newExpenseData.price}
                                onChange={(e) => setNewExpenseData({ ...newExpenseData, price: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Date</label>
                            <input
                                type="date"
                                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                                value={newExpenseData.date}
                                onChange={(e) => setNewExpenseData({ ...newExpenseData, date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[13px] font-medium text-slate-700 mb-1.5">État du paiement</label>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                                onClick={() => setNewExpenseData({ ...newExpenseData, status: 'pending' })}
                                className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${newExpenseData.status === 'pending' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Attente
                            </button>
                            <button
                                onClick={() => setNewExpenseData({ ...newExpenseData, status: 'paid' })}
                                className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${newExpenseData.status === 'paid' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Payé
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Step 3 Modal: Items addition */}
            <Modal
                open={showAddInvoiceItemsStep}
                onClose={() => setShowAddInvoiceItemsStep(false)}
                title="Détails de la facture"
                description="Éléments de la facture un par un"
                size="xl"
                footer={<>
                    <div className="mr-auto text-left">
                        <p className="text-xs text-slate-500">Total éléments</p>
                        <p className="text-base font-semibold text-slate-900 tabular-nums">
                            {invoiceItems.reduce((sum, item) => sum + item.totalTTC, 0).toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-xs text-slate-400">DT</span>
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setShowAddInvoiceItemsStep(false);
                            setShowAddInvoiceStep2(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                        Retour
                    </button>
                    <button
                        onClick={async () => {
                                        if (!isAdmin) return;
                                        const totalFromItems = invoiceItems.reduce((sum, i) => sum + i.totalTTC, 0);
                                        const finalPrice = totalFromItems > 0 ? totalFromItems : parseFloat(newExpenseData.price);

                                        try {
                                            const [y, m, d] = newExpenseData.date.split('-');
                                            const formattedDate = `${d}/${m}/${y}`;

                                            // 1. Handle New Supplier Creation
                                            let finalSupplierId = newInvoiceSupplierId;
                                            if (newInvoiceSupplierId === 'CREATING_NEW') {
                                                if (!newSupplierName) throw new Error("Nom du fournisseur manquant");
                                                const id = newSupplierName.toLowerCase().replace(/\s+/g, '_');

                                                // Create global supplier
                                                const { error: supError } = await supabase.from('suppliers').upsert({
                                                    id,
                                                    name: newSupplierName,
                                                    color: newSupplierColor
                                                }, { onConflict: 'id' });
                                                if (supError) throw supError;

                                                // Link to project
                                                const { error: linkError } = await supabase.from('project_suppliers').insert({
                                                    project_id: currentProject?.id,
                                                    supplier_id: id
                                                });
                                                if (linkError && linkError.code !== '23505') throw linkError;

                                                finalSupplierId = id;
                                                setSessionLinkedSuppliers(prev => new Set(prev).add(id));
                                            }

                                            // Upload Image if exists
                                            let invoiceImageUrl = null;
                                            if (tempInvoiceFile) {
                                                const fileExt = tempInvoiceFile.name.split('.').pop();
                                                const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
                                                const filePath = `invoices/${fileName}`;

                                                const { error: uploadError } = await supabase.storage
                                                    .from('documents')
                                                    .upload(filePath, tempInvoiceFile);

                                                if (uploadError) {
                                                    console.error('Error uploading file:', uploadError);
                                                    // Continue without image or alert user? For now continue but maybe alert.
                                                } else {
                                                    const { data: { publicUrl } } = supabase.storage
                                                        .from('documents')
                                                        .getPublicUrl(filePath);
                                                    invoiceImageUrl = publicUrl;
                                                }
                                            }

                                            const { data: expData, error: expError } = await supabase.from('expenses').insert({
                                                project_id: currentProject?.id,
                                                supplier_id: finalSupplierId,
                                                item: newExpenseData.item,
                                                price: finalPrice,
                                                date: formattedDate,
                                                status: newExpenseData.status,
                                                quantity: newExpenseData.quantity,
                                                invoice_image: invoiceImageUrl
                                            }).select().single();

                                            if (expError) throw expError;

                                            if (newInvoiceSupplierId === 'CREATING_NEW') {
                                                // If we created a new supplier, let's switch to its tab to see the new invoice
                                                setActiveTab(finalSupplierId as any);
                                            }

                                            if (invoiceItems.length > 0) {
                                                const finalItems = invoiceItems
                                                    .filter(i => i.designation.trim() !== '')
                                                    .map(i => ({
                                                        project_id: currentProject?.id,
                                                        expense_id: expData.id,
                                                        designation: i.designation,
                                                        quantity: i.quantity,
                                                        unit: i.unit,
                                                        unit_price: i.unitPrice,
                                                        total_ttc: i.totalTTC
                                                    }));

                                                if (finalItems.length > 0) {
                                                    const { error: itemsError } = await supabase.from('invoice_items').insert(finalItems);
                                                    if (itemsError) throw itemsError;
                                                }
                                            }

                                            setShowAddInvoiceItemsStep(false);
                                            setTempInvoiceFile(null); // Reset file
                                            fetchData();
                                            setShowSuccessModal(true);
                                        } catch (error) {
                                            console.error("Error saving invoice flow:", error);
                                            alert("Erreur lors de l'enregistrement");
                                        }
                    }}
                    className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 active:scale-[0.99] transition-colors"
                >
                    <CheckCircle2 className="h-4 w-4" />
                    Terminer
                </button>
                </>}
            >
                <div className="space-y-3">
                    {invoiceItems.length === 0 && (
                        <div className="text-center py-10 rounded-2xl border border-dashed border-slate-200 bg-white">
                            <p className="text-sm text-slate-500 mb-3">Aucun détail ajouté pour le moment</p>
                            <button
                                onClick={() => setInvoiceItems([{ designation: '', quantity: 1, unit: 'pcs', unitPrice: 0, totalTTC: 0, code: '' }])}
                                className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                            >
                                Commencer l'ajout
                            </button>
                        </div>
                    )}

                    {invoiceItems.map((item, idx) => (
                        <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-medium text-slate-500">Élément #{idx + 1}</h4>
                                <button
                                    onClick={() => setInvoiceItems(invoiceItems.filter((_, i) => i !== idx))}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="relative">
                                <input
                                    placeholder="Désignation article (rechercher...)"
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                                    value={item.designation}
                                    onFocus={(e) => { setArticleSearchAnchorEl(e.currentTarget); setActiveArticleSearchIdx(idx); }}
                                    onChange={(e) => {
                                        const updated = [...invoiceItems];
                                        updated[idx].designation = e.target.value.toUpperCase();
                                        setInvoiceItems(updated);
                                        setActiveArticleSearchIdx(idx);
                                    }}
                                />
                                <AnchoredDropdown
                                    open={activeArticleSearchIdx === idx}
                                    anchorEl={articleSearchAnchorEl}
                                    onClose={() => setActiveArticleSearchIdx(null)}
                                    maxHeight={300}
                                >
                                        <div className="pb-1">
                                            {availableArticles
                                                .filter((a: any) => {
                                                    const search = item.designation.toUpperCase().trim();
                                                    if (search === '') return true;
                                                    return a.name.toUpperCase().includes(search) || a.supplier.toUpperCase().includes(search);
                                                })
                                                .slice(0, 30)
                                                .map((article: any, aIdx) => (
                                                    <button
                                                        key={aIdx}
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = [...invoiceItems];
                                                            updated[idx].designation = article.name;
                                                            updated[idx].unitPrice = article.price;
                                                            updated[idx].totalTTC = updated[idx].quantity * article.price;
                                                            setInvoiceItems(updated);
                                                            setActiveArticleSearchIdx(null);
                                                        }}
                                                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
                                                    >
                                                        <div className="flex flex-col items-start gap-0.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-medium text-slate-900">{article.name}</span>
                                                                {article.isOfficial && (
                                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">Officiel</span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <Store className="h-3 w-3 text-slate-400" />
                                                                <span className="text-[11px] text-slate-500">{article.supplier}</span>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-medium text-slate-900 tabular-nums">{article.price.toLocaleString(undefined, { minimumFractionDigits: 3 })} DT</span>
                                                    </button>
                                                ))
                                            }
                                            {availableArticles.filter((a: any) => {
                                                const s = item.designation.toUpperCase().trim();
                                                return a.name.toUpperCase().includes(s) || a.supplier.toUpperCase().includes(s);
                                            }).length === 0 && (
                                                <div className="px-3 py-3 text-center text-xs text-slate-400">
                                                    Nouvelle désignation...
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setActiveArticleSearchIdx(null)}
                                            className="w-full bg-slate-50 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
                                        >
                                            Fermer
                                        </button>
                                </AnchoredDropdown>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Qté</label>
                                    <input
                                        type="number"
                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                                        value={item.quantity}
                                        onChange={(e) => {
                                            const updated = [...invoiceItems];
                                            updated[idx].quantity = Number(e.target.value);
                                            updated[idx].totalTTC = updated[idx].quantity * updated[idx].unitPrice;
                                            setInvoiceItems(updated);
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Prix unit.</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                                        value={item.unitPrice}
                                        onChange={(e) => {
                                            const updated = [...invoiceItems];
                                            updated[idx].unitPrice = Number(e.target.value);
                                            updated[idx].totalTTC = updated[idx].quantity * updated[idx].unitPrice;
                                            setInvoiceItems(updated);
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Total</label>
                                    <div className="w-full h-10 px-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center font-medium text-emerald-700 text-sm tabular-nums">
                                        {item.totalTTC.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {invoiceItems.length > 0 && (
                        <button
                            onClick={() => setInvoiceItems([...invoiceItems, { designation: '', quantity: 1, unit: 'pcs', unitPrice: 0, totalTTC: 0, code: '' }])}
                            className="w-full h-10 border border-dashed border-slate-300 rounded-xl text-sm font-medium text-slate-500 hover:border-slate-900 hover:text-slate-900 transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Ajouter une nouvelle ligne
                        </button>
                    )}
                </div>
            </Modal>




            {isEmpty ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 px-6 flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                        <ClipboardList className="w-7 h-7 text-slate-300" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-lg font-semibold tracking-tight text-slate-900 mb-1">Prêt pour le chantier</h2>
                    <p className="text-sm text-slate-500 mb-6 max-w-sm">
                        Commencez par ajouter un fournisseur ou enregistrez votre première facture pour suivre vos dépenses.
                    </p>
                    {isAdmin && (
                        <div className="flex flex-col sm:flex-row gap-2.5">
                            <button
                                onClick={() => setShowAddSupplierModal(true)}
                                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                            >
                                <Store className="h-4 w-4" /> Fournisseur
                            </button>
                            <button
                                onClick={() => setShowAddInvoiceStep1(true)}
                                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                            >
                                <FilePlus className="h-4 w-4" /> Facture
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* Global Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            {
                                label: 'Total chantier',
                                value: grandTotal,
                                onClick: () => setShowAllExpenses(true),
                                color: 'slate',
                                icon: Receipt
                            },
                            {
                                label: 'Total payé',
                                value: totalPaidGlobal,
                                onClick: () => setShowAllPaid(true),
                                color: 'emerald',
                                icon: CheckCircle2
                            },
                            {
                                label: 'Solde restant',
                                value: totalRemainingGlobal,
                                onClick: () => setShowAllPending(true),
                                color: totalRemainingGlobal < 0 ? 'rose' : 'emerald',
                                icon: TrendingUp
                            },
                            {
                                label: 'Export bilan',
                                value: null,
                                onClick: handleExportPDF,
                                color: 'amber',
                                icon: FileDown,
                                isAction: true
                            }
                        ].map((stat) => (
                            <button
                                key={stat.label}
                                onClick={stat.onClick}
                                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 text-left hover:bg-slate-50 transition-colors flex flex-col"
                            >
                                <div className="flex items-start justify-between">
                                    <p className="text-xs text-slate-500">{stat.label}</p>
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                        stat.color === 'rose' ? 'bg-rose-50 text-rose-600' :
                                            stat.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                                                'bg-slate-100 text-slate-600'
                                        }`}>
                                        <stat.icon className="h-4 w-4" />
                                    </div>
                                </div>
                                {stat.isAction ? (
                                    <span className="text-sm font-medium text-slate-900 flex items-center gap-1.5 mt-2">
                                        Générer PDF <ArrowRight className="h-3.5 w-3.5" />
                                    </span>
                                ) : (
                                    <p className={`text-xl sm:text-2xl font-semibold tabular-nums mt-1 ${stat.label === 'Solde restant' && (stat.value || 0) < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                                        {formatValue(stat.value ?? 0)} <span className="text-xs font-medium text-slate-400">DT</span>
                                    </p>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}


            {/* Add Supplier Modal - Searchable Picker */}
            <Modal
                open={showAddSupplierModal}
                onClose={() => setShowAddSupplierModal(false)}
                title="Fournisseur"
                description="Sélectionner ou créer"
                size="sm"
            >
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                            placeholder="Chercher ou créer..."
                            value={newSupplierName}
                            onChange={(e) => setNewSupplierName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-1.5 no-scrollbar">
                        <p className="text-xs text-slate-400 px-1">Base de données fournisseurs</p>
                        {allAvailableSuppliers
                            .filter(s => s.name.toLowerCase().includes(newSupplierName.toLowerCase()))
                            .map(s => {
                                const isAlreadyInProject = suppliers[s.id];
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => handleLinkSupplierToProject(s.id)}
                                        className={`w-full text-left p-3 rounded-xl border transition-colors flex items-center justify-between group ${isAlreadyInProject ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{s.name}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {isAlreadyInProject ? 'Actif dans ce projet' : 'Cliquer pour utiliser'}
                                            </p>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                );
                            })
                        }

                        {newSupplierName && !allAvailableSuppliers.some(s => s.name.toLowerCase() === newSupplierName.toLowerCase()) && (
                            <button
                                onClick={handleAddSupplier}
                                className="w-full text-left p-3 rounded-xl bg-slate-900 text-white flex items-center gap-3 hover:bg-slate-800 transition-colors"
                            >
                                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                    <Plus className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-white/60">Créer nouveau fournisseur</p>
                                    <p className="text-sm font-medium mt-0.5">{newSupplierName}</p>
                                </div>
                            </button>
                        )}

                        {Object.values(suppliers).filter(s => s.name.toLowerCase().includes(newSupplierName.toLowerCase())).length === 0 && !newSupplierName && (
                            <div className="py-8 text-center text-slate-400">
                                <p className="text-sm">Aucun résultat</p>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Add Deposit Modal */}
            <Modal
                open={showAddDepositModal}
                onClose={closeDepositModal}
                title={editingDepositId ? 'Modifier acompte' : 'Nouvel acompte'}
                size="sm"
                footer={<>
                    <button onClick={closeDepositModal} className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">Annuler</button>
                    <button onClick={handleSaveDeposit} className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 active:scale-[0.99] transition-colors">
                        <CheckCircle2 className="h-4 w-4" />
                        {editingDepositId ? 'Enregistrer' : 'Confirmer'}
                    </button>
                </>}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Montant (DT)</label>
                        <input
                            type="number"
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 tabular-nums placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                            placeholder="0.000"
                            autoFocus
                            value={newDepositData.amount}
                            onChange={(e) => setNewDepositData({ ...newDepositData, amount: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Date</label>
                            <input
                                type="date"
                                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                                value={newDepositData.date}
                                onChange={(e) => setNewDepositData({ ...newDepositData, date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Référence</label>
                            <input
                                type="text"
                                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                                placeholder="Chèque/Virement..."
                                value={newDepositData.ref}
                                onChange={(e) => setNewDepositData({ ...newDepositData, ref: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Payeur</label>
                        <input
                            type="text"
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                            placeholder="Qui a payé ?"
                            value={newDepositData.payer}
                            onChange={(e) => setNewDepositData({ ...newDepositData, payer: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Commercial</label>
                        <input
                            type="text"
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                            placeholder="Reçu par..."
                            value={newDepositData.commercial}
                            onChange={(e) => setNewDepositData({ ...newDepositData, commercial: e.target.value })}
                        />
                    </div>
                </div>
            </Modal>

            {/* Add Expense Modal */}
            <Modal
                open={showAddExpenseModal}
                onClose={closeExpenseModal}
                title={editingExpenseId ? 'Modifier facture/bon' : 'Nouvelle facture/bon'}
                size="xl"
                footer={<>
                    <button onClick={closeExpenseModal} className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">Annuler</button>
                    <button onClick={handleSaveExpense} className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 active:scale-[0.99] transition-colors">
                        <CheckCircle2 className="h-4 w-4" />
                        {editingExpenseId ? 'Enregistrer' : 'Confirmer'}
                    </button>
                </>}
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Désignation (N° facture/bon)</label>
                                <input
                                    type="text"
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                                    placeholder="Ex: Facture 123..."
                                    value={newExpenseData.item}
                                    onChange={(e) => setNewExpenseData({ ...newExpenseData, item: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Date</label>
                                    <input
                                        type="date"
                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                                        value={newExpenseData.date}
                                        onChange={(e) => setNewExpenseData({ ...newExpenseData, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Quantité totale</label>
                                    <input
                                        type="text"
                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                                        placeholder="Ex: 1"
                                        value={newExpenseData.quantity}
                                        onChange={(e) => setNewExpenseData({ ...newExpenseData, quantity: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Montant global (DT)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="number"
                                        step="0.001"
                                        className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 tabular-nums placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                                        placeholder="0.000"
                                        value={newExpenseData.price}
                                        onChange={(e) => setNewExpenseData({ ...newExpenseData, price: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">État du paiement</label>
                                <select
                                    value={newExpenseData.status}
                                    onChange={(e) => setNewExpenseData({ ...newExpenseData, status: e.target.value as PaymentStatus })}
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                                >
                                    <option value="pending">En attente</option>
                                    <option value="paid">Payé</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-100">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-slate-400" />
                                <h4 className="text-sm font-medium text-slate-900">Articles / désignations</h4>
                            </div>
                            <button
                                onClick={() => {
                                    const newItem: InvoiceItem = {
                                        code: '',
                                        designation: '',
                                        unit: 'U',
                                        quantity: 1,
                                        unitPrice: 0,
                                        totalTTC: 0
                                    };
                                    setInvoiceItems([...invoiceItems, newItem]);
                                }}
                                className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Ajouter article
                            </button>
                        </div>

                        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                            <table className="w-full border-collapse">
                                <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                                    <tr>
                                        <th className="px-4 py-2.5 text-left">Article</th>
                                        <th className="px-4 py-2.5 text-center w-20">Qté</th>
                                        <th className="px-4 py-2.5 text-right w-28">P.U TTC</th>
                                        <th className="px-4 py-2.5 text-right w-28">Total</th>
                                        <th className="px-4 py-2.5 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoiceItems.map((item, idx) => (
                                        <tr key={idx} className="border-t border-slate-100">
                                            <td className="px-3 py-2 relative">
                                                <input
                                                    className="w-full bg-transparent border-b border-transparent focus:border-slate-300 px-1 py-1 text-sm text-slate-900 outline-none"
                                                    value={item.designation}
                                                    onFocus={(e) => { setArticleSearchAnchorEl(e.currentTarget); setActiveArticleSearchIdx(idx); }}
                                                    onChange={(e) => {
                                                        const updated = [...invoiceItems];
                                                        updated[idx].designation = e.target.value.toUpperCase();
                                                        setInvoiceItems(updated);
                                                        setActiveArticleSearchIdx(idx);
                                                    }}
                                                    placeholder="Rechercher article..."
                                                />
                                                <AnchoredDropdown
                                                    open={activeArticleSearchIdx === idx}
                                                    anchorEl={articleSearchAnchorEl}
                                                    onClose={() => setActiveArticleSearchIdx(null)}
                                                    width={320}
                                                    maxHeight={300}
                                                >
                                                        <div className="pb-1">
                                                            {availableArticles
                                                                .filter((a: any) => {
                                                                    const search = item.designation.toUpperCase().trim();
                                                                    if (search === '') return true;
                                                                    return a.name.toUpperCase().includes(search) || a.supplier.toUpperCase().includes(search);
                                                                })
                                                                .slice(0, 30)
                                                                .map((article: any, aIdx) => (
                                                                    <button
                                                                        key={aIdx}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const updated = [...invoiceItems];
                                                                            updated[idx].designation = article.name;
                                                                            updated[idx].unitPrice = article.price;
                                                                            updated[idx].totalTTC = updated[idx].quantity * article.price;
                                                                            setInvoiceItems(updated);
                                                                            setActiveArticleSearchIdx(null);
                                                                        }}
                                                                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
                                                                    >
                                                                        <div className="flex flex-col items-start gap-0.5">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-xs font-medium text-slate-900">{article.name}</span>
                                                                                {article.isOfficial && (
                                                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">Officiel</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5">
                                                                                <Store className="h-3 w-3 text-slate-400" />
                                                                                <span className="text-[11px] text-slate-500">{article.supplier}</span>
                                                                            </div>
                                                                        </div>
                                                                        <span className="text-xs font-medium text-slate-900 tabular-nums">{article.price.toLocaleString(undefined, { minimumFractionDigits: 3 })} DT</span>
                                                                    </button>
                                                                ))
                                                            }
                                                            {availableArticles.filter((a: any) => {
                                                                const s = item.designation.toUpperCase().trim();
                                                                return a.name.toUpperCase().includes(s) || a.supplier.toUpperCase().includes(s);
                                                            }).length === 0 && (
                                                                <div className="px-3 py-3 text-center text-xs text-slate-400">
                                                                    Nouvel article...
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveArticleSearchIdx(null)}
                                                            className="w-full bg-slate-50 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
                                                        >
                                                            Fermer
                                                        </button>
                                                </AnchoredDropdown>
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="number"
                                                    className="w-full text-center bg-transparent border-b border-transparent focus:border-slate-300 px-1 py-1 text-sm text-slate-900 tabular-nums outline-none"
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const updated = [...invoiceItems];
                                                        updated[idx].quantity = parseFloat(e.target.value) || 0;
                                                        updated[idx].totalTTC = updated[idx].quantity * updated[idx].unitPrice;
                                                        setInvoiceItems(updated);
                                                    }}
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    className="w-full text-right bg-transparent border-b border-transparent focus:border-slate-300 px-1 py-1 text-sm text-slate-900 tabular-nums outline-none"
                                                    value={item.unitPrice}
                                                    onChange={(e) => {
                                                        const updated = [...invoiceItems];
                                                        updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                                                        updated[idx].totalTTC = updated[idx].quantity * updated[idx].unitPrice;
                                                        setInvoiceItems(updated);
                                                    }}
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <span className="text-sm font-medium text-slate-900 tabular-nums">{item.totalTTC.toLocaleString(undefined, { minimumFractionDigits: 3 })}</span>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = invoiceItems.filter((_, i) => i !== idx);
                                                        setInvoiceItems(updated);
                                                    }}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {invoiceItems.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                                                Aucun article détaillé
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Auto-sum feature */}
                        {invoiceItems.length > 0 && (
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const total = invoiceItems.reduce((sum, item) => sum + item.totalTTC, 0);
                                        setNewExpenseData({ ...newExpenseData, price: total.toFixed(3) });
                                    }}
                                    className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
                                >
                                    Appliquer le total des articles ({invoiceItems.reduce((sum, item) => sum + item.totalTTC, 0).toLocaleString(undefined, { minimumFractionDigits: 3 })} DT)
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Image de la facture / bon — ajout direct */}
                    <div className="space-y-2 pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4 text-slate-400" />
                            <h4 className="text-sm font-medium text-slate-900">Image de la facture / bon</h4>
                        </div>
                        {(expenseImagePreview || expenseExistingImage) ? (
                            <div className="relative inline-block">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={(expenseImagePreview || expenseExistingImage) as string}
                                    alt="Aperçu facture"
                                    className="h-40 w-auto max-w-full rounded-xl border border-slate-200 object-contain bg-slate-50"
                                />
                                <button
                                    type="button"
                                    onClick={clearExpenseImage}
                                    className="absolute -top-2 -right-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-500 shadow-sm hover:text-rose-600 hover:border-rose-200 transition-colors"
                                    aria-label="Retirer l'image"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center gap-1.5 h-32 rounded-xl border border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:border-slate-400 hover:bg-slate-100 transition-colors">
                                <Upload className="h-5 w-5 text-slate-400" />
                                <span className="text-sm font-medium text-slate-600">Ajouter une image</span>
                                <span className="text-xs text-slate-400">JPG, PNG — directement depuis votre appareil</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleExpenseImageSelect(e.target.files?.[0] || null)}
                                />
                            </label>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Breakdown Modal */}
            <Modal
                open={showBreakdown}
                onClose={() => setShowBreakdown(false)}
                title="Bilan par fournisseur"
                description="Payé − Total montant = Solde (dette si négatif)"
                size="lg"
                footer={
                    <div className="flex w-full justify-between items-center">
                        <span className="text-sm text-slate-600">Solde général</span>
                        <span className={`text-lg font-semibold tabular-nums ${totalRemainingGlobal < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{totalRemainingGlobal.toLocaleString(undefined, { minimumFractionDigits: 3 })} DT</span>
                    </div>
                }
            >
                <div className="space-y-2">
                    {supplierStats.map(s => (
                        <div key={s.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-2 h-2 rounded-full ${s.color}`} />
                                <span className="text-sm font-medium text-slate-900">{s.name}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <p className="text-xs text-slate-400">Total montant</p>
                                    <p className="text-sm font-medium text-slate-700 tabular-nums">{s.totalCost.toLocaleString(undefined, { minimumFractionDigits: 3 })}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Payé</p>
                                    <p className="text-sm font-medium text-emerald-600 tabular-nums">{s.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 3 })}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400">Solde</p>
                                    <p className={`text-sm font-semibold tabular-nums ${s.remaining < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{s.remaining.toLocaleString(undefined, { minimumFractionDigits: 3 })}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>

            {/* Pending Expenses Modal */}
            <Modal
                open={showAllPending}
                onClose={() => setShowAllPending(false)}
                title="Factures en attente"
                description="Par fournisseur"
                size="xl"
                footer={
                    <div className="flex w-full justify-between items-center">
                        <span className="text-sm text-slate-600">Bilan total solde</span>
                        <span className={`text-lg font-semibold tabular-nums ${totalRemainingGlobal < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {totalRemainingGlobal.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-sm">DT</span>
                        </span>
                    </div>
                }
            >
                <div className="space-y-4">
                                {supplierStats
                                    .filter(stat => {
                                        const supplier = suppliers[stat.id];
                                        return supplier && (supplier.expenses.some(e => e.status === 'pending') || stat.remaining < 0);
                                    })
                                    .map(stat => {
                                        const supplier = suppliers[stat.id]!;
                                        const pendingExpenses = supplier.expenses.filter(e => e.status === 'pending');
                                        const isExpanded = expandedSuppliers[`pending-${supplier.id}`] ?? true;
                                        const solde = stat.remaining;
                                        return (
                                            <div key={supplier.id}>
                                                <div
                                                    className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
                                                    onClick={() => setExpandedSuppliers(prev => ({ ...prev, [`pending-${supplier.id}`]: !isExpanded }))}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                                                        <div className={`w-8 h-8 rounded-lg ${supplier.color} flex items-center justify-center text-white text-xs font-semibold`}>
                                                            {supplier.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <h3 className="text-sm font-medium text-slate-900">{supplier.name}</h3>
                                                            <p className="text-xs text-slate-400">{pendingExpenses.length} facture{pendingExpenses.length > 1 ? 's' : ''}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-sm font-semibold tabular-nums ${solde < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                            {solde.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-xs">DT</span>
                                                        </p>
                                                        <p className="text-xs text-slate-400">Solde actuel</p>
                                                    </div>
                                                </div>
                                                {isExpanded && (
                                                    <div className="space-y-0.5 pl-10">
                                                        {pendingExpenses.map((e, i) => (
                                                            <div key={i} className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-50 rounded-lg transition-colors">
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm text-slate-700 truncate">{e.item}</p>
                                                                    <p className="text-xs text-slate-400">{e.date}</p>
                                                                </div>
                                                                <p className="text-sm font-medium text-rose-600 ml-3 tabular-nums">{e.price.toLocaleString(undefined, { minimumFractionDigits: 3 })}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                }
                                {Object.values(suppliers).every(s => s.expenses.every(e => e.status !== 'pending')) && (
                                    <div className="py-12 text-center text-slate-500 flex flex-col items-center">
                                        <CheckCircle2 className="h-10 w-10 mb-3 text-emerald-200" />
                                        <p className="text-sm font-medium text-emerald-600">Tout est payé !</p>
                                    </div>
                                )}
                </div>
            </Modal>

            {/* Paid Expenses Modal */}
            <Modal
                open={showAllPaid}
                onClose={() => setShowAllPaid(false)}
                title="Factures payées"
                description="Par fournisseur"
                size="xl"
                footer={
                    <div className="flex w-full justify-between items-center">
                        <span className="text-sm text-slate-600">Total payé</span>
                        <span className="text-lg font-semibold text-emerald-600 tabular-nums">
                            {Object.values(suppliers).reduce((acc, s) => acc + s.expenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.price, 0), 0).toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-sm">DT</span>
                        </span>
                    </div>
                }
            >
                <div className="space-y-4">
                                {Object.values(suppliers)
                                    .filter(s => s.expenses.some(e => e.status === 'paid'))
                                    .map(supplier => {
                                        const paidExpenses = supplier.expenses.filter(e => e.status === 'paid');
                                        const total = paidExpenses.reduce((sum, e) => sum + e.price, 0);
                                        const isExpanded = expandedSuppliers[`paid-${supplier.id}`] ?? true;
                                        return (
                                            <div key={supplier.id}>
                                                <div
                                                    className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
                                                    onClick={() => setExpandedSuppliers(prev => ({ ...prev, [`paid-${supplier.id}`]: !isExpanded }))}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                                                        <div className={`w-8 h-8 rounded-lg ${supplier.color} flex items-center justify-center text-white text-xs font-semibold`}>
                                                            {supplier.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <h3 className="text-sm font-medium text-slate-900">{supplier.name}</h3>
                                                            <p className="text-xs text-slate-400">{paidExpenses.length} facture{paidExpenses.length > 1 ? 's' : ''}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-semibold text-emerald-600 tabular-nums">{total.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-xs">DT</span></p>
                                                    </div>
                                                </div>
                                                {isExpanded && (
                                                    <div className="space-y-0.5 pl-10">
                                                        {paidExpenses.map((e, i) => (
                                                            <div key={i} className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-50 rounded-lg transition-colors">
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm text-slate-700 truncate">{e.item}</p>
                                                                    <p className="text-xs text-slate-400">{e.date}</p>
                                                                </div>
                                                                <p className="text-sm font-medium text-emerald-600 ml-3 tabular-nums">{e.price.toLocaleString(undefined, { minimumFractionDigits: 3 })}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                }
                                {Object.values(suppliers).every(s => s.expenses.every(e => e.status !== 'paid')) && (
                                    <div className="py-12 text-center text-slate-500 flex flex-col items-center">
                                        <AlertCircle className="h-10 w-10 mb-3 text-slate-200" />
                                        <p className="text-sm font-medium text-slate-600">Aucun paiement</p>
                                    </div>
                                )}
                </div>
            </Modal>

            {/* All Expenses Modal */}
            <Modal
                open={showAllExpenses}
                onClose={() => setShowAllExpenses(false)}
                title="Toutes les factures"
                description="Par fournisseur"
                size="xl"
                footer={
                    <div className="flex w-full justify-between items-center">
                        <span className="text-sm text-slate-600">Total chantier</span>
                        <span className="text-lg font-semibold text-slate-900 tabular-nums">
                            {Object.values(suppliers).reduce((acc, s) => acc + s.expenses.reduce((sum, e) => sum + e.price, 0), 0).toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-sm text-slate-500">DT</span>
                        </span>
                    </div>
                }
            >
                <div className="space-y-4">
                                {Object.values(suppliers)
                                    .filter(s => s.expenses.length > 0)
                                    .map(supplier => {
                                        const total = supplier.expenses.reduce((sum, e) => sum + e.price, 0);
                                        const paidCount = supplier.expenses.filter(e => e.status === 'paid').length;
                                        const pendingCount = supplier.expenses.filter(e => e.status === 'pending').length;
                                        const isExpanded = expandedSuppliers[`all-${supplier.id}`] ?? true;
                                        return (
                                            <div key={supplier.id}>
                                                <div
                                                    className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
                                                    onClick={() => setExpandedSuppliers(prev => ({ ...prev, [`all-${supplier.id}`]: !isExpanded }))}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                                                        <div className={`w-8 h-8 rounded-lg ${supplier.color} flex items-center justify-center text-white text-xs font-semibold`}>
                                                            {supplier.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <h3 className="text-sm font-medium text-slate-900">{supplier.name}</h3>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <p className="text-xs text-slate-400">{supplier.expenses.length} facture{supplier.expenses.length > 1 ? 's' : ''}</p>
                                                                {paidCount > 0 && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">{paidCount} payé{paidCount > 1 ? 's' : ''}</span>}
                                                                {pendingCount > 0 && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">{pendingCount} en attente</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-semibold text-slate-900 tabular-nums">{total.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-xs">DT</span></p>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowAllExpenses(false);
                                                                setActiveTab(supplier.id as SupplierType);
                                                            }}
                                                            className="mt-1 inline-flex items-center justify-center h-7 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors"
                                                        >
                                                            Voir
                                                        </button>
                                                    </div>
                                                </div>
                                                {isExpanded && (
                                                    <div className="space-y-0.5 pl-10">
                                                        {supplier.expenses.map((e, i) => (
                                                            <div key={i} className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-50 rounded-lg transition-colors">
                                                                <div className="flex-1 min-w-0 flex items-center gap-2">
                                                                    <p className="text-sm text-slate-700 truncate flex-1">{e.item}</p>
                                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${e.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                                        {e.status === 'paid' ? 'Payé' : 'Attente'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2 ml-3">
                                                                    <p className="text-xs text-slate-400">{e.date}</p>
                                                                    <p className={`text-sm font-medium tabular-nums ${e.status === 'paid' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                                        {e.price.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                }
                                {Object.values(suppliers).every(s => s.expenses.length === 0) && (
                                    <div className="py-12 text-center text-slate-500 flex flex-col items-center">
                                        <Package className="h-10 w-10 mb-3 text-slate-200" />
                                        <p className="text-sm font-medium text-slate-600">Aucune facture</p>
                                    </div>
                                )}
                </div>
            </Modal>

            {/* Layout Main */}
            {
                !isEmpty && (
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Tabs / Supplier Sidebar */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="w-full lg:w-72 flex-shrink-0"
                        >
                            <div className="bg-white rounded-2xl border border-slate-200 p-3 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible no-scrollbar">
                                <div className="hidden lg:flex items-center justify-between mb-1 px-1">
                                    <span className="text-xs font-medium text-slate-500">Partenaires</span>
                                    {isAdmin && (
                                        <button
                                            onClick={() => setShowAddSupplierModal(true)}
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                <SupplierList
                                    orderedSuppliers={orderedSuppliers}
                                    activeTab={activeTab}
                                    setActiveTab={setActiveTab}
                                    handleReorder={handleReorder}
                                    isAdmin={isAdmin}
                                    setSupplierToDelete={setSupplierToDelete}
                                    setShowDeleteConfirmModal={setShowDeleteConfirmModal}
                                    setDeleteConfirmInput={setDeleteConfirmInput}
                                />
                                {isAdmin && (
                                    <button
                                        onClick={() => setShowAddSupplierModal(true)}
                                        className="lg:hidden shrink-0 inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
                                    >
                                        <Plus className="h-4 w-4" /> Ajouter
                                    </button>
                                )}
                            </div>

                            {/* General Note Sidebar Section (Desktop) */}
                            {isAdmin && (
                                <div
                                    className="mt-4 hidden lg:block bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => {
                                        setNoteEditorType('general');
                                        setTempNoteValue(generalNote);
                                        setShowNoteModal(true);
                                    }}
                                >
                                    <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                                        <span className="text-xs font-medium text-slate-500 flex items-center gap-2">
                                            <FileText className="h-3.5 w-3.5" />
                                            Mémo général
                                        </span>
                                        <Pencil className="h-3 w-3 text-slate-400" />
                                    </div>
                                    <div className="p-4">
                                        <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap">
                                            {generalNote || "Aucune note générale..."}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex-1 space-y-6"
                        >
                            {!currentSupplier ? (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 flex flex-col items-center justify-center text-center">
                                    <Package className="h-10 w-10 text-slate-300 mb-3" />
                                    <h2 className="text-base font-semibold text-slate-900">Aucun fournisseur</h2>
                                    <p className="text-sm text-slate-500 max-w-xs mt-1">
                                        Sélectionnez ou ajoutez un fournisseur pour afficher ses détails.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <h2 className="text-xl font-semibold tracking-tight text-slate-900 truncate">{currentSupplier.name}</h2>
                                            <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
                                                <Store className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                <span className="truncate">{currentSupplier.address || 'Partenaire officiel'}</span>
                                            </p>
                                        </div>
                                        {isAdmin && (
                                            <button
                                                onClick={() => {
                                                    setSupplierToDelete({ id: currentSupplier.id, name: currentSupplier.name });
                                                    setShowDeleteConfirmModal(true);
                                                    setDeleteConfirmInput('');
                                                }}
                                                className="lg:hidden shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                title="Retirer ce fournisseur"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 w-full lg:w-auto">
                                        <div className="bg-white rounded-2xl border border-slate-200 p-3 text-center min-w-[110px]">
                                            <p className="text-xs text-slate-500">Total</p>
                                            <p className="text-base font-semibold text-slate-900 tabular-nums mt-0.5">{formatValue(activeStat.totalCost)}</p>
                                        </div>
                                        <div className="bg-white rounded-2xl border border-slate-200 p-3 text-center min-w-[110px]">
                                            <p className="text-xs text-slate-500">Payé</p>
                                            <p className="text-base font-semibold text-emerald-600 tabular-nums mt-0.5">{formatValue(activeStat.totalPaid)}</p>
                                        </div>
                                        <div className="bg-white rounded-2xl border border-slate-200 p-3 text-center min-w-[110px]">
                                            <p className="text-xs text-slate-500">Solde</p>
                                            <p className={`text-base font-semibold tabular-nums mt-0.5 ${activeStat.remaining < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{formatValue(activeStat.remaining)}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentSupplier && (
                                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
                                    {[
                                        { id: 'factures', label: 'Factures & bons', count: currentSupplier.expenses?.length || 0 },
                                        { id: 'acomptes', label: 'Acomptes', count: currentSupplier.deposits?.length || 0 },
                                        { id: 'documents', label: 'Documents', count: uploadedDocs.filter(d => d.supplierId === activeTab).length },
                                        { id: 'notes', label: 'Notes', count: null as number | null },
                                    ].map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => setPanelTab(t.id as any)}
                                            className={`flex-1 inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-3 h-9 rounded-lg text-sm font-medium transition-colors ${panelTab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            {t.label}
                                            {t.count !== null && t.count > 0 && (
                                                <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold tabular-nums ${panelTab === t.id ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                    {t.count}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* General Note (Mobile Only - below supplier header) */}
                            {currentSupplier && panelTab === 'notes' && (<>
                            {isAdmin && (
                                <div
                                    className="lg:hidden bg-white border border-slate-200 rounded-2xl overflow-hidden cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => {
                                        setNoteEditorType('general');
                                        setTempNoteValue(generalNote);
                                        setShowNoteModal(true);
                                    }}
                                >
                                    <div className="px-4 py-2.5 border-b border-slate-100 flex justify-between items-center">
                                        <span className="text-xs font-medium text-slate-500 flex items-center gap-2">
                                            <FileText className="h-3.5 w-3.5" />
                                            Note générale
                                        </span>
                                        <Pencil className="h-3 w-3 text-slate-400" />
                                    </div>
                                    <div className="p-4 max-h-[150px] overflow-y-auto">
                                        <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap">
                                            {generalNote || "Aucune note générale pour le moment..."}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Notes Section */}
                            {isAdmin && (
                                <div
                                    className="bg-white border border-slate-200 rounded-2xl p-4 flex items-start gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => {
                                        setNoteEditorType('supplier');
                                        setTempNoteValue(currentSupplier?.notes || '');
                                        setShowNoteModal(true);
                                    }}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                                        <FileText className="h-4 w-4 text-amber-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <span className="text-xs font-medium text-slate-500">Notes du chantier</span>
                                            <span className="text-xs font-medium text-slate-500 hover:text-slate-700 shrink-0 ml-2">Éditer</span>
                                        </div>
                                        <p className="text-[13px] text-slate-600 leading-relaxed max-h-[60px] overflow-y-auto pr-1">
                                            {currentSupplier?.notes || "Aucune consigne particulière."}
                                        </p>
                                    </div>
                                </div>
                            )}
                            </>)}

                            {/* Upload Modal */}
                            <Modal
                                open={showUploadModal}
                                onClose={() => setShowUploadModal(false)}
                                title="Importer un document"
                                description="Facture, devis ou reçu"
                                size="xl"
                                footer={manualForm.files.length > 0 ? (
                                    <button
                                        onClick={async () => {
                                            await handleManualSubmitNew();
                                            setShowUploadModal(false);
                                        }}
                                        disabled={isUploading}
                                        className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                                    >
                                        {isUploading ? (
                                            <>
                                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Importation {uploadProgress}%
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="h-4 w-4" />
                                                Importer {manualForm.files.length} {manualForm.files.length > 1 ? 'documents' : 'document'}
                                            </>
                                        )}
                                    </button>
                                ) : undefined}
                            >
                                {/* File Upload Zone */}
                                <div
                                    onClick={() => !isUploading && fileInputRef.current?.click()}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={`
                                        w-full relative cursor-pointer
                                        border border-dashed rounded-2xl p-6
                                        flex flex-col items-center justify-center text-center transition-colors min-h-[180px]
                                        ${isDragging ? 'border-slate-900 bg-slate-50' : ''}
                                        ${manualForm.files.length > 0 && !isDragging
                                            ? 'border-emerald-200 bg-emerald-50/40'
                                            : !isDragging ? 'border-slate-300 hover:border-slate-400 hover:bg-slate-50' : ''
                                        }
                                        ${isUploading ? 'opacity-50 pointer-events-none' : ''}
                                    `}
                                >
                                    {manualForm.files.length > 0 ? (
                                        <>
                                            <div className="flex flex-wrap gap-2 mb-3 justify-center">
                                                {previewUrls.map((url, i) => (
                                                    <div key={i} className="relative group/preview">
                                                        <div className="w-20 h-20 rounded-xl border border-slate-200 overflow-hidden bg-white">
                                                            {manualForm.files[i]?.type.startsWith('image/') ? (
                                                                <img src={url} className="w-full h-full object-cover" alt="Preview" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-slate-100 flex-col gap-1">
                                                                    <FileText className="h-6 w-6 text-slate-400" />
                                                                    <span className="text-[8px] text-slate-500 px-1 truncate w-full">{manualForm.files[i]?.name}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveFile(i);
                                                            }}
                                                            className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-700 transition-colors"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-sm font-medium text-emerald-700">{manualForm.files.length} fichiers sélectionnés</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-xs text-slate-500">Cliquez ou glissez pour ajouter</p>
                                                <span className="text-slate-300">•</span>
                                                <button
                                                    onClick={handleClearAll}
                                                    className="text-xs font-medium text-rose-600 hover:underline z-10 relative"
                                                >
                                                    Tout supprimer
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                                                <Upload className={`h-6 w-6 ${isDragging ? 'text-slate-900' : 'text-slate-400'}`} />
                                            </div>
                                            <p className="text-sm font-medium text-slate-600">
                                                {isDragging ? 'Déposez les fichiers ici' : 'Cliquez ou glissez pour choisir'}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">Sélection multiple supportée</p>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*,application/pdf"
                                        multiple
                                        onChange={handleManualFileSelect}
                                    />
                                </div>
                            </Modal>



                            {/* Uploaded Documents Review Section */}
                            {currentSupplier && panelTab === 'documents' && (<>
                            {isAdmin && (
                                <div className="space-y-4">
                                    <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
                                        <button
                                            className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                            onClick={() => setShowUploadedDocs(!showUploadedDocs)}
                                        >
                                            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                                <FileText className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <h2 className="text-sm font-medium text-slate-900">Documents importés</h2>
                                                <p className="text-xs text-slate-500">{uploadedDocs.filter(doc => doc.supplierId === activeTab).length} fichiers archivés</p>
                                            </div>
                                            <ChevronDown className={`h-4 w-4 text-slate-400 ml-2 shrink-0 transition-transform ${showUploadedDocs ? 'rotate-180' : ''}`} />
                                        </button>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => {
                                                    setDocToDelete({ id: 'all' });
                                                    setShowDocDeleteModal(true);
                                                }}
                                                className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-slate-200 text-rose-600 text-sm font-medium hover:bg-rose-50 transition-colors"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                <span className="hidden sm:inline">Tout supprimer</span>
                                            </button>
                                            <button
                                                onClick={() => setShowUploadModal(true)}
                                                className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                                            >
                                                <Plus className="h-4 w-4" />
                                                <span className="hidden sm:inline">Importer</span>
                                            </button>
                                        </div>
                                    </div>

                                    {showUploadedDocs && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {uploadedDocs.filter(doc => doc.supplierId === activeTab).length > 0 ? (
                                                uploadedDocs
                                                    .filter(doc => doc.supplierId === activeTab)
                                                    .map((doc) => (
                                                        <div
                                                            key={doc.id}
                                                            className="bg-white rounded-2xl border border-slate-200 p-3 relative group"
                                                        >
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDocToDelete({ id: doc.id, fileName: doc.fileName });
                                                                    setShowDocDeleteModal(true);
                                                                }}
                                                                className="absolute top-2 right-2 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/90 text-slate-400 hover:bg-rose-600 hover:text-white transition-colors z-10 border border-slate-200"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>

                                                            <div
                                                                className="w-full h-40 bg-slate-50 rounded-xl mb-3 overflow-hidden cursor-pointer relative border border-slate-200"
                                                                onClick={() => setViewingImage(doc.url)}
                                                            >
                                                                {doc.fileName.toLowerCase().endsWith('.pdf') ? (
                                                                    <div className="w-full h-full flex flex-col items-center justify-center">
                                                                        <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 mb-2">
                                                                            <FileText className="h-6 w-6" />
                                                                        </div>
                                                                        <span className="text-xs text-slate-400">Format PDF</span>
                                                                    </div>
                                                                ) : (
                                                                    <img src={doc.url} className="w-full h-full object-cover" alt={doc.fileName} />
                                                                )}
                                                                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                                    <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                                                                        <Eye className="text-slate-700 h-5 w-5" />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2.5">
                                                                <div>
                                                                    <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Notes de document</label>
                                                                    <textarea
                                                                        placeholder="Préciser l'utilité du document..."
                                                                        className="w-full px-3 py-2.5 min-h-[64px] rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition resize-none"
                                                                        rows={2}
                                                                        defaultValue={doc.note}
                                                                        onBlur={(e) => handleUpdateDocNote(doc.id, e.target.value)}
                                                                    />
                                                                </div>

                                                                <button
                                                                    onClick={() => {
                                                                        setReplacingDocId(doc.id);
                                                                        replaceFileInputRef.current?.click();
                                                                    }}
                                                                    disabled={isUploading}
                                                                    className="w-full inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                                                                >
                                                                    <Upload className="h-3.5 w-3.5" />
                                                                    {isUploading && replacingDocId === doc.id ? 'Traitement...' : 'Remplacer le fichier'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                            ) : (
                                                <div className="col-span-full py-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
                                                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
                                                        <ImagePlus className="h-6 w-6 text-slate-300" />
                                                    </div>
                                                    <p className="text-sm text-slate-500">Aucun document importé</p>
                                                    <button
                                                        onClick={() => setShowUploadModal(true)}
                                                        className="mt-3 inline-flex items-center justify-center h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                                                    >
                                                        Importer le premier
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            </>)}

                            {/* Factures & Bons section */}
                            {currentSupplier && panelTab === 'factures' && (
                            <div className="space-y-4">
                                <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
                                    <button
                                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                        onClick={() => setShowExpensesSection(!showExpensesSection)}
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                            <Receipt className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="text-sm font-medium text-slate-900">Factures &amp; bons</h2>
                                            <p className="text-xs text-slate-500">{currentSupplier?.expenses?.length || 0} documents enregistrés</p>
                                        </div>
                                        <ChevronDown className={`h-4 w-4 text-slate-400 ml-2 shrink-0 transition-transform ${showExpensesSection ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isAdmin && (
                                        <button
                                            onClick={() => setShowAddExpenseModal(true)}
                                            className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors shrink-0"
                                        >
                                            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Ajouter</span>
                                        </button>
                                    )}
                                </div>

                                {showExpensesSection && (
                                    <div className="space-y-3">
                                        {/* Filters */}
                                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                                            {[
                                                { id: 'all', label: 'Tout' },
                                                { id: 'pending', label: 'Attente' },
                                                { id: 'paid', label: 'Payé' }
                                            ].map(filter => (
                                                <button
                                                    key={filter.id}
                                                    onClick={() => setStatusFilter(filter.id as any)}
                                                    className={`px-3 h-8 rounded-lg text-sm font-medium transition-colors ${statusFilter === filter.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                >
                                                    {filter.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Desktop table */}
                                        <div className="hidden md:block rounded-2xl border border-slate-200 overflow-hidden bg-white">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                                                    <tr>
                                                        <th className="px-3 py-3 w-10 text-center">
                                                            <input
                                                                type="checkbox"
                                                                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
                                                                checked={currentSupplier?.expenses.length > 0 && selectedExpenseIds.size === currentSupplier.expenses.length}
                                                                onChange={toggleSelectAll}
                                                            />
                                                        </th>
                                                        <th className="px-2 py-3 text-center w-8"></th>
                                                        <th className="px-4 py-3 text-left">
                                                            <button onClick={() => handleSort('date')} className="inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors">
                                                                Désignation / Date
                                                                {sortConfig.key === 'date'
                                                                    ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-slate-700" /> : <ArrowDown className="h-3.5 w-3.5 text-slate-700" />)
                                                                    : <ArrowUpDown className="h-3.5 w-3.5 text-slate-300" />}
                                                            </button>
                                                        </th>
                                                        <th className="px-4 py-3 text-center w-32">État</th>
                                                        <th className="px-4 py-3 text-right w-40">
                                                            <button onClick={() => handleSort('price')} className="inline-flex items-center gap-1.5 ml-auto hover:text-slate-900 transition-colors">
                                                                Montant TTC
                                                                {sortConfig.key === 'price'
                                                                    ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-slate-700" /> : <ArrowDown className="h-3.5 w-3.5 text-slate-700" />)
                                                                    : <ArrowUpDown className="h-3.5 w-3.5 text-slate-300" />}
                                                            </button>
                                                        </th>
                                                        <th className="px-4 py-3 text-right w-32">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sortedExpenses.map((e, index) => {
                                                        const isExpanded = expandedRows[e.id];
                                                        return (
                                                            <React.Fragment key={e.id}>
                                                                <tr
                                                                    className={`group border-t border-slate-100 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                                                                    onClick={() => toggleRow(e.id)}
                                                                >
                                                                    <td className="px-3 py-3 text-center" onClick={(ev) => ev.stopPropagation()}>
                                                                        <input
                                                                            type="checkbox"
                                                                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
                                                                            checked={selectedExpenseIds.has(e.id)}
                                                                            onChange={() => toggleSelectExpense(e.id)}
                                                                        />
                                                                    </td>
                                                                    <td className="px-2 py-3">
                                                                        <div className={`inline-flex items-center justify-center w-6 h-6 rounded-lg transition-colors ${isExpanded ? 'bg-slate-900 text-white rotate-180' : 'text-slate-400 group-hover:text-slate-700'}`}>
                                                                            <ChevronDown className="h-4 w-4" />
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <span className="text-sm font-medium text-slate-900 inline-flex items-center gap-2">
                                                                                {e.item}
                                                                                {e.items && e.items.length > 0 && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium">{e.items.length} art.</span>}
                                                                            </span>
                                                                            <span className="text-xs text-slate-400 flex items-center gap-1.5">
                                                                                <Clock className="h-3 w-3" /> {e.date}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                                                                        <div className="flex justify-center">
                                                                            {isAdmin ? (
                                                                                <button
                                                                                    onClick={() => updateStatus(e.id, e.status === 'paid' ? 'pending' : 'paid')}
                                                                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${e.status === 'paid'
                                                                                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                                                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                                                        }`}
                                                                                >
                                                                                    <div className={`w-1.5 h-1.5 rounded-full ${e.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                                                    {e.status === 'paid' ? 'Payé' : 'En attente'}
                                                                                </button>
                                                                            ) : (
                                                                                <span
                                                                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${e.status === 'paid'
                                                                                        ? 'bg-emerald-50 text-emerald-700'
                                                                                        : 'bg-amber-50 text-amber-700'
                                                                                        }`}
                                                                                >
                                                                                    <div className={`w-1.5 h-1.5 rounded-full ${e.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                                                    {e.status === 'paid' ? 'Payé' : 'En attente'}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right">
                                                                        <span className="text-sm font-semibold text-slate-900 tabular-nums">
                                                                            {formatValue(e.price)} <span className="text-xs font-medium text-slate-400">DT</span>
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right" onClick={(ev) => ev.stopPropagation()}>
                                                                        <div className="flex items-center justify-end gap-1">
                                                                            <button
                                                                                onClick={() => e.invoiceImage && setViewingImage(e.invoiceImage)}
                                                                                disabled={!e.invoiceImage}
                                                                                className={`inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${e.invoiceImage ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-700' : 'text-slate-200 cursor-not-allowed'}`}
                                                                            >
                                                                                <Eye className="h-4 w-4" />
                                                                            </button>
                                                                            {isAdmin && (
                                                                                <>
                                                                                    <button
                                                                                        onClick={() => handleOpenDocPicker('expense', e.id)}
                                                                                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                                                                    >
                                                                                        <ImageIcon className="h-4 w-4" />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleEditExpense(e)}
                                                                                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                                                                    >
                                                                                        <Pencil className="h-4 w-4" />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleDelete(e.id)}
                                                                                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                                                    >
                                                                                        <Trash2 className="h-4 w-4" />
                                                                                    </button>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                {isExpanded && (
                                                                    <tr className="bg-slate-50">
                                                                        <td colSpan={6} className="px-4 py-0">
                                                                            <div className="pb-4 pt-1">
                                                                                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
                                                                                    {/* Detailed Infos Header */}
                                                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                                        <div>
                                                                                            <p className="text-xs text-slate-400">Document réf.</p>
                                                                                            <p className="text-sm font-medium text-slate-900">{e.item}</p>
                                                                                        </div>
                                                                                        <div>
                                                                                            <p className="text-xs text-slate-400">Date émission</p>
                                                                                            <p className="text-sm font-medium text-slate-900">{e.date}</p>
                                                                                        </div>
                                                                                        <div>
                                                                                            <p className="text-xs text-slate-400">Quantité/volume</p>
                                                                                            <p className="text-sm font-medium text-slate-900">{e.quantity || '1.000'}</p>
                                                                                        </div>
                                                                                        <div>
                                                                                            <p className="text-xs text-slate-400">Total saisi</p>
                                                                                            <p className="text-base font-semibold text-slate-900 tabular-nums">{formatValue(e.price)} <span className="text-xs text-slate-400">DT</span></p>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Specialty Fields (Concrete, etc) */}
                                                                                    {(e.lieuLivraison || e.toupie || e.pompe || e.heure) && (
                                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                                                            {e.lieuLivraison && (
                                                                                                <div>
                                                                                                    <p className="text-xs text-slate-400">Lieu livraison</p>
                                                                                                    <p className="text-sm font-medium text-slate-900">{e.lieuLivraison}</p>
                                                                                                </div>
                                                                                            )}
                                                                                            {e.toupie && (
                                                                                                <div>
                                                                                                    <p className="text-xs text-slate-400">Toupie / camion</p>
                                                                                                    <p className="text-sm font-medium text-slate-900">{e.toupie} {e.chaufeur && `(${e.chaufeur})`}</p>
                                                                                                </div>
                                                                                            )}
                                                                                            {(e.pompe || e.pompiste) && (
                                                                                                <div>
                                                                                                    <p className="text-xs text-slate-400">Pompe / pompiste</p>
                                                                                                    <p className="text-sm font-medium text-slate-900">{e.pompe || '-'} / {e.pompiste || '-'}</p>
                                                                                                </div>
                                                                                            )}
                                                                                            {e.heure && (
                                                                                                <div>
                                                                                                    <p className="text-xs text-slate-400">Heure / adjuvant</p>
                                                                                                    <p className="text-sm font-medium text-slate-600 font-mono">{e.heure || '-'} | {e.adjuvant || '-'}</p>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}

                                                                                    {/* Line Items Table */}
                                                                                    {e.items && e.items.length > 0 && (
                                                                                        <div className="rounded-xl border border-slate-200 overflow-hidden">
                                                                                            <table className="w-full text-left border-collapse">
                                                                                                <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                                                                                                    <tr>
                                                                                                        <th className="px-4 py-2.5 w-10 text-center">#</th>
                                                                                                        <th className="px-4 py-2.5">Désignation</th>
                                                                                                        <th className="px-4 py-2.5 text-center">Qté</th>
                                                                                                        <th className="px-4 py-2.5 text-right">P.U TTC</th>
                                                                                                        <th className="px-4 py-2.5 text-right">Total TTC</th>
                                                                                                    </tr>
                                                                                                </thead>
                                                                                                <tbody>
                                                                                                    {e.items?.map((item, idx) => (
                                                                                                        <tr key={idx} className="border-t border-slate-100">
                                                                                                            <td className="px-4 py-2.5 text-center text-xs text-slate-400">{idx + 1}</td>
                                                                                                            <td className="px-4 py-2.5">
                                                                                                                <div className="flex flex-col">
                                                                                                                    <span className="text-sm font-medium text-slate-900">{item.designation}</span>
                                                                                                                    <span className="text-xs text-slate-400">{item.unit || 'Unité'}</span>
                                                                                                                </div>
                                                                                                            </td>
                                                                                                            <td className="px-4 py-2.5 text-center">
                                                                                                                <span className="text-sm text-slate-900 tabular-nums">{item.quantity}</span>
                                                                                                            </td>
                                                                                                            <td className="px-4 py-2.5 text-right">
                                                                                                                <span className="text-sm text-slate-600 tabular-nums">{(item.unitPriceHT || item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 3 })}</span>
                                                                                                            </td>
                                                                                                            <td className="px-4 py-2.5 text-right">
                                                                                                                <div className="flex flex-col items-end">
                                                                                                                    <span className="text-sm font-medium text-slate-900 tabular-nums">{formatValue(item.totalTTC)}</span>
                                                                                                                    {item.remise ? <span className="text-xs font-medium text-rose-600 mt-0.5">-{item.remise}% remise</span> : null}
                                                                                                                </div>
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                    ))}
                                                                                                </tbody>
                                                                                            </table>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                    {sortedExpenses.length === 0 && (
                                                        <tr className="border-t border-slate-100">
                                                            <td colSpan={6} className="py-10 text-center text-sm text-slate-400">Aucune facture</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile sort control */}
                                        <div className="md:hidden flex items-center gap-2">
                                            <span className="text-xs text-slate-400">Trier :</span>
                                            {([
                                                { key: 'date', label: 'Date' },
                                                { key: 'price', label: 'Montant' },
                                            ] as const).map(opt => {
                                                const active = sortConfig.key === opt.key;
                                                return (
                                                    <button
                                                        key={opt.key}
                                                        onClick={() => handleSort(opt.key)}
                                                        className={`inline-flex items-center gap-1 h-8 px-3 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
                                                    >
                                                        {opt.label}
                                                        {active && (sortConfig.direction === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Mobile card list */}
                                        <div className="md:hidden space-y-2.5">
                                            {sortedExpenses.length === 0 && (
                                                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-400">Aucune facture</div>
                                            )}
                                            {sortedExpenses.map((e) => {
                                                const isExpanded = expandedRows[e.id];
                                                return (
                                                    <div key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                                                        <div className="flex items-start gap-3">
                                                            <input
                                                                type="checkbox"
                                                                className="mt-1 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
                                                                checked={selectedExpenseIds.has(e.id)}
                                                                onChange={() => toggleSelectExpense(e.id)}
                                                            />
                                                            <div className="flex-1 min-w-0" onClick={() => toggleRow(e.id)}>
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-medium text-slate-900 truncate flex items-center gap-2">
                                                                            {e.item}
                                                                            {e.items && e.items.length > 0 && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium shrink-0">{e.items.length} art.</span>}
                                                                        </p>
                                                                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                                                                            <Clock className="h-3 w-3" /> {e.date}
                                                                        </p>
                                                                    </div>
                                                                    <p className="text-sm font-semibold text-slate-900 tabular-nums shrink-0">{formatValue(e.price)} <span className="text-xs font-medium text-slate-400">DT</span></p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                                                            {isAdmin ? (
                                                                <button
                                                                    onClick={() => updateStatus(e.id, e.status === 'paid' ? 'pending' : 'paid')}
                                                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${e.status === 'paid'
                                                                        ? 'bg-emerald-50 text-emerald-700'
                                                                        : 'bg-amber-50 text-amber-700'
                                                                        }`}
                                                                >
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${e.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                                    {e.status === 'paid' ? 'Payé' : 'En attente'}
                                                                </button>
                                                            ) : (
                                                                <span
                                                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${e.status === 'paid'
                                                                        ? 'bg-emerald-50 text-emerald-700'
                                                                        : 'bg-amber-50 text-amber-700'
                                                                        }`}
                                                                >
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${e.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                                    {e.status === 'paid' ? 'Payé' : 'En attente'}
                                                                </span>
                                                            )}
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => e.invoiceImage && setViewingImage(e.invoiceImage)}
                                                                    disabled={!e.invoiceImage}
                                                                    className={`inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${e.invoiceImage ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-700' : 'text-slate-200 cursor-not-allowed'}`}
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </button>
                                                                {isAdmin && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleOpenDocPicker('expense', e.id)}
                                                                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                                                        >
                                                                            <ImageIcon className="h-4 w-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleEditExpense(e)}
                                                                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                                                        >
                                                                            <Pencil className="h-4 w-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDelete(e.id)}
                                                                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {isExpanded && e.items && e.items.length > 0 && (
                                                            <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                                                                {e.items.map((item, idx) => (
                                                                    <div key={idx} className="flex items-center justify-between text-sm">
                                                                        <span className="text-slate-700 truncate">{item.designation} <span className="text-slate-400">× {item.quantity}</span></span>
                                                                        <span className="text-slate-900 tabular-nums shrink-0 ml-2">{formatValue(item.totalTTC)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                            )}

                            {/* Historique Acomptes */}
                            {currentSupplier && panelTab === 'acomptes' && (
                            <div className="space-y-4">
                                <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
                                    <button
                                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                        onClick={() => setShowDepositsSection(!showDepositsSection)}
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                            <TrendingUp className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="text-sm font-medium text-slate-900">Historique acomptes</h2>
                                            <p className="text-xs text-slate-500">{currentSupplier?.deposits?.length || 0} paiements enregistrés</p>
                                        </div>
                                        <ChevronDown className={`h-4 w-4 text-slate-400 ml-2 shrink-0 transition-transform ${showDepositsSection ? 'rotate-180' : ''}`} />
                                    </button>
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
                                            className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors shrink-0"
                                        >
                                            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nouveau</span>
                                        </button>
                                    )}
                                </div>

                                {showDepositsSection && (
                                    <>
                                        {/* Desktop table */}
                                        <div className="hidden md:block rounded-2xl border border-slate-200 overflow-hidden bg-white">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left w-24">Date</th>
                                                        <th className="px-4 py-3 text-left">Référence / Payeur</th>
                                                        <th className="px-4 py-3 text-right w-40">Montant</th>
                                                        <th className="px-4 py-3 text-right w-32">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {currentSupplier?.deposits?.length === 0 ? (
                                                        <tr className="border-t border-slate-100">
                                                            <td colSpan={4} className="py-12 text-center">
                                                                <div className="flex flex-col items-center gap-2">
                                                                    <Package className="h-8 w-8 text-slate-200" />
                                                                    <p className="text-sm text-slate-400">Aucun acompte pour le moment.</p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        currentSupplier?.deposits?.map((d) => (
                                                            <tr key={d.id} className="group border-t border-slate-100 hover:bg-slate-50 transition-colors">
                                                                <td className="px-4 py-3 text-sm text-slate-500 font-mono">
                                                                    {d.date}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <span className="text-sm font-medium text-slate-900">
                                                                            {d.ref || "Sans référence"}
                                                                        </span>
                                                                        <span className="inline-flex items-center w-fit px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">{d.payer || d.commercial || 'Projet'}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <span className="text-sm font-semibold text-emerald-600 tabular-nums">
                                                                        {d.amount.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-xs font-medium text-slate-400">DT</span>
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <button
                                                                            onClick={() => (d.receiptImage || d.id === 'd_cap_1') && setViewingImage(d.receiptImage || 'https://via.placeholder.com/800x1000?text=Recu+476+3900DT')}
                                                                            disabled={!d.receiptImage && d.id !== 'd_cap_1'}
                                                                            className={`inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${(d.receiptImage || d.id === 'd_cap_1') ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-700' : 'text-slate-200 cursor-not-allowed'}`}
                                                                        >
                                                                            <Eye className="h-4 w-4" />
                                                                        </button>
                                                                        {isAdmin && (
                                                                            <>
                                                                                <button
                                                                                    onClick={() => handleOpenDocPicker('deposit', d.id)}
                                                                                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                                                                >
                                                                                    <ImageIcon className="h-4 w-4" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleEditDeposit(d)}
                                                                                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                                                                >
                                                                                    <FileText className="h-4 w-4" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteDeposit(d.id)}
                                                                                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                                                >
                                                                                    <Trash2 className="h-4 w-4" />
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

                                        {/* Mobile card list */}
                                        <div className="md:hidden space-y-2.5">
                                            {currentSupplier?.deposits?.length === 0 && (
                                                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-400">Aucun acompte pour le moment.</div>
                                            )}
                                            {currentSupplier?.deposits?.map((d) => (
                                                <div key={d.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-slate-900">{d.ref || "Sans référence"}</p>
                                                            <p className="text-xs text-slate-400 font-mono mt-0.5">{d.date}</p>
                                                            <span className="inline-flex items-center mt-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">{d.payer || d.commercial || 'Projet'}</span>
                                                        </div>
                                                        <p className="text-sm font-semibold text-emerald-600 tabular-nums shrink-0">{d.amount.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-xs font-medium text-slate-400">DT</span></p>
                                                    </div>
                                                    <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-slate-100">
                                                        <button
                                                            onClick={() => (d.receiptImage || d.id === 'd_cap_1') && setViewingImage(d.receiptImage || 'https://via.placeholder.com/800x1000?text=Recu+476+3900DT')}
                                                            disabled={!d.receiptImage && d.id !== 'd_cap_1'}
                                                            className={`inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${(d.receiptImage || d.id === 'd_cap_1') ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-700' : 'text-slate-200 cursor-not-allowed'}`}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        {isAdmin && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleOpenDocPicker('deposit', d.id)}
                                                                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                                                >
                                                                    <ImageIcon className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleEditDeposit(d)}
                                                                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                                                >
                                                                    <FileText className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteDeposit(d.id)}
                                                                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                            )}
                        </motion.div >
                    </div >
                )
            }

            {/* Note Editor Modal */}
            <Modal
                open={showNoteModal}
                onClose={() => setShowNoteModal(false)}
                title={noteEditorType === 'supplier' ? `Notes: ${currentSupplier?.name || ''}` : 'Note générale du projet'}
                description="Observations et consignes"
                size="lg"
                footer={<>
                    <button
                        onClick={() => setShowNoteModal(false)}
                        className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSaveNote}
                        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 active:scale-[0.99] transition-colors"
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        Enregistrer
                    </button>
                </>}
            >
                <textarea
                    className="w-full px-3 py-2.5 min-h-[220px] rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition resize-none"
                    placeholder="Saisissez vos notes ici..."
                    value={tempNoteValue}
                    onChange={(e) => setTempNoteValue(e.target.value)}
                    autoFocus
                />
            </Modal>

            {/* Document Picker Modal */}
            <Modal
                open={showDocPicker}
                onClose={() => { setShowDocPicker(false); setPickerTarget(null); }}
                title="Choisir un document"
                description={`Sélectionnez une image à lier à ${pickerTarget?.type === 'expense' ? 'la facture' : "l'acompte"}`}
                size="xl"
                footer={
                    <button
                        onClick={() => { setShowDocPicker(false); setPickerTarget(null); }}
                        className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                        Annuler
                    </button>
                }
            >
                            <div>
                                {uploadedDocs.filter(d => d.supplierId === activeTab).length === 0 ? (
                                    <div className="h-56 flex flex-col items-center justify-center text-slate-400 gap-3">
                                        <Upload className="h-10 w-10 text-slate-200" />
                                        <p className="text-sm text-slate-500">Aucun document importé pour ce fournisseur</p>
                                        <button
                                            onClick={() => { setShowDocPicker(false); setShowUploadModal(true); }}
                                            className="text-sm font-medium text-slate-700 hover:underline"
                                        >
                                            Importer maintenant
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {uploadedDocs
                                            .filter(d => d.supplierId === activeTab)
                                            .map((doc) => (
                                                <div
                                                    key={doc.id}
                                                    className="group relative rounded-2xl overflow-hidden border border-slate-200 hover:border-slate-300 transition-colors bg-white flex flex-col"
                                                >
                                                    <div
                                                        className="aspect-square cursor-pointer overflow-hidden relative bg-slate-50"
                                                        onClick={() => setViewingImage(doc.url)}
                                                    >
                                                        {doc.fileName.toLowerCase().endsWith('.pdf') ? (
                                                            <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-2">
                                                                <FileText className="h-10 w-10 text-rose-200" />
                                                                <span className="text-[10px] text-slate-400 break-all text-center">{doc.fileName}</span>
                                                            </div>
                                                        ) : (
                                                            <img src={doc.url} className="w-full h-full object-cover" alt={doc.fileName} />
                                                        )}
                                                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                            <Eye className="text-white h-7 w-7" />
                                                        </div>
                                                    </div>

                                                    <div className="p-2.5 border-t border-slate-100 flex flex-col gap-2">
                                                        <p className="text-xs font-medium text-slate-700 truncate">{doc.fileName}</p>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSelectDocLink(doc.url);
                                                            }}
                                                            className="w-full inline-flex items-center justify-center h-9 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                                                        >
                                                            Lier
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                )}
                            </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                open={showDeleteConfirmModal && !!supplierToDelete}
                onClose={() => { setShowDeleteConfirmModal(false); setDeleteConfirmInput(''); }}
                title="Retirer du projet ?"
                size="md"
                persistent
                icon={<div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><AlertCircle className="h-5 w-5" /></div>}
                footer={<>
                    <button
                        onClick={() => { setShowDeleteConfirmModal(false); setDeleteConfirmInput(''); }}
                        className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleRemoveSupplierFromProject}
                        disabled={isDeleting || deleteConfirmInput.trim().toUpperCase() !== (supplierToDelete?.name || '').trim().toUpperCase()}
                        className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                    >
                        {isDeleting ? 'Retrait...' : 'Confirmer'}
                    </button>
                </>}
            >
                <div className="space-y-3">
                    <p className="text-sm text-slate-600">
                        Vous allez retirer <span className="font-medium text-slate-900">{supplierToDelete?.name}</span> de ce projet. Toutes ses dépenses et acomptes dans ce chantier seront supprimés.
                    </p>
                    <p className="text-xs text-slate-500">
                        Le fournisseur restera disponible dans la liste globale. Les données locales à ce projet seront perdues.
                    </p>
                    <div>
                        <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                            Tapez <span className="font-semibold text-rose-600">{supplierToDelete?.name}</span> pour confirmer
                        </label>
                        <input
                            type="text"
                            value={deleteConfirmInput}
                            onChange={(e) => setDeleteConfirmInput(e.target.value)}
                            placeholder="Nom du fournisseur"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isDeleting && deleteConfirmInput.trim().toUpperCase() === (supplierToDelete?.name || '').trim().toUpperCase()) {
                                    handleRemoveSupplierFromProject();
                                }
                            }}
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300 transition"
                        />
                    </div>
                </div>
            </Modal>

            {/* Trash / Archive Modal */}
            <Modal
                open={showTrashModal}
                onClose={() => setShowTrashModal(false)}
                title="Fournisseurs archivés"
                description="Restaurer un fournisseur et ses données"
                size="lg"
                footer={
                    <button
                        onClick={() => setShowTrashModal(false)}
                        className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                        Fermer
                    </button>
                }
            >
                <div className="space-y-2">
                    {archivedSuppliers.length === 0 ? (
                        <div className="text-center py-12">
                            <Clock className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm text-slate-400">La corbeille est vide</p>
                        </div>
                    ) : (
                        archivedSuppliers.map((s: any) => (
                            <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <div>
                                    <p className="text-sm font-medium text-slate-900">{s.name}</p>
                                    <p className="text-xs text-slate-400">ID: {s.id}</p>
                                </div>
                                <button
                                    onClick={() => handleRestoreSupplierToProject(s.id)}
                                    className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                                >
                                    <Clock className="h-3.5 w-3.5" />
                                    Restaurer
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </Modal>

            {/* AI Coming Soon Modal */}
            <Modal
                open={showAIComingSoonModal}
                onClose={() => setShowAIComingSoonModal(false)}
                title="L'IA arrive bientôt"
                size="sm"
                icon={<div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Sparkles className="h-5 w-5" /></div>}
                footer={
                    <button
                        onClick={() => {
                            setShowAIComingSoonModal(false);
                            setShowAddInvoiceStep1(true);
                        }}
                        className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                    >
                        Compris, j'ai hâte !
                    </button>
                }
            >
                <p className="text-sm text-slate-600 leading-relaxed">
                    Notre module d'extraction intelligente est en cours de finalisation. Vous pourrez bientôt scanner vos factures et les remplir automatiquement en un clin d'œil.
                </p>
            </Modal>

            {/* Success Modal */}
            <Modal
                open={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                title="Succès"
                size="sm"
                icon={<div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="h-5 w-5" /></div>}
                footer={
                    <button
                        onClick={() => setShowSuccessModal(false)}
                        className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                    >
                        Parfait
                    </button>
                }
            >
                <p className="text-sm text-slate-600">La facture a été enregistrée avec succès.</p>
            </Modal>

            {/* Hidden Input for Replacing Documents */}
            <input
                type="file"
                ref={replaceFileInputRef}
                className="hidden"
                accept="image/*,application/pdf"
                onChange={(e) => {
                    if (e.target.files && e.target.files[0] && replacingDocId) {
                        handleReplaceDocument(replacingDocId, e.target.files[0]);
                        setReplacingDocId(null);
                        e.target.value = '';
                    }
                }}
            />
            {/* Undo Toast */}
            {
                showUndoToast && lastReplacedDoc && (
                    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-300">
                        <div>
                            <p className="text-xs text-slate-400 leading-none mb-0.5">Action effectuée</p>
                            <p className="text-sm font-medium truncate max-w-[150px]">Document remplacé</p>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleUndoReplace}
                                className="inline-flex items-center justify-center h-9 px-3 rounded-xl bg-white text-slate-900 text-sm font-medium hover:bg-slate-100 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => setShowUndoToast(false)}
                                className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )
            }
            {/* Document Delete Confirmation Modal */}
            <Modal
                open={showDocDeleteModal && !!docToDelete}
                onClose={() => { setShowDocDeleteModal(false); setDocToDelete(null); }}
                title="Supprimer ?"
                size="sm"
                persistent
                icon={<div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><Trash2 className="h-5 w-5" /></div>}
                footer={<>
                    <button
                        onClick={() => { setShowDocDeleteModal(false); setDocToDelete(null); }}
                        className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={() => docToDelete && handleDeleteUploadedDoc(docToDelete.id)}
                        disabled={isDeleting}
                        className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                    >
                        {isDeleting ? 'Suppression...' : 'Supprimer'}
                    </button>
                </>}
            >
                <p className="text-sm text-slate-600">
                    {docToDelete?.id === 'all'
                        ? "Êtes-vous sûr de vouloir supprimer TOUS les documents de ce fournisseur ?"
                        : `Êtes-vous sûr de vouloir supprimer le document "${docToDelete?.fileName}" ?`
                    }
                </p>
            </Modal>


            {/* Selection Summary Floating Bar */}
            {selectedExpenseIds.size > 0 && (
                <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-2xl bg-slate-900 text-white p-3 rounded-2xl shadow-xl animate-in slide-in-from-bottom-8 duration-300 border border-white/10">
                    <div className="flex items-center justify-between gap-3 px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                <ClipboardList className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 leading-none mb-0.5">Sélection</p>
                                <p className="text-sm font-medium text-white">{selectedExpenseIds.size} facture{selectedExpenseIds.size > 1 ? 's' : ''}</p>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-xs text-slate-400 leading-none mb-0.5">Somme totale</p>
                            <p className="text-lg font-semibold text-white tabular-nums leading-none">
                                {selectedTotal.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-xs text-slate-400">DT</span>
                            </p>
                        </div>

                        <button
                            onClick={() => setSelectedExpenseIds(new Set())}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 transition-colors shrink-0"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
          </div>
        </div >
    );
}

export default function ExpensesContent() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-jakarta">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-9 w-9 border-[3px] border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                    <p className="text-sm text-slate-500 animate-pulse">Chargement de votre chantier...</p>
                </div>
            </div>
        }>
            <ExpensesContentMain />
        </Suspense>
    );
}
