-- Run this in your Supabase SQL Editor to enable Orders functionality

create table if not exists orders (
    id uuid default gen_random_uuid() primary key,
    supplier_id text not null, -- references suppliers(id) logic but kept loose or you can enforce FK
    date text not null,
    status text default 'pending' check (status in ('pending', 'delivered', 'cancelled')),
    notes text,
    created_at timestamptz default now()
);

create table if not exists order_items (
    id uuid default gen_random_uuid() primary key,
    order_id uuid references orders(id) on delete cascade not null,
    article_name text not null,
    quantity numeric not null,
    unit text,
    status text default 'pending',
    created_at timestamptz default now()
);

-- Enable RLS
alter table orders enable row level security;
alter table order_items enable row level security;

-- Policies (Allow all for authenticated users for now, simplify if needed)
create policy "Allow all for auth users" on orders for all to authenticated using (true);
create policy "Allow all for auth users" on order_items for all to authenticated using (true);
