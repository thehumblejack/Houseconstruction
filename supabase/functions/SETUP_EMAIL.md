# Setup Guide: Email Invitations with Supabase Edge Functions

## Prerequisites
- Supabase CLI installed
- Resend account (free tier)

## Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

## Step 2: Link your Supabase project

```bash
supabase link --project-ref ttdhclkguxicjmjytmnp
```

## Step 3: Get Resend API Key

1. Go to https://resend.com/
2. Sign up for a free account
3. Go to API Keys section
4. Create a new API key
5. Copy the key (starts with `re_`)

## Step 4: Set Resend API Key in Supabase

```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
```

## Step 5: Deploy the Edge Function

```bash
supabase functions deploy send-invitation-email
```

## Step 6: Verify Domain in Resend

1. Go to Resend dashboard → Domains
2. Add your domain: `houseconstruction.vercel.app`
3. Follow DNS verification steps
4. OR use Resend's test domain for development

## Step 7: Test the function

After deployment, test by creating an invitation in your app and clicking "Envoyer par Email".

## Troubleshooting

### Function not found
- Make sure you deployed: `supabase functions deploy send-invitation-email`
- Check deployment status in Supabase dashboard → Edge Functions

### Email not sending
- Verify RESEND_API_KEY is set: `supabase secrets list`
- Check Resend dashboard for error logs
- Verify domain is configured in Resend

### CORS errors
- Edge functions automatically handle CORS for your Supabase project

## Alternative: Use Resend's test domain

If you don't want to verify a domain immediately, update the Edge Function:

Change line 21 in `supabase/functions/send-invitation-email/index.ts`:
```typescript
from: 'HouseConstruction <onboarding@resend.dev>',
```

This uses Resend's test domain (can only send to your own email).

## Cost

- Resend Free Tier: 3,000 emails/month
- Supabase Edge Functions: Free tier includes 500K function invocations/month

Both are more than enough for most projects!
