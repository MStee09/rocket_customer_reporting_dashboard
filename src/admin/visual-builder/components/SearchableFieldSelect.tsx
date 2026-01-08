/**
 * Searchable Field Selector Component
 *
 * A combobox-style dropdown with search, grouping, and field type indicators.
 * Replaces basic <select> dropdowns for better UX with 50+ fields.
 *
 * LOCATION: /src/admin/visual-builder/components/SearchableFieldSelect.tsx
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, ChevronDown, Hash, Calendar, DollarSign, Type, ToggleLeft } from 'lucide-react';
import type { BuilderFieldDefinition } from '../types/BuilderSchema';

interface SearchableFieldSelectProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  fields: BuilderFieldDefinition[];
  placeholder?: string;
  allowEmpty?: boolean;
  description?: string;
}

export function SearchableFieldSelect({
  label,
  value,
  onChange,
  fields,
  placeholder = 'Search fields...',
  allowEmpty = false,
  description,
}: SearchableFieldSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const selectedField = fields.find(f => f.name === value);

  const filteredFields = useMemo(() => {
    let result = fields;

    if (search.trim()) {
      const lower = search.toLowerCase();
      result = fields.filter(f =>
        f.name.toLowerCase().includes(lower) ||
        f.label.toLowerCase().includes(lower) ||
        f.description?.toLowerCase().includes(lower) ||
        f.fieldCategory.toLowerCase().includes(lower)
      );
    }

    const groups: Record<string, BuilderFieldDefinition[]> = {};
    for (const field of result) {
      const cat = field.fieldCategory;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(field);
    }

    return groups;
  }, [fields, search]);

  const totalResults = Object.values(filteredFields).flat().length;

  const handleSelect = (fieldName: string) => {
    onChange(fieldName);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  const getCategoryLabel = (cat: string): string => {
    const labels: Record<string, string> = {
      identification: '🏷️ IDs & References',
      classification: '📂 Classification',
      dates: '📅 Dates',
      customer: '🏢 Customer',
      locations: '📍 Locations',
      financial: '💰 Financial',
      operational: '🚚 Operational',
      carrier: '🚛 Carrier',
      items: '📦 Items',
      accessorials: '➕ Accessorials',
    };
    return labels[cat] || cat;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'number':
      case 'currency':
        return <Hash className="w-3 h-3 text-blue-500" />;
      case 'date':
        return <Calendar className="w-3 h-3 text-amber-500" />;
      case 'boolean':
        return <ToggleLeft className="w-3 h-3 text-purple-500" />;
      default:
        return <Type className="w-3 h-3 text-green-500" />;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between px-3 py-2
          border rounded-lg text-sm text-left transition-colors
          ${isOpen
            ? 'border-orange-500 ring-2 ring-orange-500/20'
            : 'border-slate-200 hover:border-slate-300'
          }
          ${!selectedField ? 'text-slate-400' : 'text-slate-900'}
        `}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedField ? (
            <>
              {getTypeIcon(selectedField.type)}
              <span className="truncate">{selectedField.label}</span>
              <span className="text-slate-400 text-xs truncate">({selectedField.name})</span>
            </>
          ) : (
            <span>{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedField && allowEmpty && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-slate-100 rounded"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {description && !isOpen && (
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      )}

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to search fields..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {totalResults} field{totalResults !== 1 ? 's' : ''} available
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {allowEmpty && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={`
                  w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2
                  ${!value ? 'bg-orange-50 text-orange-700' : 'text-slate-500'}
                `}
              >
                <span className="italic">None</span>
              </button>
            )}

            {Object.entries(filteredFields).map(([category, categoryFields]) => (
              <div key={category}>
                <div className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 sticky top-0">
                  {getCategoryLabel(category)}
                </div>
                {categoryFields.map(field => (
                  <button
                    type="button"
                    key={`${category}-${field.name}`}
                    onClick={() => handleSelect(field.name)}
                    className={`
                      w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2
                      ${field.name === value ? 'bg-orange-50 text-orange-700' : 'text-slate-700'}
                    `}
                  >
                    {getTypeIcon(field.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{field.label}</span>
                        {field.isAggregatable && (
                          <span className="px-1 py-0.5 text-[10px] bg-blue-100 text-blue-600 rounded">
                            SUM
                          </span>
                        )}
                        {field.isGroupable && (
                          <span className="px-1 py-0.5 text-[10px] bg-green-100 text-green-600 rounded">
                            GROUP
                          </span>
                        )}
                      </div>
                      {field.description && (
                        <div className="text-xs text-slate-400 truncate">{field.description}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ))}

            {totalResults === 0 && (
              <div className="px-3 py-8 text-center text-sm text-slate-400">
                No fields match "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchableFieldSelect;
