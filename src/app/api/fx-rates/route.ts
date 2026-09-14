import { NextResponse } from 'next/server';

// Taux de change en direct pour la trésorerie : USD→TND et EUR→TND.
// Source : open.er-api.com (gratuit, sans clé, mis à jour chaque jour, TND inclus).
// Récupéré côté serveur (pas de CORS, cache 1h). Toujours fail-soft.

export const revalidate = 3600;

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export async function GET() {
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 3600 } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const usdTnd = Number(data?.rates?.TND);   // TND pour 1 USD
        const eurPerUsd = Number(data?.rates?.EUR); // EUR pour 1 USD
        if (!usdTnd || !eurPerUsd) throw new Error('rates missing');
        const eurTnd = usdTnd / eurPerUsd;          // TND pour 1 EUR
        return NextResponse.json({
            USD: round3(usdTnd),
            EUR: round3(eurTnd),
            updatedAt: data?.time_last_update_utc || new Date().toISOString(),
            source: 'open.er-api.com',
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'unavailable' }, { status: 200 });
    }
}
