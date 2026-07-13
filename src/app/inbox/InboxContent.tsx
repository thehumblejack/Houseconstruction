'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import { matchSupplier, extractAmount, cleanDescription } from '@/lib/invoice-inbox';
import { Camera, CheckCircle2, Loader2, Send, X, Inbox, ArrowRight, Lock } from 'lucide-react';

// Quick-capture inbox: snap a photo of an invoice, add a short caption
// ("Sotubi ciment 340dt"), send. It lands in `pending_factures` — nothing is
// counted until it's approved in the Dépenses review queue. No third-party
// messaging service involved: install the app icon on the home screen and
// this page IS the WhatsApp-style inbox.

export default function InboxContent() {
    const { user, isApproved, loading } = useAuth();
    const { userRole } = useProject();
    const canAdd = userRole === 'admin' || userRole === 'editor';
    const supabase = useMemo(() => createClient(), []);

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<{ supplier: string | null; amount: number | null } | null>(null);
    const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('suppliers').select('id, name').is('deleted_at', null);
            setSuppliers(data || []);
        })();
    }, [supabase]);

    useEffect(() => {
        return () => { if (preview) URL.revokeObjectURL(preview); };
    }, [preview]);

    const pickFile = (f: File | null) => {
        if (preview) URL.revokeObjectURL(preview);
        setFile(f);
        setPreview(f ? URL.createObjectURL(f) : null);
        setError(null);
    };

    const reset = () => {
        pickFile(null);
        setCaption('');
        setDone(null);
        setError(null);
    };

    const handleSend = async () => {
        if (!canAdd || (!file && !caption.trim())) return;
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

            // 2. Parse the caption against the real fournisseurs
            const { best, confidence, alternatives } = matchSupplier(caption, suppliers);
            const amount = extractAmount(caption);
            const flags: string[] = [];
            if (!best) flags.push('unknown_fournisseur');
            else if (confidence < 0.8) flags.push('low_fournisseur_confidence');
            if (amount == null) flags.push('missing_montant');

            // 3. Stage it — the review queue in Dépenses does the rest
            const { error: insErr } = await supabase.from('pending_factures').insert({
                message_sid: sid,
                sender: user?.email || 'app',
                raw_caption: caption.trim(),
                image_url: imageUrl,
                parsed_supplier_id: best?.id ?? null,
                parsed_supplier_name: best?.name ?? null,
                supplier_confidence: confidence,
                parsed_amount: amount,
                parsed_description: cleanDescription(caption, best?.name, amount),
                alternatives,
                flags,
            });
            if (insErr) throw new Error(insErr.message);

            setDone({ supplier: best?.name ?? null, amount });
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
                        <p className="text-xs text-slate-500">Photo + légende → file de vérification</p>
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
                                Reçu — {done.supplier ?? 'fournisseur ?'} · {done.amount != null ? `${done.amount} DT` : 'montant ?'}
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
                                <img src={preview} alt="Facture" className="w-full max-h-[45vh] object-contain rounded-2xl border border-slate-200 bg-white" />
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
                                className="w-full flex flex-col items-center justify-center gap-2 h-44 rounded-2xl border-2 border-dashed border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50 transition-colors"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                                    <Camera className="h-6 w-6" />
                                </div>
                                <span className="text-sm font-medium text-slate-700">Prendre / choisir une photo</span>
                                <span className="text-xs text-slate-400">Facture, bon ou reçu</span>
                            </button>
                        )}

                        {/* Caption */}
                        <div>
                            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Légende</label>
                            <input
                                type="text"
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                                placeholder="Ex: Sotubi ciment 340dt"
                                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
                            />
                            <p className="text-[11px] text-slate-400 mt-1.5">Fournisseur + description + montant — le tri se fait tout seul, vous validez après.</p>
                        </div>

                        {error && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-700">{error}</div>
                        )}

                        <button
                            onClick={handleSend}
                            disabled={sending || (!file && !caption.trim())}
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
