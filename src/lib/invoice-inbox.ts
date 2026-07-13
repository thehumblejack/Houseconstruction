// Shared parsing helpers for the invoice inbox (WhatsApp + Telegram webhooks).
// Given a free-form caption like "Sotubi ciment 340dt", fuzzy-match the
// fournisseur against the real suppliers list and extract the montant.

export const normalizeText = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

export function matchSupplier(caption: string, suppliers: Array<{ id: string; name: string }>) {
    const cap = normalizeText(caption);
    const scored = suppliers
        .map((s) => {
            const name = normalizeText(s.name);
            if (!name) return { s, score: 0 };
            let score = 0;
            if (cap.includes(name)) score = 0.95;
            else {
                const tokens = name.split(' ').filter((t) => t.length >= 3);
                const capTokens = new Set(cap.split(' '));
                let hits = 0;
                let strongHit = false;
                tokens.forEach((t) => {
                    if (capTokens.has(t)) { hits++; if (t.length >= 5) strongHit = true; }
                    else if ([...capTokens].some((c) => c.length >= 4 && (t.startsWith(c) || c.startsWith(t)))) hits += 0.5;
                });
                if (tokens.length > 0) score = Math.min(0.9, (hits / tokens.length) * (strongHit ? 1 : 0.75));
            }
            return { s, score };
        })
        .filter((x) => x.score > 0.3)
        .sort((a, b) => b.score - a.score);

    const best = scored[0] && scored[0].score >= 0.5 ? scored[0].s : null;
    return {
        best,
        confidence: best ? Math.round(scored[0].score * 100) / 100 : 0,
        alternatives: scored.slice(best ? 1 : 0, 4).map((x) => ({ id: x.s.id, name: x.s.name, score: Math.round(x.score * 100) / 100 })),
    };
}

export function extractAmount(caption: string): number | null {
    if (!caption) return null;
    const text = caption.replace(/ /g, ' ');
    // Prefer a number explicitly followed by dt / dinar(s) / tnd
    const withUnit = text.match(/(\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{1,3})?|\d+(?:[.,]\d{1,3})?)\s*(?:dt|dinars?|tnd)\b/i);
    const raw = withUnit?.[1] ?? (() => {
        // Otherwise, the largest standalone number in the caption
        const all = text.match(/\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{1,3})?|\d+(?:[.,]\d{1,3})?/g) || [];
        const parsedAll = all.map((n) => parseAmount(n)).filter((n): n is number => n != null && n > 0);
        if (parsedAll.length === 0) return null;
        return String(Math.max(...parsedAll));
    })();
    return raw == null ? null : parseAmount(raw);
}

export function parseAmount(raw: string): number | null {
    const cleaned = raw.replace(/ /g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
}

export function cleanDescription(caption: string, supplierName?: string | null, amount?: number | null): string {
    let d = caption || '';
    if (supplierName) d = d.replace(new RegExp(supplierName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
    if (amount != null) d = d.replace(new RegExp(`${String(amount).replace('.', '[.,]')}\\s*(?:dt|dinars?|tnd)?`, 'gi'), '');
    return d.replace(/facture/gi, '').replace(/[|,;#-]+/g, ' ').replace(/\s+/g, ' ').trim();
}
