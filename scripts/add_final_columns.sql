-- Add project_id to project_settings (though settings are usually global, 
-- keep it for potential project-specific notes)
ALTER TABLE project_settings ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Add project_id to uploaded_documents
ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Add project_id to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Update existing records to the default project
DO $$
DECLARE
    afh_id UUID;
BEGIN
    SELECT id FROM projects WHERE name = 'AFH Maison' LIMIT 1 INTO afh_id;
    
    UPDATE uploaded_documents SET project_id = afh_id WHERE project_id IS NULL;
    UPDATE orders SET project_id = afh_id WHERE project_id IS NULL;
END $$;
