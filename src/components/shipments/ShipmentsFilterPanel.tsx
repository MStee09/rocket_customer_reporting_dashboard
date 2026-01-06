import { useState, useEffect } from 'react';
import { X, Check, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ShipmentsFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
}

export interface FilterState {
  statuses: string[];
  carriers: string[];
  modes: string[];
  dateRange: { start: string; end: string } | null;
  originStates: string[];
  destStates: string[];
}

export const defaultFilters: FilterState = {
  statuses: [],
  carriers: [],
  modes: [],
  dateRange: null,
  originStates: [],
  destStates: [],
};

export function ShipmentsFilterPanel({ isOpen, onClose, filters, onApply }: ShipmentsFilterPanelProps) {
  const { effectiveCustomerIds } = useAuth();
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [availableCarriers, setAvailableCarriers] = useState<string[]>([]);
  const [availableModes, setAvailableModes] = useState<string[]>([]);
  const [availableStates, setAvailableStates] = useState<string[]>([]);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      const [statusRes, carrierRes, modeRes, stateRes] = await Promise.all([
        supabase.from('shipment_status').select('status_name').order('status_name'),
        supabase.from('carrier').select('carrier_name').order('carrier_name').limit(100),
        supabase.from('shipment_mode').select('mode_name').order('mode_name'),
        supabase.rpc('execute_custom_query', {
          query_text: `SELECT DISTINCT state FROM shipment_address WHERE state IS NOT NULL AND state != '' ORDER BY state LIMIT 60`
        }),
      ]);

      if (statusRes.data) {
        setAvailableStatuses(statusRes.data.map(s => s.status_name).filter(Boolean));
      }
      if (carrierRes.data) {
        setAvailableCarriers(carrierRes.data.map(c => c.carrier_name).filter(Boolean));
      }
      if (modeRes.data) {
        setAvailableModes(modeRes.data.map(m => m.mode_name).filter(Boolean));
      }
      if (stateRes.data) {
        setAvailableStates(stateRes.data.map((r: { state: string }) => r.state).filter(Boolean));
      }
    };

    if (isOpen) {
      loadFilterOptions();
    }
  }, [isOpen, effectiveCustomerIds]);

  const toggleArrayFilter = (
    key: 'statuses' | 'carriers' | 'modes' | 'originStates' | 'destStates',
    value: string
  ) => {
    setLocalFilters(prev => {
      const current = prev[key];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters(defaultFilters);
  };

  const hasActiveFilters =
    localFilters.statuses.length > 0 ||
    localFilters.carriers.length > 0 ||
    localFilters.modes.length > 0 ||
    localFilters.originStates.length > 0 ||
    localFilters.destStates.length > 0 ||
    localFilters.dateRange !== null;

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-gray-900">Filter Shipments</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <FilterSection title="Status">
            <div className="flex flex-wrap gap-2">
              {availableStatuses.map(status => (
                <FilterChip
                  key={status}
                  label={status}
                  selected={localFilters.statuses.includes(status)}
                  onClick={() => toggleArrayFilter('statuses', status)}
                />
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Carrier">
            <div className="max-h-40 overflow-y-auto space-y-1">
              {availableCarriers.map(carrier => (
                <FilterCheckbox
                  key={carrier}
                  label={carrier}
                  checked={localFilters.carriers.includes(carrier)}
                  onChange={() => toggleArrayFilter('carriers', carrier)}
                />
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Mode">
            <div className="flex flex-wrap gap-2">
              {availableModes.map(mode => (
                <FilterChip
                  key={mode}
                  label={mode}
                  selected={localFilters.modes.includes(mode)}
                  onClick={() => toggleArrayFilter('modes', mode)}
                />
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Origin State">
            <div className="max-h-32 overflow-y-auto flex flex-wrap gap-1">
              {availableStates.map(state => (
                <FilterChip
                  key={`origin-${state}`}
                  label={state}
                  selected={localFilters.originStates.includes(state)}
                  onClick={() => toggleArrayFilter('originStates', state)}
                  small
                />
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Destination State">
            <div className="max-h-32 overflow-y-auto flex flex-wrap gap-1">
              {availableStates.map(state => (
                <FilterChip
                  key={`dest-${state}`}
                  label={state}
                  selected={localFilters.destStates.includes(state)}
                  onClick={() => toggleArrayFilter('destStates', state)}
                  small
                />
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Date Range">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={localFilters.dateRange?.start || ''}
                  onChange={(e) => setLocalFilters(prev => ({
                    ...prev,
                    dateRange: e.target.value
                      ? { start: e.target.value, end: prev.dateRange?.end || '' }
                      : prev.dateRange?.end ? { start: '', end: prev.dateRange.end } : null
                  }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rocket-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={localFilters.dateRange?.end || ''}
                  onChange={(e) => setLocalFilters(prev => ({
                    ...prev,
                    dateRange: e.target.value
                      ? { start: prev.dateRange?.start || '', end: e.target.value }
                      : prev.dateRange?.start ? { start: prev.dateRange.start, end: '' } : null
                  }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rocket-500"
                />
              </div>
            </div>
          </FilterSection>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={!hasActiveFilters}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2 bg-rocket-600 text-white font-medium rounded-lg hover:bg-rocket-700 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function FilterChip({
  label,
  selected,
  onClick,
  small,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        ${small ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'}
        rounded-full border transition-colors
        ${selected
          ? 'bg-rocket-600 text-white border-rocket-600'
          : 'bg-white text-gray-700 border-slate-200 hover:border-slate-300'
        }
      `}
    >
      {label}
    </button>
  );
}

function FilterCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
      <div
        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
          checked ? 'bg-rocket-600 border-rocket-600' : 'border-slate-300'
        }`}
      >
        {checked && <Check className="w-3 h-3 text-white" />}
      </div>
      <span className="text-sm text-gray-700 truncate">{label}</span>
    </label>
  );
}
