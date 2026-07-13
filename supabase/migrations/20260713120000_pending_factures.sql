-- ============================================================================
-- WhatsApp invoice inbox — staging table
--
-- Photos/captions sent to the WhatsApp business number land here as
-- status='pending'. NOTHING touches the real `expenses` table until a human
-- clicks "Accepter" in the review queue. Additive only; deletes nothing.
--
-- The webhook writes with the service-role key (bypasses RLS). App users:
-- read for any authenticated user, writes only for admins/editors
-- (reuses public.is_editor_somewhere() from the RLS migration).
-- ============================================================================

create table if not exists pending_factures (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending',      -- pending | approved | rejected
  message_sid text unique,                     -- WhatsApp message id (idempotency)
  sender text,                                 -- who sent it (+216…)
  raw_caption text,                            -- exact caption received
  image_url text,                              -- stored copy of the photo/PDF
  parsed_supplier_id text,                     -- best fournisseur match (suppliers.id)
  parsed_supplier_name text,
  supplier_confidence numeric default 0,       -- 0..1 (low => review carefully)
  parsed_amount numeric,                       -- montant extracted from caption
  parsed_description text,
  alternatives jsonb default '[]'::jsonb,      -- other close fournisseur matches
  flags jsonb default '[]'::jsonb,             -- e.g. ["low_fournisseur_confidence"]
  created_at timestamptz default now(),
  reviewed_at timestamptz
);

-- Phase carried from capture (quick-add) into the review queue.
alter table pending_factures add column if not exists phase_id uuid;

alter table pending_factures enable row level security;

drop policy if exists "he_read_pending_factures" on pending_factures;
create policy "he_read_pending_factures" on pending_factures for select to authenticated using (true);
drop policy if exists "he_ins_pending_factures" on pending_factures;
create policy "he_ins_pending_factures" on pending_factures for insert to authenticated with check (public.is_editor_somewhere());
drop policy if exists "he_upd_pending_factures" on pending_factures;
create policy "he_upd_pending_factures" on pending_factures for update to authenticated using (public.is_editor_somewhere()) with check (public.is_editor_somewhere());
drop policy if exists "he_del_pending_factures" on pending_factures;
create policy "he_del_pending_factures" on pending_factures for delete to authenticated using (public.is_editor_somewhere());
