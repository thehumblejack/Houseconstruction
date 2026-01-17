-- Add project_id to order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Sync existing order_items with their parent order's project_id
DO $$
BEGIN
    UPDATE order_items
    SET project_id = o.project_id
    FROM orders o
    WHERE order_items.order_id = o.id AND order_items.project_id IS NULL;
END $$;

-- Ensure all order_items have project_id if order has it
UPDATE order_items
SET project_id = o.project_id
FROM orders o
WHERE order_items.order_id = o.id AND order_items.project_id IS NULL;
