'use client';

/**
 * FINANCE / TRÉSORERIE
 *
 * • Comptes (banque, cash) en TND / USD / EUR → convertis en TND via des taux
 *   éditables. Solde = solde initial + entrées − sorties.
 * • Créances & dettes : qui me doit / à qui je dois, réglable en un clic (crée
 *   le mouvement sur le compte choisi).
 * • Revenus récurrents (salaire…) : montant mensuel vers un compte, à encaisser.
 * • Convertisseur USD/EUR ↔ TND.
 *
 * Indépendant du total facturé : ici on suit l'argent réellement disponible.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import { Modal } from '@/components/ui';
import {
    Wallet, Plus, Loader2, Lock, Landmark, ArrowDownRight, ArrowUpRight,
    Pencil, Trash2, TrendingDown, TrendingUp, EyeOff, Eye, CheckCircle2,
    ArrowRightLeft, HandCoins, Repeat, Check, BarChart3,
} from 'lucide-react';

type Currency = 'TND' | 'USD' | 'EUR';
interface Account { id: string; name: string; initial_balance: number; sort_order: number; currency: Currency; }
interface Movement { id: string; account_id: string; direction: 'in' | 'out'; amount: number; label: string | null; supplier_id: string | null; date: string; }
interface Debt { id: string; person: string; amount: number; direction: 'receivable' | 'payable'; note: string | null; settled: boolean; }
interface Recurring { id: string; label: string; account_id: string | null; amount: number; currency: Currency; direction: 'in' | 'out'; day_of_month: number | null; last_applied: string | null; active: boolean; }

const ACCOUNT_TONES = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-600', 'bg-slate-700'];
const CUR_SYMBOL: Record<Currency, string> = { TND: 'DT', USD: '$', EUR: '€' };
const DEFAULT_RATES: Record<Currency, number> = { TND: 1, USD: 3.15, EUR: 3.40 };
const thisMonthKey = () => new Date().toISOString().slice(0, 7);
const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const monthLabel = (k: string) => { const [y, m] = k.split('-'); return `${MONTHS_FR[parseInt(m, 10) - 1] || m} ${y}`; };

export default function FinanceContent() {
    const { user, isApproved, loading: authLoading } = useAuth();
    const { currentProject, userRole, loading: projectLoading } = useProject();
    const canEdit = userRole === 'admin' || userRole === 'editor';
    const supabase = useMemo(() => createClient(), []);

    const [loading, setLoading] = useState(true);
    const [notReady, setNotReady] = useState(false);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [movements, setMovements] = useState<Movement[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [recurring, setRecurring] = useState<Recurring[]>([]);
    const [rates, setRates] = useState<Record<Currency, number>>(DEFAULT_RATES);
    const [privacy, setPrivacy] = useState(false);

    const [showAccountModal, setShowAccountModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [accName, setAccName] = useState('');
    const [accBalance, setAccBalance] = useState('');
    const [accCurrency, setAccCurrency] = useState<Currency>('TND');

    const [showMoveModal, setShowMoveModal] = useState(false);
    const [moveDir, setMoveDir] = useState<'in' | 'out'>('out');
    const [moveAccount, setMoveAccount] = useState('');
    const [moveAmount, setMoveAmount] = useState('');
    const [moveLabel, setMoveLabel] = useState('');
    const [moveSupplier, setMoveSupplier] = useState('');
    const [moveDate, setMoveDate] = useState(new Date().toISOString().split('T')[0]);
    const [settlingDebt, setSettlingDebt] = useState<Debt | null>(null);

    const [showDebtModal, setShowDebtModal] = useState(false);
    const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
    const [debtPerson, setDebtPerson] = useState('');
    const [debtAmount, setDebtAmount] = useState('');
    const [debtDir, setDebtDir] = useState<'receivable' | 'payable'>('receivable');
    const [debtNote, setDebtNote] = useState('');

    const [showRecurModal, setShowRecurModal] = useState(false);
    const [editingRecur, setEditingRecur] = useState<Recurring | null>(null);
    const [recurLabel, setRecurLabel] = useState('');
    const [recurAccount, setRecurAccount] = useState('');
    const [recurAmount, setRecurAmount] = useState('');
    const [recurCurrency, setRecurCurrency] = useState<Currency>('TND');
    const [recurDir, setRecurDir] = useState<'in' | 'out'>('in');
    const [recurDay, setRecurDay] = useState('1');

    const [showRatesModal, setShowRatesModal] = useState(false);
    const [showConvModal, setShowConvModal] = useState(false);
    const [tmpUsd, setTmpUsd] = useState('');
    const [tmpEur, setTmpEur] = useState('');
    const [convFrom, setConvFrom] = useState<Currency>('USD');
    const [convAmount, setConvAmount] = useState('');

    const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
    const [saving, setSaving] = useState(false);

    const fmt = useCallback((v: number) => privacy ? '•••' : v.toLocaleString(undefined, { minimumFractionDigits: 3 }), [privacy]);
    const fmtc = useCallback((v: number) => privacy ? '•••' : Math.round(v).toLocaleString(), [privacy]);
    const toTND = useCallback((amount: number, cur: Currency) => amount * (rates[cur] || 1), [rates]);

    const fetchAll = useCallback(async () => {
        if (!currentProject) { if (!projectLoading) setLoading(false); return; }
        setLoading(true);
        try {
            const accRes = await supabase.from('finance_accounts').select('*').eq('project_id', currentProject.id).order('sort_order').order('created_at');
            if (accRes.error) {
                if (/relation|does not exist|schema cache/i.test(accRes.error.message)) { setNotReady(true); setLoading(false); return; }
                throw accRes.error;
            }
            const [movRes, debtRes, recRes, setRes, linkRes] = await Promise.all([
                supabase.from('finance_movements').select('*').eq('project_id', currentProject.id).order('date', { ascending: false }).order('created_at', { ascending: false }),
                supabase.from('finance_debts').select('*').eq('project_id', currentProject.id).order('created_at', { ascending: false }),
                supabase.from('finance_recurring').select('*').eq('project_id', currentProject.id).order('created_at', { ascending: false }),
                supabase.from('project_settings').select('key, value').eq('project_id', currentProject.id).eq('key', 'fx_rates'),
                supabase.from('project_suppliers').select('supplier_id').eq('project_id', currentProject.id),
            ]);
            setAccounts(((accRes.data || []) as any[]).map((a) => ({ ...a, currency: (a.currency || 'TND') as Currency })));
            setMovements(((movRes.data || []) as any[]).map((m) => ({ ...m, amount: Number(m.amount) || 0 })));
            setDebts(debtRes.error ? [] : ((debtRes.data || []) as any[]).map((d) => ({ ...d, amount: Number(d.amount) || 0 })));
            setRecurring(recRes.error ? [] : ((recRes.data || []) as any[]).map((r) => ({ ...r, amount: Number(r.amount) || 0, currency: (r.currency || 'TND') as Currency })));

            const fxRaw = (setRes.data || [])[0]?.value;
            if (fxRaw) { try { const o = JSON.parse(fxRaw); setRates({ TND: 1, USD: Number(o.USD) || DEFAULT_RATES.USD, EUR: Number(o.EUR) || DEFAULT_RATES.EUR }); } catch { /* */ } }

            const ids = (linkRes.data || []).map((l: any) => l.supplier_id);
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

    const accCurrency_ = useCallback((id: string): Currency => accounts.find((a) => a.id === id)?.currency || 'TND', [accounts]);

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
        let available = 0, out = 0, inSum = 0;
        for (const a of accounts) { const b = perAccount.get(a.id); if (b) available += toTND(b.balance, a.currency); }
        for (const m of movements) {
            const c = accCurrency_(m.account_id);
            if (m.direction === 'out') out += toTND(m.amount, c); else inSum += toTND(m.amount, c);
        }
        const receivable = debts.filter((d) => d.direction === 'receivable' && !d.settled).reduce((s, d) => s + d.amount, 0);
        const payable = debts.filter((d) => d.direction === 'payable' && !d.settled).reduce((s, d) => s + d.amount, 0);
        const monthlyIn = recurring.filter((r) => r.active && r.direction === 'in').reduce((s, r) => s + toTND(r.amount, r.currency), 0);
        const monthlyOut = recurring.filter((r) => r.active && r.direction === 'out').reduce((s, r) => s + toTND(r.amount, r.currency), 0);
        return { available, out, inSum, receivable, payable, monthlyIn, monthlyOut };
    }, [accounts, perAccount, movements, debts, recurring, toTND, accCurrency_]);

    // Charges (sorties) vs encaissements (entrées) par mois, en TND — pour comparer.
    const monthlyCompare = useMemo(() => {
        const map = new Map<string, { in: number; out: number }>();
        for (const m of movements) {
            const k = (m.date || '').slice(0, 7);
            if (!k) continue;
            const tnd = toTND(m.amount, accCurrency_(m.account_id));
            const e = map.get(k) || { in: 0, out: 0 };
            if (m.direction === 'in') e.in += tnd; else e.out += tnd;
            map.set(k, e);
        }
        return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
            .map(([k, v]) => ({ key: k, label: monthLabel(k), in: v.in, out: v.out, net: v.in - v.out }));
    }, [movements, accCurrency_, toTND]);

    const supplierName = useCallback((id: string | null) => id ? (suppliers.find((s) => s.id === id)?.name || '') : '', [suppliers]);
    const accountName = useCallback((id: string) => accounts.find((a) => a.id === id)?.name || '—', [accounts]);
    const tone = (id: string) => ACCOUNT_TONES[Math.abs(id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % ACCOUNT_TONES.length];

    const openNewAccount = () => { setEditingAccount(null); setAccName(''); setAccBalance(''); setAccCurrency('TND'); setShowAccountModal(true); };
    const openEditAccount = (a: Account) => { setEditingAccount(a); setAccName(a.name); setAccBalance(String(a.initial_balance)); setAccCurrency(a.currency); setShowAccountModal(true); };
    const saveAccount = async () => {
        if (!canEdit || !currentProject || !accName.trim()) return;
        setSaving(true);
        try {
            const payload = { name: accName.trim(), initial_balance: parseFloat(accBalance) || 0, currency: accCurrency };
            if (editingAccount) { const { error } = await supabase.from('finance_accounts').update(payload).eq('id', editingAccount.id); if (error) throw error; }
            else { const { error } = await supabase.from('finance_accounts').insert({ ...payload, project_id: currentProject.id, sort_order: accounts.length }); if (error) throw error; }
            setShowAccountModal(false); fetchAll();
        } catch (e: any) { alert('Erreur : ' + (e?.message || e)); } finally { setSaving(false); }
    };
    const deleteAccount = async (a: Account) => {
        if (!canEdit || !confirm(`Supprimer « ${a.name} » et ses mouvements ?`)) return;
        const { error } = await supabase.from('finance_accounts').delete().eq('id', a.id);
        if (error) { alert('Erreur : ' + error.message); return; } fetchAll();
    };

    const openMovement = (dir: 'in' | 'out', preset?: { amount?: number; label?: string; account?: string; debt?: Debt }) => {
        setMoveDir(dir); setMoveAccount(preset?.account || accounts[0]?.id || '');
        setMoveAmount(preset?.amount != null ? String(preset.amount) : ''); setMoveLabel(preset?.label || '');
        setMoveSupplier(''); setMoveDate(new Date().toISOString().split('T')[0]); setSettlingDebt(preset?.debt || null);
        setShowMoveModal(true);
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
            if (settlingDebt) await supabase.from('finance_debts').update({ settled: true }).eq('id', settlingDebt.id);
            setShowMoveModal(false); setSettlingDebt(null); fetchAll();
        } catch (e: any) { alert('Erreur : ' + (e?.message || e)); } finally { setSaving(false); }
    };
    const deleteMovement = async (m: Movement) => {
        if (!canEdit || !confirm('Supprimer ce mouvement ?')) return;
        const { error } = await supabase.from('finance_movements').delete().eq('id', m.id);
        if (error) { alert('Erreur : ' + error.message); return; } fetchAll();
    };

    const openNewDebt = (dir: 'receivable' | 'payable') => { setEditingDebt(null); setDebtDir(dir); setDebtPerson(''); setDebtAmount(''); setDebtNote(''); setShowDebtModal(true); };
    const openEditDebt = (d: Debt) => { setEditingDebt(d); setDebtDir(d.direction); setDebtPerson(d.person); setDebtAmount(String(d.amount)); setDebtNote(d.note || ''); setShowDebtModal(true); };
    const saveDebt = async () => {
        if (!canEdit || !currentProject || !debtPerson.trim()) return;
        setSaving(true);
        try {
            const payload = { person: debtPerson.trim(), amount: parseFloat(debtAmount) || 0, direction: debtDir, note: debtNote.trim() || null };
            if (editingDebt) { const { error } = await supabase.from('finance_debts').update(payload).eq('id', editingDebt.id); if (error) throw error; }
            else { const { error } = await supabase.from('finance_debts').insert({ ...payload, project_id: currentProject.id }); if (error) throw error; }
            setShowDebtModal(false); fetchAll();
        } catch (e: any) { alert('Erreur : ' + (e?.message || e)); } finally { setSaving(false); }
    };
    const deleteDebt = async (d: Debt) => {
        if (!canEdit || !confirm('Supprimer cette ligne ?')) return;
        const { error } = await supabase.from('finance_debts').delete().eq('id', d.id);
        if (error) { alert('Erreur : ' + error.message); return; } fetchAll();
    };
    const settleDebt = (d: Debt) => {
        if (accounts.length === 0) { alert("Ajoutez d'abord un compte pour régler."); return; }
        openMovement(d.direction === 'receivable' ? 'in' : 'out', { amount: d.amount, label: d.person, debt: d });
    };
    const toggleDebtSettled = async (d: Debt) => {
        if (!canEdit) return;
        const { error } = await supabase.from('finance_debts').update({ settled: !d.settled }).eq('id', d.id);
        if (!error) fetchAll();
    };

    const openNewRecur = () => { setEditingRecur(null); setRecurLabel(''); setRecurAccount(accounts[0]?.id || ''); setRecurAmount(''); setRecurCurrency('TND'); setRecurDir('in'); setRecurDay('1'); setShowRecurModal(true); };
    const openEditRecur = (r: Recurring) => { setEditingRecur(r); setRecurLabel(r.label); setRecurAccount(r.account_id || ''); setRecurAmount(String(r.amount)); setRecurCurrency(r.currency); setRecurDir(r.direction); setRecurDay(String(r.day_of_month || 1)); setShowRecurModal(true); };
    const saveRecur = async () => {
        if (!canEdit || !currentProject || !recurLabel.trim() || !recurAccount) return;
        setSaving(true);
        try {
            const payload = { label: recurLabel.trim(), account_id: recurAccount, amount: parseFloat(recurAmount) || 0, currency: recurCurrency, direction: recurDir, day_of_month: parseInt(recurDay) || 1 };
            if (editingRecur) { const { error } = await supabase.from('finance_recurring').update(payload).eq('id', editingRecur.id); if (error) throw error; }
            else { const { error } = await supabase.from('finance_recurring').insert({ ...payload, project_id: currentProject.id, active: true }); if (error) throw error; }
            setShowRecurModal(false); fetchAll();
        } catch (e: any) { alert('Erreur : ' + (e?.message || e)); } finally { setSaving(false); }
    };
    const deleteRecur = async (r: Recurring) => {
        if (!canEdit || !confirm('Supprimer ce revenu récurrent ?')) return;
        const { error } = await supabase.from('finance_recurring').delete().eq('id', r.id);
        if (error) { alert('Erreur : ' + error.message); return; } fetchAll();
    };
    const applyRecur = async (r: Recurring) => {
        if (!canEdit || !currentProject || !r.account_id) return;
        if ((r.last_applied || '').slice(0, 7) === thisMonthKey()) { alert('Déjà encaissé ce mois-ci.'); return; }
        setSaving(true);
        try {
            const { error: e1 } = await supabase.from('finance_movements').insert({
                project_id: currentProject.id, account_id: r.account_id, direction: r.direction,
                amount: r.amount, label: r.label, date: new Date().toISOString().split('T')[0],
            });
            if (e1) throw e1;
            await supabase.from('finance_recurring').update({ last_applied: new Date().toISOString().split('T')[0] }).eq('id', r.id);
            fetchAll();
        } catch (e: any) { alert('Erreur : ' + (e?.message || e)); } finally { setSaving(false); }
    };
    const undoRecur = async (r: Recurring) => {
        if (!canEdit || !currentProject || !r.account_id) return;
        if (!confirm("Annuler l'encaissement de ce mois ?")) return;
        setSaving(true);
        try {
            // Supprime le(s) mouvement(s) générés ce mois-ci par ce récurrent.
            await supabase.from('finance_movements').delete()
                .eq('project_id', currentProject.id).eq('account_id', r.account_id)
                .eq('direction', r.direction).eq('label', r.label).eq('amount', r.amount)
                .gte('date', thisMonthKey() + '-01');
            await supabase.from('finance_recurring').update({ last_applied: null }).eq('id', r.id);
            fetchAll();
        } catch (e: any) { alert('Erreur : ' + (e?.message || e)); } finally { setSaving(false); }
    };

    const openRates = () => { setTmpUsd(String(rates.USD)); setTmpEur(String(rates.EUR)); setShowRatesModal(true); };
    const saveRates = async () => {
        if (!currentProject) return;
        const next = { TND: 1, USD: parseFloat(tmpUsd) || DEFAULT_RATES.USD, EUR: parseFloat(tmpEur) || DEFAULT_RATES.EUR };
        setRates(next); setShowRatesModal(false);
        if (canEdit) await supabase.from('project_settings').upsert({ project_id: currentProject.id, key: 'fx_rates', value: JSON.stringify({ USD: next.USD, EUR: next.EUR }) }, { onConflict: 'project_id,key' });
    };

    if (authLoading || projectLoading || loading) return <div className="min-h-screen flex items-center justify-center font-jakarta"><Loader2 className="h-7 w-7 text-slate-400 animate-spin" /></div>;
    if (!user || !isApproved) return (
        <div className="min-h-screen flex items-center justify-center p-6 font-jakarta">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 max-w-sm w-full text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center"><Lock className="h-5 w-5 text-slate-500" /></div>
                <p className="text-sm text-slate-500">Connectez-vous pour accéder à la finance.</p>
                <Link href="/login" className="block w-full bg-slate-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">Se connecter</Link>
            </div>
        </div>
    );
    const inputClass = "w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition";
    const labelClass = "block text-[13px] font-medium text-slate-700 mb-1.5";
    const convResult = (parseFloat(convAmount) || 0) * (rates[convFrom] || 1);
    const kpis: Array<{ label: string; value: number; tone: 'emerald' | 'rose' | 'slate'; icon: any }> = [
        { label: 'Disponible', value: totals.available, tone: totals.available < 0 ? 'rose' : 'slate', icon: Landmark },
        { label: 'Encaissé', value: totals.inSum, tone: 'emerald', icon: ArrowDownRight },
        { label: 'Charges', value: totals.out, tone: 'rose', icon: ArrowUpRight },
        { label: 'Net', value: totals.inSum - totals.out, tone: (totals.inSum - totals.out) < 0 ? 'rose' : 'slate', icon: BarChart3 },
        { label: 'À recevoir', value: totals.receivable, tone: 'emerald', icon: HandCoins },
        { label: 'À payer', value: totals.payable, tone: 'rose', icon: HandCoins },
    ];
    const kpiText = (t: string) => t === 'emerald' ? 'text-emerald-600' : t === 'rose' ? 'text-rose-600' : 'text-slate-900';
    const kpiIcon = (t: string) => t === 'emerald' ? 'text-emerald-500' : t === 'rose' ? 'text-rose-500' : 'text-slate-400';
    const panelHead = "flex items-center justify-between px-4 py-3 border-b border-slate-100";

    return (
        <div className="min-h-screen font-jakarta">
            <div className="max-w-[110rem] mx-auto px-4 sm:px-6 py-5 pb-28 md:pb-12 space-y-4">

                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">Finance</h1>
                        <p className="text-[13px] text-slate-500">Trésorerie, créances &amp; revenus</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => setShowConvModal(true)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-[13px] font-medium hover:bg-slate-50 transition-colors"><ArrowRightLeft className="h-4 w-4 text-slate-400" /> Convertir</button>
                        {canEdit && (
                            <>
                                <button onClick={() => openMovement('out')} disabled={accounts.length === 0} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-[13px] font-medium hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"><TrendingDown className="h-4 w-4 text-rose-500" /> Sortie</button>
                                <button onClick={() => openMovement('in')} disabled={accounts.length === 0} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-[13px] font-medium hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"><TrendingUp className="h-4 w-4 text-emerald-500" /> Entrée</button>
                            </>
                        )}
                        <button onClick={() => setPrivacy(!privacy)} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${privacy ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{privacy ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                    </div>
                </div>

                {/* Top zone: KPIs (left) + Mes comptes (top-right) */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-3 items-start">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                    {kpis.map((k) => (
                        <div key={k.label} className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[11px] text-slate-500 truncate">{k.label}</p>
                                <k.icon className={`h-3.5 w-3.5 shrink-0 ${kpiIcon(k.tone)}`} />
                            </div>
                            <p className={`text-base sm:text-lg font-semibold tabular-nums mt-1 truncate ${kpiText(k.tone)}`}>{fmtc(k.value)} <span className="text-[10px] font-normal text-slate-400">DT</span></p>
                        </div>
                    ))}
                </div>

                    {/* Comptes (top-right) */}
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                        <div className={panelHead}>
                            <p className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Landmark className="h-4 w-4 text-slate-400" /> Mes comptes</p>
                            {canEdit && <button onClick={openNewAccount} className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-slate-600 hover:bg-slate-100 text-[13px] font-medium transition-colors"><Plus className="h-3.5 w-3.5" /> Ajouter</button>}
                        </div>
                        {accounts.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-slate-400">Aucun compte — ajoutez vos comptes bancaires.</p>
                        ) : (
                            <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
                                {accounts.map((a) => {
                                    const b = perAccount.get(a.id) || { in: 0, out: 0, balance: a.initial_balance };
                                    const foreign = a.currency !== 'TND';
                                    return (
                                        <div key={a.id} className="group flex items-center gap-3 px-3.5 py-2.5">
                                            <div className={`w-8 h-8 rounded-lg ${tone(a.id)} text-white flex items-center justify-center shrink-0`}><Landmark className="h-4 w-4" /></div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[13px] font-medium text-slate-900 truncate">{a.name}{foreign && <span className="text-slate-400 font-normal"> · {a.currency}</span>}</p>
                                                <p className="text-[11px] text-slate-400 truncate">Initial {fmt(a.initial_balance)}{b.out > 0 ? ` · −${fmt(b.out)}` : ''}{b.in > 0 ? ` · +${fmt(b.in)}` : ''}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className={`text-[13px] font-semibold tabular-nums ${b.balance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{fmt(b.balance)} <span className="text-[10px] font-normal text-slate-400">{CUR_SYMBOL[a.currency]}</span></p>
                                                {foreign && <p className="text-[10px] text-slate-400 tabular-nums">≈ {fmt(toTND(b.balance, a.currency))} DT</p>}
                                            </div>
                                            {canEdit && (
                                                <div className="flex items-center gap-0.5 shrink-0 transition-opacity">
                                                    <button onClick={() => openEditAccount(a)} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                                                    <button onClick={() => deleteAccount(a)} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {notReady && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-800">Exécutez les migrations finance dans Supabase pour activer les comptes.</div>
                )}

                {/* Row A — Créances (30%, far left) + Prévision mensuelle (70%) */}
                <div className="grid grid-cols-1 lg:grid-cols-[3fr_7fr] gap-4 items-start">
                    {/* Créances & dettes */}
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                        <div className={panelHead}>
                            <p className="text-sm font-semibold text-slate-900 flex items-center gap-2"><HandCoins className="h-4 w-4 text-slate-400" /> Créances &amp; dettes</p>
                            {canEdit && (
                                <div className="flex items-center gap-1">
                                    <button onClick={() => openNewDebt('receivable')} className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-emerald-700 hover:bg-emerald-50 text-[12px] font-medium transition-colors"><Plus className="h-3.5 w-3.5" /> On me doit</button>
                                    <button onClick={() => openNewDebt('payable')} className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-rose-700 hover:bg-rose-50 text-[12px] font-medium transition-colors"><Plus className="h-3.5 w-3.5" /> Je dois</button>
                                </div>
                            )}
                        </div>
                        {debts.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-slate-400">Aucune créance ni dette</p>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {debts.map((d) => (
                                    <div key={d.id} className={`group flex items-center gap-3 px-3.5 py-2.5 ${d.settled ? 'opacity-50' : ''}`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${d.direction === 'receivable' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{d.direction === 'receivable' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}</div>
                                        <div className="min-w-0 flex-1">
                                            <p className={`text-[13px] font-medium text-slate-900 truncate ${d.settled ? 'line-through' : ''}`}>{d.person}</p>
                                            <p className="text-[11px] text-slate-400 truncate">{d.direction === 'receivable' ? 'On me doit' : 'Je dois'}{d.note ? ` · ${d.note}` : ''}{d.settled ? ' · réglé' : ''}</p>
                                        </div>
                                        <p className={`text-[13px] font-semibold tabular-nums shrink-0 ${d.direction === 'receivable' ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(d.amount)} DT</p>
                                        {canEdit && (d.settled
                                            ? <button onClick={() => toggleDebtSettled(d)} title="Rouvrir (marquer non réglé)" className="shrink-0 inline-flex items-center justify-center h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[12px] font-medium hover:bg-slate-50 transition-colors">Rouvrir</button>
                                            : <button onClick={() => settleDebt(d)} title="Régler (crée le mouvement)" className="shrink-0 inline-flex items-center justify-center h-8 px-2.5 rounded-lg bg-slate-900 text-white text-[12px] font-medium hover:bg-slate-800 transition-colors">Régler</button>
                                        )}
                                        {canEdit && (
                                            <div className="flex items-center gap-0.5 shrink-0 transition-opacity">
                                                {!d.settled && <button onClick={() => toggleDebtSettled(d)} title="Marquer réglé (sans mouvement)" className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"><Check className="h-3.5 w-3.5" /></button>}
                                                <button onClick={() => openEditDebt(d)} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                                                <button onClick={() => deleteDebt(d)} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Revenus récurrents */}
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                        <div className={panelHead}>
                            <p className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Repeat className="h-4 w-4 text-slate-400" /> Prévision mensuelle</p>
                            {canEdit && <button onClick={openNewRecur} className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-slate-600 hover:bg-slate-100 text-[13px] font-medium transition-colors"><Plus className="h-3.5 w-3.5" /> Ajouter</button>}
                        </div>
                        {recurring.length > 0 && (
                            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                                <div className="px-3 py-2.5 text-center min-w-0">
                                    <p className="text-[10px] text-slate-500">Encaissé / mois</p>
                                    <p className="text-[13px] font-semibold text-emerald-600 tabular-nums mt-0.5 truncate">+{fmtc(totals.monthlyIn)}</p>
                                </div>
                                <div className="px-3 py-2.5 text-center min-w-0">
                                    <p className="text-[10px] text-slate-500">Dépensé / mois</p>
                                    <p className="text-[13px] font-semibold text-rose-600 tabular-nums mt-0.5 truncate">−{fmtc(totals.monthlyOut)}</p>
                                </div>
                                <div className="px-3 py-2.5 text-center min-w-0">
                                    <p className="text-[10px] text-slate-500">Net / mois</p>
                                    <p className={`text-[13px] font-semibold tabular-nums mt-0.5 truncate ${(totals.monthlyIn - totals.monthlyOut) < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{(totals.monthlyIn - totals.monthlyOut) >= 0 ? '+' : ''}{fmtc(totals.monthlyIn - totals.monthlyOut)}</p>
                                </div>
                            </div>
                        )}
                        {recurring.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-slate-400">Ajoutez vos revenus (salaire…) et charges mensuelles récurrents</p>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {recurring.map((r) => {
                                    const doneThisMonth = (r.last_applied || '').slice(0, 7) === thisMonthKey();
                                    return (
                                        <div key={r.id} className="group flex items-center gap-3 px-3.5 py-2.5">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${r.direction === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}><Repeat className="h-4 w-4" /></div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[13px] font-medium text-slate-900 truncate">{r.label}</p>
                                                <p className="text-[11px] text-slate-400 truncate">{accountName(r.account_id || '')} · le {r.day_of_month || 1}</p>
                                            </div>
                                            <p className={`text-[13px] font-semibold tabular-nums shrink-0 ${r.direction === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>{r.direction === 'in' ? '+' : '−'}{fmt(r.amount)} {CUR_SYMBOL[r.currency]}</p>
                                            {canEdit && (doneThisMonth
                                                ? <button onClick={() => undoRecur(r)} title="Annuler l'encaissement de ce mois" className="shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-[12px] font-medium hover:bg-emerald-100 transition-colors"><CheckCircle2 className="h-3.5 w-3.5" /> Encaissé</button>
                                                : <button onClick={() => applyRecur(r)} className="shrink-0 inline-flex items-center justify-center h-8 px-2.5 rounded-lg bg-slate-900 text-white text-[12px] font-medium hover:bg-slate-800 transition-colors">Encaisser</button>
                                            )}
                                            {canEdit && (
                                                <div className="flex items-center gap-0.5 shrink-0 transition-opacity">
                                                    <button onClick={() => openEditRecur(r)} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                                                    <button onClick={() => deleteRecur(r)} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Row B — Charges & encaissements + Mouvements */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    {/* Charges & encaissements */}
                    {monthlyCompare.length > 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                            <div className={panelHead}>
                                <p className="text-sm font-semibold text-slate-900 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-slate-400" /> Charges &amp; encaissements</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[420px]">
                                    <thead>
                                        <tr className="text-[11px] text-slate-400 border-b border-slate-100">
                                            <th className="text-left font-medium px-3.5 py-2.5">Mois</th>
                                            <th className="text-right font-medium px-3 py-2.5">Encaissé</th>
                                            <th className="text-right font-medium px-3 py-2.5">Charges</th>
                                            <th className="text-right font-medium px-3.5 py-2.5">Net</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {monthlyCompare.map((row) => (
                                            <tr key={row.key} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-3.5 py-2.5 text-slate-700 capitalize whitespace-nowrap">{row.label}</td>
                                                <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600 font-medium">{fmtc(row.in)}</td>
                                                <td className="px-3 py-2.5 text-right tabular-nums text-rose-600 font-medium">{fmtc(row.out)}</td>
                                                <td className={`px-3.5 py-2.5 text-right tabular-nums font-semibold ${row.net < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{row.net >= 0 ? '+' : ''}{fmtc(row.net)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-slate-200 bg-slate-50 text-[13px]">
                                            <td className="px-3.5 py-2.5 font-semibold text-slate-900">Total</td>
                                            <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-emerald-600">{fmtc(totals.inSum)}</td>
                                            <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-rose-600">{fmtc(totals.out)}</td>
                                            <td className={`px-3.5 py-2.5 text-right tabular-nums font-bold ${(totals.inSum - totals.out) < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{(totals.inSum - totals.out) >= 0 ? '+' : ''}{fmtc(totals.inSum - totals.out)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                    {/* Mouvements */}
                    {movements.length > 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                            <div className={panelHead}>
                                <p className="text-sm font-semibold text-slate-900">Derniers mouvements</p>
                            </div>
                            <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
                                {movements.slice(0, 60).map((m) => {
                                    const sn = supplierName(m.supplier_id);
                                    const cur = accCurrency_(m.account_id);
                                    return (
                                        <div key={m.id} className="group flex items-center gap-3 px-3.5 py-2.5">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.direction === 'out' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{m.direction === 'out' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}</div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[13px] font-medium text-slate-900 truncate">{m.label || (m.direction === 'out' ? 'Paiement' : 'Entrée')}{sn && <span className="text-slate-400 font-normal"> · {sn}</span>}</p>
                                                <p className="text-[11px] text-slate-400 truncate">{accountName(m.account_id)} · {new Date(m.date).toLocaleDateString('fr-FR')}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className={`text-[13px] font-semibold tabular-nums ${m.direction === 'out' ? 'text-rose-600' : 'text-emerald-600'}`}>{m.direction === 'out' ? '−' : '+'}{fmt(m.amount)} {CUR_SYMBOL[cur]}</p>
                                                {cur !== 'TND' && <p className="text-[10px] text-slate-400 tabular-nums">≈ {m.direction === 'out' ? '−' : '+'}{fmt(toTND(m.amount, cur))} DT</p>}
                                            </div>
                                            {canEdit && <button onClick={() => deleteMovement(m)} className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

            </div>

            <Modal open={showAccountModal} onClose={() => setShowAccountModal(false)} title={editingAccount ? 'Modifier le compte' : 'Nouveau compte'} description="Banque, caisse, ou toute source d'argent" size="sm" icon={<div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center"><Landmark className="h-5 w-5" /></div>}
                footer={<><button onClick={() => setShowAccountModal(false)} className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">Annuler</button><button onClick={saveAccount} disabled={saving || !accName.trim()} className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"><CheckCircle2 className="h-4 w-4" /> Enregistrer</button></>}>
                <div className="space-y-4">
                    <div><label className={labelClass}>Nom du compte</label><input type="text" value={accName} onChange={(e) => setAccName(e.target.value)} placeholder="Ex: Compte BIAT" autoFocus className={inputClass} /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelClass}>Solde actuel</label><input type="number" step="0.001" inputMode="decimal" value={accBalance} onChange={(e) => setAccBalance(e.target.value)} placeholder="0.000" className={`${inputClass} tabular-nums`} /></div>
                        <div><label className={labelClass}>Devise</label><select value={accCurrency} onChange={(e) => setAccCurrency(e.target.value as Currency)} className={inputClass}><option value="TND">TND (DT)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option></select></div>
                    </div>
                    {accCurrency !== 'TND' && <p className="text-[11px] text-slate-400">≈ {((parseFloat(accBalance) || 0) * rates[accCurrency]).toLocaleString(undefined, { minimumFractionDigits: 3 })} DT au taux actuel.</p>}
                </div>
            </Modal>

            <Modal open={showMoveModal} onClose={() => { setShowMoveModal(false); setSettlingDebt(null); }} title={settlingDebt ? 'Régler' : (moveDir === 'out' ? 'Nouvelle sortie' : 'Nouvelle entrée')} description={moveDir === 'out' ? "Un paiement qui sort d'un compte" : "De l'argent ajouté à un compte"} size="sm" icon={<div className={`w-10 h-10 rounded-xl flex items-center justify-center ${moveDir === 'out' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{moveDir === 'out' ? <TrendingDown className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}</div>}
                footer={<><button onClick={() => { setShowMoveModal(false); setSettlingDebt(null); }} className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">Annuler</button><button onClick={saveMovement} disabled={saving || !moveAccount || !moveAmount} className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"><CheckCircle2 className="h-4 w-4" /> Enregistrer</button></>}>
                <div className="space-y-4">
                    {!settlingDebt && (
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button onClick={() => setMoveDir('out')} className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${moveDir === 'out' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500'}`}>Sortie</button>
                            <button onClick={() => setMoveDir('in')} className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${moveDir === 'in' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Entrée</button>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelClass}>Montant</label><input type="number" step="0.001" inputMode="decimal" value={moveAmount} onChange={(e) => setMoveAmount(e.target.value)} placeholder="0.000" autoFocus className={`${inputClass} tabular-nums`} /></div>
                        <div><label className={labelClass}>Date</label><input type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} className={inputClass} /></div>
                    </div>
                    <div><label className={labelClass}>Compte</label><select value={moveAccount} onChange={(e) => setMoveAccount(e.target.value)} className={inputClass}>{accounts.map((a) => { const b = perAccount.get(a.id); return <option key={a.id} value={a.id}>{a.name} ({fmt(b?.balance ?? a.initial_balance)} {CUR_SYMBOL[a.currency]})</option>; })}</select></div>
                    {moveDir === 'out' && suppliers.length > 0 && !settlingDebt && (
                        <div><label className={labelClass}>Fournisseur <span className="text-slate-400 font-normal">(optionnel)</span></label><select value={moveSupplier} onChange={(e) => setMoveSupplier(e.target.value)} className={inputClass}><option value="">Aucun</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                    )}
                    <div><label className={labelClass}>Libellé <span className="text-slate-400 font-normal">(optionnel)</span></label><input type="text" value={moveLabel} onChange={(e) => setMoveLabel(e.target.value)} placeholder="Ex: Commande ciment" className={inputClass} /></div>
                </div>
            </Modal>

            <Modal open={showDebtModal} onClose={() => setShowDebtModal(false)} title={editingDebt ? 'Modifier' : (debtDir === 'receivable' ? 'On me doit' : 'Je dois')} description="Suivez qui vous doit de l'argent et à qui vous devez" size="sm" icon={<div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center"><HandCoins className="h-5 w-5" /></div>}
                footer={<><button onClick={() => setShowDebtModal(false)} className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">Annuler</button><button onClick={saveDebt} disabled={saving || !debtPerson.trim()} className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"><CheckCircle2 className="h-4 w-4" /> Enregistrer</button></>}>
                <div className="space-y-4">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setDebtDir('receivable')} className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${debtDir === 'receivable' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>On me doit</button>
                        <button onClick={() => setDebtDir('payable')} className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${debtDir === 'payable' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500'}`}>Je dois</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelClass}>Personne</label><input type="text" value={debtPerson} onChange={(e) => setDebtPerson(e.target.value)} placeholder="Ex: Mohamed" autoFocus className={inputClass} /></div>
                        <div><label className={labelClass}>Montant (DT)</label><input type="number" step="0.001" inputMode="decimal" value={debtAmount} onChange={(e) => setDebtAmount(e.target.value)} placeholder="0.000" className={`${inputClass} tabular-nums`} /></div>
                    </div>
                    <div><label className={labelClass}>Note <span className="text-slate-400 font-normal">(optionnel)</span></label><input type="text" value={debtNote} onChange={(e) => setDebtNote(e.target.value)} placeholder="Ex: prêt de mars" className={inputClass} /></div>
                </div>
            </Modal>

            <Modal open={showRecurModal} onClose={() => setShowRecurModal(false)} title={editingRecur ? 'Modifier' : 'Revenu récurrent'} description="Un salaire ou revenu qui revient chaque mois" size="sm" icon={<div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center"><Repeat className="h-5 w-5" /></div>}
                footer={<><button onClick={() => setShowRecurModal(false)} className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">Annuler</button><button onClick={saveRecur} disabled={saving || !recurLabel.trim() || !recurAccount} className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"><CheckCircle2 className="h-4 w-4" /> Enregistrer</button></>}>
                <div className="space-y-4">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setRecurDir('in')} className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${recurDir === 'in' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Revenu</button>
                        <button onClick={() => setRecurDir('out')} className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${recurDir === 'out' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500'}`}>Charge</button>
                    </div>
                    <div><label className={labelClass}>Libellé</label><input type="text" value={recurLabel} onChange={(e) => setRecurLabel(e.target.value)} placeholder="Ex: Salaire" autoFocus className={inputClass} /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelClass}>Montant</label><input type="number" step="0.001" inputMode="decimal" value={recurAmount} onChange={(e) => setRecurAmount(e.target.value)} placeholder="0.000" className={`${inputClass} tabular-nums`} /></div>
                        <div><label className={labelClass}>Devise</label><select value={recurCurrency} onChange={(e) => setRecurCurrency(e.target.value as Currency)} className={inputClass}><option value="TND">TND</option><option value="USD">USD</option><option value="EUR">EUR</option></select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelClass}>Compte crédité</label><select value={recurAccount} onChange={(e) => setRecurAccount(e.target.value)} className={inputClass}>{accounts.length === 0 && <option value="">— aucun compte —</option>}{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                        <div><label className={labelClass}>Jour du mois</label><input type="number" min="1" max="31" value={recurDay} onChange={(e) => setRecurDay(e.target.value)} className={`${inputClass} tabular-nums`} /></div>
                    </div>
                </div>
            </Modal>

            <Modal open={showConvModal} onClose={() => setShowConvModal(false)} title="Convertisseur" description="USD/EUR ↔ TND au taux actuel" size="sm" icon={<div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center"><ArrowRightLeft className="h-5 w-5" /></div>}>
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <select value={convFrom} onChange={(e) => setConvFrom(e.target.value as Currency)} className="h-11 px-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition shrink-0"><option value="USD">USD $</option><option value="EUR">EUR €</option><option value="TND">TND</option></select>
                        <input type="number" inputMode="decimal" value={convAmount} onChange={(e) => setConvAmount(e.target.value)} placeholder="Montant" autoFocus className="w-full min-w-0 h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 tabular-nums placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition" />
                        <span className="text-slate-400 shrink-0">=</span>
                        <div className="h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center min-w-[104px] justify-end shrink-0"><span className="text-sm font-semibold text-slate-900 tabular-nums">{convResult.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-xs text-slate-400">DT</span></span></div>
                    </div>
                    <button onClick={openRates} className="text-[12px] font-medium text-slate-500 hover:text-slate-900 transition-colors tabular-nums">Taux : 1$={rates.USD} · 1€={rates.EUR} — modifier</button>
                </div>
            </Modal>

            <Modal open={showRatesModal} onClose={() => setShowRatesModal(false)} title="Taux de change" description="Combien de dinars pour 1 unité de devise" size="sm" icon={<div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center"><ArrowRightLeft className="h-5 w-5" /></div>}
                footer={<><button onClick={() => setShowRatesModal(false)} className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">Annuler</button><button onClick={saveRates} className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"><CheckCircle2 className="h-4 w-4" /> Enregistrer</button></>}>
                <div className="space-y-4">
                    <div><label className={labelClass}>1 USD = … DT</label><input type="number" step="0.001" inputMode="decimal" value={tmpUsd} onChange={(e) => setTmpUsd(e.target.value)} placeholder="3.150" className={`${inputClass} tabular-nums`} /></div>
                    <div><label className={labelClass}>1 EUR = … DT</label><input type="number" step="0.001" inputMode="decimal" value={tmpEur} onChange={(e) => setTmpEur(e.target.value)} placeholder="3.400" className={`${inputClass} tabular-nums`} /></div>
                    <p className="text-[11px] text-slate-400">Les taux s'appliquent à tous les comptes en devise et au convertisseur. Modifiez-les quand le cours change.</p>
                </div>
            </Modal>
        </div>
    );
}
