import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────────────────────
// AI invoice extraction. Receives an invoice image (base64), asks a vision
// model to read it, and returns structured fields the user then verifies.
// Nothing is written to the DB here — extraction only.
//
// Providers (first configured key wins):
//   • GROQ_API_KEY     → Groq (FREE, global incl. Tunisia, no card) — recommended
//   • GEMINI_API_KEY   → Google Gemini (free tier region-restricted)
//   • OPENROUTER_API_KEY → OpenRouter (has free vision models)
//   • ANTHROPIC_API_KEY  → Anthropic (paid)
//
// Also needs: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY.
// ─────────────────────────────────────────────────────────────────────────────

const GROQ_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.6-27b';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.2-11b-vision-instruct:free';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

const EXTRACTION_PROMPT = `Tu es un assistant qui lit des factures et bons de livraison (souvent en français ou en arabe, Tunisie, montants en dinars "DT"). Analyse l'image et extrais les informations.

Réponds UNIQUEMENT avec un objet JSON valide (aucun texte avant/après), avec cette forme exacte:
{
  "supplierName": string | null,
  "invoiceNumber": string | null,
  "date": string | null,
  "total": number | null,
  "status": "paid" | "pending" | null,
  "currency": string | null,
  "items": [
    { "designation": string, "quantity": number, "unit": string, "unitPrice": number, "total": number }
  ]
}

Règles:
- Les nombres sont des nombres purs (point décimal, pas de symbole).
- En Tunisie les milliers utilisent souvent 3 décimales (ex 1.250,500 -> 1250.500).
- Si une valeur est illisible/absente, mets null (ou [] pour items).
- N'invente jamais de valeurs. "status":"paid" seulement si clairement payé/réglé.
- Si l'image n'est pas une facture, renvoie tous les champs à null et items à [].`;

export async function POST(req: NextRequest) {
    // Pick the first configured provider (Groq first — free & global).
    const provider =
        process.env.GROQ_API_KEY ? 'groq' :
        process.env.GEMINI_API_KEY ? 'gemini' :
        process.env.OPENROUTER_API_KEY ? 'openrouter' :
        process.env.ANTHROPIC_API_KEY ? 'anthropic' : null;

    if (!provider) {
        return NextResponse.json({ error: "L'extraction IA n'est pas configurée (aucune clé API)." }, { status: 503 });
    }

    // Auth: require a valid Supabase session.
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    try {
        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
            auth: { persistSession: false },
        });
        const { data, error } = await sb.auth.getUser(token);
        if (error || !data?.user) return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    } catch {
        return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    }

    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 }); }
    const { imageBase64, mediaType } = body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
        return NextResponse.json({ error: 'Image manquante.' }, { status: 400 });
    }
    const mt = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mediaType) ? mediaType : 'image/jpeg';

    try {
        let text = '';
        if (provider === 'groq') text = await callGroq(imageBase64, mt);
        else if (provider === 'gemini') text = await callGemini(imageBase64, mt);
        else if (provider === 'openrouter') text = await callOpenRouter(imageBase64, mt);
        else text = await callAnthropic(imageBase64, mt);

        const parsed = safeParseJson(text);
        if (!parsed) return NextResponse.json({ error: "L'IA n'a pas pu lire la facture.", raw: text }, { status: 422 });

        const items = Array.isArray(parsed.items) ? parsed.items.map((it: any) => ({
            designation: String(it?.designation ?? '').trim(),
            quantity: toNum(it?.quantity) ?? 1,
            unit: String(it?.unit ?? 'u').trim() || 'u',
            unitPrice: toNum(it?.unitPrice) ?? 0,
            total: toNum(it?.total) ?? 0,
        })).filter((it: any) => it.designation) : [];

        return NextResponse.json({
            supplierName: parsed.supplierName ?? null,
            invoiceNumber: parsed.invoiceNumber ?? null,
            date: normalizeDate(parsed.date),
            total: toNum(parsed.total),
            status: parsed.status === 'paid' ? 'paid' : 'pending',
            currency: parsed.currency ?? 'DT',
            items,
        });
    } catch (e: any) {
        console.error('extract-invoice failed:', e);
        return NextResponse.json({ error: e?.message || "Échec de l'analyse." }, { status: 502 });
    }
}

// ── Providers ────────────────────────────────────────────────────────────────

