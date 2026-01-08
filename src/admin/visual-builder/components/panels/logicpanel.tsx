/**
 * LogicPanel - Filter and AI Logic Block Editor
 * 
 * This is where admins define filters that get compiled into ExecutionParams.
 * 
 * Two types of blocks:
 * 1. Filter blocks - direct field comparisons
 * 2. AI blocks - natural language compiled to deterministic rules
 */

import React, { useState } from 'react';
import {
  Plus,
  Filter,
  Sparkles,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Zap,
} from 'lucide-react';
import { useBuilder } from './BuilderContext';
import { createFilterBlock, createAILogicBlock } from '../../logic/compileLogic';
import { compileAILogic, parseSimpleLogic, AVAILABLE_FIELDS } from '../../logic/aiCompilation';
import type { LogicBlock, FilterBlock, AILogicBlock, FilterOperator } from '../../types/BuilderSchema';

// =============================================================================
// OPERATORS
// =============================================================================

const OPERATORS: { value: FilterOperator; label: string; types: string[] }[] = [
  { value: 'eq', label: 'equals', types: ['string', 'number', 'boolean'] },
  { value: 'neq', label: 'not equals', types: ['string', 'number', 'boolean'] },
  { value: 'gt', label: 'greater than', types: ['number', 'date'] },
  { value: 'gte', label: 'greater or equal', types: ['number', 'date'] },
  { value: 'lt', label: 'less than', types: ['number', 'date'] },
  { value: 'lte', label: 'less or equal', types: ['number', 'date'] },
  { value: 'contains', label: 'contains', types: ['string'] },
  { value: 'in', label: 'in list', types: ['string', 'number'] },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function LogicPanel() {
  const { state, addLogicBlock, updateLogicBlock, removeLogicBlock } = useBuilder();
  const [showAddMenu, setShowAddMenu] = useState(false);

  const handleAddFilter = () => {
    addLogicBlock(createFilterBlock());
    setShowAddMenu(false);
  };

  const handleAddAIBlock = () => {
    addLogicBlock(createAILogicBlock());
    setShowAddMenu(false);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Logic Blocks</h3>
          <p className="text-xs text-slate-500">Define filters and rules for your data</p>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Block
          </button>

          {showAddMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowAddMenu(false)}
              />
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-20 overflow-hidden">
                <button
                  onClick={handleAddFilter}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Filter className="w-4 h-4 text-blue-500" />
                  Filter Block
                </button>
                <button
                  onClick={handleAddAIBlock}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  AI Logic Block
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Logic Blocks List */}
      <div className="space-y-3">
        {state.logicBlocks.length === 0 ? (
          <EmptyState onAddFilter={handleAddFilter} onAddAI={handleAddAIBlock} />
        ) : (
          state.logicBlocks.map((block, index) => (
            <LogicBlockEditor
              key={block.id}
              block={block}
              index={index}
              onUpdate={(updates) => updateLogicBlock(block.id, updates)}
              onRemove={() => removeLogicBlock(block.id)}
            />
          ))
        )}
      </div>

      {/* Summary */}
      {state.logicBlocks.length > 0 && (
        <LogicSummary blocks={state.logicBlocks} />
      )}
    </div>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyState({ onAddFilter, onAddAI }: { onAddFilter: () => void; onAddAI: () => void }) {
  return (
    <div className="text-center py-8 px-4 border-2 border-dashed border-slate-200 rounded-lg">
      <div className="text-slate-400 mb-3">
        <Filter className="w-8 h-8 mx-auto" />
      </div>
      <p className="text-sm text-slate-600 mb-4">
        No filters applied. Add logic blocks to filter your data.
      </p>
      <div className="flex justify-center gap-2">
        <button
          onClick={onAddFilter}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg transition-colors"
        >
          <Filter className="w-4 h-4" />
          Add Filter
        </button>
        <button
          onClick={onAddAI}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm rounded-lg transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          AI Block
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// LOGIC BLOCK EDITOR
// =============================================================================

interface LogicBlockEditorProps {
  block: LogicBlock;
  index: number;
  onUpdate: (updates: Partial<LogicBlock>) => void;
  onRemove: () => void;
}

function LogicBlockEditor({ block, index, onUpdate, onRemove }: LogicBlockEditorProps) {
  const [expanded, setExpanded] = useState(true);

  if (block.type === 'filter') {
    return (
      <FilterBlockEditor
        block={block}
        index={index}
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
        onUpdate={onUpdate}
        onRemove={onRemove}
      />
    );
  }

  if (block.type === 'ai') {
    return (
      <AIBlockEditor
        block={block}
        index={index}
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
        onUpdate={onUpdate}
        onRemove={onRemove}
      />
    );
  }

  return null;
}

// =============================================================================
// FILTER BLOCK EDITOR
// =============================================================================

interface FilterBlockEditorProps {
  block: FilterBlock;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<FilterBlock>) => void;
  onRemove: () => void;
}

function FilterBlockEditor({ block, index, expanded, onToggle, onUpdate, onRemove }: FilterBlockEditorProps) {
  const fieldInfo = AVAILABLE_FIELDS.find(f => f.name === block.field);

  return (
    <div className={`border rounded-lg ${block.enabled ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-t-lg">
        <button onClick={onToggle} className="text-slate-400 hover:text-slate-600">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <Filter className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-medium text-slate-700 flex-1">
          Filter {index + 1}
          {block.field && `: ${block.field}`}
        </span>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={block.enabled}
            onChange={(e) => onUpdate({ enabled: e.target.checked })}
            className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
          />
          <span className="text-xs text-slate-500">Active</span>
        </label>
        <button
          onClick={onRemove}
          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      {expanded && (
        <div className="p-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {/* Field */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Field</label>
              <select
                value={block.field}
                onChange={(e) => onUpdate({ field: e.target.value })}
                className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select...</option>
                {AVAILABLE_FIELDS.map(f => (
                  <option key={f.name} value={f.name}>{f.name}</option>
                ))}
              </select>
            </div>

            {/* Operator */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Operator</label>
              <select
                value={block.operator}
                onChange={(e) => onUpdate({ operator: e.target.value as FilterOperator })}
                className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {OPERATORS.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            </div>

            {/* Value */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Value</label>
              <input
                type={fieldInfo?.type === 'number' ? 'number' : 'text'}
                value={String(block.value)}
                onChange={(e) => onUpdate({ 
                  value: fieldInfo?.type === 'number' ? Number(e.target.value) : e.target.value 
                })}
                placeholder="Enter value..."
                className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// AI BLOCK EDITOR
// =============================================================================

interface AIBlockEditorProps {
  block: AILogicBlock;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<AILogicBlock>) => void;
  onRemove: () => void;
}

function AIBlockEditor({ block, index, expanded, onToggle, onUpdate, onRemove }: AIBlockEditorProps) {
  const [isCompiling, setIsCompiling] = useState(false);

  const handleCompile = async () => {
    if (!block.prompt.trim()) return;

    setIsCompiling(true);
    onUpdate({ status: 'compiling' });

    try {
      // Try AI compilation first
      const result = await compileAILogic({
        prompt: block.prompt,
        availableFields: AVAILABLE_FIELDS,
      });

      if (result.success && result.compiledRule) {
        onUpdate({
          compiledRule: result.compiledRule,
          status: 'compiled',
          error: undefined,
        });
      } else {
        // Fall back to local parsing
        const localRule = parseSimpleLogic(block.prompt);
        if (localRule) {
          onUpdate({
            compiledRule: localRule,
            status: 'compiled',
            error: undefined,
          });
        } else {
          onUpdate({
            status: 'error',
            error: result.error || 'Could not parse logic. Try being more specific.',
          });
        }
      }
    } catch (err) {
      // Try local parsing as final fallback
      const localRule = parseSimpleLogic(block.prompt);
      if (localRule) {
        onUpdate({
          compiledRule: localRule,
          status: 'compiled',
          error: undefined,
        });
      } else {
        onUpdate({
          status: 'error',
          error: 'Compilation failed. Try using simpler language.',
        });
      }
    } finally {
      setIsCompiling(false);
    }
  };

  const statusIcon = {
    pending: <AlertCircle className="w-4 h-4 text-slate-400" />,
    compiling: <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />,
    compiled: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    error: <AlertCircle className="w-4 h-4 text-red-500" />,
  }[block.status];

  return (
    <div className={`border rounded-lg ${block.enabled ? 'border-purple-200' : 'border-slate-100 opacity-60'}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-t-lg">
        <button onClick={onToggle} className="text-slate-400 hover:text-slate-600">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <Sparkles className="w-4 h-4 text-purple-500" />
        <span className="text-sm font-medium text-slate-700 flex-1">
          AI Logic {index + 1}
        </span>
        {statusIcon}
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={block.enabled}
            onChange={(e) => onUpdate({ enabled: e.target.checked })}
            className="rounded border-slate-300 text-purple-500 focus:ring-purple-500"
          />
          <span className="text-xs text-slate-500">Active</span>
        </label>
        <button
          onClick={onRemove}
          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      {expanded && (
        <div className="p-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Describe your filter in plain English
            </label>
            <textarea
              value={block.prompt}
              onChange={(e) => onUpdate({ prompt: e.target.value, status: 'pending' })}
              placeholder="e.g., Only include shipments over $1000 from California"
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={handleCompile}
              disabled={!block.prompt.trim() || isCompiling}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isCompiling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              Compile Logic
            </button>

            {block.status === 'compiled' && (
              <span className="text-xs text-green-600">
                ✓ Compiled to {block.compiledRule?.filters.length} filter(s)
              </span>
            )}
          </div>

          {/* Error */}
          {block.status === 'error' && block.error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
              {block.error}
            </div>
          )}

          {/* Compiled Output */}
          {block.status === 'compiled' && block.compiledRule && (
            <div className="p-2 bg-green-50 border border-green-200 rounded">
              <div className="text-xs font-medium text-green-700 mb-1">Compiled Rules:</div>
              <div className="text-xs text-green-600 font-mono">
                {block.compiledRule.filters.map((f, i) => (
                  <div key={i}>
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

// =============================================================================
// LOGIC SUMMARY
// =============================================================================

function LogicSummary({ blocks }: { blocks: LogicBlock[] }) {
  const enabledBlocks = blocks.filter(b => b.enabled);
  const filterBlocks = enabledBlocks.filter(b => b.type === 'filter');
  const aiBlocks = enabledBlocks.filter(b => b.type === 'ai') as AILogicBlock[];
  const compiledAI = aiBlocks.filter(b => b.status === 'compiled');
  const pendingAI = aiBlocks.filter(b => b.status !== 'compiled');

  return (
    <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
      <div className="font-medium text-slate-700 mb-1">Summary</div>
      <div className="space-y-0.5">
        <div>{filterBlocks.length} filter block(s) active</div>
        <div>{compiledAI.length} AI block(s) compiled</div>
        {pendingAI.length > 0 && (
          <div className="text-amber-600">
            ⚠ {pendingAI.length} AI block(s) need compilation
          </div>
        )}
      </div>
    </div>
  );
}

export default LogicPanel;
