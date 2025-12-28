import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Upload,
  Search,
  Filter,
  FileText,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  X,
  Globe,
  Users,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileType,
  FilePlus,
  Brain,
  Lightbulb,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  KnowledgeDocument,
  DocumentCategory,
  DocumentScope,
  CATEGORY_LABELS,
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE,
} from '../types/knowledgeBase';
import {
  listDocuments,
  uploadDocument,
  deleteDocument,
  toggleDocumentActive,
} from '../services/knowledgeBaseService';
import { KnowledgeDocumentEditor } from '../components/KnowledgeDocumentEditor';
import { AIIntelligence } from '../components/knowledge/AIIntelligence';
import { CustomerProfilesTab } from '../components/knowledge-base/CustomerProfilesTab';
import { LearningQueueTab } from '../components/knowledge-base/LearningQueueTab';
import { getNotificationCounts } from '../services/learningNotificationService';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customers: Array<{ customer_id: number; company_name: string }>;
}

function UploadModal({ isOpen, onClose, onSuccess, customers }: UploadModalProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<DocumentScope>('global');
  const [customerId, setCustomerId] = useState<string>('');
  const [category, setCategory] = useState<DocumentCategory>('other');
  const [keywords, setKeywords] = useState('');
  const [priority, setPriority] = useState(5);
  const [file, setFile] = useState<File | null>(null);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setScope('global');
    setCustomerId('');
    setCategory('other');
    setKeywords('');
    setPriority(5);
    setFile(null);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File size exceeds 10MB limit');
      return;
    }
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'txt', 'md', 'csv'].includes(ext || '')) {
      setError('Unsupported file type. Please upload PDF, DOCX, TXT, MD, or CSV files.');
      return;
    }
    setFile(selectedFile);
    if (!title) {
      setTitle(selectedFile.name.replace(/\.[^.]+$/, ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;

    setIsUploading(true);
    setError(null);

    try {
      await uploadDocument(
        supabase,
        {
          scope,
          customer_id: scope === 'customer' ? customerId : undefined,
          title,
          description: description || undefined,
          file,
          category,
          keywords: keywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean),
          priority,
        },
        user.id
      );
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Upload Document</h2>
              <p className="text-sm text-gray-500">Add a new document to the knowledge base</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : file
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileType className="w-8 h-8 text-green-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="ml-4 p-1 text-gray-400 hover:text-red-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  Drag and drop your file here, or{' '}
                  <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
                    browse
                    <input
                      type="file"
                      accept={ACCEPTED_FILE_TYPES}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) validateAndSetFile(f);
                      }}
                      className="hidden"
                    />
                  </label>
                </p>
                <p className="text-sm text-gray-400">
                  PDF, DOCX, TXT, MD, CSV up to 10MB
                </p>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Document title"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description of the document content"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scope *
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setScope('global')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    scope === 'global'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Global
                </button>
                <button
                  type="button"
                  onClick={() => setScope('customer')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    scope === 'customer'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer *
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required={scope === 'customer'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.customer_id} value={String(c.customer_id)}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={scope === 'customer' ? '' : 'col-span-1'}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority (1-10)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value) || 5)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Higher priority = loaded first</p>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Keywords
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Comma-separated keywords for search"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || !title || isUploading || (scope === 'customer' && !customerId)}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Document
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


interface DocumentRowProps {
  document: KnowledgeDocument;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (docId: string) => void;
  customers: Array<{ customer_id: number; company_name: string }>;
}

