import { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import {
  getGlobalGlossary,
  getAllCustomerGlossaries,
  createGlobalTerm,
  updateGlobalTerm,
  createCustomerTerm,
  updateCustomerTerm,
  deactivateGlobalTerm,
  GlobalGlossaryTerm,
  CustomerGlossaryTerm
} from '../../services/glossaryService';
import { useAuth } from '../../contexts/AuthContext';

export function BusinessGlossaryTab() {
  const { user } = useAuth();
  const [globalTerms, setGlobalTerms] = useState<GlobalGlossaryTerm[]>([]);
  const [customerTerms, setCustomerTerms] = useState<CustomerGlossaryTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTerm, setEditingTerm] = useState<(GlobalGlossaryTerm | CustomerGlossaryTerm | { isNew: boolean }) | null>(null);
  const [editingType, setEditingType] = useState<'global' | 'customer'>('global');
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'global' | 'customer' | 'all'>('all');

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    setLoading(true);
    try {
      const [global, customer] = await Promise.all([
        getGlobalGlossary(),
        getAllCustomerGlossaries(),
      ]);
      setGlobalTerms(global);
      setCustomerTerms(customer);
    } catch (error) {
      console.error('Error fetching glossary:', error);
    }
    setLoading(false);
  };

  const categories = [...new Set([
    ...globalTerms.map(t => t.category),
    ...customerTerms.map(t => t.category),
  ])].filter(Boolean).sort() as string[];

  const filteredGlobal = globalTerms.filter(t =>
    (categoryFilter === 'all' || t.category === categoryFilter) &&
    (t.term.toLowerCase().includes(filter.toLowerCase()) ||
     t.definition.toLowerCase().includes(filter.toLowerCase()) ||
     t.aliases?.some(a => a.toLowerCase().includes(filter.toLowerCase())))
  );

  const filteredCustomer = customerTerms.filter(t =>
    (categoryFilter === 'all' || t.category === categoryFilter) &&
    (t.term.toLowerCase().includes(filter.toLowerCase()) ||
     t.definition.toLowerCase().includes(filter.toLowerCase()))
  );

  const handleEdit = (term: GlobalGlossaryTerm | CustomerGlossaryTerm, type: 'global' | 'customer') => {
    setEditingTerm(term);
    setEditingType(type);
  };

  const handleCreate = (type: 'global' | 'customer') => {
    setEditingTerm({ isNew: true });
    setEditingType(type);
  };

  const handleSave = async (termData: Partial<GlobalGlossaryTerm | CustomerGlossaryTerm>) => {
    try {
      if (editingTerm && 'isNew' in editingTerm) {
        if (editingType === 'global') {
          await createGlobalTerm(termData as Omit<GlobalGlossaryTerm, 'id' | 'created_at' | 'usage_count'>, user?.email || 'admin');
        } else {
          await createCustomerTerm(termData as Omit<CustomerGlossaryTerm, 'id' | 'created_at' | 'usage_count'>, user?.email || 'admin');
        }
      } else if (editingTerm && 'id' in editingTerm) {
        if (editingType === 'global') {
          await updateGlobalTerm(editingTerm.id, termData, user?.email || 'admin');
        } else {
          await updateCustomerTerm(editingTerm.id, termData, user?.email || 'admin');
        }
      }
      setEditingTerm(null);
      fetchTerms();
    } catch (error) {
      console.error('Error saving term:', error);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this term?')) return;
    try {
      await deactivateGlobalTerm(id, user?.email || 'admin', 'Deactivated by user');
      fetchTerms();
    } catch (error) {
      console.error('Error deactivating term:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-medium text-slate-800">Business Glossary</h3>
          <p className="text-sm text-slate-500">
            Industry terms and customer-specific definitions for the AI
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleCreate('global')}
            className="px-4 py-2 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 transition-colors text-sm font-medium"
          >
            + Global Term
          </button>
          <button
            onClick={() => handleCreate('customer')}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
          >
            + Customer Term
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{globalTerms.length}</div>
          <div className="text-sm text-slate-500">Global Terms</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-teal-600">{customerTerms.length}</div>
          <div className="text-sm text-slate-500">Customer Terms</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-amber-600">{categories.length}</div>
          <div className="text-sm text-slate-500">Categories</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {globalTerms.filter(t => t.is_active).length + customerTerms.filter(t => t.is_active).length}
          </div>
          <div className="text-sm text-slate-500">Active</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-slate-600">
            {[...new Set(customerTerms.map(t => t.customer_id))].length}
          </div>
          <div className="text-sm text-slate-500">Customers with Terms</div>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search terms..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 w-64 focus:ring-2 focus:ring-rocket-500 focus:border-blue-500"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rocket-500 focus:border-blue-500"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as 'global' | 'customer' | 'all')}
          className="border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rocket-500 focus:border-blue-500"
        >
          <option value="all">All Terms</option>
          <option value="global">Global Only</option>
          <option value="customer">Customer Only</option>
        </select>
      </div>

      {(viewMode === 'all' || viewMode === 'global') && (
        <div className="mb-8">
          <h4 className="font-medium mb-2 flex items-center gap-2 text-slate-800">
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
            Global Terms ({filteredGlobal.length})
          </h4>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Term</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Definition</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Aliases</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Usage</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGlobal.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No global terms found
                    </td>
                  </tr>
                ) : (
                  filteredGlobal.map(term => (
                    <tr key={term.id} className={`border-b border-slate-100 hover:bg-slate-50 ${!term.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-slate-800">{term.term}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-md truncate">{term.definition}</td>
                      <td className="px-4 py-3">
                        {term.category && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {term.category}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {term.aliases?.slice(0, 2).join(', ')}
                        {(term.aliases?.length || 0) > 2 && '...'}
                      </td>
                      <td className="px-4 py-3">{term.usage_count}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          term.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {term.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(term, 'global')}
                            className="text-blue-600 hover:underline"
                          >
                            Edit
                          </button>
                          {term.is_active && (
                            <button
                              onClick={() => handleDeactivate(term.id)}
                              className="text-red-600 hover:underline"
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(viewMode === 'all' || viewMode === 'customer') && (
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2 text-slate-800">
            <span className="w-3 h-3 bg-teal-500 rounded-full"></span>
            Customer Terms ({filteredCustomer.length})
          </h4>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Term</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Definition</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Usage</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomer.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No customer terms found
                    </td>
                  </tr>
                ) : (
                  filteredCustomer.map(term => (
                    <tr key={term.id} className={`border-b border-slate-100 hover:bg-slate-50 ${!term.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-slate-800">{term.term}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-md truncate">{term.definition}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs font-medium">
                          {term.customer_id}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {term.category && (
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                            {term.category}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{term.usage_count}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleEdit(term, 'customer')}
                          className="text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingTerm && (
        <GlossaryTermEditor
          term={editingTerm}
          type={editingType}
          onClose={() => setEditingTerm(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

interface GlossaryTermEditorProps {
  term: GlobalGlossaryTerm | CustomerGlossaryTerm | { isNew: boolean };
  type: 'global' | 'customer';
  onClose: () => void;
  onSave: (data: Partial<GlobalGlossaryTerm | CustomerGlossaryTerm>) => void;
}

function GlossaryTermEditor({ term, type, onClose, onSave }: GlossaryTermEditorProps) {
  const isNew = 'isNew' in term;
  const existingTerm = !isNew ? term as GlobalGlossaryTerm | CustomerGlossaryTerm : null;

  const [formData, setFormData] = useState({
    term: existingTerm?.term || '',
    definition: existingTerm?.definition || '',
    category: existingTerm?.category || '',
    aliases: existingTerm?.aliases?.join(', ') || '',
    related_fields: existingTerm?.related_fields || [],
    ai_instructions: existingTerm?.ai_instructions || '',
    customer_id: (existingTerm as CustomerGlossaryTerm)?.customer_id || '',
    is_active: existingTerm?.is_active ?? true,
  });
  const [isSaving, setIsSaving] = useState(false);

  const categoryOptions = [
    'Shipping Mode',
    'Pricing',
    'Documentation',
    'Equipment',
    'Industry Term',
    'Metric',
    'Company Concept',
    'Regulatory',
    'Technology',
    'Other',
  ];

  const handleSubmit = async () => {
    setIsSaving(true);
    await onSave({
      ...formData,
      aliases: formData.aliases.split(',').map(a => a.trim()).filter(Boolean),
    });
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            {isNew ? 'Add' : 'Edit'} {type === 'global' ? 'Global' : 'Customer'} Term
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {type === 'customer' && isNew && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Customer ID *</label>
              <input
                type="text"
                value={formData.customer_id}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_id: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rocket-500 focus:border-blue-500"
                placeholder="e.g., DECKED"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Term *</label>
            <input
              type="text"
              value={formData.term}
              onChange={(e) => setFormData(prev => ({ ...prev, term: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rocket-500 focus:border-blue-500"
              placeholder="e.g., LTL"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Definition *</label>
            <textarea
              value={formData.definition}
              onChange={(e) => setFormData(prev => ({ ...prev, definition: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 h-24 focus:ring-2 focus:ring-rocket-500 focus:border-blue-500"
              placeholder="What this term means..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rocket-500 focus:border-blue-500"
            >
              <option value="">Select category...</option>
              {categoryOptions.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Aliases (comma-separated)</label>
            <input
              type="text"
              value={formData.aliases}
              onChange={(e) => setFormData(prev => ({ ...prev, aliases: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-rocket-500 focus:border-blue-500"
              placeholder="e.g., Less Than Truckload, less-than-truckload"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">AI Instructions</label>
            <textarea
              value={formData.ai_instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, ai_instructions: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 h-20 focus:ring-2 focus:ring-rocket-500 focus:border-blue-500"
              placeholder="How should AI use this term?"
            />
            <p className="text-xs text-slate-500 mt-1">
              Special instructions for the AI when interpreting or using this term
            </p>
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="w-4 h-4 text-blue-600 rounded focus:ring-rocket-500"
            />
            <label htmlFor="isActive" className="text-sm text-slate-700">Active</label>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.term || !formData.definition || isSaving || (type === 'customer' && isNew && !formData.customer_id)}
            className="flex items-center gap-2 px-6 py-2 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Term'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
