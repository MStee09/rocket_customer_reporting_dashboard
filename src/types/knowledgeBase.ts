export type DocumentScope = 'global' | 'customer';

export type DocumentCategory =
  | 'customer_info'
  | 'product_catalog'
  | 'business_rules'
  | 'data_dictionary'
  | 'industry_reference'
  | 'sop'
  | 'other';

export type FileType = 'pdf' | 'docx' | 'txt' | 'md' | 'csv';

export interface KnowledgeDocument {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  scope: DocumentScope;
  customer_id: string | null;
  title: string;
  description: string | null;
  file_name: string;
  file_type: FileType;
  file_size: number | null;
  storage_path: string;
  extracted_text: string;
  word_count: number;
  category: DocumentCategory;
  keywords: string[];
  priority: number;
  is_active: boolean;
}

export interface CreateDocumentInput {
  scope: DocumentScope;
  customer_id?: string;
  title: string;
  description?: string;
  file: File;
  category: DocumentCategory;
  keywords?: string[];
  priority?: number;
}

export interface UpdateDocumentInput {
  title?: string;
  description?: string;
  category?: DocumentCategory;
  keywords?: string[];
  priority?: number;
  is_active?: boolean;
}

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  customer_info: 'Customer Information',
  product_catalog: 'Product Catalog',
  business_rules: 'Business Rules',
  data_dictionary: 'Data Dictionary',
  industry_reference: 'Industry Reference',
  sop: 'Standard Operating Procedures',
  other: 'Other',
};

export const CATEGORY_DESCRIPTIONS: Record<DocumentCategory, string> = {
  customer_info: 'Company profiles, contacts, special requirements',
  product_catalog: 'Product lists, SKUs, descriptions',
  business_rules: 'Pricing rules, SLAs, policies',
  data_dictionary: 'Field definitions, data mappings',
  industry_reference: 'Industry standards, regulations',
  sop: 'Process documentation, workflows',
  other: 'Miscellaneous documents',
};

export const FILE_TYPE_LABELS: Record<FileType, string> = {
  pdf: 'PDF Document',
  docx: 'Word Document',
  txt: 'Text File',
  md: 'Markdown',
  csv: 'CSV Spreadsheet',
};

export const FILE_TYPE_MIME: Record<FileType, string[]> = {
  pdf: ['application/pdf'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  txt: ['text/plain'],
  md: ['text/markdown', 'text/plain'],
  csv: ['text/csv', 'application/csv'],
};

export const ACCEPTED_FILE_TYPES = Object.values(FILE_TYPE_MIME).flat().join(',');

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
