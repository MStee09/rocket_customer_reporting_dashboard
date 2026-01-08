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
 * - Enhanced operator support
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

// =============================================================================
// COMPILED FILTER TYPES
// =============================================================================

export interface CompiledFilter {
  field: string;
  operator: FilterOperator;
  value: string | number | boolean | string[] | [number, number];
}

/** A group of filters with their combination logic */
export interface FilterGroup {
  logic: ConditionLogic;
  filters: CompiledFilter[];
}

// =============================================================================
// FILTER COMPILATION
// =============================================================================

/**
 * Compile a single filter block to filter objects
 * Now supports multiple conditions per block
 * Also handles legacy v1 format for backward compatibility
 */
function compileFilterBlock(block: FilterBlock): CompiledFilter[] {
  if (!block.enabled) return [];
  
  // Handle new v2 format with conditions array
  if (block.conditions && Array.isArray(block.conditions)) {
    return block.conditions
      .filter(cond => cond.field && cond.value !== undefined && cond.value !== null)
      .map(cond => ({
        field: cond.field,
        operator: cond.operator,
        value: cond.value,
      }));
  }
  
  // Handle legacy v1 format (field, operator, value directly on block)
  const legacyBlock = block as any;
  if (legacyBlock.field && legacyBlock.value !== undefined && legacyBlock.value !== null) {
    return [{
      field: legacyBlock.field,
      operator: legacyBlock.operator || 'eq',
      value: legacyBlock.value,
    }];
  }
  
  return [];
}

/**
 * Compile an AI logic block's compiled rule to filters
 */
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

/**
 * Extended filter format for compound conditions
 */
export interface CompiledFilterEntry {
  op: FilterOperator;
  value: string | number | boolean | string[] | [number, number];
}

export interface CompiledFilters {
  /** Array-based filters for compound conditions */
  conditions: CompiledFilter[];
  /** Legacy object format for backwards compatibility */
  legacy: Record<string, CompiledFilterEntry>;
}

/**
 * Compile all logic blocks into an array of filters
 * This supports compound conditions on the same field
 */
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

/**
 * Compile all logic blocks into ExecutionParams
 * 
 * This merges:
 * 1. Base execution params (date range, limit)
 * 2. Filter blocks (user-defined filters)
 * 3. AI blocks (pre-compiled deterministic rules)
 * 
 * Note: For backwards compatibility, we also populate the legacy filters object,
 * but the primary format is now the array-based conditions.
 */
export function compileLogicBlocks(
  blocks: LogicBlock[],
  baseParams: ExecutionParams
): ExecutionParams & { filterConditions?: CompiledFilter[] } {
  const allFilters = compileLogicBlocksToArray(blocks);
  
  // Build legacy format (last value wins for same field)
  const legacyFilters: Record<string, { op: string; value: any }> = { ...baseParams.filters };
  
  for (const filter of allFilters) {
    legacyFilters[filter.field] = {
      op: filter.operator,
      value: filter.value,
    };
  }

  return {
    ...baseParams,
    filters: legacyFilters,
    // New array-based format
    filterConditions: allFilters,
  };
}

// =============================================================================
// FILTER APPLICATION (for Supabase queries)
// =============================================================================

/**
 * Apply compiled filters to a Supabase query
 * Updated to support array-based filters for compound conditions
 */
export function applyFiltersToQuery<T extends { 
  eq: (col: string, val: any) => T;
  neq: (col: string, val: any) => T;
  gt: (col: string, val: any) => T;
  gte: (col: string, val: any) => T;
  lt: (col: string, val: any) => T;
  lte: (col: string, val: any) => T;
  like: (col: string, val: any) => T;
  ilike: (col: string, val: any) => T;
  in: (col: string, val: any[]) => T;
  is: (col: string, val: any) => T;
  not: (col: string, op: string, val: any) => T;
}>(
  query: T,
  filters?: CompiledFilter[] | Record<string, { op: string; value: any }>
): T {
  if (!filters) return query;

  let result = query;

  // Handle array format (new)
  if (Array.isArray(filters)) {
    for (const filter of filters) {
      result = applySingleFilter(result, filter.field, filter.operator, filter.value);
    }
    return result;
  }

  // Handle object format (legacy)
  for (const [field, filter] of Object.entries(filters)) {
    const { op, value } = filter;
    result = applySingleFilter(result, field, op as FilterOperator, value);
  }

  return result;
}

