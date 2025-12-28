/*
  # AI Knowledge Base Documents Table

  1. New Tables
    - `ai_knowledge_documents`
      - `id` (uuid, primary key) - Unique document identifier
      - `created_at` (timestamptz) - When document was uploaded
      - `updated_at` (timestamptz) - When document was last modified
      - `created_by` (text) - User ID who uploaded the document
      - `scope` (text) - Either 'global' (all customers) or 'customer' (specific customer)
      - `customer_id` (text, nullable) - Customer ID if scope is 'customer'
      - `title` (text) - Human-readable document title
      - `description` (text, nullable) - Optional description
      - `file_name` (text) - Original filename
      - `file_type` (text) - File extension (pdf, docx, txt, md, csv)
      - `file_size` (integer) - File size in bytes
      - `storage_path` (text) - Path in storage bucket
      - `extracted_text` (text) - Full extracted text content
      - `word_count` (integer) - Number of words in extracted text
      - `category` (text) - Document category for organization
      - `keywords` (text[]) - Searchable keywords
      - `priority` (integer) - Priority 1-10 for context injection order
      - `is_active` (boolean) - Whether document is active

  2. Security
    - Enable RLS on `ai_knowledge_documents` table
    - Admin-only access for all operations
    - Documents are injected into AI context, never directly exposed to customers

  3. Indexes
    - Index on scope + customer_id for efficient lookups
    - Partial index on active documents
*/

CREATE TABLE IF NOT EXISTS ai_knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT NOT NULL,
  
  scope TEXT NOT NULL CHECK (scope IN ('global', 'customer')),
  customer_id TEXT NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'txt', 'md', 'csv')),
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  
  extracted_text TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  
  category TEXT NOT NULL CHECK (category IN (
    'customer_info',
    'product_catalog', 
    'business_rules',
    'data_dictionary',
    'industry_reference',
    'sop',
    'other'
  )),
  
  keywords TEXT[] DEFAULT '{}',
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  is_active BOOLEAN DEFAULT true,
  
  CONSTRAINT customer_scope_check CHECK (
    (scope = 'global' AND customer_id IS NULL) OR
    (scope = 'customer' AND customer_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_kb_scope_customer ON ai_knowledge_documents(scope, customer_id);
CREATE INDEX IF NOT EXISTS idx_kb_active ON ai_knowledge_documents(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_kb_category ON ai_knowledge_documents(category);
CREATE INDEX IF NOT EXISTS idx_kb_priority ON ai_knowledge_documents(priority DESC);

ALTER TABLE ai_knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all knowledge documents"
  ON ai_knowledge_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Admins can insert knowledge documents"
  ON ai_knowledge_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Admins can update knowledge documents"
  ON ai_knowledge_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE POLICY "Admins can delete knowledge documents"
  ON ai_knowledge_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.user_role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION update_kb_document_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kb_document_timestamp
  BEFORE UPDATE ON ai_knowledge_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_kb_document_timestamp();