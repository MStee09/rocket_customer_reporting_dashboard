/**
 * Logic Panel
 * 
 * LOCATION: /src/admin/visual-builder/components/panels/LogicPanel.tsx
 * 
 * Allows admins to define filter logic using manual filters or AI-powered
 * natural language compilation. Supports compound filters (multiple conditions
 * on the same field).
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Filter,
  Sparkles,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Zap,
  GripVertical,
  Copy,
  Database,
} from 'lucide-react';
import { useBuilder } from '../BuilderContext';
import { 
  createFilterBlock, 
  createAILogicBlock,
  compileLogicBlocksToArray,
} from '../../logic/compileLogic';
import { compileAILogic, parseSimpleLogic } from '../../logic/aiCompilation';
import { 
  getAllBuilderFields,
  getFilteredRowCount,
  getOperatorsForFieldType,
  FILTER_OPERATORS,
} from '../../services/fieldService';
import type { 
  LogicBlock, 
  FilterBlock, 
  AILogicBlock, 
  FilterOperator,
  FilterCondition,
  BuilderFieldDefinition,
} from '../../types/BuilderSchema';

export function LogicPanel() {
  const { state, addLogicBlock, updateLogicBlock, removeLogicBlock } = useBuilder();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);

  const allFields = useMemo(() => getAllBuilderFields(true), []);

  // Fetch row count when filters change
  useEffect(() => {
    const fetchCount = async () => {
      setCountLoading(true);
      const filters = compileLogicBlocksToArray(state.logicBlocks);
      const count = await getFilteredRowCount({
        dateRange: state.executionParams.dateRange,
        filters: filters.map(f => ({ field: f.field, operator: f.operator, value: f.value })),
      });
      setRowCount(count);
      setCountLoading(false);
    };

    const timer = setTimeout(fetchCount, 500);
    return () => clearTimeout(timer);
  }, [state.logicBlocks, state.executionParams.dateRange]);

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
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  AI Logic Block
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row count indicator */}
      <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
        <Database className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-600">
          {countLoading ? (
            <span className="flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Counting...
            </span>
          ) : rowCount !== null && rowCount >= 0 ? (
            <span>
              <strong className="text-slate-900">{rowCount.toLocaleString()}</strong> rows match current filters
            </span>
          ) : (
            <span className="text-slate-400">Unable to count rows</span>
          )}
        </span>
      </div>

      <div className="space-y-3">
        {state.logicBlocks.length === 0 ? (
          <EmptyState onAddFilter={handleAddFilter} onAddAI={handleAddAIBlock} />
        ) : (
          state.logicBlocks.map((block, index) => (
            <LogicBlockEditor
              key={block.id}
              block={block}
              index={index}
              fields={allFields}
              onUpdate={(updates) => updateLogicBlock(block.id, updates)}
              onRemove={() => removeLogicBlock(block.id)}
            />
          ))
        )}
      </div>

      {state.logicBlocks.length > 0 && (
        <LogicSummary blocks={state.logicBlocks} />
      )}
    </div>
  );
}

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
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-sm rounded-lg transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          AI Block
        </button>
      </div>
    </div>
  );
}

interface LogicBlockEditorProps {
  block: LogicBlock;
  index: number;
  fields: BuilderFieldDefinition[];
  onUpdate: (updates: Partial<LogicBlock>) => void;
  onRemove: () => void;
}

function LogicBlockEditor({ block, index, fields, onUpdate, onRemove }: LogicBlockEditorProps) {
  const [expanded, setExpanded] = useState(true);

  if (block.type === 'filter') {
    return (
      <FilterBlockEditor
        block={block}
        index={index}
        fields={fields}
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
        onUpdate={onUpdate as (updates: Partial<FilterBlock>) => void}
        onRemove={onRemove}
      />
    );
  }

  if (block.type === 'ai') {
    return (
      <AIBlockEditor
        block={block}
        index={index}
        fields={fields}
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
        onUpdate={onUpdate as (updates: Partial<AILogicBlock>) => void}
        onRemove={onRemove}
      />
    );
  }

  return null;
}

interface FilterBlockEditorProps {
  block: FilterBlock;
  index: number;
  fields: BuilderFieldDefinition[];
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<FilterBlock>) => void;
  onRemove: () => void;
}

