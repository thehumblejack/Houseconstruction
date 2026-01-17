-- Add project_id to project_settings
ALTER TABLE project_settings ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Add project_id to uploaded_documents
ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Add project_id to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Add project_id to invoice_items
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Update existing records to the default project "AFH Maison"
DO $$
DECLARE
    afh_id UUID;
BEGIN
    SELECT id FROM projects WHERE name = 'AFH Maison' LIMIT 1 INTO afh_id;
    
    IF afh_id IS NOT NULL THEN
        UPDATE project_settings SET project_id = afh_id WHERE project_id IS NULL;
        UPDATE uploaded_documents SET project_id = afh_id WHERE project_id IS NULL;
        UPDATE orders SET project_id = afh_id WHERE project_id IS NULL;
        UPDATE invoice_items SET project_id = afh_id WHERE project_id IS NULL;
    END IF;
END $$;

-- Ensure project_id is synced for invoice_items if they were added without it but linked to an expense
DO $$
BEGIN
    UPDATE invoice_items
    SET project_id = e.project_id
    FROM expenses e
    WHERE invoice_items.expense_id = e.id AND invoice_items.project_id IS NULL;
END $$;