async function callGroq(imageBase64: string, mt: string): Promise<string> {
    const key = process.env.GROQ_API_KEY!;
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({
            model: GROQ_MODEL,
            temperature: 0,
            response_format: { type: 'json_object' },
            // qwen models are reasoning models: disable thinking so the output
            // is pure JSON (thinking tokens break Groq's json_object validation).
            ...(GROQ_MODEL.includes('qwen') ? { reasoning_effort: 'none' } : {}),
            messages: [{ role: 'user', content: [
                { type: 'text', text: EXTRACTION_PROMPT },
                { type: 'image_url', image_url: { url: `data:${mt};base64,${imageBase64}` } },
            ] }],
        }),
    });
    if (!resp.ok) {
        const t = await resp.text();
        console.error('Groq error:', resp.status, t);
        let msg = `IA (Groq) : ${resp.status}`;
        try {
            const j = JSON.parse(t);
            if (j?.error?.message) msg = /rate limit/i.test(j.error.message) ? "Limite gratuite Groq atteinte, réessayez dans un instant." : `IA (Groq) : ${j.error.message}`;
        } catch { /* */ }
        throw new Error(msg);
    }
    const j = await resp.json();
    return j?.choices?.[0]?.message?.content || '';
}

async function callGemini(imageBase64: string, mt: string): Promise<string> {
    const key = process.env.GEMINI_API_KEY!;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [
                { inline_data: { mime_type: mt, data: imageBase64 } },
                { text: EXTRACTION_PROMPT },
            ] }],
            generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        }),
    });
    if (!resp.ok) {
        const t = await resp.text();
        console.error('Gemini error:', resp.status, t);
        throw new Error(geminiFriendlyError(resp.status, t));
    }
    const j = await resp.json();
    return (j?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('\n');
}

async function callOpenRouter(imageBase64: string, mt: string): Promise<string> {
    const key = process.env.OPENROUTER_API_KEY!;
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({
            model: OPENROUTER_MODEL,
            temperature: 0,
            messages: [{ role: 'user', content: [
                { type: 'text', text: EXTRACTION_PROMPT },
                { type: 'image_url', image_url: { url: `data:${mt};base64,${imageBase64}` } },
            ] }],
        }),
    });
    if (!resp.ok) {
        const t = await resp.text();
        console.error('OpenRouter error:', resp.status, t);
        throw new Error(`IA (OpenRouter) : ${resp.status}`);
    }
    const j = await resp.json();
    return j?.choices?.[0]?.message?.content || '';
}

async function callAnthropic(imageBase64: string, mt: string): Promise<string> {
    const key = process.env.ANTHROPIC_API_KEY!;
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
            model: ANTHROPIC_MODEL,
            max_tokens: 2048,
            messages: [{ role: 'user', content: [
                { type: 'image', source: { type: 'base64', media_type: mt, data: imageBase64 } },
                { type: 'text', text: EXTRACTION_PROMPT },
            ] }],
        }),
    });
    if (!resp.ok) {
        const t = await resp.text();
        console.error('Anthropic error:', resp.status, t);
        let msg = `IA (Anthropic) : ${resp.status}`;
        try { const j = JSON.parse(t); if (/credit balance/i.test(j?.error?.message || '')) msg = 'Crédit Anthropic insuffisant.'; } catch { /* */ }
        throw new Error(msg);
    }
    const j = await resp.json();
    return (j?.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n');
}

function geminiFriendlyError(status: number, body: string): string {
    try {
        const j = JSON.parse(body);
        const m = j?.error?.message || '';
        if (status === 429 || /quota|rate/i.test(m)) return "Limite gratuite Gemini atteinte, réessayez dans un instant.";
        if (status === 400 && /API key/i.test(m)) return "Clé Gemini invalide.";
        if (m) return `IA (Gemini) : ${m}`;
    } catch { /* */ }
    return `IA (Gemini) : ${status}`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeParseJson(text: string): any | null {
    if (!text) return null;
    // Reasoning models may prepend <think>…</think> — strip it before parsing.
    const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    try { return JSON.parse(cleaned); } catch { /* */ }
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch { /* */ } }
    return null;
}

function toNum(v: any): number | null {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
        const n = parseFloat(v.replace(/\s/g, '').replace(',', '.'));
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

function normalizeDate(d: any): string | null {
    if (typeof d !== 'string') return null;
    const iso = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const fr = d.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
    if (fr) {
        const yr = fr[3].length === 2 ? `20${fr[3]}` : fr[3];
        return `${yr}-${fr[2].padStart(2, '0')}-${fr[1].padStart(2, '0')}`;
    }
    return null;
}
