import { SupabaseClient } from '@supabase/supabase-js';
import {
  KnowledgeDocument,
  CreateDocumentInput,
  UpdateDocumentInput,
  FileType,
  FILE_TYPE_MIME,
} from '../types/knowledgeBase';
import {
  extractTextFromFile as extractText,
  countWords,
  detectFileType,
} from '../utils/documentExtractors';

const BUCKET_NAME = 'knowledge-documents';

function getFileType(file: File): FileType | null {
  const detected = detectFileType(file);
  if (detected) return detected;

  for (const [type, mimes] of Object.entries(FILE_TYPE_MIME)) {
    if (mimes.includes(file.type)) {
      return type as FileType;
    }
  }
  return null;
}

export async function uploadDocument(
  supabase: SupabaseClient,
  input: CreateDocumentInput,
  userId: string
): Promise<KnowledgeDocument> {
  const fileType = getFileType(input.file);
  if (!fileType) {
    throw new Error('Unsupported file type. Please upload PDF, DOCX, TXT, MD, or CSV files.');
  }

  const extractedText = await extractText(input.file);
  const wordCount = countWords(extractedText);

  const timestamp = Date.now();
  const safeName = input.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath =
    input.scope === 'global'
      ? `global/${timestamp}_${safeName}`
      : `customer/${input.customer_id}/${timestamp}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, input.file, {
      contentType: input.file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }

  const documentData = {
    created_by: userId,
    scope: input.scope,
    customer_id: input.scope === 'customer' ? input.customer_id : null,
    title: input.title,
    description: input.description || null,
    file_name: input.file.name,
    file_type: fileType,
    file_size: input.file.size,
    storage_path: storagePath,
    extracted_text: extractedText,
    word_count: wordCount,
    category: input.category,
    keywords: input.keywords || [],
    priority: input.priority || 5,
    is_active: true,
  };

  const { data, error } = await supabase
    .from('ai_knowledge_documents')
    .insert(documentData)
    .select()
    .single();

  if (error) {
    await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    throw new Error(`Failed to save document: ${error.message}`);
  }

  if (data && extractedText) {
    embedDocumentInBackground(
      supabase,
      data.id,
      input.scope === 'customer' ? input.customer_id! : 'global',
      extractedText,
      input.file.name
    );
  }

  return data;
}

async function embedDocumentInBackground(
  supabase: SupabaseClient,
  documentId: string,
  customerId: string,
  text: string,
  fileName: string
): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('embed-document', {
      body: { documentId, customerId, text, fileName }
    });

    if (error) {
      console.error('[KnowledgeBase] Embedding failed:', error);
    } else {
      console.log(`[KnowledgeBase] Embedded ${data.chunksCreated} chunks for: ${fileName}`);
    }
  } catch (err) {
    console.error('[KnowledgeBase] Embedding error:', err);
  }
}

export async function listDocuments(
  supabase: SupabaseClient,
  options?: {
    scope?: 'global' | 'customer';
    customerId?: string;
    category?: string;
    activeOnly?: boolean;
  }
): Promise<KnowledgeDocument[]> {
  let query = supabase
    .from('ai_knowledge_documents')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  if (options?.scope) {
    query = query.eq('scope', options.scope);
  }

  if (options?.customerId) {
    query = query.or(`scope.eq.global,customer_id.eq.${options.customerId}`);
  }

  if (options?.category) {
    query = query.eq('category', options.category);
  }

  if (options?.activeOnly !== false) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list documents: ${error.message}`);
  }

  return data || [];
}

export async function getDocument(
  supabase: SupabaseClient,
  documentId: string
): Promise<KnowledgeDocument | null> {
  const { data, error } = await supabase
    .from('ai_knowledge_documents')
    .select('*')
    .eq('id', documentId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get document: ${error.message}`);
  }

  return data;
}

export async function updateDocument(
  supabase: SupabaseClient,
  documentId: string,
  updates: UpdateDocumentInput
): Promise<KnowledgeDocument> {
  const { data, error } = await supabase
    .from('ai_knowledge_documents')
    .update(updates)
    .eq('id', documentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update document: ${error.message}`);
  }

  return data;
}

export async function deleteDocument(
  supabase: SupabaseClient,
  documentId: string
): Promise<void> {
  const document = await getDocument(supabase, documentId);
  if (!document) {
    throw new Error('Document not found');
  }

  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([document.storage_path]);

  if (storageError) {
    console.warn('Failed to delete file from storage:', storageError);
  }

  const { error } = await supabase
    .from('ai_knowledge_documents')
    .delete()
    .eq('id', documentId);

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }
}