function FilterBlockEditor({ block, index, fields, expanded, onToggle, onUpdate, onRemove }: FilterBlockEditorProps) {
  // Ensure conditions is always an array (backward compatibility)
  const conditions = block.conditions || [];
  
  const addCondition = () => {
    onUpdate({
      conditions: [...conditions, { field: '', operator: 'eq', value: '' }],
    });
  };

  const updateCondition = (condIndex: number, updates: Partial<FilterCondition>) => {
    const newConditions = conditions.map((c, i) => 
      i === condIndex ? { ...c, ...updates } : c
    );
    onUpdate({ conditions: newConditions });
  };

  const removeCondition = (condIndex: number) => {
    onUpdate({
      conditions: conditions.filter((_, i) => i !== condIndex),
    });
  };

  const conditionCount = conditions.length;

  return (
    <div className={`border rounded-lg ${block.enabled ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-t-lg">
        <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
        <button onClick={onToggle} className="text-slate-400 hover:text-slate-600">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <Filter className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-medium text-slate-700 flex-1">
          Filter {index + 1}
          {conditionCount > 0 && (
            <span className="text-slate-400 font-normal ml-1">
              ({conditionCount} condition{conditionCount !== 1 ? 's' : ''})
            </span>
          )}
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

      {expanded && (
        <div className="p-3 space-y-3">
          {conditions.map((condition, condIndex) => (
            <ConditionRow
              key={condIndex}
              condition={condition}
              fields={fields}
              onUpdate={(updates) => updateCondition(condIndex, updates)}
              onRemove={() => removeCondition(condIndex)}
              showRemove={conditions.length > 1}
            />
          ))}
          
          <button
            onClick={addCondition}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-3 h-3" />
            Add condition (AND)
          </button>
        </div>
      )}
    </div>
  );
}

interface ConditionRowProps {
  condition: FilterCondition;
  fields: BuilderFieldDefinition[];
  onUpdate: (updates: Partial<FilterCondition>) => void;
  onRemove: () => void;
  showRemove: boolean;
}

function ConditionRow({ condition, fields, onUpdate, onRemove, showRemove }: ConditionRowProps) {
  const selectedField = fields.find(f => f.name === condition.field);
  const availableOperators = selectedField 
    ? getOperatorsForFieldType(selectedField.type)
    : FILTER_OPERATORS;

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Field</label>
          <select
            value={condition.field}
            onChange={(e) => onUpdate({ field: e.target.value, value: '' })}
            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Select...</option>
            {fields.map(f => (
              <option key={f.name} value={f.name}>{f.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Operator</label>
          <select
            value={condition.operator}
            onChange={(e) => onUpdate({ operator: e.target.value as FilterOperator })}
            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {availableOperators.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Value</label>
          {condition.operator === 'is_null' || condition.operator === 'is_not_null' ? (
            <input
              type="text"
              disabled
              value="(no value needed)"
              className="w-full px-2 py-1.5 border border-slate-100 rounded text-sm bg-slate-50 text-slate-400"
            />
          ) : condition.operator === 'in' || condition.operator === 'not_in' ? (
            <input
              type="text"
              value={Array.isArray(condition.value) ? condition.value.join(', ') : String(condition.value || '')}
              onChange={(e) => onUpdate({ value: e.target.value.split(',').map(v => v.trim()) })}
              placeholder="value1, value2, ..."
              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          ) : condition.operator === 'between' ? (
            <div className="flex gap-1">
              <input
                type="number"
                value={Array.isArray(condition.value) ? condition.value[0] : ''}
                onChange={(e) => {
                  const current = Array.isArray(condition.value) ? condition.value : [0, 0];
                  onUpdate({ value: [Number(e.target.value), current[1]] });
                }}
                placeholder="Min"
                className="w-1/2 px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <input
                type="number"
                value={Array.isArray(condition.value) ? condition.value[1] : ''}
                onChange={(e) => {
                  const current = Array.isArray(condition.value) ? condition.value : [0, 0];
                  onUpdate({ value: [current[0], Number(e.target.value)] });
                }}
                placeholder="Max"
                className="w-1/2 px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          ) : (
            <input
              type={selectedField?.type === 'number' || selectedField?.type === 'currency' ? 'number' : 'text'}
              value={String(condition.value || '')}
              onChange={(e) => onUpdate({
                value: selectedField?.type === 'number' || selectedField?.type === 'currency' 
                  ? Number(e.target.value) 
                  : e.target.value
              })}
              placeholder="Enter value..."
              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          )}
        </div>
      </div>
      
      {showRemove && (
        <button
          onClick={onRemove}
          className="mt-6 p-1 text-slate-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

interface AIBlockEditorProps {
  block: AILogicBlock;
  index: number;
  fields: BuilderFieldDefinition[];
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<AILogicBlock>) => void;
  onRemove: () => void;
}

function AIBlockEditor({ block, index, fields, expanded, onToggle, onUpdate, onRemove }: AIBlockEditorProps) {
  const [isCompiling, setIsCompiling] = useState(false);

  const validatePrompt = (prompt: string): string | null => {
    if (prompt.trim().length < 10) {
      return 'Prompt too short. Please describe what you want to filter.';
    }
    if (prompt.trim().length > 500) {
      return 'Prompt too long. Please keep it under 500 characters.';
    }
    return null;
  };

  const handleCompile = async () => {
    const validationError = validatePrompt(block.prompt);
    if (validationError) {
      onUpdate({ status: 'error', error: validationError });
      return;
    }

    setIsCompiling(true);
    onUpdate({ status: 'compiling' });

    try {
      const result = await compileAILogic({
        prompt: block.prompt,
        availableFields: fields.map(f => ({
          name: f.name,
          type: f.type === 'currency' ? 'number' : f.type,
        })),
      });

      if (result.success && result.compiledRule) {
        onUpdate({
          compiledRule: result.compiledRule,
          status: 'compiled',
          error: undefined,
          explanation: result.explanation,
        });
      } else {
        // Try local parsing as fallback
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
    } catch {
      // Try local parsing as fallback
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
    <div className={`border rounded-lg ${block.enabled ? 'border-amber-200' : 'border-slate-100 opacity-60'}`}>
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-t-lg">
        <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
        <button onClick={onToggle} className="text-slate-400 hover:text-slate-600">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <Sparkles className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-medium text-slate-700 flex-1">
          AI Logic {index + 1}
        </span>
        {statusIcon}
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={block.enabled}
            onChange={(e) => onUpdate({ enabled: e.target.checked })}
            className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
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
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
            <p className="mt-1 text-xs text-slate-400">
              {block.prompt.length}/500 characters
            </p>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={handleCompile}
              disabled={!block.prompt.trim() || isCompiling}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors"
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
                Compiled to {block.compiledRule?.filters.length} filter(s)
              </span>
            )}
          </div>

          {block.status === 'error' && block.error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
              {block.error}
            </div>
          )}

          {block.status === 'compiled' && block.compiledRule && (
            <div className="p-2 bg-green-50 border border-green-200 rounded">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-green-700">Compiled Rules:</span>
                <button
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(block.compiledRule, null, 2))}
                  className="text-green-600 hover:text-green-700"
                  title="Copy to clipboard"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <div className="text-xs text-green-600 font-mono space-y-0.5">
                {block.compiledRule.filters.map((f, i) => (
                  <div key={i}>
                    {f.field} {f.operator} {JSON.stringify(f.value)}
                  </div>
                ))}
              </div>
              {block.explanation && (
                <p className="mt-2 text-xs text-green-700 italic">
                  {block.explanation}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LogicSummary({ blocks }: { blocks: LogicBlock[] }) {
  const enabledBlocks = blocks.filter(b => b.enabled);
  const compiledFilters = compileLogicBlocksToArray(enabledBlocks);

  if (compiledFilters.length === 0) {
    return (
      <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-500">
        No active filters. All data will be included.
      </div>
    );
  }

  return (
    <div className="p-3 bg-slate-100 rounded-lg">
      <div className="text-xs font-medium text-slate-500 mb-2">
        Active Filter Summary ({compiledFilters.length} condition{compiledFilters.length !== 1 ? 's' : ''})
      </div>
      <div className="text-sm text-slate-700 font-mono space-y-1">
        {compiledFilters.map((f, i) => (
          <div key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-slate-400 text-xs">AND</span>}
            <span className="text-blue-600">{f.field}</span>
            <span className="text-slate-500">{f.operator}</span>
            <span className="text-green-600">
              {Array.isArray(f.value) ? `[${f.value.join(', ')}]` : JSON.stringify(f.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LogicPanel;
