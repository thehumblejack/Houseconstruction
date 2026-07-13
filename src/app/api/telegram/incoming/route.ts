import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { matchSupplier, extractAmount, cleanDescription } from '@/lib/invoice-inbox';

export const runtime = 'nodejs';

// ─────────────────────────────────────────────────────────────────────────────
// Telegram bot webhook — invoice inbox.
// Photo/document + caption sent to the bot → stored in `pending_factures`
// (status: pending). It NEVER writes to `expenses`; a human approves in-app.
//
// Env: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET,
//      TELEGRAM_ALLOWED_USER_IDS (comma-separated numeric Telegram user ids),
//      NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
//
// Wire it once after deploy (Telegram calls this URL for every message):
//   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/telegram/incoming&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
// ─────────────────────────────────────────────────────────────────────────────

const TG = (token: string) => `https://api.telegram.org/bot${token}`;

const adminDb = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

// Sanity check in the browser.
export async function GET() {
    return NextResponse.json({ ok: true, service: 'telegram-invoice-inbox' });
}

export async function POST(req: NextRequest) {
    // Telegram echoes back the secret we set at setWebhook time.
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (secret && req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    let update: any;
    try {
        update = await req.json();
    } catch {
        return new NextResponse('Bad JSON', { status: 400 });
    }

    const msg = update?.message;
    if (!msg) return NextResponse.json({ ok: true }); // edits, channel posts, etc.

    const token = process.env.TELEGRAM_BOT_TOKEN || '';
    const chatId = msg.chat?.id;
    const userId = String(msg.from?.id ?? '');

    // Whitelist by Telegram user id. If not allowed, reply with the id so the
    // owner can whitelist themselves on first contact.
    const allowed = (process.env.TELEGRAM_ALLOWED_USER_IDS || '')
        .split(',').map((s) => s.trim()).filter(Boolean);
    if (!allowed.includes(userId)) {
        if (token && chatId && msg.chat?.type === 'private') {
            await tgSend(token, chatId, `⛔ Non autorisé.\nVotre ID Telegram : ${userId}\nAjoutez-le à TELEGRAM_ALLOWED_USER_IDS pour activer l'envoi de factures.`);
        }
        return NextResponse.json({ ok: true });
    }

    const db = adminDb();

    // Idempotency (Telegram retries on non-200 / slow responses).
    const sid = `tg_${chatId}_${msg.message_id}`;
    const { data: dup } = await db.from('pending_factures').select('id').eq('message_sid', sid).maybeSingle();
    if (dup) return NextResponse.json({ ok: true });

    // Extract caption + file reference.
    let caption = msg.caption || msg.text || '';
    let fileId: string | null = null;
    let mime = 'image/jpeg';
    if (Array.isArray(msg.photo) && msg.photo.length > 0) {
        fileId = msg.photo[msg.photo.length - 1].file_id; // largest size
    } else if (msg.document) {
        fileId = msg.document.file_id;
        mime = msg.document.mime_type || 'application/octet-stream';
        if (!caption) caption = msg.document.file_name || '';
    } else if (!msg.text) {
        return NextResponse.json({ ok: true }); // stickers, voice, etc.
    }

    // Download the file from Telegram and keep our own copy in Supabase storage.
    let imageUrl: string | null = null;
    if (fileId && token) {
        try {
            const info = await fetch(`${TG(token)}/getFile?file_id=${encodeURIComponent(fileId)}`).then((r) => r.json());
            const filePath = info?.result?.file_path;
            if (filePath) {
                const bytes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`).then((r) => r.arrayBuffer());
                const extFromPath = filePath.includes('.') ? filePath.split('.').pop() : null;
                const ext = extFromPath || (mime.includes('pdf') ? 'pdf' : mime.includes('png') ? 'png' : 'jpg');
                const path = `telegram/${sid}.${ext}`;
                let bucket = 'invoices';
                let up = await db.storage.from(bucket).upload(path, Buffer.from(bytes), { contentType: mime, upsert: true });
                if (up.error) {
                    bucket = 'documents';
                    up = await db.storage.from(bucket).upload(path, Buffer.from(bytes), { contentType: mime, upsert: true });
                }
                if (!up.error) imageUrl = db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
                else console.error('telegram webhook: storage upload failed:', up.error.message);
            }
        } catch (e) {
            console.error('telegram webhook: file download failed:', e);
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
    if (fileId && !imageUrl) flags.push('media_failed');

    const senderName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || (msg.from?.username ? '@' + msg.from.username : `tg:${userId}`);
    const { error: insErr } = await db.from('pending_factures').insert({
        message_sid: sid,
        sender: senderName,
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
    if (insErr) console.error('telegram webhook: insert failed:', insErr.message);

    // Confirmation echo (best-effort).
    if (token && chatId && !insErr) {
        await tgSend(token, chatId, `✅ Reçu — ${best?.name ?? 'fournisseur ?'} · ${amount != null ? `${amount} DT` : 'montant ?'} — en attente de validation dans HouseExpert.`);
    }

    return NextResponse.json({ ok: true });
}

async function tgSend(token: string, chatId: number | string, text: string) {
    try {
        await fetch(`${TG(token)}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text }),
        });
    } catch { /* non-fatal */ }
}
