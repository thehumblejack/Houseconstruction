'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import { Camera, CheckCircle2, Loader2, Send, X, Inbox, ArrowRight, Lock, Search, Store, DollarSign } from 'lucide-react';

// Quick-capture inbox: snap a photo, pick the fournisseur (searchable),
// type the montant, send. It lands in `pending_factures` — nothing is counted
// until it's approved in the Dépenses review queue.

export default function InboxContent() {
    const { user, isApproved, loading } = useAuth();
    const { userRole, currentProject } = useProject();
    const canAdd = userRole === 'admin' || userRole === 'editor';
    const supabase = useMemo(() => createClient(), []);

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
    const [supplierSearch, setSupplierSearch] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState<{ id: string; name: string } | null>(null);
    const [showSupplierList, setShowSupplierList] = useState(false);
    const [amount, setAmount] = useState('');
    const [designation, setDesignation] = useState('');
    const [phases, setPhases] = useState<Array<{ id: string; name: string }>>([]);
    const [phaseId, setPhaseId] = useState('');
    const [suggestedPhaseId, setSuggestedPhaseId] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<{ supplier: string; amount: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supplierBoxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('suppliers').select('id, name').is('deleted_at', null).order('name');
            setSuppliers(data || []);
        })();
    }, [supabase]);

    // Phases of the current project (fail-soft if the table doesn't exist)
    useEffect(() => {
        if (!currentProject) { setPhases([]); return; }
        (async () => {
            const { data, error } = await supabase.from('phases').select('id, name').eq('project_id', currentProject.id).order('sort_order').order('created_at');
            setPhases(error ? [] : (data || []));
        })();
    }, [supabase, currentProject]);

    // When a fournisseur is picked, suggest the phase of their most recent
    // facture — it's very likely the new one belongs to the same phase.
    useEffect(() => {
        if (!selectedSupplier || !currentProject || phases.length === 0) { setSuggestedPhaseId(null); return; }
        let cancelled = false;
        (async () => {
            try {
                const { data } = await supabase
                    .from('expenses')
                    .select('phase_id')
                    .eq('project_id', currentProject.id)
                    .eq('supplier_id', selectedSupplier.id)
                    .not('phase_id', 'is', null)
                    .is('deleted_at', null)
                    .order('created_at', { ascending: false })
                    .limit(1);
                if (cancelled) return;
                const suggestion = data?.[0]?.phase_id && phases.some(p => p.id === data[0].phase_id) ? data[0].phase_id : null;
                setSuggestedPhaseId(suggestion);
                if (suggestion) setPhaseId(prev => prev || suggestion);
            } catch {
                if (!cancelled) setSuggestedPhaseId(null);
            }
        })();
        return () => { cancelled = true; };
    }, [selectedSupplier, currentProject, phases, supabase]);

    useEffect(() => {
        return () => { if (preview) URL.revokeObjectURL(preview); };
    }, [preview]);

    // Close the supplier list when tapping outside
    useEffect(() => {
        const onDown = (e: MouseEvent | TouchEvent) => {
            if (supplierBoxRef.current && !supplierBoxRef.current.contains(e.target as Node)) {
                setShowSupplierList(false);
            }
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('touchstart', onDown);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('touchstart', onDown);
        };
    }, []);

    const filteredSuppliers = useMemo(() => {
        const q = supplierSearch.trim().toLowerCase();
        const list = q ? suppliers.filter(s => s.name.toLowerCase().includes(q)) : suppliers;
        return list.slice(0, 8);
    }, [suppliers, supplierSearch]);

    const pickFile = (f: File | null) => {
        if (preview) URL.revokeObjectURL(preview);
        setFile(f);
        setPreview(f ? URL.createObjectURL(f) : null);
        setError(null);
    };

    const reset = () => {
        pickFile(null);
        setSupplierSearch('');
        setSelectedSupplier(null);
        setAmount('');
        setDesignation('');
        setPhaseId('');
        setSuggestedPhaseId(null);
        setDone(null);
        setError(null);
    };

    const canSend = !!selectedSupplier && !!amount && !isNaN(parseFloat(amount));

    const handleSend = async () => {
        if (!canAdd || !canSend || !selectedSupplier) return;
        const price = parseFloat(amount);
        setSending(true);
        setError(null);
        try {
            const sid = `qa_${(typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now()}`;

            // 1. Upload the photo (if any)
            let imageUrl: string | null = null;
            if (file) {
                const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
                const path = `quickadd/${sid}.${ext}`;
                let bucket = 'invoices';
                let up = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true });
                if (up.error) {
                    bucket = 'documents';
                    up = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true });
                }
                if (up.error) throw new Error(`Envoi de l'image impossible: ${up.error.message}`);
                imageUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
            }

            // 2. Stage it — explicit fournisseur + montant, no guessing needed.
            const row: Record<string, any> = {
                message_sid: sid,
                sender: user?.email || 'app',
                raw_caption: [selectedSupplier.name, designation.trim(), `${price} DT`].filter(Boolean).join(' · '),
                image_url: imageUrl,
                parsed_supplier_id: selectedSupplier.id,
                parsed_supplier_name: selectedSupplier.name,
                supplier_confidence: 1,
                parsed_amount: price,
                parsed_description: designation.trim(),
                alternatives: [],
                flags: [],
            };
            if (phaseId) row.phase_id = phaseId;
            let { error: insErr } = await supabase.from('pending_factures').insert(row);
            // The phase_id column requires a small migration — retry without it if missing.
            if (insErr && phaseId && /phase_id/i.test(insErr.message)) {
                delete row.phase_id;
                ({ error: insErr } = await supabase.from('pending_factures').insert(row));
            }
            if (insErr) throw new Error(insErr.message);

            setDone({ supplier: selectedSupplier.name, amount: price });
        } catch (e: any) {
            console.error('Quick add failed:', e);
            setError(e?.message || "Échec de l'envoi.");
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center font-jakarta">
                <Loader2 className="h-7 w-7 text-slate-400 animate-spin" />
            </div>
        );
    }

    if (!user || !isApproved) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 font-jakarta">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 max-w-sm w-full text-center space-y-4">
                    <div className="mx-auto w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <Lock className="h-5 w-5 text-slate-500" />
                    </div>
                    <p className="text-sm text-slate-500">Connectez-vous pour ajouter des factures.</p>
                    <Link href="/login" className="block w-full bg-slate-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
                        Se connecter
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen font-jakarta">
            <div className="max-w-md mx-auto px-4 pt-6 pb-28 md:pb-12 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                        <Inbox className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold tracking-tight text-slate-900 leading-tight">Ajout rapide</h1>
                        <p className="text-xs text-slate-500">Photo + fournisseur + montant → file de vérification</p>
                    </div>
                </div>

                {!canAdd ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 text-center">
                        Votre rôle est en lecture seule — vous ne pouvez pas ajouter de factures.
                    </div>
                ) : done ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-4 text-center">
                        <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                        <div>
                            <p className="text-sm font-semibold text-emerald-800">
                                Reçu — {done.supplier} · {done.amount.toLocaleString(undefined, { minimumFractionDigits: 3 })} DT
                            </p>
                            <p className="text-xs text-emerald-700/80 mt-1">En attente de validation dans Dépenses.</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={reset}
                                className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                            >
                                <Camera className="h-4 w-4" /> Ajouter une autre
                            </button>
                            <Link
                                href="/expenses"
                                className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-white border border-emerald-200 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors"
                            >
                                Vérifier <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Photo */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => pickFile(e.target.files?.[0] || null)}
                        />
                        {preview ? (
                            <div className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={preview} alt="Facture" className="w-full max-h-[38vh] object-contain rounded-2xl border border-slate-200 bg-white" />
                                <button
                                    onClick={() => pickFile(null)}
                                    className="absolute top-2 right-2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-500 shadow-sm hover:text-rose-600 transition-colors"
                                    aria-label="Retirer la photo"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full flex flex-col items-center justify-center gap-2 h-36 rounded-2xl border-2 border-dashed border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50 transition-colors"
                            >
                                <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                                    <Camera className="h-5 w-5" />
                                </div>
                                <span className="text-sm font-medium text-slate-700">Prendre / choisir une photo</span>
                                <span className="text-xs text-slate-400">Facture, bon ou reçu</span>
                            </button>
                        )}

                        {/* Fournisseur — searchable */}
                        <div ref={supplierBoxRef} className="relative">
                            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Fournisseur</label>
                            {selectedSupplier ? (
                                <div className="flex items-center gap-2.5 h-11 px-3 rounded-xl border border-slate-300 bg-white">
                                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-900 text-white text-xs font-semibold shrink-0">
                                        {selectedSupplier.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="flex-1 min-w-0 truncate text-sm font-medium text-slate-900">{selectedSupplier.name}</span>
                                    <button
                                        onClick={() => { setSelectedSupplier(null); setSupplierSearch(''); setShowSupplierList(true); }}
                                        className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                        aria-label="Changer de fournisseur"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={supplierSearch}
                                            onChange={(e) => { setSupplierSearch(e.target.value); setShowSupplierList(true); }}
                                            onFocus={() => setShowSupplierList(true)}
                                            placeholder="Rechercher un fournisseur…"
                                            className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                                        />
                                    </div>
                                    {showSupplierList && (
                                        <div className="absolute z-20 mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                                            {filteredSuppliers.length === 0 ? (
                                                <p className="px-3 py-3 text-sm text-slate-400">Aucun fournisseur trouvé.</p>
                                            ) : (
                                                filteredSuppliers.map((s) => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => { setSelectedSupplier(s); setShowSupplierList(false); }}
                                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                                                    >
                                                        <Store className="h-4 w-4 text-slate-400 shrink-0" />
                                                        <span className="text-sm font-medium text-slate-900 truncate">{s.name}</span>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Montant */}
                        <div>
                            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Montant (DT)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.001"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.000"
                                    className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 tabular-nums placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                                />
                            </div>
                        </div>

                        {/* Phase (optional, suggested from the fournisseur's last facture) */}
                        {phases.length > 0 && (
                            <div>
                                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                                    Phase
                                    {suggestedPhaseId && phaseId === suggestedPhaseId && (
                                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium">Suggérée (dernière facture)</span>
                                    )}
                                </label>
                                <select
                                    value={phaseId}
                                    onChange={(e) => setPhaseId(e.target.value)}
                                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                                >
                                    <option value="">Aucune phase</option>
                                    {phases.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Désignation (optional) */}
                        <div>
                            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Désignation <span className="text-slate-400 font-normal">(optionnel)</span></label>
                            <input
                                type="text"
                                value={designation}
                                onChange={(e) => setDesignation(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && canSend) handleSend(); }}
                                placeholder="Ex: Ciment"
                                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                            />
                        </div>

                        {error && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-700">{error}</div>
                        )}

                        <button
                            onClick={handleSend}
                            disabled={sending || !canSend}
                            className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99] transition-all"
                        >
                            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            {sending ? 'Envoi…' : 'Envoyer en vérification'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
