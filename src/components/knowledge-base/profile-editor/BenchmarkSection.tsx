import { useState } from 'react';
import { Pencil, Save, X, Loader2, Calendar } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { updateBenchmarkPeriod } from '../../../services/customerIntelligenceService';

interface BenchmarkSectionProps {
  benchmarkPeriod: string | undefined;
  customerId: number;
  onUpdate: () => void;
}

const QUICK_OPTIONS = [
  { value: 'Q4 2024', label: 'Q4 2024' },
  { value: 'Q3 2024', label: 'Q3 2024' },
  { value: 'Q2 2024', label: 'Q2 2024' },
  { value: 'Last Year', label: 'Last Year' },
];

export function BenchmarkSection({ benchmarkPeriod, customerId, onUpdate }: BenchmarkSectionProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [customValue, setCustomValue] = useState(benchmarkPeriod || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleQuickSelect = async (value: string) => {
    if (!user) return;

    setIsSaving(true);
    try {
      await updateBenchmarkPeriod(customerId, value, user.id, user.email || 'unknown');
      onUpdate();
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating benchmark period:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCustomSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      await updateBenchmarkPeriod(
        customerId,
        customValue.trim() || null,
        user.id,
        user.email || 'unknown'
      );
      onUpdate();
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating benchmark period:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      await updateBenchmarkPeriod(customerId, null, user.id, user.email || 'unknown');
      onUpdate();
      setCustomValue('');
      setIsEditing(false);
    } catch (err) {
      console.error('Error clearing benchmark period:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Quick select:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleQuickSelect(option.value)}
                disabled={isSaving}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors disabled:opacity-50 ${
                  benchmarkPeriod === option.value
                    ? 'bg-rocket-600 text-white border-rocket-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-rocket-500 hover:text-rocket-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Or enter custom:</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder="e.g., Jan-Mar 2024, FY2023"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rocket-500 focus:border-rocket-500 text-sm"
            />
            <button
              onClick={handleCustomSave}
              disabled={isSaving}
              className="flex items-center gap-1 px-3 py-2 bg-rocket-600 text-white rounded-lg hover:bg-rocket-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <button
            onClick={handleClear}
            disabled={isSaving || !benchmarkPeriod}
            className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear benchmark
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setCustomValue(benchmarkPeriod || '');
            }}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-gray-500" />
        </div>
        <div>
          {benchmarkPeriod ? (
            <>
              <p className="font-medium text-gray-900">{benchmarkPeriod}</p>
              <p className="text-sm text-gray-500">Comparison baseline for reports</p>
            </>
          ) : (
            <>
              <p className="text-gray-500 italic">Not set</p>
              <p className="text-sm text-gray-400">No benchmark period configured</p>
            </>
          )}
        </div>
      </div>
      <button
        onClick={() => setIsEditing(true)}
        className="flex items-center gap-1 px-3 py-1.5 text-sm text-rocket-600 hover:bg-rocket-50 rounded-lg transition-colors font-medium"
      >
        <Pencil className="w-4 h-4" />
        Edit
      </button>
    </div>
  );
}

export default BenchmarkSection;
