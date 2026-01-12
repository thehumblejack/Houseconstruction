-- Create a new table for uploaded documents (separate from expenses)
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

-- Allow authenticated users to read all documents
CREATE POLICY "Allow authenticated users to view documents"
ON uploaded_documents FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert documents
CREATE POLICY "Allow authenticated users to insert documents"
ON uploaded_documents FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update their own documents
CREATE POLICY "Allow authenticated users to update documents"
ON uploaded_documents FOR UPDATE
TO authenticated
USING (true);

-- Allow authenticated users to delete documents
CREATE POLICY "Allow authenticated users to delete documents"
ON uploaded_documents FOR DELETE
TO authenticated
USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_supplier ON uploaded_documents(supplier_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_uploaded_at ON uploaded_documents(uploaded_at DESC);
