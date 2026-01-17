-- Add project_id to invoice_items
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Sync existing invoice_items with their parent expense's project_id
DO $$
BEGIN
    UPDATE invoice_items
    SET project_id = e.project_id
    FROM expenses e
    WHERE invoice_items.expense_id = e.id;
END $$;
