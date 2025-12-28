import { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { addTerminology, removeTerminology } from '../../services/customerIntelligenceService';
import type { CustomerIntelligenceProfile, TermMapping } from '../../types/customerIntelligence';

interface TerminologySectionProps {
  customerId: number;
  terminology: TermMapping[];
  onUpdate: (profile: CustomerIntelligenceProfile) => void;
}

export function TerminologySection({ customerId, terminology, onUpdate }: TerminologySectionProps) {
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [newTerm, setNewTerm] = useState({ term: '', meaning: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!user || !newTerm.term.trim() || !newTerm.meaning.trim()) return;

    setIsSaving(true);
    try {
      const updated = await addTerminology(
        customerId,
        { term: newTerm.term.trim(), meaning: newTerm.meaning.trim() },
        user.id,
        user.email || 'unknown'
      );
      onUpdate(updated);
      setNewTerm({ term: '', meaning: '' });
      setIsAdding(false);
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
      const updated = await removeTerminology(customerId, termId, user.id, user.email || 'unknown');
      onUpdate(updated);
    } catch (err) {
      console.error('Error removing terminology:', err);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {terminology.length === 0 && !isAdding ? (
        <p className="text-sm text-gray-500 italic">No terminology defined yet.</p>
      ) : (
        <div className="space-y-2">
          {terminology.map((term) => (
            <div
              key={term.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="min-w-0 flex-1">
                <span className="font-medium text-gray-900">{term.term}</span>
                <span className="text-gray-400 mx-2">=</span>
                <span className="text-gray-600">{term.meaning}</span>
              </div>
              <button
                onClick={() => handleRemove(term.id)}
                disabled={removingId === term.id}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 flex-shrink-0 ml-2"
              >
                {removingId === term.id ? (
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
              <input
                type="text"
                value={newTerm.term}
                onChange={(e) => setNewTerm({ ...newTerm, term: e.target.value })}
                placeholder="e.g., SKU"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meaning</label>
              <input
                type="text"
                value={newTerm.meaning}
                onChange={(e) => setNewTerm({ ...newTerm, meaning: e.target.value })}
                placeholder="e.g., Stock Keeping Unit"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleAdd}
              disabled={isSaving || !newTerm.term.trim() || !newTerm.meaning.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Term
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewTerm({ term: '', meaning: '' });
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
          Add Term
        </button>
      )}
    </div>
  );
}

export default TerminologySection;
