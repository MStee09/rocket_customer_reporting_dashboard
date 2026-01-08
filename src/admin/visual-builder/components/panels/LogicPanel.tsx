import React, { useState } from 'react';
import {
  Plus,
  Filter,
  Sparkles,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useBuilder } from '../BuilderContext';
import { createFilterBlock, createAILogicBlock } from '../../logic/compileLogic';
import { compileAILogic, AVAILABLE_FIELDS } from '../../logic/aiCompilation';
import type { FilterBlock, AILogicBlock, FilterOperator } from '../../types/BuilderSchema';

const OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Not Equals' },
  { value: 'gt', label: 'Greater Than' },
  { value: 'gte', label: 'Greater or Equal' },
  { value: 'lt', label: 'Less Than' },
  { value: 'lte', label: 'Less or Equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'in', label: 'In List' },
];

export function LogicPanel() {
  const { state, addLogicBlock } = useBuilder();
  const blocks = state.logicBlocks;

  const handleAddFilter = () => {
    addLogicBlock(createFilterBlock());
  };

  const handleAddAIBlock = () => {
    addLogicBlock(createAILogicBlock());
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-700">Logic Blocks</h3>
          <p className="text-xs text-slate-500">Add filters and AI-powered rules</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAddFilter}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            Filter
          </button>
          <button
            onClick={handleAddAIBlock}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-orange-600 bg-orange-100 hover:bg-orange-200 rounded-lg transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Logic
          </button>
        </div>
      </div>

      {blocks.length === 0 ? (
        <div className="py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Filter className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-600">No logic blocks yet</p>
          <p className="text-xs text-slate-400 mt-1">Add filters or AI rules to customize your widget</p>
        </div>
      ) : (
        <div className="space-y-3">
          {blocks.map((block) => (
            <div key={block.id}>
              {block.type === 'filter' ? (
                <FilterBlockCard block={block} />
              ) : (
                <AIBlockCard block={block} />
              )}
            </div>
          ))}
        </div>
      )}

      {blocks.length > 0 && (
        <div className="pt-4 border-t border-slate-200">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Active Filters</h4>
          <div className="text-xs text-slate-600">
            {blocks.filter(b => b.enabled).length} of {blocks.length} blocks enabled
          </div>
        </div>
      )}
    </div>
  );
}

function FilterBlockCard({ block }: { block: FilterBlock }) {
  const { updateLogicBlock, removeLogicBlock, toggleLogicBlock } = useBuilder();
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={`border rounded-lg ${block.enabled ? 'border-slate-200' : 'border-slate-100 bg-slate-50'}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Filter className={`w-4 h-4 ${block.enabled ? 'text-slate-600' : 'text-slate-400'}`} />
          <span className={`text-sm font-medium ${block.enabled ? 'text-slate-700' : 'text-slate-400'}`}>
            Filter
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleLogicBlock(block.id)}
            className="p-1 hover:bg-slate-100 rounded"
          >
            {block.enabled ? (
              <ToggleRight className="w-5 h-5 text-orange-500" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-slate-400" />
            )}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-slate-100 rounded"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
          <button
            onClick={() => removeLogicBlock(block.id)}
            className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <select
              value={block.field}
              onChange={(e) => updateLogicBlock(block.id, { field: e.target.value })}
              className="col-span-1 px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="">Field...</option>
              {AVAILABLE_FIELDS.map((f) => (
                <option key={f.name} value={f.name}>{f.label}</option>
              ))}
            </select>

            <select
              value={block.operator}
              onChange={(e) => updateLogicBlock(block.id, { operator: e.target.value as FilterOperator })}
              className="col-span-1 px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>

            <input
              type="text"
              value={typeof block.value === 'object' ? JSON.stringify(block.value) : String(block.value)}
              onChange={(e) => {
                let value: any = e.target.value;
                if (block.operator === 'in') {
                  value = e.target.value.split(',').map(v => v.trim());
                } else if (!isNaN(Number(e.target.value)) && e.target.value !== '') {
                  value = Number(e.target.value);
                }
                updateLogicBlock(block.id, { value });
              }}
              placeholder="Value..."
              className="col-span-1 px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AIBlockCard({ block }: { block: AILogicBlock }) {
  const { updateLogicBlock, removeLogicBlock, toggleLogicBlock } = useBuilder();
  const [expanded, setExpanded] = useState(true);
  const [compiling, setCompiling] = useState(false);

  const handleCompile = async () => {
    setCompiling(true);
    updateLogicBlock(block.id, { status: 'compiling' });

    const result = await compileAILogic(block);

    if (result.success && result.compiledRule) {
      updateLogicBlock(block.id, {
        compiledRule: result.compiledRule,
        status: 'compiled',
        error: undefined,
      });
    } else {
      updateLogicBlock(block.id, {
        status: 'error',
        error: result.error || 'Failed to compile',
      });
    }

    setCompiling(false);
  };

  const getStatusIcon = () => {
    switch (block.status) {
      case 'compiling':
        return <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />;
      case 'compiled':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-orange-500" />;
    }
  };

  return (
    <div className={`border rounded-lg ${block.enabled ? 'border-orange-200 bg-orange-50/50' : 'border-slate-100 bg-slate-50'}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-orange-100">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={`text-sm font-medium ${block.enabled ? 'text-slate-700' : 'text-slate-400'}`}>
            AI Logic
          </span>
          {block.status === 'compiled' && (
            <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">Compiled</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleLogicBlock(block.id)}
            className="p-1 hover:bg-orange-100 rounded"
          >
            {block.enabled ? (
              <ToggleRight className="w-5 h-5 text-orange-500" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-slate-400" />
            )}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-orange-100 rounded"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
          <button
            onClick={() => removeLogicBlock(block.id)}
            className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 space-y-3">
          <textarea
            value={block.prompt}
            onChange={(e) => updateLogicBlock(block.id, { prompt: e.target.value, status: 'pending' })}
            placeholder="Describe your filter in plain English...&#10;e.g., 'Only include shipments over $1,000 from FedEx or UPS'"
            rows={3}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
          />

          <button
            onClick={handleCompile}
            disabled={compiling || !block.prompt.trim()}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {compiling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Compiling...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Compile to Rules
              </>
            )}
          </button>

          {block.error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
              {block.error}
            </div>
          )}

          {block.compiledRule && (
            <div className="p-2 bg-green-50 border border-green-200 rounded">
              <div className="text-xs font-medium text-green-700 mb-1">Compiled Rules:</div>
              <div className="space-y-1">
                {block.compiledRule.filters.map((f, i) => (
                  <div key={i} className="text-xs text-green-600">
                    {f.field} {f.operator} {JSON.stringify(f.value)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LogicPanel;
