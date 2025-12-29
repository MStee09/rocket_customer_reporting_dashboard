import { useState } from 'react';
import { Plus, X, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { addTerminology, removeTerminology } from '../../../services/customerIntelligenceService';
import type { TermMapping } from '../../../types/customerIntelligence';

interface TerminologySectionProps {
  terminology: TermMapping[];
  customerId: number;
  onUpdate: () => void;
}

export function TerminologySection({ terminology, customerId, onUpdate }: TerminologySectionProps) {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTerm, setNewTerm] = useState({ term: '', meaning: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!user || !newTerm.term.trim() || !newTerm.meaning.trim()) return;

    setIsSaving(true);
    try {
      await addTerminology(
        customerId,
        { term: newTerm.term.trim(), meaning: newTerm.meaning.trim() },
        user.id,
        user.email || 'unknown'
      );
      onUpdate();
      setNewTerm({ term: '', meaning: '' });
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error adding terminology:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (termId: string) => {
    if (!user) return;

    setRemovingId(termId);
    try {
      await removeTerminology(customerId, termId, user.id, user.email || 'unknown');
      onUpdate();
    } catch (err) {
      console.error('Error removing terminology:', err);
    } finally {
      setRemovingId(null);
      setConfirmRemoveId(null);
    }
  };

  return (
    <div className="space-y-4">
      {terminology.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No terminology defined yet.</p>
      ) : (
        <div className="space-y-2">
          {terminology.map((term) => (
            <div
              key={term.id}
              className="group flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="font-semibold text-gray-900">"{term.term}"</span>
                <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600 truncate">{term.meaning}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                {confirmRemoveId === term.id ? (
                  <>
                    <span className="text-xs text-gray-500">Remove?</span>
                    <button
                      onClick={() => handleRemove(term.id)}
                      disabled={removingId === term.id}
                      className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    >
                      {removingId === term.id ? (
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
                    onClick={() => setConfirmRemoveId(term.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-rocket-600 hover:bg-rocket-50 rounded-md transition-colors text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        Add
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Terminology</h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  When they say:
                </label>
                <input
                  type="text"
                  value={newTerm.term}
                  onChange={(e) => setNewTerm({ ...newTerm, term: e.target.value })}
                  placeholder='e.g., "SKU", "the widget", "PO#"'
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  They mean:
                </label>
                <input
                  type="text"
                  value={newTerm.meaning}
                  onChange={(e) => setNewTerm({ ...newTerm, meaning: e.target.value })}
                  placeholder='e.g., "Stock Keeping Unit", "Model X-500", "Purchase Order Number"'
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setNewTerm({ term: '', meaning: '' });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={isSaving || !newTerm.term.trim() || !newTerm.meaning.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add Term
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TerminologySection;
