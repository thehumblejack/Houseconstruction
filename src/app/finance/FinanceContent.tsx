'use client';

/**
 * FINANCE / TRÉSORERIE
 *
 * Modèle : des COMPTES (l'argent réel disponible — banque, cash) et des
 * MOUVEMENTS (entrées = approvisionnement, sorties = paiements) rattachés à un
 * compte. Solde d'un compte = solde initial + entrées − sorties.
 *
 * Indépendant du total facturé : on suit ici combien il reste réellement en
 * banque, et depuis quel compte part chaque paiement.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import { Modal } from '@/components/ui';
import {
    Wallet, Plus, Loader2, Lock, Landmark, ArrowDownRight, ArrowUpRight,
    Pencil, Trash2, X, TrendingDown, TrendingUp, EyeOff, Eye, Store, CheckCircle2,
} from 'lucide-react';

interface Account { id: string; name: string; initial_balance: number; sort_order: number; }
interface Movement { id: string; account_id: string; direction: 'in' | 'out'; amount: number; label: string | null; supplier_id: string | null; date: string; }

const ACCOUNT_TONES = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-600', 'bg-slate-700'];

export default function FinanceContent() {
    const { user, isApproved, loading: authLoading } = useAuth();
    const { currentProject, userRole, loading: projectLoading } = useProject();
    const canEdit = userRole === 'admin' || userRole === 'editor';
    const supabase = useMemo(() => createClient(), []);

    const [loading, setLoading] = useState(true);
    const [notReady, setNotReady] = useState(false); // migration not applied
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [movements, setMovements] = useState<Movement[]>([]);
    const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
    const [privacy, setPrivacy] = useState(false);

    // account modal
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [accName, setAccName] = useState('');
    const [accBalance, setAccBalance] = useState('');

    // movement modal
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [moveDir, setMoveDir] = useState<'in' | 'out'>('out');
    const [moveAccount, setMoveAccount] = useState('');
    const [moveAmount, setMoveAmount] = useState('');
    const [moveLabel, setMoveLabel] = useState('');
    const [moveSupplier, setMoveSupplier] = useState('');
    const [moveDate, setMoveDate] = useState(new Date().toISOString().split('T')[0]);
    const [saving, setSaving] = useState(false);

    const fmt = useCallback((v: number) => privacy ? '•••' : v.toLocaleString(undefined, { minimumFractionDigits: 3 }), [privacy]);
    // Compact (no decimals) for the summary tiles — keeps big aggregates readable.
    const fmtc = useCallback((v: number) => privacy ? '•••' : Math.round(v).toLocaleString(), [privacy]);

    const fetchAll = useCallback(async () => {
        if (!currentProject) { if (!projectLoading) setLoading(false); return; }
        setLoading(true);
        try {
            const accRes = await supabase.from('finance_accounts').select('*').eq('project_id', currentProject.id).order('sort_order').order('created_at');
            if (accRes.error) {
                // table missing → migration not applied
                if (/relation|does not exist|schema cache/i.test(accRes.error.message)) { setNotReady(true); setLoading(false); return; }
                throw accRes.error;
            }
            const movRes = await supabase.from('finance_movements').select('*').eq('project_id', currentProject.id).order('date', { ascending: false }).order('created_at', { ascending: false });
            setAccounts((accRes.data || []) as Account[]);
            setMovements(((movRes.data || []) as any[]).map((m) => ({ ...m, amount: Number(m.amount) || 0 })) as Movement[]);

            // project's own suppliers (for the optional payment tag)
            const { data: links } = await supabase.from('project_suppliers').select('supplier_id').eq('project_id', currentProject.id);
            const ids = (links || []).map((l: any) => l.supplier_id);
            if (ids.length) {
                const { data: sups } = await supabase.from('suppliers').select('id, name').in('id', ids).is('deleted_at', null).order('name');
                setSuppliers((sups || []) as any);
            } else setSuppliers([]);
            setNotReady(false);
        } catch (e) {
            console.error('Finance fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, [supabase, currentProject, projectLoading]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    /* ── derived ── */
    const perAccount = useMemo(() => {
        const map = new Map<string, { in: number; out: number; balance: number }>();
        for (const a of accounts) map.set(a.id, { in: 0, out: 0, balance: a.initial_balance });
        for (const m of movements) {
            const b = map.get(m.account_id); if (!b) continue;
            if (m.direction === 'in') { b.in += m.amount; b.balance += m.amount; }
            else { b.out += m.amount; b.balance -= m.amount; }
        }
        return map;
    }, [accounts, movements]);

    const totals = useMemo(() => {
        let available = 0, out = 0, inSum = 0, initial = 0;
        for (const a of accounts) { initial += a.initial_balance; }
        for (const [, b] of perAccount) available += b.balance;
        for (const m of movements) { if (m.direction === 'out') out += m.amount; else inSum += m.amount; }
        return { available, out, inSum, initial };
    }, [accounts, perAccount, movements]);

    const supplierName = useCallback((id: string | null) => id ? (suppliers.find((s) => s.id === id)?.name || '') : '', [suppliers]);
    const accountName = useCallback((id: string) => accounts.find((a) => a.id === id)?.name || '—', [accounts]);
    const tone = (id: string) => ACCOUNT_TONES[Math.abs(id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % ACCOUNT_TONES.length];

    /* ── account CRUD ── */
    const openNewAccount = () => { setEditingAccount(null); setAccName(''); setAccBalance(''); setShowAccountModal(true); };
    const openEditAccount = (a: Account) => { setEditingAccount(a); setAccName(a.name); setAccBalance(String(a.initial_balance)); setShowAccountModal(true); };
    const saveAccount = async () => {
        if (!canEdit || !currentProject || !accName.trim()) return;
        setSaving(true);
        try {
            const payload = { name: accName.trim(), initial_balance: parseFloat(accBalance) || 0 };
            if (editingAccount) {
                const { error } = await supabase.from('finance_accounts').update(payload).eq('id', editingAccount.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('finance_accounts').insert({ ...payload, project_id: currentProject.id, sort_order: accounts.length });
                if (error) throw error;
            }
            setShowAccountModal(false);
            fetchAll();
        } catch (e: any) { alert('Erreur : ' + (e?.message || e)); } finally { setSaving(false); }
    };
    const deleteAccount = async (a: Account) => {
        if (!canEdit) return;
        if (!confirm(`Supprimer le compte « ${a.name} » et tous ses mouvements ?`)) return;
        const { error } = await supabase.from('finance_accounts').delete().eq('id', a.id);
        if (error) { alert('Erreur : ' + error.message); return; }
        fetchAll();
    };

    /* ── movement ── */
    const openMovement = (dir: 'in' | 'out') => {
        setMoveDir(dir); setMoveAccount(accounts[0]?.id || ''); setMoveAmount(''); setMoveLabel(''); setMoveSupplier('');
        setMoveDate(new Date().toISOString().split('T')[0]); setShowMoveModal(true);
    };
    const saveMovement = async () => {
        if (!canEdit || !currentProject || !moveAccount || !moveAmount) return;
        const amount = parseFloat(moveAmount);
        if (isNaN(amount) || amount <= 0) { alert('Montant invalide.'); return; }
        setSaving(true);
        try {
            const { error } = await supabase.from('finance_movements').insert({
                project_id: currentProject.id, account_id: moveAccount, direction: moveDir,
                amount, label: moveLabel.trim() || null, supplier_id: moveSupplier || null, date: moveDate,
            });
            if (error) throw error;
            setShowMoveModal(false);
            fetchAll();
        } catch (e: any) { alert('Erreur : ' + (e?.message || e)); } finally { setSaving(false); }
    };
    const deleteMovement = async (m: Movement) => {
        if (!canEdit) return;
        if (!confirm('Supprimer ce mouvement ?')) return;
        const { error } = await supabase.from('finance_movements').delete().eq('id', m.id);
        if (error) { alert('Erreur : ' + error.message); return; }
        fetchAll();
    };

    /* ── gates ── */
    if (authLoading || projectLoading || loading) {
        return <div className="min-h-screen flex items-center justify-center font-jakarta"><Loader2 className="h-7 w-7 text-slate-400 animate-spin" /></div>;
    }
    if (!user || !isApproved) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 font-jakarta">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 max-w-sm w-full text-center space-y-4">
                    <div className="mx-auto w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center"><Lock className="h-5 w-5 text-slate-500" /></div>
                    <p className="text-sm text-slate-500">Connectez-vous pour accéder à la finance.</p>
                    <Link href="/login" className="block w-full bg-slate-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">Se connecter</Link>
                </div>
            </div>
        );
    }
    if (notReady) {
        return (
            <div className="min-h-screen font-jakarta">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
                        <Landmark className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                        <h2 className="text-base font-semibold text-slate-900">Finance pas encore activée</h2>
                        <p className="text-sm text-slate-600 mt-1.5">Exécutez la migration <code className="text-xs bg-white px-1.5 py-0.5 rounded border border-amber-200">finance_treasury.sql</code> dans Supabase, puis rechargez cette page.</p>
                    </div>
                </div>
            </div>
        );
    }

    const inputClass = "w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition";
    const labelClass = "block text-[13px] font-medium text-slate-700 mb-1.5";

    return (
        <div className="min-h-screen font-jakarta">
            <div className="max-w-[110rem] mx-auto px-4 sm:px-6 py-5 pb-28 md:pb-12 space-y-5">

                {/* header */}
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">Finance</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Trésorerie — l'argent réellement disponible pour vos commandes</p>
                    </div>
                    <button onClick={() => setPrivacy(!privacy)} className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${privacy ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        {privacy ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>

                {/* summary band */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs text-slate-500">Disponible en banque</p>
                            <p className={`text-2xl sm:text-3xl font-semibold tabular-nums mt-1 ${totals.available < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                                {fmt(totals.available)} <span className="text-sm font-medium text-slate-400">DT</span>
                            </p>
                        </div>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${totals.available < 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            <Landmark className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                        <div className="rounded-xl bg-slate-50 px-3 py-2.5 min-w-0">
                            <p className="text-[11px] text-slate-500 flex items-center gap-1"><ArrowDownRight className="h-3 w-3 text-emerald-500" /> Entrées</p>
                            <p className="text-[13px] sm:text-sm font-semibold text-emerald-600 tabular-nums mt-0.5">{fmtc(totals.inSum)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2.5 min-w-0">
                            <p className="text-[11px] text-slate-500 flex items-center gap-1"><ArrowUpRight className="h-3 w-3 text-rose-500" /> Sorties</p>
                            <p className="text-[13px] sm:text-sm font-semibold text-rose-600 tabular-nums mt-0.5">{fmtc(totals.out)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2.5 min-w-0">
                            <p className="text-[11px] text-slate-500">Apport initial</p>
                            <p className="text-[13px] sm:text-sm font-semibold text-slate-900 tabular-nums mt-0.5">{fmtc(totals.initial)}</p>
                        </div>
                    </div>
                    {canEdit && (
                        <div className="mt-4 flex gap-2">
                            <button onClick={() => openMovement('out')} disabled={accounts.length === 0} className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-colors">
                                <TrendingDown className="h-4 w-4" /> Sortie
                            </button>
                            <button onClick={() => openMovement('in')} disabled={accounts.length === 0} className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors">
                                <TrendingUp className="h-4 w-4" /> Entrée
                            </button>
                        </div>
                    )}
                </div>

                {/* accounts */}
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                        <p className="text-sm font-semibold text-slate-900">Mes comptes</p>
                        {canEdit && (
                            <button onClick={openNewAccount} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-slate-600 hover:bg-slate-100 text-sm font-medium transition-colors">
                                <Plus className="h-4 w-4" /> Ajouter
                            </button>
                        )}
                    </div>
                    {accounts.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
                            <Wallet className="h-9 w-9 text-slate-300 mx-auto mb-2.5" />
                            <p className="text-sm text-slate-500">Aucun compte. Ajoutez vos comptes bancaires pour suivre votre argent.</p>
                        </div>
                    ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {accounts.map((a) => {
                                const b = perAccount.get(a.id) || { in: 0, out: 0, balance: a.initial_balance };
                                return (
                                    <div key={a.id} className="group rounded-2xl border border-slate-200 bg-white p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={`w-9 h-9 rounded-xl ${tone(a.id)} text-white flex items-center justify-center shrink-0`}>
                                                    <Landmark className="h-4 w-4" />
                                                </div>
                                                <p className="text-sm font-semibold text-slate-900 truncate">{a.name}</p>
                                            </div>
                                            {canEdit && (
                                                <div className="flex items-center gap-0.5 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openEditAccount(a)} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                                                    <button onClick={() => deleteAccount(a)} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                                                </div>
                                            )}
                                        </div>
                                        <p className={`text-xl font-semibold tabular-nums mt-3 ${b.balance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{fmt(b.balance)} <span className="text-xs font-medium text-slate-400">DT</span></p>
                                        <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
                                            <span>Initial {fmt(a.initial_balance)}</span>
                                            {b.out > 0 && <span className="text-rose-500">− {fmt(b.out)}</span>}
                                            {b.in > 0 && <span className="text-emerald-500">+ {fmt(b.in)}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* movements */}
                {movements.length > 0 && (
                    <div className="space-y-2.5">
                        <p className="text-sm font-semibold text-slate-900 px-1">Derniers mouvements</p>
                        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
                            {movements.slice(0, 40).map((m) => {
                                const sn = supplierName(m.supplier_id);
                                return (
                                    <div key={m.id} className="group flex items-center gap-3 px-3.5 py-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.direction === 'out' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                            {m.direction === 'out' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[13px] font-medium text-slate-900 truncate">
                                                {m.label || (m.direction === 'out' ? 'Paiement' : 'Approvisionnement')}
                                                {sn && <span className="text-slate-400 font-normal"> · {sn}</span>}
                                            </p>
                                            <p className="text-[11px] text-slate-400 truncate">{accountName(m.account_id)} · {new Date(m.date).toLocaleDateString('fr-FR')}</p>
                                        </div>
                                        <p className={`text-[13px] font-semibold tabular-nums shrink-0 ${m.direction === 'out' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {m.direction === 'out' ? '−' : '+'}{fmt(m.amount)} DT
                                        </p>
                                        {canEdit && (
                                            <button onClick={() => deleteMovement(m)} className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-colors sm:opacity-0 sm:group-hover:opacity-100">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* account modal */}
            <Modal
                open={showAccountModal}
                onClose={() => setShowAccountModal(false)}
                title={editingAccount ? 'Modifier le compte' : 'Nouveau compte'}
                description="Un compte bancaire, une caisse, ou toute source d'argent"
                size="sm"
                icon={<div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center"><Landmark className="h-5 w-5" /></div>}
                footer={<>
                    <button onClick={() => setShowAccountModal(false)} className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">Annuler</button>
                    <button onClick={saveAccount} disabled={saving || !accName.trim()} className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-colors">
                        <CheckCircle2 className="h-4 w-4" /> {saving ? '…' : 'Enregistrer'}
                    </button>
                </>}
            >
                <div className="space-y-4">
                    <div>
                        <label className={labelClass}>Nom du compte</label>
                        <input type="text" value={accName} onChange={(e) => setAccName(e.target.value)} placeholder="Ex: Compte BIAT" autoFocus className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Solde actuel (DT)</label>
                        <input type="number" step="0.001" inputMode="decimal" value={accBalance} onChange={(e) => setAccBalance(e.target.value)} placeholder="0.000" className={`${inputClass} tabular-nums`} />
                        <p className="text-[11px] text-slate-400 mt-1.5">L'argent actuellement disponible sur ce compte.</p>
                    </div>
                </div>
            </Modal>

            {/* movement modal */}
            <Modal
                open={showMoveModal}
                onClose={() => setShowMoveModal(false)}
                title={moveDir === 'out' ? 'Nouvelle sortie' : 'Nouvelle entrée'}
                description={moveDir === 'out' ? 'Un paiement qui sort d\'un compte' : 'De l\'argent ajouté à un compte'}
                size="sm"
                icon={<div className={`w-10 h-10 rounded-xl flex items-center justify-center ${moveDir === 'out' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{moveDir === 'out' ? <TrendingDown className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}</div>}
                footer={<>
                    <button onClick={() => setShowMoveModal(false)} className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">Annuler</button>
                    <button onClick={saveMovement} disabled={saving || !moveAccount || !moveAmount} className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-colors">
                        <CheckCircle2 className="h-4 w-4" /> {saving ? '…' : 'Enregistrer'}
                    </button>
                </>}
            >
                <div className="space-y-4">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setMoveDir('out')} className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${moveDir === 'out' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500'}`}>Sortie</button>
                        <button onClick={() => setMoveDir('in')} className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${moveDir === 'in' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Entrée</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Montant (DT)</label>
                            <input type="number" step="0.001" inputMode="decimal" value={moveAmount} onChange={(e) => setMoveAmount(e.target.value)} placeholder="0.000" autoFocus className={`${inputClass} tabular-nums`} />
                        </div>
                        <div>
                            <label className={labelClass}>Date</label>
                            <input type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} className={inputClass} />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Compte</label>
                        <select value={moveAccount} onChange={(e) => setMoveAccount(e.target.value)} className={inputClass}>
                            {accounts.map((a) => {
                                const b = perAccount.get(a.id);
                                return <option key={a.id} value={a.id}>{a.name} ({fmt(b?.balance ?? a.initial_balance)} DT)</option>;
                            })}
                        </select>
                    </div>
                    {moveDir === 'out' && suppliers.length > 0 && (
                        <div>
                            <label className={labelClass}>Fournisseur <span className="text-slate-400 font-normal">(optionnel)</span></label>
                            <select value={moveSupplier} onChange={(e) => setMoveSupplier(e.target.value)} className={inputClass}>
                                <option value="">Aucun</option>
                                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className={labelClass}>Libellé <span className="text-slate-400 font-normal">(optionnel)</span></label>
                        <input type="text" value={moveLabel} onChange={(e) => setMoveLabel(e.target.value)} placeholder="Ex: Commande ciment" className={inputClass} />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
