-- Create a new table for uploaded documents if it doesn't exist
CREATE TABLE IF NOT EXISTS uploaded_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    note TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE uploaded_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to ensure we apply the fixed versions
DROP POLICY IF EXISTS "Allow authenticated users to view documents" ON uploaded_documents;
DROP POLICY IF EXISTS "Allow authenticated users to insert documents" ON uploaded_documents;
DROP POLICY IF EXISTS "Allow authenticated users to update documents" ON uploaded_documents;
DROP POLICY IF EXISTS "Allow authenticated users to delete documents" ON uploaded_documents;

-- Allow all authenticated users to read documents
CREATE POLICY "Allow authenticated users to view documents"
ON uploaded_documents FOR SELECT
TO authenticated
USING (true);

-- Allow ONLY ADMIN users to insert documents
-- FIXED: Use user_id instead of id to match auth.uid()
CREATE POLICY "Allow authenticated users to insert documents"
ON uploaded_documents FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'admin'
    )
);

-- Allow ONLY ADMIN users to update documents
-- FIXED: Use user_id instead of id to match auth.uid()
CREATE POLICY "Allow authenticated users to update documents"
ON uploaded_documents FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'admin'
    )
);

-- Allow ONLY ADMIN users to delete documents
-- FIXED: Use user_id instead of id to match auth.uid()
CREATE POLICY "Allow authenticated users to delete documents"
ON uploaded_documents FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'admin'
    )
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_supplier ON uploaded_documents(supplier_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_uploaded_at ON uploaded_documents(uploaded_at DESC);
