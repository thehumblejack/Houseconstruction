-- Add unit_price to order_items to enable expense calculation
alter table order_items add column if not exists unit_price numeric default 0;
