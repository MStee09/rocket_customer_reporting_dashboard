import { useState } from 'react';
import { Plus, X, Loader2, Zap } from 'lucide-react';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPriority, setNewPriority] = useState({ name: '', isSoft: false, context: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!user || !newPriority.name.trim()) return;

    setIsSaving(true);
    try {
      const updated = await addPriority(
        customerId,
        {
          name: newPriority.name.trim(),
          type: newPriority.isSoft ? 'soft' : 'hard',
          context: newPriority.context.trim() || undefined,
        },
        user.id,
        user.email || 'unknown'
      );
      onUpdate(updated);
      setNewPriority({ name: '', isSoft: false, context: '' });
      setIsModalOpen(false);
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
      setConfirmRemoveId(null);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNewPriority({ name: '', isSoft: false, context: '' });
  };

  return (
    <div className="space-y-4">
      {priorities.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No priorities defined yet.</p>
      ) : (
        <ul className="space-y-2">
          {priorities.map((priority) => (
            <li
              key={priority.id}
              className="group flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <span className="font-medium text-gray-900">{priority.name}</span>
                {priority.type === 'soft' && (
                  <span className="relative group/tooltip">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none">
                      Soft knowledge - context only
                    </span>
                  </span>
                )}
                {priority.context && (
                  <span className="text-sm text-gray-500">({priority.context})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {confirmRemoveId === priority.id ? (
                  <>
                    <span className="text-xs text-gray-500">Remove?</span>
                    <button
                      onClick={() => handleRemove(priority.id)}
                      disabled={removingId === priority.id}
                      className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    >
                      {removingId === priority.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        'Yes'
                      )}
                    </button>
                    <button
                      onClick={() => setConfirmRemoveId(null)}
                      className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    >
                      No
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmRemoveId(priority.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        Add
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCloseModal}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Priority</h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPriority.name}
                  onChange={(e) => setNewPriority({ ...newPriority, name: e.target.value })}
                  placeholder="e.g., Cost per unit, Transit time"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="isSoftKnowledge"
                  checked={newPriority.isSoft}
                  onChange={(e) => setNewPriority({ ...newPriority, isSoft: e.target.checked })}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isSoftKnowledge" className="text-sm text-gray-700">
                  <span className="font-medium">This is soft knowledge</span>
                  <span className="block text-gray-500">
                    Context only, no data correlation. The AI will use this as background information.
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Context <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={newPriority.context}
                  onChange={(e) => setNewPriority({ ...newPriority, context: e.target.value })}
                  placeholder="Any additional details about this priority..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={isSaving || !newPriority.name.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PrioritiesSection;
