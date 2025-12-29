import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Brain,
  AlertTriangle,
  CheckCircle,
  Search,
  Plus,
  Database,
  BookOpen,
  Calculator,
  Package,
  Sparkles,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  X,
  Loader2,
} from 'lucide-react';

interface KnowledgeItem {
  id: string;
  knowledge_type: string;
  key: string;
  label: string;
  definition: string;
  ai_instructions: string;
  metadata: Record<string, unknown> | null;
  scope: string;
  customer_id: string;
  source: string;
  confidence: number;
  times_used: number;
  times_corrected: number;
  is_visible_to_customers: boolean;
  is_active: boolean;
  needs_review: boolean;
  created_at: string;
}

export function AIIntelligence() {
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [needsReview, setNeedsReview] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, learned: 0, accuracy: 0 });

  useEffect(() => {
    loadKnowledge();
    loadNeedsReview();
    loadStats();
  }, []);

  const loadKnowledge = async () => {
    const { data, error } = await supabase
      .from('ai_knowledge')
      .select('*')
      .eq('is_active', true)
      .order('knowledge_type')
      .order('key');

    if (!error) setKnowledge(data || []);
    setLoading(false);
  };

  const loadNeedsReview = async () => {
    const { data } = await supabase
      .from('ai_knowledge')
      .select('*')
      .eq('needs_review', true)
      .order('times_corrected', { ascending: false })
      .order('created_at', { ascending: false });

    setNeedsReview(data || []);
  };

  const loadStats = async () => {
    const { data: all } = await supabase
      .from('ai_knowledge')
      .select('is_active, source, times_used, times_corrected');

    if (all) {
      const total = all.length;
      const active = all.filter((k) => k.is_active).length;
      const learned = all.filter((k) => k.source === 'auto-learned').length;

      const totalUses = all.reduce((sum, k) => sum + (k.times_used || 0), 0);
      const totalCorrections = all.reduce((sum, k) => sum + (k.times_corrected || 0), 0);
      const accuracy =
        totalUses > 0 ? Math.round((totalUses / (totalUses + totalCorrections)) * 100) : 100;

      setStats({ total, active, learned, accuracy });
    }
  };

  const approveItem = async (item: KnowledgeItem) => {
    await supabase.rpc('approve_knowledge', { p_id: item.id });
    loadKnowledge();
    loadNeedsReview();
    loadStats();
  };

  const rejectItem = async (item: KnowledgeItem) => {
    await supabase.rpc('reject_knowledge', { p_id: item.id });
    loadNeedsReview();
    loadStats();
  };

  const deleteItem = async (item: KnowledgeItem) => {
    if (!confirm(`Delete "${item.key}"?`)) return;
    await supabase.from('ai_knowledge').delete().eq('id', item.id);
    loadKnowledge();
    loadStats();
  };

  const toggleVisibility = async (item: KnowledgeItem) => {
    await supabase
      .from('ai_knowledge')
      .update({ is_visible_to_customers: !item.is_visible_to_customers })
      .eq('id', item.id);
    loadKnowledge();
  };

  const filteredKnowledge = knowledge.filter((k) => {
    const matchesSearch =
      k.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.definition?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || k.knowledge_type === typeFilter;
    const matchesScope = scopeFilter === 'all' || k.scope === scopeFilter;

    return matchesSearch && matchesType && matchesScope;
  });

  const groupedKnowledge = filteredKnowledge.reduce(
    (acc, item) => {
      const type = item.knowledge_type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(item);
      return acc;
    },
    {} as Record<string, KnowledgeItem[]>
  );

  const typeIcons: Record<string, typeof Database> = {
    field: Database,
    term: BookOpen,
    calculation: Calculator,
    product: Package,
    rule: Sparkles,
  };

  const typeLabels: Record<string, string> = {
    field: 'Field Definitions',
    term: 'Business Terms',
    calculation: 'Calculations',
    product: 'Product Categories',
    rule: 'Business Rules',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-rocket-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Accuracy</p>
              <p className="text-2xl font-bold text-green-600">{stats.accuracy}%</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-200" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Knowledge</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
            <Brain className="w-8 h-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Auto-Learned</p>
              <p className="text-2xl font-bold text-teal-600">{stats.learned}</p>
            </div>
            <Sparkles className="w-8 h-8 text-teal-200" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Needs Review</p>
              <p className="text-2xl font-bold text-orange-600">{needsReview.length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-200" />
          </div>
        </div>
      </div>

      {needsReview.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="font-semibold text-orange-800 flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5" />
            Needs Review ({needsReview.length})
          </h3>

          <div className="space-y-2">
            {needsReview.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.key}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                      {item.knowledge_type}
                    </span>
                    {item.scope === 'customer' && (
                      <span className="text-xs px-2 py-0.5 bg-rocket-100 text-rocket-700 rounded">
                        Customer: {item.customer_id}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{item.definition}</p>
                  {item.times_corrected > 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      Corrected {item.times_corrected} time(s)
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => approveItem(item)}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="px-3 py-1 bg-rocket-100 text-rocket-700 rounded text-sm hover:bg-rocket-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => rejectItem(item)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}

            {needsReview.length > 5 && (
              <p className="text-sm text-orange-600 text-center">
                + {needsReview.length - 5} more items need review
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search knowledge base..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="all">All Types</option>
          <option value="field">Fields</option>
          <option value="term">Terms</option>
          <option value="calculation">Calculations</option>
          <option value="product">Products</option>
          <option value="rule">Rules</option>
        </select>

        <select
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="all">All Scopes</option>
          <option value="global">Global</option>
          <option value="customer">Customer-Specific</option>
        </select>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700"
        >
          <Plus className="w-4 h-4" />
          Add Knowledge
        </button>
      </div>

      <div className="space-y-4">
        {Object.keys(groupedKnowledge).length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center">
            <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No knowledge found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || typeFilter !== 'all' || scopeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Add your first knowledge item to enhance the AI'}
            </p>
          </div>
        ) : (
          Object.entries(groupedKnowledge).map(([type, items]) => {
            const Icon = typeIcons[type] || Database;

            return (
              <div key={type} className="bg-white rounded-lg border">
                <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2">
                  <Icon className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold">{typeLabels[type] || type}</h3>
                  <span className="text-sm text-gray-500">({items.length})</span>
                </div>

                <div className="divide-y">
                  {items.map((item) => (
                    <div key={item.id} className="px-4 py-3 hover:bg-gray-50 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.label || item.key}</span>
                          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                            {item.key}
                          </code>
                          {item.scope === 'customer' && (
                            <span className="text-xs px-2 py-0.5 bg-rocket-100 text-rocket-700 rounded">
                              {item.customer_id}
                            </span>
                          )}
                          {item.source === 'auto-learned' && (
                            <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700 rounded">
                              Auto-Learned
                            </span>
                          )}
                        </div>

                        {item.definition && (
                          <p className="text-sm text-gray-600 mt-1 truncate">{item.definition}</p>
                        )}

                        {item.ai_instructions && (
                          <p className="text-xs text-rocket-600 mt-1 truncate">
                            AI: {item.ai_instructions}
                          </p>
                        )}
                      </div>

                      <div className="text-center">
                        <div className="text-xs text-gray-500">Confidence</div>
                        <div
                          className={`text-sm font-medium ${
                            item.confidence >= 0.9
                              ? 'text-green-600'
                              : item.confidence >= 0.7
                                ? 'text-yellow-600'
                                : 'text-red-600'
                          }`}
                        >
                          {Math.round(item.confidence * 100)}%
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-xs text-gray-500">Used</div>
                        <div className="text-sm font-medium">{item.times_used}</div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleVisibility(item)}
                          className="p-2 hover:bg-gray-100 rounded"
                          title={
                            item.is_visible_to_customers
                              ? 'Visible to customers'
                              : 'Hidden from customers'
                          }
                        >
                          {item.is_visible_to_customers ? (
                            <Eye className="w-4 h-4 text-green-600" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="p-2 hover:bg-gray-100 rounded"
                        >
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => deleteItem(item)}
                          className="p-2 hover:bg-gray-100 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedItem && (
        <KnowledgeEditModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSave={() => {
            setSelectedItem(null);
            loadKnowledge();
            loadNeedsReview();
          }}
        />
      )}

      {showAddModal && (
        <KnowledgeAddModal
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            setShowAddModal(false);
            loadKnowledge();
            loadStats();
          }}
        />
      )}
    </div>
  );
}

function KnowledgeEditModal({
  item,
  onClose,
  onSave,
}: {
  item: KnowledgeItem;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    label: item.label || '',
    definition: item.definition || '',
    ai_instructions: item.ai_instructions || '',
    is_visible_to_customers: item.is_visible_to_customers,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await supabase
      .from('ai_knowledge')
      .update({
        label: formData.label,
        definition: formData.definition,
        ai_instructions: formData.ai_instructions,
        is_visible_to_customers: formData.is_visible_to_customers,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Edit: {item.key}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Display Label</label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Definition</label>
            <textarea
              value={formData.definition}
              onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">AI Instructions</label>
            <textarea
              value={formData.ai_instructions}
              onChange={(e) => setFormData({ ...formData, ai_instructions: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              placeholder="How should the AI use this? Any warnings or special handling?"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="visible"
              checked={formData.is_visible_to_customers}
              onChange={(e) =>
                setFormData({ ...formData, is_visible_to_customers: e.target.checked })
              }
            />
            <label htmlFor="visible" className="text-sm">
              Visible to customers
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-rocket-600 text-white rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function KnowledgeAddModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [formData, setFormData] = useState({
    knowledge_type: 'term',
    key: '',
    label: '',
    definition: '',
    ai_instructions: '',
    scope: 'global',
    customer_id: '',
    is_visible_to_customers: true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.key.trim()) return;

    setSaving(true);
    await supabase.from('ai_knowledge').insert({
      knowledge_type: formData.knowledge_type,
      key: formData.key.trim(),
      label: formData.label || formData.key,
      definition: formData.definition,
      ai_instructions: formData.ai_instructions,
      scope: formData.scope,
      customer_id: formData.scope === 'customer' ? formData.customer_id : null,
      is_visible_to_customers: formData.is_visible_to_customers,
      source: 'manual',
      confidence: 1.0,
      is_active: true,
    });

    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Add Knowledge</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={formData.knowledge_type}
                onChange={(e) => setFormData({ ...formData, knowledge_type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="term">Business Term</option>
                <option value="calculation">Calculation</option>
                <option value="product">Product Category</option>
                <option value="rule">Business Rule</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Scope</label>
              <select
                value={formData.scope}
                onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="global">Global (All Customers)</option>
                <option value="customer">Customer-Specific</option>
              </select>
            </div>
          </div>

          {formData.scope === 'customer' && (
            <div>
              <label className="block text-sm font-medium mb-1">Customer ID</label>
              <input
                type="text"
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g., 4586648"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Key (identifier)</label>
            <input
              type="text"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g., DPM, cost_per_unit, drawer_system"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Display Label</label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g., Deliveries Per Month"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Definition</label>
            <textarea
              value={formData.definition}
              onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
              placeholder="What does this mean?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">AI Instructions</label>
            <textarea
              value={formData.ai_instructions}
              onChange={(e) => setFormData({ ...formData, ai_instructions: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
              placeholder="How should the AI use this?"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !formData.key.trim()}
            className="px-4 py-2 bg-rocket-600 text-white rounded-lg disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
