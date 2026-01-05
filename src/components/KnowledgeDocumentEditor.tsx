import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Save,
  AlertCircle,
  Loader2,
  FileText,
  Globe,
  Users,
  Eye,
  Edit3,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  KnowledgeDocument,
  DocumentCategory,
  DocumentScope,
  CATEGORY_LABELS,
} from '../types/knowledgeBase';
import { getDocument } from '../services/knowledgeBaseService';

interface KnowledgeDocumentEditorProps {
  documentId: string | 'new';
  onClose: () => void;
  onSave: () => void;
  customers: Array<{ customer_id: number; company_name: string }>;
  userId: string;
}

export function KnowledgeDocumentEditor({
  documentId,
  onClose,
  onSave,
  customers,
  userId,
}: KnowledgeDocumentEditorProps) {
  const [document, setDocument] = useState<KnowledgeDocument | null>(null);
  const [isLoading, setIsLoading] = useState(documentId !== 'new');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('other');
  const [scope, setScope] = useState<DocumentScope>('global');
  const [customerId, setCustomerId] = useState<string>('');
  const [keywords, setKeywords] = useState('');
  const [priority, setPriority] = useState(5);
  const [isActive, setIsActive] = useState(true);

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    async function fetchDocument() {
      if (documentId === 'new') {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const doc = await getDocument(supabase, documentId);
        if (doc) {
          setDocument(doc);
          setTitle(doc.title);
          setDescription(doc.description || '');
          setContent(doc.extracted_text);
          setCategory(doc.category);
          setScope(doc.scope);
          setCustomerId(doc.customer_id || '');
          setKeywords(doc.keywords.join(', '));
          setPriority(doc.priority);
          setIsActive(doc.is_active);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setIsLoading(false);
      }
    }

    fetchDocument();
  }, [documentId]);

  useEffect(() => {
    if (documentId === 'new') {
      setHasChanges(title.length > 0 || content.length > 0);
      return;
    }

    if (document) {
      const changed =
        content !== document.extracted_text ||
        title !== document.title ||
        description !== (document.description || '') ||
        category !== document.category ||
        scope !== document.scope ||
        customerId !== (document.customer_id || '') ||
        keywords !== document.keywords.join(', ') ||
        priority !== document.priority ||
        isActive !== document.is_active;
      setHasChanges(changed);
    }
  }, [content, title, description, category, scope, customerId, keywords, priority, isActive, document, documentId]);

  const wordCount = content.split(/\s+/).filter(Boolean).length;

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    if (scope === 'customer' && !customerId) {
      setError('Please select a customer');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const keywordArray = keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      let newDocumentId: string;

      if (documentId === 'new') {
        const { data: insertedDoc, error: insertError } = await supabase
          .from('ai_knowledge_documents')
          .insert({
            created_by: userId,
            title: title.trim(),
            description: description.trim() || null,
            extracted_text: content,
            word_count: wordCount,
            category,
            scope,
            customer_id: scope === 'customer' ? customerId : null,
            keywords: keywordArray,
            priority,
            is_active: isActive,
            file_name: `${title.trim().replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}.md`,
            file_type: 'md',
            file_size: new Blob([content]).size,
            storage_path: `manual/${Date.now()}_${title.trim().replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}.md`,
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(insertError.message);
        }

        newDocumentId = insertedDoc.id;
      } else {
        const { error: updateError } = await supabase
          .from('ai_knowledge_documents')
          .update({
            title: title.trim(),
            description: description.trim() || null,
            extracted_text: content,
            word_count: wordCount,
            category,
            scope,
            customer_id: scope === 'customer' ? customerId : null,
            keywords: keywordArray,
            priority,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', documentId);

        if (updateError) {
          throw new Error(updateError.message);
        }

        newDocumentId = documentId;
      }

      if (newDocumentId && content.trim()) {
        supabase.functions.invoke('embed-document', {
          body: {
            documentId: newDocumentId,
            customerId: scope === 'customer' ? customerId : 'global',
            text: content,
            fileName: title.trim()
          }
        }).then(result => {
          if (result.data?.success) {
            console.log(`[KnowledgeDoc] Embedded ${result.data.chunksCreated} chunks for: ${title.trim()}`);
          }
        }).catch(err => {
          console.error('[KnowledgeDoc] Embedding failed:', err);
        });
      }

      setSaveSuccess(true);
      setHasChanges(false);
      setTimeout(() => {
        onSave();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = useCallback(() => {
    if (hasChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
        return;
      }
    }
    onClose();
  }, [hasChanges, onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    const handleSaveShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && !isSaving) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    window.addEventListener('keydown', handleSaveShortcut);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('keydown', handleSaveShortcut);
    };
  }, [handleClose, hasChanges, isSaving]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-rocket-600 animate-spin" />
          <span className="text-gray-600">Loading document...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rocket-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-rocket-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {documentId === 'new' ? 'Create Document' : 'Edit Document'}
              </h2>
              <p className="text-sm text-gray-500">
                Changes are applied to AI immediately after saving
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saveSuccess && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Saved!</span>
              </div>
            )}
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="flex items-center gap-2 px-5 py-2 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          <div className="w-80 border-r border-gray-200 p-5 overflow-y-auto bg-gray-50/50 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
                placeholder="Document title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500 resize-none"
                placeholder="Brief description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Scope
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setScope('global')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
                    scope === 'global'
                      ? 'bg-rocket-50 border-rocket-500 text-rocket-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Global
                </button>
                <button
                  type="button"
                  onClick={() => setScope('customer')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
                    scope === 'customer'
                      ? 'bg-rocket-50 border-rocket-500 text-rocket-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Customer
                </button>
              </div>
            </div>

            {scope === 'customer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Customer <span className="text-red-500">*</span>
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
                >
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.customer_id} value={String(c.customer_id)}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Priority (1-10)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="w-8 text-center text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                  {priority}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Higher priority = loaded first by AI</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Keywords
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
                placeholder="Comma-separated keywords"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-900">Active</p>
                <p className="text-xs text-gray-500">AI can see this document</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isActive ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="pt-4 border-t border-gray-200 space-y-2 text-sm text-gray-500">
              <div className="flex justify-between">
                <span>Words:</span>
                <span className="font-medium text-gray-700">{wordCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Characters:</span>
                <span className="font-medium text-gray-700">{content.length.toLocaleString()}</span>
              </div>
              {document?.file_name && (
                <div className="flex justify-between">
                  <span>File:</span>
                  <span className="font-medium text-gray-700 truncate max-w-[140px]" title={document.file_name}>
                    {document.file_name}
                  </span>
                </div>
              )}
              {document?.created_at && (
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span className="font-medium text-gray-700">
                    {new Date(document.created_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-sm text-gray-600 font-medium">
                Document Content (Markdown supported)
              </span>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-sm transition-colors ${
                  showPreview
                    ? 'bg-rocket-100 text-rocket-700'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {showPreview ? (
                  <>
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Preview
                  </>
                )}
              </button>
            </div>

            {showPreview ? (
              <div className="flex-1 p-6 overflow-y-auto bg-white">
                <div className="prose prose-sm max-w-none">
                  <MarkdownPreview content={content} />
                </div>
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 p-4 font-mono text-sm resize-none focus:outline-none border-0 bg-white"
                placeholder="Enter document content...

Use Markdown formatting:
# Heading 1
## Heading 2
**bold** *italic*
- bullet points
1. numbered lists

The AI reads this content in real-time when generating reports."
                spellCheck={false}
              />
            )}
          </div>
        </div>

        {hasChanges && (
          <div className="px-6 py-2 bg-amber-50 border-t border-amber-200 flex items-center justify-between">
            <span className="text-sm text-amber-800">You have unsaved changes</span>
            <span className="text-xs text-amber-600">Press Cmd/Ctrl+S to save</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const items = listItems.map((item, i) => <li key={i}>{parseInline(item)}</li>);
      if (listType === 'ul') {
        elements.push(<ul key={elements.length} className="list-disc pl-5 my-2">{items}</ul>);
      } else {
        elements.push(<ol key={elements.length} className="list-decimal pl-5 my-2">{items}</ol>);
      }
      listItems = [];
      listType = null;
    }
  };

  const parseInline = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      const italicMatch = remaining.match(/\*(.+?)\*/);
      const codeMatch = remaining.match(/`(.+?)`/);

      const matches = [
        boldMatch ? { type: 'bold', match: boldMatch, index: boldMatch.index! } : null,
        italicMatch ? { type: 'italic', match: italicMatch, index: italicMatch.index! } : null,
        codeMatch ? { type: 'code', match: codeMatch, index: codeMatch.index! } : null,
      ].filter(Boolean).sort((a, b) => a!.index - b!.index);

      if (matches.length === 0) {
        parts.push(remaining);
        break;
      }

      const first = matches[0]!;
      if (first.index > 0) {
        parts.push(remaining.substring(0, first.index));
      }

      if (first.type === 'bold') {
        parts.push(<strong key={key++}>{first.match![1]}</strong>);
      } else if (first.type === 'italic') {
        parts.push(<em key={key++}>{first.match![1]}</em>);
      } else if (first.type === 'code') {
        parts.push(<code key={key++} className="bg-gray-100 px-1 rounded text-sm">{first.match![1]}</code>);
      }

      remaining = remaining.substring(first.index + first.match![0].length);
    }

    return parts.length === 1 ? parts[0] : parts;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/^#{1,6}\s/)) {
      flushList();
      const match = line.match(/^(#{1,6})\s(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        const className = level === 1 ? 'text-2xl font-bold mt-4 mb-2' :
                         level === 2 ? 'text-xl font-bold mt-3 mb-2' :
                         level === 3 ? 'text-lg font-semibold mt-3 mb-1' :
                         'text-base font-semibold mt-2 mb-1';
        elements.push(<div key={i} className={className}>{parseInline(text)}</div>);
      }
    } else if (line.match(/^[-*]\s/)) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      listItems.push(line.replace(/^[-*]\s/, ''));
    } else if (line.match(/^\d+\.\s/)) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      listItems.push(line.replace(/^\d+\.\s/, ''));
    } else if (line.trim() === '') {
      flushList();
      elements.push(<br key={i} />);
    } else {
      flushList();
      elements.push(<p key={i} className="my-1">{parseInline(line)}</p>);
    }
  }

  flushList();

  return <>{elements}</>;
}

export default KnowledgeDocumentEditor;
