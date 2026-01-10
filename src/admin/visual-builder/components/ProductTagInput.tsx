import React, { useState, useEffect } from 'react';
import { Package, X, Loader2, Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useBuilder } from './BuilderContext';
import { useDebounce } from '../../../hooks/useDebounce';
import type { FilterBlock, FilterCondition, LogicBlock } from '../types/BuilderSchema';

interface ProductTag {
  term: string;
  matchCount: number;
  avgValue?: number;
}

function extractProductTags(logicBlocks: LogicBlock[]): string[] {
  const tags: string[] = [];

  for (const block of logicBlocks) {
    if (block.type === 'filter' && block.enabled) {
      for (const condition of block.conditions || []) {
        if (condition.field === 'item_descriptions' && condition.operator === 'contains_any') {
          if (Array.isArray(condition.value)) {
            tags.push(...(condition.value as string[]));
          }
        } else if (condition.field === 'item_descriptions' && condition.operator === 'contains') {
          tags.push(String(condition.value));
        }
      }
    }
  }

  return [...new Set(tags)];
}

function findProductFilterBlock(logicBlocks: LogicBlock[]): FilterBlock | null {
  return (logicBlocks.find(
    b => b.type === 'filter' && b.label === 'Product Filter'
  ) as FilterBlock) || null;
}

export function ProductTagInput() {
  const { state, addLogicBlock, updateLogicBlock, removeLogicBlock } = useBuilder();
  const [inputValue, setInputValue] = useState('');
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const debouncedInput = useDebounce(inputValue, 300);
  const customerScope = state.customerScope || { mode: 'admin' };

  useEffect(() => {
    const existingTerms = extractProductTags(state.logicBlocks);
    if (existingTerms.length > 0 && tags.length === 0) {
      fetchCountsForTerms(existingTerms);
    }
  }, []);

  useEffect(() => {
    async function fetchSuggestions() {
      if (debouncedInput.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        let query = supabase
          .from('shipment_report_view')
          .select('item_descriptions')
          .ilike('item_descriptions', `%${debouncedInput}%`)
          .not('item_descriptions', 'is', null)
          .limit(100);

        if (customerScope.mode === 'customer' && customerScope.customerId) {
          query = query.eq('customer_id', customerScope.customerId);
        }

        const { data } = await query;

        const terms = new Set<string>();
        (data || []).forEach(row => {
          if (row.item_descriptions) {
            const desc = row.item_descriptions.toLowerCase();
            if (desc.includes(debouncedInput.toLowerCase())) {
              terms.add(row.item_descriptions.slice(0, 50));
            }
          }
        });

        setSuggestions(Array.from(terms).slice(0, 5));
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      }
    }

    fetchSuggestions();
  }, [debouncedInput, customerScope]);

  const fetchCountsForTerms = async (terms: string[]) => {
    setIsLoading(true);

    const newTags: ProductTag[] = [];

    for (const term of terms) {
      try {
        let query = supabase
          .from('shipment_report_view')
          .select('retail', { count: 'exact' })
          .ilike('item_descriptions', `%${term}%`);

        if (customerScope.mode === 'customer' && customerScope.customerId) {
          query = query.eq('customer_id', customerScope.customerId);
        }

        if (state.executionParams.dateRange) {
          query = query
            .gte('pickup_date', state.executionParams.dateRange.start)
            .lte('pickup_date', state.executionParams.dateRange.end);
        }

        const { data, count } = await query.limit(1000);

        const matchCount = count || data?.length || 0;
        const avgValue = matchCount > 0 && data
          ? data.reduce((sum, r) => sum + (parseFloat(r.retail) || 0), 0) / matchCount
          : undefined;

        newTags.push({ term, matchCount, avgValue });
      } catch (err) {
        newTags.push({ term, matchCount: 0 });
      }
    }

    setTags(newTags);
    setIsLoading(false);
  };

  const handleAddTag = (term: string) => {
    const normalizedTerm = term.trim().toLowerCase();
    if (!normalizedTerm || tags.some(t => t.term === normalizedTerm)) return;

    const newTag: ProductTag = { term: normalizedTerm, matchCount: 0 };
    const newTags = [...tags, newTag];
    setTags(newTags);
    setInputValue('');
    setSuggestions([]);

    updateProductFilterBlock(newTags.map(t => t.term));

    fetchCountsForTerms([normalizedTerm]).then(results => {
      setTags(prev => prev.map(t =>
        t.term === normalizedTerm ? (results[0] || t) : t
      ));
    });
  };

  const handleRemoveTag = (term: string) => {
    const newTags = tags.filter(t => t.term !== term);
    setTags(newTags);
    updateProductFilterBlock(newTags.map(t => t.term));
  };

  const updateProductFilterBlock = (terms: string[]) => {
    const existingBlock = findProductFilterBlock(state.logicBlocks);

    if (terms.length === 0) {
      if (existingBlock) {
        removeLogicBlock(existingBlock.id);
      }
      return;
    }

    const condition: FilterCondition = {
      field: 'item_descriptions',
      operator: 'contains_any',
      value: terms,
    };

    if (existingBlock) {
      updateLogicBlock(existingBlock.id, {
        conditions: [condition],
      });
    } else {
      const newBlock: FilterBlock = {
        id: crypto.randomUUID(),
        type: 'filter',
        conditions: [condition],
        conditionLogic: 'OR',
        enabled: true,
        label: 'Product Filter',
      };
      addLogicBlock(newBlock);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(inputValue);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4 text-orange-500" />
        <label className="text-sm font-medium text-slate-700">Product Filter</label>
        {isLoading && <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type product name and press Enter..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {suggestions.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-2 space-y-1">
          <p className="text-xs text-slate-500 px-2">Suggestions:</p>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleAddTag(s)}
              className="w-full text-left px-3 py-1.5 text-sm text-slate-700 rounded hover:bg-white transition-colors truncate"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {tags.length === 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-500 py-1">Quick add:</span>
          {['drawer system', 'cargoglide', 'toolbox', 'bedslide'].map((term) => (
            <button
              key={term}
              onClick={() => handleAddTag(term)}
              className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
            >
              + {term}
            </button>
          ))}
        </div>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <div
              key={tag.term}
              className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg"
            >
              <span className="text-sm font-medium text-orange-900">{tag.term}</span>
              <span className="text-xs text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                {tag.matchCount.toLocaleString()}
                {tag.avgValue !== undefined && ` - $${tag.avgValue.toFixed(0)}`}
              </span>
              <button
                onClick={() => handleRemoveTag(tag.term)}
                className="text-orange-400 hover:text-orange-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-500">
        {tags.length === 0
          ? 'Add product terms to filter shipments by description'
          : `Showing shipments containing any of these ${tags.length} product(s)`
        }
      </p>
    </div>
  );
}