function DocumentRow({ document, onToggleActive, onDelete, onEdit, customers }: DocumentRowProps) {
  const [showPreview, setShowPreview] = useState(false);
  const customerName =
    document.customer_id
      ? customers.find((c) => String(c.customer_id) === document.customer_id)?.company_name
      : null;

  return (
    <>
      <tr
        className="hover:bg-blue-50/50 cursor-pointer transition-colors"
        onClick={() => onEdit(document.id)}
      >
        <td className="px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-gray-500" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate hover:text-blue-600 transition-colors">{document.title}</p>
              {document.description && (
                <p className="text-sm text-gray-500 truncate">{document.description}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400">{document.file_name}</span>
                <span className="text-xs text-gray-300">|</span>
                <span className="text-xs text-gray-400">
                  {document.word_count.toLocaleString()} words
                </span>
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
              document.scope === 'global'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-teal-100 text-teal-700'
            }`}
          >
            {document.scope === 'global' ? (
              <Globe className="w-3 h-3" />
            ) : (
              <Users className="w-3 h-3" />
            )}
            {document.scope === 'global' ? 'Global' : customerName || 'Customer'}
          </span>
        </td>
        <td className="px-6 py-4">
          <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            {CATEGORY_LABELS[document.category]}
          </span>
        </td>
        <td className="px-6 py-4 text-center">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-medium text-gray-700">
            {document.priority}
          </span>
        </td>
        <td className="px-6 py-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive(document.id, !document.is_active);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              document.is_active
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {document.is_active ? (
              <>
                <CheckCircle className="w-3 h-3" />
                Active
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3" />
                Inactive
              </>
            )}
          </button>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPreview(!showPreview);
              }}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Preview content"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(document.id);
              }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(document.id);
              }}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
      {showPreview && (
        <tr>
          <td colSpan={6} className="px-6 py-4 bg-gray-50">
            <div className="relative">
              <button
                onClick={() => setShowPreview(false)}
                className="absolute top-0 right-0 p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
              <h4 className="font-medium text-gray-900 mb-2">Content Preview</h4>
              <pre className="text-sm text-gray-600 whitespace-pre-wrap bg-white p-4 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                {document.extracted_text.substring(0, 2000)}
                {document.extracted_text.length > 2000 && '\n\n[... content truncated ...]'}
              </pre>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function KnowledgeBasePage() {
  const { user, customers, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'intelligence' | 'documents' | 'profiles' | 'learning'>(() => {
    const tab = searchParams.get('tab');
    if (tab === 'documents') return 'documents';
    if (tab === 'profiles') return 'profiles';
    if (tab === 'learning') return 'learning';
    return 'intelligence';
  });
  const [pendingCount, setPendingCount] = useState(0);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editorDocumentId, setEditorDocumentId] = useState<string | 'new' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'global' | 'customer'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const handleTabChange = (tab: 'intelligence' | 'documents' | 'profiles' | 'learning') => {
    setActiveTab(tab);
    if (tab === 'intelligence') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  const customerList = customers.map((c) => ({
    customer_id: c.customer_id,
    company_name: c.customer_name,
  }));

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const docs = await listDocuments(supabase, { activeOnly: false });
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    async function loadPendingCount() {
      const counts = await getNotificationCounts();
      setPendingCount(counts.pending);
    }
    loadPendingCount();
    const interval = setInterval(loadPendingCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      await toggleDocumentActive(supabase, id, active);
      setDocuments((prev) =>
        prev.map((doc) => (doc.id === id ? { ...doc, is_active: active } : doc))
      );
    } catch (error) {
      console.error('Failed to toggle document:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document? This cannot be undone.')) {
      return;
    }
    try {
      await deleteDocument(supabase, id);
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const handleEdit = (docId: string) => {
    setEditorDocumentId(docId);
  };

  const handleEditorClose = () => {
    setEditorDocumentId(null);
  };

  const handleEditorSave = () => {
    setEditorDocumentId(null);
    loadDocuments();
  };

  const filteredDocuments = documents.filter((doc) => {
    if (!showInactive && !doc.is_active) return false;
    if (scopeFilter !== 'all' && doc.scope !== scopeFilter) return false;
    if (categoryFilter !== 'all' && doc.category !== categoryFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        doc.title.toLowerCase().includes(search) ||
        doc.description?.toLowerCase().includes(search) ||
        doc.file_name.toLowerCase().includes(search) ||
        doc.keywords.some((k) => k.toLowerCase().includes(search))
      );
    }
    return true;
  });

  const stats = {
    total: documents.length,
    totalWords: documents.reduce((sum, d) => sum + d.word_count, 0),
    global: documents.filter((d) => d.scope === 'global').length,
    customer: documents.filter((d) => d.scope === 'customer').length,
  };

  if (!isAdmin()) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500">Only administrators can access the Knowledge Base.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Knowledge Base</h1>
          <p className="text-gray-500">
            Manage documents and terminology the AI uses to understand your business
          </p>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => handleTabChange('intelligence')}
          className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'intelligence'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Brain className="w-4 h-4" />
          Intelligence
        </button>
        <button
          onClick={() => handleTabChange('documents')}
          className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'documents'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Documents
        </button>
        <button
          onClick={() => handleTabChange('profiles')}
          className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'profiles'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Customer Profiles
        </button>
        <button
          onClick={() => handleTabChange('learning')}
          className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'learning'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          Learning Queue
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'intelligence' ? (
        <AIIntelligence />
      ) : activeTab === 'profiles' ? (
        <CustomerProfilesTab />
      ) : activeTab === 'learning' ? (
        <LearningQueueTab />
      ) : (
        <>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setEditorDocumentId('new')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FilePlus className="w-4 h-4" />
              Create Document
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload File
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Total Documents</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Global</p>
          <p className="text-2xl font-bold text-blue-600">{stats.global}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Customer-Specific</p>
          <p className="text-2xl font-bold text-teal-600">{stats.customer}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Total Words</p>
          <p className="text-2xl font-bold text-amber-600">{stats.totalWords.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search documents..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                showFilters
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {showFilters && (
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Scope</label>
                <select
                  value={scopeFilter}
                  onChange={(e) => setScopeFilter(e.target.value as any)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Scopes</option>
                  <option value="global">Global Only</option>
                  <option value="customer">Customer Only</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <label className="text-sm text-gray-600 cursor-pointer flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Show inactive
                </label>
              </div>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading documents...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || scopeFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Upload your first document to enhance the AI'}
            </p>
            {!searchTerm && scopeFilter === 'all' && categoryFilter === 'all' && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setEditorDocumentId('new')}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FilePlus className="w-4 h-4" />
                  Create Document
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload File
                </button>
              </div>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scope
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDocuments.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  document={doc}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  customers={customerList}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={loadDocuments}
        customers={customerList}
      />

      {editorDocumentId && user && (
        <KnowledgeDocumentEditor
          documentId={editorDocumentId}
          onClose={handleEditorClose}
          onSave={handleEditorSave}
          customers={customerList}
          userId={user.id}
        />
      )}
        </>
      )}
    </div>
  );
}

export default KnowledgeBasePage;
