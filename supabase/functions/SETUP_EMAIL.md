# Email invitations — Brevo + Supabase Edge Function

The `send-invitation-email` function sends invites through **Brevo** (Sendinblue).
"Edge Function returned a non-2xx status code" almost always means one of two things:
the **API key isn't set**, or the **sender isn't verified** in Brevo.

## 1. Get a Brevo API key
1. Create an account at https://www.brevo.com/
2. Go to **SMTP & API → API Keys → Generate a new API key**
3. Copy the key (starts with `xkeysib-…`)

## 2. Verify a sender (REQUIRED)
Brevo refuses to send from an unverified address.
1. Go to **Senders, Domains & Dedicated IPs → Senders → Add a sender**
2. Add the address you want emails to come from and confirm it via the email Brevo sends.
   (Best: verify your own domain for good deliverability. A Gmail sender works only after it's
   confirmed in Brevo, and may land in spam.)

## 3. Set the secrets on the deployed project
```bash
supabase link --project-ref <your-project-ref>

# Required
supabase secrets set BREVO_API_KEY=xkeysib-xxxxxxxx

# Recommended — use your verified sender (defaults to hamzahadjtaieb@gmail.com / "HouseExpert")
supabase secrets set BREVO_SENDER_EMAIL=invitations@your-verified-domain.com
supabase secrets set BREVO_SENDER_NAME="HouseExpert"

# Verify they are set
supabase secrets list
```

## 4. Deploy the function
```bash
supabase functions deploy send-invitation-email
```

## 5. Test
Create an invitation in the app → **Envoyer par email**. The app now surfaces the real
error (e.g. `Brevo (401): Key not found` or `Brevo (400): sender not valid`) instead of the
generic "non-2xx".

## Troubleshooting by message
- **"Email service not configured"** → `BREVO_API_KEY` secret is missing. Set it (step 3) and redeploy.
- **`Brevo (401): …`** → the API key is wrong/revoked. Generate a new one.
- **`Brevo (400): … sender …`** → `BREVO_SENDER_EMAIL` isn't a verified sender. Verify it (step 2).
- **"Missing required fields"** → no project selected / empty email when sending.
- **Function not found / failed to send a request** → the function isn't deployed (step 4).

## Inspect live logs
```bash
supabase functions logs send-invitation-email
```
The function logs the request, whether the key exists, and the full Brevo response.

## Notes
- The app still works without email: every invite produces a **copy-able link** you can share manually.
- Brevo free tier: ~300 emails/day — plenty for invitations.
