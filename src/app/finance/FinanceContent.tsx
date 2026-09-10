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
import { Responsive, WidthProvider, type Layouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
    Wallet, Plus, Loader2, Lock, Landmark, ArrowDownRight, ArrowUpRight,
    Pencil, Trash2, TrendingDown, TrendingUp, EyeOff, Eye, CheckCircle2,
    ArrowRightLeft, HandCoins, Repeat, Check, BarChart3, ChevronDown, Receipt, LayoutGrid, RotateCcw,
} from 'lucide-react';

type Currency = 'TND' | 'USD' | 'EUR';
interface Account { id: string; name: string; initial_balance: number; sort_order: number; currency: Currency; }
interface Movement { id: string; account_id: string; direction: 'in' | 'out'; amount: number; label: string | null; supplier_id: string | null; date: string; debt_id?: string | null; }
interface Debt { id: string; person: string; amount: number; direction: 'receivable' | 'payable'; note: string | null; settled: boolean; }
interface Recurring { id: string; label: string; account_id: string | null; amount: number; currency: Currency; direction: 'in' | 'out'; day_of_month: number | null; last_applied: string | null; active: boolean; }

const ACCOUNT_TONES = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-600', 'bg-slate-700'];
const CUR_SYMBOL: Record<Currency, string> = { TND: 'DT', USD: '$', EUR: '€' };
const DEFAULT_RATES: Record<Currency, number> = { TND: 1, USD: 3.15, EUR: 3.40 };
const thisMonthKey = () => new Date().toISOString().slice(0, 7);
const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const monthLabel = (k: string) => { const [y, m] = k.split('-'); return `${MONTHS_FR[parseInt(m, 10) - 1] || m} ${y}`; };
const pad2 = (n: number) => String(n).padStart(2, '0');
const localISO = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const dayLabel = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' });
type Period = 'month' | '3m' | 'year' | 'all' | 'custom';
const PERIODS: Array<{ key: Period; label: string }> = [
    { key: 'month', label: 'Ce mois' }, { key: '3m', label: '3 mois' }, { key: 'year', label: 'Année' }, { key: 'all', label: 'Tout' }, { key: 'custom', label: 'Dates' },
];
const ResponsiveGridLayout = WidthProvider(Responsive);
const DEFAULT_LAYOUTS: Layouts = {
    lg: [
        { i: 'hero', x: 0, y: 0, w: 4, h: 9, minW: 3, minH: 6 },
        { i: 'chart', x: 4, y: 0, w: 4, h: 9, minW: 3, minH: 6 },
        { i: 'comptes', x: 8, y: 0, w: 4, h: 9, minW: 3, minH: 5 },
        { i: 'prevision', x: 0, y: 9, w: 6, h: 8, minW: 3, minH: 5 },
        { i: 'creances', x: 6, y: 9, w: 6, h: 8, minW: 3, minH: 5 },
        { i: 'mouvements', x: 0, y: 17, w: 12, h: 12, minW: 4, minH: 6 },
    ],
    md: [
        { i: 'hero', x: 0, y: 0, w: 4, h: 9, minW: 3, minH: 6 },
        { i: 'chart', x: 4, y: 0, w: 4, h: 9, minW: 3, minH: 6 },
        { i: 'comptes', x: 8, y: 0, w: 4, h: 9, minW: 3, minH: 5 },
        { i: 'prevision', x: 0, y: 9, w: 6, h: 8, minW: 3, minH: 5 },
        { i: 'creances', x: 6, y: 9, w: 6, h: 8, minW: 3, minH: 5 },
        { i: 'mouvements', x: 0, y: 17, w: 12, h: 12, minW: 4, minH: 6 },
    ],
    sm: [
        { i: 'hero', x: 0, y: 0, w: 1, h: 11, minH: 6 },
        { i: 'chart', x: 0, y: 11, w: 1, h: 9, minH: 6 },
        { i: 'comptes', x: 0, y: 20, w: 1, h: 8, minH: 5 },
        { i: 'prevision', x: 0, y: 28, w: 1, h: 9, minH: 5 },
        { i: 'creances', x: 0, y: 37, w: 1, h: 8, minH: 5 },
        { i: 'mouvements', x: 0, y: 45, w: 1, h: 12, minH: 6 },
    ],
};
const cloneLayouts = (l: Layouts): Layouts => JSON.parse(JSON.stringify(l));

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
    // Disponible projeté : inclure créances (à recevoir) et dettes (à payer) dans le héro.
    const [includeDebts, setIncludeDebts] = useState(false);
    // Inclure le solde restant côté Dépenses (ce que je dois encore aux fournisseurs).
    const [includeExpenses, setIncludeExpenses] = useState(false);
    const [expRows, setExpRows] = useState<Array<{ supplier_id: string; price: number; status: string; group_name: string | null }>>([]);
    const [depRows, setDepRows] = useState<Array<{ supplier_id: string; amount: number }>>([]);
    const [excludedGroups, setExcludedGroups] = useState<Set<string>>(new Set());
    // Mode édition de la disposition (glisser-déposer + redimensionner).
    const [editing, setEditing] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [gridKey, setGridKey] = useState(0);
    const [layouts, setLayouts] = useState<Layouts>(() => cloneLayouts(DEFAULT_LAYOUTS));
    useEffect(() => {
        setMounted(true);
        try { const raw = localStorage.getItem('he_fin_layouts'); if (raw) { const parsed = JSON.parse(raw); if (parsed && parsed.lg) setLayouts(parsed); } } catch { /* */ }
    }, []);
    const persistLayouts = (all: Layouts) => { setLayouts(all); try { localStorage.setItem('he_fin_layouts', JSON.stringify(all)); } catch { /* */ } };
    const resetLayout = () => { const d = cloneLayouts(DEFAULT_LAYOUTS); setLayouts(d); setGridKey((k) => k + 1); try { localStorage.removeItem('he_fin_layouts'); } catch { /* */ } };
    const [expandedDebt, setExpandedDebt] = useState<string | null>(null);
    useEffect(() => { try { setIncludeDebts(localStorage.getItem('he_fin_include_debts') === '1'); setIncludeExpenses(localStorage.getItem('he_fin_include_expenses') === '1'); } catch { /* */ } }, []);
    const toggleIncludeDebts = () => setIncludeDebts((v) => { try { localStorage.setItem('he_fin_include_debts', v ? '0' : '1'); } catch { /* */ } return !v; });
    const toggleIncludeExpenses = () => setIncludeExpenses((v) => { try { localStorage.setItem('he_fin_include_expenses', v ? '0' : '1'); } catch { /* */ } return !v; });
    // Période active (pilote les stats, les comptes et la liste) — défaut : ce mois.
    const [period, setPeriod] = useState<Period>('month');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [accFilter, setAccFilter] = useState('');

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
            const [movRes, debtRes, recRes, setRes, linkRes, expRes, depRes] = await Promise.all([
                supabase.from('finance_movements').select('*').eq('project_id', currentProject.id).order('date', { ascending: false }).order('created_at', { ascending: false }),
                supabase.from('finance_debts').select('*').eq('project_id', currentProject.id).order('created_at', { ascending: false }),
                supabase.from('finance_recurring').select('*').eq('project_id', currentProject.id).order('created_at', { ascending: false }),
                supabase.from('project_settings').select('key, value').eq('project_id', currentProject.id).in('key', ['fx_rates', 'excluded_groups']),
                supabase.from('project_suppliers').select('supplier_id').eq('project_id', currentProject.id),
                supabase.from('expenses').select('supplier_id, price, status, group_name').eq('project_id', currentProject.id).is('deleted_at', null),
                supabase.from('deposits').select('supplier_id, amount').eq('project_id', currentProject.id).is('deleted_at', null),
            ]);
            setAccounts(((accRes.data || []) as any[]).map((a) => ({ ...a, currency: (a.currency || 'TND') as Currency })));
            setMovements(((movRes.data || []) as any[]).map((m) => ({ ...m, amount: Number(m.amount) || 0 })));
            setDebts(debtRes.error ? [] : ((debtRes.data || []) as any[]).map((d) => ({ ...d, amount: Number(d.amount) || 0 })));
            setRecurring(recRes.error ? [] : ((recRes.data || []) as any[]).map((r) => ({ ...r, amount: Number(r.amount) || 0, currency: (r.currency || 'TND') as Currency })));

            const settingsMap = new Map<string, string>((setRes.data || []).map((r: any) => [String(r.key), String(r.value ?? '')]));
            const fxRaw = settingsMap.get('fx_rates');
            if (fxRaw) { try { const o = JSON.parse(fxRaw); setRates({ TND: 1, USD: Number(o.USD) || DEFAULT_RATES.USD, EUR: Number(o.EUR) || DEFAULT_RATES.EUR }); } catch { /* */ } }
            const exRaw = settingsMap.get('excluded_groups');
            try { const arr = exRaw ? JSON.parse(exRaw) : []; setExcludedGroups(new Set(Array.isArray(arr) ? arr : [])); } catch { setExcludedGroups(new Set()); }
            setExpRows(expRes && !expRes.error ? ((expRes.data || []) as any[]).map((e) => ({ supplier_id: e.supplier_id, price: Number(e.price) || 0, status: e.status || '', group_name: e.group_name || null })) : []);
            setDepRows(depRes && !depRes.error ? ((depRes.data || []) as any[]).map((d) => ({ supplier_id: d.supplier_id, amount: Number(d.amount) || 0 })) : []);

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

    // Versements reliés à chaque dette (paiements partiels), convertis en TND.
    const debtPaid = useMemo(() => {
        const map = new Map<string, { paid: number; count: number }>();
        for (const m of movements) {
            if (!m.debt_id) continue;
            const e = map.get(m.debt_id) || { paid: 0, count: 0 };
            e.paid += toTND(m.amount, accCurrency_(m.account_id)); e.count += 1;
            map.set(m.debt_id, e);
        }
        return map;
    }, [movements, toTND, accCurrency_]);
    // Historique des versements par dette (liste déjà triée date desc)
    const debtMovs = useMemo(() => {
        const map = new Map<string, Movement[]>();
        for (const m of movements) { if (!m.debt_id) continue; const arr = map.get(m.debt_id) || []; arr.push(m); map.set(m.debt_id, arr); }
        return map;
    }, [movements]);
    const debtRemaining = useCallback((d: Debt) => Math.max(0, d.amount - (debtPaid.get(d.id)?.paid || 0)), [debtPaid]);
    // Solde restant côté Dépenses (réplique du « Solde restant » global de la page Dépenses).
    const soldeDepenses = useMemo(() => {
        const bySup = new Map<string, { billed: number; paid: number; dep: number }>();
        for (const e of expRows) {
            if (e.group_name && excludedGroups.has(`${e.supplier_id}::${e.group_name}`)) continue;
            const g = bySup.get(e.supplier_id) || { billed: 0, paid: 0, dep: 0 };
            g.billed += e.price; if (e.status === 'paid') g.paid += e.price;
            bySup.set(e.supplier_id, g);
        }
        for (const d of depRows) { const g = bySup.get(d.supplier_id) || { billed: 0, paid: 0, dep: 0 }; g.dep += d.amount; bySup.set(d.supplier_id, g); }
        let total = 0;
        for (const [, g] of bySup) { const paye = Math.max(g.dep, g.paid); total += g.dep > g.billed ? (g.dep - g.paid) : (paye - g.billed); }
        return total;
    }, [expRows, depRows, excludedGroups]);
    const isSettled = useCallback((d: Debt) => d.settled || debtRemaining(d) <= 0.0005, [debtRemaining]);

    const totals = useMemo(() => {
        let available = 0, out = 0, inSum = 0;
        for (const a of accounts) { const b = perAccount.get(a.id); if (b) available += toTND(b.balance, a.currency); }
        for (const m of movements) {
            const c = accCurrency_(m.account_id);
            if (m.direction === 'out') out += toTND(m.amount, c); else inSum += toTND(m.amount, c);
        }
        const receivable = debts.filter((d) => d.direction === 'receivable' && !isSettled(d)).reduce((s, d) => s + debtRemaining(d), 0);
        const payable = debts.filter((d) => d.direction === 'payable' && !isSettled(d)).reduce((s, d) => s + debtRemaining(d), 0);
        const monthlyIn = recurring.filter((r) => r.active && r.direction === 'in').reduce((s, r) => s + toTND(r.amount, r.currency), 0);
        const monthlyOut = recurring.filter((r) => r.active && r.direction === 'out').reduce((s, r) => s + toTND(r.amount, r.currency), 0);
        return { available, out, inSum, receivable, payable, monthlyIn, monthlyOut };
    }, [accounts, perAccount, movements, debts, recurring, toTND, accCurrency_, isSettled, debtRemaining]);

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

    // Bornes de la période active
    const range = useMemo(() => {
        const today = new Date();
        if (period === 'custom') return { from: customFrom || '0000-01-01', to: customTo || '9999-12-31' };
        if (period === 'all') return { from: '0000-01-01', to: '9999-12-31' };
        if (period === 'month') return { from: localISO(new Date(today.getFullYear(), today.getMonth(), 1)), to: localISO(today) };
        if (period === '3m') return { from: localISO(new Date(today.getFullYear(), today.getMonth() - 2, 1)), to: localISO(today) };
        return { from: `${today.getFullYear()}-01-01`, to: localISO(today) };
    }, [period, customFrom, customTo]);
    const periodLabel = PERIODS.find((x) => x.key === period)?.label || '';

    const periodMovs = useMemo(() => movements.filter((m) => m.date >= range.from && m.date <= range.to), [movements, range]);
    const shownMovs = useMemo(() => accFilter ? periodMovs.filter((m) => m.account_id === accFilter) : periodMovs, [periodMovs, accFilter]);

    const periodTotals = useMemo(() => {
        let inSum = 0, out = 0;
        for (const m of periodMovs) { const t = toTND(m.amount, accCurrency_(m.account_id)); if (m.direction === 'in') inSum += t; else out += t; }
        return { inSum, out, net: inSum - out, count: periodMovs.length };
    }, [periodMovs, toTND, accCurrency_]);

    // Par compte sur la période (en devise du compte)
    const perAccountPeriod = useMemo(() => {
        const map = new Map<string, { in: number; out: number }>();
        for (const a of accounts) map.set(a.id, { in: 0, out: 0 });
        for (const m of periodMovs) { const e = map.get(m.account_id); if (!e) continue; if (m.direction === 'in') e.in += m.amount; else e.out += m.amount; }
        return map;
    }, [accounts, periodMovs]);

    // 6 derniers mois (mois vides inclus) pour le graphique
    const series6 = useMemo(() => {
        const today = new Date();
        const rows: Array<{ key: string; short: string; in: number; out: number }> = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
            const f = monthlyCompare.find((r) => r.key === key);
            rows.push({ key, short: MONTHS_FR[d.getMonth()].slice(0, 4), in: f?.in || 0, out: f?.out || 0 });
        }
        return rows;
    }, [monthlyCompare]);
    const seriesMax = Math.max(1, ...series6.flatMap((x) => [x.in, x.out]));

    // Répartition du disponible par compte (TND)
    const accountShares = useMemo(() => {
        const rows = accounts.map((a) => { const b = perAccount.get(a.id); return { id: a.id, name: a.name, tnd: toTND(b?.balance ?? a.initial_balance, a.currency) }; });
        const total = rows.reduce((acc, r) => acc + Math.max(0, r.tnd), 0) || 1;
        return rows.map((r) => ({ ...r, pct: (Math.max(0, r.tnd) / total) * 100 }));
    }, [accounts, perAccount, toTND]);

    // Mouvements groupés par jour (liste déjà triée date desc)
    const movsByDay = useMemo(() => {
        const groups: Array<{ date: string; items: Movement[] }> = [];
        for (const m of shownMovs) { const g = groups[groups.length - 1]; if (g && g.date === m.date) g.items.push(m); else groups.push({ date: m.date, items: [m] }); }
        return groups;
    }, [shownMovs]);

    const supplierName = useCallback((id: string | null) => id ? (suppliers.find((s) => s.id === id)?.name || '') : '', [suppliers]);
    const accountName = useCallback((id: string) => accounts.find((a) => a.id === id)?.name || '—', [accounts]);
    const tone = (id: string) => { const i = accounts.findIndex((a) => a.id === id); return i < 0 ? 'bg-slate-400' : ACCOUNT_TONES[i % ACCOUNT_TONES.length]; };

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
            const base = { project_id: currentProject.id, account_id: moveAccount, direction: moveDir, amount, label: moveLabel.trim() || null, supplier_id: moveSupplier || null, date: moveDate };
            let { error } = await supabase.from('finance_movements').insert(settlingDebt ? { ...base, debt_id: settlingDebt.id } : base);
            if (error && settlingDebt && /debt_id/i.test(error.message)) {
                // Colonne absente (migration non appliquée) : on enregistre sans le lien et on règle intégralement.
                ({ error } = await supabase.from('finance_movements').insert(base));
                if (!error) {
                    await supabase.from('finance_debts').update({ settled: true }).eq('id', settlingDebt.id);
                    alert('Migration « finance_partial_payments » non appliquée : le suivi des versements partiels est désactivé, la dette a été marquée réglée en totalité.');
                }
            } else if (!error && settlingDebt) {
                // Versement partiel : la dette passe « réglée » quand le total des versements couvre le montant.
                const paidTND = (debtPaid.get(settlingDebt.id)?.paid || 0) + toTND(amount, accCurrency_(moveAccount));
                if (paidTND >= settlingDebt.amount - 0.0005) await supabase.from('finance_debts').update({ settled: true }).eq('id', settlingDebt.id);
            }
            if (error) throw error;
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
        openMovement(d.direction === 'receivable' ? 'in' : 'out', { amount: debtRemaining(d), label: d.person, debt: d });
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
    const panelHead = "flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100";
    const iconBtn = "inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors";
    const projShowsDetail = includeDebts || includeExpenses;
    const projected = totals.available + (includeDebts ? totals.receivable - totals.payable : 0) + (includeExpenses ? soldeDepenses : 0);

    return (
        <div className="min-h-screen font-jakarta">
            <div className="max-w-[110rem] mx-auto px-4 sm:px-6 py-5 pb-28 md:pb-12 space-y-4">

                {/* ── Header: title · period · actions ── */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">Finance</h1>
                        <p className="text-[13px] text-slate-500">Trésorerie · {periodLabel.toLowerCase()} · {periodTotals.count} mouvement{periodTotals.count > 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 h-9">
                            {PERIODS.map((x) => (
                                <button key={x.key} onClick={() => setPeriod(x.key)} className={`h-8 px-2.5 rounded-lg text-[12px] font-medium transition-colors ${period === x.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{x.label}</button>
                            ))}
                        </div>
                        <button onClick={() => setShowConvModal(true)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-[13px] font-medium hover:bg-slate-50 transition-colors"><ArrowRightLeft className="h-4 w-4 text-slate-400" /> Convertir</button>
                        {canEdit && (
                            <>
                                <button onClick={() => openMovement('out')} disabled={accounts.length === 0} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-[13px] font-medium hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"><TrendingDown className="h-4 w-4 text-rose-500" /> Sortie</button>
                                <button onClick={() => openMovement('in')} disabled={accounts.length === 0} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-[13px] font-medium hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"><TrendingUp className="h-4 w-4 text-emerald-500" /> Entrée</button>
                            </>
                        )}
                        {editing && <button onClick={resetLayout} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-slate-200 text-slate-600 text-[13px] font-medium hover:bg-slate-50 transition-colors"><RotateCcw className="h-4 w-4" /> Réinitialiser</button>}
                        <button onClick={() => setEditing((e) => !e)} className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[13px] font-medium border transition-colors ${editing ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}><LayoutGrid className="h-4 w-4" /> {editing ? 'Terminer' : 'Disposition'}</button>
                        <button onClick={() => setPrivacy(!privacy)} className={`inline-flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${privacy ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{privacy ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                    </div>
                </div>
                {period === 'custom' && (
                    <div className="flex flex-wrap items-center gap-2 -mt-1">
                        <span className="text-[12px] text-slate-500">Du</span>
                        <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
                        <span className="text-[12px] text-slate-500">au</span>
                        <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
                    </div>
                )}

                {notReady && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-800">Exécutez les migrations finance dans Supabase pour activer les comptes.</div>
                )}

                {/* ── Dashboard : glisser-déposer & redimensionner (bouton « Disposition ») ── */}
                <style>{`
                    .react-grid-item.react-grid-placeholder { background: rgba(148,163,184,0.18); border: 1px dashed rgba(100,116,139,0.5); border-radius: 16px; }
                    .fin-editing .react-grid-item { cursor: grab; }
                    .fin-editing .react-grid-item:active { cursor: grabbing; }
                    .react-grid-item > .react-resizable-handle { z-index: 4; }
                `}</style>
                <div className={editing ? 'fin-editing -mx-2' : '-mx-2'}>
                    {mounted ? (
                        <ResponsiveGridLayout
                            key={gridKey}
                            className="layout"
                            layouts={layouts}
                            breakpoints={{ lg: 1024, md: 768, sm: 0 }}
                            cols={{ lg: 12, md: 12, sm: 1 }}
                            rowHeight={28}
                            margin={[16, 16]}
                            containerPadding={[8, 0]}
                            isDraggable={editing}
                            isResizable={editing}
                            draggableCancel="button, input, select, a, .rgl-no-drag"
                            resizeHandles={['se']}
                            onLayoutChange={(_cur, all) => { if (editing) persistLayouts(all); }}
                        >
                    <div key="hero" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-col h-full">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{projShowsDetail ? 'Disponible projeté' : 'Disponible en banque'}</p>
                                <p className={`text-[28px] sm:text-4xl font-semibold tabular-nums mt-1 leading-none ${(projShowsDetail ? projected : totals.available) < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{fmt(projShowsDetail ? projected : totals.available)} <span className="text-base font-medium text-slate-400">DT</span></p>
                                {projShowsDetail && (
                                    <p className="text-[11px] text-slate-500 mt-1.5 tabular-nums">en banque <span className="font-medium text-slate-900">{fmtc(totals.available)}</span>{includeDebts && <> <span className="text-emerald-600">+{fmtc(totals.receivable)}</span> à recevoir <span className="text-rose-600">−{fmtc(totals.payable)}</span> à payer</>}{includeExpenses && <> <span className={soldeDepenses < 0 ? 'text-rose-600' : 'text-emerald-600'}>{soldeDepenses < 0 ? '−' : '+'}{fmtc(Math.abs(soldeDepenses))}</span> solde Dépenses</>}</p>
                                )}
                            </div>
                            <div className="shrink-0 flex flex-col items-end gap-1.5">
                                <div className={`rounded-xl px-3 py-2 text-right ${periodTotals.net < 0 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                                    <p className="text-[10px] text-slate-500">Net · {periodLabel.toLowerCase()}</p>
                                    <p className={`text-base font-semibold tabular-nums ${periodTotals.net < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{periodTotals.net >= 0 ? '+' : ''}{fmtc(periodTotals.net)} DT</p>
                                </div>
                                <button onClick={toggleIncludeDebts} className={`inline-flex items-center gap-1 h-7 px-2 rounded-lg text-[11px] font-medium border transition-colors ${includeDebts ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}><HandCoins className="h-3 w-3" /> {includeDebts ? 'Créances & dettes incluses' : 'Inclure créances & dettes'}</button>
                                <button onClick={toggleIncludeExpenses} className={`inline-flex items-center gap-1 h-7 px-2 rounded-lg text-[11px] font-medium border transition-colors ${includeExpenses ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}><Receipt className="h-3 w-3" /> {includeExpenses ? 'Solde Dépenses inclus' : 'Inclure solde Dépenses'}</button>
                            </div>
                        </div>

                        {/* répartition par compte */}
                        {accounts.length > 0 && (
                            <div className="mt-4">
                                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
                                    {accountShares.map((a) => a.pct > 0 && <div key={a.id} className={`h-full ${tone(a.id)}`} style={{ width: `${a.pct}%` }} title={`${a.name} · ${fmtc(a.tnd)} DT`} />)}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                                    {accountShares.map((a) => (
                                        <p key={a.id} className="text-[11px] text-slate-500 flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${tone(a.id)}`} /> {a.name} <span className="text-slate-900 font-medium tabular-nums">{fmtc(a.tnd)}</span> <span className="text-slate-400 tabular-nums">{a.pct.toFixed(0)}%</span></p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* stats de la période */}
                        <div className="mt-auto pt-4 grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {[
                                { l: `Encaissé`, v: periodTotals.inSum, c: 'text-emerald-600', sign: '+' },
                                { l: `Charges`, v: periodTotals.out, c: 'text-rose-600', sign: '−' },
                                { l: `Net`, v: periodTotals.net, c: periodTotals.net < 0 ? 'text-rose-600' : 'text-slate-900', sign: periodTotals.net >= 0 ? '+' : '' },
                                { l: 'À recevoir', v: totals.receivable, c: 'text-emerald-600', sign: '' },
                                { l: 'À payer', v: totals.payable, c: 'text-rose-600', sign: '' },
                            ].map((k) => (
                                <div key={k.l} className="rounded-xl bg-slate-50 px-3 py-2 min-w-0">
                                    <p className="text-[10px] text-slate-500 truncate">{k.l}</p>
                                    <p className={`text-[15px] font-semibold tabular-nums truncate ${k.c}`}>{k.sign}{fmtc(k.v)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div key="chart" className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col h-full">
                        <div className={panelHead}>
                            <p className="text-sm font-semibold text-slate-900 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-slate-400" /> Entrées vs sorties <span className="hidden sm:inline text-[11px] font-normal text-slate-400">· 6 derniers mois</span></p>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> Encaissé</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-rose-500" /> Charges</span>
                            </div>
                        </div>
                        <div className="px-3 sm:px-5 pt-4 pb-2 flex-1">
                            <div className="flex items-end gap-2 sm:gap-4 h-44 border-b border-slate-200">
                                {series6.map((m) => (
                                    <div key={m.key} className="flex-1 min-w-0 h-full flex items-end justify-center gap-1 sm:gap-1.5">
                                        <div className="flex flex-col items-center justify-end h-full w-full max-w-[26px]">
                                            {m.in > 0 && <span className="text-[9px] sm:text-[10px] text-emerald-600 tabular-nums mb-0.5">{fmtc(m.in)}</span>}
                                            <div className="w-full rounded-t bg-emerald-500 transition-all" style={{ height: `${(m.in / seriesMax) * 82}%` }} />
                                        </div>
                                        <div className="flex flex-col items-center justify-end h-full w-full max-w-[26px]">
                                            {m.out > 0 && <span className="text-[9px] sm:text-[10px] text-rose-600 tabular-nums mb-0.5">{fmtc(m.out)}</span>}
                                            <div className="w-full rounded-t bg-rose-500 transition-all" style={{ height: `${(m.out / seriesMax) * 82}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-6 gap-2 sm:gap-4 mt-2">
                                {series6.map((m) => {
                                    const net = m.in - m.out;
                                    return (
                                        <div key={m.key} className="text-center min-w-0">
                                            <p className="text-[11px] text-slate-500 capitalize truncate">{m.short}</p>
                                            <p className={`text-[11px] font-semibold tabular-nums truncate ${net === 0 ? 'text-slate-300' : net < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{net === 0 ? '—' : `${net > 0 ? '+' : ''}${fmtc(net)}`}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div key="comptes" className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col h-full">
                        <div className={panelHead}>
                            <p className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Landmark className="h-4 w-4 text-slate-400" /> Mes comptes <span className="text-[11px] font-normal text-slate-400">· {periodLabel.toLowerCase()}</span></p>
                            {canEdit && <button onClick={openNewAccount} className="inline-flex items-center gap-1 h-7 px-2 rounded-lg text-slate-600 hover:bg-slate-100 text-[12px] font-medium transition-colors"><Plus className="h-3.5 w-3.5" /> Ajouter</button>}
                        </div>
                        {accounts.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-slate-400">Aucun compte — ajoutez vos comptes bancaires.</p>
                        ) : (
                            <div className="divide-y divide-slate-100 overflow-y-auto flex-1 min-h-0">
                                {accounts.map((a) => {
                                    const b = perAccount.get(a.id) || { in: 0, out: 0, balance: a.initial_balance };
                                    const pp = perAccountPeriod.get(a.id) || { in: 0, out: 0 };
                                    const tot = pp.in + pp.out;
                                    const foreign = a.currency !== 'TND';
                                    return (
                                        <div key={a.id} className="px-3.5 py-2.5">
                                            <div className="flex items-center gap-2.5">
                                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${tone(a.id)}`} />
                                                <p className="text-[13px] font-medium text-slate-900 truncate flex-1 min-w-0">{a.name}{foreign && <span className="text-slate-400 font-normal"> · {a.currency}</span>}</p>
                                                <div className="text-right shrink-0">
                                                    <p className={`text-[13px] font-semibold tabular-nums ${b.balance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{fmt(b.balance)} <span className="text-[10px] font-normal text-slate-400">{CUR_SYMBOL[a.currency]}</span></p>
                                                    {foreign && <p className="text-[10px] text-slate-400 tabular-nums">≈ {fmtc(toTND(b.balance, a.currency))} DT</p>}
                                                </div>
                                                {canEdit && (
                                                    <div className="flex items-center gap-0.5 shrink-0">
                                                        <button onClick={() => openEditAccount(a)} className={iconBtn}><Pencil className="h-3.5 w-3.5" /></button>
                                                        <button onClick={() => deleteAccount(a)} className={`${iconBtn} hover:bg-rose-50 hover:text-rose-600`}><Trash2 className="h-3.5 w-3.5" /></button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-1.5 pl-5 flex items-center gap-2">
                                                <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden flex">
                                                    {tot > 0 && <div className="h-full bg-emerald-500" style={{ width: `${(pp.in / tot) * 100}%` }} />}
                                                    {tot > 0 && <div className="h-full bg-rose-500" style={{ width: `${(pp.out / tot) * 100}%` }} />}
                                                </div>
                                                <p className="text-[10px] tabular-nums shrink-0">
                                                    {tot > 0
                                                        ? <><span className="text-emerald-600">+{fmtc(pp.in)}</span> <span className="text-slate-300">/</span> <span className="text-rose-600">−{fmtc(pp.out)}</span> <span className="text-slate-400">{CUR_SYMBOL[a.currency]}</span></>
                                                        : <span className="text-slate-400">aucun mouvement</span>}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div key="prevision" className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col h-full">
                        <div className={panelHead}>
                            <p className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Repeat className="h-4 w-4 text-slate-400" /> Prévision mensuelle</p>
                            {canEdit && <button onClick={openNewRecur} className="inline-flex items-center gap-1 h-7 px-2 rounded-lg text-slate-600 hover:bg-slate-100 text-[12px] font-medium transition-colors"><Plus className="h-3.5 w-3.5" /> Ajouter</button>}
                        </div>
                        {recurring.length > 0 && (
                            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                                <div className="px-2 py-2 text-center min-w-0"><p className="text-[10px] text-slate-500">Encaissé</p><p className="text-[13px] font-semibold text-emerald-600 tabular-nums truncate">+{fmtc(totals.monthlyIn)}</p></div>
                                <div className="px-2 py-2 text-center min-w-0"><p className="text-[10px] text-slate-500">Dépensé</p><p className="text-[13px] font-semibold text-rose-600 tabular-nums truncate">−{fmtc(totals.monthlyOut)}</p></div>
                                <div className="px-2 py-2 text-center min-w-0"><p className="text-[10px] text-slate-500">Net / mois</p><p className={`text-[13px] font-semibold tabular-nums truncate ${(totals.monthlyIn - totals.monthlyOut) < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{(totals.monthlyIn - totals.monthlyOut) >= 0 ? '+' : ''}{fmtc(totals.monthlyIn - totals.monthlyOut)}</p></div>
                            </div>
                        )}
                        {recurring.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-slate-400">Ajoutez vos revenus (salaire…) et charges mensuelles récurrents</p>
                        ) : (
                            <div className="divide-y divide-slate-100 overflow-y-auto flex-1 min-h-0">
                                {recurring.map((r) => {
                                    const doneThisMonth = (r.last_applied || '').slice(0, 7) === thisMonthKey();
                                    return (
                                        <div key={r.id} className="flex items-center gap-2.5 px-3.5 py-2">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${r.direction === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}><Repeat className="h-3.5 w-3.5" /></div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[13px] font-medium text-slate-900 truncate">{r.label}</p>
                                                <p className="text-[10px] text-slate-400 truncate">{accountName(r.account_id || '')} · le {r.day_of_month || 1}</p>
                                            </div>
                                            <p className={`text-[12px] font-semibold tabular-nums shrink-0 ${r.direction === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>{r.direction === 'in' ? '+' : '−'}{fmtc(r.amount)} {CUR_SYMBOL[r.currency]}</p>
                                            {canEdit && (doneThisMonth
                                                ? <button onClick={() => undoRecur(r)} title="Annuler l'encaissement de ce mois" className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"><CheckCircle2 className="h-3.5 w-3.5" /></button>
                                                : <button onClick={() => applyRecur(r)} title="Encaisser ce mois" className="shrink-0 inline-flex items-center justify-center h-7 px-2 rounded-lg bg-slate-900 text-white text-[11px] font-medium hover:bg-slate-800 transition-colors">Encaisser</button>
                                            )}
                                            {canEdit && (
                                                <div className="flex items-center shrink-0">
                                                    <button onClick={() => openEditRecur(r)} className={iconBtn}><Pencil className="h-3.5 w-3.5" /></button>
                                                    <button onClick={() => deleteRecur(r)} className={`${iconBtn} hover:bg-rose-50 hover:text-rose-600`}><Trash2 className="h-3.5 w-3.5" /></button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div key="creances" className="rounded-2xl border border-slate-200 bg-white overflow-hidden h-full flex flex-col">
                        <div className={panelHead}>
                            <p className="text-sm font-semibold text-slate-900 flex items-center gap-2"><HandCoins className="h-4 w-4 text-slate-400" /> Créances &amp; dettes</p>
                            {canEdit && (
                                <div className="flex items-center gap-0.5">
                                    <button onClick={() => openNewDebt('receivable')} className="inline-flex items-center gap-1 h-7 px-2 rounded-lg text-emerald-700 hover:bg-emerald-50 text-[11px] font-medium transition-colors"><Plus className="h-3 w-3" /> On me doit</button>
                                    <button onClick={() => openNewDebt('payable')} className="inline-flex items-center gap-1 h-7 px-2 rounded-lg text-rose-700 hover:bg-rose-50 text-[11px] font-medium transition-colors"><Plus className="h-3 w-3" /> Je dois</button>
                                </div>
                            )}
                        </div>
                        {debts.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-slate-400">Aucune créance ni dette</p>
                        ) : (
                            <div className="divide-y divide-slate-100 flex-1 min-h-0 overflow-y-auto">
                                {debts.map((d) => {
                                    const pd = debtPaid.get(d.id);
                                    const rem = debtRemaining(d);
                                    const done = isSettled(d);
                                    const partial = !!pd && pd.paid > 0 && !done;
                                    const pct = d.amount > 0 ? Math.min(100, ((d.amount - rem) / d.amount) * 100) : 100;
                                    const recv = d.direction === 'receivable';
                                    const list = debtMovs.get(d.id) || [];
                                    const open = expandedDebt === d.id;
                                    const byAcc = Array.from(list.reduce((m, x) => m.set(x.account_id, (m.get(x.account_id) || 0) + x.amount), new Map<string, number>()).entries());
                                    return (
                                        <div key={d.id} className={`px-3.5 py-2 ${done ? 'opacity-50' : ''}`}>
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${recv ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{recv ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}</div>
                                                <div className="min-w-0 flex-1 cursor-pointer select-none" onClick={() => setExpandedDebt(open ? null : d.id)} title="Voir les versements">
                                                    <p className={`text-[13px] font-medium text-slate-900 truncate ${done ? 'line-through' : ''}`}>{d.person}</p>
                                                    <p className="text-[10px] text-slate-400 truncate">
                                                        {recv ? 'On me doit' : 'Je dois'}{d.note ? ` · ${d.note}` : ''}
                                                        {pd && pd.paid > 0 ? ` · ${pd.count} versement${pd.count > 1 ? 's' : ''} · ${fmtc(Math.min(pd.paid, d.amount))} / ${fmtc(d.amount)}` : ''}
                                                        {done ? ' · réglé' : ''}
                                                    </p>
                                                </div>
                                                <button onClick={() => setExpandedDebt(open ? null : d.id)} title="Voir les versements" className={`${iconBtn} w-6 h-6`}><ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} /></button>
                                                <div className="text-right shrink-0">
                                                    <p className={`text-[12px] font-semibold tabular-nums ${recv ? 'text-emerald-600' : 'text-rose-600'}`}>{partial ? `reste ${fmtc(rem)}` : fmtc(d.amount)} DT</p>
                                                    {partial && <p className="text-[10px] text-slate-400 tabular-nums">sur {fmtc(d.amount)}</p>}
                                                </div>
                                                {canEdit && (done
                                                    ? (d.settled
                                                        ? <button onClick={() => toggleDebtSettled(d)} title="Rouvrir" className="shrink-0 inline-flex items-center justify-center h-7 px-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-medium hover:bg-slate-50 transition-colors">Rouvrir</button>
                                                        : <span className="shrink-0 inline-flex items-center gap-1 h-7 px-2 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-medium"><CheckCircle2 className="h-3 w-3" /> Payé</span>)
                                                    : <button onClick={() => settleDebt(d)} title="Régler tout ou une partie (crée le mouvement)" className="shrink-0 inline-flex items-center justify-center h-7 px-2 rounded-lg bg-slate-900 text-white text-[11px] font-medium hover:bg-slate-800 transition-colors">Régler</button>
                                                )}
                                                {canEdit && (
                                                    <div className="flex items-center shrink-0">
                                                        {!done && <button onClick={() => toggleDebtSettled(d)} title="Marquer réglé (sans mouvement)" className={iconBtn}><Check className="h-3.5 w-3.5" /></button>}
                                                        <button onClick={() => openEditDebt(d)} className={iconBtn}><Pencil className="h-3.5 w-3.5" /></button>
                                                        <button onClick={() => deleteDebt(d)} className={`${iconBtn} hover:bg-rose-50 hover:text-rose-600`}><Trash2 className="h-3.5 w-3.5" /></button>
                                                    </div>
                                                )}
                                            </div>
                                            {pd && pd.paid > 0 && (
                                                <div className="mt-1.5 ml-[38px] h-1 rounded-full bg-slate-100 overflow-hidden">
                                                    <div className={`h-full ${recv ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }} />
                                                </div>
                                            )}
                                            {open && (
                                                <div className="mt-2 ml-[38px] rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden">
                                                    <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200">
                                                        <div className="px-2.5 py-1.5 min-w-0"><p className="text-[9px] uppercase tracking-wide text-slate-400">Total</p><p className="text-[12px] font-semibold text-slate-900 tabular-nums truncate">{fmtc(d.amount)} DT</p></div>
                                                        <div className="px-2.5 py-1.5 min-w-0"><p className="text-[9px] uppercase tracking-wide text-slate-400">Réglé</p><p className={`text-[12px] font-semibold tabular-nums truncate ${recv ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtc(Math.min(pd?.paid || 0, d.amount))} DT</p></div>
                                                        <div className="px-2.5 py-1.5 min-w-0"><p className="text-[9px] uppercase tracking-wide text-slate-400">Reste</p><p className={`text-[12px] font-semibold tabular-nums truncate ${rem > 0 ? 'text-slate-900' : 'text-emerald-600'}`}>{fmtc(rem)} DT</p></div>
                                                    </div>
                                                    {byAcc.length > 0 && (
                                                        <div className="px-2.5 py-1.5 flex flex-wrap gap-x-3 gap-y-1 border-b border-slate-200">
                                                            {byAcc.map(([accId, amt]) => (
                                                                <span key={accId} className="text-[11px] text-slate-600 flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${tone(accId)}`} />{accountName(accId)} <span className="font-semibold tabular-nums text-slate-900">{fmtc(amt)} {CUR_SYMBOL[accCurrency_(accId)]}</span></span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {list.length === 0 ? (
                                                        <p className="px-2.5 py-2 text-[11px] text-slate-400">Aucun versement — cliquez « Régler » pour en enregistrer un.</p>
                                                    ) : (
                                                        <div className="divide-y divide-slate-200">
                                                            {list.map((m) => {
                                                                const cur = accCurrency_(m.account_id);
                                                                return (
                                                                    <div key={m.id} className="flex items-center gap-2 px-2.5 py-1.5">
                                                                        <p className="text-[11px] text-slate-500 tabular-nums w-[84px] shrink-0 capitalize">{new Date(m.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}</p>
                                                                        <p className="text-[11px] text-slate-700 flex items-center gap-1 flex-1 min-w-0 truncate"><span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tone(m.account_id)}`} />{accountName(m.account_id)}</p>
                                                                        <div className="text-right shrink-0">
                                                                            <p className="text-[12px] font-semibold tabular-nums text-slate-900">{fmt(m.amount)} {CUR_SYMBOL[cur]}</p>
                                                                            {cur !== 'TND' && <p className="text-[9px] text-slate-400 tabular-nums">≈ {fmtc(toTND(m.amount, cur))} DT</p>}
                                                                        </div>
                                                                        {canEdit && <button onClick={() => deleteMovement(m)} title="Supprimer ce versement" className={`${iconBtn} w-6 h-6 hover:bg-rose-50 hover:text-rose-600`}><Trash2 className="h-3 w-3" /></button>}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div key="mouvements" className="rounded-2xl border border-slate-200 bg-white overflow-hidden h-full flex flex-col">
                        <div className={panelHead}>
                            <p className="text-sm font-semibold text-slate-900">Mouvements <span className="text-[11px] font-normal text-slate-400">· {periodLabel.toLowerCase()} · {shownMovs.length}</span></p>
                            {accounts.length > 1 && (
                                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                                    <button onClick={() => setAccFilter('')} className={`h-7 px-2.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${accFilter === '' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Tous</button>
                                    {accounts.map((a) => (
                                        <button key={a.id} onClick={() => setAccFilter(accFilter === a.id ? '' : a.id)} className={`h-7 px-2.5 rounded-lg text-[11px] font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors ${accFilter === a.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}><span className={`w-1.5 h-1.5 rounded-full ${tone(a.id)}`} />{a.name}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {movsByDay.length === 0 ? (
                            <p className="px-4 py-10 text-center text-sm text-slate-400">Aucun mouvement sur cette période{accFilter ? ' pour ce compte' : ''}.</p>
                        ) : (
                            <div className="flex-1 min-h-0 overflow-y-auto">
                                {movsByDay.map((g) => {
                                    const dayNet = g.items.reduce((acc, m) => acc + (m.direction === 'in' ? 1 : -1) * toTND(m.amount, accCurrency_(m.account_id)), 0);
                                    return (
                                        <div key={g.date}>
                                            <div className="flex items-center justify-between px-4 py-1.5 bg-slate-50 border-y border-slate-100 first:border-t-0">
                                                <p className="text-[11px] font-medium text-slate-500 capitalize">{dayLabel(g.date)}</p>
                                                <p className={`text-[11px] font-semibold tabular-nums ${dayNet < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{dayNet >= 0 ? '+' : ''}{fmtc(dayNet)} DT</p>
                                            </div>
                                            {g.items.map((m) => {
                                                const sn = supplierName(m.supplier_id);
                                                const cur = accCurrency_(m.account_id);
                                                return (
                                                    <div key={m.id} className="flex items-center gap-2.5 px-3.5 py-2 border-b border-slate-50 last:border-b-0">
                                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${m.direction === 'out' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{m.direction === 'out' ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}</div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[13px] font-medium text-slate-900 truncate">{m.label || (m.direction === 'out' ? 'Paiement' : 'Entrée')}{sn && <span className="text-slate-400 font-normal"> · {sn}</span>}{m.debt_id && <span className="ml-1.5 inline-flex items-center rounded px-1 py-px text-[9px] font-medium bg-slate-100 text-slate-500 align-middle">versement</span>}</p>
                                                            <p className="text-[10px] text-slate-400 truncate flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${tone(m.account_id)}`} />{accountName(m.account_id)}</p>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className={`text-[13px] font-semibold tabular-nums ${m.direction === 'out' ? 'text-rose-600' : 'text-emerald-600'}`}>{m.direction === 'out' ? '−' : '+'}{fmt(m.amount)} {CUR_SYMBOL[cur]}</p>
                                                            {cur !== 'TND' && <p className="text-[10px] text-slate-400 tabular-nums">≈ {m.direction === 'out' ? '−' : '+'}{fmtc(toTND(m.amount, cur))} DT</p>}
                                                        </div>
                                                        {canEdit && <button onClick={() => deleteMovement(m)} className={`${iconBtn} hover:bg-rose-50 hover:text-rose-600`}><Trash2 className="h-3.5 w-3.5" /></button>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                        </ResponsiveGridLayout>
                    ) : (
                        <div style={{ minHeight: 600 }} />
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

            <Modal open={showMoveModal} onClose={() => { setShowMoveModal(false); setSettlingDebt(null); }} title={settlingDebt ? `Régler · ${settlingDebt.person}` : (moveDir === 'out' ? 'Nouvelle sortie' : 'Nouvelle entrée')} description={moveDir === 'out' ? "Un paiement qui sort d'un compte" : "De l'argent ajouté à un compte"} size="sm" icon={<div className={`w-10 h-10 rounded-xl flex items-center justify-center ${moveDir === 'out' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{moveDir === 'out' ? <TrendingDown className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}</div>}
                footer={<><button onClick={() => { setShowMoveModal(false); setSettlingDebt(null); }} className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">Annuler</button><button onClick={saveMovement} disabled={saving || !moveAccount || !moveAmount} className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"><CheckCircle2 className="h-4 w-4" /> Enregistrer</button></>}>
                <div className="space-y-4">
                    {settlingDebt && (
                        <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-[12px] text-slate-600">
                            Reste à régler : <span className="font-semibold text-slate-900 tabular-nums">{fmtc(debtRemaining(settlingDebt))} DT</span> sur {fmtc(settlingDebt.amount)} — vous pouvez régler une partie seulement, le reste se recalcule.
                        </div>
                    )}
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
