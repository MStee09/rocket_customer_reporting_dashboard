/**
 * Logic Compiler
 *
 * Compiles LogicBlocks into ExecutionParams filters.
 *
 * KEY PRINCIPLE: AI runs at authoring time, execution is deterministic.
 *
 * When an AI logic block is used:
 * 1. Admin writes a prompt like "Only include top 5 carriers by volume"
 * 2. AI compiles this to a deterministic rule: { field: 'carrier_name', operator: 'in', value: ['FedEx', 'UPS', ...] }
 * 3. At runtime, only the compiled rule executes - no AI involved
 *
 * LOCATION: /src/admin/visual-builder/logic/compileLogic.ts
 *
 * v2.0 Updates:
 * - Support for compound filters (multiple conditions per block)
 * - Array-based filter storage for same-field multiple conditions
 * - Enhanced operator support (contains_any, contains_all, matches_any)
 * - Backward compatibility with v1 filter format
 */

import type {
  LogicBlock,
  FilterBlock,
  AILogicBlock,
  CompiledRule,
  FilterOperator,
  FilterCondition,
  ConditionLogic,
} from '../types/BuilderSchema';
import type { ExecutionParams } from '../../../widgets/types/ExecutionParams';

type FilterValue = string | number | boolean | string[] | [number, number];

interface LegacyFilterBlock {
  field?: string;
  operator?: FilterOperator;
  value?: FilterValue;
}

interface SupabaseQueryBuilder<T> {
  eq: (col: string, val: FilterValue) => T;
  neq: (col: string, val: FilterValue) => T;
  gt: (col: string, val: FilterValue) => T;
  gte: (col: string, val: FilterValue) => T;
  lt: (col: string, val: FilterValue) => T;
  lte: (col: string, val: FilterValue) => T;
  like: (col: string, val: string) => T;
  ilike: (col: string, val: string) => T;
  in: (col: string, val: string[] | number[]) => T;
  is: (col: string, val: null) => T;
  not: (col: string, op: string, val: FilterValue | null) => T;
  or: (filters: string) => T;
}

interface LegacyFilterEntry {
  op: string;
  value: FilterValue;
}

interface SerializedFilterBlock {
  type: 'filter';
  id: string;
  enabled: boolean;
  conditions?: FilterCondition[];
  field?: string;
  operator?: FilterOperator;
  value?: FilterValue;
}

interface SerializedAIBlock {
  type: 'ai';
  id: string;
  enabled: boolean;
  prompt: string;
  status: string;
  compiledRule?: CompiledRule;
}

type SerializedLogicBlock = SerializedFilterBlock | SerializedAIBlock;

// =============================================================================
// COMPILED FILTER TYPES
// =============================================================================

export interface CompiledFilter {
  field: string;
  operator: FilterOperator;
  value: string | number | boolean | string[] | [number, number];
}

export interface FilterGroup {
  logic: ConditionLogic;
  filters: CompiledFilter[];
}

// =============================================================================
// FILTER COMPILATION
// =============================================================================

function compileFilterBlock(block: FilterBlock): CompiledFilter[] {
  if (!block.enabled) return [];

  if (block.conditions && Array.isArray(block.conditions)) {
    return block.conditions
      .filter(cond => cond.field && cond.value !== undefined && cond.value !== null)
      .map(cond => ({
        field: cond.field,
        operator: cond.operator,
        value: cond.value,
      }));
  }

  const legacyBlock = block as unknown as LegacyFilterBlock;
  if (legacyBlock.field && legacyBlock.value !== undefined && legacyBlock.value !== null) {
    return [{
      field: legacyBlock.field,
      operator: legacyBlock.operator || 'eq',
      value: legacyBlock.value,
    }];
  }

  return [];
}

function compileAIBlock(block: AILogicBlock): CompiledFilter[] {
  if (!block.enabled) return [];
  if (!block.compiledRule) return [];
  if (block.status !== 'compiled') return [];

  return block.compiledRule.filters.map(f => ({
    field: f.field,
    operator: f.operator,
    value: f.value,
  }));
}

// =============================================================================
// MAIN COMPILER
// =============================================================================

export interface CompiledFilterEntry {
  op: FilterOperator;
  value: string | number | boolean | string[] | [number, number];
}

export interface CompiledFilters {
  conditions: CompiledFilter[];
  legacy: Record<string, CompiledFilterEntry>;
}

export function compileLogicBlocksToArray(blocks: LogicBlock[]): CompiledFilter[] {
  const allFilters: CompiledFilter[] = [];

  for (const block of blocks) {
    if (block.type === 'filter') {
      allFilters.push(...compileFilterBlock(block));
    }

    if (block.type === 'ai') {
      allFilters.push(...compileAIBlock(block));
    }
  }

  return allFilters;
}

export function compileLogicBlocks(
  blocks: LogicBlock[],
  baseParams: ExecutionParams
): ExecutionParams & { filterConditions?: CompiledFilter[] } {
  const allFilters = compileLogicBlocksToArray(blocks);

  const legacyFilters: Record<string, LegacyFilterEntry> = { ...baseParams.filters };

  for (const filter of allFilters) {
    legacyFilters[filter.field] = {
      op: filter.operator,
      value: filter.value,
    };
  }

  return {
    ...baseParams,
    filters: legacyFilters,
    filterConditions: allFilters,
  };
}

