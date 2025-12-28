import { useState } from 'react';
import { X, Bookmark, Filter } from 'lucide-react';

interface SaveViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string, pin: boolean) => Promise<void>;
  filterSummary: { searchQuery: string; activeStatus: string };
}

export function SaveViewModal({ isOpen, onClose, onSave, filterSummary }: SaveViewModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pinToSidebar, setPinToSidebar] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim(), description.trim(), pinToSidebar);
      setName('');
      setDescription('');
      setPinToSidebar(false);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const activeFilterCount = (filterSummary.searchQuery ? 1 : 0) + (filterSummary.activeStatus !== 'all' ? 1 : 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Save Current View</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">View Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., CA Shipments This Month"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={pinToSidebar}
              onChange={(e) => setPinToSidebar(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Pin to sidebar for quick access</span>
          </label>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-medium text-gray-700">This view will save:</p>
            </div>
            <ul className="text-sm text-gray-600 space-y-1 ml-6">
              {filterSummary.searchQuery && (
                <li>Search: "{filterSummary.searchQuery}"</li>
              )}
              {filterSummary.activeStatus !== 'all' && (
                <li>Status filter: {filterSummary.activeStatus}</li>
              )}
              {activeFilterCount === 0 && (
                <li className="text-gray-400">No active filters</li>
              )}
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save View'}
          </button>
        </div>
      </div>
    </div>
  );
}
