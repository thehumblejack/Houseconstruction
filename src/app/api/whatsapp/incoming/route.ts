import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { matchSupplier, extractAmount, cleanDescription } from '@/lib/invoice-inbox';

export const runtime = 'nodejs';

// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp Cloud API webhook — invoice inbox.
// Photo + caption sent to the business number → stored in `pending_factures`
// (status: pending). It NEVER writes to `expenses`; a human approves in-app.
//
// Env: WHATSAPP_VERIFY_TOKEN, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
//      WHATSAPP_ALLOWED_SENDERS (comma-separated E.164),
//      WHATSAPP_APP_SECRET (optional, enables signature validation),
//      NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// ─────────────────────────────────────────────────────────────────────────────

const GRAPH = 'https://graph.facebook.com/v21.0';

const adminDb = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

// Meta webhook verification handshake (done once when you save the webhook URL).
export async function GET(req: NextRequest) {
    const sp = req.nextUrl.searchParams;
    if (sp.get('hub.mode') === 'subscribe' && sp.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN) {
        return new NextResponse(sp.get('hub.challenge') ?? '', { status: 200 });
    }
    return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
    const rawBody = await req.text();

    // Signature validation (active once WHATSAPP_APP_SECRET is set — recommended).
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (appSecret) {
        const sig = req.headers.get('x-hub-signature-256') || '';
        const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
        const a = Buffer.from(sig);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
            return new NextResponse('Bad signature', { status: 403 });
        }
    }

    let body: any;
    try {
        body = JSON.parse(rawBody);
    } catch {
        return new NextResponse('Bad JSON', { status: 400 });
    }

    // Delivery/read receipts etc. have no `messages` — ack and ignore.
    const value = body?.entry?.[0]?.changes?.[0]?.value;
    const msg = value?.messages?.[0];
    if (!msg) return NextResponse.json({ ok: true });

    // Whitelist: only configured senders can create pending invoices.
    const allowed = (process.env.WHATSAPP_ALLOWED_SENDERS || '')
        .split(',')
        .map((s) => s.trim().replace(/^\+/, ''))
        .filter(Boolean);
    const from = String(msg.from || '').replace(/^\+/, '');
    if (allowed.length === 0 || !allowed.includes(from)) {
        console.warn('whatsapp webhook: sender not whitelisted:', from);
        return NextResponse.json({ ok: true });
    }

    const db = adminDb();

    // Idempotency — Meta can deliver the same event twice.
    const { data: dup } = await db.from('pending_factures').select('id').eq('message_sid', msg.id).maybeSingle();
    if (dup) return NextResponse.json({ ok: true });

    // Extract caption + media reference by message type.
    let caption = '';
    let mediaId: string | null = null;
    let mime = 'image/jpeg';
    if (msg.type === 'image') {
        caption = msg.image?.caption || '';
        mediaId = msg.image?.id || null;
        mime = msg.image?.mime_type || 'image/jpeg';
    } else if (msg.type === 'document') {
        caption = msg.document?.caption || msg.document?.filename || '';
        mediaId = msg.document?.id || null;
        mime = msg.document?.mime_type || 'application/pdf';
    } else if (msg.type === 'text') {
        caption = msg.text?.body || '';
    } else {
        return NextResponse.json({ ok: true });
    }

    // Download the media from Meta and keep our own copy in Supabase storage.
    const token = process.env.WHATSAPP_ACCESS_TOKEN || '';
    let imageUrl: string | null = null;
    if (mediaId && token) {
        try {
            const meta = await fetch(`${GRAPH}/${mediaId}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
            if (meta?.url) {
                const bytes = await fetch(meta.url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.arrayBuffer());
                const ext = mime.includes('pdf') ? 'pdf' : mime.includes('png') ? 'png' : 'jpg';
                const path = `whatsapp/${msg.id}.${ext}`;
                let bucket = 'invoices';
                let up = await db.storage.from(bucket).upload(path, Buffer.from(bytes), { contentType: mime, upsert: true });
                if (up.error) {
                    bucket = 'documents';
                    up = await db.storage.from(bucket).upload(path, Buffer.from(bytes), { contentType: mime, upsert: true });
                }
                if (!up.error) imageUrl = db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
                else console.error('whatsapp webhook: storage upload failed:', up.error.message);
            }
        } catch (e) {
            console.error('whatsapp webhook: media download failed:', e);
        }
    }

    // Fuzzy-match the caption against real fournisseurs + extract the montant.
    const { data: sups } = await db.from('suppliers').select('id, name').is('deleted_at', null);
    const { best, confidence, alternatives } = matchSupplier(caption, sups || []);
    const amount = extractAmount(caption);

    const flags: string[] = [];
    if (!best) flags.push('unknown_fournisseur');
    else if (confidence < 0.8) flags.push('low_fournisseur_confidence');
    if (amount == null) flags.push('missing_montant');
    if (mediaId && !imageUrl) flags.push('media_failed');

    const { error: insErr } = await db.from('pending_factures').insert({
        message_sid: msg.id,
        sender: '+' + from,
        raw_caption: caption,
        image_url: imageUrl,
        parsed_supplier_id: best?.id ?? null,
        parsed_supplier_name: best?.name ?? null,
        supplier_confidence: confidence,
        parsed_amount: amount,
        parsed_description: cleanDescription(caption, best?.name, amount),
        alternatives,
        flags,
    });
    if (insErr) console.error('whatsapp webhook: insert failed:', insErr.message);

    // Confirmation echo back in WhatsApp (best-effort; free inside the 24h window).
    try {
        const pid = process.env.WHATSAPP_PHONE_NUMBER_ID;
        if (pid && token && !insErr) {
            await fetch(`${GRAPH}/${pid}/messages`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: from,
                    type: 'text',
                    text: {
                        body: `✅ Reçu — ${best?.name ?? 'fournisseur ?'} · ${amount != null ? `${amount} DT` : 'montant ?'} — en attente de validation dans HouseExpert.`,
                    },
                }),
            });
        }
    } catch { /* non-fatal */ }

    return NextResponse.json({ ok: true });
}


// Parsing helpers live in src/lib/invoice-inbox.ts (shared with the Telegram webhook).
