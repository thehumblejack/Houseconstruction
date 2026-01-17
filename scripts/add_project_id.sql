-- 1. Create Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add project_id column to core tables
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- 3. Create the first project
INSERT INTO projects (name, description) 
SELECT 'AFH Maison', 'Projet initial'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'AFH Maison');

-- 4. Associate existing data (everything created so far) with the first project
DO $$
DECLARE
    afh_id UUID;
BEGIN
    SELECT id FROM projects WHERE name = 'AFH Maison' LIMIT 1 INTO afh_id;
    
    UPDATE suppliers SET project_id = afh_id WHERE project_id IS NULL;
    UPDATE expenses SET project_id = afh_id WHERE project_id IS NULL;
    UPDATE deposits SET project_id = afh_id WHERE project_id IS NULL;
END $$;
