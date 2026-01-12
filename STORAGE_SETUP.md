# Setup Storage Policies

The error `new row violates row-level security policy` occurs because your new Storage buckets (`invoices` and `documents`) have Row Level Security (RLS) enabled by default, but no policies permitting uploads.

Run the following SQL setup in your **Supabase SQL Editor** to fix this.

```sql
-- 1. Enable RLS on storage.objects (if not already enabled)
alter table storage.objects enable row level security;

-- 2. Create Policy to Allow Public Read Access (View Images)
-- Allows anyone to view files in 'invoices' and 'documents'
create policy "Public Access Invoices"
on storage.objects for select
using ( bucket_id = 'invoices' );

create policy "Public Access Documents"
on storage.objects for select
using ( bucket_id = 'documents' );

-- 3. Create Policy to Allow Authenticated Uploads
-- Allows logged-in users to upload files
create policy "Authenticated Insert Invoices"
on storage.objects for insert
with check ( bucket_id = 'invoices' and auth.role() = 'authenticated' );

create policy "Authenticated Insert Documents"
on storage.objects for insert
with check ( bucket_id = 'documents' and auth.role() = 'authenticated' );

-- OPTIONAL: If you want to allow Public Uploads (Not Recommended for production)
-- create policy "Public Insert Invoices"
-- on storage.objects for insert
-- with check ( bucket_id = 'invoices' );
```

## How to run:
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Click on the **SQL Editor** icon (sidebar).
3. Click "New Query".
4. Paste the SQL above.
5. Click **Run**.