/**
 * Apply a single filter condition
 */
function applySingleFilter<T extends { 
  eq: (col: string, val: any) => T;
  neq: (col: string, val: any) => T;
  gt: (col: string, val: any) => T;
  gte: (col: string, val: any) => T;
  lt: (col: string, val: any) => T;
  lte: (col: string, val: any) => T;
  like: (col: string, val: any) => T;
  ilike: (col: string, val: any) => T;
  in: (col: string, val: any[]) => T;
  is: (col: string, val: any) => T;
  not: (col: string, op: string, val: any) => T;
  or: (filters: string) => T;
}>(
  query: T,
  field: string,
  operator: FilterOperator,
  value: any
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
      // Supabase doesn't have direct not_in, use NOT filter
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
      // OR logic: field contains ANY of the values
      // This requires using Supabase's .or() method
      if (Array.isArray(value) && value.length > 0) {
        const orConditions = value
          .map(v => `${field}.ilike.%${v}%`)
          .join(',');
        return query.or(orConditions);
      }
      return query;
    case 'contains_all':
      // AND logic: field contains ALL of the values
      // Chain multiple ilike filters
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

/**
 * Create a new filter block with compound condition support
 */
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

/**
 * Create a new AI logic block
 */
export function createAILogicBlock(prompt: string = ''): AILogicBlock {
  return {
    id: crypto.randomUUID(),
    type: 'ai',
    prompt,
    status: 'pending',
    enabled: true,
  };
}

/**
 * Add a condition to an existing filter block
 */
export function addConditionToFilterBlock(
  block: FilterBlock,
  condition: FilterCondition
): FilterBlock {
  return {
    ...block,
    conditions: [...(block.conditions || []), condition],
  };
}

/**
 * Remove a condition from a filter block
 */
export function removeConditionFromFilterBlock(
  block: FilterBlock,
  index: number
): FilterBlock {
  return {
    ...block,
    conditions: (block.conditions || []).filter((_, i) => i !== index),
  };
}

/**
 * Update a condition in a filter block
 */
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

/**
 * Serialize logic blocks for database storage
 */
export function serializeLogicBlocks(blocks: LogicBlock[]): string {
  return JSON.stringify(blocks);
}

/**
 * Deserialize logic blocks from database
 * Handles migration from v1 format to v2 format
 */
export function deserializeLogicBlocks(json: string | null): LogicBlock[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    
    // Migrate old format to new format if needed
    return parsed.map((block: any) => {
      if (block.type === 'filter') {
        // If already has conditions array, use it
        if (block.conditions && Array.isArray(block.conditions)) {
          return block;
        }
        // Convert old single-condition format to new array format
        return {
          ...block,
          conditions: block.field ? [{
            field: block.field,
            operator: block.operator || 'eq',
            value: block.value,
          }] : [],
        };
      }
      return block;
    });
  } catch {
    return [];
  }
}

// =============================================================================
// FILTER SUMMARY
// =============================================================================

/**
 * Get a human-readable summary of compiled filters
 */
export function getFilterSummary(filters: CompiledFilter[]): string {
  if (filters.length === 0) return 'No filters applied';
  
  return filters.map(f => {
    const valueStr = Array.isArray(f.value) 
      ? `[${f.value.slice(0, 3).join(', ')}${f.value.length > 3 ? '...' : ''}]`
      : String(f.value);
    return `${f.field} ${f.operator} ${valueStr}`;
  }).join(' AND ');
}
