import { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { updateBenchmarkPeriod } from '../../services/customerIntelligenceService';
import type { CustomerIntelligenceProfile } from '../../types/customerIntelligence';

interface BenchmarkSectionProps {
  customerId: number;
  benchmarkPeriod: string | undefined;
  onUpdate: (profile: CustomerIntelligenceProfile) => void;
}

const PERIOD_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_90_days', label: 'Last 90 Days' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'previous_year', label: 'Previous Year' },
  { value: 'q1', label: 'Q1 (Jan-Mar)' },
  { value: 'q2', label: 'Q2 (Apr-Jun)' },
  { value: 'q3', label: 'Q3 (Jul-Sep)' },
  { value: 'q4', label: 'Q4 (Oct-Dec)' },
];

export function BenchmarkSection({ customerId, benchmarkPeriod, onUpdate }: BenchmarkSectionProps) {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState(benchmarkPeriod || '');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (value: string) => {
    setSelectedPeriod(value);
    setHasChanges(value !== (benchmarkPeriod || ''));
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const updated = await updateBenchmarkPeriod(
        customerId,
        selectedPeriod || null,
        user.id,
        user.email || 'unknown'
      );
      onUpdate(updated);
      setHasChanges(false);
    } catch (err) {
      console.error('Error updating benchmark period:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <select
          value={selectedPeriod}
          onChange={(e) => handleChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rocket-500 focus:border-blue-500"
        >
          {PERIOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-rocket-600 text-white rounded-md hover:bg-rocket-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500">
        This period will be used as the default comparison baseline when the AI generates reports for this customer.
      </p>
    </div>
  );
}

export default BenchmarkSection;