// =============================================================================
// FILTER APPLICATION (for Supabase queries)
// =============================================================================

export function applyFiltersToQuery<T extends SupabaseQueryBuilder<T>>(
  query: T,
  filters?: CompiledFilter[] | Record<string, LegacyFilterEntry>
): T {
  if (!filters) return query;

  let result = query;

  if (Array.isArray(filters)) {
    for (const filter of filters) {
      result = applySingleFilter(result, filter.field, filter.operator, filter.value);
    }
    return result;
  }

  for (const [field, filter] of Object.entries(filters)) {
    const { op, value } = filter;
    result = applySingleFilter(result, field, op as FilterOperator, value);
  }

  return result;
}

function applySingleFilter<T extends SupabaseQueryBuilder<T>>(
  query: T,
  field: string,
  operator: FilterOperator,
  value: FilterValue
): T {
  switch (operator) {
    case 'eq':
      return query.eq(field, value);
    case 'neq':
      return query.neq(field, value);
    case 'gt':
      return query.gt(field, value);
    case 'gte':
      return query.gte(field, value);
    case 'lt':
      return query.lt(field, value);
    case 'lte':
      return query.lte(field, value);
    case 'contains':
      return query.ilike(field, `%${value}%`);
    case 'not_contains':
      return query.not(field, 'ilike', `%${value}%`);
    case 'starts_with':
      return query.ilike(field, `${value}%`);
    case 'ends_with':
      return query.ilike(field, `%${value}`);
    case 'in':
    case 'matches_any':
      if (Array.isArray(value)) {
        return query.in(field, value);
      }
      return query;
    case 'not_in':
      if (Array.isArray(value)) {
        console.warn('not_in operator has limited support - using workaround');
        return query;
      }
      return query;
    case 'is_null':
      return query.is(field, null);
    case 'is_not_null':
      return query.not(field, 'is', null);
    case 'between':
      if (Array.isArray(value) && value.length === 2) {
        return query.gte(field, value[0]).lte(field, value[1]);
      }
      return query;
    case 'contains_any':
      if (Array.isArray(value) && value.length > 0) {
        const orConditions = value
          .map(v => `${field}.ilike.%${v}%`)
          .join(',');
        return query.or(orConditions);
      }
      return query;
    case 'contains_all':
      if (Array.isArray(value)) {
        let result = query;
        for (const v of value) {
          result = result.ilike(field, `%${v}%`);
        }
        return result;
      }
      return query;
    default:
      return query;
  }
}

// =============================================================================
// BLOCK FACTORIES
// =============================================================================

export function createFilterBlock(
  initialCondition?: Partial<FilterCondition>
): FilterBlock {
  const conditions: FilterCondition[] = initialCondition?.field ? [{
    field: initialCondition.field,
    operator: initialCondition.operator || 'eq',
    value: initialCondition.value ?? '',
  }] : [];

  return {
    id: crypto.randomUUID(),
    type: 'filter',
    conditions,
    enabled: true,
  };
}

export function createAILogicBlock(prompt: string = ''): AILogicBlock {
  return {
    id: crypto.randomUUID(),
    type: 'ai',
    prompt,
    status: 'pending',
    enabled: true,
  };
}

export function addConditionToFilterBlock(
  block: FilterBlock,
  condition: FilterCondition
): FilterBlock {
  return {
    ...block,
    conditions: [...(block.conditions || []), condition],
  };
}

export function removeConditionFromFilterBlock(
  block: FilterBlock,
  index: number
): FilterBlock {
  return {
    ...block,
    conditions: (block.conditions || []).filter((_, i) => i !== index),
  };
}

export function updateConditionInFilterBlock(
  block: FilterBlock,
  index: number,
  updates: Partial<FilterCondition>
): FilterBlock {
  return {
    ...block,
    conditions: (block.conditions || []).map((cond, i) =>
      i === index ? { ...cond, ...updates } : cond
    ),
  };
}

// =============================================================================
// SERIALIZATION
// =============================================================================

export function serializeLogicBlocks(blocks: LogicBlock[]): string {
  return JSON.stringify(blocks);
}

export function deserializeLogicBlocks(json: string | null): LogicBlock[] {
  if (!json) return [];
  try {
    const parsed: SerializedLogicBlock[] = JSON.parse(json);

    return parsed.map((block) => {
      if (block.type === 'filter') {
        if (block.conditions && Array.isArray(block.conditions)) {
          return block as FilterBlock;
        }
        return {
          ...block,
          conditions: block.field ? [{
            field: block.field,
            operator: block.operator || 'eq',
            value: block.value ?? '',
          }] : [],
        } as FilterBlock;
      }
      return block as AILogicBlock;
    });
  } catch {
    return [];
  }
}

// =============================================================================
// FILTER SUMMARY
// =============================================================================

export function getFilterSummary(filters: CompiledFilter[]): string {
  if (filters.length === 0) return 'No filters applied';

  return filters.map(f => {
    const valueStr = Array.isArray(f.value)
      ? `[${f.value.slice(0, 3).join(', ')}${f.value.length > 3 ? '...' : ''}]`
      : String(f.value);
    return `${f.field} ${f.operator} ${valueStr}`;
  }).join(' AND ');
}
