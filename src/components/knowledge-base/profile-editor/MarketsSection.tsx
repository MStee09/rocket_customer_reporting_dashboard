import { useState } from 'react';
import { Plus, X, Loader2, MapPin } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { addMarket, removeMarket } from '../../../services/customerIntelligenceService';
import type { KeyMarket } from '../../../types/customerIntelligence';

interface MarketsSectionProps {
  markets: KeyMarket[];
  customerId: number;
  onUpdate: () => void;
}

export function MarketsSection({ markets, customerId, onUpdate }: MarketsSectionProps) {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMarket, setNewMarket] = useState({ region: '', states: '', volumePercent: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!user || !newMarket.region.trim()) return;

    const statesArray = newMarket.states
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    setIsSaving(true);
    try {
      await addMarket(
        customerId,
        {
          region: newMarket.region.trim(),
          states: statesArray,
          volumePercent: newMarket.volumePercent ? parseInt(newMarket.volumePercent, 10) : undefined,
        },
        user.id,
        user.email || 'unknown'
      );
      onUpdate();
      setNewMarket({ region: '', states: '', volumePercent: '' });
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error adding market:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (marketId: string) => {
    if (!user) return;

    setRemovingId(marketId);
    try {
      await removeMarket(customerId, marketId, user.id, user.email || 'unknown');
      onUpdate();
    } catch (err) {
      console.error('Error removing market:', err);
    } finally {
      setRemovingId(null);
      setConfirmRemoveId(null);
    }
  };

  return (
    <div className="space-y-4">
      {markets.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No markets defined yet.</p>
      ) : (
        <div className="space-y-2">
          {markets.map((market) => (
            <div
              key={market.id}
              className="group flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{market.region}</span>
                    {market.volumePercent !== undefined && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                        {market.volumePercent}%
                      </span>
                    )}
                  </div>
                  {market.states.length > 0 && (
                    <p className="text-sm text-gray-500 truncate">{market.states.join(', ')}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                {confirmRemoveId === market.id ? (
                  <>
                    <span className="text-xs text-gray-500">Remove?</span>
                    <button
                      onClick={() => handleRemove(market.id)}
                      disabled={removingId === market.id}
                      className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    >
                      {removingId === market.id ? (
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
                    onClick={() => setConfirmRemoveId(market.id)}
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
              <h3 className="text-lg font-semibold text-gray-900">Add Market</h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Region Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newMarket.region}
                  onChange={(e) => setNewMarket({ ...newMarket, region: e.target.value })}
                  placeholder="e.g., West Coast, Northeast, Pacific Northwest"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  States (comma-separated)
                </label>
                <input
                  type="text"
                  value={newMarket.states}
                  onChange={(e) => setNewMarket({ ...newMarket, states: e.target.value })}
                  placeholder="e.g., CA, OR, WA"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
                />
                <p className="mt-1 text-xs text-gray-500">Enter state abbreviations separated by commas</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Volume Percentage (optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newMarket.volumePercent}
                    onChange={(e) => setNewMarket({ ...newMarket, volumePercent: e.target.value })}
                    placeholder="e.g., 35"
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500"
                  />
                  <span className="text-sm text-gray-500">% of total volume</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setNewMarket({ region: '', states: '', volumePercent: '' });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={isSaving || !newMarket.region.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add Market
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketsSection;
