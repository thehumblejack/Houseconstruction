-- 1. Create Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    owner_id UUID REFERENCES auth.users(id)
);

-- Ensure description exists if table was already created
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Add project_id columns to all relevant tables
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE project_settings ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- 3. Create Default Project if it doesn't exist
INSERT INTO projects (name) 
SELECT 'AFH Maison'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'AFH Maison');

-- 4. Get the ID of the default project
DO $$
DECLARE
    default_project_id UUID;
BEGIN
    SELECT id INTO default_project_id FROM projects WHERE name = 'AFH Maison' LIMIT 1;
    
    -- 5. Migrate all existing records to the default project
    UPDATE suppliers SET project_id = default_project_id WHERE project_id IS NULL;
    UPDATE expenses SET project_id = default_project_id WHERE project_id IS NULL;
    UPDATE deposits SET project_id = default_project_id WHERE project_id IS NULL;
    UPDATE orders SET project_id = default_project_id WHERE project_id IS NULL;
    UPDATE uploaded_documents SET project_id = default_project_id WHERE project_id IS NULL;
    UPDATE project_settings SET project_id = default_project_id WHERE project_id IS NULL;
    
    -- 6. Sync child items project_id from their parents
    UPDATE order_items 
    SET project_id = o.project_id 
    FROM orders o 
    WHERE order_items.order_id = o.id AND order_items.project_id IS NULL;
    
    UPDATE invoice_items 
    SET project_id = e.project_id 
    FROM expenses e 
    WHERE invoice_items.expense_id = e.id AND invoice_items.project_id IS NULL;
END $$;

-- 7. Add Policies for project-based access (Optional but recommended)
-- Note: You might need to adjust based on your exact needs.
-- For now, we assume authenticated users can see everything.

-- 8. Add index for performance on project_id columns
CREATE INDEX IF NOT EXISTS idx_suppliers_project_id ON suppliers(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_deposits_project_id ON deposits(project_id);
CREATE INDEX IF NOT EXISTS idx_orders_project_id ON orders(project_id);

-- 9. Add unique constraint for project_settings to allow per-project settings (like general_note)
ALTER TABLE project_settings DROP CONSTRAINT IF EXISTS project_settings_project_id_key_key;
ALTER TABLE project_settings ADD CONSTRAINT project_settings_project_id_key_key UNIQUE (project_id, "key");
