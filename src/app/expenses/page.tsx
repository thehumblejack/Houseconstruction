'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
    Plus, Receipt, FileText, Trash2, TrendingUp, DollarSign,
    Upload, X, CheckCircle2, Clock, Eye, AlertCircle, Download, FileDown, ChevronDown,
    ArrowUpDown, ArrowUp, ArrowDown, ArrowRight, Search, Pencil, Image as ImageIcon
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

function ExpensesContent() {
    const { isAdmin, user } = useAuth();
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

    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const toggleRow = (id: string) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const [showUploadedDocs, setShowUploadedDocs] = useState(true);
    const [showExpensesSection, setShowExpensesSection] = useState(true);
    const [showDepositsSection, setShowDepositsSection] = useState(true);

    const [suppliers, setSuppliers] = useState<Record<string, SupplierData>>({});
    const [showGlobalAddModal, setShowGlobalAddModal] = useState(false);
    const [globalSearchTerm, setGlobalSearchTerm] = useState('');

    // Notes State
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [noteEditorType, setNoteEditorType] = useState<'supplier' | 'general'>('supplier');
    const [tempNoteValue, setTempNoteValue] = useState('');
    const [generalNote, setGeneralNote] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);

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

    const fetchData = useCallback(async () => {
        console.log('Expenses: Fetching data started...');
        try {
            const [suppliersRes, expensesRes, depositsRes, settingsRes, uploadedDocsRes] = await Promise.all([
                supabase.from('suppliers').select('*'),
                supabase.from('expenses').select('*, items:invoice_items(*)'),
                supabase.from('deposits').select('*'),
                supabase.from('project_settings').select('*'),
                supabase.from('uploaded_documents').select('*').order('uploaded_at', { ascending: false })
            ]);

            if (suppliersRes.error) console.error('Expenses: Suppliers fetch error:', suppliersRes.error);
            if (expensesRes.error) console.error('Expenses: Expenses fetch error:', expensesRes.error);
            if (depositsRes.error) console.error('Expenses: Deposits fetch error:', depositsRes.error);
            if (settingsRes.error) console.error('Expenses: Settings fetch error:', settingsRes.error);
            if (uploadedDocsRes.error) console.error('Expenses: Uploaded docs fetch error:', uploadedDocsRes.error);

            const suppliersData = suppliersRes.data;
            const expensesData = expensesRes.data;
            const depositsData = depositsRes.data;
            const settingsData = settingsRes.data;
            const uploadedDocsData = uploadedDocsRes.data;

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

                // Sort expenses by date desc (naive string sort or better logic needed? strings are dd/mm/yyyy so naive wont work well)
                // For now, let's just keep DB order or reverse.
                // ideally convert date string to Date object for sort.
                Object.values(newSuppliers).forEach(s => {
                    s.expenses.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()); // relying on created_at not present in interface but present in local obj? no.
                    // we don't have created_at in interface. Let's trust insert order or use date string parsing later.
                });

                setSuppliers(newSuppliers as Record<SupplierType, SupplierData>);
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

    const handleDeleteUploadedDoc = async (docId: string) => {
        const { error } = await supabase
            .from('uploaded_documents')
            .delete()
            .eq('id', docId);

        if (error) {
            console.error('Failed to delete document:', error);
        } else {
            setUploadedDocs(prev => prev.filter(d => d.id !== docId));
        }
    };

    const handleManualSubmit = async () => {
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
        let sorted = [...currentSupplier.expenses];

        sorted.sort((a, b) => {
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
        return sorted;
    }, [currentSupplier, sortConfig]);

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
                const { error } = await supabase.from('project_settings').update({ value: tempNoteValue }).eq('key', 'general_note');
                if (error) throw error;
            }
            fetchData();
            setShowNoteModal(false);
        } catch (error) {
            console.error('Error saving note:', error);
            alert('Erreur lors de l\'enregistrement de la note');
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

            {/* Add Supplier Modal - Searchable Picker */}
            {showAddSupplierModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900">Fournisseur</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sélectionner ou Créer</p>
                            </div>
                            <button onClick={() => setShowAddSupplierModal(false)} className="p-3 hover:bg-slate-50 rounded-2xl transition-colors">
                                <X className="h-6 w-6 text-slate-300" />
                            </button>
                        </div>

                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                            <input
                                className="w-full bg-slate-50 border-2 border-transparent focus:border-slate-900 p-4 pl-12 rounded-2xl text-sm font-black text-slate-900 placeholder:text-slate-300 outline-none transition-all uppercase"
                                placeholder="CHERCHER OU CRÉER..."
                                value={newSupplierName}
                                onChange={(e) => setNewSupplierName(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="max-h-64 overflow-y-auto mb-6 space-y-2 pr-1 custom-scrollbar">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-2">Fournisseurs Existants</p>
                            {Object.values(suppliers)
                                .filter(s => s.name.toLowerCase().includes(newSupplierName.toLowerCase()))
                                .map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => {
                                            setActiveTab(s.id);
                                            setShowAddSupplierModal(false);
                                            setNewSupplierName('');
                                        }}
                                        className="w-full text-left p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 flex items-center justify-between group transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center text-white text-xs font-black shadow-lg shadow-slate-200`}>
                                                {s.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-800 uppercase leading-none">{s.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Ouvrir Situation</p>
                                            </div>
                                        </div>
                                        <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-all">
                                            <ArrowRight className="h-4 w-4 text-slate-900" />
                                        </div>
                                    </button>
                                ))
                            }

                            {newSupplierName && !Object.values(suppliers).some(s => s.name.toLowerCase() === newSupplierName.toLowerCase()) && (
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

                    {/* General Note Sidebar Section */}
                    {isAdmin && (
                        <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group">
                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                    <FileText className="h-3 w-3" />
                                    NOTE GÉNÉRALE
                                </span>
                                <button
                                    onClick={() => {
                                        setNoteEditorType('general');
                                        setTempNoteValue(generalNote);
                                        setShowNoteModal(true);
                                    }}
                                    className="p-1 hover:bg-slate-200 rounded transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Pencil className="h-2.5 w-2.5 text-slate-400" />
                                </button>
                            </div>
                            <div className="p-4">
                                <p className="text-[11px] font-medium text-slate-500 italic leading-relaxed whitespace-pre-wrap">
                                    {generalNote || "Aucune note générale pour le moment..."}
                                </p>
                            </div>
                        </div>
                    )}
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

                            <div className="bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl text-right">
                                <p className="text-[8px] font-black text-slate-500 uppercase">Total Montant</p>
                                <p className="text-sm font-black text-slate-900">{activeStat.totalCost.toLocaleString(undefined, { minimumFractionDigits: 3 })}</p>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-right">
                                <p className="text-[8px] font-black text-emerald-600 uppercase">Payé</p>
                                <p className="text-sm font-black text-emerald-800">{activeStat.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 3 })}</p>
                            </div>
                            <div className={`${activeStat.remaining < 0 ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'} border px-4 py-2 rounded-xl text-right`}>
                                <p className={`text-[8px] font-black ${activeStat.remaining < 0 ? 'text-red-500' : 'text-blue-500'} uppercase`}>Solde</p>
                                <p className={`text-sm font-black ${activeStat.remaining < 0 ? 'text-red-800' : 'text-blue-800'}`}>{activeStat.remaining.toLocaleString(undefined, { minimumFractionDigits: 3 })}</p>
                            </div>
                        </div>
                    </div>

                    {/* Supplier Notes Display */}
                    {isAdmin && (
                        <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl flex items-start gap-4">
                            <div className="bg-amber-100 p-2 rounded-lg">
                                <FileText className="h-4 w-4 text-amber-600" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Notes du Chantier</span>
                                    <button
                                        onClick={() => {
                                            setNoteEditorType('supplier');
                                            setTempNoteValue(currentSupplier.notes || '');
                                            setShowNoteModal(true);
                                        }}
                                        className="text-[9px] font-black text-amber-600 hover:underline uppercase"
                                    >
                                        Éditer
                                    </button>
                                </div>
                                <p className="text-xs font-medium text-slate-600 leading-relaxed italic">
                                    {currentSupplier.notes || "Aucune consigne particulière pour ce fournisseur."}
                                </p>
                            </div>
                        </div>
                    )}



                    {/* Quick Document Upload Button */}
                    {isAdmin && (
                        <div className="flex justify-center mb-6">
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-black uppercase tracking-wide transition-all flex items-center gap-3 shadow-lg hover:shadow-xl text-sm"
                            >
                                <Upload className="h-5 w-5" />
                                Importer un Document
                            </button>
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
                    {isAdmin && uploadedDocs.filter(doc => doc.supplierId === activeTab).length > 0 && (
                        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div
                                className="flex items-center justify-between px-1 mb-4 cursor-pointer group"
                                onClick={() => setShowUploadedDocs(!showUploadedDocs)}
                            >
                                <div className="flex items-center gap-3">
                                    <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${showUploadedDocs ? 'rotate-0' : '-rotate-90'}`} />
                                    <div className="w-1.5 h-6 bg-amber-400 rounded-full"></div>
                                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Documents Importés</h2>
                                    <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100">
                                        {uploadedDocs.filter(doc => doc.supplierId === activeTab).length} document{uploadedDocs.filter(doc => doc.supplierId === activeTab).length > 1 ? 's' : ''}
                                    </span>
                                </div>
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        if (confirm('Supprimer tous les documents importés pour ce fournisseur ?')) {
                                            const docsToDelete = uploadedDocs.filter(doc => doc.supplierId === activeTab);
                                            for (const doc of docsToDelete) {
                                                await handleDeleteUploadedDoc(doc.id);
                                            }
                                        }
                                    }}
                                    className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase hover:underline"
                                >
                                    Tout supprimer
                                </button>
                            </div>

                            {showUploadedDocs && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-1">
                                    {uploadedDocs
                                        .filter(doc => doc.supplierId === activeTab)
                                        .map((doc, index) => (
                                            <div key={doc.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 hover:shadow-md transition-all group relative">
                                                <button
                                                    onClick={() => handleDeleteUploadedDoc(doc.id)}
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
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-4 mb-12">
                        <div
                            className="flex items-center justify-between px-1 cursor-pointer group"
                            onClick={() => setShowExpensesSection(!showExpensesSection)}
                        >
                            <div className="flex items-center gap-3">
                                <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${showExpensesSection ? 'rotate-0' : '-rotate-90'}`} />
                                <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Factures & Bons</h2>
                                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">{currentSupplier.expenses.length} documents</span>
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
                                                                        {e.price.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-[10px] text-slate-400 font-bold ml-0.5">DT</span>
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
                                                                                                <td className="px-4 py-2 text-right font-black text-blue-900 text-[10px]">{item.totalTTC.toLocaleString(undefined, { minimumFractionDigits: 3 })}</td>
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
                        currentSupplier.deposits && (
                            <div className="space-y-4 mb-20">
                                <div
                                    className="flex items-center justify-between px-1 cursor-pointer group"
                                    onClick={() => setShowDepositsSection(!showDepositsSection)}
                                >
                                    <div className="flex items-center gap-3">
                                        <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${showDepositsSection ? 'rotate-0' : '-rotate-90'}`} />
                                        <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Historique Acomptes</h2>
                                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">{currentSupplier.deposits.length} paiements</span>
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
                                                    {currentSupplier.deposits.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                                                                Aucun acompte enregistré
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        currentSupplier.deposits.map((d, index) => (
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
            {/* Note Editor Modal */}
            {
                showNoteModal && (
                    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                        <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900">
                                        {noteEditorType === 'supplier' ? `Notes: ${currentSupplier.name}` : 'Note Générale du Projet'}
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
            {showDocPicker && (
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
            )}
        </div >
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