export async function toggleDocumentActive(
  supabase: SupabaseClient,
  documentId: string,
  isActive: boolean
): Promise<KnowledgeDocument> {
  return updateDocument(supabase, documentId, { is_active: isActive });
}

export async function getDocumentsForContext(
  supabase: SupabaseClient,
  customerId?: string
): Promise<KnowledgeDocument[]> {
  let query = supabase
    .from('ai_knowledge_documents')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .order('category')
    .order('created_at', { ascending: false });

  if (customerId) {
    query = query.or(`scope.eq.global,customer_id.eq.${customerId}`);
  } else {
    query = query.eq('scope', 'global');
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to load knowledge documents for context:', error);
    return [];
  }

  return data || [];
}

export function buildKnowledgeContext(documents: KnowledgeDocument[]): string {
  if (documents.length === 0) {
    return '';
  }

  const grouped: Record<string, KnowledgeDocument[]> = {};
  for (const doc of documents) {
    if (!grouped[doc.category]) {
      grouped[doc.category] = [];
    }
    grouped[doc.category].push(doc);
  }

  const categoryLabels: Record<string, string> = {
    customer_info: 'Customer Information',
    product_catalog: 'Product Catalog',
    business_rules: 'Business Rules',
    data_dictionary: 'Data Dictionary',
    industry_reference: 'Industry Reference',
    sop: 'Standard Operating Procedures',
    other: 'Additional Reference',
  };

  let context = '\n\n## KNOWLEDGE BASE CONTEXT\n';
  context +=
    'The following reference documents have been provided to help you understand the business context:\n\n';

  for (const [category, docs] of Object.entries(grouped)) {
    const label = categoryLabels[category] || category;
    context += `### ${label}\n\n`;

    for (const doc of docs) {
      context += `**${doc.title}**`;
      if (doc.description) {
        context += ` - ${doc.description}`;
      }
      context += '\n';

      const textPreview =
        doc.extracted_text.length > 5000
          ? doc.extracted_text.substring(0, 5000) + '\n[... truncated for length ...]'
          : doc.extracted_text;

      context += '```\n' + textPreview + '\n```\n\n';
    }
  }

  context +=
    'Use this knowledge base information to provide more accurate and contextual responses about the business.\n';

  return context;
}

export async function searchDocuments(
  supabase: SupabaseClient,
  searchTerm: string,
  options?: {
    customerId?: string;
    activeOnly?: boolean;
  }
): Promise<KnowledgeDocument[]> {
  const allDocs = await listDocuments(supabase, {
    customerId: options?.customerId,
    activeOnly: options?.activeOnly,
  });

  const lowerSearch = searchTerm.toLowerCase();

  return allDocs.filter((doc) => {
    return (
      doc.title.toLowerCase().includes(lowerSearch) ||
      doc.description?.toLowerCase().includes(lowerSearch) ||
      doc.extracted_text.toLowerCase().includes(lowerSearch) ||
      doc.keywords.some((kw) => kw.toLowerCase().includes(lowerSearch))
    );
  });
}

export async function getKnowledgeDocumentsForCustomer(
  supabase: SupabaseClient,
  customerId: string
): Promise<KnowledgeDocument[]> {
  const { data, error } = await supabase
    .from('ai_knowledge_documents')
    .select('*')
    .eq('is_active', true)
    .or(`scope.eq.global,customer_id.eq.${customerId}`)
    .order('priority', { ascending: false });

  if (error) {
    throw new Error(`Failed to get documents: ${error.message}`);
  }

  return data || [];
}

export async function getAllKnowledgeDocuments(
  supabase: SupabaseClient
): Promise<KnowledgeDocument[]> {
  const { data, error } = await supabase
    .from('ai_knowledge_documents')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get documents: ${error.message}`);
  }

  return data || [];
}

export async function deleteDocumentWithPath(
  supabase: SupabaseClient,
  id: string,
  storagePath: string
): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);

  if (storageError) {
    console.warn('Failed to delete file from storage:', storageError);
  }

  const { error } = await supabase
    .from('ai_knowledge_documents')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }
}

export function formatDocumentsForAI(documents: KnowledgeDocument[]): string {
  if (documents.length === 0) {
    return '';
  }

  const lines: string[] = ['## KNOWLEDGE BASE', ''];

  documents.forEach((doc, index) => {
    lines.push(`### Document ${index + 1}: ${doc.title}`);
    lines.push(`Category: ${doc.category}`);
    if (doc.description) {
      lines.push(`Description: ${doc.description}`);
    }
    lines.push('---');
    lines.push(doc.extracted_text);
    lines.push('---');
    lines.push('');
  });

  return lines.join('\n');
}
