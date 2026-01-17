-- Create a join table for Project-Supplier association
CREATE TABLE IF NOT EXISTS project_suppliers (
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    supplier_id TEXT REFERENCES suppliers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (project_id, supplier_id)
);

-- For each existing project, associate it with all suppliers that were previously linked to it
-- or simply link all current projects to all current suppliers if you want a clean start with global list.
-- Given the user wants to "pick" them, we fill it with existing associations first.

INSERT INTO project_suppliers (project_id, supplier_id)
SELECT DISTINCT project_id, id FROM suppliers WHERE project_id IS NOT NULL ON CONFLICT DO NOTHING;

-- If a project has no suppliers yet, let's not add any. They will pick from the global list.

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_project_suppliers_project_id ON project_suppliers(project_id);
