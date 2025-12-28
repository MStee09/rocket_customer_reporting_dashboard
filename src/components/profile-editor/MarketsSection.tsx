import { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { addMarket, removeMarket } from '../../services/customerIntelligenceService';
import type { CustomerIntelligenceProfile, KeyMarket } from '../../types/customerIntelligence';

interface MarketsSectionProps {
  customerId: number;
  markets: KeyMarket[];
  onUpdate: (profile: CustomerIntelligenceProfile) => void;
}

const US_REGIONS: Record<string, string[]> = {
  Northeast: ['CT', 'ME', 'MA', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT'],
  Southeast: ['AL', 'FL', 'GA', 'KY', 'MD', 'MS', 'NC', 'SC', 'TN', 'VA', 'WV', 'DC', 'DE'],
  Midwest: ['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI'],
  Southwest: ['AZ', 'NM', 'OK', 'TX'],
  West: ['AK', 'CA', 'CO', 'HI', 'ID', 'MT', 'NV', 'OR', 'UT', 'WA', 'WY'],
};

export function MarketsSection({ customerId, markets, onUpdate }: MarketsSectionProps) {
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [newMarket, setNewMarket] = useState({ region: '', states: [] as string[], volumePercent: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRegionChange = (region: string) => {
    setNewMarket({
      ...newMarket,
      region,
      states: US_REGIONS[region] || [],
    });
  };

  const handleAdd = async () => {
    if (!user || !newMarket.region.trim()) return;

    setIsSaving(true);
    try {
      const updated = await addMarket(
        customerId,
        {
          region: newMarket.region.trim(),
          states: newMarket.states,
          volumePercent: newMarket.volumePercent ? parseInt(newMarket.volumePercent, 10) : undefined,
        },
        user.id,
        user.email || 'unknown'
      );
      onUpdate(updated);
      setNewMarket({ region: '', states: [], volumePercent: '' });
      setIsAdding(false);
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
      const updated = await removeMarket(customerId, marketId, user.id, user.email || 'unknown');
      onUpdate(updated);
    } catch (err) {
      console.error('Error removing market:', err);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {markets.length === 0 && !isAdding ? (
        <p className="text-sm text-gray-500 italic">No markets defined yet.</p>
      ) : (
        <div className="space-y-2">
          {markets.map((market) => (
            <div
              key={market.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{market.region}</span>
                    {market.volumePercent && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                        {market.volumePercent}% volume
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{market.states.join(', ')}</p>
                </div>
              </div>
              <button
                onClick={() => handleRemove(market.id)}
                disabled={removingId === market.id}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 flex-shrink-0 ml-2"
              >
                {removingId === market.id ? (
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
              <select
                value={newMarket.region}
                onChange={(e) => handleRegionChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a region</option>
                {Object.keys(US_REGIONS).map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
                <option value="Custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Volume % (optional)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={newMarket.volumePercent}
                onChange={(e) => setNewMarket({ ...newMarket, volumePercent: e.target.value })}
                placeholder="e.g., 35"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          {newMarket.states.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">States</label>
              <div className="flex flex-wrap gap-1">
                {newMarket.states.map((state) => (
                  <span key={state} className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">
                    {state}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleAdd}
              disabled={isSaving || !newMarket.region.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Market
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewMarket({ region: '', states: [], volumePercent: '' });
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
          Add Market
        </button>
      )}
    </div>
  );
}

export default MarketsSection;
