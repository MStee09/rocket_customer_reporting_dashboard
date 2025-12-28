import { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { addPriority, removePriority } from '../../services/customerIntelligenceService';
import type { CustomerIntelligenceProfile, CustomerPriority } from '../../types/customerIntelligence';

interface PrioritiesSectionProps {
  customerId: number;
  priorities: CustomerPriority[];
  onUpdate: (profile: CustomerIntelligenceProfile) => void;
}

export function PrioritiesSection({ customerId, priorities, onUpdate }: PrioritiesSectionProps) {
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [newPriority, setNewPriority] = useState({ name: '', type: 'hard' as 'hard' | 'soft', context: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!user || !newPriority.name.trim()) return;

    setIsSaving(true);
    try {
      const updated = await addPriority(
        customerId,
        { name: newPriority.name.trim(), type: newPriority.type, context: newPriority.context.trim() || undefined },
        user.id,
        user.email || 'unknown'
      );
      onUpdate(updated);
      setNewPriority({ name: '', type: 'hard', context: '' });
      setIsAdding(false);
    } catch (err) {
      console.error('Error adding priority:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (priorityId: string) => {
    if (!user) return;

    setRemovingId(priorityId);
    try {
      const updated = await removePriority(customerId, priorityId, user.id, user.email || 'unknown');
      onUpdate(updated);
    } catch (err) {
      console.error('Error removing priority:', err);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {priorities.length === 0 && !isAdding ? (
        <p className="text-sm text-gray-500 italic">No priorities defined yet.</p>
      ) : (
        <div className="space-y-2">
          {priorities.map((priority) => (
            <div
              key={priority.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded ${
                    priority.type === 'hard'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {priority.type}
                </span>
                <span className="font-medium text-gray-900">{priority.name}</span>
                {priority.context && (
                  <span className="text-sm text-gray-500">- {priority.context}</span>
                )}
              </div>
              <button
                onClick={() => handleRemove(priority.id)}
                disabled={removingId === priority.id}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                {removingId === priority.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {isAdding ? (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority Name</label>
              <input
                type="text"
                value={newPriority.name}
                onChange={(e) => setNewPriority({ ...newPriority, name: e.target.value })}
                placeholder="e.g., Cost per unit"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={newPriority.type}
                onChange={(e) => setNewPriority({ ...newPriority, type: e.target.value as 'hard' | 'soft' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="hard">Hard (Critical)</option>
                <option value="soft">Soft (Nice to have)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Context (optional)</label>
            <input
              type="text"
              value={newPriority.context}
              onChange={(e) => setNewPriority({ ...newPriority, context: e.target.value })}
              placeholder="Additional context about this priority"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleAdd}
              disabled={isSaving || !newPriority.name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Priority
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewPriority({ name: '', type: 'hard', context: '' });
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Priority
        </button>
      )}
    </div>
  );
}

export default PrioritiesSection;
