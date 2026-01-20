'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import {
    Plus, Receipt, FileText, Trash2, TrendingUp, DollarSign,
    Upload, X, CheckCircle2, Clock, Eye, EyeOff, AlertCircle, Download, FileDown, ChevronDown,
    ArrowUpDown, ArrowUp, ArrowDown, ArrowRight, Search, Pencil, Image as ImageIcon, Package, GripVertical,
    Store, FilePlus, Sparkles, Keyboard, ImagePlus, ClipboardList
} from 'lucide-react';
import { motion, Reorder, useDragControls } from 'framer-motion';
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
    notes?: string;
}

// --- Components ---



// Invoice Modal Component
const ImageViewer = ({ src, onClose }: { src: string, onClose: () => void }) => {
    const isPdf = src.toLowerCase().includes('.pdf') || src.startsWith('data:application/pdf');
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="relative max-w-5xl w-full h-[90vh] flex flex-col items-center">
                <button
                    onClick={onClose}
                    className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2"
                >
                    <X className="h-8 w-8" />
                </button>
                {isPdf ? (
                    <iframe
                        src={src}
                        className="w-full h-full bg-white rounded-lg shadow-2xl"
                        title="Document Viewer"
                    />
                ) : (
                    <img
                        src={src}
                        alt="Document"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl bg-white"
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
        <Reorder.Group axis="y" values={orderedSuppliers} onReorder={handleReorder} className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible no-scrollbar">
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
                group flex-shrink-0 lg:flex-shrink-1 flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer
                ${activeTab === sup.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}
            `}
            onClick={() => setActiveTab(sup.id as any)}
            layout
        >
            <div className="flex items-center gap-2 flex-1 min-w-0">
                {isAdmin && (
                    <div
                        className="hidden lg:block cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-400 p-1 -ml-1"
                        onPointerDown={(e) => controls.start(e)}
                    >
                        <GripVertical className="h-3.5 w-3.5" />
                    </div>
                )}
                <span className="text-xs font-bold whitespace-nowrap truncate">{sup.name}</span>
            </div>
            {isAdmin && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setSupplierToDelete({ id: sup.id, name: sup.name });
                        setShowDeleteConfirmModal(true);
                        setDeleteConfirmInput('');
                    }}
                    className={`p-1.5 rounded-full transition-colors flex-shrink-0 ${activeTab === sup.id ? 'text-slate-400 hover:text-white hover:bg-red-500' : 'text-slate-300 hover:text-white hover:bg-red-500'}`}
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
    const { currentProject, userRole } = useProject();

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

    const fetchData = useCallback(async () => {
        if (!currentProject) {
            setLoading(false);
            return;
        }

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
    }, [supabase, currentProject, activeTab, sessionLinkedSuppliers]);

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

    const handleSaveNote = async () => {
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
        if (!supplierToDelete || !currentProject) return;

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
        const project = currentProject;
        if (!project) return;
        const amount = parseFloat(newDepositData.amount);
        if (isNaN(amount) || amount <= 0) {
            alert('Veuillez entrer un montant valide');
            return;
        }

        try {
            const { error } = await supabase.from('deposits').insert({
                project_id: project.id,
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
        const project = currentProject;
        if (!project) return;
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
                    project_id: project.id,
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
    };

    const handleSaveExpense = async () => {
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
            // Format date from YYYY-MM-DD to DD/MM/YYYY if needed, 
            // but the table seems to expect DD/MM/YYYY strings based on previous code.
            // Let's check how dates are stored.
            const dateObj = new Date(newExpenseData.date);
            const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;

            if (editingExpenseId) {
                const { error } = await supabase.from('expenses').update({
                    item: newExpenseData.item,
                    price: price,
                    date: formattedDate,
                    status: newExpenseData.status,
                    quantity: newExpenseData.quantity
                }).eq('id', editingExpenseId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('expenses').insert({
                    project_id: project.id,
                    supplier_id: activeTab,
                    item: newExpenseData.item,
                    price: price,
                    date: formattedDate,
                    status: newExpenseData.status,
                    quantity: newExpenseData.quantity
                });
                if (error) throw error;
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



    const formatValue = (val: number) => {
        if (privacyMode) return '••••••';
        return val.toLocaleString(undefined, { minimumFractionDigits: 3 });
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




    const isEmpty = Object.keys(suppliers).length === 0;

    return (
        <div className="max-w-7xl mx-auto p-3 md:p-6 space-y-4 md:space-y-6 pb-20 font-jakarta">
            {/* Image Modal */}
            {viewingImage && <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} />}

            {/* Step 1 Modal: Choose AI or Manual */}
            {showAddInvoiceStep1 && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white p-8 rounded-[3rem] w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200 relative">
                        <button
                            onClick={() => setShowAddInvoiceStep1(false)}
                            className="absolute right-6 top-6 p-2 hover:bg-slate-50 rounded-full text-slate-300 transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>

                        <div className="text-center mb-10">
                            <h3 className="text-2xl font-black uppercase text-slate-900 tracking-tight">Ajouter une Facture</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Choisissez votre méthode d'ajout</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <button
                                onClick={() => {
                                    setInvoiceFlowMode('ai');
                                    setShowAddInvoiceStep1(false);
                                    // Potential AI flow call here
                                    setShowAIComingSoonModal(true);
                                }}
                                className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-transparent hover:border-blue-500 hover:bg-white transition-all group flex flex-col items-center gap-4 text-center"
                            >
                                <div className="p-5 bg-blue-500 text-white rounded-[1.5rem] shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                                    <Sparkles className="h-8 w-8" />
                                </div>
                                <div>
                                    <p className="font-black text-slate-900 uppercase text-sm mb-1 line-clamp-2">Extraire avec l'IA</p>
                                    <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase">Scannez et remplissez automatiquement les champs</p>
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
                                className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-transparent hover:border-slate-900 hover:bg-white transition-all group flex flex-col items-center gap-4 text-center"
                            >
                                <div className="p-5 bg-slate-900 text-white rounded-[1.5rem] shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform">
                                    <Keyboard className="h-8 w-8" />
                                </div>
                                <div>
                                    <p className="font-black text-slate-900 uppercase text-sm mb-1">Ajout Manuel</p>
                                    <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase">Saisissez les informations de la facture vous-même</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2 Modal: Basic Info */}
            {showAddInvoiceStep2 && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="bg-slate-900 p-8 text-white flex justify-between items-center relative">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Nouvelle Facture / Bon</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Informations du document</p>
                            </div>
                            <button onClick={() => setShowAddInvoiceStep2(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                            {/* Supplier Selection */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Fournisseur</label>
                                <div className="relative">
                                    <select
                                        className="w-full bg-slate-50 border-none p-4 pr-12 rounded-2xl font-black text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none transition-all uppercase text-sm appearance-none"
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
                                        <option value="">SÉLECTIONNER...</option>
                                        {allAvailableSuppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                        <option value="new" className="text-blue-600 font-black">+ AJOUTER NOUVEAU</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                                </div>

                                {isCreatingNewSupplier && (
                                    <div className="flex gap-2 animate-in slide-in-from-top-2 duration-300 mt-2">
                                        <input
                                            className="flex-1 bg-blue-50 border-none p-4 rounded-2xl font-black text-blue-900 placeholder:text-blue-200 outline-none text-sm uppercase"
                                            placeholder="NOM DU FOURNISSEUR..."
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
                                            className="bg-blue-600 text-white px-6 rounded-2xl font-black text-[10px] uppercase hover:bg-blue-700 transition-colors"
                                        >
                                            Appliquer
                                        </button>
                                    </div>
                                )}

                                {newInvoiceSupplierId === 'CREATING_NEW' && (
                                    <div className="mt-2 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                                        <div>
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Nouveau Fournisseur</p>
                                            <p className="text-sm font-black text-slate-900 uppercase">{newSupplierName}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setNewInvoiceSupplierId('');
                                                setIsCreatingNewSupplier(true);
                                            }}
                                            className="p-2 hover:bg-emerald-100 rounded-full text-emerald-600 transition-colors"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}

                            </div>

                            {/* Drag & Drop */}
                            <div
                                className="border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center bg-slate-50/50 group hover:border-slate-300 transition-all cursor-pointer relative"
                                onClick={() => invoiceFileInputRef.current?.click()}
                            >
                                <div className="p-4 bg-white rounded-2xl w-fit mx-auto mb-3 shadow-sm group-hover:scale-110 transition-transform">
                                    {tempInvoiceFile ? (
                                        <div className="relative">
                                            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                        </div>
                                    ) : (
                                        <ImagePlus className="h-6 w-6 text-slate-400" />
                                    )}
                                </div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    {tempInvoiceFile
                                        ? `Fichier sélectionné: ${tempInvoiceFile.name}`
                                        : "Glisser une image ou l'ajouter de mon PC (Optionnel)"
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

                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Désignation (N° Facture/Bon)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border-none p-4 rounded-2xl font-black text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none transition-all uppercase text-sm"
                                        placeholder="EX: FACTURE 123"
                                        value={newExpenseData.item}
                                        onChange={(e) => setNewExpenseData({ ...newExpenseData, item: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Montant (DT)</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="w-full bg-slate-900 text-white border-none p-4 rounded-2xl font-black text-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="0.000"
                                            value={newExpenseData.price}
                                            onChange={(e) => setNewExpenseData({ ...newExpenseData, price: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Date</label>
                                        <input
                                            type="date"
                                            className="w-full bg-slate-50 border-none p-4 rounded-2xl font-black text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none transition-all text-sm uppercase"
                                            value={newExpenseData.date}
                                            onChange={(e) => setNewExpenseData({ ...newExpenseData, date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">État du paiement</label>
                                    <div className="flex bg-slate-50 p-1 rounded-2xl">
                                        <button
                                            onClick={() => setNewExpenseData({ ...newExpenseData, status: 'pending' })}
                                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newExpenseData.status === 'pending' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Attente
                                        </button>
                                        <button
                                            onClick={() => setNewExpenseData({ ...newExpenseData, status: 'paid' })}
                                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newExpenseData.status === 'paid' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Payé
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0">
                            <button
                                onClick={() => setShowAddInvoiceStep2(false)}
                                className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
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
                                className="flex-[2] py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                            >
                                Continuer
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3 Modal: Items addition */}
            {showAddInvoiceItemsStep && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[3rem] w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="bg-slate-900 p-8 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight">Détails de la Facture</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Éléments de la facture un par un</p>
                            </div>
                            <button onClick={() => setShowAddInvoiceItemsStep(false)} className="p-3 hover:bg-white/10 rounded-full transition-colors">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                            <div className="space-y-4">
                                {invoiceItems.length === 0 && (
                                    <div className="text-center py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-4">Aucun détail ajouté pour le moment</p>
                                        <button
                                            onClick={() => setInvoiceItems([{ designation: '', quantity: 1, unit: 'pcs', unitPrice: 0, totalTTC: 0, code: '' }])}
                                            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all"
                                        >
                                            Commencer l'ajout
                                        </button>
                                    </div>
                                )}

                                {invoiceItems.map((item, idx) => (
                                    <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-transparent hover:border-slate-200 transition-all space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Élément #{idx + 1}</h4>
                                            <button
                                                onClick={() => setInvoiceItems(invoiceItems.filter((_, i) => i !== idx))}
                                                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                                <input
                                                    placeholder="DÉSIGNATION..."
                                                    className="w-full bg-white border-none p-4 rounded-xl font-black text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none text-sm uppercase"
                                                    value={item.designation}
                                                    onChange={(e) => {
                                                        const updated = [...invoiceItems];
                                                        updated[idx].designation = e.target.value;
                                                        setInvoiceItems(updated);
                                                    }}
                                                />
                                            </div>
                                            <div className="grid grid-cols-3 gap-3 md:col-span-2">
                                                <div>
                                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 mb-1 block">Qté</label>
                                                    <input
                                                        type="number"
                                                        className="w-full bg-white border-none p-4 rounded-xl font-black text-slate-900 text-center outline-none"
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
                                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 mb-1 block">Prix Unit.</label>
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        className="w-full bg-white border-none p-4 rounded-xl font-black text-slate-900 text-center outline-none"
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
                                                    <label className="text-[9px] font-black text-emerald-500 uppercase ml-1 mb-1 block">Total</label>
                                                    <div className="w-full bg-emerald-50 p-4 rounded-xl font-black text-emerald-700 text-center text-sm">
                                                        {item.totalTTC.toLocaleString(undefined, { minimumFractionDigits: 3 })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {invoiceItems.length > 0 && (
                                    <button
                                        onClick={() => setInvoiceItems([...invoiceItems, { designation: '', quantity: 1, unit: 'pcs', unitPrice: 0, totalTTC: 0, code: '' }])}
                                        className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-slate-900 hover:text-slate-900 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Ajouter une nouvelle ligne
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                            <div className="text-center md:text-left">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Éléments</p>
                                <p className="text-2xl font-black text-slate-900">
                                    {invoiceItems.reduce((sum, item) => sum + item.totalTTC, 0).toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-[10px] text-slate-400">DT</span>
                                </p>
                            </div>
                            <div className="flex gap-4 w-full md:w-auto">
                                <button
                                    onClick={() => {
                                        setShowAddInvoiceItemsStep(false);
                                        setShowAddInvoiceStep2(true);
                                    }}
                                    className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                                >
                                    Retour
                                </button>
                                <button
                                    onClick={async () => {
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
                                    className="flex-1 bg-emerald-600 text-white px-10 py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] shadow-xl shadow-emerald-900/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Terminer & Ajouter
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}




            {isEmpty ? (
                <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
                    <div className="relative mb-12">
                        <div className="absolute inset-0 bg-blue-500/10 blur-[100px] rounded-full" />
                        <div className="w-48 h-48 bg-slate-50 rounded-[3rem] flex items-center justify-center mx-auto border-4 border-slate-100 relative mb-8">
                            <ClipboardList className="w-24 h-24 text-slate-200" strokeWidth={1} />
                            <div className="absolute -right-4 -bottom-4 bg-white p-4 rounded-2xl shadow-xl border border-slate-100">
                                <Plus className="w-8 h-8 text-blue-500" />
                            </div>
                        </div>
                    </div>

                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tight mb-4">
                        Votre Chantier est Prêt
                    </h2>
                    <p className="text-slate-500 font-bold mb-10 max-w-md mx-auto">
                        Commencez par ajouter un fournisseur ou enregistrez votre première facture pour suivre vos dépenses.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                        <button
                            onClick={() => setShowAddSupplierModal(true)}
                            className="flex-1 bg-white border-2 border-slate-200 hover:border-slate-900 p-6 rounded-[2rem] font-black uppercase tracking-widest text-sm transition-all flex flex-col items-center gap-3 group shadow-xl shadow-slate-200/50"
                        >
                            <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                <Store className="h-6 w-6" />
                            </div>
                            Ajouter Fournisseur
                        </button>
                        <button
                            onClick={() => setShowAddInvoiceStep1(true)}
                            className="flex-1 bg-slate-900 text-white p-6 rounded-[2rem] font-black uppercase tracking-widest text-sm transition-all flex flex-col items-center gap-3 hover:bg-slate-800 shadow-xl shadow-slate-900/20"
                        >
                            <div className="p-4 bg-white/10 rounded-2xl">
                                <FilePlus className="h-6 w-6" />
                            </div>
                            Ajouter Facture
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Global Stats - Compact */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 relative">
                        {/* Privacy Toggle Floating */}
                        <button
                            onClick={() => setPrivacyMode(!privacyMode)}
                            className={`absolute -top-10 right-2 md:right-0 p-2 rounded-full transition-all flex items-center gap-2 group z-50 ${privacyMode ? 'bg-slate-900 text-[#FFB800] border border-slate-700' : 'bg-white text-slate-400 border border-slate-200'}`}
                            title={privacyMode ? "Désactiver le mode discret" : "Activer le mode discret"}
                        >
                            {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                {privacyMode ? 'Visible' : 'Discret'}
                            </span>
                        </button>

                        <button
                            onClick={() => setShowAllExpenses(true)}
                            className="bg-slate-900 text-white p-3 md:p-5 rounded-xl shadow-lg border border-slate-800 text-left hover:bg-slate-800 hover:shadow-xl transition-all group w-full cursor-pointer"
                        >
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Chantier</p>
                                <span className="text-[8px] font-black text-slate-500 group-hover:text-[#FFB800] uppercase bg-slate-800 group-hover:bg-slate-700 px-2 py-1 rounded transition-all">Voir</span>
                            </div>
                            <h2 className="text-lg md:text-2xl font-black">{formatValue(grandTotal)} <span className="text-[10px] text-slate-500">DT</span></h2>
                        </button>
                        <button
                            onClick={() => setShowAllPaid(true)}
                            className="bg-white p-3 md:p-5 rounded-xl border border-slate-200 shadow-sm text-left hover:bg-emerald-50 hover:border-emerald-200 hover:shadow-md transition-all group w-full cursor-pointer"
                        >
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Total Payé</p>
                                <span className="text-[8px] font-black text-emerald-400 group-hover:text-emerald-600 uppercase bg-emerald-50 group-hover:bg-emerald-100 px-2 py-1 rounded transition-all">Voir</span>
                            </div>
                            <h2 className="text-lg md:text-2xl font-black text-emerald-700">{formatValue(totalPaidGlobal)}</h2>
                        </button>
                        <button
                            onClick={() => setShowAllPending(true)}
                            className="bg-white p-3 md:p-5 rounded-xl border border-amber-200 shadow-sm text-left hover:bg-amber-50 hover:border-amber-300 hover:shadow-md transition-all group cursor-pointer"
                        >
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Reste à Payer</p>
                                <span className="text-[8px] font-black text-amber-400 group-hover:text-amber-600 uppercase bg-amber-50 group-hover:bg-amber-100 px-2 py-1 rounded transition-all">Voir</span>
                            </div>
                            <h2 className="text-lg md:text-2xl font-black text-amber-700">{formatValue(totalRemainingGlobal)}</h2>
                        </button>



                        <button
                            onClick={handleExportPDF}
                            className="bg-white p-3 md:p-5 rounded-xl border border-slate-200 shadow-sm text-left hover:bg-slate-50 transition-all group flex flex-col justify-center items-center gap-2"
                        >
                            <FileDown className="h-6 w-6 text-slate-400 group-hover:text-red-600 transition-colors" />
                            <span className="text-[10px] font-black text-slate-500 group-hover:text-red-700 uppercase text-center">Exporter en PDF</span>
                        </button>
                    </div>

                    {[...Array(6)].map((_, i) => null)} {/* Placeholder for line indexing alignment if needed */}
                </>
            )}


            {/* Add Supplier Modal - Searchable Picker */}
            {showAddSupplierModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white p-5 rounded-[2rem] w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900">Fournisseur</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Sélectionner ou Créer</p>
                            </div>
                            <button onClick={() => setShowAddSupplierModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                <X className="h-5 w-5 text-slate-300" />
                            </button>
                        </div>

                        <div className="relative mb-4">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                            <input
                                className="w-full bg-slate-50 border-2 border-transparent focus:border-slate-900 p-3 pl-10 rounded-xl text-xs font-black text-slate-900 placeholder:text-slate-300 outline-none transition-all uppercase"
                                placeholder="CHERCHER OU CRÉER..."
                                value={newSupplierName}
                                onChange={(e) => setNewSupplierName(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="max-h-64 overflow-y-auto mb-6 space-y-2 pr-1 custom-scrollbar">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2">Base de données Fournisseurs</p>
                            {allAvailableSuppliers
                                .filter(s => s.name.toLowerCase().includes(newSupplierName.toLowerCase()))
                                .map(s => {
                                    const isAlreadyInProject = suppliers[s.id];
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => handleLinkSupplierToProject(s.id)}
                                            className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${isAlreadyInProject ? 'bg-slate-50 border-slate-100' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center text-white text-xs font-black shadow-lg shadow-slate-200`}>
                                                    {s.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 uppercase leading-none">{s.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                                                        {isAlreadyInProject ? 'Actif dans ce projet' : 'Cliquer pour utiliser'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-all">
                                                <ArrowRight className="h-4 w-4 text-slate-900" />
                                            </div>
                                        </button>
                                    );
                                })
                            }

                            {newSupplierName && !allAvailableSuppliers.some(s => s.name.toLowerCase() === newSupplierName.toLowerCase()) && (
                                <button
                                    onClick={handleAddSupplier}
                                    className="w-full text-left p-5 rounded-3xl bg-slate-900 text-white flex items-center gap-5 hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all"
                                >
                                    <div className="bg-white/20 p-3 rounded-xl">
                                        <Plus className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Créer Nouveau Fournisseur</p>
                                        <p className="text-sm font-black uppercase mt-0.5">{newSupplierName}</p>
                                    </div>
                                </button>
                            )}

                            {Object.values(suppliers).filter(s => s.name.toLowerCase().includes(newSupplierName.toLowerCase())).length === 0 && !newSupplierName && (
                                <div className="p-8 text-center text-slate-300">
                                    <p className="text-xs font-bold uppercase tracking-widest">Aucun résultat</p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setShowAddSupplierModal(false)}
                            className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors bg-slate-50/50 rounded-2xl"
                        >
                            Annuler
                        </button>
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

            {/* Add Expense Modal */}
            {showAddExpenseModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                        <h3 className="text-lg font-black mb-4 text-slate-900 uppercase tracking-tight">
                            {editingExpenseId ? 'Modifier Facture/Bon' : 'Nouvelle Facture/Bon'}
                        </h3>

                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Désignation (Num Facture/Bon)</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-200 p-2 rounded-lg text-sm font-bold uppercase"
                                    placeholder="Ex: Facture 123..."
                                    value={newExpenseData.item}
                                    onChange={(e) => setNewExpenseData({ ...newExpenseData, item: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Montant (DT)</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    className="w-full border border-slate-200 p-3 rounded-xl text-lg font-black text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="0.000"
                                    value={newExpenseData.price}
                                    onChange={(e) => setNewExpenseData({ ...newExpenseData, price: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Date</label>
                                    <input
                                        type="date"
                                        className="w-full border border-slate-200 p-2 rounded-lg text-sm font-bold"
                                        value={newExpenseData.date}
                                        onChange={(e) => setNewExpenseData({ ...newExpenseData, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Quantité</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-200 p-2 rounded-lg text-sm font-bold"
                                        placeholder="Ex: 1"
                                        value={newExpenseData.quantity}
                                        onChange={(e) => setNewExpenseData({ ...newExpenseData, quantity: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">État du Paiement</label>
                                <select
                                    value={newExpenseData.status}
                                    onChange={(e) => setNewExpenseData({ ...newExpenseData, status: e.target.value as PaymentStatus })}
                                    className="w-full border border-slate-200 p-2 rounded-lg text-sm font-bold bg-white"
                                >
                                    <option value="pending">ATTENTE</option>
                                    <option value="paid">PAYÉ</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={closeExpenseModal} className="text-xs font-bold px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">Annuler</button>
                            <button onClick={handleSaveExpense} className="text-xs font-bold px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4" />
                                {editingExpenseId ? 'Enregistrer' : 'Confirmer'}
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

            {/* Pending Expenses Modal */}
            {showAllPending && (
                <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={() => setShowAllPending(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        <div className="bg-amber-500 p-4 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-lg font-black uppercase tracking-tight">Factures En Attente</h2>
                                <p className="text-[9px] text-amber-100 font-bold uppercase">Par Fournisseur</p>
                            </div>
                            <X className="h-5 w-5 cursor-pointer hover:text-amber-200 transition-colors" onClick={() => setShowAllPending(false)} />
                        </div>

                        <div className="p-4 overflow-y-auto custom-scrollbar bg-white">
                            {Object.values(suppliers)
                                .filter(s => s.expenses.some(e => e.status === 'pending'))
                                .map(supplier => {
                                    const pendingExpenses = supplier.expenses.filter(e => e.status === 'pending');
                                    const total = pendingExpenses.reduce((sum, e) => sum + e.price, 0);
                                    const isExpanded = expandedSuppliers[`pending-${supplier.id}`] ?? true;
                                    return (
                                        <div key={supplier.id} className="mb-4 last:mb-0">
                                            <div
                                                className="flex items-center justify-between mb-2 pb-2 border-b-2 border-amber-100 cursor-pointer hover:bg-amber-50/30 -mx-2 px-2 rounded-lg transition-colors"
                                                onClick={() => setExpandedSuppliers(prev => ({ ...prev, [`pending-${supplier.id}`]: !isExpanded }))}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                                                    <div className={`w-8 h-8 rounded-lg ${supplier.color} flex items-center justify-center text-white text-xs font-black shadow-sm`}>
                                                        {supplier.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-black text-slate-900 uppercase">{supplier.name}</h3>
                                                        <p className="text-[9px] font-bold text-slate-400">{pendingExpenses.length} facture{pendingExpenses.length > 1 ? 's' : ''}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-base font-black text-red-600">{total.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-[9px]">DT</span></p>
                                                    <p className="text-base font-black text-red-600">{total.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-[9px]">DT</span></p>
                                                </div>
                                            </div>
                                            {isExpanded && (
                                                <div className="space-y-1 pl-10 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    {pendingExpenses.map((e, i) => (
                                                        <div key={i} className="flex items-center justify-between py-1.5 px-2 hover:bg-amber-50/50 rounded-lg transition-colors group">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold text-slate-800 uppercase truncate">{e.item}</p>
                                                                <p className="text-[9px] font-medium text-slate-400">{e.date}</p>
                                                            </div>
                                                            <p className="text-sm font-black text-red-600 ml-3">{e.price.toLocaleString(undefined, { minimumFractionDigits: 3 })}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            }
                            {Object.values(suppliers).every(s => s.expenses.every(e => e.status !== 'pending')) && (
                                <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                                    <CheckCircle2 className="h-12 w-12 mb-3 text-emerald-100" />
                                    <p className="text-sm font-black uppercase text-emerald-600">Tout est payé !</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
                            <span className="text-xs font-bold text-slate-500 uppercase">Total En Attente</span>
                            <span className="text-xl font-black text-red-600">
                                {Object.values(suppliers).reduce((acc, s) => acc + s.expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.price, 0), 0).toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-sm text-red-400">DT</span>
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Paid Expenses Modal */}
            {showAllPaid && (
                <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={() => setShowAllPaid(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        <div className="bg-emerald-500 p-4 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-lg font-black uppercase tracking-tight">Factures Payées</h2>
                                <p className="text-[9px] text-emerald-100 font-bold uppercase">Par Fournisseur</p>
                            </div>
                            <X className="h-5 w-5 cursor-pointer hover:text-emerald-200 transition-colors" onClick={() => setShowAllPaid(false)} />
                        </div>

                        <div className="p-4 overflow-y-auto custom-scrollbar bg-white">
                            {Object.values(suppliers)
                                .filter(s => s.expenses.some(e => e.status === 'paid'))
                                .map(supplier => {
                                    const paidExpenses = supplier.expenses.filter(e => e.status === 'paid');
                                    const total = paidExpenses.reduce((sum, e) => sum + e.price, 0);
                                    const isExpanded = expandedSuppliers[`paid-${supplier.id}`] ?? true;
                                    return (
                                        <div key={supplier.id} className="mb-4 last:mb-0">
                                            <div
                                                className="flex items-center justify-between mb-2 pb-2 border-b-2 border-emerald-100 cursor-pointer hover:bg-emerald-50/30 -mx-2 px-2 rounded-lg transition-colors"
                                                onClick={() => setExpandedSuppliers(prev => ({ ...prev, [`paid-${supplier.id}`]: !isExpanded }))}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                                                    <div className={`w-8 h-8 rounded-lg ${supplier.color} flex items-center justify-center text-white text-xs font-black shadow-sm`}>
                                                        {supplier.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-black text-slate-900 uppercase">{supplier.name}</h3>
                                                        <p className="text-[9px] font-bold text-slate-400">{paidExpenses.length} facture{paidExpenses.length > 1 ? 's' : ''}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-base font-black text-emerald-600">{total.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-[9px]">DT</span></p>
                                                    <p className="text-base font-black text-emerald-600">{total.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-[9px]">DT</span></p>
                                                </div>
                                            </div>
                                            {isExpanded && (
                                                <div className="space-y-1 pl-10 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    {paidExpenses.map((e, i) => (
                                                        <div key={i} className="flex items-center justify-between py-1.5 px-2 hover:bg-emerald-50/50 rounded-lg transition-colors group">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold text-slate-800 uppercase truncate">{e.item}</p>
                                                                <p className="text-[9px] font-medium text-slate-400">{e.date}</p>
                                                            </div>
                                                            <p className="text-sm font-black text-emerald-600 ml-3">{e.price.toLocaleString(undefined, { minimumFractionDigits: 3 })}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            }
                            {Object.values(suppliers).every(s => s.expenses.every(e => e.status !== 'paid')) && (
                                <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                                    <AlertCircle className="h-12 w-12 mb-3 text-slate-100" />
                                    <p className="text-sm font-black uppercase text-slate-600">Aucun paiement</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
                            <span className="text-xs font-bold text-slate-500 uppercase">Total Payé</span>
                            <span className="text-xl font-black text-emerald-600">
                                {Object.values(suppliers).reduce((acc, s) => acc + s.expenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.price, 0), 0).toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-sm text-emerald-400">DT</span>
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* All Expenses Modal */}
            {showAllExpenses && (
                <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={() => setShowAllExpenses(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        <div className="bg-slate-900 p-4 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-lg font-black uppercase tracking-tight">Toutes les Factures</h2>
                                <p className="text-[9px] text-slate-400 font-bold uppercase">Par Fournisseur</p>
                            </div>
                            <X className="h-5 w-5 cursor-pointer hover:text-slate-400 transition-colors" onClick={() => setShowAllExpenses(false)} />
                        </div>

                        <div className="p-4 overflow-y-auto custom-scrollbar bg-white">
                            {Object.values(suppliers)
                                .filter(s => s.expenses.length > 0)
                                .map(supplier => {
                                    const total = supplier.expenses.reduce((sum, e) => sum + e.price, 0);
                                    const paidCount = supplier.expenses.filter(e => e.status === 'paid').length;
                                    const pendingCount = supplier.expenses.filter(e => e.status === 'pending').length;
                                    const isExpanded = expandedSuppliers[`all-${supplier.id}`] ?? true;
                                    return (
                                        <div key={supplier.id} className="mb-4 last:mb-0">
                                            <div
                                                className="flex items-center justify-between mb-2 pb-2 border-b-2 border-slate-200 cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
                                                onClick={() => setExpandedSuppliers(prev => ({ ...prev, [`all-${supplier.id}`]: !isExpanded }))}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                                                    <div className={`w-8 h-8 rounded-lg ${supplier.color} flex items-center justify-center text-white text-xs font-black shadow-sm`}>
                                                        {supplier.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-black text-slate-900 uppercase">{supplier.name}</h3>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[9px] font-bold text-slate-400">{supplier.expenses.length} facture{supplier.expenses.length > 1 ? 's' : ''}</p>
                                                            {paidCount > 0 && <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{paidCount} payé{paidCount > 1 ? 's' : ''}</span>}
                                                            {pendingCount > 0 && <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{pendingCount} en attente</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-base font-black text-slate-900">{total.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-[9px]">DT</span></p>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowAllExpenses(false);
                                                            setActiveTab(supplier.id as SupplierType);
                                                        }}
                                                        className="mt-1 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all"
                                                    >
                                                        Voir
                                                    </button>
                                                </div>
                                            </div>
                                            {isExpanded && (
                                                <div className="space-y-1 pl-10 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    {supplier.expenses.map((e, i) => (
                                                        <div key={i} className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-50 rounded-lg transition-colors group">
                                                            <div className="flex-1 min-w-0 flex items-center gap-2">
                                                                <p className="text-xs font-bold text-slate-800 uppercase truncate flex-1">{e.item}</p>
                                                                <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded ${e.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                                    {e.status === 'paid' ? 'P' : 'A'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 ml-3">
                                                                <p className="text-[9px] font-medium text-slate-400">{e.date}</p>
                                                                <p className={`text-sm font-black ${e.status === 'paid' ? 'text-emerald-600' : 'text-slate-900'}`}>
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
                                <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                                    <Package className="h-12 w-12 mb-3 text-slate-100" />
                                    <p className="text-sm font-black uppercase text-slate-600">Aucune facture</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
                            <span className="text-xs font-bold text-slate-500 uppercase">Total Chantier</span>
                            <span className="text-xl font-black text-slate-900">
                                {Object.values(suppliers).reduce((acc, s) => acc + s.expenses.reduce((sum, e) => sum + e.price, 0), 0).toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-sm text-slate-500">DT</span>
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Layout Main */}
            {!isEmpty && (
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Tabs Mobile Side Scroll / Table Desktop Sidebar */}
                    <div className="w-full lg:w-64 flex-shrink-0">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible no-scrollbar">
                            <div className="flex items-center justify-between mb-2 px-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Fournisseurs</span>
                                    {archivedSuppliers.length > 0 && (
                                        <button
                                            onClick={() => setShowTrashModal(true)}
                                            className="text-slate-300 hover:text-blue-500 transition-colors"
                                            title="Voir la corbeille"
                                        >
                                            <Clock className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                                {isAdmin && (
                                    <button onClick={() => setShowAddSupplierModal(true)} className="bg-slate-100 hover:bg-slate-200 p-1 rounded transition-colors">
                                        <Plus className="h-3 w-3 text-slate-600" />
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
                        </div>

                        {/* General Note Sidebar Section (Desktop) */}
                        {isAdmin && (
                            <div
                                className="mt-4 hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group cursor-pointer hover:bg-slate-50/50 transition-colors"
                                onClick={() => {
                                    setNoteEditorType('general');
                                    setTempNoteValue(generalNote);
                                    setShowNoteModal(true);
                                }}
                            >
                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                        <FileText className="h-3 w-3" />
                                        NOTE GÉNÉRALE
                                    </span>
                                    <div className="p-1 opacity-0 group-hover:opacity-100">
                                        <Pencil className="h-2.5 w-2.5 text-slate-400" />
                                    </div>
                                </div>
                                <div className="p-4 max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                                    <p className="text-[11px] font-medium text-slate-500 italic leading-relaxed whitespace-pre-wrap">
                                        {generalNote || "Aucune note générale pour le moment..."}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 space-y-4">
                        {!currentSupplier ? (
                            <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                                <Package className="h-12 w-12 text-slate-200 mb-4" />
                                <h2 className="text-lg font-black text-slate-900 uppercase">Aucun fournisseur trouvé</h2>
                                <p className="text-xs text-slate-500 font-medium max-w-xs mt-2">
                                    Ajoutez votre premier fournisseur pour commencer à suivre vos dépenses et acomptes.
                                </p>
                            </div>
                        ) : (
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
                                    <div className="bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl text-right">
                                        <p className="text-[8px] font-black text-slate-500 uppercase">Total Montant</p>
                                        <p className="text-sm font-black text-slate-900">{formatValue(activeStat.totalCost)}</p>
                                    </div>
                                    <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-right">
                                        <p className="text-[8px] font-black text-emerald-600 uppercase">Payé</p>
                                        <p className="text-sm font-black text-emerald-800">{formatValue(activeStat.totalPaid)}</p>
                                    </div>
                                    <div className={`${activeStat.remaining < 0 ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'} border px-4 py-2 rounded-xl text-right`}>
                                        <p className={`text-[8px] font-black ${activeStat.remaining < 0 ? 'text-red-500' : 'text-blue-500'} uppercase`}>Solde</p>
                                        <p className={`text-sm font-black ${activeStat.remaining < 0 ? 'text-red-800' : 'text-blue-800'}`}>{formatValue(activeStat.remaining)}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* General Note (Mobile Only - below supplier header) */}
                        {isAdmin && (
                            <div
                                className="md:hidden bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mb-6 cursor-pointer hover:bg-slate-100/50 transition-colors"
                                onClick={() => {
                                    setNoteEditorType('general');
                                    setTempNoteValue(generalNote);
                                    setShowNoteModal(true);
                                }}
                            >
                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                        <FileText className="h-3 w-3" />
                                        NOTE GÉNÉRALE
                                    </span>
                                    <div className="p-1">
                                        <Pencil className="h-2.5 w-2.5 text-slate-400" />
                                    </div>
                                </div>
                                <div className="p-4 max-h-[150px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                                    <p className="text-[11px] font-medium text-slate-500 italic leading-relaxed whitespace-pre-wrap">
                                        {generalNote || "Aucune note générale pour le moment..."}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Notes Section */}
                        {isAdmin && (
                            <div
                                className="bg-amber-50/50 border border-amber-100 p-3 rounded-xl flex items-start gap-3 min-h-[70px] mb-6 cursor-pointer hover:bg-amber-100/50 transition-colors"
                                onClick={() => {
                                    setNoteEditorType('supplier');
                                    setTempNoteValue(currentSupplier?.notes || '');
                                    setShowNoteModal(true);
                                }}
                            >
                                <div className="bg-amber-100 p-1.5 rounded-lg shrink-0">
                                    <FileText className="h-3.5 w-3.5 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Notes du Chantier</span>
                                        <div className="text-[8px] font-black text-amber-600 uppercase underline shrink-0 ml-2">
                                            Éditer
                                        </div>
                                    </div>
                                    <p className="text-[11px] font-medium text-slate-600 leading-relaxed italic max-h-[60px] overflow-y-auto scrollbar-thin scrollbar-thumb-amber-200 scrollbar-track-transparent pr-1">
                                        {currentSupplier?.notes || "Aucune consigne particulière."}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Upload Modal */}
                        {showUploadModal && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowUploadModal(false)}>
                                <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                                    <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between rounded-t-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-900 rounded-xl">
                                                <Upload className="h-5 w-5 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Importer un Document</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Facture, Devis ou Reçu</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowUploadModal(false)}
                                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                        >
                                            <X className="h-5 w-5 text-slate-400" />
                                        </button>
                                    </div>

                                    <div className="p-6">
                                        <div className="flex flex-col items-center gap-6">
                                            {/* File Upload Zone */}
                                            <div
                                                onClick={() => !isUploading && fileInputRef.current?.click()}
                                                onDragOver={handleDragOver}
                                                onDragLeave={handleDragLeave}
                                                onDrop={handleDrop}
                                                className={`
                                                w-full relative group cursor-pointer
                                                border-2 border-dashed rounded-2xl p-8
                                                flex flex-col items-center justify-center text-center transition-all min-h-[200px]
                                                ${isDragging ? 'border-blue-500 bg-blue-50' : ''}
                                                ${manualForm.files.length > 0 && !isDragging
                                                        ? 'border-emerald-200 bg-emerald-50/30'
                                                        : !isDragging ? 'border-slate-200 hover:border-blue-400 hover:bg-slate-50' : ''
                                                    }
                                                ${isUploading ? 'opacity-50 pointer-events-none' : ''}
                                            `}
                                            >
                                                {manualForm.files.length > 0 ? (
                                                    <>
                                                        <div className="flex flex-wrap gap-2 mb-4 justify-center">
                                                            {previewUrls.map((url, i) => (
                                                                <div key={i} className="relative group/preview">
                                                                    <div className="w-20 h-20 rounded-lg border-2 border-white shadow-md overflow-hidden bg-white">
                                                                        {manualForm.files[i]?.type.startsWith('image/') ? (
                                                                            <img src={url} className="w-full h-full object-cover" alt="Preview" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center bg-slate-100 flex-col gap-1">
                                                                                <FileText className="h-6 w-6 text-slate-400" />
                                                                                <span className="text-[6px] text-slate-500 px-1 truncate w-full">{manualForm.files[i]?.name}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleRemoveFile(i);
                                                                        }}
                                                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/preview:opacity-100 transition-opacity hover:bg-red-600"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <p className="text-sm font-black text-emerald-700 uppercase">{manualForm.files.length} fichiers sélectionnés</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <p className="text-[10px] font-bold text-emerald-500 uppercase">Cliquez ou Glissez pour ajouter plus</p>
                                                            <span className="text-emerald-300">•</span>
                                                            <button
                                                                onClick={handleClearAll}
                                                                className="text-[10px] font-bold text-red-400 hover:text-red-500 uppercase hover:underline z-10 relative"
                                                            >
                                                                Tout supprimer
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                            <Upload className={`h-8 w-8 ${isDragging ? 'text-blue-500' : 'text-slate-400'} group-hover:text-blue-500`} />
                                                        </div>
                                                        <p className="text-sm font-black text-slate-500 uppercase">
                                                            {isDragging ? 'Déposez les fichiers ici' : 'Cliquez ou Glissez pour choisir'}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Sélection multiple supportée</p>
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

                                            {manualForm.files.length > 0 && (
                                                <button
                                                    onClick={async () => {
                                                        await handleManualSubmitNew();
                                                        setShowUploadModal(false);
                                                    }}
                                                    disabled={isUploading}
                                                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg text-xs"
                                                >
                                                    {isUploading ? (
                                                        <>
                                                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            Importation {uploadProgress}%
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle2 className="h-4 w-4" />
                                                            Importer {manualForm.files.length} {manualForm.files.length > 1 ? 'Documents' : 'Document'}
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}



                        {/* Uploaded Documents Review Section */}
                        {isAdmin && (
                            <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div
                                    className="flex items-center justify-between px-3 py-3 rounded-2xl cursor-pointer group hover:bg-amber-50/50 transition-all border border-transparent hover:border-amber-100 mb-4"
                                    onClick={() => setShowUploadedDocs(!showUploadedDocs)}
                                >
                                    <div className="flex items-center gap-3">
                                        <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${showUploadedDocs ? 'rotate-0' : '-rotate-90'}`} />
                                        <div className="w-1.5 h-6 bg-amber-400 rounded-full"></div>
                                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Documents Importés</h2>
                                        {uploadedDocs.filter(doc => doc.supplierId === activeTab).length > 0 && (
                                            <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100">
                                                {uploadedDocs.filter(doc => doc.supplierId === activeTab).length} document{uploadedDocs.filter(doc => doc.supplierId === activeTab).length > 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDocToDelete({ id: 'all' });
                                                setShowDocDeleteModal(true);
                                            }}
                                            className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase hover:underline"
                                        >
                                            Tout supprimer
                                        </button>
                                        <div className="w-px h-4 bg-slate-200" />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowUploadModal(true);
                                            }}
                                            className="flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase hover:text-blue-600 transition-colors"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Importer
                                        </button>
                                    </div>
                                </div>

                                {showUploadedDocs && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-1">
                                        {uploadedDocs.filter(doc => doc.supplierId === activeTab).length > 0 ? (
                                            uploadedDocs
                                                .filter(doc => doc.supplierId === activeTab)
                                                .map((doc, index) => (
                                                    <div key={doc.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 hover:shadow-md transition-all group relative">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDocToDelete({ id: doc.id, fileName: doc.fileName });
                                                                setShowDocDeleteModal(true);
                                                            }}
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                        <div
                                                            className="w-full h-40 bg-slate-100 rounded-xl mb-3 overflow-hidden cursor-pointer relative"
                                                            onClick={() => setViewingImage(doc.url)}
                                                        >
                                                            {doc.fileName.toLowerCase().endsWith('.pdf') ? (
                                                                <div className="w-full h-full flex items-center justify-center bg-red-50">
                                                                    <FileText className="h-12 w-12 text-red-500" />
                                                                </div>
                                                            ) : (
                                                                <img src={doc.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={doc.fileName} />
                                                            )}
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                                <Eye className="text-white drop-shadow-md h-6 w-6" />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Note</p>
                                                            <textarea
                                                                placeholder="Ajouter une note..."
                                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 resize-none"
                                                                rows={2}
                                                                defaultValue={doc.note}
                                                                onBlur={(e) => handleUpdateDocNote(doc.id, e.target.value)}
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    setReplacingDocId(doc.id);
                                                                    replaceFileInputRef.current?.click();
                                                                }}
                                                                disabled={isUploading}
                                                                className="w-full flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                            >
                                                                <Upload className="h-3 w-3" />
                                                                {isUploading && replacingDocId === doc.id ? 'Remplacement...' : 'Remplacer'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                        ) : (
                                            <div className="col-span-full py-12 flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 group-hover:bg-slate-50 transition-colors">
                                                <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 mb-4">
                                                    <ImagePlus className="h-8 w-8 text-slate-300" />
                                                </div>
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Aucun document importé</p>
                                                <button
                                                    onClick={() => setShowUploadModal(true)}
                                                    className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                                                >
                                                    Importer le Premier
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-4 mb-12">
                            <div
                                className="flex items-center justify-between px-3 py-3 rounded-2xl cursor-pointer group hover:bg-blue-50/50 transition-all border border-transparent hover:border-blue-100"
                                onClick={() => setShowExpensesSection(!showExpensesSection)}
                            >
                                <div className="flex items-center gap-3">
                                    <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${showExpensesSection ? 'rotate-0' : '-rotate-90'}`} />
                                    <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Factures & Bons</h2>
                                    <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">{currentSupplier?.expenses?.length || 0} documents</span>
                                </div>
                                {isAdmin && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowAddExpenseModal(true);
                                        }}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-100"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Ajouter
                                    </button>
                                )}
                            </div>

                            {showExpensesSection && (
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                                    {/* Table Controls */}
                                    <div className="p-2 border-b border-slate-100 flex justify-end">
                                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg">
                                            <button
                                                onClick={() => setStatusFilter('all')}
                                                className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Tout
                                            </button>
                                            <button
                                                onClick={() => setStatusFilter('pending')}
                                                className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${statusFilter === 'pending' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400 hover:text-amber-500'}`}
                                            >
                                                En Attente
                                            </button>
                                            <button
                                                onClick={() => setStatusFilter('paid')}
                                                className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${statusFilter === 'paid' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-emerald-500'}`}
                                            >
                                                Payé
                                            </button>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto overflow-y-hidden">
                                        <table className="w-full text-left border-collapse min-w-[500px]">
                                            <thead className="bg-slate-50/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-100 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center">
                                                <tr>
                                                    <th className="px-4 py-3 text-left w-8">#</th>
                                                    <th className="px-4 py-3 text-left w-10"></th>
                                                    <th className="px-4 py-3 text-left w-24">État</th>
                                                    <th
                                                        className="px-4 py-3 text-left cursor-pointer hover:bg-slate-100/50 transition-colors select-none group"
                                                        onClick={() => handleSort('date')}
                                                    >
                                                        <div className="flex items-center gap-1 group-hover:text-blue-600 transition-colors">
                                                            Date / Désignation
                                                            {sortConfig?.key === 'date' ? (
                                                                sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />
                                                            ) : <ArrowUpDown className="w-3 h-3 opacity-20 group-hover:opacity-100" />}
                                                        </div>
                                                    </th>
                                                    <th
                                                        className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100/50 transition-colors select-none group"
                                                        onClick={() => handleSort('price')}
                                                    >
                                                        <div className="flex items-center justify-end gap-1 group-hover:text-blue-600 transition-colors">
                                                            Montant
                                                            {sortConfig?.key === 'price' ? (
                                                                sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />
                                                            ) : <ArrowUpDown className="w-3 h-3 opacity-20 group-hover:opacity-100" />}
                                                        </div>
                                                    </th>
                                                    <th className="px-4 py-3 text-right w-32">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {sortedExpenses.map((e, index) => {
                                                    const isExpanded = expandedRows[e.id];
                                                    return (
                                                        <React.Fragment key={e.id}>
                                                            <tr
                                                                id={e.id}
                                                                className={`
                                                        group transition-all duration-200 cursor-pointer
                                                        ${isExpanded ? 'bg-blue-50/40' : 'hover:bg-slate-50/50'}
                                                    `}
                                                                onClick={() => toggleRow(e.id)}
                                                            >
                                                                <td className="px-2 py-4 text-center text-[10px] font-bold text-slate-300">
                                                                    {index + 1}
                                                                </td>
                                                                <td className="px-4 py-4 text-center">
                                                                    <ChevronDown className={`h-4 w-4 text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-500' : ''}`} />
                                                                </td>
                                                                <td className="px-4 py-4" onClick={(ev) => ev.stopPropagation()}>
                                                                    <div className="relative w-fit">
                                                                        <select
                                                                            value={e.status}
                                                                            onChange={(ev) => updateStatus(e.id, ev.target.value as PaymentStatus)}
                                                                            className={`
                                                                    appearance-none cursor-pointer
                                                                    pl-3 pr-8 py-1 rounded-full text-[9px] font-bold border transition-all shadow-sm
                                                                    focus:outline-none focus:ring-2 focus:ring-offset-1
                                                                    ${e.status === 'paid'
                                                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100 focus:ring-emerald-200'
                                                                                    : 'bg-amber-50 text-amber-600 border-amber-100 focus:ring-amber-200'}
                                                                `}
                                                                        >
                                                                            <option value="paid">PAYÉ</option>
                                                                            <option value="pending">ATTENTE</option>
                                                                        </select>
                                                                        <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none ${e.status === 'paid' ? 'text-emerald-500' : 'text-amber-500'}`} />
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[11px] font-bold text-slate-400 font-mono tracking-tight">{e.date}</span>
                                                                        <span className={`text-xs font-black uppercase transition-colors ${isExpanded ? 'text-blue-600' : 'text-slate-800'}`}>
                                                                            {e.item}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4 text-right">
                                                                    <div className="flex flex-col items-end">
                                                                        <span className="text-sm font-black text-slate-900 tabular-nums tracking-tight">
                                                                            {formatValue(e.price)} <span className="text-[10px] text-slate-400 font-bold ml-0.5">DT</span>
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4 text-right">
                                                                    <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-all duration-300" onClick={(ev) => ev.stopPropagation()}>
                                                                        {/* Eye Icon: Only active if image exists */}
                                                                        <button
                                                                            onClick={() => e.invoiceImage && setViewingImage(e.invoiceImage)}
                                                                            disabled={!e.invoiceImage}
                                                                            className={`p-1.5 rounded-lg transition-colors ${e.invoiceImage ? 'hover:bg-blue-50 text-blue-500 cursor-pointer' : 'text-slate-200 cursor-not-allowed'}`}
                                                                            title={e.invoiceImage ? 'Voir le document' : 'Aucun document lié'}
                                                                        >
                                                                            <Eye className="h-3.5 w-3.5" />
                                                                        </button>

                                                                        {/* Image Icon: Always present for admin to link */}
                                                                        {isAdmin && (
                                                                            <button
                                                                                onClick={() => handleOpenDocPicker('expense', e.id)}
                                                                                className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-500 transition-colors"
                                                                                title="Lier un document"
                                                                            >
                                                                                <ImageIcon className="h-3.5 w-3.5" />
                                                                            </button>
                                                                        )}

                                                                        {isAdmin && (
                                                                            <button onClick={() => handleEditExpense(e)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition-colors" title="Modifier">
                                                                                <Pencil className="h-3.5 w-3.5" />
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

                                                            {/* Détails Accordion */}
                                                            {isExpanded && (
                                                                <tr>
                                                                    <td colSpan={5} className="px-4 pb-6 pt-0 bg-blue-50/40">
                                                                        <div className="bg-white border-2 border-blue-100 rounded-2xl overflow-hidden shadow-sm animate-in slide-in-from-top-2 duration-300">
                                                                            {/* Shared Metadata Header */}
                                                                            {(e.client || e.lieuLivraison || e.toupie || e.chaufeur || e.pompe || e.heure) && (
                                                                                <div className="p-4 bg-slate-50 border-b border-slate-100 grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                                                    {e.client && (
                                                                                        <div className="space-y-0.5">
                                                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Chantier / Client</p>
                                                                                            <p className="text-[11px] font-black text-slate-900 uppercase">{e.client} {e.codeClient && `(${e.codeClient})`}</p>
                                                                                        </div>
                                                                                    )}
                                                                                    {e.lieuLivraison && (
                                                                                        <div className="space-y-0.5">
                                                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Lieu Livraison</p>
                                                                                            <p className="text-[11px] font-black text-slate-900 uppercase">{e.lieuLivraison}</p>
                                                                                        </div>
                                                                                    )}
                                                                                    {e.toupie && (
                                                                                        <div className="space-y-0.5">
                                                                                            <p className="text-[8px] font-black text-blue-400 uppercase tracking-tighter">Toupie / Camion</p>
                                                                                            <p className="text-[11px] font-black text-blue-900 uppercase">{e.toupie} {e.chaufeur && `(${e.chaufeur})`}</p>
                                                                                        </div>
                                                                                    )}
                                                                                    {(e.pompe || e.pompiste) && (
                                                                                        <div className="space-y-0.5">
                                                                                            <p className="text-[8px] font-black text-emerald-400 uppercase tracking-tighter">Pompe / Pompiste</p>
                                                                                            <p className="text-[11px] font-black text-emerald-900">{e.pompe || '-'} / {e.pompiste || '-'}</p>
                                                                                        </div>
                                                                                    )}
                                                                                    {(e.heure || e.adjuvant) && (
                                                                                        <div className="space-y-0.5">
                                                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Heure / Adjuvant</p>
                                                                                            <p className="text-[11px] font-black text-slate-600 font-mono">{e.heure || '-'} | {e.adjuvant || '-'}</p>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}

                                                                            {/* Line Items Table */}
                                                                            {e.items && e.items.length > 0 && (
                                                                                <div className="overflow-x-auto">
                                                                                    <table className="w-full text-left border-collapse">
                                                                                        <thead className="bg-slate-50 border-b border-slate-100 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                                                                            <tr>
                                                                                                <th className="px-4 py-2 w-8">#</th>
                                                                                                <th className="px-4 py-2">Désignation</th>
                                                                                                <th className="px-4 py-2 text-center">Qté</th>
                                                                                                <th className="px-4 py-2 text-right">Prix Unité</th>
                                                                                                {e.items?.some(i => i.remise) && <th className="px-4 py-2 text-center text-red-400">Remise</th>}
                                                                                                <th className="px-4 py-2 text-right">Total TTC</th>
                                                                                            </tr>
                                                                                        </thead>
                                                                                        <tbody className="divide-y divide-slate-50">
                                                                                            {e.items?.map((item, idx) => (
                                                                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                                                                    <td className="px-4 py-2 text-[9px] font-bold text-slate-300">
                                                                                                        {idx + 1}
                                                                                                    </td>
                                                                                                    <td className="px-4 py-2 font-bold text-slate-700 text-[10px]">{item.designation}</td>
                                                                                                    <td className="px-4 py-2 text-center font-black text-slate-900 text-[10px]">{item.quantity}</td>
                                                                                                    <td className="px-4 py-2 text-right text-slate-500 font-mono text-[10px]">{(item.unitPriceHT || item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 3 })}</td>
                                                                                                    {e.items?.some(i => i.remise) && (
                                                                                                        <td className="px-4 py-2 text-center text-red-500 font-black text-[10px]">
                                                                                                            {item.remise ? `${item.remise}%` : '-'}
                                                                                                        </td>
                                                                                                    )}
                                                                                                    <td className="px-4 py-2 text-right font-black text-blue-900 text-[10px]">{formatValue(item.totalTTC)}</td>
                                                                                                </tr>
                                                                                            ))}
                                                                                        </tbody>
                                                                                    </table>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Fiche de Dépôts / Acomptes */}
                        {
                            currentSupplier?.deposits && (
                                <div className="space-y-4 mb-20">
                                    <div
                                        className="flex items-center justify-between px-3 py-3 rounded-2xl cursor-pointer group hover:bg-emerald-50/50 transition-all border border-transparent hover:border-emerald-100"
                                        onClick={() => setShowDepositsSection(!showDepositsSection)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${showDepositsSection ? 'rotate-0' : '-rotate-90'}`} />
                                            <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Historique Acomptes</h2>
                                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">{currentSupplier?.deposits?.length || 0} paiements</span>
                                        </div>
                                        {isAdmin && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
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
                                                className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-emerald-500 transition-all flex items-center gap-1 shadow-lg shadow-emerald-500/10"
                                            >
                                                <Plus className="h-3 w-3" /> Nouveau
                                            </button>
                                        )}
                                    </div>

                                    {showDepositsSection && (
                                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="p-4 bg-emerald-50/20 border-b border-emerald-100/50 flex items-center justify-between">
                                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Paiements Validés</span>
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
                                                        className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-emerald-500 transition-all flex items-center gap-1 shadow-lg shadow-emerald-500/10"
                                                    >
                                                        <Plus className="h-3 w-3" /> Nouveau
                                                    </button>
                                                )}
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse min-w-[500px]">
                                                    <thead className="bg-slate-50/50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                        <tr>
                                                            <th className="px-4 py-4 text-center w-8">#</th>
                                                            <th className="px-6 py-4 w-32">Date</th>
                                                            <th className="px-6 py-4">Référence / Payeur</th>
                                                            <th className="px-6 py-4 text-right">Montant</th>
                                                            <th className="px-6 py-4 text-right w-32">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {currentSupplier?.deposits?.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                                                                    Aucun acompte enregistré
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            currentSupplier?.deposits?.map((d, index) => (
                                                                <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                                                                    <td className="px-4 py-4 text-center text-[10px] font-bold text-slate-300">
                                                                        {index + 1}
                                                                    </td>
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
                                                                        <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                                                                            {d.amount.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-[10px]">DT</span>
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right">
                                                                        <div className="flex items-center justify-end gap-1 opacity-20 group-hover:opacity-100 transition-all">
                                                                            {/* Eye Icon: Only active if image exists */}
                                                                            <button
                                                                                onClick={() => (d.receiptImage || d.id === 'd_cap_1') && setViewingImage(d.receiptImage || 'https://via.placeholder.com/800x1000?text=Recu+476+3900DT')}
                                                                                disabled={!d.receiptImage && d.id !== 'd_cap_1'}
                                                                                className={`p-1.5 rounded-lg transition-colors ${(d.receiptImage || d.id === 'd_cap_1') ? 'hover:bg-blue-50 text-blue-500 cursor-pointer' : 'text-slate-200 cursor-not-allowed'}`}
                                                                                title={(d.receiptImage || d.id === 'd_cap_1') ? 'Voir reçu' : 'Aucun reçu lié'}
                                                                            >
                                                                                <Eye className="h-4 w-4" />
                                                                            </button>

                                                                            {/* Image Icon: Always present for admin to link */}
                                                                            {isAdmin && (
                                                                                <button
                                                                                    onClick={() => handleOpenDocPicker('deposit', d.id)}
                                                                                    className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-500 transition-colors"
                                                                                    title="Lier un reçu"
                                                                                >
                                                                                    <ImageIcon className="h-4 w-4" />
                                                                                </button>
                                                                            )}

                                                                            {isAdmin && (
                                                                                <>
                                                                                    <button
                                                                                        onClick={() => handleEditDeposit(d)}
                                                                                        className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-500 transition-colors"
                                                                                        title="Modifier"
                                                                                    >
                                                                                        <FileText className="h-4 w-4" />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleDeleteDeposit(d.id)}
                                                                                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                                                                        title="Supprimer"
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
                                        </div>
                                    )}
                                </div>
                            )
                        }
                    </div >
                </div >
            )}

            {/* Note Editor Modal */}
            {
                showNoteModal && (
                    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                        <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900">
                                        {noteEditorType === 'supplier' ? `Notes: ${currentSupplier?.name || ''}` : 'Note Générale du Projet'}
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Observations et consignes</p>
                                </div>
                                <button onClick={() => setShowNoteModal(false)} className="p-3 hover:bg-slate-50 rounded-2xl transition-colors">
                                    <X className="h-6 w-6 text-slate-300" />
                                </button>
                            </div>

                            <textarea
                                className="w-full h-64 bg-slate-50 border-2 border-slate-100 focus:border-slate-900 p-6 rounded-3xl text-sm font-medium text-slate-700 outline-none transition-all resize-none"
                                placeholder="Saisissez vos notes ici..."
                                value={tempNoteValue}
                                onChange={(e) => setTempNoteValue(e.target.value)}
                                autoFocus
                            />

                            <div className="mt-8 flex gap-3">
                                <button
                                    onClick={() => setShowNoteModal(false)}
                                    className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors bg-slate-50 rounded-2xl"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSaveNote}
                                    className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Enregistrer
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Document Picker Modal */}
            {
                showDocPicker && (
                    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 flex items-center gap-3">
                                        <ImageIcon className="h-6 w-6 text-[#FFB800]" />
                                        Choisir un Document
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sélectionnez une image à lier à {pickerTarget?.type === 'expense' ? 'la facture' : 'l\'acompte'}</p>
                                </div>
                                <button onClick={() => { setShowDocPicker(false); setPickerTarget(null); }} className="p-3 hover:bg-white rounded-2xl transition-colors shadow-sm">
                                    <X className="h-6 w-6 text-slate-300" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {uploadedDocs.filter(d => d.supplierId === activeTab).length === 0 ? (
                                    <div className="h-64 flex flex-col items-center justify-center text-slate-300 gap-4">
                                        <Upload className="h-12 w-12 opacity-20" />
                                        <p className="text-xs font-black uppercase tracking-widest">Aucun document importé pour ce fournisseur</p>
                                        <button
                                            onClick={() => { setShowDocPicker(false); setShowUploadModal(true); }}
                                            className="text-[10px] font-black text-blue-500 hover:underline uppercase"
                                        >
                                            Importer maintenant
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {uploadedDocs
                                            .filter(d => d.supplierId === activeTab)
                                            .map((doc) => (
                                                <div
                                                    key={doc.id}
                                                    className="group relative aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 hover:border-[#FFB800] transition-all bg-slate-50 flex flex-col"
                                                >
                                                    <div
                                                        className="flex-1 cursor-pointer overflow-hidden relative"
                                                        onClick={() => setViewingImage(doc.url)}
                                                    >
                                                        {doc.fileName.toLowerCase().endsWith('.pdf') ? (
                                                            <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-2">
                                                                <FileText className="h-12 w-12 text-red-100" />
                                                                <span className="text-[8px] font-bold text-slate-400 break-all text-center">{doc.fileName}</span>
                                                            </div>
                                                        ) : (
                                                            <img src={doc.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={doc.fileName} />
                                                        )}
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                            <Eye className="text-white drop-shadow-md h-8 w-8" />
                                                        </div>
                                                    </div>

                                                    <div className="p-3 bg-white border-t border-slate-100 flex flex-col gap-2">
                                                        <div className="flex justify-between items-start">
                                                            <p className="text-[9px] font-black text-slate-800 uppercase truncate flex-1">{doc.fileName}</p>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSelectDocLink(doc.url);
                                                            }}
                                                            className="w-full bg-slate-900 text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#FFB800] hover:text-slate-900 transition-all shadow-sm"
                                                        >
                                                            Lier ce document
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                )}
                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                                <button
                                    onClick={() => { setShowDocPicker(false); setPickerTarget(null); }}
                                    className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                                >
                                    Annuler
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {
                showDeleteConfirmModal && supplierToDelete && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
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
                                <h2 className="text-2xl font-black uppercase tracking-tighter leading-tight">Retirer du projet ?</h2>
                                <p className="mt-2 text-red-100 text-sm font-medium">
                                    Vous allez retirer <span className="font-black underline">{supplierToDelete.name}</span> de ce projet.
                                    Toutes ses dépenses et acomptes dans ce chantier seront supprimés.
                                </p>
                                <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-red-200 opacity-80">
                                    Le fournisseur restera disponible dans la liste globale.
                                </p>
                            </div>

                            <div className="p-8 space-y-6">
                                <p className="text-center text-slate-500 font-medium text-sm">
                                    Êtes-vous sûr de vouloir retirer ce fournisseur ? Les données locales à ce projet seront perdues.
                                </p>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowDeleteConfirmModal(false)}
                                        className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors bg-slate-50 rounded-2xl"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={handleRemoveSupplierFromProject}
                                        disabled={isDeleting}
                                        className="flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all bg-red-600 text-white shadow-xl shadow-red-200 hover:bg-red-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                                    >
                                        {isDeleting ? 'Retrait...' : 'Confirmer'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Trash / Archive Modal */}
            {
                showTrashModal && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={() => setShowTrashModal(false)}>
                        <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                            <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-black uppercase tracking-tighter">Fournisseurs Archivés</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Restaurer un fournisseur et ses données</p>
                                </div>
                                <X className="h-6 w-6 cursor-pointer hover:text-red-400 transition-colors" onClick={() => setShowTrashModal(false)} />
                            </div>

                            <div className="p-6 max-h-[60vh] overflow-y-auto no-scrollbar space-y-3">
                                {archivedSuppliers.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Clock className="h-12 w-12 text-slate-100 mx-auto mb-4" />
                                        <p className="text-slate-400 font-bold uppercase text-xs">La corbeille est vide</p>
                                    </div>
                                ) : (
                                    archivedSuppliers.map((s: any) => (
                                        <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center text-white text-xs font-black shadow-sm`}>
                                                    {s.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{s.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">ID: {s.id}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRestoreSupplierToProject(s.id)}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
                                            >
                                                <Clock className="h-3 w-3" />
                                                Restaurer
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                                <button
                                    onClick={() => setShowTrashModal(false)}
                                    className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* AI Coming Soon Modal */}
            {showAIComingSoonModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500"></div>

                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                            <Sparkles className="h-10 w-10 text-blue-500 animate-pulse" />
                            <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-ping"></div>
                        </div>

                        <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-2">
                            L'IA Arrive Bientôt !
                        </h3>
                        <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
                            Notre module d'extraction intelligente est en cours de finalisation.
                            <br />
                            Vous pourrez bientôt scanner vos factures et les remplir automatiquement en un clin d'œil.
                        </p>

                        <button
                            onClick={() => {
                                setShowAIComingSoonModal(false);
                                setShowAddInvoiceStep1(true);
                            }}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
                        >
                            Compris, j'ai hâte !
                        </button>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 text-center relative overflow-hidden">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                            <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping"></div>
                        </div>

                        <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-2">
                            Succès !
                        </h3>
                        <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
                            La facture a été enregistrée avec succès.
                        </p>

                        <button
                            onClick={() => setShowSuccessModal(false)}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
                        >
                            Parfait
                        </button>
                    </div>
                </div>
            )}

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
            {showUndoToast && lastReplacedDoc && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] bg-slate-900 border border-slate-800 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-5 duration-300">
                    <div className="flex flex-col">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Action effectuée</p>
                        <p className="text-xs font-bold truncate max-w-[150px]">Document remplacé</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleUndoReplace}
                            className="bg-[#FFB800] text-slate-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={() => setShowUndoToast(false)}
                            className="p-2 hover:bg-slate-800 rounded-full transition-colors"
                        >
                            <X className="h-4 w-4 text-slate-400" />
                        </button>
                    </div>
                </div>
            )}
            {/* Document Delete Confirmation Modal */}
            {showDocDeleteModal && docToDelete && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="bg-red-600 p-8 text-white relative">
                            <button
                                onClick={() => { setShowDocDeleteModal(false); setDocToDelete(null); }}
                                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                            <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                                <Trash2 className="h-8 w-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter leading-tight">Supprimer ?</h2>
                            <p className="mt-2 text-red-100 text-sm font-medium">
                                {docToDelete.id === 'all'
                                    ? "Êtes-vous sûr de vouloir supprimer TOUS les documents de ce fournisseur ?"
                                    : `Êtes-vous sûr de vouloir supprimer le document "${docToDelete.fileName}" ?`
                                }
                            </p>
                        </div>

                        <div className="p-8 flex gap-4">
                            <button
                                onClick={() => { setShowDocDeleteModal(false); setDocToDelete(null); }}
                                className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors bg-slate-50 rounded-2xl"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => handleDeleteUploadedDoc(docToDelete.id)}
                                disabled={isDeleting}
                                className="flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all bg-red-600 text-white shadow-xl shadow-red-200 hover:bg-red-700 disabled:bg-slate-100 disabled:text-slate-400"
                            >
                                {isDeleting ? 'Suppression...' : 'Supprimer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ExpensesContent() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-bold animate-pulse">Chargement de votre chantier...</p>
                </div>
            </div>
        }>
            <ExpensesContentMain />
        </Suspense>
    );
}
