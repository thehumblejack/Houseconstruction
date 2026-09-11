/**
 * SOURCE DE VÉRITÉ UNIQUE du solde fournisseur.
 *
 * Utilisée par Dépenses (stats par fournisseur + KPIs), Finance (« solde
 * Dépenses » dans le disponible projeté) et Fournisseurs. Toute règle métier
 * sur « payé / reste » vit ICI et nulle part ailleurs, pour que les pages ne
 * puissent jamais diverger.
 *
 * Règles :
 * - Une facture d'un groupe exclu (clé `${supplierId}::${groupName}`) ne compte pas.
 * - « Payé » d'une facture = son TTC si statut 'paid', sinon la somme de ses
 *   versements partiels (plafonnée au TTC).
 * - Payé fournisseur = max(acomptes, factures payées).
 * - Solde (mode crédit)  : acomptes > facturé  → acomptes − factures payées (ce qu'il me reste chez lui)
 *   Solde (mode dette)   : sinon               → payé − facturé            (négatif = je dois encore)
 */

export interface SoldeExpense { id: string; supplier_id: string; price: number; status: string; group_name?: string | null; }
export interface SoldeDeposit { supplier_id: string; amount: number; }
export interface SoldePayment { expense_id: string; amount: number; }
export interface SupplierSolde { billed: number; paid: number; pending: number; remaining: number; }
export interface SoldeResult { bySupplier: Map<string, SupplierSolde>; totalBilled: number; totalPaid: number; totalRemaining: number; }

export const DEFAULT_FX: Record<'TND' | 'USD' | 'EUR', number> = { TND: 1, USD: 3.15, EUR: 3.4 };

export function computeSupplierSolde(args: {
    expenses: SoldeExpense[];
    deposits: SoldeDeposit[];
    payments?: SoldePayment[];
    excludedGroups?: Set<string>;
}): SoldeResult {
    const paidByExpense = new Map<string, number>();
    for (const p of args.payments || []) paidByExpense.set(p.expense_id, (paidByExpense.get(p.expense_id) || 0) + (Number(p.amount) || 0));

    const acc = new Map<string, { billed: number; paidInv: number; pending: number; dep: number }>();
    const bucket = (id: string) => { let a = acc.get(id); if (!a) { a = { billed: 0, paidInv: 0, pending: 0, dep: 0 }; acc.set(id, a); } return a; };

    for (const e of args.expenses) {
        const g = (e.group_name || '').trim();
        if (g && args.excludedGroups?.has(`${e.supplier_id}::${g}`)) continue;
        const a = bucket(e.supplier_id);
        const price = Number(e.price) || 0;
        a.billed += price;
        if (e.status === 'paid') {
            a.paidInv += price;
        } else {
            const partial = paidByExpense.get(e.id) || 0;
            if (partial > 0) a.paidInv += Math.min(partial, price);
            if (e.status === 'pending') a.pending += price;
        }
    }
    for (const d of args.deposits) bucket(d.supplier_id).dep += Number(d.amount) || 0;

    const bySupplier = new Map<string, SupplierSolde>();
    let totalBilled = 0, totalPaid = 0, totalRemaining = 0;
    for (const [id, a] of acc) {
        const paid = Math.max(a.dep, a.paidInv);
        const remaining = a.dep > a.billed ? a.dep - a.paidInv : paid - a.billed;
        bySupplier.set(id, { billed: a.billed, paid, pending: a.pending, remaining });
        totalBilled += a.billed; totalPaid += paid; totalRemaining += remaining;
    }
    return { bySupplier, totalBilled, totalPaid, totalRemaining };
}
