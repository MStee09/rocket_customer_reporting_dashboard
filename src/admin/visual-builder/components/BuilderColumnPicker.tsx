import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckCircle,
  X,
  ChevronDown,
  ChevronRight,
  Shield,
  Package,
  DollarSign,
  MapPin,
  Flag,
  Truck,
  Box,
  Building,
  Calendar,
} from 'lucide-react';
import type { Column } from '../types/visualBuilderTypes';

const CATEGORIES: Record<string, { label: string; icon: React.ElementType }> = {
  shipment: { label: 'Shipment Info', icon: Package },
  financial: { label: 'Financial', icon: DollarSign },
  origin: { label: 'Origin', icon: MapPin },
  destination: { label: 'Destination', icon: Flag },
  carrier: { label: 'Carrier', icon: Truck },
  products: { label: 'Products', icon: Box },
  customer: { label: 'Customer', icon: Building },
  time: { label: 'Time Periods', icon: Calendar },
};

interface BuilderColumnPickerProps {
  title: string;
  subtitle: string;
  columns: Column[];
  selectedColumn: string | null;
  onSelect: (col: string | null) => void;
  highlightColor: 'blue' | 'green';
}

export function BuilderColumnPicker({
  title,
  subtitle,
  columns,
  selectedColumn,
  onSelect,
  highlightColor,
}: BuilderColumnPickerProps) {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const filteredColumns = useMemo(() => {
    if (!search) return columns;
    const s = search.toLowerCase();
    return columns.filter(c =>
      c.label.toLowerCase().includes(s) ||
      c.id.toLowerCase().includes(s) ||
      c.description?.toLowerCase().includes(s) ||
      c.category.toLowerCase().includes(s)
    );
  }, [columns, search]);

  const byCategory = useMemo(() => {
    const result: Record<string, Column[]> = {};
    for (const col of filteredColumns) {
      if (!result[col.category]) result[col.category] = [];
      result[col.category].push(col);
    }
    return result;
  }, [filteredColumns]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const selectedCol = columns.find(c => c.id === selectedColumn);
  const colorClasses = highlightColor === 'blue'
    ? { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', selected: 'bg-blue-100 text-blue-800' }
    : { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', selected: 'bg-green-100 text-green-800' };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
      <p className="text-xs text-slate-500 mb-3">{subtitle}</p>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search columns..."
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
        />
      </div>

      {selectedCol && (
        <div className={`flex items-center justify-between px-3 py-2 rounded-lg border mb-3 ${colorClasses.bg} ${colorClasses.border}`}>
          <div className="flex items-center gap-2">
            <CheckCircle className={`w-4 h-4 ${colorClasses.text}`} />
            <div>
              <span className={`text-sm font-medium ${colorClasses.text}`}>{selectedCol.label}</span>
              {selectedCol.adminOnly && (
                <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded">Admin</span>
              )}
            </div>
          </div>
          <button onClick={() => onSelect(null)} className={colorClasses.text}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg">
        {Object.entries(CATEGORIES).map(([catKey, { label, icon: Icon }]) => {
          const catColumns = byCategory[catKey] || [];
          if (catColumns.length === 0) return null;

          const isExpanded = expandedCategories.has(catKey) || search.length > 0;
          const hasAdminCols = catColumns.some(c => c.adminOnly);

          return (
            <div key={catKey} className="border-b border-slate-100 last:border-b-0">
              <button
                onClick={() => toggleCategory(catKey)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                  <span className="text-xs text-slate-400 bg-slate-100 px-1.5 rounded">{catColumns.length}</span>
                  {hasAdminCols && <Shield className="w-3 h-3 text-amber-500" />}
                </div>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>
              {isExpanded && (
                <div className="px-2 pb-2 space-y-0.5">
                  {catColumns.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => onSelect(col.id)}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                        selectedColumn === col.id ? colorClasses.selected : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{col.label}</span>
                        {col.adminOnly && (
                          <span className="px-1 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded">Admin</span>
                        )}
                      </div>
                      {col.description && <div className="text-xs text-slate-500">{col.description}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredColumns.length === 0 && (
          <div className="p-4 text-center text-sm text-slate-500">No columns match "{search}"</div>
        )}
      </div>
    </div>
  );
}
