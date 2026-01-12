-- Create project_settings table for global configuration
CREATE TABLE IF NOT EXISTS project_settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Initialize general_note if not exists
INSERT INTO project_settings (key, value)
VALUES ('general_note', '')
ON CONFLICT (key) DO NOTHING;
